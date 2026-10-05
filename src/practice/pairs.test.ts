// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BUILTIN, builtinWords, HSK_WORDS } from '../content';
import { DAPEI, GENERAL_VERBS, isDapei } from '../content/dapei';
import { mulberry32 } from '../lib/random';
import { dapeiBoard, zuciBoard, type PairBoard } from './pairs';

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));
const level = new Map(BUILTIN.map((c) => [c.char, c.level]));
const isWord = (s: string) => HSK_WORDS.has(s) || words.some((w) => w.examples?.some((e) => e.text === s));
const crossPairs = (b: PairBoard) => b.pairs.flatMap(([l], i) => b.pairs.filter((_, j) => j !== i).map(([, r]) => [l, r] as const));

describe('the 搭配 bank (spec 2026-10-05 §6)', () => {
  it('written in characters he meets by about HSK 3, no pair twice', () => {
    for (const [a, b] of DAPEI) for (const ch of a + b) expect(level.get(ch) ?? 9, `${a}${b}: ${ch}`).toBeLessThanOrEqual(4);
    expect(new Set(DAPEI.map(([a, b]) => `${a}|${b}`)).size).toBe(DAPEI.length);
    expect(DAPEI.length).toBeGreaterThanOrEqual(90);
    expect(isDapei('穿', '衣服')).toBe(true);
    expect(isDapei('穿', '牙')).toBe(false);
  });
});

describe('组词 pairing (spec 2026-10-05 §3.2 rung 2)', () => {
  it("three pairs that each make a 词语, one of them the word's own, the halves shuffled into two columns", () => {
    const b = zuciBoard(byText.get('火')!, mulberry32(1))!;
    expect(b.pairs).toHaveLength(3);
    expect(b.target.join('')).toContain('火');
    for (const [l, r] of b.pairs) expect(isWord(l + r), l + r).toBe(true);
    expect([...b.left].sort()).toEqual(b.pairs.map(([l]) => l).sort());
    expect([...b.right].sort()).toEqual(b.pairs.map(([, r]) => r).sort());
    expect(new Set([...b.left, ...b.right]).size).toBe(6);
  });
  it('no board has a cross pair that is also a word (review focus 1)', () => {
    for (const w of words.slice(0, 300)) {
      for (let seed = 1; seed <= 3; seed++) {
        const b = zuciBoard(w, mulberry32(seed));
        if (b) for (const [l, r] of crossPairs(b)) expect(isWord(l + r), `${w.text}: ${l}${r}`).toBe(false);
      }
    }
  });
  it('a word with no two-character 组词 has no board', () => {
    expect(zuciBoard({ ...byText.get('火')!, examples: [] }, mulberry32(1))).toBeNull();
  });
});

describe('搭配 pairing (spec 2026-10-05 §3.2 rung 2)', () => {
  it("one of the word's own 搭配 and two more", () => {
    const b = dapeiBoard(byText.get('穿')!, mulberry32(2))!;
    expect(b.target[0]).toBe('穿');
    expect(b.pairs).toHaveLength(3);
    for (const [l, r] of b.pairs) expect(isDapei(l, r)).toBe(true);
  });
  it('no board has a cross pair that is also a listed 搭配 or a word, and general verbs are never the extra pairs (review focus 1)', () => {
    for (const [a, b0] of DAPEI) {
      for (const text of [a, b0]) {
        const w = byText.get(text) ?? { ...words[0]!, id: `x:${text}`, text };
        for (let seed = 1; seed <= 3; seed++) {
          const b = dapeiBoard(w, mulberry32(seed));
          if (!b) continue;
          for (const [l, r] of crossPairs(b)) expect(isDapei(l, r) || HSK_WORDS.has(l + r), `${text}: ${l}${r}`).toBe(false);
          for (const [l] of b.pairs.filter((p) => p !== b.target)) expect(GENERAL_VERBS.has(l), l).toBe(false);
        }
      }
    }
  });
  it('a word with no 搭配 has no board', () => {
    expect(dapeiBoard(byText.get('很')!, mulberry32(1))).toBeNull();
  });
});
