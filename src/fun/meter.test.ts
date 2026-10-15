import { describe, expect, it } from 'vitest';
import { DEFAULT_KID, type KidState } from '../types';
import { EMPTY_METER, fillMeter, lessonOf, meterLine, meterShown, normalizeBank, normalizeMeter, type Lesson, type MeterFill } from './meter';

const first = (day: string, key: number): Lesson => ({ kind: 'first', day, key });
const extra = (day: string, key: number): Lesson => ({ kind: 'extra', day, key });
/** The lessons in order; returns the kid after them and the last lesson's fill. */
function run(lessons: Lesson[], kid: KidState = DEFAULT_KID): { kid: KidState; fill: MeterFill } {
  let k = kid;
  let fill: MeterFill | null = null;
  for (const l of lessons) ({ kid: k, fill } = fillMeter(k, l));
  return { kid: k, fill: fill! };
}

describe('the river meter (rewards spec §3)', () => {
  it("the day's first lesson fills it: the boat sails 0 → full, one chest, the meter starts again", () => {
    const { kid, fill } = run([first('2026-10-15', 1)]);
    expect(fill).toEqual({ counted: true, from: 0, chests: 1, left: 0, capped: false, banked: 0 });
    expect(kid.meter).toEqual({ halves: 0, chestsToday: 1, day: '2026-10-15', owed: 1, lesson: 1 });
  });
  it('an extra lesson fills half; a second extra lesson opens the second chest', () => {
    const a = run([first('2026-10-15', 1), extra('2026-10-15', 2)]);
    expect(a.fill).toMatchObject({ from: 0, chests: 0, left: 1, capped: false });
    expect(meterLine(a.fill)).toBe('再学一课就能开宝箱！');
    const b = run([extra('2026-10-15', 3)], a.kid);
    expect(b.fill).toMatchObject({ from: 1, chests: 1, left: 0, capped: true });
    expect(b.kid.meter.chestsToday).toBe(2);
    expect(meterLine(b.fill)).toBe('明天再开宝箱！');
  });
  it('past the cap of 2, halves go to the bank, never more than one full meter', () => {
    const day = '2026-10-15';
    const capped = run([first(day, 1), extra(day, 2), extra(day, 3)]).kid;
    const c = run([extra(day, 4)], capped);
    expect(c.fill).toMatchObject({ chests: 0, banked: 1, capped: true, left: 0 });
    expect(c.kid.bank).toBe(1);
    const d = run([extra(day, 5), extra(day, 6), extra(day, 7)], c.kid);
    expect(d.kid.bank).toBe(2);
    expect(d.kid.meter).toMatchObject({ owed: 2, chestsToday: 2 });
  });
  it("the next day's first lesson adds its 2 on top of the bank: the chests open at once and the leftover stays", () => {
    const banked = { ...DEFAULT_KID, meter: { halves: 0, chestsToday: 2, day: '2026-10-15', owed: 0, lesson: 7 }, bank: 2 };
    const a = run([first('2026-10-16', 8)], banked);
    expect(a.fill).toEqual({ counted: true, from: 2, chests: 2, left: 0, capped: true, banked: 0 });
    expect(a.kid.bank).toBe(0);
    const half = { ...DEFAULT_KID, meter: { halves: 1, chestsToday: 1, day: '2026-10-15', owed: 0, lesson: 2 } };
    expect(run([first('2026-10-16', 9)], half).fill).toMatchObject({ from: 1, chests: 1, left: 1, capped: false });
  });
  it('a lesson finished after midnight counts on the day it began; the next lesson rolls the day', () => {
    const late = run([first('2026-10-15', 1), extra('2026-10-15', 2)]).kid; // the extra lesson began at 23:50 on the 15th
    const morning = run([first('2026-10-16', 3)], late);
    expect(morning.fill).toMatchObject({ from: 1, chests: 1, left: 1 });
    expect(morning.kid.meter).toMatchObject({ day: '2026-10-16', chestsToday: 1 });
  });
  it('the same lesson celebrated again (a reload, the path chest) counts once (review focus 1)', () => {
    const once = run([first('2026-10-15', 1)]);
    const again = fillMeter(once.kid, first('2026-10-15', 1));
    expect(again.kid).toBe(once.kid);
    expect(again.fill).toMatchObject({ counted: false, chests: 0 });
  });
  it("an install updated after today's chest was opened (lastChestDate today): no second first chest (review focus 2)", () => {
    const a = run([first('2026-10-15', 1)], { ...DEFAULT_KID, lastChestDate: '2026-10-15' });
    expect(a.fill).toMatchObject({ counted: true, chests: 0, left: 0 });
    expect(a.kid.meter.chestsToday).toBe(1);
    const b = run([extra('2026-10-15', 2), extra('2026-10-15', 3)], a.kid);
    expect(b.fill.chests).toBe(1); // the day's second chest after two extra lessons, as for everyone
  });
  it('free play and a lesson with nothing done add nothing', () => {
    const rec = { free: false, extra: false, completedSteps: ['newwords' as const], date: '2026-10-15', startedAt: 5 };
    expect(lessonOf(rec)).toEqual({ kind: 'first', day: '2026-10-15', key: 5 });
    expect(lessonOf({ ...rec, extra: true })?.kind).toBe('extra');
    expect(lessonOf({ ...rec, free: true })).toBeNull();
    expect(lessonOf({ ...rec, completedSteps: [] })).toBeNull();
  });
  it("Home's small boat: today's meter, or a new day's with the bank in it", () => {
    const kid = { ...DEFAULT_KID, meter: { halves: 1, chestsToday: 2, day: '2026-10-15', owed: 0, lesson: 3 }, bank: 2 };
    expect(meterShown(kid, '2026-10-15')).toEqual({ halves: 1, capped: true });
    expect(meterShown(kid, '2026-10-16')).toEqual({ halves: 2, capped: false });
    expect(meterShown(DEFAULT_KID, '2026-10-16')).toEqual({ halves: 0, capped: false });
  });
});

describe('meter data from older or damaged saves (review focus 4)', () => {
  it('starts empty; anything out of range or of the wrong type falls back', () => {
    expect(normalizeMeter(undefined)).toEqual(EMPTY_METER);
    expect(normalizeMeter({ halves: 7, chestsToday: -1, day: 3, owed: 'x', lesson: 'y' })).toEqual({ halves: 1, chestsToday: 0, day: '', owed: 0, lesson: null });
    const ok = { halves: 1, chestsToday: 2, day: '2026-10-15', owed: 1, lesson: 1760000000000 };
    expect(normalizeMeter(ok)).toEqual(ok);
    expect(normalizeBank(5)).toBe(2);
    expect(normalizeBank(-1)).toBe(0);
    expect(normalizeBank(1.5)).toBe(0);
    expect(normalizeBank(undefined)).toBe(0);
  });
});
