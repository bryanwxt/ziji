import { describe, expect, it } from 'vitest';
import { DEFAULT_KID, type KidState } from '../types';
import { EMPTY_METER, EXTRA_MASTERED_FOR_HALF, extraHalves, fillMeter, lessonOf, meterLine, meterShown, normalizeBank, normalizeMeter, RESTING_LINE, type Lesson, type MeterFill } from './meter';

const first = (day: string, key: number): Lesson => ({ kind: 'first', day, key });
/** An extra lesson in which he newly masters enough to move the boat (learning rules 2026-10-17); `mastered` 0: one that coasted. */
const extra = (day: string, key: number, mastered = EXTRA_MASTERED_FOR_HALF): Lesson => ({ kind: 'extra', day, key, mastered });
/** The lessons in order; returns the kid after them and the last lesson's fill. */
function run(lessons: Lesson[], kid: KidState = DEFAULT_KID): { kid: KidState; fill: MeterFill } {
  let k = kid;
  let fill: MeterFill | null = null;
  for (const l of lessons) ({ kid: k, fill } = fillMeter(k, l));
  return { kid: k, fill: fill! };
}

describe('extra lessons fill by mastery, not by finishing (learning rules 2026-10-17; Deci, Koestner & Ryan 1999)', () => {
  it('half a meter for a word newly mastered, at most one half a lesson', () => {
    expect(extraHalves(0)).toBe(0);
    expect(extraHalves(1)).toBe(1);
    expect(extraHalves(5)).toBe(1);
    expect(extraHalves(undefined)).toBe(0);
  });
  it('an extra lesson that masters nothing: counted (it never counts twice), the boat stays, a kind line', () => {
    const a = run([first('2026-10-15', 1), extra('2026-10-15', 2, 0)]);
    expect(a.fill).toMatchObject({ counted: true, added: 0, from: 0, left: 0, chests: 0, capped: false });
    expect(a.kid.meter.lesson).toBe(2);
    expect(meterLine(a.fill)).toBe(RESTING_LINE);
    expect(RESTING_LINE).toBe('多学会几个字，小船就走！');
  });
  it('the first daily lesson still fills it, mastered or not', () => {
    expect(run([{ kind: 'first', day: '2026-10-15', key: 1, mastered: 0 }]).fill).toMatchObject({ added: 2, chests: 1 });
  });
  it('lessonOf reads what the lesson newly produced', () => {
    const rec = { free: false, extra: true, completedSteps: ['practice' as const], date: '2026-10-15', startedAt: 5 };
    expect(lessonOf({ ...rec, produced: { write: 1, say: 1 } })).toEqual({ kind: 'extra', day: '2026-10-15', key: 5, mastered: 2 });
    expect(lessonOf(rec)?.mastered).toBe(0);
  });
});

