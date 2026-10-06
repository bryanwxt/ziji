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
    expect(climb(3, 2)).toEqual([3, 4]);
    expect(climb(4, 3)).toEqual([4, 5, 3]);
    expect(climb(4, 4)).toEqual([4, 5, 3, 4]);
    expect(climb(5, 3)).toEqual([5, 3, 4]);
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
  it('rung 1 asks read or listen, rung 2 a 词语 question, rung 3 a sentence, rung 4 组句, rung 5 a 成语', () => {
    const r = buildRound(lesson(9), all, mulberry32(9));
    const asks: Record<number, string[]> = { 1: ['read', 'listen', 'hear', 'meaningRead'], 2: ['word', 'pair', 'match', 'whole'], 3: ['fit', 'usage', 'understand'], 4: ['build'], 5: ['idiom', 'idiomFit', 'idiomBuild'] };
    for (const x of r) expect(asks[x.rung]).toContain(x.ask);
  });
});

describe('final review I1: due revision comes before words only starting their meaning practice', () => {
  it('a due word starts sooner than a meaning start, and its first appearance is marked due', () => {
    const start: RoundWord = { wordId: 's0', isNew: false, from: 1, appearances: 2, gradesRecognise: false, gradesMeaning: true };
    const due: RoundWord = { wordId: 'd0', isNew: false, from: 3, appearances: 1, gradesRecognise: true, gradesMeaning: false, due: true };
    const r = buildRound([fresh('n0'), start, due], all, mulberry32(6));
    expect(r.findIndex((x) => x.wordId === 'd0')).toBeLessThan(r.findIndex((x) => x.wordId === 's0'));
    expect(r.filter((x) => x.due).map((x) => x.wordId)).toEqual(['d0']);
  });
});

it('组句 (rung 4) grades use, like a sentence', () => {
  const r = buildRound([revision('r0', 3, 2)], all, mulberry32(7));
  expect(r.map((x) => [x.rung, x.grades])).toEqual([[3, 'recognise'], [4, 'use']]);
});

describe('成语, the fifth rung (spec 2026-10-05 §3.2, phase C)', () => {
  it('a 成语 question grades the meaning card once (spec §3.5)', () => {
    const items = buildRound([{ wordId: 'a', isNew: false, from: 5, appearances: 1, gradesRecognise: false, gradesMeaning: true }], (_, a) => a !== 'idiomBuild', mulberry32(1));
    expect(items[0]).toMatchObject({ rung: 5, grades: 'meaning' });
    expect(['idiom', 'idiomFit']).toContain(items[0]!.ask);
  });
  it('a word with no 成语 falls back to 组句, then to the sentence rung', () => {
    const one = (canAsk: (id: string, a: Ask) => boolean) => buildRound([{ wordId: 'a', isNew: false, from: 5, appearances: 1, gradesRecognise: false, gradesMeaning: false }], canAsk, mulberry32(1))[0];
    expect(one((_, a) => !a.startsWith('idiom'))).toMatchObject({ rung: 4, ask: 'build', grades: 'use' });
    expect(one((_, a) => !a.startsWith('idiom') && a !== 'build' && a !== 'understand')).toMatchObject({ rung: 3, grades: 'use' }); // a sentence (a listening question grades nothing: plan 2b)
  });
  it('a 组句 with the 成语 grades use, like rung 4 (many taps would make a meaning answer look slow)', () => {
    const items = buildRound([{ wordId: 'a', isNew: false, from: 5, appearances: 1, gradesRecognise: false, gradesMeaning: true }], (_, a) => a === 'idiomBuild' || a === 'read', mulberry32(1));
    expect(items[0]).toMatchObject({ rung: 5, ask: 'idiomBuild', grades: 'use' });
  });
});
