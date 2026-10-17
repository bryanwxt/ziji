// src/weeklist/plan.ts
// The new-word budget with a weekly list (weekly list spec 2026-10-17 §5): front-load the list at pace + 2 (never above the
// ceiling, +2 only after a round that fit), protect his class lane over the week, let catch-up yield; revision is never planned
// away. Pure: the planner and the parent's plan line both use it.
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import { bookLesson } from '../session/lanes';
import { PACE_MIN } from '../session/pace';
import type { CardRecord, WeekList } from '../types';
import { daysBetween } from './dates';
import { itemStatus } from './match';

export const CLOSE_AFTER_DAYS = 7;
export const HEADROOM = 2;

/** Lists still running (not closed, up to 7 days after homework, decision 7), the earliest ready-by first. */
export function activeLists(lists: WeekList[], now: Date): WeekList[] {
  const today = localDateKey(now);
  return lists
    .filter((l) => !l.closedAt && daysBetween(l.homeworkDue, today) <= CLOSE_AFTER_DAYS)
    .sort((a, b) => a.readyBy.localeCompare(b.readyBy) || a.createdAt - b.createdAt);
}

/**
 * wordId → the list it counts for (decision 6, spec §10): the earliest list whose ready-by day hasn't passed, so a shared word is
 * the earlier list's until its ready-by and then the later one's; a word only on lists past their ready-by, the earliest of
 * those. Pass lists in activeLists order.
 */
export function listOwner(lists: WeekList[], now: Date): Map<string, WeekList> {
  const today = localDateKey(now);
  const out = new Map<string, WeekList>();
  for (const l of lists) if (today <= l.readyBy) for (const i of l.items) if (!out.has(i.wordId)) out.set(i.wordId, l);
  for (const l of lists) for (const i of l.items) if (!out.has(i.wordId)) out.set(i.wordId, l);
  return out;
}

export const isReadyByDay = (lists: WeekList[], now: Date) => lists.filter((l) => l.readyBy === localDateKey(now));

export interface ListBudget {
  listIds: string[]; // unlearned list words, in list order: the candidates for today's list quota
  listQuota: number; // list words today at most
  total: number; // all new words today
  frontLoad: boolean; // a day of list new words before ready-by: 练一练 +2 min, 写一写 half (§5.1)
  schoolFirst: number; // his class lane's words before catch-up gets any (§5.3)
  classShort: number; // his class lane's words still unstarted on homework day at these numbers (best effort at his pace, §5.3): the parent's line shows it
}

/** The nearest homework day not yet behind, if any. */
const homeworkLeft = (lists: WeekList[], today: string): string | undefined => lists.map((l) => l.homeworkDue).filter((d) => d >= today).sort()[0];

/** Days from `a` to `b`, both counted (0 when b is before a). */
const daysIncl = (a: string, b: string) => Math.max(0, daysBetween(a, b) + 1);

export function listBudget(i: {
  lists: WeekList[]; cards: ReadonlyMap<string, CardRecord>; now: Date; pace: number; ceiling: number;
  ranOutYesterday: boolean; ranOutTwice: boolean; backlog: boolean; schoolNeed: number;
}): ListBudget {
  const today = localDateKey(i.now);
  const owner = listOwner(i.lists, i.now);
  // unlearned list words, in list order (earliest ready-by first): before their list's ready-by, or after it while the list is
  // still open (decision 7), never on the ready-by day itself (the check's day)
  const listIds: string[] = [];
  let need = 0; // of them, words still to teach before their ready-by
  let readyBy: string | null = null; // the nearest ready-by with words still to teach
  for (const l of i.lists) {
    const fresh = l.items.filter((it) => owner.get(it.wordId) === l && itemStatus(it.wordId, i.cards) === 'new').map((it) => it.wordId);
    if (!fresh.length || today === l.readyBy) continue;
    listIds.push(...fresh);
    if (today < l.readyBy) {
      need += fresh.length;
      readyBy ??= l.readyBy;
    }
  }
  const cap = Math.max(i.ceiling, i.pace);
  const head = i.ranOutYesterday || i.backlog ? 0 : HEADROOM;
  const rate = Math.min(i.pace + head, cap);
  if (i.backlog) {
    // a backlog pauses MOE words; a list's still come, at most PACE_MIN a day (§5.1)
    const q = Math.min(PACE_MIN, listIds.length);
    return { listIds, listQuota: q, total: q, frontLoad: q > 0 && need > 0, schoolFirst: 0, classShort: homeworkLeft(i.lists, today) ? i.schoolNeed : 0 };
  }
  // his class lane, protected over the week (§5.3, parent ruling 2026-10-17): spread its unstarted words over the days left to
  // the nearest homework day, so it catches up by then
  const homework = homeworkLeft(i.lists, today);
  const schoolSpread = (days: number) => (homework ? Math.min(i.pace, Math.ceil(i.schoolNeed / Math.max(1, days))) : 0);
  if (!need) {
    // after the front-load days: the school lane first; list words left over (spilled, or after homework) take what remains
    const schoolFirst = schoolSpread(homework ? daysIncl(today, homework) : 1);
    const listQuota = Math.min(listIds.length, Math.max(0, i.pace - schoolFirst));
    const classShort = homework ? Math.max(0, i.schoolNeed - i.pace * daysIncl(today, homework)) : 0;
    return { listIds, listQuota, total: i.pace, frontLoad: false, schoolFirst, classShort };
  }
  // a front-load day: the list at `rate`; two run-outs spill (pace − 1 today, the rest tomorrow, §5.1)
  let quota = Math.min(listIds.length, i.ranOutTwice ? Math.max(1, i.pace - 1) : rate);
  // the class lane can't wait for after the check when those days at his pace aren't enough: the shortfall is spread over the
  // front-load days, from the room under the ceiling first, then from the list only by what still lets it finish before ready-by
  let schoolFirst = 0;
  let classShort = 0;
  let total = Math.max(rate, quota);
  if (homework && readyBy) {
    const front = Math.max(1, daysBetween(today, readyBy));
    const after = daysIncl(readyBy, homework);
    const floor = Math.ceil(Math.max(0, i.schoolNeed - i.pace * after) / front);
    const room = Math.min(floor, Math.max(0, cap - rate));
    const slack = Math.max(0, rate - Math.ceil(need / front));
    const fromList = Math.min(floor - room, slack, quota);
    quota -= fromList;
    schoolFirst = room + fromList;
    total = Math.min(cap, Math.max(rate, quota + schoolFirst));
    classShort = Math.max(0, i.schoolNeed - schoolFirst * front - i.pace * after);
  }
  return { listIds, listQuota: quota, total, frontLoad: quota > 0, schoolFirst, classShort };
}

/** His class lane's unstarted words: his class lesson and the one before (spec §5.3, as pickNewWords' school pool). */
export function schoolNeed(
  words: { id: string; text: string }[], started: ReadonlySet<string>, classAt: number | null,
  lessonOf: (w: { id: string; text: string }) => number | undefined = bookLesson,
): number {
  if (classAt === null) return 0;
  return words.filter((w) => { const at = lessonOf(w); return !started.has(w.id) && (at === classAt || at === classAt - 1); }).length;
}

export const dayAfter = (key: string) => localDateKey(addDays(parseDateKey(key), 1));
