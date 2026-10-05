// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BUILTIN, builtinWords, HSK_WORDS } from '../content';
import { DAPEI, isDapei } from '../content/dapei';
import { mulberry32 } from '../lib/random';
import { dapeiQuestion, PRODUCTIVE, zuciBoard, type PairBoard } from './pairs';

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));
const level = new Map(BUILTIN.map((c) => [c.char, c.level]));
const isWord = (s: string) => HSK_WORDS.has(s) || words.some((w) => w.examples?.some((e) => e.text === s));
const crossPairs = (b: PairBoard) => b.pairs.flatMap(([l], i) => b.pairs.filter((_, j) => j !== i).map(([, r]) => [l, r] as const));

describe('the 搭配 bank (spec 2026-10-05 §6, final review C2)', () => {
  it('written in characters he meets by about HSK 3, no pair twice', () => {
    for (const x of DAPEI) for (const ch of x.verb + x.noun + x.wrong.join('')) expect(level.get(ch) ?? 9, `${x.verb}${x.noun}: ${ch}`).toBeLessThanOrEqual(4);
    expect(new Set(DAPEI.map((x) => `${x.verb}|${x.noun}`)).size).toBe(DAPEI.length);
    expect(DAPEI.length).toBeGreaterThanOrEqual(60);
    expect(isDapei('穿', '衣服')).toBe(true);
    expect(isDapei('穿', '牙')).toBe(false);
  });
  it('every pair has three different wrong partners, none of them right with its verb', () => {
    for (const x of DAPEI) {
      expect(new Set(x.wrong).size, x.verb + x.noun).toBe(3);
      for (const w of x.wrong) {
        expect(w, x.verb + x.noun).not.toBe(x.noun);
        expect(isDapei(x.verb, w), `${x.verb}${w}`).toBe(false);
        expect(HSK_WORDS.has(x.verb + w), `${x.verb}${w}`).toBe(false);
      }
    }
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

describe('搭配 (spec 2026-10-05 §3.2 rung 2, final review C2)', () => {
  it('the verb with its partner and its three written wrong partners, shuffled', () => {
    const q = dapeiQuestion(byText.get('穿')!, mulberry32(2))!;
    expect(q.verb).toBe('穿');
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain(q.noun);
    const entry = DAPEI.find((x) => x.verb === '穿' && x.noun === q.noun)!;
    for (const w of entry.wrong) expect(q.options).toContain(w);
  });
  it('only for a verb in the bank: never for a word on the other side, or a word with no 搭配', () => {
    expect(dapeiQuestion({ ...byText.get('穿')!, text: '衣服' }, mulberry32(1))).toBeNull();
    expect(dapeiQuestion(byText.get('很')!, mulberry32(1))).toBeNull();
  });
});

describe('the board never gives the answer away (WebKit review, 2026-10-05)', () => {
  it('no pair sits on the same row', () => {
    for (const w of words.slice(0, 200)) {
      for (let seed = 1; seed <= 4; seed++) {
        for (const b of [zuciBoard(w, mulberry32(seed))]) {
          if (!b) continue;
          b.left.forEach((l, i) => expect(b.pairs.some(([a, r]) => a === l && r === b.right[i]), `${l}${b.right[i]}`).toBe(false));
        }
      }
    }
  });
});

describe('final review C1/C2: 组词 boards', () => {
  it('never a doubled target (妈妈): another 组词, or no board', () => {
    for (const t of ['妈', '爸', '哥', '姐', '谢', '常']) {
      const w = byText.get(t);
      if (!w) continue;
      for (let seed = 1; seed <= 4; seed++) {
        const b = zuciBoard(w, mulberry32(seed));
        if (b) expect(b.target[0], t).not.toBe(b.target[1]);
      }
    }
  });
  it('extras never use characters that make a word with almost anything (不, numbers, 大, 小, 走, 想…)', () => {
    for (const w of words.slice(0, 200)) {
      for (let seed = 1; seed <= 3; seed++) {
        const b = zuciBoard(w, mulberry32(seed));
        if (!b) continue;
        for (const p of b.pairs.filter((x) => x !== b.target)) for (const ch of p) expect(PRODUCTIVE.has(ch), `${w.text}: ${p.join('')}`).toBe(false);
      }
    }
  });
  it('with what he knows, extras use characters he knows', () => {
    const known = new Set(words.slice(0, 400).map((w) => w.text));
    const b = zuciBoard(byText.get('火')!, mulberry32(5), known)!;
    for (const p of b.pairs.filter((x) => x !== b.target)) for (const ch of p) expect(known.has(ch), p.join('')).toBe(true);
  });
});
