// The river meter (rewards spec 2026-10-15 §3, amended 2026-10-17): a paper boat sails toward the chest. The day's first lesson
// fills it (2 halves); an extra lesson adds half (1) only when he newly masters a word in it — can write or can say — never just
// for finishing (Deci, Koestner & Ryan 1999). A full meter is a chest; at most 2 chests a local day; halves earned past that wait
// in the bank for tomorrow (at most one full meter). Free play adds nothing.
import type { KidState, SessionRecord } from '../types';

export const METER_FULL = 2;
export const FIRST_HALVES = 2;
/** The most an extra lesson adds. */
export const EXTRA_HALVES = 1;
/** Words newly mastered in an extra lesson for its half. One: a word passes only on its second day, so a review-only lesson
 *  the same day passes 0–2 (rewards spec §1), and asking for 2 would leave a solid one empty-handed most days. */
export const EXTRA_MASTERED_FOR_HALF = 1;
export const CHESTS_PER_DAY = 2;
export const BANK_MAX = 2;
/** A sanity bound on chests earned and not yet opened (an old or hand-edited backup). */
const OWED_MAX = 4;

export const HALF_LINE = '再学会几个字，就能开宝箱！';
/** An extra lesson that mastered nothing new: never a telling-off (learning rules 2026-10-17). */
export const RESTING_LINE = '多学会几个字，小船就走！';
export const CAPPED_LINE = '明天再开宝箱！';

/**
 * halves: 0 or 1 between lessons; chestsToday: chests earned on `day`; owed: chests earned and not yet opened (one survives
 * him leaving the Celebration); lesson: the startedAt of the last lesson counted (a celebration shown again never counts twice).
 */
export interface Meter { halves: number; chestsToday: number; day: string; owed: number; lesson: number | null }
export const EMPTY_METER: Meter = { halves: 0, chestsToday: 0, day: '', owed: 0, lesson: null };

export type LessonKind = 'first' | 'extra';
/** A finished lesson as the meter sees it: the day's first (daily) or an extra one, its day, its key (startedAt), and the words
 *  newly mastered in it (can write or can say: its mastery stars' count). */
export interface Lesson { kind: LessonKind; day: string; key: number; mastered?: number }

/** What one lesson did, for the Celebration: the boat sails from `from` (0–2), the lesson `added` halves, `chests` open, and
 *  the meter ends at `left`. */
export interface MeterFill { counted: boolean; from: number; added: number; chests: number; left: number; capped: boolean; banked: number }

/** The halves an extra lesson adds for the words newly mastered in it. */
export const extraHalves = (mastered: number | undefined): number => ((mastered ?? 0) >= EXTRA_MASTERED_FOR_HALF ? EXTRA_HALVES : 0);

/** The lesson a finished record counts as; null for free play and for a record with nothing done in it. */
export function lessonOf(rec: Pick<SessionRecord, 'free' | 'extra' | 'completedSteps' | 'date' | 'startedAt' | 'produced'>): Lesson | null {
  if (rec.free || rec.completedSteps.length === 0) return null;
  return { kind: rec.extra ? 'extra' : 'first', day: rec.date, key: rec.startedAt, mastered: (rec.produced?.write ?? 0) + (rec.produced?.say ?? 0) };
}

export function fillMeter(kid: KidState, lesson: Lesson): { kid: KidState; fill: MeterFill } {
  const m = kid.meter;
  const sameDay = m.day === lesson.day;
  // a lesson from an earlier day, or on the meter's day at or before the last one counted, was counted already (or never can
  // be): a Celebration shown again (a reload, the path chest, the daily after an extra) counts nothing (review focus 1). A later
  // day always counts, whatever its key: a key from a clock that ran ahead never locks the meter
  if (lesson.day < m.day || (sameDay && m.lesson !== null && lesson.key <= m.lesson)) {
    return { kid, fill: { counted: false, from: m.halves, added: 0, chests: 0, left: m.halves, capped: sameDay && m.chestsToday >= CHESTS_PER_DAY, banked: 0 } };
  }
  // a new day: its chests start again, and what was banked joins the meter (spec §3: the first lesson adds its 2 on top)
  let halves = sameDay ? m.halves : m.halves + (kid.bank ?? 0);
  let bank = sameDay ? kid.bank ?? 0 : 0;
  let chestsToday = sameDay ? m.chestsToday : 0;
  // today's first chest was opened before the meter existed (lastChestDate: today's first-chest marker), whichever lesson
  // comes first; the daily lesson itself then adds nothing (review focus 2). Only for a meter that has never run (migration):
  // on a normal day lastChestDate can be today because yesterday's owed chest was opened this morning
  const openedBefore = m.day === '' && kid.lastChestDate === lesson.day;
  if (openedBefore) chestsToday = 1;
  const add = openedBefore && lesson.kind === 'first' ? 0 : lesson.kind === 'first' ? FIRST_HALVES : extraHalves(lesson.mastered);
  const from = Math.min(halves, METER_FULL);
  let chests = 0;
  let banked = 0;
  if (chestsToday >= CHESTS_PER_DAY) {
    // capped already: the new halves and any left on a loaded meter wait in the bank, so halves + bank stay within one meter
    banked = Math.min(BANK_MAX, bank + halves + add) - bank;
    bank += banked;
    halves = 0;
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
  return { kid: { ...kid, meter, bank }, fill: { counted: true, from, added: add, chests, left: halves, capped: chestsToday >= CHESTS_PER_DAY, banked } };
}

/** The line under the boat (spec §3): the day's chests are done, a counted lesson that moved nothing (an extra lesson that
 *  mastered no new word: what moves it, said kindly), or the boat is half way; else none. */
export function meterLine(fill: Pick<MeterFill, 'left' | 'capped'> & Partial<Pick<MeterFill, 'counted' | 'added'>>): string | null {
  if (fill.capped) return CAPPED_LINE;
  if (fill.counted && fill.added === 0) return RESTING_LINE;
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
    day: typeof x.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.day) ? x.day : '',
    owed: count(x.owed, OWED_MAX),
    lesson: typeof x.lesson === 'number' && Number.isSafeInteger(x.lesson) && x.lesson > 0 ? x.lesson : null,
  };
}

export const normalizeBank = (v: unknown): number => count(v, BANK_MAX);
