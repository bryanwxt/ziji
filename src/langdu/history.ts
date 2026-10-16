// 朗读's reading history (spec 2026-10-15 §4): each passage's reads and rest, so a passage comes back on a spaced schedule —
// never within 3 days, then 3 → 7 → 18 → 45 days while he reads it well, back to 3 on a miss — and retires after that.
import { parseDateKey } from '../lib/date';
import { EMPTY_READING, type PassageHistory, type ReadingHistory } from '../types';

/** No passage comes back within this many days of its last read or skip; the same day counts (D6, D7). */
export const GAP_DAYS = 3;
/** Rest after a read: a first read and a miss give the first step; a good read climbs one step (D6). */
export const REST_LADDER = [3, 7, 18, 45] as const;
/** Rest past this retires a passage: offered again only when nothing else is. */
export const RETIRE_AFTER = 60;
/** The rest a good read past 45 days gives (45 × 2.5): over RETIRE_AFTER, so retired. */
export const RETIRED_REST = 112;
/** The self-introduction warm-up runs when the last one was this many days ago or more (about twice a week). */
export const WARMUP_EVERY = 3;
/** The parent's misread marks reset the rest from this many marks on a take. */
export const MISREADS_FOR_REST = 2;

export const NO_HISTORY: PassageHistory = { reads: 0, lastRead: null, rest: 0, q: 0 };

/** Whole calendar days from one date key to another (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number => Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000);

export const entryOf = (r: ReadingHistory, id: string): PassageHistory => r.history[id] ?? NO_HISTORY;
export const isRetired = (e: PassageHistory): boolean => e.rest > RETIRE_AFTER;
/** Read or skipped in the last 3 days, today included. A date after today (a clock that ran ahead) is no gap. */
export const inGap = (e: PassageHistory, today: string): boolean =>
  [e.lastRead, e.lastSkipped].some((d) => {
    if (!d) return false;
    const since = daysBetween(d, today);
    return since >= 0 && since < GAP_DAYS;
  });

/** Days past due (≥ 0: due); null for a passage never read, or retired. */
export function overdue(e: PassageHistory, today: string): number | null {
  if (!e.reads || !e.lastRead || isRetired(e)) return null;
  return daysBetween(e.lastRead, today) - e.rest;
}

export const readToday = (r: ReadingHistory, today: string): boolean => Object.values(r.history).some((e) => e.lastRead === today);

/** How a read went: 'well' (the question right first time, or no question), 'not-well' (missed), 'extra' (多读一遍). */
export type ReadHow = 'well' | 'not-well' | 'extra';

/** Never from the recording: an unrecorded 读完了 is a read like any other (spec §1 cause 4). */
export function readHow(o: { extra: boolean; asked: boolean; meaning: { correct: boolean } | null }): ReadHow {
  if (o.extra) return 'extra';
  if (!o.asked) return 'well';
  return o.meaning?.correct ? 'well' : 'not-well';
}

export function nextRest(rest: number, well: boolean): number {
  if (!well) return REST_LADDER[0];
  return REST_LADDER.find((s) => s > rest) ?? RETIRED_REST;
}

/** A read: the first rests 3 days; then a good read climbs the ladder (a read before its rest is over keeps it) and a miss goes back to 3. 多读一遍 ('extra') counts for
 *  the gap and the reads only. A lesson read moves the question turn on and says whether it was new or a revisit. */
export function afterRead(r: ReadingHistory, id: string, today: string, how: ReadHow): ReadingHistory {
  const e = entryOf(r, id);
  // a second lesson read of it today (two tabs): one more read, no second climb, turn or kind
  if (how !== 'extra' && e.reads > 0 && e.lastRead === today) return { ...r, history: { ...r.history, [id]: { ...e, reads: e.reads + 1 } } };
  const first = e.reads === 0;
  // an early read (offered before its rest was over, when nothing else was there) keeps its rest: the ladder climbs on spaced reads
  const early = !!e.lastRead && daysBetween(e.lastRead, today) < e.rest;
  const rest = first ? REST_LADDER[0] : how === 'extra' || (how === 'well' && early) ? e.rest : nextRest(e.rest, how === 'well');
  const entry: PassageHistory = { ...e, reads: e.reads + 1, lastRead: today, rest, q: how === 'extra' ? e.q : e.q + 1 };
  return { ...r, history: { ...r.history, [id]: entry }, lastKind: how === 'extra' ? r.lastKind : first ? 'new' : 'revisit' };
}

