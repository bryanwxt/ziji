import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import HanziWriter from 'hanzi-writer';
import { speak } from '../../audio/speech';
import { builtinWords } from '../../content';
import { DEFAULT_KID } from '../../types';
import { RecallQuestion } from './RecallQuestion';
import { PracticeQuestion } from './PracticeQuestion';

type QuizOpts = { onComplete: (s: { totalMistakes: number }) => void; onCorrectStroke?: (d: unknown) => void; onMistake?: (d: { mistakesOnStroke: number }) => void };
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
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));

const pool = builtinWords(0);
const cao = pool.find((w) => w.text === '草')!; // its cue: 草，草地的，草 with ＿地 shown

describe('默写 (real test spec 2026-10-23 §4)', () => {
  it('says the 组词 cue at the card’s reading and shows it with the character gapped; no outline, no pinyin of the target', () => {
    render(<RecallQuestion word={cao} at={0} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(vi.mocked(speak)).toHaveBeenLastCalledWith('草，草地的，草', { reading: cao.pinyin });
    expect(document.querySelector('.write__blank')?.textContent).toContain('＿');
    expect(document.querySelector('.write__blank')?.textContent).not.toContain('草');
    expect(document.body.textContent).not.toContain(cao.pinyin);
    expect(vi.mocked(HanziWriter.create).mock.calls.at(-1)![1]).toBe('草');
    expect(vi.mocked(HanziWriter.create).mock.calls.at(-1)![2]).toMatchObject({ showOutline: false, showCharacter: false, showHintAfterMisses: 2 });
    expect(document.querySelector('.speak')).toBeTruthy(); // the speaker replays the cue
  });
  it('finished with at most 1 miss and no hint is right', () => {
    quizzes.length = 0;
    const onDone = vi.fn();
    render(<RecallQuestion word={cao} at={0} kid={DEFAULT_KID} onDone={onDone} />);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 1 }));
    expect(screen.getByText('写对了！')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith({ totalMisses: 1, hinted: false, elapsedMs: expect.any(Number) });
  });
  it('a hint (after 2 misses on a stroke) counts as wrong', () => {
    quizzes.length = 0;
    const onDone = vi.fn();
    render(<PracticeQuestion pool={pool} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} word={cao} item={{ wordId: cao.id, rung: 1, ask: 'recall', grades: 'recognise', retry: false, recall: { at: 0, writeId: cao.id, ask: 'read' } }} onDone={onDone} />);
    act(() => quizzes.at(-1)!.onMistake!({ mistakesOnStroke: 2 }));
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 2 }));
    expect(screen.queryByText('写对了！')).toBeNull();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false, asked: 'write', recall: { totalMisses: 2, hinted: true } }));
  });
  it('strokes that can’t load: the word’s normal first question is asked instead', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion pool={pool} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} word={cao} item={{ wordId: cao.id, rung: 1, ask: 'recall', grades: 'recognise', retry: false, recall: { at: 0, writeId: cao.id, ask: 'read' } }} onDone={onDone} />);
    act(() => loadError!());
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: cao.pinyin }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'read' }));
  });
});
