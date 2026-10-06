import { seededKnownCard } from '../srs/scheduler';
import type { CardRecord, Word } from '../types';

export const FIRST_CHECK_DAYS = [7, 28] as const;
export const MAX_FIRST_CHECKS_PER_DAY = 30;

/**
 * Known cards for the placed words. First rechecks are spread evenly from day 7 (over days 7–28, longer for a big placement, at most 30 a day) — the hardest
 * (rarest) words first — so a big placement never lands on one day and pauses new words.
 */
export function seedPlacementCards(words: Word[], knownIds: string[], now: Date, kind: 'recognise' | 'meaning' | 'hear' = 'recognise'): CardRecord[] {
  const ids = new Set(knownIds);
  const placed = words.filter((w) => ids.has(w.id));
  const hardestFirst = [...placed].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  const [first, minLast] = FIRST_CHECK_DAYS;
  const last = Math.max(minLast, first + Math.ceil(placed.length / MAX_FIRST_CHECKS_PER_DAY) - 1); // a big placement spreads further, never over 30 a day
  const span = last - first + 1;
  const dayOf = new Map(hardestFirst.map((w, i) => [w.id, first + Math.floor((i * span) / placed.length)]));
  return placed.map((w) => ({ id: `${w.id}:${kind}`, wordId: w.id, kind, fsrs: seededKnownCard(now, dayOf.get(w.id)!) }));
}
