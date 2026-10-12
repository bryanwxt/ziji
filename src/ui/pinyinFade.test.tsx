import { act, fireEvent, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Label } from './Label';
import { PEEK_MS, PinyinFade, showPinyin } from './pinyinFade';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
import { speak } from '../audio/speech';

const pys = (c: Element) => [...c.querySelectorAll('.label__py')].map((e) => e.textContent);
afterEach(() => vi.useRealTimers());

const readings = (r: Record<string, string[]>) => new Map(Object.entries(r).map(([ch, s]) => [ch, new Set(s)]));

describe('showPinyin (spec 2026-10-12 §4)', () => {
  it("shows until the character's Read rung passes; the switch off shows it always", () => {
    expect(showPinyin('你', 'nǐ', new Set('你'), readings({ 你: ['nǐ'] }), true)).toBe(false);
    expect(showPinyin('好', 'hǎo', new Set('你'), readings({ 你: ['nǐ'] }), true)).toBe(true);
    expect(showPinyin('你', 'nǐ', new Set('你'), readings({ 你: ['nǐ'] }), false)).toBe(true);
  });
  it('a 多音字 hides only at a reading he knows (final review I1)', () => {
    const k = new Set('一只');
    const r = readings({ 一: ['yì'], 只: ['zhī'] }); // from 一只 yì zhī
    expect(showPinyin('只', 'zhī', k, r, true)).toBe(false);
    expect(showPinyin('只', 'zhǐ', k, r, true)).toBe(true); // 只有
    expect(showPinyin('只', 'zhǐ', k, r, false)).toBe(true);
  });
  it('a 轻声 syllable matches a known reading of the same sound; 一 and 不 keep theirs through a tone change', () => {
    const r = readings({ 子: ['zǐ'], 一: ['yī'], 不: ['bù'] });
    const k = new Set('子一不');
    expect(showPinyin('子', 'zi', k, r, true)).toBe(false); // 杯子
    expect(showPinyin('子', 'zī', k, r, true)).toBe(true);
    for (const syl of ['yī', 'yí', 'yì']) expect(showPinyin('一', syl, k, r, true)).toBe(false);
    for (const syl of ['bù', 'bú']) expect(showPinyin('不', syl, k, r, true)).toBe(false);
    expect(showPinyin('不', 'fǒu', k, r, true)).toBe(true);
  });
  it('without a syllable, or with no reading on record for a known character, the character alone decides', () => {
    expect(showPinyin('只', undefined, new Set('只'), readings({ 只: ['zhī'] }), true)).toBe(false);
    expect(showPinyin('只', 'zhǐ', new Set('只'), readings({}), true)).toBe(false);
    expect(showPinyin('只', 'zhǐ', new Set('只'), undefined, true)).toBe(false);
  });
});

describe('faded pinyin in a Label (spec 2026-10-12 §4)', () => {
  it('hides a known syllable but keeps its slot; a tap shows it for 3 s and says it', () => {
    vi.useFakeTimers();
    const { container } = render(<PinyinFade known={new Set('你')} on><Label zh="你好" fade /></PinyinFade>);
    expect(pys(container)).toEqual(['', 'hǎo']);
    expect(container.querySelectorAll('.label__cell--hidden')).toHaveLength(1);
    expect(container.querySelector('.label')!.getAttribute('data-py')).toBe('hǎo');
    fireEvent.click(container.querySelector('.label__cell--hidden')!);
    expect(pys(container)).toEqual(['nǐ', 'hǎo']);
    expect(container.querySelector('.label__cell--peek')).toBeTruthy();
    expect(speak).toHaveBeenLastCalledWith('你', { reading: 'nǐ' });
    act(() => { vi.advanceTimersByTime(PEEK_MS - 1); });
    expect(pys(container)).toEqual(['nǐ', 'hǎo']);
    act(() => { vi.advanceTimersByTime(1); });
    expect(pys(container)).toEqual(['', 'hǎo']);
  });
  it('one peek at a time; a new one restarts the 3 s', () => {
    vi.useFakeTimers();
    const { container } = render(<PinyinFade known={new Set('你好们')} on><Label zh="你好" fade /><Label zh="你们" fade /></PinyinFade>);
    const [a, b] = [...container.querySelectorAll('.label')];
    fireEvent.click(a!.querySelector('.label__cell--hidden')!);
    act(() => { vi.advanceTimersByTime(2000); });
    fireEvent.click(b!.querySelectorAll('.label__cell--hidden')[1]!);
    expect(pys(a!)).toEqual(['', '']);
    expect(pys(b!)).toEqual(['', 'men']);
    act(() => { vi.advanceTimersByTime(1500); }); // past the first peek's 3 s: the second still shows
    expect(pys(b!)).toEqual(['', 'men']);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(pys(b!)).toEqual(['', '']);
  });
  it('fades nothing without a PinyinFade, with the switch off, or on a line that does not opt in', () => {
    expect(pys(render(<Label zh="你好" fade />).container)).toEqual(['nǐ', 'hǎo']);
    expect(pys(render(<PinyinFade known={new Set('你好')} on={false}><Label zh="你好" fade /></PinyinFade>).container)).toEqual(['nǐ', 'hǎo']);
    expect(pys(render(<PinyinFade known={new Set('你好')} on><Label zh="你好" /></PinyinFade>).container)).toEqual(['nǐ', 'hǎo']);
  });
  it('inside a button it never peeks: the tap goes to the button', () => {
    const hit = vi.fn();
    vi.mocked(speak).mockClear();
    const { container } = render(<PinyinFade known={new Set('你好')} on><button type="button" onClick={hit}><Label zh="你好" fade peek={false} /></button></PinyinFade>);
    fireEvent.click(container.querySelector('.label__cell--hidden')!);
    expect(hit).toHaveBeenCalledTimes(1);
    expect(pys(container)).toEqual(['', '']);
    expect(speak).not.toHaveBeenCalled();
  });
  it('passes each cell its syllable: 只 known as zhī shows over 只有 and hides in 一只 (final review I1)', () => {
    const r = readings({ 一: ['yì'], 只: ['zhī'] });
    const { container } = render(<PinyinFade known={new Set('一只')} readings={r} on><Label zh="只有" py="zhǐ yǒu" fade /><Label zh="一只" py="yì zhī" fade /><Label zh="一个" py="yí gè" fade /></PinyinFade>);
    const [a, b, c] = [...container.querySelectorAll('.label')];
    expect(pys(a!)).toEqual(['zhǐ', 'yǒu']);
    expect(pys(b!)).toEqual(['', '']);
    expect(pys(c!)).toEqual(['', 'gè']);
    const off = render(<PinyinFade known={new Set('一只')} readings={r} on={false}><Label zh="一只" py="yì zhī" fade /></PinyinFade>).container;
    expect(pys(off)).toEqual(['yì', 'zhī']);
  });
  it('a gap keeps its sound: only Han characters fade', () => {
    const { container } = render(<PinyinFade known={new Set('门口')} on><Label zh="＿口" py="mén kǒu" fade /></PinyinFade>);
    expect(pys(container)).toEqual(['mén', '']);
  });
});
