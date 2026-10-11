import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../../content';
import type { PairBoard } from '../../practice/pairs';
import { makeWord } from '../../test/fixtures';
import { DEFAULT_KID } from '../../types';
import { PinyinFade } from '../../ui/pinyinFade';
import { UseQuestion } from '../choose/UseQuestion';
import { FlashcardStep } from '../flashcards/FlashcardStep';
import { BuildSentence } from './BuildSentence';
import { PairGame } from './PairGame';
import { UNDERSTAND_WAIT_MS, UnderstandQuestion } from './UnderstandQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { speak } from '../../audio/speech';

const known = (...texts: string[]) => new Set(texts.flatMap((t) => Array.from(t)));
const hidden = (sel: string) => document.querySelectorAll(`${sel} .label__cell--hidden`).length;
const pys = (sel: string) => [...document.querySelectorAll(`${sel} .label__py`)].map((e) => e.textContent);
const kid = DEFAULT_KID;

describe('pinyin fades in the questions (spec 2026-10-12 §4)', () => {
  it('选一选: the sentence fades the characters he reads; a tap peeks', () => {
    const item = { kind: 'fit' as const, wordId: null, word: '晴', before: '今天是', after: '天。', options: ['晴', '睛', '请', '清'] };
    render(<PinyinFade known={known('今天是')} on><UseQuestion item={item} kid={kid} onAnswer={vi.fn()} onNext={vi.fn()} /></PinyinFade>);
    expect(hidden('.meaning-cue')).toBe(4); // 今 天 是 天
    fireEvent.click(document.querySelector('.meaning-cue .label__cell--hidden')!);
    expect(speak).toHaveBeenLastCalledWith('今', { reading: 'jīn' });
    expect(document.querySelector('.meaning-cue .label__cell--peek .label__py')!.textContent).toBe('jīn');
  });
  it('a faded character inside a usage option answers, never peeks', () => {
    const item = { kind: 'usage' as const, wordId: null, word: '晴', right: '今天是晴天。', wrong: '今天很晴。' };
    const onAnswer = vi.fn();
    render(<PinyinFade known={known(item.right, item.wrong)} on><UseQuestion item={item} kid={kid} onAnswer={onAnswer} onNext={vi.fn()} /></PinyinFade>);
    expect(hidden('.usage-opt')).toBeGreaterThan(0);
    fireEvent.click(document.querySelector('.usage-opt .label__cell--hidden')!);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.label__cell--peek')).toBeNull();
  });
  it('组句: a placed tile fades', () => {
    const item = { full: '我和哥哥都喜欢打球。', tiles: ['我', '和', '哥哥', '都', '喜欢', '打球。'], orders: [['我', '和', '哥哥', '都', '喜欢', '打球。']] };
    render(<PinyinFade known={known(item.full)} on><BuildSentence item={item} word={makeWord('和')} kid={kid} onDone={vi.fn()} /></PinyinFade>);
    fireEvent.click(document.querySelector('.build__bank .choice')!);
    expect(hidden('.build__placed')).toBeGreaterThan(0);
  });
  it('the Understand sheet: the sentence fades', () => {
    vi.useFakeTimers();
    const item = { zh: '我家有一只猫。', en: 'We have a cat at home.', choices: ['The puppy runs fast.', 'We have a cat at home.', 'The cat sleeps by the door.'] };
    render(<PinyinFade known={known(item.zh)} on><UnderstandQuestion item={item} kid={kid} onDone={vi.fn()} /></PinyinFade>);
    act(() => { vi.advanceTimersByTime(UNDERSTAND_WAIT_MS); });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'The puppy runs fast.' }));
    expect(hidden('.understand__zh')).toBe(6);
  });
  it('the pairing summary fades', () => {
    const board: PairBoard = { left: ['穿', '刷', '踢'], right: ['足球', '衣服', '牙'], pairs: [['穿', '衣服'], ['刷', '牙'], ['踢', '足球']], target: ['穿', '衣服'] };
    render(<PinyinFade known={known('穿衣服刷牙踢足球')} on><PairGame board={board} kind="match" kid={kid} onDone={vi.fn()} /></PinyinFade>);
    const tile = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.pair__tile')].find((b) => b.textContent === t)!;
    const join = (l: string, r: string) => { fireEvent.click(tile(l)); fireEvent.click(tile(r)); };
    join('穿', '牙'); join('穿', '衣服'); join('刷', '牙'); join('踢', '足球');
    expect(hidden('.pair-summary')).toBeGreaterThan(0);
  });
  it("the new-word card: its 词语 fade, the new character's own pinyin comes 2 s after it", () => {
    const sheng = builtinWords(0).find((x) => x.text === '生')!;
    render(<PinyinFade known={known('男')} on><FlashcardStep item={{ wordId: sheng.id, isNew: true, retry: false }} word={sheng} pool={builtinWords(0)} voice={false} kid={kid} resting="sulk" combo={0} closeupReady={false} onDone={vi.fn()} /></PinyinFade>);
    expect(pys('.usage')).toEqual(['', 'shēng']); // 男生: 男 is read, 生 is new
    const own = document.querySelector('.intro__char .pinyin')!;
    expect(own.textContent).toBe('shēng');
    expect(own.classList.contains('pinyin--later')).toBe(true);
  });
});