describe('the river meter (rewards spec §3)', () => {
  it("the day's first lesson fills it: the boat sails 0 → full, one chest, the meter starts again", () => {
    const { kid, fill } = run([first('2026-10-15', 1)]);
    expect(fill).toEqual({ counted: true, from: 0, added: 2, chests: 1, left: 0, capped: false, banked: 0 });
    expect(kid.meter).toEqual({ halves: 0, chestsToday: 1, day: '2026-10-15', owed: 1, lesson: 1 });
  });
  it('an extra lesson fills half; a second extra lesson opens the second chest', () => {
    const a = run([first('2026-10-15', 1), extra('2026-10-15', 2)]);
    expect(a.fill).toMatchObject({ from: 0, chests: 0, left: 1, capped: false });
    expect(meterLine(a.fill)).toBe('再学会几个字，就能开宝箱！');
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
    expect(a.fill).toEqual({ counted: true, from: 2, added: 2, chests: 2, left: 0, capped: true, banked: 0 });
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
    expect(lessonOf(rec)).toEqual({ kind: 'first', day: '2026-10-15', key: 5, mastered: 0 });
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

describe('the meter after review (fix round 1)', () => {
  it('daily, then an extra, then the daily celebrated again: the daily counts once (review focus 1)', () => {
    const a = run([first('2026-10-15', 1), extra('2026-10-15', 2)]);
    const again = fillMeter(a.kid, first('2026-10-15', 1));
    expect(again.kid).toBe(a.kid);
    expect(again.fill).toMatchObject({ counted: false, chests: 0 });
    expect(again.kid.meter).toMatchObject({ owed: 1, chestsToday: 1, halves: 1 });
  });
  it("an older day's record never resets the day or the bank", () => {
    const kid = { ...DEFAULT_KID, meter: { halves: 0, chestsToday: 2, day: '2026-10-16', owed: 0, lesson: 5 }, bank: 1 };
    const old = fillMeter(kid, first('2026-10-15', 99));
    expect(old.kid).toBe(kid);
    expect(old.fill).toMatchObject({ counted: false, chests: 0 });
  });
  it("lastChestDate today and only extra lessons (an install updated mid-day): two more chests never come, only one (review focus 2)", () => {
    let k: KidState = { ...DEFAULT_KID, lastChestDate: '2026-10-15' };
    let chests = 0;
    for (let i = 1; i <= 4; i++) {
      const r = fillMeter(k, extra('2026-10-15', i));
      chests += r.fill.chests;
      k = r.kid;
    }
    expect(chests).toBe(1);
    expect(k.meter.chestsToday).toBe(2);
    expect(k.bank).toBe(2);
  });
  it('at the cap, leftover halves go into the bank: never more than one meter carried into tomorrow', () => {
    const damaged = { ...DEFAULT_KID, meter: { halves: 1, chestsToday: 2, day: '2026-10-15', owed: 0, lesson: 3 }, bank: 2 };
    const a = run([first('2026-10-16', 4)], damaged); // 1 + 2 + 2 = 5 halves: 2 chests, 1 left over
    expect(a.fill).toMatchObject({ chests: 2, left: 0, capped: true, banked: 1 });
    expect(a.kid.meter.halves).toBe(0);
    expect(a.kid.bank).toBe(1);
    expect(meterShown(a.kid, '2026-10-16')).toEqual({ halves: 0, capped: true });
  });
  it('any run of lessons: halves + bank stay within one meter, and no day gives more than 2 chests', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let trial = 0; trial < 200; trial++) {
      let k: KidState = { ...DEFAULT_KID, lastChestDate: rand() < 0.3 ? '2026-10-01' : null };
      let d = 1;
      const perDay = new Map<string, number>();
      for (let key = 1; key <= 12; key++) {
        if (rand() < 0.3) d++;
        const dayKey = `2026-10-${String(d).padStart(2, '0')}`;
        const r = fillMeter(k, { kind: rand() < 0.4 ? 'first' : 'extra', day: dayKey, key });
        k = r.kid;
        perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + r.fill.chests);
        expect(k.meter.halves + (k.bank ?? 0)).toBeLessThanOrEqual(2);
        expect(perDay.get(dayKey)!).toBeLessThanOrEqual(2);
      }
    }
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

describe('the meter after re-review (fix round 2)', () => {
  it("an extra lesson's chest opened the next morning never eats that day's first chest (the marker is for migration only)", () => {
    // D: daily, then two extras (second chest owed). D+1: that owed chest is opened first, which marks lastChestDate D+1
    const d = run([first('2026-10-15', 1), extra('2026-10-15', 2), extra('2026-10-15', 3)]);
    const opened: KidState = { ...d.kid, lastChestDate: '2026-10-16', meter: { ...d.kid.meter, owed: 0 } };
    const next = fillMeter(opened, first('2026-10-16', 4));
    expect(next.fill).toMatchObject({ counted: true, chests: 1 });
    expect(next.kid.meter.chestsToday).toBe(1);
  });
  it('the marker still holds for a meter that has never run (an install updated mid-day)', () => {
    const a = fillMeter({ ...DEFAULT_KID, lastChestDate: '2026-10-15' }, first('2026-10-15', 1));
    expect(a.fill).toMatchObject({ counted: true, chests: 0 });
    expect(a.kid.meter.chestsToday).toBe(1);
  });
  it('a bad or future day, or a bad lesson key, never locks the meter', () => {
    expect(normalizeMeter({ day: 'zzz' }).day).toBe('');
    expect(normalizeMeter({ day: '2026-10-15T00' }).day).toBe('');
    expect(normalizeMeter({ lesson: -5 }).lesson).toBeNull();
    expect(normalizeMeter({ lesson: 1.5 }).lesson).toBeNull();
    expect(normalizeMeter({ lesson: 0 }).lesson).toBeNull();
    const zzz = { ...DEFAULT_KID, meter: normalizeMeter({ day: 'zzz', lesson: 5 }) };
    expect(fillMeter(zzz, first('2026-10-15', 6)).fill.counted).toBe(true);
    // a key from the future (a clock that ran ahead) never stops a later day's lesson
    const ahead = { ...DEFAULT_KID, meter: { ...EMPTY_METER, day: '2026-10-15', chestsToday: 1, lesson: 9_999_999_999_999 } };
    expect(fillMeter(ahead, first('2026-10-16', 10)).fill).toMatchObject({ counted: true, chests: 1 });
    // on the same day the key still decides: a lesson shown again counts once
    expect(fillMeter(ahead, extra('2026-10-15', 10)).fill.counted).toBe(false);
  });
  it('a loaded meter at the cap with a half in it: the half and the new one go to the bank, never more than one meter', () => {
    const kid = { ...DEFAULT_KID, meter: { ...EMPTY_METER, halves: 1, chestsToday: 2, day: '2026-10-15', lesson: 3 }, bank: 1 };
    const r = fillMeter(kid, extra('2026-10-15', 4));
    expect(r.fill).toMatchObject({ counted: true, chests: 0, left: 0, capped: true });
    expect(r.kid.meter.halves).toBe(0);
    expect(r.kid.bank).toBe(2);
    expect(r.kid.meter.halves + (r.kid.bank ?? 0)).toBeLessThanOrEqual(2);
  });
});
