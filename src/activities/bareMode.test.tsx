// The check's bare mode (weekly list spec 2026-10-17 §8.1): no pinyin anywhere, nothing said before or after the answer, no
// right/wrong shown and no feedback sheet — the pick goes straight on. Invented fixtures: 风筝, 雨伞, 小河, 钓鱼, 拔萝卜, 摘苹果, 浇花朵.
import { cleanup, fireEvent, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { speak } from '../audio/speech';
import { mulberry32 } from '../lib/random';
import { listBoard } from '../practice/pairs';
import { makeWord } from '../test/fixtures';
import { DEFAULT_KID, type Word } from '../types';
import { fitUseItem } from '../weeklist/fit';
import { UseQuestion } from './choose/UseQuestion';
import { FlashcardStep } from './flashcards/FlashcardStep';
import { MatchQuestion } from './practice/MatchQuestion';
import { PairGame } from './practice/PairGame';

const parent = (text: string, pinyin: string, meaning?: string): Word => makeWord(text, { id: `p:${text}`, source: 'parent', pinyin, meaning, rank: null, level: null });
const pool = [parent('风筝', 'fēng zheng', 'kite'), parent('雨伞', 'yǔ sǎn', 'umbrella'), parent('小河', 'xiǎo hé', 'stream'), parent('钓鱼', 'diào yú', 'to fish'), parent('书包', 'shū bāo', 'school bag')];
// the question on the card: Truffle's bubble and the sheet's button are instructions, not the words he is asked
const shownPinyin = () => [...document.querySelectorAll('.stage__card .label__py, .stage__card .pinyin')].map((e) => e.textContent ?? '').filter((t) => t.trim());
const choice = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent === t)!;
const noVerdict = () => expect(document.querySelector('.is-answer, .is-wrong, .is-eaten, .sheet--good, .sheet--oops')).toBeNull();

afterEach(() => { cleanup(); vi.mocked(speak).mockClear(); });

describe('bare mode', () => {
  it('UseQuestion: the sentence without pinyin or a speak button; a pick answers and goes on at once', () => {
    const onAnswer = vi.fn();
    const onNext = vi.fn();
    const item = fitUseItem({ wordId: 'p:雨伞', sentence: '下雨了，我打着＿上学。', source: 'parent', wrong: ['风筝', '小河', '钓鱼'] }, pool[1]!, mulberry32(1), pool);
    render(<UseQuestion item={item} kid={DEFAULT_KID} bare onAnswer={onAnswer} onNext={onNext} />);
    expect(shownPinyin()).toEqual([]);
    expect(document.querySelector('button.speak')).toBeNull();
    fireEvent.click(choice('风筝'));
    expect(onAnswer).toHaveBeenCalledWith(false, expect.any(Number));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(speak).not.toHaveBeenCalled();
    noVerdict();
  });
  it('MatchQuestion: a pick answers at once, nothing said, the answer not shown', () => {
    const onDone = vi.fn();
    render(<MatchQuestion question={{ verb: '拔', noun: '萝卜', options: ['雨伞', '萝卜', '小河', '钓鱼'] }} kid={DEFAULT_KID} bare onDone={onDone} />);
    fireEvent.click(choice('小河'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
    expect(speak).not.toHaveBeenCalled();
    expect(document.querySelector('.match__slot')!.textContent).toBe('？');
    noVerdict();
  });
  it('PairGame: no match shown after three misses; the board ends when every pair is joined, with each pair graded', () => {
    const onDone = vi.fn();
    const board = listBoard([
      { left: '拔', right: '萝卜', wrong: ['苹果', '花朵', '书包'] },
      { left: '摘', right: '苹果', wrong: ['萝卜', '花朵', '书包'] },
      { left: '浇', right: '花朵', wrong: ['萝卜', '苹果', '书包'] },
    ], mulberry32(4))!;
    render(<PairGame board={board} kind="match" kid={DEFAULT_KID} bare onDone={onDone} />);
    const tile = (t: string, side: 'left' | 'right') => [...document.querySelectorAll<HTMLButtonElement>(`.pairs__col--${side} .pair__tile`)].find((b) => b.textContent === t)!;
    for (let n = 0; n < 3; n++) { fireEvent.click(tile('拔', 'left')); fireEvent.click(tile('书包', 'right')); }
    expect(document.querySelector('.is-shown')).toBeNull(); // SHOW_AFTER is off
    for (const [l, r] of [['拔', '萝卜'], ['摘', '苹果'], ['浇', '花朵']] as const) { fireEvent.click(tile(l, 'left')); fireEvent.click(tile(r, 'right')); }
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0].pairs).toEqual(expect.arrayContaining([{ left: '拔', right: '萝卜', correct: false }, { left: '摘', right: '苹果', correct: true }]));
    expect(speak).not.toHaveBeenCalled();
    expect(document.querySelector('.pair-summary')).toBeNull();
  });
  it('FlashcardStep read: the word alone, nothing said, a pick answers at once with no usage line or verdict', () => {
    const onDone = vi.fn();
    render(<FlashcardStep item={{ wordId: 'p:风筝', isNew: false, retry: false }} ask="read" word={pool[0]!} pool={pool} voice kid={DEFAULT_KID} resting="neutral" combo={0} closeupReady={false} bare onDone={onDone} />);
    expect(shownPinyin()).toEqual([]);
    expect(document.querySelector('.hanzi--q')!.textContent).toBe('风筝');
    const wrong = [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== 'fēng zheng')!;
    fireEvent.click(wrong);
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false, asked: 'read' }));
    expect(speak).not.toHaveBeenCalled();
    expect(document.querySelector('.usage')).toBeNull();
    noVerdict();
  });
  it('FlashcardStep meaning: English choices for the word, never heard', () => {
    const onDone = vi.fn();
    render(<FlashcardStep item={{ wordId: 'p:风筝', isNew: false, retry: false }} ask="meaningRead" word={pool[0]!} pool={pool} voice kid={DEFAULT_KID} resting="neutral" combo={0} closeupReady={false} bare onDone={onDone} />);
    expect(shownPinyin()).toEqual([]);
    fireEvent.click(choice('kite'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
    expect(speak).not.toHaveBeenCalled();
  });
});
