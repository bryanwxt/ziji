import { MOE_TERMS, schoolTerm } from '../content';
import { seededKnownCard } from '../srs/scheduler';
import type { CardRecord, Word } from '../types';

export const FIRST_CHECK_DAYS = [7, 28] as const;
/** First rechecks a day at most: a lesson takes 10 (PLACEMENT_CHECKS_PER_LESSON), so a big placement never crowds out class words. */
export const MAX_FIRST_CHECKS_PER_DAY = 10;

/** School order for rechecks (spec 2026-10-14): the most recent term first, then earlier terms; in book order within a term. */
export function schoolOrder(a: Word, b: Word): number {
  const term = (w: Word) => { const t = schoolTerm(w.text); return t ? MOE_TERMS.indexOf(t) : MOE_TERMS.length; }; // outside the book: first
  return term(b) - term(a) || (a.rank ?? 0) - (b.rank ?? 0);
}

/**
 * Known cards for the placed words. First rechecks are spread from day 7 (over days 7–28, longer for a big placement, at most
 * 10 a day) in school order, so a big placement never lands on one day and never pauses his class words.
 */
export function seedPlacementCards(words: Word[], knownIds: string[], now: Date, kind: 'recognise' | 'hear' = 'recognise'): CardRecord[] {
  const ids = new Set(knownIds);
  const placed = words.filter((w) => ids.has(w.id)).sort(schoolOrder);
  const [first, minLast] = FIRST_CHECK_DAYS;
  const last = Math.max(minLast, first + Math.ceil(placed.length / MAX_FIRST_CHECKS_PER_DAY) - 1);
  const span = last - first + 1;
  return placed.map((w, i) => {
    const fsrs = seededKnownCard(now, first + Math.floor((i * span) / placed.length));
    return { id: `${w.id}:${kind}`, wordId: w.id, kind, fsrs: { ...fsrs, due: new Date(fsrs.due.getTime() + i) } }; // + i ms: the order holds within a day
  });
}
