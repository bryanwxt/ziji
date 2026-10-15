import { pinyin } from 'pinyin-pro';
import { describe, expect, it } from 'vitest';
import { splitSyllable } from '../activities/flashcards/pinyinTraps';
import { syllableTone, toneless } from '../activities/flashcards/tones';
import { builtinWords, getCharInfo, schoolTerm } from '../content';
import { boundPair } from '../content/kidGloss';
import { mulberry32 } from '../lib/random';
import { askable, askableTerms, buildQuestion, lookAlikes, nearMissReadings, nextQuestion, standsAlone, termStyles, termWords } from './questions';
import { TERMS } from './walk';

const pool = builtinWords(0);
const byText = new Map(pool.map((w) => [w.text, w]));
const terms = termWords(pool);
const hard = askableTerms(terms);

describe('placement questions (spec 2026-10-14)', () => {
  it("a term's characters are the recognise characters first taught in it, in book order", () => {
    expect(terms).toHaveLength(TERMS.length);
    terms.forEach((ws, i) => {
      expect(ws.length).toBeGreaterThan(100);
      for (const w of ws) expect(schoolTerm(w.text)).toBe(TERMS[i]);
      for (let j = 1; j < ws.length; j++) expect(ws[j]!.rank!).toBeGreaterThan(ws[j - 1]!.rank!);
    });
  });
});

describe('placement v2.1: harder characters', () => {
  it('a term asks only its later half by book order', () => {
    hard.forEach((ws, i) => {
      const late = new Set(terms[i]!.slice(Math.floor(terms[i]!.length / 2)).map((w) => w.id));
      expect(ws.length).toBeGreaterThanOrEqual(24);
      for (const w of ws) expect(late.has(w.id), w.text).toBe(true);
    });
  });
  it('the less common ones: no HSK 1 character while 24 others are left; 一上 is topped up with its latest HSK 1 characters', () => {
    hard.slice(1).forEach((ws) => expect(ws.every((w) => (w.level ?? 9) > 1)).toBe(true));
    expect(hard[0]!.some((w) => (w.level ?? 9) > 1)).toBe(true);
  });
  it('never a character he could know from a part alone (口 木 火 大 门), nor one read in 轻声', () => {
    for (const ch of '口木火大门目手心九') expect(standsAlone(ch), ch).toBe(true);
    for (const ch of '骑踏猜懒') expect(standsAlone(ch), ch).toBe(false);
    for (const ws of hard) for (const w of ws) {
      expect(standsAlone(w.text), w.text).toBe(false);
      expect(syllableTone(w.pinyin).tone, w.text).not.toBe(5);
    }
  });
  it('askable keeps every character of a short pool', () => {
    expect(askable([])).toEqual([]);
  });
});

describe('placement v2.1: 读一读 with near-miss readings', () => {
  it('four readings that differ only in tone or initial, a 2×2 so none stands out (lì lí nì ní)', () => {
    const rng = mulberry32(1);
    for (const ws of hard) for (const w of ws) {
      const wrong = nearMissReadings(w, rng);
      if (!wrong) continue;
      const all = [w.pinyin, ...wrong];
      expect(new Set(all).size, w.text).toBe(4);
      const parts = all.map((p) => { const { base, tone } = syllableTone(p); const [ini, fin] = splitSyllable(base); return { ini, fin, tone }; });
      expect(new Set(parts.map((p) => p.fin)).size, `${w.text} ${all}`).toBe(1); // one final: only the tone or the initial differs
      const inis = new Set(parts.map((p) => p.ini));
      const tones = new Set(parts.map((p) => p.tone));
      if (inis.size === 2) {
        expect(tones.size).toBe(2);
        for (const ini of inis) expect(parts.filter((p) => p.ini === ini)).toHaveLength(2); // each initial twice
        for (const t of tones) expect(parts.filter((p) => p.tone === t)).toHaveLength(2); // each tone twice
      } else expect(tones.size).toBe(4); // the four tones
    }
  });
  it("never another reading of the character (应 yīng: yìng is right too)", () => {
    const rng = mulberry32(2);
    for (const ws of hard) for (const w of ws) {
      const readings = new Set(pinyin(w.text, { multiple: true, type: 'array' }));
      for (const p of nearMissReadings(w, rng) ?? []) expect(readings.has(p), `${w.text} ${p}`).toBe(false);
    }
  });
  it('the question: the character and its 4 readings, one right', () => {
    const q = buildQuestion('read', byText.get('懒')!, pool, mulberry32(1))!;
    expect(q.style).toBe('read');
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain('lǎn');
    expect(q.answer).toBe('lǎn');
  });
  it('almost every askable character has one', () => {
    const rng = mulberry32(3);
    for (const ws of hard) expect(ws.filter((w) => nearMissReadings(w, rng)).length / ws.length).toBeGreaterThan(0.9);
  });
});

