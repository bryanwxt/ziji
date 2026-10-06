import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import { setSpeaking } from '../audio/speaking';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allCards, answersSince, getConfusions, getRungs, noteConfusion, getSession, getWord, logsSince, noteRung, putCards, putWords, saveKid, saveSession, updateSettings } from '../store/repo';
import { createSessionRecord } from '../session/runner';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';
import { SessionScreen } from './SessionScreen';
import { cardMeaning } from '../content/glossary';
import { firstSense } from '../activities/flashcards/distractors';

vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));
const lessonOnly = { newwords: true, practice: true, writing: false, speaking: false };
/** Taps, then waits for the screen to change (answers save to IndexedDB before the next card shows). */
async function tapAndWait(...els: HTMLElement[]) {
  const before = document.body.innerHTML;
  for (const el of els) fireEvent.click(el);
  await waitFor(() => expect(document.body.innerHTML).not.toBe(before), { timeout: 4000 });
}
const OPEN = '.choice:not([disabled]), .fishtile:not([disabled])';
/** 继续 when it can be tapped (a pairing board or 组句 needs several taps first). */
const nextButton = () => {
  const b = (screen.queryByText('继续') ?? screen.queryByText('好了！'))?.closest('button'); // 好了！ checks a finished 组句
  return b && !b.disabled ? b : null;
};
/** Answers whatever is on screen until the celebration: 我记住了！, else the first open choice (and 继续 once it opens). `seen` gets each screen's stage. */
async function playThrough(max = 150, seen: string[] = []) {
  for (let i = 0; i < max && !screen.queryByText('太棒了！'); i++) {
    await waitFor(() => expect(screen.queryByText('太棒了！') ?? screen.queryByText('我记住了！') ?? nextButton() ?? document.querySelector(OPEN) ?? document.querySelector('.understand__choice[disabled]')).toBeTruthy(), { timeout: 4000 }); // building 练一练's round reads every word's content
    if (screen.queryByText('太棒了！')) break;
    seen.push(document.querySelector('[data-stage]')?.getAttribute('data-stage') ?? '');
    if (!nextButton() && document.querySelector('.understand__choice[disabled]')) { // an Understand question opens once its sentence has been said
      await act(async () => { await new Promise((r) => setTimeout(r, 30)); setSpeaking(true); setSpeaking(false); await new Promise((r) => setTimeout(r, 300)); }); // let it start listening, then settle
      continue;
    }
    if (screen.queryByText('我记住了！')) {
      // a card shown again after a miss lets him go on only after a short look (a double tap can't skip it): wait it out
      if (document.querySelector('.pet__bubble')?.textContent?.includes('再看一遍')) {
        await new Promise((r) => setTimeout(r, 650));
        if (!screen.queryByText('我记住了！')) continue; // a tap before the wait was already moving him on
      }
      await tapAndWait(screen.getByText('我记住了！'));
      continue;
    }
    const next = nextButton();
    if (next) {
      await tapAndWait(next);
      continue;
    }
    await tapAndWait(document.querySelector<HTMLElement>(OPEN)!);
  }
}

async function setup(voice = false) {
  const app = await makeAppData({ voice });
  await putWords(app.db, words);
  await updateSettings(app.db, { newPerDay: 2, activities: lessonOnly });
  return app;
}

const introWord = () => document.querySelector('.intro .hanzi--xl')?.textContent ?? null;

async function learnCurrentWord() {
  fireEvent.click(await screen.findByText('我记住了！'));
  const shown = document.querySelector('[data-q]')!.textContent!;
  fireEvent.click(screen.getByText(firstSense(cardMeaning(byText.get(shown)!)!))); // a new word is read for meaning with no voice (spec 2026-10-06 §3.2)
  fireEvent.click(screen.getByText('继续'));
}

