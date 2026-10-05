import { describe, expect, it } from 'vitest';
import { BUILTIN, HSK_WORDS } from '.';
import { CHENGYU, chengyuLevel, chengyuOf, idiomOf, idiomsFor, isIdiomWord, learnerLevel } from './chengyu';
import { makeWord } from '../test/fixtures';
import { tiles } from './zuju';

const LEVEL = new Map(BUILTIN.map((c) => [c.char, c.level]));
const HAN = /\p{Script=Han}/u;

describe('the built-in 成语 list (spec 2026-10-05 §4)', () => {
  it('has about 150 four-character HSK words, no repeats', () => {
    expect(CHENGYU.length).toBeGreaterThanOrEqual(140);
    expect(CHENGYU.length).toBeLessThanOrEqual(170);
    expect(new Set(CHENGYU.map((c) => c.text)).size).toBe(CHENGYU.length);
    for (const c of CHENGYU) {
      expect(Array.from(c.text), c.text).toHaveLength(4);
      expect(HSK_WORDS.has(c.text), c.text).toBe(true);
      for (const ch of c.text) expect(LEVEL.has(ch), `${c.text} ${ch}`).toBe(true);
    }
  });
  it('gives each a short English meaning and 1–2 sentences he can read', () => {
    for (const c of CHENGYU) {
      expect(c.meaning, c.text).toMatch(/^[\x20-\x7e]{3,48}$/);
      expect(c.sentences.length, c.text).toBeGreaterThanOrEqual(1);
      expect(c.sentences.length, c.text).toBeLessThanOrEqual(2);
      const level = chengyuLevel(c.text);
      for (const s of c.sentences) {
        expect(s.split(c.text).length - 1, s).toBe(1);
        expect(Array.from(s).length, s).toBeLessThanOrEqual(20);
        for (const ch of Array.from(s).filter((x) => HAN.test(x))) expect(LEVEL.get(ch) ?? 99, `${s}: ${ch}`).toBeLessThanOrEqual(level + 1);
      }
    }
  });
  it('can build a 组句 from each one (4–6 different tiles, the 成语 whole)', () => {
    for (const c of CHENGYU) {
      const ok = c.sentences.some((s) => { const t = tiles(s); return t.length >= 4 && t.length <= 6 && new Set(t).size === t.length && t.some((x) => x.includes(c.text)); });
      expect(ok, c.text).toBe(true);
    }
  });
  it('spreads over the levels a P2 child meets, levelled by the hardest character', () => {
    expect(chengyuLevel('五颜六色')).toBe(2);
    for (const l of [1, 2, 3]) expect(CHENGYU.filter((c) => chengyuLevel(c.text) === l).length, `level ${l}`).toBeGreaterThanOrEqual(8);
    expect(chengyuOf('五颜六色')?.meaning).toBeTruthy();
  });
});

describe('idiomsFor (spec §4 level window)', () => {
  const xin = makeWord('心', { id: 'b:心', level: 1, pinyin: 'xīn' });
  it('offers his level, then one up, never higher', () => {
    const out = idiomsFor(xin, 1, []);
    expect(out.length).toBeGreaterThan(0);
    for (const i of out) expect(chengyuLevel(i.text)).toBeLessThanOrEqual(2);
    const levels = out.map((i) => chengyuLevel(i.text));
    expect([...levels].sort((a, b) => Math.abs(a - 1) - Math.abs(b - 1) || b - a)).toEqual(levels); // closest first, then easier
  });
  it('uses easier ones only when nothing at or one above fits', () => {
    const out = idiomsFor(xin, 6, []);
    expect(out.length).toBeGreaterThan(0);
    for (const i of out) expect(chengyuLevel(i.text)).toBeLessThanOrEqual(7);
    const first = out.findIndex((i) => chengyuLevel(i.text) < 6);
    if (first >= 0) expect(out.slice(first).every((i) => chengyuLevel(i.text) < 6)).toBe(true);
    const easier = out.map((i) => chengyuLevel(i.text)).filter((l) => l < 6);
    expect([...easier].sort((a, b) => b - a)).toEqual(easier); // nearest easier first
  });
  it('skips a 成语 that has the character twice (一心一意 for 一)', () => {
    expect(idiomsFor(makeWord('一', { id: 'b:一', level: 1 }), 2, []).map((i) => i.text)).not.toContain('一心一意');
  });
  it('puts his school 成语 first', () => {
    const school = makeWord('心花怒放', { id: 'p:1', source: 'parent', tags: ['成语'], meaning: 'wild with joy', pinyin: 'xīn huā nù fàng' });
    expect(idiomsFor(xin, 1, [school])[0]).toMatchObject({ text: '心花怒放', school: true, meaning: 'wild with joy' });
  });
  it('never offers a word its own 成语 back', () => {
    const w = makeWord('五颜六色', { id: 'p:2', source: 'parent', tags: ['成语'] });
    expect(idiomsFor(w, 2, [w]).map((i) => i.text)).not.toContain('五颜六色');
  });
});

describe('learnerLevel', () => {
  it('is the level of the next built-in word he has not started', () => {
    const ws = [makeWord('一', { id: 'b:一', level: 1, rank: 1 }), makeWord('颜', { id: 'b:颜', level: 3, rank: 900 })];
    expect(learnerLevel(ws, new Set(['b:一']))).toBe(3);
    expect(learnerLevel(ws, new Set(['b:一', 'b:颜']))).toBe(7);
    expect(learnerLevel([], new Set())).toBe(1);
  });
});

describe('school 成语 words', () => {
  it('a four-character word tagged 成语 is one, with the list meaning when the parent typed none', () => {
    const w = makeWord('五颜六色', { id: 'p:2', source: 'parent', tags: ['成语'] });
    expect(isIdiomWord(w)).toBe(true);
    expect(idiomOf(w)).toMatchObject({ text: '五颜六色', school: true, meaning: chengyuOf('五颜六色')!.meaning });
    expect(idiomOf(w)!.sentences.length).toBeGreaterThan(0);
    expect(isIdiomWord(makeWord('心', { id: 'b:心' }))).toBe(false);
    expect(idiomOf(makeWord('心', { id: 'b:心' }))).toBeNull();
  });
  it('his class sentence comes before the list sentence', () => {
    const w = makeWord('五颜六色', { id: 'p:2', source: 'parent', tags: ['成语'], sentences: [{ text: '花园里的花五颜六色，真好看。', pinyin: '' }] });
    expect(idiomOf(w)!.sentences[0]).toBe('花园里的花五颜六色，真好看。');
  });
});
