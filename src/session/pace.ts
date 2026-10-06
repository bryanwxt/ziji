// How many new words a day (spec 2026-10-05 §2.2): found from how many he keeps, not fixed. A child's acquisition rate is his
// own (Burns et al.), and too many new words crowd revision out of 练一练.
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import type { ReviewLog, SessionRecord } from '../types';
import { introducedNewWords } from './runner';

export const PACE_START = 4;
export const PACE_MIN = 3;
export const PACE_MAX = 8;
const UP = 0.85;
const DOWN = 0.7;
const MIN_MEASURED = 8;
export const LOOKBACK_DAYS = 5;

/** Of the new words his lessons introduced in the last few days (not today), how many he recalled the first time each came back on a later day. */
export function keptRecent(sessions: SessionRecord[], logs: ReviewLog[], today: string): { right: number; total: number } {
  const since = localDateKey(addDays(parseDateKey(today), -LOOKBACK_DAYS));
  const reads = logs.filter((l) => l.kind === 'recognise' || l.kind === 'hear').sort((a, b) => a.at - b.at); // a new word is first answered by ear (spec 2026-10-06 §3.2)
  let right = 0;
  let total = 0;
  for (const s of sessions) {
    if (s.free || s.date < since || s.date >= today) continue;
    for (const id of introducedNewWords(s)) {
      const back = reads.find((l) => l.wordId === id && localDateKey(new Date(l.at)) > s.date);
      if (!back) continue;
      total += 1;
      if (back.correct) right += 1;
    }
  }
  return { right, total };
}

/** Did this lesson's 练一练 run out of time with items left for tomorrow? */
export const ranOut = (rec: SessionRecord): boolean => (rec.practiceLeft ?? 0) > 0;

/** Today's number: one up when he keeps most of them, one down when he doesn't or revision piles up; within 3–8 and the parent's ceiling. */
export function nextPace(i: { prev: number | null; ceiling: number; kept: { right: number; total: number }; ranOut: [boolean, boolean] }): { perDay: number; reason: string } {
  if (i.ceiling <= 0) return { perDay: 0, reason: 'new words are switched off' };
  const hi = Math.min(PACE_MAX, i.ceiling);
  const lo = Math.min(PACE_MIN, hi);
  const clamp = (n: number) => Math.max(lo, Math.min(hi, n));
  const base = clamp(i.prev ?? PACE_START);
  if (i.ranOut[0] && i.ranOut[1]) return { perDay: clamp(base - 1), reason: 'revision is piling up (the last two rounds ran out of time)' };
  if (i.kept.total < MIN_MEASURED) return { perDay: base, reason: `too few recent new words to judge yet (${i.kept.total})` };
  const rate = i.kept.right / i.kept.total;
  const reason = `kept ${i.kept.right} of ${i.kept.total} recent new words`;
  if (rate >= UP && !i.ranOut[0]) return { perDay: clamp(base + 1), reason };
  if (rate < DOWN) return { perDay: clamp(base - 1), reason };
  return { perDay: base, reason };
}