describe('SessionScreen', () => {
  it('shows the current world behind the lesson', async () => {
    const app = await setup();
    await saveKid(app.db, { ...DEFAULT_KID, worldsSeen: ['yard', 'grass'] }); // the session reads the kid from the db
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(document.querySelector('.world-scene')?.getAttribute('data-world')).toBe('grass'));
    expect(document.querySelector('.world-strip')).toBeNull(); // the whole world, not a strip
  });

  it('runs 认新字 then 练一练 to the celebration (spec 2026-10-05 §2)', async () => {
    const app = await setup(true);
    renderWithApp(<SessionScreen free={false} />, app);
    const stages: string[] = [];
    await playThrough(150, stages); // wrong first picks add retries: 37–47 screens locally, more on a bad draw
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    const rec = (await getSession(app.db, '2026-10-02'))!;
    expect(rec.completed).toBe(true);
    expect(rec.completedSteps).toEqual(['newwords', 'practice']);
    expect(rec.practiceQueue!.filter((x) => !x.retry).length).toBeGreaterThanOrEqual(6); // two new words, three climbs each
    // new words are graded by ear; reading opens only once hearing has passed on two days (spec 2026-10-06 §3.2)
    expect((await allCards(app.db)).filter((c) => c.kind === 'hear')).toHaveLength(2);
    expect((await allCards(app.db)).filter((c) => c.kind === 'recognise')).toHaveLength(0);
    expect((await getRungs(app.db)).size).toBe(2);
  });

  it('resumes where the child left off', async () => {
    const app = await setup();
    const first = renderWithApp(<SessionScreen free={false} />, app);
    await learnCurrentWord();
    await screen.findByText('我记住了！');
    const second = introWord();
    first.unmount();
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我记住了！');
    expect(introWord()).toBe(second);
  });

  it('Truffle greets him at the start of a lesson, not when he comes back to it (spec 2026-10-04 §4.6)', async () => {
    const app = await setup();
    const first = renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我记住了！');
    await waitFor(() => expect(document.querySelector('.pet__bubble')?.textContent).toContain('你好！我们开始吧！')); // after paint, like any effect
    await learnCurrentWord();
    await screen.findByText('我记住了！'); // the next word: the first one is saved
    first.unmount();
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我记住了！');
    await new Promise((r) => setTimeout(r, 300)); // give a greeting the time it would take to show
    expect(document.querySelector('.pet__bubble')?.textContent ?? '').not.toContain('你好');
  });

  it('final review: with no new words today the lesson starts on a question, and he does not greet over it (spec §4.3)', async () => {
    const app = await setup();
    await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: false, speaking: false } });
    await putCards(app.db, [makeCard(words[0]!.id, 'recognise', new Date(2026, 9, 1))]);
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(document.querySelector('.choice, .fishtile, .tap')).toBeTruthy(), { timeout: 4000 });
    await new Promise((r) => setTimeout(r, 300));
    expect(document.querySelector('.pet__bubble')?.textContent ?? '').not.toContain('你好');
  });

  it('sweep: a mix-up noted in today\'s 认新字 is fished in today\'s 练一练, not a lesson later', async () => {
    const app = await makeAppData();
    await putWords(app.db, [byText.get('根')!, byText.get('跟')!].map((w, i) => ({ ...w, rank: i + 1 })));
    await updateSettings(app.db, { newPerDay: 2, activities: lessonOnly });
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我记住了！');
    await noteConfusion(app.db, byText.get('根')!.id, '跟', new Date(2026, 9, 2)); // as a 认新字 miss would note it
    await learnCurrentWord();
    await screen.findByText('我记住了！');
    await learnCurrentWord();
    await waitFor(async () => expect((await getSession(app.db, '2026-10-02'))?.practiceQueue).toBeTruthy(), { timeout: 4000 });
    const q = (await getSession(app.db, '2026-10-02'))!.practiceQueue!;
    expect(q.some((x) => x.ask === 'fish' && x.wordId === byText.get('根')!.id)).toBe(true);
  });

  it('skips a word that was paused after the plan was made', async () => {
    const app = await setup();
    const first = renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我记住了！');
    const paused = introWord()!;
    first.unmount();
    const w = (await getWord(app.db, byText.get(paused)!.id))!;
    await putWords(app.db, [{ ...w, paused: true }]);
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(introWord()).toBeTruthy());
    expect(introWord()).not.toBe(paused);
  });
});

describe('meaning practice in the lesson', () => {
  it('a begun word with a 组词 cue gets a 词语 question in 练一练, and the answer reviews its meaning card', async () => {
    const app = await makeAppData();
    await putWords(app.db, words);
    await updateSettings(app.db, { newPerDay: 0, activities: lessonOnly });
    await putCards(app.db, [{ ...makeCard('b:惜', 'recognise', new Date(2026, 9, 1), true), passed: 1 }]); // Use starts once Read has passed
    renderWithApp(<SessionScreen free={false} />, app);
    await playThrough();
    await waitFor(async () => expect((await allCards(app.db)).map((c) => c.id)).toContain('b:惜:meaning'));
    expect((await getRungs(app.db)).get('b:惜')).toBeGreaterThanOrEqual(0);
  });
});

