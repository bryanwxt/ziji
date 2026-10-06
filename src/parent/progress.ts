// The parent's view of his progress against school (spec 2026-10-06 §3.4).
import { MOE_TERMS } from '../content';
import type { CardKind, CardRecord } from '../types';

const NUMERAL = ['一', '二', '三', '四', '五', '六'];

/**
 * His school year now (P1 = 1): the year the parent set, moved up each January since (Singapore's school year is the calendar
 * year), up to P6. Only a yardstick for the Progress tab — lessons never wait for it. Set before the year was remembered: 2026.
 */
export function schoolYear(s: { grade?: number; gradeYear?: number }, now: Date): number {
  return Math.min(6, Math.max(1, (s.grade ?? 2) + now.getFullYear() - (s.gradeYear ?? 2026)));
}

/** His textbook term now: 上 from January to May, 下 from June; null past the lists (P4 on). */
export function currentTerm(grade: number, now: Date): string | null {
  const term = `${NUMERAL[grade - 1] ?? ''}${now.getMonth() < 5 ? '上' : '下'}`;
  return MOE_TERMS.includes(term) ? term : null;
}

/** Rungs of one kind passed by the end of each of the last `weeks` weeks, oldest first. */
export function weeklyTrend(cards: CardRecord[], kind: CardKind, now: Date, weeks = 8): { week: string; count: number }[] {
  const passed = cards.filter((c) => c.kind === kind && c.passed).map((c) => c.passed!);
  return Array.from({ length: weeks }, (_, i) => {
    const end = new Date(now.getTime() - (weeks - 1 - i) * 7 * 86_400_000);
    return { week: `${end.getMonth() + 1}/${end.getDate()}`, count: passed.filter((t) => t <= end.getTime()).length };
  });
}
