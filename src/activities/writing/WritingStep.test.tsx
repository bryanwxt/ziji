import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { DEFAULT_KID } from '../../types';
import { speak } from '../../audio/speech';
import HanziWriter from 'hanzi-writer';
import { WritingStep } from './WritingStep';

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

describe('WritingStep', () => {
  it('writes each character in turn and reports the total misses', () => {
    quizzes.length = 0;
    const onDone = vi.fn();
    render(<WritingStep word={makeWord('大人', { pinyin: 'dà rén' })} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={onDone} />);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 1 }));
    fireEvent.click(screen.getByText('下一个字'));
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 2 }));
    fireEvent.click(screen.getByText('完成'));
    expect(onDone).toHaveBeenCalledWith({ totalMisses: 3, hinted: false, elapsedMs: expect.any(Number) });
  });

  it('a new word written from memory with no misses gets the 咦！ close-up (face only), when one is due', () => {
    quizzes.length = 0;
    const { unmount } = render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew pass="recall" closeupReady onDone={vi.fn()} />);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 0 }));
    expect(document.querySelector('.closeup .closeup__face svg.truffle')).toBeTruthy();
    unmount();
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew pass="recall" onDone={vi.fn()} />);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 0 }));
    expect(document.querySelector('.closeup')).toBeNull(); // not due: no close-up
  });
  it('writes only the character it is given (spec 2026-10-05 §5)', () => {
    quizzes.length = 0;
    const onDone = vi.fn();
    render(<WritingStep word={makeWord('大人', { pinyin: 'dà rén' })} at={1} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={onDone} />);
    expect(document.querySelectorAll('.dots .dot')).toHaveLength(1);
    expect(vi.mocked(HanziWriter.create).mock.calls.at(-1)![1]).toBe('人');
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 2 }));
    fireEvent.click(screen.getByText('完成'));
    expect(onDone).toHaveBeenCalledWith({ totalMisses: 2, hinted: false, elapsedMs: expect.any(Number) });
  });
  it('skips the word when its stroke data cannot load', () => {
    const onDone = vi.fn();
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={onDone} />);
    act(() => loadError!());
    expect(onDone).toHaveBeenCalledWith(null);
  });
});

