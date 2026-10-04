import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { isKnown } from '../srs/scheduler';
import { seedPlacementCards } from './placement';
import { rankBands } from './walk';

const words = builtinWords(0);
const now = new Date(2026, 9, 2, 9);
const bands = rankBands(words);

describe('seeding placement cards (§14)', () => {
  it('seeds known cards for exactly the given words, of the given kind', () => {
    const cards = seedPlacementCards(words, [words[3]!.id, words[9]!.id], now);
    expect(cards.map((c) => c.wordId)).toEqual([words[3]!.id, words[9]!.id]);
    expect(cards.every((c) => isKnown(c.fsrs) && c.kind === 'recognise')).toBe(true);
    expect(seedPlacementCards(words, [words[3]!.id], now, 'meaning')[0]).toMatchObject({ id: `${words[3]!.id}:meaning`, kind: 'meaning' });
  });
  it('spreads the first rechecks from day 7, hardest words first, at most 30 a day so new words never pause', () => {
    const known = bands.slice(0, 9).flat().map((w) => w.id); // 900 known words
    const cards = seedPlacementCards(words, known, now);
    const days = cards.map((c) => Math.round((c.fsrs.due.getTime() - now.getTime()) / 86_400_000));
    expect(Math.min(...days)).toBe(7);
    expect(Math.max(...days)).toBeLessThanOrEqual(7 + Math.ceil(900 / 30));
    const perDay = new Map<number, number>();
    for (const d of days) perDay.set(d, (perDay.get(d) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(30); // under the 40-review pause
    const dueOf = (id: string) => cards.find((c) => c.wordId === id)!.fsrs.due.getTime();
    expect(dueOf(known[known.length - 1]!)).toBeLessThan(dueOf(known[0]!)); // the hardest is rechecked before rank 1
  });
  it('a small placement still spreads over days 7–28', () => {
    const cards = seedPlacementCards(words, bands[0]!.map((w) => w.id), now);
    const days = cards.map((c) => Math.round((c.fsrs.due.getTime() - now.getTime()) / 86_400_000));
    expect([Math.min(...days), Math.max(...days)]).toEqual([7, 28]);
  });
});