describe('句子 questions in 练一练 (spec 2026-10-05 §3.2)', () => {
  it('words he already climbed to 词语 get sentence questions: the answer reviews his reading (their first appearance, spec §3.5) and is logged for the Skills panel', async () => {
    const app = await makeAppData();
    await putWords(app.db, words);
    await updateSettings(app.db, { newPerDay: 0, activities: lessonOnly });
    const ids = ['很', '在', '和', '跟'].map((t) => byText.get(t)!.id);
    await putCards(app.db, ids.map((id) => makeCard(id, 'recognise', new Date(2026, 9, 1), true)));
    for (const id of ids) await noteRung(app.db, id, 2, true, new Date(2026, 9, 1)); // he starts them at 句子
    renderWithApp(<SessionScreen free={false} />, app);
    await playThrough();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await logsSince(app.db, 0)).filter((l) => l.kind === 'recognise' && ids.includes(l.wordId)).length).toBe(4); // each once
    expect((await answersSince(app.db, 0)).filter((a) => a.skill === 'use').length).toBeGreaterThan(0);
  });
});

describe('the lesson at its edges (review focus)', () => {
  it('a lesson saved before the change finishes in the old flow (review focus 1)', async () => {
    const app = await setup();
    const he = byText.get('河')!;
    const legacy = { ...createSessionRecord({ steps: ['flashcards'], reviewWordIds: [], newWordIds: [he.id], flashTimeBoxMs: 600_000, writeCandidates: [], writeCount: 0 }, '2026-10-02', 0), activeMs: 1 };
    await saveSession(app.db, legacy);
    renderWithApp(<SessionScreen free={false} />, app);
    await playThrough();
    expect((await getSession(app.db, '2026-10-02'))!.completedSteps).toEqual(['flashcards']);
  });
  it('with nothing new or due, the lesson still finishes (review focus 4)', async () => {
    const app = await setup();
    await updateSettings(app.db, { newPerDay: 0 });
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('太棒了！')).toBeTruthy();
  });
  it('a double tap on 继续 moves one item and grades once (review focus 2)', async () => {
    const app = await setup();
    await updateSettings(app.db, { newPerDay: 0 });
    await putCards(app.db, ['山', '火', '水'].map((t) => makeCard(byText.get(t)!.id, 'recognise', new Date(2026, 9, 1), true)));
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(document.querySelector('.choice:not([disabled])')).toBeTruthy());
    fireEvent.click(document.querySelector<HTMLButtonElement>('.choice:not([disabled])')!);
    const next = screen.getByText('继续');
    fireEvent.click(next);
    fireEvent.click(next);
    await waitFor(async () => expect((await getSession(app.db, '2026-10-02'))!.practiceIndex).toBe(1));
    expect((await logsSince(app.db, 0)).filter((l) => l.kind === 'recognise')).toHaveLength(1);
  });
  it("a paused word's items are skipped and the round still finishes (review focus 3)", async () => {
    const app = await setup();
    await updateSettings(app.db, { newPerDay: 0 });
    await putCards(app.db, ['山', '火'].map((t) => makeCard(byText.get(t)!.id, 'recognise', new Date(2026, 9, 1), true)));
    const first = renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(async () => expect((await getSession(app.db, '2026-10-02'))?.practiceQueue?.length).toBeGreaterThan(0));
    first.unmount();
    const fire = (await getWord(app.db, byText.get('火')!.id))!;
    await putWords(app.db, [{ ...fire, paused: true }]);
    renderWithApp(<SessionScreen free={false} />, app);
    await playThrough();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await getRungs(app.db)).has(byText.get('火')!.id)).toBe(false);
  });
});

describe('钓鱼 for what he confused, in 练一练 (spec 2026-10-05 §3.4)', () => {
  it('a word he confused gets a 钓鱼 item; catching the right fish forgets the confusion', async () => {
    const app = await setup();
    await updateSettings(app.db, { newPerDay: 0 });
    const gen = byText.get('根')!;
    await putCards(app.db, [makeCard(gen.id, 'recognise', new Date(2026, 9, 1), true)]);
    await noteConfusion(app.db, gen.id, '跟', new Date(2026, 9, 1));
    renderWithApp(<SessionScreen free={false} />, app);
    let fished = false;
    for (let i = 0; i < 60 && !screen.queryByText('太棒了！'); i++) {
      await waitFor(() => expect(screen.queryByText('太棒了！') ?? nextButton() ?? document.querySelector(OPEN)).toBeTruthy(), { timeout: 4000 });
      if (screen.queryByText('太棒了！')) break;
      const fish = document.querySelector<HTMLButtonElement>('.fishtile:not([disabled])');
      if (fish) {
        fished = true;
        await tapAndWait(screen.getByRole('button', { name: '根' }));
        await tapAndWait(screen.getByText('继续'));
        continue;
      }
      const next = nextButton();
      if (next) await tapAndWait(next); // the shared walker's rules: 继续 once it opens, else the first open tile
      else await tapAndWait(document.querySelector<HTMLElement>(OPEN)!);
    }
    expect(fished).toBe(true);
    await waitFor(async () => expect((await getConfusions(app.db)).has(gen.id)).toBe(false));
  });
});
