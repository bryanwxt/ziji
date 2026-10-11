// His textbook 《欢乐伙伴2.0》 as positions (spec 2026-10-11 §4): a lesson index is a place in moe2024.json's lesson order
// (0 = 一上 L1). Where a character is first read and first written, and which lesson his class is on today.
import moe from './moe2024.json';
import type { Course } from './index';
import type { Settings } from '../types';
import { dayNumber, semesterAt, teachingDays, yearStart } from './schoolCalendar';

export interface MoeLesson { term: string; lesson: number; read: string; write: string; writeHcl: string }
export const LESSONS: readonly MoeLesson[] = (moe as { lessons: MoeLesson[] }).lessons;

/** The course his lessons follow when the parent hasn't chosen: both lists (parent, 2026-10-11). */
export const DEFAULT_COURSE: Course = 'both';
export const courseOf = (s: { course?: Course }): Course => s.course ?? DEFAULT_COURSE;

/** A lesson's characters to write in a course: 华文's, 高级华文's, or both lists'. */
export const writeList = (l: MoeLesson, course: Course): string => (course === 'cl' ? l.write : course === 'hcl' ? l.writeHcl : l.write + l.writeHcl);

const firstAt = (list: (l: MoeLesson) => string): Map<string, number> => {
  const at = new Map<string, number>();
  LESSONS.forEach((l, i) => { for (const ch of Array.from(list(l))) if (!at.has(ch)) at.set(ch, i); });
  return at;
};
const READ_AT = firstAt((l) => l.read);
const WRITE_AT: Record<Course, Map<string, number>> = {
  cl: firstAt((l) => writeList(l, 'cl')),
  hcl: firstAt((l) => writeList(l, 'hcl')),
  both: firstAt((l) => writeList(l, 'both')),
};

/** The first lesson whose 识读字 has the character; undefined if his book never teaches it. */
export const taughtAt = (ch: string): number | undefined => READ_AT.get(ch);
/** The first lesson whose write list (the course's; both lists for 'both') has the character. */
export const writeAt = (ch: string, course: Course): number | undefined => WRITE_AT[course].get(ch);

const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** 1–99 in Chinese: 7 → 七, 10 → 十, 17 → 十七, 20 → 二十. */
export function zhNumber(n: number): string {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return tens === 0 ? NUM[ones]! : `${tens > 1 ? NUM[tens] : ''}十${NUM[ones]}`;
}
/** 「二下·17」 */
export const lessonLabel = (i: number): string => `${LESSONS[i]!.term}·${LESSONS[i]!.lesson}`;
/** 「二下 第十七课」 */
export const lessonName = (i: number): string => `${LESSONS[i]!.term} 第${zhNumber(LESSONS[i]!.lesson)}课`;
/** The index of a term's lesson, e.g. ('二下', 17) → 35; undefined if the book has no such lesson. */
export function lessonIndex(term: string, lesson: number): number | undefined {
  const i = LESSONS.findIndex((l) => l.term === term && l.lesson === lesson);
  return i < 0 ? undefined : i;
}
/** The lesson indexes of one term, in order (empty past the lists). */
export const termLessons = (term: string): number[] => LESSONS.flatMap((l, i) => (l.term === term ? [i] : []));
const GRADE = ['一', '二', '三', '四', '五', '六'];
/** A school year's two books: P2 → ['二上', '二下']. */
export const gradeTerms = (grade: number): [string, string] => [`${GRADE[grade - 1] ?? ''}上`, `${GRADE[grade - 1] ?? ''}下`];

/**
 * His school year now (P1 = 1): the year the parent set, moved up each January since (Singapore's school year is the calendar
 * year), up to P6. Set before the year was remembered: 2026.
 */
export function schoolYear(s: { grade?: number; gradeYear?: number }, now: Date): number {
  return Math.min(6, Math.max(1, (s.grade ?? 2) + now.getFullYear() - (s.gradeYear ?? 2026)));
}

/**
 * Where his class is by the calendar (spec §4): the semester's lessons spread evenly over its school days, breaks skipped. A holiday
 * keeps the last lesson of the semester just ended; before Term 1, the year's first lesson. Null for a year or school year without data.
 */
export function estimateLesson(now: Date, grade: number): number | null {
  const start = yearStart(now.getFullYear());
  if (start === null) return null;
  const [up, down] = gradeTerms(grade).map(termLessons) as [number[], number[]];
  if (dayNumber(now) < start) return up[0] ?? null;
  const sem = semesterAt(now)!;
  const lessons = sem.half === 1 ? up : down;
  if (!lessons.length) return null;
  const { done, total } = teachingDays(sem, now);
  return lessons[Math.min(lessons.length - 1, Math.floor((done * lessons.length) / total))]!;
}

type ClassSettings = Pick<Settings, 'grade' | 'gradeYear' | 'classLesson'>;

/** Is the parent's correction in force? Only in the semester it was set in: the next semester goes back to the calendar. */
export function correctionApplies(now: Date, s: ClassSettings): boolean {
  const c = s.classLesson;
  if (!c || lessonIndex(c.term, c.lesson) === undefined || now.getTime() < c.setAt) return false;
  const was = semesterAt(new Date(c.setAt));
  const is = semesterAt(now);
  return !!was && !!is && was.year === is.year && was.half === is.half;
}

/**
 * The lesson his class is on today: the parent's correction carried forward at the calendar's pace (one lesson per
 * total ÷ lessons school days), never past his school year's last lesson; else the calendar's estimate.
 */
export function classLessonAt(now: Date, s: ClassSettings): number | null {
  const grade = schoolYear(s, now);
  if (!correctionApplies(now, s)) return estimateLesson(now, grade);
  const c = s.classLesson!;
  const set = lessonIndex(c.term, c.lesson)!;
  const sem = semesterAt(now)!;
  const [up, down] = gradeTerms(grade).map(termLessons) as [number[], number[]];
  const pace = (sem.half === 1 ? up : down).length;
  const { done: then } = teachingDays(sem, new Date(c.setAt));
  const { done, total } = teachingDays(sem, now);
  const moved = total ? Math.floor(((done - then) * pace) / total) : 0;
  return Math.min(set + moved, Math.max(set, ...down, ...up));
}

/** Characters to read and to write by the end of lesson `upTo` (inclusive). */
export function listedBy(upTo: number, course: Course): { read: Set<string>; write: Set<string> } {
  const ls = LESSONS.slice(0, upTo + 1);
  return { read: new Set(ls.flatMap((l) => Array.from(l.read))), write: new Set(ls.flatMap((l) => Array.from(writeList(l, course)))) };
}

/** The characters a term brings: first read in it, and first written in it (in the course). */
export function termChars(term: string, course: Course): { read: string[]; write: string[] } {
  const inTerm = (at: number | undefined) => at !== undefined && LESSONS[at]!.term === term;
  const all = (pick: (l: MoeLesson) => string) => [...new Set(LESSONS.flatMap((l) => Array.from(pick(l))))];
  return { read: all((l) => l.read).filter((ch) => inTerm(taughtAt(ch))), write: all((l) => writeList(l, course)).filter((ch) => inTerm(writeAt(ch, course))) };
}
