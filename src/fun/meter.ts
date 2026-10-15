// The river meter (rewards spec 2026-10-15 §3): a paper boat sails toward the chest. The day's first lesson fills it (2 halves),
// each extra lesson half of it (1). A full meter is a chest; at most 2 chests a local day; halves earned past that wait in the
// bank for tomorrow (at most one full meter). Free play adds nothing.
import type { KidState, SessionRecord } from '../types';

export const METER_FULL = 2;
export const FIRST_HALVES = 2;
export const EXTRA_HALVES = 1;
export const CHESTS_PER_DAY = 2;
export const BANK_MAX = 2;
/** A sanity bound on chests earned and not yet opened (an old or hand-edited backup). */
const OWED_MAX = 4;

export const HALF_LINE = '再学一课就能开宝箱！';
export const CAPPED_LINE = '明天再开宝箱！';

/**
 * halves: 0 or 1 between lessons; chestsToday: chests earned on `day`; owed: chests earned and not yet opened (one survives
 * him leaving the Celebration); lesson: the startedAt of the last lesson counted (a celebration shown again never counts twice).
 */
export interface Meter { halves: number; chestsToday: number; day: string; owed: number; lesson: number | null }
export const EMPTY_METER: Meter = { halves: 0, chestsToday: 0, day: '', owed: 0, lesson: null };

export type LessonKind = 'first' | 'extra';
/** A finished lesson as the meter sees it: the day's first (daily) or an extra one, its day, and its key (startedAt). */
export interface Lesson { kind: LessonKind; day: string; key: number }

/** What one lesson did, for the Celebration: the boat sails from `from` (0–2), `chests` open, and the meter ends at `left`. */
export interface MeterFill { counted: boolean; from: number; chests: number; left: number; capped: boolean; banked: number }

/** The lesson a finished record counts as; null for free play and for a record with nothing done in it. */
export function lessonOf(rec: Pick<SessionRecord, 'free' | 'extra' | 'completedSteps' | 'date' | 'startedAt'>): Lesson | null {
  if (rec.free || rec.completedSteps.length === 0) return null;
  return { kind: rec.extra ? 'extra' : 'first', day: rec.date, key: rec.startedAt };
}

export function fillMeter(kid: KidState, lesson: Lesson): { kid: KidState; fill: MeterFill } {
  const m = kid.meter;
  const sameDay = m.day === lesson.day;
  // startedAt keys only increase: a lesson at or before the last one counted, or from an earlier day, was counted already (or
  // never can be): a Celebration shown again (a reload, the path chest, the daily after an extra) counts nothing (review focus 1)
  if ((m.lesson !== null && lesson.key <= m.lesson) || lesson.day < m.day) {
    return { kid, fill: { counted: false, from: m.halves, chests: 0, left: m.halves, capped: sameDay && m.chestsToday >= CHESTS_PER_DAY, banked: 0 } };
  }
  // a new day: its chests start again, and what was banked joins the meter (spec §3: the first lesson adds its 2 on top)
  let halves = sameDay ? m.halves : m.halves + (kid.bank ?? 0);
  let bank = sameDay ? kid.bank ?? 0 : 0;
  let chestsToday = sameDay ? m.chestsToday : 0;
  // today's first chest was opened before the meter existed (lastChestDate: today's first-chest marker), whichever lesson
  // comes first on the meter's new day; the daily lesson itself then adds nothing (review focus 2)
  const openedBefore = !sameDay && kid.lastChestDate === lesson.day;
  if (openedBefore) chestsToday = 1;
  const add = openedBefore && lesson.kind === 'first' ? 0 : lesson.kind === 'first' ? FIRST_HALVES : EXTRA_HALVES;
  const from = Math.min(halves, METER_FULL);
  let chests = 0;
  let banked = 0;
  if (chestsToday >= CHESTS_PER_DAY) {
    banked = Math.min(BANK_MAX, bank + add) - bank;
    bank += banked;
  } else {
    halves += add;
    while (halves >= METER_FULL && chestsToday < CHESTS_PER_DAY) {
      halves -= METER_FULL;
      chests++;
      chestsToday++;
    }
    // capped with halves left over: they wait in the bank, so the boat shows the capped day and tomorrow carries one meter at most
    if (chestsToday >= CHESTS_PER_DAY && halves > 0) {
      banked = Math.min(BANK_MAX, bank + halves) - bank;
      bank += banked;
      halves = 0;
    }
  }
  const meter: Meter = { halves, chestsToday, day: lesson.day, owed: m.owed + chests, lesson: lesson.key };
  return { kid: { ...kid, meter, bank }, fill: { counted: true, from, chests, left: halves, capped: chestsToday >= CHESTS_PER_DAY, banked } };
}

/** The line under the boat (spec §3): the day's chests are done, or the boat is half way; else none. */
export function meterLine(fill: Pick<MeterFill, 'left' | 'capped'>): string | null {
  if (fill.capped) return CAPPED_LINE;
  return fill.left === 1 ? HALF_LINE : null;
}

/** Where Home's small boat sits on `day`: today's meter, or a new day's with the bank in it (as the first lesson will count it). */
export function meterShown(kid: KidState, day: string): { halves: number; capped: boolean } {
  const m = kid.meter;
  if (m.day === day) return { halves: Math.min(m.halves, METER_FULL), capped: m.chestsToday >= CHESTS_PER_DAY };
  return { halves: Math.min(m.halves + (kid.bank ?? 0), METER_FULL), capped: false };
}

const count = (n: unknown, max: number) => (typeof n === 'number' && Number.isInteger(n) && n > 0 ? Math.min(n, max) : 0);

export function normalizeMeter(v: unknown): Meter {
  const x = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof Meter, unknown>>;
  return {
    halves: count(x.halves, METER_FULL - 1),
    chestsToday: count(x.chestsToday, CHESTS_PER_DAY),
    day: typeof x.day === 'string' ? x.day : '',
    owed: count(x.owed, OWED_MAX),
    lesson: typeof x.lesson === 'number' && Number.isFinite(x.lesson) ? x.lesson : null,
  };
}

export const normalizeBank = (v: unknown): number => count(v, BANK_MAX);