describe('placement v2.1: 听一听, hear it and find it among look-alikes', () => {
  it('three look-alikes that all share one part with it, characters he meets, all four sounding different', () => {
    const rng = mulberry32(4);
    let asked = 0;
    for (const ws of hard) for (const w of ws) {
      const wrong = lookAlikes(w, pool, rng);
      if (!wrong) continue;
      asked++;
      const partsOf = (ch: string) => { const i = getCharInfo(ch)!; return new Set([i.radical, ...i.components]); };
      const shared = [...partsOf(w.text)].filter((p) => wrong.every((ch) => partsOf(ch).has(p)));
      expect(shared.length, `${w.text} ${wrong}`).toBeGreaterThan(0);
      expect(new Set([w.pinyin, ...wrong.map((ch) => byText.get(ch)!.pinyin)].map(toneless)).size, `${w.text} ${wrong}`).toBe(4);
      for (const ch of wrong) expect(!!schoolTerm(ch) || (byText.get(ch)!.level ?? 9) <= 2, ch).toBe(true);
    }
    expect(asked).toBeGreaterThan(250);
  });
  it('never a character of the word Truffle says it in (a bound character is said as its pair: 蚁 is never offered for 蚂)', () => {
    const rng = mulberry32(5);
    for (const ch of '蚂蚁') {
      const pair = boundPair(ch)!;
      for (let i = 0; i < 20; i++) for (const o of lookAlikes(byText.get(ch)!, pool, rng) ?? []) expect(pair.includes(o)).toBe(false);
    }
  });
  it('the question: Truffle says the character at its reading; 4 characters to pick from', () => {
    const q = buildQuestion('listen', byText.get('踏')!, pool, mulberry32(1))!;
    if (q.style !== 'listen') throw new Error(q.style);
    expect([q.answer, q.text, q.reading]).toEqual(['踏', '踏', 'tà']);
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain('踏');
  });
});

describe('placement v2.1: styles and picking', () => {
  it('with a voice a term asks 2 读一读 and 2 听一听, then a fifth of either; without, 读一读 only', () => {
    for (let seed = 1; seed < 30; seed++) {
      const v = termStyles(true, mulberry32(seed));
      expect([...v.slice(0, 4)].sort()).toEqual(['listen', 'listen', 'read', 'read']);
      expect(v).toHaveLength(5);
      expect(termStyles(false, mulberry32(seed))).toEqual(['read', 'read', 'read', 'read', 'read']);
    }
  });
  it('each question uses a different askable character of the term, picked at random', () => {
    const used = new Set<string>();
    const rng = mulberry32(5);
    for (const style of ['read', 'listen', 'read', 'listen', 'read'] as const) {
      const q = nextQuestion(hard, 2, style, pool, rng, used);
      expect(hard[2]!.some((w) => w.id === q.charId)).toBe(true);
      expect(q.style).toBe(style);
      expect(used.has(q.charId)).toBe(false);
      used.add(q.charId);
    }
    expect(used.size).toBe(5);
    expect(nextQuestion(hard, 2, 'read', pool, mulberry32(99), new Set()).charId).not.toBe(hard[2]![0]!.id); // random, not the first
  });
  it("never repeats a character; a term run short borrows the nearest term's untested characters", () => {
    const used = new Set(hard[0]!.map((w) => w.id));
    const borrowed = nextQuestion(hard, 0, 'read', pool, mulberry32(1), used);
    expect(hard[1]!.some((w) => w.id === borrowed.charId)).toBe(true);
  });
});
