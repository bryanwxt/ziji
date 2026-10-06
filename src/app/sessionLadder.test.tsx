import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
import { allCards, putWords, saveSession, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { builtinWords } from '../content';
import { createSessionRecord } from '../session/runner';
import { SessionScreen } from './SessionScreen';
import { cardMeaning } from '../content/glossary';
import { firstSense } from '../activities/flashcards/distractors';

const words = builtinWords(0);
const lessonOnly = { newwords: true, practice: true, writing: false, speaking: false };

async function setup(voice: boolean) {
  const app = await makeAppData({ voice });
  await putWords(app.db, words);
  await updateSettings(app.db, { newPerDay: 2, activities: lessonOnly });
  return app;
}

describe('a lesson on the ladder (spec 2026-10-06 §3.2)', () => {
  it('认新字 asks a new word by ear, and the answer opens its hear card', async () => {
    const app = await setup(true);
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我记住了！');
    const shown = words.find((w) => w.text === document.querySelector('.intro .hanzi--xl')?.textContent)!;
    fireEvent.click(screen.getByText('我记住了！'));
    expect(await screen.findByText('听一听，是什么意思？')).toBeTruthy();
    fireEvent.click(screen.getByText(firstSense(cardMeaning(shown)!))); // right: a miss shows the card again first
    fireEvent.click(await screen.findByText('继续'));
    await waitFor(async () => expect((await allCards(app.db)).some((c) => c.kind === 'hear')).toBe(true));
    expect((await allCards(app.db)).some((c) => c.kind === 'recognise')).toBe(false); // reading opens only when hearing passes
  });
  it('no voice: hear items are skipped, the lesson goes on, and nothing is graded as hearing', async () => {
    const app = await setup(false);
    renderWithApp(<SessionScreen free={false} />, app);
    fireEvent.click(await screen.findByText('我记住了！'));
    expect(await screen.findByText('这个词是什么意思？')).toBeTruthy();
    fireEvent.click(document.querySelector<HTMLElement>('.choice')!);
    fireEvent.click(await screen.findByText('继续'));
    await waitFor(() => expect(screen.queryByText('这个词是什么意思？')).toBeNull());
    expect((await allCards(app.db)).filter((c) => c.kind === 'hear')).toEqual([]);
  });
  it('a lesson planned before the ladder resumes', async () => {
    const app = await setup(true);
    const old = createSessionRecord({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [words[0]!.id], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, '2026-10-02', app.now().getTime());
    await saveSession(app.db, { ...old, activeMs: 1000 }); // touched: resumed, not replanned; no hearReviewIds
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('我记住了！')).toBeTruthy();
  });
});
