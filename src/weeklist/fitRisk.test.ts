// @vitest-environment node
// Fewer rows to check, fewer slipping through (parent ruling 2026-10-17): a decoy never from the answer's 搭配 theme or category,
// a risky decoy swapped for a safe one before it is ever shown, his known words when the list runs short, and sentences from the
// list bank and Tatoeba. Invented words and sentences, never the tuition sheet.
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { Word } from '../types';
import { categoryOf, sameCategory } from './categories';
import { fitDoubts, fitStillGood, proposeFit, proposeFits, sameTheme, sentenceFor } from './fit';
import type { DraftPair } from './parse';

const w = (t: string, id = `p:${t}`) => makeWord(t, { id, source: 'parent', pinyin: 'x' });
const PAIRS: DraftPair[] = [
  { left: '煎', right: '鸡蛋', group: '早餐' }, { left: '喝', right: '果汁', group: '早餐' }, { left: '吃', right: '面包', group: '早餐' },
  { left: '放', right: '风筝', group: '公园' }, { left: '踢', right: '足球', group: '公园' }, { left: '荡', right: '秋千', group: '公园' },
];

describe('categories', () => {
  it('knows common nouns, and counts a drink as food', () => {
    expect(categoryOf('玉米')).toBe('food');
    expect(categoryOf('饮料')).toBe('food');
    expect(sameCategory('玉米', '香肠')).toBe(true);
    expect(sameCategory('玉米', '气球')).toBe(false);
    expect(categoryOf('争吵')).toBeUndefined();
  });
});

describe('the theme rule', () => {
  it('two words under one 搭配 heading share a theme', () => {
    expect(sameTheme('鸡蛋', '果汁', PAIRS)).toBe(true);
    expect(sameTheme('鸡蛋', '风筝', PAIRS)).toBe(false);
    expect(sameTheme('鸡蛋', '书包', PAIRS)).toBe(false);
  });
  it('a food blank never gets a food decoy, nor a same-theme one', () => {
    const mates = ['面包', '鸡蛋', '香肠', '风筝', '足球', '秋千', '书包', '街道', '羽毛'].map((t) => w(t));
    const f = proposeFit(w('玉米'), mates, [...PAIRS, { left: '煮', right: '玉米', group: '早餐' }], { text: '我喜欢吃＿。', source: 'parent' })!;
    for (const d of f.wrong) expect(['面包', '鸡蛋', '香肠']).not.toContain(d);
    expect(fitDoubts(f, '玉米', PAIRS)).toEqual([]);
  });
  it('a row the parent wrote with a same-category decoy is flagged', () => {
    expect(fitDoubts({ wordId: 'p:玉米', sentence: '我喜欢吃＿。', source: 'parent', wrong: ['香肠', '书包', '羽毛'] }, '玉米')).toEqual(['香肠']);
  });
});

describe('auto-swap: a risky decoy is replaced before the parent sees it', () => {
  it('a near-synonym, a look-alike or a decoy seen in that spot gives way to a safe one', () => {
    const mates = ['捉', '抓', '跳', '唱', '写', '画'].map((t) => w(t));
    const pairs = ['捉', '抓', '跳', '唱', '写', '画', '拿'].map((v) => ({ left: v, right: '书' }));
    const f = proposeFit(w('拿'), mates, pairs, { text: '请帮我＿那本书。', source: 'parent' })!;
    expect(f.wrong).not.toContain('捉');
    expect(f.wrong).not.toContain('抓');
    expect(fitDoubts(f, '拿')).toEqual([]);
  });
  it('flags only when no safe decoy is left', () => {
    const f = proposeFit(w('整齐'), ['热闹', '安静', '高兴'].map((t) => w(t)), [], { text: '我的书桌很＿。', source: 'school' })!;
    expect(fitDoubts(f, '整齐').length).toBeGreaterThan(0);
  });
});

describe('his known words widen the pool', () => {
  const known: Word[] = ['书包', '老师', '电视', '眼睛', '月亮'].map((t) => w(t, `w:${t}`));
  it('a list too small for a row borrows same-kind, same-length words he has started, and says which', () => {
    const list = ['玉米', '香肠', '鸡翅'].map((t) => w(t));
    const pairs: DraftPair[] = [{ left: '吃', right: '玉米' }, { left: '吃', right: '香肠' }, { left: '吃', right: '鸡翅' }];
    expect(proposeFits(list, pairs).get('玉米')).toBeNull();
    const f = proposeFits(list, pairs, known).get('玉米')!;
    expect(f).not.toBeNull();
    for (const d of f.wrong) expect(known.map((k) => k.text)).toContain(d);
    expect(f.outside?.sort()).toEqual([...f.wrong].sort());
  });
  it('list-mates come first', () => {
    const list = ['玉米', '街道', '羽毛', '铅笔', '香肠'].map((t) => w(t));
    const f = proposeFits(list, [{ left: '吃', right: '玉米' }], known).get('玉米')!;
    expect(f.outside ?? []).toEqual([]);
  });
  it('a stored row may ask a borrowed decoy that is not on the list', () => {
    const fit = { wordId: 'p:玉米', sentence: '我喜欢吃＿。', source: 'parent' as const, wrong: ['书包', '老师', '街道'] as [string, string, string], outside: ['书包', '老师'] };
    expect(fitStillGood(fit, '玉米', new Set(['玉米', '街道']))).toBe(true);
    expect(fitStillGood({ ...fit, outside: ['书包'] }, '玉米', new Set(['玉米', '街道']))).toBe(false); // 老师 left the list
  });
});

describe('sentenceFor: the list bank, then Tatoeba', () => {
  const extra = { bank: { 气球: '我把红气球吹得好大。' }, tatoeba: { 气球: [{ id: 1, s: '他买了一个气球。' }], 雨伞: [{ id: 7, s: '外面下雨了，带上雨伞吧。' }] } };
  it('the school sentence first, then ours, then Tatoeba', () => {
    expect(sentenceFor(w('气球'), extra)).toEqual({ text: '我把红＿吹得好大。', source: 'list' });
    expect(sentenceFor(w('雨伞'), extra)).toEqual({ text: '外面下雨了，带上＿吧。', source: 'tatoeba', ref: 7 });
    expect(sentenceFor(w('气球'))).toBeNull();
  });
});

describe('what may be borrowed (parent ruling 2026-10-17)', () => {
  const known: Word[] = ['鸭子', '小鸟', '喜糖', '一粒', '书包', '老师', '眼睛', '习', '跑', '踢'].map((t) => w(t, `w:${t}`));
  it('a noun only when the category map knows it, and never one near the answer\'s (烤鸭子 for 烤鸡翅)', () => {
    const f = proposeFits(['鸡翅', '香肠'].map((t) => w(t)), [{ left: '吃', right: '鸡翅' }, { left: '吃', right: '香肠' }], known, { bank: { 鸡翅: '夜市里的烤鸡翅香极了。' }, tatoeba: {} }).get('鸡翅')!;
    expect(f.wrong.sort()).toEqual(['书包', '眼睛', '老师'].sort());
  });
  it('never when the answer\'s kind is unknown, and never a bound character', () => {
    const three = ['游乐场', '洗手间', '图书馆', '动物园'].map((t) => w(t, `w:${t}`));
    expect(proposeFits([w('低下头')], [], three, { bank: { 低下头: '他做错了事，难过地低下头。' }, tatoeba: {} }).get('低下头')).toBeNull();
    const f = proposeFits([w('拔')], [{ left: '拔', right: '萝卜' }], known).get('拔');
    expect(f?.wrong ?? []).not.toContain('习');
  });
});
