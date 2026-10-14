import { describe, expect, it } from 'vitest';
import { builtinWords, schoolTerm } from '../content';
import { mulberry32 } from '../lib/random';
import { firstSense } from '../activities/flashcards/distractors';
import { cardMeaning } from '../content/glossary';
import { buildQuestion, nextQuestion, termStyles, termWords } from './questions';
import { TERMS } from './walk';

const pool = builtinWords(0);
const byText = new Map(pool.map((w) => [w.text, w]));
const terms = termWords(pool);

describe('placement v2 questions (spec 2026-10-14)', () => {
  it("a term's characters are the recognise characters first taught in it, in book order", () => {
    expect(terms).toHaveLength(TERMS.length);
    terms.forEach((ws, i) => {
      expect(ws.length).toBeGreaterThan(100);
      for (const w of ws) expect(schoolTerm(w.text)).toBe(TERMS[i]);
      for (let j = 1; j < ws.length; j++) expect(ws[j]!.rank!).toBeGreaterThan(ws[j - 1]!.rank!);
    });
  });
  it('读一读: the character and 4 pinyin choices, one right', () => {
    const q = buildQuestion('read', byText.get('静')!, pool, mulberry32(1))!;
    if (q.style !== 'read') throw new Error(q.style);
    expect(q.options).toContain(byText.get('静')!.pinyin);
    expect(q.options).toHaveLength(4);
  });
  it('听一听: he hears a word and picks its English meaning from 4', () => {
    const q = buildQuestion('hear', byText.get('门')!, pool, mulberry32(1))!;
    if (q.style !== 'hear') throw new Error(q.style);
    expect(q.answer).toBe(firstSense(cardMeaning(byText.get('门')!)!));
    expect(new Set(q.options).size).toBe(4);
  });
  it('with a voice a term asks 2 读一读 and 1 听一听; without, 3 读一读', () => {
    for (let seed = 1; seed < 30; seed++) {
      const v = termStyles(true, mulberry32(seed));
      expect([...v].sort()).toEqual(['hear', 'read', 'read']);
      expect(termStyles(false, mulberry32(seed))).toEqual(['read', 'read', 'read']);
    }
  });
  it("each question uses a different character of the term, picked at random", () => {
    const used = new Set<string>();
    const rng = mulberry32(5);
    const first: string[] = [];
    for (const style of ['read', 'hear', 'read', 'read'] as const) {
      const q = nextQuestion(terms, 2, style, pool, rng, used);
      expect(terms[2]!.some((w) => w.id === q.charId)).toBe(true);
      expect(used.has(q.charId)).toBe(false);
      used.add(q.charId);
      first.push(q.charId);
    }
    expect(new Set(first).size).toBe(4);
    const other = nextQuestion(terms, 2, 'read', pool, mulberry32(99), new Set());
    expect(other.charId).not.toBe(terms[2]![0]!.id); // random, not the first in the book
  });
  it("never repeats a character; a term run short borrows the nearest term's untested characters", () => {
    const used = new Set(terms[0]!.slice(1).map((w) => w.id));
    expect(nextQuestion(terms, 0, 'read', pool, mulberry32(1), used).charId).toBe(terms[0]![0]!.id);
    used.add(terms[0]![0]!.id);
    const borrowed = nextQuestion(terms, 0, 'read', pool, mulberry32(1), used);
    expect(terms[1]!.some((w) => w.id === borrowed.charId)).toBe(true);
  });
});
