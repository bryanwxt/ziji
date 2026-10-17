// src/weeklist/dates.ts
// A list's two days (weekly list spec 2026-10-17 §3.3): homework due (default the coming Friday) and ready by (default two days
// before it, at least two days after the list arrives, at most the day before homework — homework day itself when the day before is already today).
import { addDays, localDateKey, parseDateKey, startOfLocalDay } from '../lib/date';

const FRIDAY = 5;
const ZH = ['星期天', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export const weekdayZh = (key: string): string => ZH[parseDateKey(key).getDay()]!;
export const daysBetween = (a: string, b: string): number => Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);

export function clampReadyBy(created: Date, readyBy: string, homeworkDue: string): string {
  const today = localDateKey(created);
  const tomorrow = localDateKey(addDays(startOfLocalDay(created), 1));
  // at most the day before homework; when that is today or earlier, homework day itself (a Thursday list for Friday, spec §3.3)
  const dayBefore = localDateKey(addDays(parseDateKey(homeworkDue), -1));
  const latest = dayBefore >= tomorrow ? dayBefore : homeworkDue;
  const earliest = localDateKey(addDays(startOfLocalDay(created), 2));
  let r = readyBy < earliest ? earliest : readyBy;
  if (r > latest) r = latest;
  return r < today ? today : r;
}

export function defaultDates(now: Date): { homeworkDue: string; readyBy: string } {
  const day = startOfLocalDay(now);
  const ahead = (FRIDAY - day.getDay() + 7) % 7 || 7; // a Friday list is for next Friday
  const homeworkDue = localDateKey(addDays(day, ahead));
  return { homeworkDue, readyBy: clampReadyBy(now, localDateKey(addDays(day, ahead - 2)), homeworkDue) };
}
