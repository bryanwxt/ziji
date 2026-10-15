import { describe, expect, it } from 'vitest';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, afterSkip, afterWarmup, daysBetween, entryOf, inGap, isRetired, migrateReading, overdue, readHow, readToday, RETIRED_REST, restFromReview, warmupDue } from './history';

const H0: ReadingHistory = EMPTY_READING;
/** Read `id` on each day in turn, each read going `how`. */
const reads = (r: ReadingHistory, id: string, days: string[], how: 'well' | 'not-well' = 'well') => days.reduce((s, d) => afterRead(s, id, d, how), r);

describe('daysBetween', () => {
  it('counts whole calendar days, across a month end, negative backwards', () => {
    expect(daysBetween('2026-10-15', '2026-10-18')).toBe(3);
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-10-18', '2026-10-15')).toBe(-3);
  });
});

describe('rest after a read (spec 2026-10-15 §4, D6)', () => {
  it('a first read rests 3 days, however it went', () => {
    expect(entryOf(afterRead(H0, 'p01', '2026-10-15', 'well'), 'p01')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 3, q: 1 });
    expect(entryOf(afterRead(H0, 'p01', '2026-10-15', 'not-well'), 'p01').rest).toBe(3);
  });
  it('read well, the rest climbs 3 → 7 → 18 → 45, then the passage retires', () => {
    const rests: number[] = [];
    let r = H0;
    for (const d of ['2026-10-01', '2026-10-04', '2026-10-11', '2026-10-29', '2026-12-13']) {
      r = afterRead(r, 'p01', d, 'well');
      rests.push(entryOf(r, 'p01').rest);
    }
    expect(rests).toEqual([3, 7, 18, 45, RETIRED_REST]);
    expect(isRetired(entryOf(r, 'p01'))).toBe(true);
  });
  it('a missed question puts the rest back to 3', () => {
    const r = afterRead(reads(H0, 'p01', ['2026-10-01', '2026-10-04', '2026-10-11']), 'p01', '2026-10-29', 'not-well');
    expect(entryOf(r, 'p01')).toMatchObject({ reads: 4, rest: 3, lastRead: '2026-10-29' });
  });
  it('the question turn moves on with each lesson read; 多读一遍 leaves rest, turn and kind alone but counts for the gap', () => {
    let r = reads(H0, 'p01', ['2026-10-01', '2026-10-04']);
    expect(entryOf(r, 'p01')).toMatchObject({ q: 2, rest: 7 });
    r = afterRead(r, 'p01', '2026-10-12', 'extra');
    expect(entryOf(r, 'p01')).toMatchObject({ reads: 3, q: 2, rest: 7, lastRead: '2026-10-12' });
    expect(r.lastKind).toBe('revisit');
  });
  it('a first read in 多读一遍 rests 3 days and leaves the first question for next time', () => {
    expect(entryOf(afterRead(H0, 'p02', '2026-10-15', 'extra'), 'p02')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 3, q: 0 });
  });
  it('a lesson read records whether it was new or a revisit', () => {
    const r = afterRead(H0, 'p01', '2026-10-01', 'well');
    expect(r.lastKind).toBe('new');
    expect(afterRead(r, 'p01', '2026-10-04', 'well').lastKind).toBe('revisit');
  });
});

describe('how a read went: never from the recording (spec §1 cause 4)', () => {
  it('no question: well; a question: well only when answered right; 多读一遍: extra', () => {
    expect(readHow({ extra: false, asked: false, meaning: null })).toBe('well');
    expect(readHow({ extra: false, asked: true, meaning: { correct: true } })).toBe('well');
    expect(readHow({ extra: false, asked: true, meaning: { correct: false } })).toBe('not-well');
    expect(readHow({ extra: false, asked: true, meaning: null })).toBe('not-well');
    expect(readHow({ extra: true, asked: true, meaning: { correct: true } })).toBe('extra');
  });
});

describe('the 3-day gap and due revisits', () => {
  const r = afterRead(H0, 'p01', '2026-10-15', 'well');
  it('never within 3 days of the last read, the same day included', () => {
    expect(['2026-10-15', '2026-10-16', '2026-10-17'].map((d) => inGap(entryOf(r, 'p01'), d))).toEqual([true, true, true]);
    expect(inGap(entryOf(r, 'p01'), '2026-10-18')).toBe(false);
  });
  it('due once its rest has passed; overdue counts the days since', () => {
    expect(overdue(entryOf(r, 'p01'), '2026-10-17')).toBe(-1);
    expect(overdue(entryOf(r, 'p01'), '2026-10-18')).toBe(0);
    expect(overdue(entryOf(r, 'p01'), '2026-10-21')).toBe(3);
    expect(overdue(entryOf(r, 'p99'), '2026-10-21')).toBeNull(); // never read
  });
  it('readToday', () => {
    expect(readToday(r, '2026-10-15')).toBe(true);
    expect(readToday(r, '2026-10-16')).toBe(false);
  });
});

