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
