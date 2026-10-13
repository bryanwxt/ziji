// His own slow line (SRS tuning spec §3.2): "slow" means slow for him, per kind of tap answer, worked out once per lesson.
import { fastLimit } from '../ladder/rungs';
import type { ReviewLog } from '../types';
import { SLOW_ANSWER_MS, TAP_KINDS, type TapKind } from './scheduler';

/** Listening to a sentence takes time before he can answer: it isn't slowness (the log keeps the real time). */
export const LISTEN_MS = 4000;
/** Reading time allowed before a 选一选/用一用 answer counts as slow (on top of the flashcard's line). */
export const USE_READING_MS = 9000;

export const SLOW_SAMPLE = 40;
export const SLOW_MIN_SAMPLE = 10;
export const SLOW_FLOOR_MS = 3000;
export const SLOW_CEIL_MS = 12_000;

/** Each tap kind's slow line for this lesson; a kind missing from it uses SLOW_ANSWER_MS. */
export type SlowLines = Partial<Record<TapKind, number>>;

/**
 * The time a log's rating was judged on: what it logged, less the listening (Understand) or reading (选一选/用一用) time the
 * rating already took off. 练一练's in-context answers log their time with the reading already taken off.
 */
export function ratedMs(l: ReviewLog): number | null {
  if (typeof l.responseMs !== 'number') return null;
  if (l.kind === 'understand') return Math.max(0, l.responseMs - LISTEN_MS);
  if (l.kind === 'meaning' && l.source === 'use') return Math.max(0, l.responseMs - USE_READING_MS);
  return l.responseMs;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** 2 × the median rated time of his last 40 right, timed answers of this kind (guesses left out), within 3–12 s; 6 s under 10. */
export function slowMs(logs: ReviewLog[], kind: TapKind): number {
  const ofKind = logs.filter((l) => l.kind === kind).sort((a, b) => a.at - b.at);
  const guess = fastLimit(ofKind, kind);
  const times = ofKind
    .filter((l) => l.correct && typeof l.responseMs === 'number' && l.responseMs >= guess)
    .slice(-SLOW_SAMPLE)
    .map(ratedMs)
    .filter((t): t is number => t !== null);
  if (times.length < SLOW_MIN_SAMPLE) return SLOW_ANSWER_MS;
  return Math.min(SLOW_CEIL_MS, Math.max(SLOW_FLOOR_MS, Math.round(2 * median(times))));
}

/** Every tap kind's line, from all his logs: computed once at lesson start and passed to the rating sites. */
export function slowLines(logs: ReviewLog[]): SlowLines {
  return Object.fromEntries(TAP_KINDS.map((k) => [k, slowMs(logs, k)])) as SlowLines;
}
