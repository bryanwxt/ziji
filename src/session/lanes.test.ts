// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { Word } from '../types';
import { bookLesson, laneTag, pickNewWords } from './lanes';

// his book's characters by lesson (index 0 = 一上 L1): 衣鱼雨 at 0, 木土马 at 1, 力河禾 at 2, 持静绘 at 34 (二下·16),
// 逛夜市 at 35 (二下·17), 馆院植 at 36 (二下·18); 介 is not in his book
const ORDER = Array.from('衣鱼雨木土马力河禾持静绘逛夜市馆院植');
const ch = (t: string): Word => makeWord(t, { id: `b:${t}`, rank: t === '介' ? 2000 : ORDER.indexOf(t) });
const ladder = (t: string): Word => makeWord(t, { id: `w:${t}`, rank: Math.max(...Array.from(t).map((c) => ORDER.indexOf(c))) + 0.001 });
const chars = (s: string) => Array.from(s).map(ch);
const pick = (candidates: Word[], n: number, classAt: number | null = 35, begunChars: Set<string> = new Set()) => pickNewWords({ candidates, n, classAt, begunChars });
const ids = (r: { words: Word[] }) => r.words.map((w) => w.text);
const CLASS = 35; // 二下·17

describe('book positions', () => {
  it("a character's first 识读 lesson; a ladder 词语's latest; nothing outside the book", () => {
    expect(bookLesson(ch('夜'))).toBe(35);
    expect(bookLesson(ladder('夜市'))).toBe(35);
    expect(bookLesson(ladder('木马'))).toBe(1);
    expect(bookLesson(ch('介'))).toBeUndefined();
    expect(bookLesson(makeWord('朋友', { id: 'p:1', source: 'parent' }))).toBeUndefined(); // a parent's word isn't placed by the book
  });
  it("the card's label: 课本 for his class's lesson, 补 for catch-up, none without a lane or a lesson", () => {
    expect(laneTag('school', ch('夜'))).toBe('课本 二下·17');
    expect(laneTag('catchup', ch('马'))).toBe('补 一上·2');
    expect(laneTag(undefined, ch('马'))).toBeNull();
    expect(laneTag('catchup', ch('介'))).toBeNull();
  });
});

