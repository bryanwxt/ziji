// src/weeklist/dates.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { clampReadyBy, daysBetween, defaultDates, weekdayZh } from './dates';

describe('weekly list dates (spec §3.3)', () => {
  it('a Monday list: homework Friday, ready by Wednesday', () => {
    expect(defaultDates(new Date(2026, 9, 19, 9))).toEqual({ homeworkDue: '2026-10-23', readyBy: '2026-10-21' });
  });
  it('a Saturday list: the coming Friday, six days on', () => {
    expect(defaultDates(new Date(2026, 9, 17, 9))).toEqual({ homeworkDue: '2026-10-23', readyBy: '2026-10-21' });
  });
  it('a Friday list: the next Friday', () => {
    expect(defaultDates(new Date(2026, 9, 23, 9)).homeworkDue).toBe('2026-10-30');
  });
  it('a Wednesday list: ready-by moves to two days on, at most homework − 1', () => {
    expect(defaultDates(new Date(2026, 9, 21, 9))).toEqual({ homeworkDue: '2026-10-23', readyBy: '2026-10-22' });
  });
  it('a Thursday list for Friday homework is ready by Friday (spec §3.3)', () => {
    expect(clampReadyBy(new Date(2026, 9, 22, 9), '2026-10-20', '2026-10-23')).toBe('2026-10-23');
    expect(defaultDates(new Date(2026, 9, 22, 9))).toEqual({ homeworkDue: '2026-10-23', readyBy: '2026-10-23' });
  });
  it('a Tuesday list: ready by Thursday, the day before homework', () => {
    expect(defaultDates(new Date(2026, 9, 20, 9))).toEqual({ homeworkDue: '2026-10-23', readyBy: '2026-10-22' });
  });
  it('names weekdays', () => {
    expect(weekdayZh('2026-10-21')).toBe('星期三');
    expect(weekdayZh('2026-10-25')).toBe('星期天');
  });
  it('counts days', () => expect(daysBetween('2026-10-19', '2026-10-21')).toBe(2));
});
