// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { YARD_PAPER } from './yard';
import { SCENES, timeLayers } from './scenes';

const anchor = (prop: string) => {
  const m = new RegExp(`data-prop="${prop}" transform="translate\\(([\\d.]+) ([\\d.]+)\\)"`).exec(YARD_PAPER);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
};

describe('the paper 后院 (spec 2026-10-04 §2)', () => {
  it('is the yard the app draws', () => expect(SCENES.yard).toBe(YARD_PAPER));
  it("holds Truffle's props: his bowl, his red ball, the birdhouse, the sprinkler", () => {
    for (const p of ['bowl', 'ball', 'birdhouse', 'sprinkler']) expect(anchor(p), p).not.toBeNull();
  });
  it("the sprinkler sits on Home's sprinkler tap target (68, 392), so a tap still sprays it", () => {
    expect(anchor('sprinkler')).toEqual({ x: 68, y: 392 });
  });
  it('the bowl and the ball sit in the ground band every screen shows (y 330–470), clear of the middle', () => {
    for (const p of ['bowl', 'ball']) {
      const a = anchor(p)!;
      expect(a.y, p).toBeGreaterThanOrEqual(330);
      expect(a.y, p).toBeLessThanOrEqual(470);
    }
  });
  it('no live filters and no ink outlines on the world (spec §2, §6)', () => {
    expect(YARD_PAPER).not.toMatch(/<filter|filter=|feDropShadow|feGaussianBlur|feTurbulence/);
    expect(YARD_PAPER).not.toMatch(/stroke="#2a2630"/);
  });
  it('every gradient id is defined once and prefixed, so other scenes on the page never clash', () => {
    const ids = [...YARD_PAPER.matchAll(/id="([^"]+)"/g)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('yp-')).toBe(true);
  });
  it('evening shows in the yard: the evening sky is painted over its own opaque sky, not hidden under it (review I3)', () => {
    const { wash, over } = timeLayers('evening', 'yard');
    const drawn = wash + SCENES.yard + over;
    expect(drawn.lastIndexOf('#dcd9ef')).toBeGreaterThan(drawn.indexOf('url(#yp-sky)')); // the lavender evening sky comes after the yard's day sky
    expect(over).toContain('data-part="moon"');
    expect(over).toMatch(/data-part="dusk"/); // a dusk tint over the whole yard
  });
});
