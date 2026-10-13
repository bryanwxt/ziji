// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { MOMENTS } from './moments';
import { cropFor, RIVER } from './river';

describe('One River anchors (spec 2026-10-13 §5)', () => {
  it('every world has the paper boat, and its props are its moments', () => {
    for (const w of WORLDS) {
      expect(RIVER[w.id].props.boat, w.id).toBeTruthy();
      expect(Object.keys(RIVER[w.id].props).sort(), w.id).toEqual(MOMENTS[w.id].map((m) => m.prop).sort());
    }
  });
  it("every anchor and tap box is inside the painting's 1000 × 1000, and tap boxes are at least 50 across", () => {
    for (const w of WORLDS) for (const [name, s] of Object.entries(RIVER[w.id].props)) {
      expect(s.x - s.w / 2 >= 0 && s.x + s.w / 2 <= 1000 && s.y - s.h >= 0 && s.y <= 1000, `${w.id}:${name}`).toBe(true);
      expect(Math.min(s.w, s.h), `${w.id}:${name}`).toBeGreaterThanOrEqual(50);
    }
  });
  it('no two tap boxes in a world overlap', () => {
    for (const w of WORLDS) {
      const boxes = Object.entries(RIVER[w.id].props);
      for (const [n1, p] of boxes) for (const [n2, q] of boxes) {
        if (n1 >= n2) continue;
        const apart = p.x + p.w / 2 <= q.x - q.w / 2 || q.x + q.w / 2 <= p.x - p.w / 2 || p.y <= q.y - q.h || q.y <= p.y - p.h;
        expect(apart, `${w.id}: ${n1} × ${n2}`).toBe(true);
      }
    }
  });
  it('the slice crop: landscape shows the bottom full width, portrait the centre-bottom, a phone the centre strip', () => {
    expect(cropFor(1.6)).toEqual({ x0: 0, x1: 1000, y0: 375, y1: 1000 });
    expect(cropFor(0.5)).toEqual({ x0: 250, x1: 750, y0: 0, y1: 1000 });
  });
  it('the moon hangs in the sky (the upper half) and 银河 has its own', () => {
    for (const w of WORLDS) { const m = RIVER[w.id].moon; if (m) expect(m.y, w.id).toBeLessThan(500); }
    expect(RIVER.milkyway.moon).toBeNull();
    expect(RIVER.milkyway.dusk).toBe(0);
  });
});