/** 下一篇 swapped it out before he read it: the 3-day gap applies; its reads and rest are untouched (spec §5). */
export function afterSkip(r: ReadingHistory, id: string, today: string): ReadingHistory {
  const e = entryOf(r, id);
  return { ...r, history: { ...r.history, [id]: { ...e, lastSkipped: today, skips: (e.skips ?? 0) + 1 } } };
}

/** The parent marked ≥ 2 misreads: due again 3 days after the review (replaces the old extra day). A retired passage comes back.
 *  A review so long after the read that the rest would pass RETIRE_AFTER dates the rest from the review instead. */
export function restFromReview(r: ReadingHistory, id: string, reviewDay: string): ReadingHistory {
  const e = r.history[id];
  if (!e?.reads || !e.lastRead) return r;
  const rest = Math.max(0, daysBetween(e.lastRead, reviewDay)) + REST_LADDER[0];
  const entry = rest > RETIRE_AFTER ? { ...e, lastRead: reviewDay, rest: REST_LADDER[0] } : { ...e, rest };
  return { ...r, history: { ...r.history, [id]: entry } };
}

export const warmupDue = (r: ReadingHistory, today: string): boolean => !r.lastWarmup || daysBetween(r.lastWarmup, today) >= WARMUP_EVERY;
/** The warm-up ran today; `recorded`: his self-introduction was kept (warm-ups count recorded ones). */
export const afterWarmup = (r: ReadingHistory, today: string, recorded: boolean): ReadingHistory => ({ ...r, lastWarmup: today, warmups: r.warmups + (recorded ? 1 : 0) });

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
const day = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/**
 * His stored progress in today's shape. The 3-day cycle (spec 2026-10-12: passageId, days, extra, lastDay, lastRead) moves over
 * once: each passage read becomes one read resting 3 days, its question asked; the cycle's passage keeps its days as reads; a
 * cycle begun is the last warm-up. Today's shape is checked field by field. Anything unreadable is no history. Idempotent.
 */
export function migrateReading(raw: unknown): ReadingHistory {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_READING, history: {} };
  const x = raw as Record<string, unknown>;
  const warmups = num(x.warmups);
  if (x.history && typeof x.history === 'object') {
    const history: Record<string, PassageHistory> = {};
    for (const [id, v] of Object.entries(x.history as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const e = v as Record<string, unknown>;
      const lastSkipped = day(e.lastSkipped);
      const skips = num(e.skips);
      history[id] = { reads: num(e.reads), lastRead: day(e.lastRead), rest: num(e.rest), q: num(e.q), ...(lastSkipped ? { lastSkipped } : {}), ...(skips ? { skips } : {}) };
    }
    const lastKind = x.lastKind === 'new' || x.lastKind === 'revisit' ? x.lastKind : null;
    return { history, lastKind, lastWarmup: day(x.lastWarmup), warmups };
  }
  const history: Record<string, PassageHistory> = {};
  const lastRead = x.lastRead && typeof x.lastRead === 'object' ? (x.lastRead as Record<string, unknown>) : {};
  for (const [id, d] of Object.entries(lastRead)) {
    const at = day(d);
    if (at) history[id] = { reads: 1, lastRead: at, rest: REST_LADDER[0], q: 1 };
  }
  const days = num(x.days);
  const current = typeof x.passageId === 'string' ? x.passageId : null;
  if (current && days >= 1 && history[current]) history[current] = { ...history[current]!, reads: days };
  return { history, lastKind: null, lastWarmup: days >= 1 ? day(x.lastDay) : null, warmups };
}
