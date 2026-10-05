import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { buildRound, climb, type Ask, type PracticeItem, type RoundWord } from './round';

const fresh = (id: string, early = false): RoundWord => ({ wordId: id, isNew: true, from: 1, appearances: 3, gradesRecognise: false, gradesMeaning: true, early });
const revision = (id: string, from: 1 | 2 | 3, appearances = 1, meaning = false): RoundWord => ({ wordId: id, isNew: false, from, appearances, gradesRecognise: true, gradesMeaning: meaning });
const all = () => true;
const lesson = (seed: number) => [
  ...['n0', 'n1', 'n2', 'n3'].map((id) => fresh(id)),
  ...Array.from({ length: 10 }, (_, i) => revision(`r${i}`, (1 + ((seed + i) % 3)) as 1 | 2 | 3, 1 + ((seed * 7 + i) % 2), i % 2 === 0)),
];
const positions = (r: PracticeItem[]) => {
  const at = new Map<string, number[]>();
  r.forEach((it, i) => at.set(it.wordId, [...(at.get(it.wordId) ?? []), i]));
  return at;
};

describe('练一练: one word, many contexts (spec 2026-10-05 §3)', () => {
  it('a word climbs one rung per appearance; past the top it goes round the upper rungs', () => {
    expect(climb(1, 3)).toEqual([1, 2, 3]);
    expect(climb(2, 1)).toEqual([2]);
    expect(climb(3, 2)).toEqual([3, 2]);
  });
  it('a new word appears three times, climbing 字 → 词语 → 句子', () => {
    const r = buildRound(lesson(1), all, mulberry32(1));
    for (const id of ['n0', 'n1', 'n2', 'n3']) expect(r.filter((x) => x.wordId === id).map((x) => x.rung), id).toEqual([1, 2, 3]);
  });
  it('a revision word starts on its own rung', () => {
    const r = buildRound([fresh('n0'), revision('r0', 3), revision('r1', 2)], all, mulberry32(2));
    expect(r.find((x) => x.wordId === 'r0')!.rung).toBe(3);
    expect(r.find((x) => x.wordId === 'r1')!.rung).toBe(2);
  });
  it('a rung he can’t be asked falls to the nearest one below (a word with no 组词 or sentence is read)', () => {
    const r = buildRound([fresh('n0'), fresh('n1')], (id, a) => id !== 'n1' || a === 'read' || a === 'listen', mulberry32(3));
    expect(r.filter((x) => x.wordId === 'n1').map((x) => x.rung)).toEqual([1, 1, 1]);
  });
  it('the same word never comes twice in a row while another word still has items', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const r = buildRound(lesson(seed), all, mulberry32(seed));
      for (let i = 1; i < r.length; i++) {
        const others = new Set(r.slice(i).map((x) => x.wordId)).size > 1;
        if (others) expect(r[i]!.wordId, `seed ${seed} at ${i}`).not.toBe(r[i - 1]!.wordId);
      }
    }
  });
  it("a word's appearances are at least 2 items apart, then at least 4 (a typical lesson)", () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const [id, at] of positions(buildRound(lesson(seed), all, mulberry32(seed)))) {
        for (let k = 1; k < at.length; k++) expect(at[k]! - at[k - 1]!, `seed ${seed} ${id}`).toBeGreaterThanOrEqual(k === 1 ? 3 : 5);
      }
    }
  });
  it('neighbours almost never share a question type (only where nothing else can be asked)', () => {
    let same = 0;
    let total = 0;
    const canAsk = (id: string, a: Ask) => !(a === 'usage' && id.endsWith('3'));
    for (let seed = 1; seed <= 60; seed++) {
      const r = buildRound(lesson(seed), canAsk, mulberry32(seed));
      total += r.length - 1;
      for (let i = 1; i < r.length; i++) if (r[i]!.ask === r[i - 1]!.ask) same++;
    }
    expect(same / total).toBeLessThan(0.02);
  });
  it('words missed in 认新字 come first; new words start before revision', () => {
    const r = buildRound([fresh('n0'), fresh('n1', true), revision('r0', 2), revision('r1', 3)], all, mulberry32(4));
    expect(r[0]!.wordId).toBe('n1');
    expect(r.findIndex((x) => x.wordId === 'n0')).toBeLessThan(r.findIndex((x) => x.wordId === 'r0'));
  });
  it('grading (spec §3.5): a revision word’s first appearance grades its reading; the first 词语 question grades meaning; sentences grade use; new words’ reading was graded in 认新字', () => {
    const r = buildRound([fresh('n0'), revision('r0', 1, 2, true)], all, mulberry32(5));
    expect(r.filter((x) => x.wordId === 'n0').map((x) => x.grades)).toEqual([null, 'meaning', 'use']);
    expect(r.filter((x) => x.wordId === 'r0').map((x) => x.grades)).toEqual(['recognise', 'meaning']);
    expect(r.every((x) => !x.retry)).toBe(true);
  });
  it('rung 1 asks read or listen, rung 2 the 组词 gap, rung 3 a sentence', () => {
    const r = buildRound(lesson(9), all, mulberry32(9));
    for (const x of r) expect({ 1: ['read', 'listen'], 2: ['word'], 3: ['fit', 'usage'] }[x.rung]).toContain(x.ask);
  });
});
