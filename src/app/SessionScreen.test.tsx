import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allCards, answersSince, getSession, getWord, putCards, putWords, saveKid, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));
const flashOnly = { ...DEFAULT_SETTINGS.activities, choose: false, writing: false, components: false, speaking: false };

async function setup() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await updateSettings(app.db, { newPerDay: 2, activities: flashOnly });
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

  it('runs a short daily session to the celebration and saves progress', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    const learned: string[] = [];
    // Each new word is met 3 times (spec §20 part 2): intro + reading, a second reading, then its meaning.
    const ready = () => waitFor(() => expect(screen.queryByText('太棒了！') ?? screen.queryByText('我记住了！') ?? document.querySelector('.choice:not([disabled])')).toBeTruthy());
    let wrapped = false;
    for (let i = 0; i < 20; i++) {
      await ready();
      if (screen.queryByText('太棒了！')) break;
      if (screen.queryByText('用一用！')) wrapped = true; // the lesson closes with 用一用 (spec §20 part 7)
      const sentences = document.querySelector('.usage-opts');
      if (sentences) {
        fireEvent.click(sentences.querySelector<HTMLButtonElement>('.choice')!);
        fireEvent.click(screen.getByText('继续'));
        continue;
      }
      if (screen.queryByText('我记住了！')) {
        learned.push(document.querySelector('.intro .hanzi--xl')!.textContent!);
        fireEvent.click(screen.getByText('我记住了！'));
      }
      const shown = document.querySelector('.flash__prompt .hanzi--q')?.textContent;
      const answer = shown ? byText.get(shown)!.pinyin : [...document.querySelectorAll('.choice')].map((b) => b.textContent!).find((t) => learned.includes(t))!;
      fireEvent.click(screen.getByRole('button', { name: answer }));
      fireEvent.click(screen.getByText('继续'));
    }
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect(wrapped).toBe(true);
    await waitFor(() => expect(document.querySelector('.chip')?.textContent?.trim()).toBe('1'));
    expect(document.querySelector('.chip svg.inkicon')).toBeTruthy();
    expect((await allCards(app.db)).filter((c) => c.kind === 'recognise')).toHaveLength(2);
    expect((await getSession(app.db, '2026-10-02'))?.completed).toBe(true);
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
  it('a begun word with a 组词 cue gets a meaning question, and the answer reviews its meaning card', async () => {
    const app = await makeAppData();
    await putWords(app.db, words);
    await updateSettings(app.db, { newPerDay: 0, activities: flashOnly });
    await putCards(app.db, [makeCard('b:惜', 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<SessionScreen free={false} />, app);
    expect((await screen.findAllByText('珍')).length).toBeGreaterThan(0); // 可惜 is skipped: 可 is a glue character
    fireEvent.click(screen.getByRole('button', { name: '惜' }));
    fireEvent.click(screen.getByText('继续'));
    await waitFor(async () => expect((await allCards(app.db)).map((c) => c.id)).toContain('b:惜:meaning'));
  });
});


describe('选一选 in the lesson (spec §20 part 4)', () => {
  it('runs his words in sentences, rates the meaning of the word answered, and ends the lesson', async () => {
    const app = await makeAppData();
    await putWords(app.db, words);
    await updateSettings(app.db, { newPerDay: 0, activities: { ...flashOnly, flashcards: false, choose: true } });
    await putCards(app.db, ['很', '在', '和', '跟'].map((t) => makeCard(byText.get(t)!.id, 'recognise', new Date(2026, 9, 20), true)));
    renderWithApp(<SessionScreen free={false} />, app);
    for (let i = 0; i < 10 && !screen.queryByText('太棒了！'); i++) {
      await waitFor(() => expect(screen.queryByText('太棒了！') ?? document.querySelector('.choice:not([disabled])')).toBeTruthy());
      if (screen.queryByText('太棒了！')) break;
      fireEvent.click(document.querySelector<HTMLButtonElement>('.choice:not([disabled])')!);
      fireEvent.click(screen.getByText('继续')); // at once, before the answer has saved
    }
    await waitFor(() => expect(screen.queryByText('太棒了！'), document.body.innerHTML.replace(/<svg.*?<\/svg>/g, '').replace(/<small.*?<\/small>/g, '').slice(0, 1800)).toBeTruthy());
    expect((await allCards(app.db)).some((c) => c.kind === 'meaning')).toBe(true);
    expect((await answersSince(app.db, 0)).filter((a) => a.skill === 'use').length).toBeGreaterThan(0); // every answer is logged for the Skills panel
  });
});
