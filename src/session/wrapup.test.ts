import { describe, expect, it } from 'vitest';
import { afterFlashAnswer, createSessionRecord, introducedNewWords } from './runner';
import { planWrapup, wrapupTargets } from './wrapup';

const item = (wordId: string, n: number) => ({ kind: 'usage' as const, wordId, word: wordId, right: `${wordId}${n}`, wrong: 'x' });

describe('用一用 (spec §20 part 7)', () => {
  it("targets: today's new words, then any word missed today", () => {
    const rec = {
      ...createSessionRecord({ steps: ['flashcards'], reviewWordIds: [], newWordIds: ['n1', 'n2'], flashTimeBoxMs: 1, writeCandidates: [], writeCount: 0 }, 'd', 0),
      flashIndex: 4, // both new words were introduced
      recalls: { m: { right: 0, inContext: 0, missed: true }, ok: { right: 2, inContext: 2, missed: false }, n1: { right: 1, inContext: 0, missed: true } },
    };
    expect(wrapupTargets(rec)).toEqual(['n1', 'n2', 'm']);
  });
  it('one item per target, plus one more for a word with no recall in context yet, after the first round', () => {
    const { items } = planWrapup(['a', 'b'], { a: { right: 2, inContext: 0, missed: false }, b: { right: 2, inContext: 1, missed: false } }, item);
    expect(items.map((i) => `${i.wordId}${i.kind === 'usage' ? i.right.slice(-1) : ''}`)).toEqual(['a0', 'b0', 'a1']);
  });
  it('a target with no item (no sentence anywhere) is left out', () => {
    expect(planWrapup(['a', 'z'], {}, (id, n) => (id === 'z' ? null : item(id, n))).items.map((i) => i.wordId)).toEqual(['a', 'a']);
  });
  it('stops at 12 items; the words that missed out are reported so their cards come due tomorrow', () => {
    const ids = Array.from({ length: 14 }, (_, i) => `w${i}`);
    const r = planWrapup(ids, Object.fromEntries(ids.map((id) => [id, { right: 2, inContext: 2, missed: false }])), item);
    expect(r.items).toHaveLength(12);
    expect(r.dropped).toEqual(['w12', 'w13']);
  });
  it('a new word 认一认 never reached (its time ran out) is not a target: he was never taught it', () => {
    // a lesson saved before 2026-10-05: its 认一认 queue held the review, then the new words
    const queue = [{ wordId: 'r', isNew: false, retry: false }, { wordId: 'n1', isNew: true, retry: false }, { wordId: 'n2', isNew: true, retry: false }];
    let rec = { ...createSessionRecord({ steps: ['flashcards', 'wrapup'], reviewWordIds: ['r'], newWordIds: ['n1', 'n2'], flashTimeBoxMs: 1, writeCandidates: [], writeCount: 0 }, 'd', 0), flashQueue: queue };
    rec = afterFlashAnswer(rec, true, 10); // r answered, then the time box ends 认一认
    expect(wrapupTargets(rec)).toEqual([]);
    expect(introducedNewWords(rec)).toEqual([]);
    const met = afterFlashAnswer({ ...createSessionRecord({ ...rec.plan, flashTimeBoxMs: 1e9 }, 'd', 0), flashQueue: queue, flashIndex: 1 }, true, 10); // n1 introduced
    expect(introducedNewWords(met)).toEqual(['n1']);
  });
  it('no word twice in a row: words with an extra item go first, so their extra comes after the others', () => {
    const { items } = planWrapup(['a', 'b'], { a: { right: 2, inContext: 2, missed: false }, b: { right: 1, inContext: 0, missed: true } }, item);
    expect(items.map((i) => i.wordId)).toEqual(['b', 'a', 'b']);
  });
});
