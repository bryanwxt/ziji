import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { addReviewLog, allCards, getWord, logsSince, putCards, putWords, updateSettings } from '../store/repo';
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

describe('写一写 credits the 组词 he wrote (production practice spec §3)', () => {
  it('two characters of one word rate its meaning once, a traced read-only character is marked traced, and the trace rates no write card', async () => {
    const app = await makeAppData();
    const day = new Date(2026, 9, 1);
    const far = new Date(2026, 9, 20);
    await putWords(app.db, [
      makeWord('桌椅', { id: 'p:1', source: 'parent', level: null, rank: null, pinyin: 'zhuō yǐ', writeable: true, examples: [{ text: '新桌椅', pinyin: 'xīn zhuō yǐ' }] }),
      makeWord('澡', { id: 'p:3', source: 'parent', level: null, rank: null, pinyin: 'zǎo', writeable: false, examples: [{ text: '洗澡', pinyin: 'xǐ zǎo' }] }), // read-only: traced
    ]);
    await putCards(app.db, [
      makeCard('p:1', 'recognise', far, true), makeCard('p:1', 'write', day), makeCard('p:1', 'meaning', far, true), // Use is open for both
      makeCard('p:3', 'recognise', far, true), makeCard('p:3', 'meaning', far, true),
    ]);
    await addReviewLog(app.db, { cardId: 'p:3:recognise', wordId: 'p:3', kind: 'recognise', at: day.getTime(), rating: 3, correct: true }); // a recent lesson word
    await updateSettings(app.db, { activities: { newwords: false, practice: false, writing: true, speaking: false } });
    renderWithApp(<SessionScreen free={false} />, app);
    const logs = async () => await logsSince(app.db, 0);
    // every item is written without a miss, whichever order they come in
    let done = 0;
    const base = quizzes.length;
    created.length = 0;
    for (let i = 0; i < 3; i++) {
      await waitFor(() => expect(quizzes.length).toBe(base + i + 1));
      act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 0 }));
      fireEvent.click(await screen.findByText('完成'));
      done++;
    }
    await waitFor(async () => expect((await getWord(app.db, 'p:3'))!.tracedAt).toBeTruthy());
    expect(done).toBe(3);
    expect([...created].sort()).toEqual(['椅', '桌', '澡'].sort());
    await waitFor(async () => expect((await logs()).filter((l) => l.wordId === 'p:1' && l.kind === 'write')).toHaveLength(1)); // the word is rated after its last character
    const all = await logs();
    const credit = (id: string) => all.filter((l) => l.wordId === id && l.kind === 'meaning' && l.source === 'write');
    expect(credit('p:1')).toHaveLength(1); // one rating for the word, not one per character
    expect(all.filter((l) => l.wordId === 'p:1' && l.kind === 'write')).toHaveLength(1); // rated once, after both characters
    expect(all.filter((l) => l.wordId === 'p:3' && l.kind === 'write')).toEqual([]); // the trace rates no write card
    expect((await allCards(app.db)).some((c) => c.id === 'p:3:write')).toBe(false);
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

