// src/ui/truffle/behaviour.test.ts
import { describe, expect, it } from 'vitest';
import { gazeToward, idleExtras, isDoubleBlink, nextBlinkMs, nextEarFlickMs } from './behaviour';

describe('idle life and the question-calm rule (spec §4.2, §4.3, §4.8)', () => {
  it('blinks every 2–5 s, sometimes twice; flicks an ear every 3–7.5 s', () => {
    expect(nextBlinkMs(() => 0)).toBe(2000);
    expect(nextBlinkMs(() => 0.999)).toBeLessThanOrEqual(5000);
    expect(isDoubleBlink(() => 0.1)).toBe(true);
    expect(isDoubleBlink(() => 0.5)).toBe(false);
    expect(nextEarFlickMs(() => 0)).toBe(3000);
  });
  it('calm: only breathing, blinking and looking at the card', () => {
    expect(idleExtras(true, false)).toEqual({ blink: true, breathe: true, earFlicks: false, tailSwish: false, followPointer: false });
  });
  it('free: everything', () => {
    expect(idleExtras(false, false)).toEqual({ blink: true, breathe: true, earFlicks: true, tailSwish: true, followPointer: true });
  });
  it('reduced motion: no flicks, swishes, breathing or following; blinking stays', () => {
    expect(idleExtras(false, true)).toEqual({ blink: true, breathe: false, earFlicks: false, tailSwish: false, followPointer: false });
  });
  it('looks toward a point, limited to −1…1; with no card he looks ahead (review focus 5)', () => {
    const me = { left: 100, top: 100, width: 100, height: 100, right: 200, bottom: 200, x: 100, y: 100, toJSON() {} } as DOMRect;
    expect(gazeToward(me, { x: 1000, y: 150 })).toEqual({ x: 1, y: expect.any(Number) });
    expect(gazeToward(me, null)).toEqual({ x: 0, y: 0 });
  });
});
