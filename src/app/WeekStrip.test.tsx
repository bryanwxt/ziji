import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { weekDays } from '../stats/stats';
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
  it('no rest day: as before', () => {
    render(<WeekStrip days={weekDays([done('2026-09-28')], '2026-09-29')} />);
    expect(document.querySelector('.is-rest')).toBeNull();
    expect(screen.getByRole('img', { name: '这个星期练了 1 天' })).toBeTruthy();
  });
});
