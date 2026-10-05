import { describe, expect, it } from 'vitest';
import { getRungs, noteRung } from '../store/repo';
import { openAppDb } from '../store/db';
import { nextRung, startRung } from './ladder';

describe('the context ladder (spec 2026-10-05 §3.2)', () => {
  it('a right answer raises his best rung; it never lowers it', () => {
    expect(nextRung(0, 1, true)).toBe(1);
    expect(nextRung(1, 2, true)).toBe(2);
    expect(nextRung(3, 2, true)).toBe(3);
  });
  it('a miss starts the word one rung lower next time', () => {
    expect(nextRung(3, 3, false)).toBe(2);
    expect(nextRung(2, 1, false)).toBe(0);
    expect(nextRung(1, 3, false)).toBe(1); // a miss above his best leaves it where it was
  });
  it('a revision word starts on the rung after his best, from 字, never past the top (组句, phase B)', () => {
    expect(startRung(0)).toBe(1);
    expect(startRung(2)).toBe(3);
    expect(startRung(3)).toBe(4);
    expect(startRung(4)).toBe(4);
  });
  it('the rung memory is kept per word in the database', async () => {
    const db = await openAppDb(`ladder-${Math.random()}`);
    expect(await noteRung(db, 'b:火', 1, true, new Date(2026, 9, 6))).toBe(1);
    expect(await noteRung(db, 'b:火', 2, true, new Date(2026, 9, 6))).toBe(2);
    expect(await noteRung(db, 'b:水', 1, false, new Date(2026, 9, 6))).toBe(0);
    expect(await getRungs(db)).toEqual(new Map([['b:火', 2], ['b:水', 0]]));
  });
});
