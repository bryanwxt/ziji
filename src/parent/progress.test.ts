// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { currentTerm, weeklyTrend } from './progress';
import { makeCard } from '../test/fixtures';

describe('progress (spec 2026-10-06 §3.4)', () => {
  it('the school term: 上 to May, 下 from June; P1–P3 have lists', () => {
    expect(currentTerm(2, new Date('2026-03-01'))).toBe('二上');
    expect(currentTerm(2, new Date('2026-10-06'))).toBe('二下');
    expect(currentTerm(4, new Date('2026-10-06'))).toBeNull();
  });
  it('a weekly count of rungs passed by the end of each week', () => {
    const c = (passed: string) => ({ ...makeCard(`b:${passed}`, 'recognise', new Date()), passed: new Date(passed).getTime() });
    const t = weeklyTrend([c('2026-09-20'), c('2026-09-27'), c('2026-10-05')], 'recognise', new Date('2026-10-06T09:00:00'), 3);
    expect(t.map((x) => x.count)).toEqual([1, 2, 3]);
  });
});

describe('his school year follows the calendar (parent, 2026-10-06: a yardstick that moves each January)', () => {
  it('goes up one each January from the year it was set, and stops at P6', async () => {
    const { schoolYear } = await import('./progress');
    expect(schoolYear({ grade: 2, gradeYear: 2026 }, new Date(2026, 11, 31))).toBe(2);
    expect(schoolYear({ grade: 2, gradeYear: 2026 }, new Date(2027, 0, 2))).toBe(3);
    expect(schoolYear({ grade: 5, gradeYear: 2026 }, new Date(2029, 5, 1))).toBe(6);
    expect(schoolYear({}, new Date(2027, 2, 1))).toBe(3); // the default, P2 in 2026, moves too
    expect(schoolYear({ grade: 2 }, new Date(2026, 9, 6))).toBe(2); // set before the year was remembered: counted from 2026
  });
});
