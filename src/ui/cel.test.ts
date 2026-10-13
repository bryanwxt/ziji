// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { celEllipse, crescent, LINE, mix, shadeOf, sparkle } from './cel';

const points = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)(?= A|Z)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);

describe('light cel kit (spec 2026-10-13 §7)', () => {
  it('mixes colours, and a shadow tone leans toward the blue-violet', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(shadeOf('#ffffff', 1)).toBe('#7a7398');
  });
  it("an ellipse's crescent ends on the ellipse and lies on the side away from the light", () => {
    const d = crescent(0, 0, 20, 10, -4, -2);
    expect(d).toMatch(/^M[-\d.]+ [-\d.]+ A20 10 0 1 [01] [-\d.]+ [-\d.]+ A20 10 0 0 [01] [-\d.]+ [-\d.]+Z$/);
    for (const [x, y] of points(d)) expect((x / 20) ** 2 + (y / 10) ** 2).toBeCloseTo(1, 1);
    // its two ends sit across the lower-right half: their midpoint leans toward the light's offset, the arc away from it
    const [[x1, y1], [x2, y2]] = points(d) as [number, number][];
    expect((x1 + x2) / 2).toBeLessThan(0);
    expect((y1 + y2) / 2).toBeLessThan(0);
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
});
