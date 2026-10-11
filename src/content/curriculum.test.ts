// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  classLessonAt, correctionApplies, courseOf, estimateLesson, lessonIndex, lessonLabel, lessonName, listedBy, schoolYear, taughtAt,
  termChars, termLessons, writeAt, zhNumber,
} from './curriculum';
import { semesterAt, teachingDays } from './schoolCalendar';

const day = (s: string) => new Date(`${s}T09:00:00`); // local time: the estimate counts his calendar day
const P2 = { grade: 2, gradeYear: 2026 };
const at = (s: string, set: Parameters<typeof classLessonAt>[1] = P2) => { const i = classLessonAt(day(s), set); return i === null ? null : lessonLabel(i); };

describe('book positions (spec 2026-10-11 §4)', () => {
  it('a lesson index is a place in the book: 0 is 一上 L1, 35 is 二下 L17', () => {
    expect(lessonIndex('一上', 1)).toBe(0);
    expect(lessonIndex('二下', 17)).toBe(35);
    expect(lessonIndex('二下', 40)).toBeUndefined();
    expect(termLessons('二下')).toEqual([29, 30, 31, 32, 33, 34, 35, 36, 37]);
    expect(termLessons('四上')).toEqual([]);
  });
  it('taughtAt is the first lesson that reads a character; writeAt the first that writes it in the course', () => {
    expect(taughtAt('门')).toBe(7);
    expect(taughtAt('介')).toBeUndefined();
    expect(writeAt('井', 'cl')).toBeUndefined(); // 华文 only reads it
    expect(writeAt('井', 'hcl')).toBe(8);
    expect(writeAt('怎', 'cl')).toBe(43);
    expect(writeAt('怎', 'hcl')).toBe(47);
    expect(writeAt('怎', 'both')).toBe(43); // both lists: whichever writes it first
    expect(writeAt('井', 'both')).toBe(8);
  });
  it('labels: 「二下·17」 and 「二下 第十七课」', () => {
    expect(lessonLabel(35)).toBe('二下·17');
    expect(lessonName(35)).toBe('二下 第十七课');
    expect(lessonName(9)).toBe('一上 第十课');
    expect([zhNumber(1), zhNumber(9), zhNumber(10), zhNumber(17), zhNumber(20)]).toEqual(['一', '九', '十', '十七', '二十']);
  });
  it('both tracks is the default course', () => {
    expect(courseOf({})).toBe('both');
    expect(courseOf({ course: 'cl' })).toBe('cl');
  });
  it('lists to date: P2 reads 746 by the end of 二下; both tracks write 435; 707 and 413 by 二下·17', () => {
    expect(listedBy(37, 'cl').read.size).toBe(746);
    expect(listedBy(37, 'cl').write.size).toBe(350);
    expect(listedBy(37, 'both').write.size).toBe(435);
    expect(listedBy(35, 'both').read.size).toBe(707);
    expect(listedBy(35, 'both').write.size).toBe(413);
  });
  it("a term's own characters: first read, and first written, in it", () => {
    const t = termChars('一上', 'both');
    expect([t.read.length, t.write.length]).toEqual([182, 90]);
    expect(t.read).toContain('门');
    expect(termChars('一下', 'both').read).not.toContain('门');
  });
});

