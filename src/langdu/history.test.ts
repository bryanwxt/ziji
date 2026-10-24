import { describe, expect, it } from 'vitest';
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, ANSWERS_KEPT, afterSkip, afterWarmup, daysBetween, entryOf, inGap, isRetired, migrateReading, overdue, readHow, readToday, RETIRED_REST, restFromReview, warmupDue } from './history';

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

describe('rest after a read (spec 2026-10-24 §6)', () => {
  it('a first read judged well rests 21 days; one not judged well rests 3', () => {
    expect(entryOf(afterRead(H0, 'p01', '2026-10-15', 'well'), 'p01')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 21, q: 1, lastHow: 'well' });
    expect(entryOf(afterRead(H0, 'p01', '2026-10-15', 'not-well'), 'p01')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 3, q: 1, lastHow: 'not-well' });
  });
  it('read well, the rest climbs 21 → 45, then the passage retires', () => {
    const rests: number[] = [];
    let r = H0;
    for (const d of ['2026-10-01', '2026-10-22', '2026-12-06']) {
      r = afterRead(r, 'p01', d, 'well');
      rests.push(entryOf(r, 'p01').rest);
    }
    expect(rests).toEqual([21, 45, RETIRED_REST]);
    expect(isRetired(entryOf(r, 'p01'))).toBe(true);
  });
  it('a read not judged well rests 3 days from any rest; the next good read starts the ladder again at 21', () => {
    let r = reads(H0, 'p01', ['2026-10-01', '2026-10-22']); // rest 45
    r = afterRead(r, 'p01', '2026-12-06', 'not-well');
    expect(entryOf(r, 'p01')).toMatchObject({ rest: 3, lastHow: 'not-well' });
    expect(entryOf(afterRead(r, 'p01', '2026-12-09', 'well'), 'p01')).toMatchObject({ rest: 21, lastHow: 'well' });
  });
  it('an early read (before its rest is over: nothing else was there) keeps the rest — it does not climb (final review)', () => {
    let r = afterRead(H0, 'p01', '2026-10-01', 'well'); // rest 21
    r = afterRead(r, 'p01', '2026-10-08', 'well'); // 7 days into 21: early
    expect(entryOf(r, 'p01')).toMatchObject({ reads: 2, lastRead: '2026-10-08', rest: 21, q: 2 });
    expect(entryOf(afterRead(r, 'p01', '2026-10-12', 'not-well'), 'p01').rest).toBe(3); // a miss still goes back to 3
  });
  it('the question turn moves on with each lesson read; 多读一遍 leaves rest, turn, how and kind alone but counts for the gap', () => {
    let r = reads(H0, 'p01', ['2026-10-01', '2026-10-04'], 'not-well');
    expect(entryOf(r, 'p01')).toMatchObject({ q: 2, rest: 3 });
    r = afterRead(r, 'p01', '2026-10-12', 'extra');
    expect(entryOf(r, 'p01')).toMatchObject({ reads: 3, q: 2, rest: 3, lastRead: '2026-10-12', lastHow: 'not-well' });
    expect(r.lastKind).toBe('revisit');
  });
  it('a first read in 多读一遍 rests 3 days and leaves the first question set for next time', () => {
    expect(entryOf(afterRead(H0, 'p02', '2026-10-15', 'extra'), 'p02')).toEqual({ reads: 1, lastRead: '2026-10-15', rest: 3, q: 0 });
  });
  it('a second lesson read of the same passage the same day (two tabs) counts the read only: no second climb', () => {
    const r = reads(H0, 'p01', ['2026-10-01', '2026-10-04'], 'not-well'); // rest 3, q 2, a revisit
    const twice = afterRead({ ...r, lastKind: 'new' }, 'p01', '2026-10-04', 'well');
    expect(entryOf(twice, 'p01')).toEqual({ reads: 3, lastRead: '2026-10-04', rest: 3, q: 2, lastHow: 'not-well' });
    expect(twice.lastKind).toBe('new');
  });
  it('a lesson read records whether it was new or a revisit', () => {
    const r = afterRead(H0, 'p01', '2026-10-01', 'not-well');
    expect(r.lastKind).toBe('new');
    expect(afterRead(r, 'p01', '2026-10-04', 'well').lastKind).toBe('revisit');
  });
  it('a lesson read keeps the set it asked and his answers by kind, dated, the last 30 (spec 2026-10-24 §8)', () => {
    const asked = { set: [0, 2, 5], answers: [{ kind: 'why' as const, correct: false }, { kind: 'order' as const, correct: true }, { kind: 'fact' as const, correct: true }] };
    const r = afterRead(H0, 'p01', '2026-10-01', 'well', asked);
    expect(entryOf(r, 'p01')).toMatchObject({ lastSet: [0, 2, 5], answers: [{ kind: 'why', correct: false, at: '2026-10-01' }, { kind: 'order', correct: true, at: '2026-10-01' }, { kind: 'fact', correct: true, at: '2026-10-01' }] });
    let many = r;
    for (let i = 0; i < 12; i++) many = afterRead(many, 'p01', localDateKey(addDays(parseDateKey('2026-10-04'), i * 3)), 'well', asked);
    const kept = entryOf(many, 'p01').answers!;
    expect(kept).toHaveLength(ANSWERS_KEPT);
    expect(kept.at(-1)!.at).toBe('2026-11-06');
    expect(entryOf(afterRead(r, 'p01', '2026-10-20', 'extra'), 'p01').answers).toHaveLength(3); // 多读一遍 asks nothing
  });
});

