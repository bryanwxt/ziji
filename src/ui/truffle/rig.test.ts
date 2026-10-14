// src/ui/truffle/rig.test.ts
import { describe, expect, it } from 'vitest';
import { TRUFFLE_MOODS } from './parts';
import { blushOpacity, clampFace, EXTRAS, EYE_RX, EYE_RY, EYE_Y, GAZE_X, GAZE_Y, IRIS_RX, IRIS_RY, IRIS_Y, lowerLid, mouthPath, MOOD_EXPRESSION, PRESETS, ringOn, springStep, upperLid, type Expression } from './rig';
import { paint, REST_POSE } from './useRig';

describe("Truffle's face model (spec 2026-10-04 §4.1)", () => {
  it('has the eleven expressions', () => {
    expect(Object.keys(PRESETS).sort()).toEqual(['content', 'curious', 'determined', 'embarrassed', 'grumpy', 'happy', 'joy', 'neutral', 'proud', 'sleepy', 'surprised']);
  });
  it('every old mood maps onto a preset, so every caller keeps working', () => {
    for (const m of TRUFFLE_MOODS) expect(PRESETS[MOOD_EXPRESSION[m]], m).toBeTruthy();
    expect(MOOD_EXPRESSION.side).toBe('curious'); // after a wrong answer he is curious, never sad
    expect(MOOD_EXPRESSION.cheer).toBe('joy');
  });
  it('keeps every value in range: tilt within ±8°, lids 0–1, smile −1…1', () => {
    const wild = clampFace({ ...PRESETS.neutral, tilt: 30, lidTop: 2, lidBottom: -1, smile: 4, mouthOpen: 3, blush: 9 });
    expect(wild.tilt).toBe(8);
    expect([wild.lidTop, wild.lidBottom, wild.smile, wild.mouthOpen, wild.blush]).toEqual([1, 0, 1, 1, 1]);
    for (const [name, f] of Object.entries(PRESETS)) expect(clampFace(f), name).toEqual(f);
  });
  it('a spring settles on its target without overshooting wildly', () => {
    let [x, v] = [0, 0];
    let peak = 0;
    for (let i = 0; i < 120; i++) { [x, v] = springStep(x, v, 1); peak = Math.max(peak, x); }
    expect(x).toBeCloseTo(1, 3);
    expect(peak).toBeLessThan(1.25);
  });
  it('a fully closed upper lid covers the eye and shows only the closed line', () => {
    const open = upperLid(118, 0, 0);
    expect(open.edgeOn).toBe(false);
    expect(open.closedOn).toBe(0);
    const shut = upperLid(118, 1, 1);
    expect(shut.closedOn).toBe(1);
    expect(shut.fill).toMatch(/^M95\.8 118 A22\.2 24\.2 0 1 1 140\.2 118 A/); // shut, the lid is the whole eye
    expect(shut.closed).toMatch(/^M99 /); // a ^ line across the eye
  });
  it('the lids stay inside the eye (no clip-path, spec 2026-10-13 §7): every point of a lid edge is on or in the eye', () => {
    for (const lidTop of [0, 0.2, 0.42, 0.5, 0.7, 0.86, 0.95]) for (const arc of [-0.25, 0, 0.4, 1]) {
      const pts = [...upperLid(118, lidTop, arc).edge.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      const [[x0, y0], , [x1, y1]] = pts as [number, number][];
      for (const [x, y] of [[x0, y0], [x1, y1]] as [number, number][]) expect(((x - 118) / 22.2) ** 2 + ((y - 118) / 24.2) ** 2, `${lidTop} ${arc}`).toBeLessThanOrEqual(1.001);
    }
  });
  it('a happy lower lid rises in the middle (a smile squint)', () => {
    const l = lowerLid(118, 0.5);
    expect(l.edgeOn).toBe(true);
    expect(l.fill).toContain('Q118 ');
  });
  it('the mouth only fills when it opens', () => {
    expect(mouthPath(1, 0).fillOpacity).toBe(0);
    expect(mouthPath(1, 0.6).fillOpacity).toBe(1);
  });
  it('curious shows a question mark, sleepy shows zz, and none of the marks is an emoji', () => {
    expect(EXTRAS.curious).toContain('?');
    expect(EXTRAS.sleepy).toContain('z');
    for (const e of Object.values(EXTRAS)) expect(e).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it('the presets read as their names: joy closes the eyes into ^, surprised shrinks the pupils, grumpy frowns', () => {
    const p = (e: Expression) => PRESETS[e];
    expect(p('joy').lidTop).toBe(1);
    expect(p('joy').lidArc).toBeGreaterThan(0.5);
    expect(p('surprised').pupil).toBeLessThan(0.8);
    expect(p('grumpy').smile).toBeLessThan(0);
  });
});
describe('clip-free lids (spec 2026-10-13 §7)', () => {
  it('an open lid draws nothing, and never a point away from the eye (it would stretch his box)', () => {
    for (const d of [lowerLid(118, 0).fill, upperLid(202, 0, 0).fill]) for (const m of d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)) expect(Math.abs(Number(m[1]) - (d.includes('202') ? 202 : 118))).toBeLessThan(30);
    expect(lowerLid(118, 0).fill).toBe('M118 118Z');
  });
});
describe('clip-free iris (spec 2026-10-13 §7)', () => {
  it('at full gaze in all eight directions and at the centre, the iris stays inside the eye white (with a margin)', () => {
    for (const gx of [-1, 0, 1]) for (const gy of [-1, 0, 1]) {
      let worst = 0;
      for (let i = 0; i < 360; i++) {
        const t = (i / 360) * 2 * Math.PI;
        const x = gx * GAZE_X + IRIS_RX * Math.cos(t);
        const y = IRIS_Y - EYE_Y + gy * GAZE_Y + IRIS_RY * Math.sin(t);
        worst = Math.max(worst, (x / EYE_RX) ** 2 + (y / EYE_RY) ** 2);
      }
      expect(worst, `gaze ${gx} ${gy}`).toBeLessThanOrEqual(0.98);
    }
  });
  it("paints the iris at most full gaze: the gaze spring's overshoot (about 1.18) never pushes it out of the eye", () => {
    const attrs: Record<string, string> = {};
    const els = (part: string) => ({ setAttribute: (a: string, v: string) => { attrs[`${part} ${a}`] = v; } }) as unknown as Element;
    for (const [gx, gy] of [[1.18, -1.18], [-1.18, 1.18], [3, 3]] as const) {
      paint(els, PRESETS.neutral, { ...REST_POSE, gx, gy }, {});
      const sx = Math.sign(gx);
      const sy = Math.sign(gy);
      for (const side of ['l', 'r']) expect(attrs[`iris-${side} transform`], `gaze ${gx} ${gy}`).toBe(`translate(${(sx * GAZE_X).toFixed(2)} ${(sy * GAZE_Y).toFixed(2)})`);
    }
    paint(els, PRESETS.neutral, { ...REST_POSE, gx: 0.5, gy: -0.5 }, {});
    expect(attrs['iris-l transform']).toBe(`translate(${(0.5 * GAZE_X).toFixed(2)} ${(-0.5 * GAZE_Y).toFixed(2)})`); // inside ±1 it is unchanged
  });
  it('the eye ring and lash fade out as the lid closes, gone before the lid is shut, so no frame shows an empty outlined eye', () => {
    expect(ringOn(0)).toBe(1);
    expect(ringOn(0.5)).toBe(1); // proud, grumpy keep their outline
    expect(ringOn(0.7)).toBe(1);
    expect(ringOn(0.78)).toBeGreaterThan(0);
    expect(ringOn(0.78)).toBeLessThan(1);
    expect(ringOn(0.86)).toBe(0); // where the closed line takes over
    expect(ringOn(1)).toBe(0);
  });
  it('his blush shows even at rest, and fully when he glows (closer to row C)', () => {
    expect(blushOpacity(PRESETS.neutral.blush)).toBeGreaterThanOrEqual(0.6);
    expect(blushOpacity(1)).toBe(1);
    expect(blushOpacity(0)).toBe(0);
  });
});
