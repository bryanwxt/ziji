// src/ui/truffle/rig.test.ts
import { describe, expect, it } from 'vitest';
import { TRUFFLE_MOODS } from './parts';
import { clampFace, EXTRAS, lowerLid, mouthPath, MOOD_EXPRESSION, PRESETS, springStep, upperLid, type Expression } from './rig';

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
    expect(Number(/L144 ([\d.]+) Q/.exec(shut.fill)![1])).toBeGreaterThanOrEqual(142); // the lid's lower edge reaches the bottom of the eye (y 140)
    expect(shut.closed).toMatch(/^M99 /); // a ^ line across the eye
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