describe('how a read went: from his answers, never the recording (spec 2026-10-24 §5)', () => {
  const a = (...rights: boolean[]) => rights.map((correct) => ({ correct }));
  it("'well' at 2 of 3 right or better; 'not-well' at 0 or 1; no question: well; 多读一遍: extra", () => {
    expect(readHow({ extra: false, answers: a(true, true, true) })).toBe('well');
    expect(readHow({ extra: false, answers: a(true, false, true) })).toBe('well');
    expect(readHow({ extra: false, answers: a(false, true, false) })).toBe('not-well');
    expect(readHow({ extra: false, answers: a(false, false, false) })).toBe('not-well');
    expect(readHow({ extra: false, answers: [] })).toBe('well');
    expect(readHow({ extra: true, answers: a(false, false, false) })).toBe('extra');
  });
  it("a parent text's one question: right is well, missed is not; a passage still on its older two needs both", () => {
    expect(readHow({ extra: false, answers: a(true) })).toBe('well');
    expect(readHow({ extra: false, answers: a(false) })).toBe('not-well');
    expect(readHow({ extra: false, answers: a(true, true) })).toBe('well');
    expect(readHow({ extra: false, answers: a(true, false) })).toBe('not-well');
  });
});

describe('the 3-day gap and due revisits', () => {
  const r = afterRead(H0, 'p01', '2026-10-15', 'not-well'); // rests 3
  it('never within 3 days of the last read, the same day included', () => {
    expect(['2026-10-15', '2026-10-16', '2026-10-17'].map((d) => inGap(entryOf(r, 'p01'), d))).toEqual([true, true, true]);
    expect(inGap(entryOf(r, 'p01'), '2026-10-18')).toBe(false);
  });
  it('a read dated in the future (a clock that ran ahead) is no gap', () => {
    expect(inGap(entryOf(afterRead(H0, 'p01', '2026-10-20', 'well'), 'p01'), '2026-10-15')).toBe(false);
    expect(inGap(entryOf(afterSkip(H0, 'p01', '2026-10-20'), 'p01'), '2026-10-15')).toBe(false);
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
    const r = afterSkip(afterSkip(reads(H0, 'p01', ['2026-10-01'], 'not-well'), 'p01', '2026-10-09'), 'p01', '2026-10-20');
    expect(entryOf(r, 'p01')).toEqual({ reads: 1, lastRead: '2026-10-01', rest: 3, q: 1, lastHow: 'not-well', lastSkipped: '2026-10-20', skips: 2 });
    expect(inGap(entryOf(r, 'p01'), '2026-10-22')).toBe(true);
    expect(entryOf(afterSkip(H0, 'p05', '2026-10-20'), 'p05')).toMatchObject({ reads: 0, skips: 1 });
  });
});

describe("the parent's misread marks (spec 2026-10-15 §4)", () => {
  it("due again 3 days after the review, from any rest, a retired passage too, as a 'not-well' revisit", () => {
    let r = reads(H0, 'p01', ['2026-10-11']); // rest 21
    r = restFromReview(r, 'p01', '2026-10-13');
    expect(overdue(entryOf(r, 'p01'), '2026-10-16')).toBe(0);
    expect(entryOf(r, 'p01')).toMatchObject({ lastRead: '2026-10-11', lastHow: 'not-well' });
    const retired: ReadingHistory = { ...H0, history: { p02: { reads: 5, lastRead: '2026-10-01', rest: RETIRED_REST, q: 5 } } };
    expect(isRetired(entryOf(restFromReview(retired, 'p02', '2026-10-02'), 'p02'))).toBe(false);
  });
  it('a review long after the read (70 days) still brings the passage back, due 3 days after the review', () => {
    const retired: ReadingHistory = { ...H0, history: { p02: { reads: 5, lastRead: '2026-08-01', rest: RETIRED_REST, q: 5 } } };
    const e = entryOf(restFromReview(retired, 'p02', '2026-10-10'), 'p02');
    expect(e).toEqual({ reads: 5, lastRead: '2026-10-10', rest: 3, q: 5, lastHow: 'not-well' });
    expect(isRetired(e)).toBe(false);
    expect(overdue(e, '2026-10-13')).toBe(0);
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

  it("keeps how the last read went, the set it asked and his answers; drops what isn't one (spec 2026-10-24 §6, §8)", () => {
    const e = { reads: 2, lastRead: '2026-10-20', rest: 3, q: 2, lastHow: 'not-well', lastSet: [1, 4, 5], answers: [{ kind: 'why', correct: false, at: '2026-10-20' }, { kind: 'who', correct: true, at: '2026-10-20' }, { kind: 'main', correct: 'yes', at: '2026-10-20' }] };
    expect(migrateReading({ history: { p01: e }, lastKind: 'revisit', lastWarmup: null, warmups: 0 }).history.p01).toEqual({ reads: 2, lastRead: '2026-10-20', rest: 3, q: 2, lastHow: 'not-well', lastSet: [1, 4, 5], answers: [{ kind: 'why', correct: false, at: '2026-10-20' }] });
    expect(migrateReading({ history: { p01: { ...e, lastHow: 'ok', lastSet: 'x', answers: 3 } }, lastKind: null, lastWarmup: null, warmups: 0 }).history.p01).toEqual({ reads: 2, lastRead: '2026-10-20', rest: 3, q: 2 });
  });
});