describe('the MOE calendar', () => {
  it('semesters: Terms 1–2 are I, Terms 3–4 are II; a holiday belongs to the semester before it', () => {
    expect(semesterAt(day('2026-02-02'))).toEqual({ year: 2026, half: 1 });
    expect(semesterAt(day('2026-06-15'))).toEqual({ year: 2026, half: 1 });
    expect(semesterAt(day('2026-06-29'))).toEqual({ year: 2026, half: 2 });
    expect(semesterAt(day('2027-01-02'))).toEqual({ year: 2026, half: 2 }); // before 2027's Term 1
    expect(semesterAt(day('2028-03-01'))).toBeNull();
  });
  it('school days: Semester II 2026 has 136, and 96 have gone by 11 October (the September break not counted)', () => {
    expect(teachingDays({ year: 2026, half: 2 }, day('2026-10-11'))).toEqual({ done: 96, total: 136 });
    expect(teachingDays({ year: 2026, half: 2 }, day('2026-09-10'))).toEqual({ done: 68, total: 136 });
    expect(teachingDays({ year: 2026, half: 1 }, day('2026-12-01'))).toEqual({ done: 139, total: 139 });
  });
  it('a day is his local calendar day: late on a term\'s last day counts it, just after midnight counts the next (review focus 4)', () => {
    expect(teachingDays({ year: 2026, half: 2 }, new Date(2026, 8, 4, 23, 59)).done).toBe(68); // Term 3's last day
    expect(teachingDays({ year: 2026, half: 2 }, new Date(2026, 8, 13, 23, 59)).done).toBe(68); // the September break
    expect(teachingDays({ year: 2026, half: 2 }, new Date(2026, 8, 14, 0, 1)).done).toBe(69); // Term 4's first day
  });
});

describe("his class's lesson by the calendar", () => {
  it('2026-10-11 is 二下·17 for a P2 child', () => {
    expect(at('2026-10-11')).toBe('二下·17');
    expect(estimateLesson(day('2026-10-11'), 2)).toBe(35);
  });
  it('every term, and the breaks between them', () => {
    expect(at('2026-02-02')).toBe('二上·3'); // Term 1
    expect(at('2026-03-18')).toBe('二上·6'); // March break: where Term 1 ended
    expect(at('2026-05-01')).toBe('二上·8'); // Term 2
    expect(at('2026-08-03')).toBe('二下·13'); // Term 3
    expect(at('2026-09-10')).toBe('二下·15'); // September break
  });
  it("holidays keep the last lesson of the semester just ended; before Term 1, the year's first lesson", () => {
    expect(at('2026-06-15')).toBe('二上·10');
    expect(at('2026-12-01')).toBe('二下·19');
    expect(at('2026-01-01')).toBe('二上·1');
  });
  it('a new year is a new school year: 2027-01-06 is 三上·1', () => {
    expect(schoolYear(P2, day('2027-01-06'))).toBe(3);
    expect(at('2027-01-06')).toBe('三上·1');
  });
  it('none for a year outside the calendar or a school year past the lists', () => {
    expect(at('2028-03-01')).toBeNull();
    expect(at('2026-10-11', { grade: 4, gradeYear: 2026 })).toBeNull();
    expect(at('2026-10-11', { grade: 3, gradeYear: 2026 })).toBe('三下·15');
  });
});

describe("the parent's correction", () => {
  const set = (term: string, lesson: number, on: string) => ({ ...P2, classLesson: { term, lesson, setAt: day(on).getTime() } });
  it('applies from the day it is set, and moves on at the calendar’s pace (9 lessons over 136 days)', () => {
    const s = set('二下', 15, '2026-10-11');
    expect(correctionApplies(day('2026-10-11'), s)).toBe(true);
    expect(at('2026-10-11', s)).toBe('二下·15');
    expect(at('2026-10-25', s)).toBe('二下·15'); // 14 days: not yet a lesson
    expect(at('2026-10-27', s)).toBe('二下·16'); // 16 days
    expect(at('2026-12-01', s)).toBe('二下·17'); // the holiday: where the term ended
  });
  it('a lesson from the other book of his year carries on into this one', () => {
    expect(at('2026-12-01', set('二上', 9, '2026-10-11'))).toBe('二下·11');
  });
  it('lapses at the next semester: the calendar again', () => {
    const s = set('二下', 15, '2026-10-11');
    expect(correctionApplies(day('2027-01-06'), s)).toBe(false);
    expect(at('2027-01-06', s)).toBe('三上·1');
  });
  it('none set, or a lesson the book does not have: the estimate', () => {
    expect(correctionApplies(day('2026-10-11'), { ...P2, classLesson: null })).toBe(false);
    expect(at('2026-10-11', set('二下', 40, '2026-10-11'))).toBe('二下·17');
  });
});
