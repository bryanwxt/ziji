import { describe, expect, it } from 'vitest';
import { BUILTIN, HSK_WORDS } from '.';
import { CHENGYU, chengyuLevel, chengyuOf } from './chengyu';
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