describe('two lanes (spec 2026-10-11 §5)', () => {
  const pool = chars('衣鱼雨木土马力河禾持静绘逛夜市馆院植介');
  it('n = 1–8: half (rounded up) from his class and the lesson before it, the rest from 一上 on', () => {
    for (let n = 1; n <= 8; n++) {
      const r = pick(pool, n, CLASS);
      expect(r.words).toHaveLength(n);
      const lanes = Object.values(r.lanes);
      expect(lanes.filter((l) => l === 'school')).toHaveLength(Math.ceil(n / 2));
      expect(lanes.filter((l) => l === 'catchup')).toHaveLength(Math.floor(n / 2));
    }
    expect(ids(pick(pool, 8, CLASS))).toEqual(Array.from('衣鱼雨木持静绘逛')); // in book order
  });
  it('listed words come first and use up the count; the lanes split what is left', () => {
    const listed = makeWord('朋友', { id: 'p:1', source: 'parent', rank: null, level: null, listedAt: 5 });
    const r = pick([listed, ...pool], 3, CLASS);
    expect(ids(r)).toEqual(['朋友', '衣', '持']);
    expect(r.lanes).toEqual({ 'b:衣': 'catchup', 'b:持': 'school' });
    expect(ids(pick([listed, ...pool], 1, CLASS))).toEqual(['朋友']);
  });
  it('a listed book character (a 听写 mark) comes first with no lane, and takes its slot from n (review focus 5)', () => {
    const marked = { ...ch('夜'), listedAt: 7 };
    const r = pick([marked, ...pool.filter((w) => w.text !== '夜')], 3, CLASS);
    expect(ids(r)).toEqual(['夜', '衣', '持']);
    expect(r.lanes['b:夜']).toBeUndefined();
    expect(laneTag(r.lanes['b:夜'], marked)).toBeNull();
  });
  it('a short school lane gives its share to catch-up', () => {
    const r = pick(chars('衣鱼雨木持'), 4, CLASS);
    expect(ids(r)).toEqual(['衣', '鱼', '雨', '持']);
    expect(r.lanes['b:持']).toBe('school');
  });
  it('a short catch-up lane gives its share to the school lane', () => {
    const r = pick(chars('衣持静绘逛'), 4, CLASS);
    expect(ids(r)).toEqual(['衣', '持', '静', '绘']);
    expect(Object.values(r.lanes).filter((l) => l === 'school')).toHaveLength(3);
  });
  it('nothing ahead of his class while either lane has words; once both are done, the book onward, then words outside it', () => {
    expect(ids(pick(pool, 8, CLASS)).some((t) => '馆院植'.includes(t))).toBe(false);
    const r = pick(chars('馆院介'), 3, CLASS);
    expect(ids(r)).toEqual(['馆', '院', '介']);
    expect(r.lanes).toEqual({ 'b:馆': 'catchup', 'b:院': 'catchup' }); // spill-over shows 补; outside the book, no label
  });
  it('without a class lesson only catch-up runs, in book order', () => {
    const r = pick(pool, 4, null);
    expect(ids(r)).toEqual(['衣', '鱼', '雨', '木']);
    expect(Object.values(r.lanes)).toEqual(['catchup', 'catchup', 'catchup', 'catchup']);
  });
  it("a ladder 词语 waits for its characters, rides its lesson's lane, and comes after them", () => {
    const yeShi = ladder('夜市');
    expect(ids(pick([ch('衣'), ch('逛'), yeShi], 2, CLASS))).toEqual(['衣', '逛']); // 夜 and 市 not begun
    const r = pick([ch('衣'), ch('夜'), ch('市'), yeShi], 6, CLASS);
    expect(ids(r)).toEqual(['衣', '夜', '市', '夜市']);
    expect(r.lanes['w:夜市']).toBe('school');
    expect(pick([yeShi], 1, CLASS, new Set(['夜', '市'])).lanes).toEqual({ 'w:夜市': 'school' }); // begun before today
    expect(pick([ladder('木马')], 1, CLASS, new Set(['木', '马'])).lanes).toEqual({ 'w:木马': 'catchup' });
  });
  it("his class's characters before the lesson before's 词语: a lane takes its characters first, 词语 fill what is left (final review I1)", () => {
    const begun = new Set(Array.from('持静绘')); // 二下·16 begun: its 词语 are unlocked
    const pool = [...chars('衣鱼雨木'), ladder('持静'), ladder('静绘'), ladder('绘持'), ...chars('逛夜市')];
    const r = pick(pool, 4, CLASS, begun);
    expect(Object.entries(r.lanes).filter(([, l]) => l === 'school').map(([id]) => id)).toEqual(['b:逛', 'b:夜']);
    const wide = pick(pool, 8, CLASS, begun); // school share 4: three characters, then one 词语
    expect(Object.entries(wide.lanes).filter(([, l]) => l === 'school').map(([id]) => id).sort()).toEqual(['b:夜', 'b:市', 'b:逛', 'w:持静'].sort());
    expect(ids(wide)).toEqual(['衣', '鱼', '雨', '木', '持静', '逛', '夜', '市']); // still in book order
  });
  it('catch-up takes early gaps (characters) before unlocked early 词语 (final review I1)', () => {
    const begun = new Set(Array.from('木土马'));
    const pool = [ladder('木马'), ladder('土木'), ladder('马土'), ...chars('力河禾逛夜')];
    const r = pick(pool, 4, CLASS, begun);
    expect(Object.entries(r.lanes).filter(([, l]) => l === 'catchup').map(([id]) => id)).toEqual(['b:力', 'b:河']);
    expect(ids(pick(pool, 6, CLASS, begun))).toEqual(['木马', '力', '河', '禾', '逛', '夜']); // catch-up gets 4: three gaps, then a 词语
  });
  it('never the same word twice, and fewer than n when the words run out', () => {
    const r = pick(chars('衣持介'), 8, CLASS);
    expect(ids(r)).toEqual(['衣', '持', '介']);
    expect(new Set(ids(r)).size).toBe(3);
    expect(ids(pick([], 4, CLASS))).toEqual([]);
    expect(ids(pick(pool, 0, CLASS))).toEqual([]);
  });
});
