import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allCards, answersSince, getRungs, getSession, getWord, logsSince, noteRung, putCards, putWords, saveKid, saveSession, updateSettings } from '../store/repo';
import { createSessionRecord } from '../session/runner';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));
const lessonOnly = { newwords: true, practice: true, writing: false, speaking: false };
/** Taps, then waits for the screen to change (answers save to IndexedDB before the next card shows). */
async function tapAndWait(...els: HTMLElement[]) {
  const before = document.body.textContent;
  for (const el of els) fireEvent.click(el);
  await waitFor(() => expect(document.body.textContent).not.toBe(before));
}
/** Answers whatever is on screen until the celebration: 我记住了！, else the first choice then 继续. `seen` gets each screen's stage. */
async function playThrough(max = 60, seen: string[] = []) {
  for (let i = 0; i < max && !screen.queryByText('太棒了！'); i++) {
    await waitFor(() => expect(screen.queryByText('太棒了！') ?? screen.queryByText('我记住了！') ?? document.querySelector('.choice:not([disabled])')).toBeTruthy());
    if (screen.queryByText('太棒了！')) break;
    seen.push(document.querySelector('[data-stage]')?.getAttribute('data-stage') ?? '');
    if (screen.queryByText('我记住了！')) {
      await tapAndWait(screen.getByText('我记住了！'));
      continue;
    }
    fireEvent.click(document.querySelector<HTMLButtonElement>('.choice:not([disabled])')!);
    await tapAndWait(screen.getByText('继续'));
  }
}

async function setup() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await updateSettings(app.db, { newPerDay: 2, activities: lessonOnly });
  return app;
}

const introWord = () => document.querySelector('.intro .hanzi--xl')?.textContent ?? null;

async function learnCurrentWord() {
  fireEvent.click(await screen.findByText('我记住了！'));
  const shown = document.querySelector('[data-q]')!.textContent!;
  fireEvent.click(screen.getByRole('button', { name: byText.get(shown)!.pinyin }));
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
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    const stages: string[] = [];
    await playThrough(60, stages);
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    const rec = (await getSession(app.db, '2026-10-02'))!;
    expect(rec.completed).toBe(true);
    expect(rec.completedSteps).toEqual(['newwords', 'practice']);
    expect(rec.practiceQueue!.filter((x) => !x.retry).length).toBeGreaterThanOrEqual(6); // two new words, three climbs each
    expect((await allCards(app.db)).filter((c) => c.kind === 'recognise')).toHaveLength(2);
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
    await putCards(app.db, [makeCard('b:惜', 'recognise', new Date(2026, 9, 1), true)]);
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
