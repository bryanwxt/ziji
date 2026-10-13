// Before/after for the parent (SRS tuning spec §6.2): one sample word's intervals under the default and the fitted parameters.
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';

export interface IntervalStep { label: string; before: number; after: number }

export const COMPARE_LABELS = ['Right once', 'Right 2 times', 'Right 3 times', 'A miss, then right'] as const;
// the word is met (a first answer, right), then answered on later days; the rows are the intervals after these answers
const HISTORY: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good, Rating.Again, Rating.Good];
const SHOWN = [1, 2, 3, 5];
const DAY = 86_400_000;

/** Whole days to the next review after each shown answer. Each answer comes when the card is due, and never the same day. */
function intervals(w: number[] | undefined, start: Date): number[] {
  const f = fsrs(generatorParameters({ enable_fuzz: false, ...(w ? { w } : {}) })); // no fuzz: one word, compared fairly
  let card: Card = createEmptyCard(start);
  let now = start;
  const out: number[] = [];
  HISTORY.forEach((g, i) => {
    card = f.next(card, now, g).card;
    if (SHOWN.includes(i)) out.push(Math.max(0, Math.round((card.due.getTime() - now.getTime()) / DAY)));
    now = new Date(Math.max(card.due.getTime(), now.getTime() + DAY));
  });
  return out;
}

export function compareIntervals(fitted: number[], start: Date = new Date(2026, 0, 5, 9)): IntervalStep[] {
  const before = intervals(undefined, start);
  const after = intervals(fitted, start);
  return COMPARE_LABELS.map((label, i) => ({ label, before: before[i]!, after: after[i]! }));
}

/** "same day", "1 day", "12 days". */
export function formatDays(n: number): string {
  if (n < 1) return 'same day';
  return n === 1 ? '1 day' : `${n} days`;
}
