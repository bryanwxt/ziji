import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allCards, getSession, getWord, putCards, putWords, saveKid, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));
const flashOnly = { ...DEFAULT_SETTINGS.activities, writing: false, components: false, speaking: false };

async function setup() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await updateSettings(app.db, { newPerDay: 2, activities: flashOnly });
  return app;
}

const introWord = () => document.querySelector('.intro .hanzi--xl')?.textContent ?? null;

async function learnCurrentWord() {
  fireEvent.click(await screen.findByText('我记住了！'));
  const shown = document.querySelector('.hanzi--xl')!.textContent!;
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
    await learnCurrentWord();
    await learnCurrentWord();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    await waitFor(() => expect(document.querySelector('.chip')?.textContent?.trim()).toBe('1'));
    expect(document.querySelector('.chip svg.inkicon')).toBeTruthy();
    expect(await allCards(app.db)).toHaveLength(2);
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
    expect((await screen.findAllByText('可')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '惜' }));
    fireEvent.click(screen.getByText('继续'));
    await waitFor(async () => expect((await allCards(app.db)).map((c) => c.id)).toContain('b:惜:meaning'));
  });
});

