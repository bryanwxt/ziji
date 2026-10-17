import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { makeWord } from '../test/fixtures';
import { differingParts, knownPart, lookAlike, partsToShow, pinyinSlip } from './why';

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;

describe('differingParts: the part that tells two look-alikes apart (spec 2026-10-12 §3)', () => {
  it('same sounding part, another radical: the radicals differ (河 氵 · 何 亻)', () => {
    expect(differingParts('河', '何')).toEqual({ right: ['氵'], picked: ['亻'] });
    expect(differingParts('情', '请')).toEqual({ right: ['忄'], picked: ['讠'] });
    expect(differingParts('晴', '睛')).toEqual({ right: ['日'], picked: ['目'] });
  });
  it('the reverse swaps the sides', () => {
    expect(differingParts('何', '河')).toEqual({ right: ['亻'], picked: ['氵'] });
  });
  it('same radical, another sounding part: those differ (银 艮 · 铁 失)', () => {
    expect(differingParts('银', '铁')).toEqual({ right: ['艮'], picked: ['失'] });
  });
  it("one inside the other: only what the other adds, never the shared one's own parts (生 · 星 日)", () => {
    expect(differingParts('生', '星')).toEqual({ right: [], picked: ['日'] });
  });
  it('a difference only in trivial strokes falls back: nothing (未 · 末)', () => {
    expect(differingParts('未', '末')).toEqual({ right: [], picked: [] });
  });
  it('characters with no components, nothing shared, or the same character: nothing', () => {
    expect(differingParts('人', '入')).toEqual({ right: [], picked: [] });
    expect(differingParts('大', '小')).toEqual({ right: [], picked: [] });
    expect(differingParts('河', '河')).toEqual({ right: [], picked: [] });
  });
});

describe('pinyinSlip: what kind of pinyin slip (spec 2026-10-12 §3)', () => {
  it('tone: the same syllable with another tone, a 轻声 given its full tone too', () => {
    expect(pinyinSlip(w('请'), 'qìng')).toEqual({ kind: 'tone', right: 'qǐng', picked: 'qìng' });
    expect(pinyinSlip(w('妈'), 'mà')).toEqual({ kind: 'tone', right: 'mā', picked: 'mà' });
    expect(pinyinSlip(makeWord('认识', { pinyin: 'rèn shi' }), 'rèn shí')).toEqual({ kind: 'tone', right: 'shi', picked: 'shí' });
  });
  it("sound part: the reading of the character's sounding part (请 → 青 qīng, 妈 → 马 mǎ), before tone", () => {
    expect(pinyinSlip(w('请'), 'qīng')).toEqual({ kind: 'soundPart', part: '青', partReading: 'qīng', char: '请', right: 'qǐng' });
    expect(pinyinSlip(w('妈'), 'mǎ')).toEqual({ kind: 'soundPart', part: '马', partReading: 'mǎ', char: '妈', right: 'mā' });
  });
  it('initial: the same final and tone, another initial', () => {
    expect(pinyinSlip(w('群'), 'cún')).toEqual({ kind: 'initial', right: ['q', 'ún'], picked: ['c', 'ún'] });
    expect(pinyinSlip(w('山'), 'sān')).toEqual({ kind: 'initial', right: ['sh', 'ān'], picked: ['s', 'ān'] });
  });
  it('final: the same initial and tone, another final', () => {
    expect(pinyinSlip(w('街'), 'jiā')).toEqual({ kind: 'final', right: ['j', 'iē'], picked: ['j', 'iā'] });
    expect(pinyinSlip(w('想'), 'xiǎn')).toEqual({ kind: 'final', right: ['x', 'iǎng'], picked: ['x', 'iǎn'] });
  });
  it('other: an unrelated reading, two syllables wrong, or a different number of syllables', () => {
    expect(pinyinSlip(w('河'), 'dà')).toEqual({ kind: 'other' });
    expect(pinyinSlip(makeWord('认识', { pinyin: 'rèn shi' }), 'rén shí')).toEqual({ kind: 'other' });
    expect(pinyinSlip(makeWord('认识', { pinyin: 'rèn shi' }), 'rèn')).toEqual({ kind: 'other' });
  });
});

describe('only parts a P1–P3 child knows (review 2026-10-17: 商 → 口 丷 冏 meant nothing)', () => {
  it('a known part is a radical with a meaning or a character his book teaches by 三下', () => {
    for (const p of ['氵', '扌', '口', '可', '青', '生', '失']) expect(knownPart(p), p).toBe(true);
    for (const p of ['丷', '冏', '彐', '昜', '艮', '亠']) expect(knownPart(p), p).toBe(false);
  });
  it('two characters look alike only when what they share is the bulk of each (衣 · 商 share only 亠: no)', () => {
    expect(lookAlike('根', '跟')).toBe(true);
    expect(lookAlike('衣', '商')).toBe(false);
    expect(lookAlike('商', '衣')).toBe(false);
    expect(lookAlike('河', '何')).toBe(true);
    expect(lookAlike('扫', '扬')).toBe(true);
    expect(lookAlike('生', '星')).toBe(true);
    expect(lookAlike('大', '小')).toBe(false);
  });
  it('a decomposition is shown only when every part in it is known', () => {
    expect(partsToShow('河', '何')).toEqual({ kind: 'sum', parts: [{ part: '氵', own: true }, { part: '可', own: false }] });
    expect(partsToShow('扫', '扬')).toBeNull(); // 彐
    expect(partsToShow('根', '跟')).toEqual({ kind: 'own', parts: ['木'] }); // no sum with 艮 in it, but 木 alone
    expect(partsToShow('商', '衣')).toBeNull(); // 丷 冏
    expect(partsToShow('铁', '银')).toEqual({ kind: 'sum', parts: [{ part: '钅', own: false }, { part: '失', own: true }] });
    expect(partsToShow('生', '人')).toBeNull();
    expect(partsToShow('银', '铁')).toBeNull(); // 艮
    expect(partsToShow('生', '星')).toBeNull(); // nothing of its own
    expect(partsToShow('星', '生')).toEqual({ kind: 'sum', parts: [{ part: '日', own: true }, { part: '生', own: false }] });
  });
});
