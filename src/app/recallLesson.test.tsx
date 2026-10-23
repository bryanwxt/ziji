import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
type QuizOpts = { onComplete: (s: { totalMistakes: number }) => void; onMistake?: (d: { mistakesOnStroke: number }) => void };
const quizzes: QuizOpts[] = [];
let loadError: (() => void) | undefined;
vi.mock('hanzi-writer', () => ({
  default: {
    create: vi.fn((_el: unknown, _ch: string, opts: { onLoadCharDataError?: () => void }) => {
      loadError = opts.onLoadCharDataError;
      return { quiz: (o: QuizOpts) => { quizzes.push(o); return Promise.resolve(); }, cancelQuiz: vi.fn(), highlightStroke: vi.fn(), updateDimensions: vi.fn() };
    }),
  },
}));
import { Rating } from 'ts-fsrs';
import { getRungs, logsSince, putCards, putWords, saveSession, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { builtinWords } from '../content';
import { createSessionRecord } from '../session/runner';
import { makeCard } from '../test/fixtures';
import { SessionScreen } from './SessionScreen';

const words = builtinWords(0);
const cao = words.find((w) => w.text === '草')!;
const shan = words.find((w) => w.text === '山')!;

async function lesson() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: true, speaking: false } });
  await putCards(app.db, [makeCard(cao.id, 'recognise', new Date(2026, 9, 1), true), makeCard(cao.id, 'write', new Date(2026, 9, 20), true), makeCard(shan.id, 'recognise', new Date(2026, 9, 1), true)]);
  const rec = createSessionRecord({ steps: ['practice'], reviewWordIds: [cao.id, shan.id], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0, practiceTimeBoxMs: 300_000 }, '2026-10-02', app.now().getTime());
  const queue = [
    { wordId: cao.id, rung: 1 as const, ask: 'recall' as const, grades: 'recognise' as const, retry: false, due: true, recall: { at: 0, writeId: cao.id, ask: 'read' as const } },
    { wordId: shan.id, rung: 1 as const, ask: 'read' as const, grades: 'recognise' as const, retry: false, due: true },
  ];
  await saveSession(app.db, { ...rec, activeMs: 1000, practiceQueue: queue, practiceIndex: 0, practiceElapsedMs: 0 });
  quizzes.length = 0;
  renderWithApp(<SessionScreen free={false} />, app);
  await waitFor(() => expect(quizzes.length).toBeGreaterThan(0));
  return app;
}

describe('默写 in a lesson (real test spec 2026-10-23 §4)', () => {
  it('strokes that can’t load: the word is asked as its normal first question, and that answer grades its reading as a tap', async () => {
    const app = await lesson();
    act(() => loadError!());
    fireEvent.click(await screen.findByRole('button', { name: cao.pinyin }));
    fireEvent.click(await screen.findByText('继续'));
    await screen.findByRole('button', { name: shan.pinyin });
    const logs = await logsSince(app.db, 0);
    expect(logs.filter((l) => l.kind === 'write')).toEqual([]);
    expect(logs.find((l) => l.kind === 'recognise' && l.wordId === cao.id)?.source).toBeUndefined();
  });
  it('written right: its write card is logged as a recall, its due reading card rates Good, and the round goes on', async () => {
    const app = await lesson();
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 0 }));
    fireEvent.click(await screen.findByText('继续'));
    expect(await screen.findByRole('button', { name: shan.pinyin })).toBeTruthy(); // the next item
    const logs = await logsSince(app.db, 0);
    expect(logs.find((l) => l.kind === 'write')).toMatchObject({ wordId: cao.id, source: 'recall', correct: true, rating: Rating.Good, misses: 0 });
    expect(logs.find((l) => l.kind === 'recognise' && l.wordId === cao.id)).toMatchObject({ rating: Rating.Good, source: 'recall' });
    expect((await getRungs(app.db)).get(cao.id)).toBe(1);
  });
});