describe('下一篇 (spec 2026-10-15 §5)', () => {
  it('a skip starts the gap and counts, leaving reads and rest alone', () => {
    const r = afterSkip(afterSkip(reads(H0, 'p01', ['2026-10-01']), 'p01', '2026-10-09'), 'p01', '2026-10-20');
    expect(entryOf(r, 'p01')).toEqual({ reads: 1, lastRead: '2026-10-01', rest: 3, q: 1, lastSkipped: '2026-10-20', skips: 2 });
    expect(inGap(entryOf(r, 'p01'), '2026-10-22')).toBe(true);
    expect(entryOf(afterSkip(H0, 'p05', '2026-10-20'), 'p05')).toMatchObject({ reads: 0, skips: 1 });
  });
});

describe("the parent's misread marks (spec 2026-10-15 §4)", () => {
  it('due again 3 days after the review, from any rest, a retired passage too', () => {
    let r = reads(H0, 'p01', ['2026-10-01', '2026-10-04', '2026-10-11']); // rest 18
    r = restFromReview(r, 'p01', '2026-10-13');
    expect(overdue(entryOf(r, 'p01'), '2026-10-16')).toBe(0);
    expect(entryOf(r, 'p01').lastRead).toBe('2026-10-11');
    const retired: ReadingHistory = { ...H0, history: { p02: { reads: 5, lastRead: '2026-10-01', rest: RETIRED_REST, q: 5 } } };
    expect(isRetired(entryOf(restFromReview(retired, 'p02', '2026-10-02'), 'p02'))).toBe(false);
  });
  it('a passage never read is left alone', () => {
    expect(restFromReview(H0, 'p01', '2026-10-13')).toBe(H0);
  });
});

describe('the warm-up (spec 2026-10-15 §4)', () => {
  it('runs when the last was 3 or more days ago, or never', () => {
    expect(warmupDue(H0, '2026-10-15')).toBe(true);
    const r = afterWarmup(H0, '2026-10-15', true);
    expect(r).toMatchObject({ lastWarmup: '2026-10-15', warmups: 1 });
    expect(['2026-10-15', '2026-10-17', '2026-10-18'].map((d) => warmupDue(r, d))).toEqual([false, false, true]);
    expect(afterWarmup(H0, '2026-10-15', false)).toMatchObject({ lastWarmup: '2026-10-15', warmups: 0 }); // the mic refused: it still ran
  });
});

describe('the one-off move from the 3-day cycle (spec 2026-10-15 §8)', () => {
  const old = { passageId: 'p03', days: 2, extra: 1, lastDay: '2026-10-14', lastRead: { p01: '2026-10-08', p03: '2026-10-14' }, warmups: 4 };
  it('each passage read becomes one read resting 3 days, its question asked; the current one keeps its days as reads', () => {
    expect(migrateReading(old)).toEqual({
      history: { p01: { reads: 1, lastRead: '2026-10-08', rest: 3, q: 1 }, p03: { reads: 2, lastRead: '2026-10-14', rest: 3, q: 1 } },
      lastKind: null,
      lastWarmup: '2026-10-14',
      warmups: 4,
    });
  });
  it('runs once: a second run changes nothing', () => {
    expect(migrateReading(migrateReading(old))).toEqual(migrateReading(old));
  });
  it('a cycle not yet begun is no warm-up; anything unreadable is no history', () => {
    expect(migrateReading({ passageId: null, days: 0, extra: 0, lastDay: null, lastRead: {}, warmups: 0 })).toEqual(EMPTY_READING);
    expect(migrateReading(undefined)).toEqual(EMPTY_READING);
    expect(migrateReading('x')).toEqual(EMPTY_READING);
    expect(migrateReading({ history: { p01: { reads: 'x', lastRead: 7, rest: -1, q: 2 } }, lastKind: 'old', warmups: 2 })).toEqual({ history: { p01: { reads: 0, lastRead: null, rest: 0, q: 2 } }, lastKind: null, lastWarmup: null, warmups: 2 });
  });
});
