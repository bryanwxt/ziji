import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { practisedDays, streakDays, weekDays } from '../stats/stats';
import type { SessionPlan } from '../types';
import { WeekStrip } from './WeekStrip';

const plan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const done = (date: string) => ({ ...createSessionRecord(plan, date, 0), completed: true });

describe('the week strip (spec 2026-10-11 §5)', () => {
  it('shows the forgiven day as 休 (休息日), neither done nor missed', () => {
    render(<WeekStrip days={weekDays([done('2026-09-28'), done('2026-09-30')], '2026-10-01')} />);
    const tue = document.querySelectorAll('.week__day')[1]!;
    expect(tue.classList.contains('is-rest')).toBe(true);
    expect(tue.classList.contains('is-done')).toBe(false);
    expect(tue.getAttribute('title')).toBe('休息日');
    expect(tue.querySelector('[data-zh]')!.getAttribute('data-zh')).toBe('休');
    expect(screen.getByRole('img', { name: '这个星期练了 2 天，休息日 1 天' })).toBeTruthy();
  });
  // parent ruling 2026-10-17: a day with practice isn't a rest day — 考考自己 alone shows as active, still not a lesson for rewards
  it('a day with only 考考自己 shows as active, not 休, and keeps the streak without adding to it', () => {
    const sessions = [done('2026-09-28'), done('2026-09-29')];
    const checkDays = practisedDays([{ id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-09-30', homeworkDue: '2026-10-02', items: [], pairs: [], fits: [], check: { at: 0, day: '2026-09-30', done: true, results: { 'p:1': { form: 'read', correct: true } } } }]);
    expect([...checkDays]).toEqual(['2026-09-30']);
    render(<WeekStrip days={weekDays(sessions, '2026-10-01', checkDays)} />);
    const wed = document.querySelectorAll('.week__day')[2]!;
    expect(wed.classList.contains('is-rest')).toBe(false);
    expect(wed.classList.contains('is-done')).toBe(true);
    expect(wed.querySelector('[data-zh]')!.getAttribute('data-zh')).toBe('三');
    expect(screen.getByRole('img', { name: '这个星期练了 3 天' })).toBeTruthy();
    // the streak: kept through the check day, which adds nothing (no lesson); the week's rest day is still free
    expect(streakDays(sessions, '2026-10-01', checkDays)).toEqual({ count: 2, rest: [] });
    expect(streakDays([...sessions, done('2026-10-02')], '2026-10-03', checkDays).count).toBe(3); // Thu missed: the rest day, Wed kept
  });
  it('an opened check with no answer is not practice', () => {
    expect(practisedDays([{ id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-09-30', homeworkDue: '2026-10-02', items: [], pairs: [], fits: [], check: { at: 0, day: '2026-09-30', done: false, results: {} } }]).size).toBe(0);
  });
  it('no rest day: as before', () => {
    render(<WeekStrip days={weekDays([done('2026-09-28')], '2026-09-29')} />);
    expect(document.querySelector('.is-rest')).toBeNull();
    expect(screen.getByRole('img', { name: '这个星期练了 1 天' })).toBeTruthy();
  });
});