describe('WritingStep cue: more than the pinyin (parent, 2026-10-04)', () => {
  it('a word with a sentence: the sentence with a gap for the word, said in full after the word — no English', () => {
    const hen = makeWord('很', { pinyin: 'hěn', meaning: 'very', examples: [{ text: '很多', pinyin: 'hěn duō' }] });
    vi.mocked(speak).mockClear();
    render(<WritingStep word={hen} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
    expect(document.querySelector('.write__sentence')?.textContent).toBe('这个书包＿大。');
    expect(speak).toHaveBeenLastCalledWith('很，这个书包很大。');
    expect(document.querySelector('[lang="en"]')).toBeNull();
    expect(screen.queryByText('very')).toBeNull();
  });
  it('a two-character school word: one gap box per character in its class sentence', () => {
    const w = makeWord('保持', { id: 'p:1', pinyin: 'bǎo chí', source: 'parent', level: null, sentences: [{ text: '教室里要保持安静。', pinyin: '' }] });
    render(<WritingStep word={w} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
    expect(document.querySelector('.write__sentence')?.textContent).toBe('教室里要＿＿安静。');
  });
  it('a screen reader hears the gap as 空格, not an underscore', () => {
    const w = makeWord('保持', { id: 'p:1', pinyin: 'bǎo chí', source: 'parent', level: null, sentences: [{ text: '教室里要保持安静。', pinyin: '' }] });
    render(<WritingStep word={w} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
    expect(document.querySelector('.write__sentence')!.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('教室里要空格空格安静。').classList.contains('sr-only')).toBe(true);
  });
  it('no sentence: the blanked 组词 and which 儿 is meant, as before', () => {
    const er = makeWord('儿', { pinyin: 'ér', meaning: 'son, child', examples: [{ text: '儿子', pinyin: 'ér zi' }] });
    vi.mocked(speak).mockClear();
    render(<WritingStep word={er} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
    expect(document.querySelector('.write__sentence')).toBeNull();
    expect(document.querySelector('.write__blank .label')?.getAttribute('data-py')).toBe('zi');
    expect(screen.getByText('空格子')).toBeTruthy(); // the screen-reader copy says the gap
    expect(speak).toHaveBeenLastCalledWith('儿，儿子的儿');
    fireEvent.click(screen.getByLabelText('听'));
    expect(speak).toHaveBeenLastCalledWith('儿，儿子的儿');
  });
  it('a word with no cue shows neither line', () => {
    render(<WritingStep word={makeWord('大人', { pinyin: 'dà rén', source: 'parent' })} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
    expect(document.querySelector('.write__sentence')).toBeNull();
    expect(document.querySelector('.write__blank')).toBeNull();
  });
});

describe('WritingStep Truffle', () => {
  const mood = () => document.querySelector('svg.truffle')!.getAttribute('data-mood');
  it('stays kind after a messy character and only goes wide-eyed when a new word is finished cleanly', () => {
    quizzes.length = 0;
    render(<WritingStep word={makeWord('大人', { pinyin: 'dà rén' })} kid={DEFAULT_KID} resting="sulk" isNew pass="recall" onDone={vi.fn()} />);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 0 }));
    expect(mood()).not.toBe('wow');
    fireEvent.click(screen.getByText('下一个字'));
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 0 }));
    expect(mood()).toBe('wow');
  });
  it('never side-eyes a hard character', () => {
    quizzes.length = 0;
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 6 }));
    expect(mood()).toBe('neutral');
  });

  it('the trace pass shows the outline; the hint pass flashes the first stroke and hints after 1 miss; recall hints after 2', () => {
    const create = vi.mocked(HanziWriter.create);
    for (const [pass, outline, hintAfter] of [['trace', true, 1], ['hint', false, 1], ['recall', false, 2]] as const) {
      create.mockClear();
      const { unmount } = render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew pass={pass} onDone={vi.fn()} />);
      expect(create.mock.calls[0]![2]).toMatchObject({ showOutline: outline, showHintAfterMisses: hintAfter });
      unmount();
    }
  });
  it('reports a hint when a stroke was missed twice in the recall pass', () => {
    quizzes.length = 0;
    const onDone = vi.fn();
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={onDone} />);
    act(() => { quizzes.at(-1)!.onMistake!({ mistakesOnStroke: 2 }); quizzes.at(-1)!.onComplete({ totalMistakes: 2 }); });
    fireEvent.click(screen.getByText('完成'));
    expect(onDone).toHaveBeenCalledWith({ totalMisses: 2, hinted: true, elapsedMs: expect.any(Number) });
  });
  it('the pet says which pass it is', () => {
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew pass="trace" onDone={vi.fn()} />);
    expect(screen.getByText('描一描！')).toBeTruthy();
  });
});

describe('写一写 on the stage (spec 2026-10-04 §3)', () => {
  it('Truffle in his spot, cue and box on the card', () => {
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
    const stage = document.querySelector('.stage[data-stage="write"]')!;
    expect(stage.querySelector('.stage__truffle .pet')).toBeTruthy();
    expect(stage.querySelector('.stage__card .write__cue')).toBeTruthy();
    expect(stage.querySelector('.stage__card .tianzige')).toBeTruthy();
  });
  it('re-measures the box when the screen resizes, keeping the strokes he has drawn (an iPad rotated mid-character; review focus 2)', () => {
    quizzes.length = 0;
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
    const creates = vi.mocked(HanziWriter.create).mock.calls.length;
    const writer = vi.mocked(HanziWriter.create).mock.results.at(-1)!.value as { updateDimensions: ReturnType<typeof vi.fn> };
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(writer.updateDimensions).toHaveBeenCalledWith({ width: expect.any(Number), height: expect.any(Number) });
    expect(vi.mocked(HanziWriter.create).mock.calls.length).toBe(creates); // resized in place: the quiz and his strokes stay
  });
});

describe('Truffle in 写一写 (spec 2026-10-04 §4.3–4.4)', () => {
  it('calm while writing; a nod (happy) on each right stroke; happy when the character is done', () => {
    quizzes.length = 0;
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-calm')).toBe('true');
    act(() => quizzes.at(-1)!.onCorrectStroke?.({}));
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-expression')).toBe('happy');
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 0 }));
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-calm')).toBeNull();
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-expression')).toBe('happy');
  });
  it('a new word from memory with no misses: joy (the hard moment)', () => {
    quizzes.length = 0;
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew pass="recall" onDone={vi.fn()} />);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 0 }));
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-expression')).toBe('joy');
  });
});
