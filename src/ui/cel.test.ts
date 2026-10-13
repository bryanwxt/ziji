// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { beadEye, blush, celEllipse, crescent, LINE, mix, shadeOf, sparkle } from './cel';

const points = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)(?= A|Z)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);

describe('light cel kit (spec 2026-10-13 §7)', () => {
  it('mixes colours, and a shadow tone leans toward the blue-violet', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(shadeOf('#ffffff', 1)).toBe('#7a7398');
  });
  it("an ellipse's crescent ends on the ellipse, with exact sweep flags", () => {
    const d = crescent(0, 0, 20, 10, -4, -2);
    expect(d).toMatch(/^M[-\d.]+ [-\d.]+ A20 10 0 1 [01] [-\d.]+ [-\d.]+ A20 10 0 0 [01] [-\d.]+ [-\d.]+Z$/);
    for (const [x, y] of points(d)) expect((x / 20) ** 2 + (y / 10) ** 2).toBeCloseTo(1, 1);
    expect(d).toBe('M12 -8 A20 10 0 1 1 -16 6 A20 10 0 0 0 12 -8Z');
  });
  // On a circle (r = 10) find the middle of each arc from its flags, so a flipped sweep puts the shadow on the wrong side.
  describe.each([
    ['up-left light', -4, -2],
    ['light from the left (dy = 0)', -4, 0],
    ['light from above (dx = 0)', 0, -4],
    ['light from the lower right (positive dx, dy)', 4, 2],
  ])('crescent on a circle, %s', (_name, dx, dy) => {
    const r = 10;
    const d = crescent(0, 0, r, r, dx, dy);
    const arcs = [...d.matchAll(/A\S+ \S+ 0 ([01]) ([01]) /g)].map((m) => ({ large: m[1] === '1', sweep: m[2] === '1' }));
    const [p0, p1] = points(d);
    const mid = (from: readonly [number, number], to: readonly [number, number], large: boolean, sweep: boolean, [cx, cy]: readonly [number, number]) => {
      const a0 = Math.atan2(from[1] - cy, from[0] - cx);
      const a1 = Math.atan2(to[1] - cy, to[0] - cx);
      let span = sweep ? a1 - a0 : a0 - a1;
      span = ((span % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (large !== span > Math.PI) span = 2 * Math.PI - span;
      const am = a0 + (sweep ? 1 : -1) * (span / 2);
      return [cx + r * Math.cos(am), cy + r * Math.sin(am)] as const;
    };
    it('the outer arc bulges away from the light, onto the lower right', () => {
      const [mx, my] = mid(p0, p1, arcs[0].large, arcs[0].sweep, [0, 0]);
      expect(mx * dx + my * dy).toBeLessThan(0); // opposite the light's offset
      expect(Math.hypot(mx, my)).toBeCloseTo(r, 1);
    });
    it("the inner arc is the lit shape's own edge, centred on the offset", () => {
      const [mx, my] = mid(p1, p0, arcs[1].large, arcs[1].sweep, [dx, dy]);
      expect(Math.hypot(mx - dx, my - dy)).toBeCloseTo(r, 1);
      expect(mx * dx + my * dy).toBeLessThan(0);
    });
  });
  it('no shift, no shadow; a cel ellipse is fill, shadow, then outline, with no clip-path or gradient', () => {
    expect(crescent(0, 0, 10, 10, 0, 0)).toBe('');
    const e = celEllipse(10, 10, 8, 6, '#a9a4ab');
    expect(e.indexOf('fill="#a9a4ab"')).toBeLessThan(e.indexOf(`stroke="${LINE}"`));
    expect(e).not.toMatch(/clip|Gradient|NaN/);
  });
  it('a sparkle is an outlined four-point star', () => {
    expect(sparkle(0, 0, 10)).toMatch(/^<path d="M0 -10 Q.*Z" fill="#ffe27a" stroke="#706889"/);
  });
  it('beadEye and blush are flat and drawn without a clip-path or gradient', () => {
    const eye = beadEye(10, 10);
    expect(eye).not.toMatch(/clip|Gradient|NaN/);
    expect(eye.match(/<ellipse/g)).toHaveLength(4);
    const b = blush(10, 10, 6, 4);
    expect(b).not.toMatch(/clip|Gradient|NaN/);
    expect(b).toContain('stroke="#e2707c"');
  });
});
