// The second lesson waits (learning rules 2026-10-17; Cepeda et al. 2006): Home offers 再学一课 only 2 hours after the last lesson
// ended, so a second lesson is spaced from the first, not massed onto it. Until then Truffle says when to come back. The parent
// can still start one at once from the parent area.
import { localDateKey } from '../lib/date';
import type { SessionRecord } from '../types';

export const EXTRA_GAP_MS = 2 * 3_600_000;

/**
 * When Home may offer another lesson: 2 hours after the later of the day's lesson's end (its start plus its active time) and the
 * last lesson's stars (kid.starredUpTo, set as any lesson, an extra one too, ends).
 */
export function extraOpensAt(day: Pick<SessionRecord, 'startedAt' | 'activeMs'>, starredUpTo: number | undefined): number {
  return Math.max(day.startedAt + day.activeMs, starredUpTo ?? 0) + EXTRA_GAP_MS;
}

/** What Truffle says while it waits: when to come back, by the hour it opens; null once it is open. */
export function extraWaitLine(opensAt: number, now: Date): string | null {
  if (now.getTime() >= opensAt) return null;
  const open = new Date(opensAt);
  if (localDateKey(open) !== localDateKey(now)) return '明天见！';
  const h = open.getHours();
  return h < 12 ? '等一会儿再来！' : h < 18 ? '下午再来！' : '晚上再来！';
}
