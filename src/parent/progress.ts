// The parent's view of his progress against school (spec 2026-10-06 §3.4; the book's positions: src/content/curriculum.ts).
import type { CardKind, CardRecord } from '../types';

/** His school year now (P1 = 1): lives with the book's positions. */
export { schoolYear } from '../content/curriculum';

/** Rungs of one kind passed by the end of each of the last `weeks` weeks, oldest first. */
export function weeklyTrend(cards: CardRecord[], kind: CardKind, now: Date, weeks = 8): { week: string; count: number }[] {
  const passed = cards.filter((c) => c.kind === kind && c.passed).map((c) => c.passed!);
  return Array.from({ length: weeks }, (_, i) => {
    const end = new Date(now.getTime() - (weeks - 1 - i) * 7 * 86_400_000);
    return { week: `${end.getMonth() + 1}/${end.getDate()}`, count: passed.filter((t) => t <= end.getTime()).length };
  });
}
