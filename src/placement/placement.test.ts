import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { isKnown } from '../srs/scheduler';
import { MAX_FIRST_CHECKS_PER_DAY, seedPlacementCards } from './placement';
import { termWords } from './questions';

const words = builtinWords(0);
const now = new Date(2026, 9, 2, 9);
const terms = termWords(words);
const dayOf = (c: { fsrs: { due: Date } }) => Math.floor((c.fsrs.due.getTime() - now.getTime()) / 86_400_000);

describe('seeding placement cards (spec 2026-10-14)', () => {
  it('seeds known cards for exactly the given words, of the given kind', () => {
    const cards = seedPlacementCards(words, [words[3]!.id, words[9]!.id], now);
    expect(cards.map((c) => c.wordId).sort()).toEqual([words[3]!.id, words[9]!.id].sort());
    expect(cards.every((c) => isKnown(c.fsrs) && c.kind === 'recognise')).toBe(true);
  });
  it('first rechecks run in school order: the most recent passed term first, then earlier terms', () => {
    const placed = [...terms[0]!, ...terms[1]!, ...terms[2]!];
    const cards = seedPlacementCards(words, placed.map((w) => w.id), now);
    const due = new Map(cards.map((c) => [c.wordId, c.fsrs.due.getTime()]));
    const latest = (ws: typeof placed) => Math.max(...ws.map((w) => due.get(w.id)!));
    const earliest = (ws: typeof placed) => Math.min(...ws.map((w) => due.get(w.id)!));
    expect(latest(terms[2]!)).toBeLessThan(earliest(terms[1]!)); // 二上 before 一下
    expect(latest(terms[1]!)).toBeLessThan(earliest(terms[0]!)); // 一下 before 一上
    expect(due.get(terms[2]![0]!.id)!).toBeLessThan(due.get(terms[2]![1]!.id)!); // within a term, in book order
  });
  it('spreads them from day 7, at most 10 a day', () => {
    expect(MAX_FIRST_CHECKS_PER_DAY).toBe(10);
    const placed = [...terms[0]!, ...terms[1]!].map((w) => w.id); // 364 characters
    const cards = seedPlacementCards(words, placed, now);
    const perDay = new Map<number, number>();
    for (const c of cards) perDay.set(dayOf(c), (perDay.get(dayOf(c)) ?? 0) + 1);
    expect(Math.min(...perDay.keys())).toBe(7);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(10);
  });
  it('a small placement still spreads over days 7–28', () => {
    const cards = seedPlacementCards(words, terms[0]!.slice(0, 50).map((w) => w.id), now);
    const days = cards.map(dayOf);
    expect([Math.min(...days), Math.max(...days)]).toEqual([7, 28]);
  });
});
