// MOE school terms (spec 2026-10-11 §4): Semester I is Terms 1–2 (the 上 books), Semester II is Terms 3–4 (the 下 books).
// Dates are inclusive; the March and September breaks and the holidays fall between them. Add a year's dates when MOE publishes them.

/** A term's first and last school day, 'YYYY-MM-DD'. */
export type TermDates = readonly [start: string, end: string];

export const SCHOOL_TERMS: Readonly<Record<number, readonly [TermDates, TermDates, TermDates, TermDates]>> = {
  2026: [['2026-01-02', '2026-03-13'], ['2026-03-23', '2026-05-29'], ['2026-06-29', '2026-09-04'], ['2026-09-14', '2026-11-20']],
  2027: [['2027-01-04', '2027-03-12'], ['2027-03-22', '2027-05-28'], ['2027-06-28', '2027-09-03'], ['2027-09-13', '2027-11-19']],
};

export interface Semester { year: number; half: 1 | 2 }

const DAY = 86_400_000;
/** A calendar day as a whole number (time of day and time zone don't matter). */
export const dayNumber = (d: Date): number => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY;
const keyDay = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / DAY;
};

/** The day Term 1 starts in `year`, or null when the calendar doesn't have the year. */
export function yearStart(year: number): number | null {
  const t = SCHOOL_TERMS[year];
  return t ? keyDay(t[0][0]) : null;
}

/** The semester in progress or most recently begun (a holiday belongs to the semester before it); null outside the calendar. */
export function semesterAt(now: Date): Semester | null {
  const y = now.getFullYear();
  const t = SCHOOL_TERMS[y];
  if (!t) return null;
  const d = dayNumber(now);
  if (d < keyDay(t[0][0])) return SCHOOL_TERMS[y - 1] ? { year: y - 1, half: 2 } : null;
  return { year: y, half: d < keyDay(t[2][0]) ? 1 : 2 };
}

/** A semester's school days (its two terms, not the break between), and how many have gone by the end of `now`'s day. */
export function teachingDays(sem: Semester, now: Date): { done: number; total: number } {
  const t = SCHOOL_TERMS[sem.year];
  if (!t) return { done: 0, total: 0 };
  const d = dayNumber(now);
  let done = 0;
  let total = 0;
  for (const [start, end] of sem.half === 1 ? [t[0], t[1]] : [t[2], t[3]]) {
    const len = keyDay(end) - keyDay(start) + 1;
    total += len;
    done += Math.min(len, Math.max(0, d - keyDay(start) + 1));
  }
  return { done, total };
}
