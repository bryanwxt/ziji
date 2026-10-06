import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { getWord, logsSince, putCards, putWords, updateSettings } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SessionScreen } from './SessionScreen';

type QuizOpts = { onComplete: (s: { totalMistakes: number }) => void };
const quizzes: QuizOpts[] = [];
const created: string[] = [];
const failing = new Set<string>();
vi.mock('hanzi-writer', () => ({
  default: {
    create: vi.fn((_el: unknown, ch: string, opts: { onLoadCharDataError?: () => void }) => {
      created.push(ch);
      if (failing.has(ch)) setTimeout(() => opts.onLoadCharDataError?.(), 0);
      return { quiz: (o: QuizOpts) => { quizzes.push(o); return Promise.resolve(); }, cancelQuiz: vi.fn(), highlightStroke: vi.fn(), updateDimensions: vi.fn() };
    }),
  },
}));
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

describe('写一写 a character at a time (spec 2026-10-05 §5)', () => {
  it('writes a two-character word one character at a time and rates it once, after both, with both misses', async () => {
    const app = await makeAppData();
    await putWords(app.db, [makeWord('朋友', { id: 'p:1', source: 'parent', level: null, rank: null, pinyin: 'péng you', writeable: true })]);
    await putCards(app.db, [makeCard('p:1', 'recognise', new Date(2026, 9, 20), true), makeCard('p:1', 'write', new Date(2026, 9, 1))]);
    await updateSettings(app.db, { activities: { newwords: false, practice: false, writing: true, speaking: false } });
    renderWithApp(<SessionScreen free={false} />, app);
    const writes = async () => (await logsSince(app.db, 0)).filter((l) => l.kind === 'write');
    await waitFor(() => expect(quizzes.length).toBe(1));
    expect(created.at(-1)).toBe('朋');
    expect(document.querySelectorAll('.dots .dot')).toHaveLength(1);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 1 }));
    fireEvent.click(screen.getByText('完成'));
    await waitFor(() => expect(quizzes.length).toBe(2));
    expect(created.at(-1)).toBe('友');
    expect(await writes()).toHaveLength(0); // not rated after one character
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 2 }));
    fireEvent.click(screen.getByText('完成'));
    await waitFor(async () => expect(await writes()).toHaveLength(1));
    expect((await writes())[0]!.misses).toBe(3);
  });
});

describe('sweep: a due word whose strokes fail to load', () => {
  it('is marked, so it goes behind the others next time (not only a never-written one)', async () => {
    failing.add('龘');
    const app = await makeAppData();
    await putWords(app.db, [makeWord('龘', { id: 'p:2', source: 'parent', level: null, rank: null, pinyin: 'dá', writeable: true })]);
    await putCards(app.db, [makeCard('p:2', 'recognise', new Date(2026, 9, 20), true), { ...makeCard('p:2', 'write', new Date(2026, 9, 1)), fsrs: { ...makeCard('p:2', 'write', new Date(2026, 9, 1)).fsrs, reps: 3 } }]);
    await updateSettings(app.db, { activities: { newwords: false, practice: false, writing: true, speaking: false } });
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(async () => expect((await getWord(app.db, 'p:2'))?.writeSkippedAt).toBeTruthy(), { timeout: 3000 });
  });
});

