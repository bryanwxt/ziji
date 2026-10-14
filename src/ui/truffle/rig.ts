// src/ui/truffle/rig.ts
import { LINE, LWI, sparkle } from '../cel';
import type { TruffleMood } from './parts';

/** Truffle's face as continuous values (spec 2026-10-04 §4.1): every part springs toward a preset, so expressions blend. */
export type Expression = 'neutral' | 'happy' | 'joy' | 'surprised' | 'curious' | 'grumpy' | 'content' | 'sleepy' | 'proud' | 'embarrassed' | 'determined';
export interface Face {
  lidTop: number; lidBottom: number; lidArc: number; pupil: number;
  browY: number; browAngle: number; browShow: number; browAsym: number;
  smile: number; mouthOpen: number; earL: number; earR: number; blush: number; tilt: number;
}
export const EYE_L = 118;
export const EYE_R = 202;
export const EYE_Y = 118;
/** His eyes (spec 2026-10-13 §7): a taller ellipse; the lids are drawn just past it, so its outline covers their edge. */
export const EYE_RX = 21;
export const EYE_RY = 23;
const LID_RX = EYE_RX + 1.2;
const LID_RY = EYE_RY + 1.2;
/** The eyes' own dark line (the lash, the outline, the brows), a little deeper than his body's line. */
export const EYE_LINE = '#3f3756';
/** Row D's eye line: a lash-weight top (and the closed line), a thin bottom. */
export const EYE_LINE_TOP = 3.5;
export const EYE_LINE_BOTTOM = 1.8;
/** The lilac lid shadow on the white under the top line, and its strength with the line fully on. */
export const SHADE = '#4a3f78';
export const SHADE_ON = 0.17;
/** The iris: big, as in row C, centred in the white (spec 2026-10-13 §7). */
export const IRIS_RX = 15;
export const IRIS_RY = 18;
export const IRIS_Y = EYE_Y;
/** How far the iris travels at full gaze (useRig: gx * GAZE_X across, gy * GAZE_Y down): as far as the big iris can go and
 *  stay inside the white in every direction, so it needs no clip-path (the head still turns and tilts toward what he looks at). */
export const GAZE_X = 3.75;
export const GAZE_Y = 3.5;
/** The eye line, its lid shadow, the white and the iris fade out from lid 0.7 and are gone at 0.86, while the closed line fades in over
 *  the same span (closedOn = 1 − ringOn): no empty outlined eye, no unlined sliver of white, and the eye never vanishes mid-blink. */
export const ringOn = (lidTop: number) => Math.max(0, Math.min(1, (0.86 - lidTop) / 0.16));
/** His blush's strength from the face's blush value: visible at rest, full when he glows (row C). */
export const blushOpacity = (b: number) => Math.sqrt(Math.max(0, Math.min(1, b)));
export const FUR = '#a9a4ab'; // his flat fur, for art drawn outside the body (costumes' bare arms)

const base: Face = { lidTop: 0, lidBottom: 0, lidArc: 0, pupil: 1, browY: 0, browAngle: 0, browShow: 0, browAsym: 0, smile: 0.25, mouthOpen: 0, earL: 0, earR: 0, blush: 0.45, tilt: 0 };
export const PRESETS: Record<Expression, Face> = {
  neutral: { ...base },
  happy: { ...base, lidBottom: 0.28, pupil: 1.2, smile: 1, mouthOpen: 0.3, earL: -6, earR: 6, blush: 0.85 },
  joy: { ...base, lidTop: 1, lidArc: 1, pupil: 1.1, smile: 1, mouthOpen: 0.6, earL: -10, earR: 10, blush: 1 },
  surprised: { ...base, pupil: 0.6, browShow: 1, browY: -9, smile: 0, mouthOpen: 0.62, earL: -12, earR: 12, blush: 0.4 },
  curious: { ...base, pupil: 1.28, browShow: 1, browY: -3, browAsym: 1, smile: 0.05, mouthOpen: 0.18, earL: -4, earR: 24, blush: 0.5, tilt: -6 },
  grumpy: { ...base, lidTop: 0.42, lidBottom: 0.06, pupil: 0.9, browShow: 1, browY: 5, browAngle: 1, smile: -0.6, earL: 18, earR: -18, blush: 0.25 },
  content: { ...base, lidTop: 1, lidArc: 0.7, smile: 0.85, earL: -3, earR: 3, blush: 0.9 },
  sleepy: { ...base, lidTop: 1, lidArc: -0.25, smile: 0.1, earL: 8, earR: -8, blush: 0.5 },
  proud: { ...base, lidTop: 0.5, lidArc: 0.4, browShow: 1, browY: -4, smile: 0.8, earL: -8, earR: 8, blush: 0.6, tilt: 4 },
  embarrassed: { ...base, lidTop: 0.3, lidBottom: 0.3, pupil: 1.1, smile: 0.4, earL: 14, earR: -14, blush: 1, tilt: -5 },
  determined: { ...base, lidTop: 0.3, pupil: 1.15, browShow: 1, browY: 3, browAngle: 0.6, smile: 0.2, earL: -10, earR: 10, blush: 0.5 },
};
/** The moods every screen already passes, as presets (spec §4.1). */
export const MOOD_EXPRESSION: Record<TruffleMood, Expression> = { sulk: 'grumpy', neutral: 'neutral', pleased: 'happy', side: 'curious', content: 'content', wow: 'surprised', cheer: 'joy', sleepy: 'sleepy' };

const INK = LINE;
/** Small marks that come with some expressions (faded in and out with them). Drawn, never emoji. */
export const EXTRAS: Partial<Record<Expression, string>> = {
  curious: `<g transform="translate(236 40)"><rect width="34" height="34" rx="12" fill="#fffdf7" stroke="${INK}" stroke-width="2.4"/><text x="17" y="26" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="24" fill="${INK}">?</text></g>`,
  surprised: `<path d="M70 52 L80 64 M58 70 L72 76 M250 52 L240 64 M262 70 L248 76" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
  sleepy: `<text x="236" y="70" font-family="Nunito" font-weight="900" font-size="26" fill="${INK}">z</text><text x="256" y="48" font-family="Nunito" font-weight="900" font-size="18" fill="${INK}">z</text>`,
  // joy's confetti is outlined four-point sparkles (spec 2026-10-13 §7)
  joy: sparkle(60, 74, 11, '#ffe27a', LWI * 0.7) + sparkle(266, 64, 13, '#ffe27a', LWI * 0.7) + sparkle(276, 112, 7, '#ffffff', LWI * 0.7) + sparkle(46, 116, 7, '#bfe6ff', LWI * 0.7),
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export function clampFace(f: Face): Face {
  return {
    ...f,
    lidTop: clamp(f.lidTop, 0, 1), lidBottom: clamp(f.lidBottom, 0, 1), lidArc: clamp(f.lidArc, -1, 1), pupil: clamp(f.pupil, 0.4, 1.6),
    browShow: clamp(f.browShow, 0, 1), browAsym: clamp(f.browAsym, 0, 1), smile: clamp(f.smile, -1, 1), mouthOpen: clamp(f.mouthOpen, 0, 1),
    blush: clamp(f.blush, 0, 1), tilt: clamp(f.tilt, -8, 8), earL: clamp(f.earL, -30, 30), earR: clamp(f.earR, -30, 30),
  };
}

/** One frame of a damped spring (60 fps): soft, a little bounce, settles in about half a second. */
export function springStep(cur: number, vel: number, target: number, stiffness = 0.16, damping = 0.7): [number, number] {
  const v = (vel + (target - cur) * stiffness) * damping;
  return [cur + v, v];
}

const f2 = (n: number) => +n.toFixed(2);
/** Where a lid line at height y meets the lid ellipse round the eye: its half-width (0 at the top or bottom). */
const halfWidth = (y: number) => LID_RX * Math.sqrt(Math.max(0, 1 - ((y - EYE_Y) / LID_RY) ** 2));
const fullEye = (cx: number) => `M${f2(cx - LID_RX)} ${EYE_Y} A${LID_RX} ${LID_RY} 0 1 1 ${f2(cx + LID_RX)} ${EYE_Y} A${LID_RX} ${LID_RY} 0 1 1 ${f2(cx - LID_RX)} ${EYE_Y}Z`;
/** No lid: an empty path at the eye's centre (a point at 0,0 would stretch his bounding box). */
const none = (cx: number) => `M${cx} ${EYE_Y}Z`;

/** How far the lid has to close before its fur cap is fully its own (it grows from nothing over lid 0 → CAP_IN). */
const CAP_IN = 0.08;
/** The upper lid's geometry: its edge runs from (xl, y) to (xr, y), sagging by `curve` (a quadratic, control at y + curve). */
function upperGeom(cx: number, lidTop: number, lidArc: number) {
  const cl = Math.max(0, (lidTop - 0.86) / 0.14);
  const top = EYE_Y - LID_RY;
  const bottom = EYE_Y + LID_RY;
  // at lid 0 there is no lid (the open eye stays round, row D); its cap eases in over lid 0 → CAP_IN so it never pops in a frame
  const ease = Math.min(1, lidTop / CAP_IN);
  const eT = top + (95 + lidTop * 47 + cl * 6 - top) * ease;
  const curve = (6 - lidTop * 3 - lidArc * 22) * (1 - cl) * ease;
  const y = Math.min(Math.max(eT, top + 0.5), bottom - 0.5);
  const w = halfWidth(y);
  return { cl, eT, curve, y, xl: cx - w, xr: cx + w, active: eT > top, shut: eT >= bottom };
}
function lowerGeom(cx: number, lidBottom: number) {
  const eB = 141 - lidBottom * 20;
  const up = lidBottom * 12;
  const y = Math.min(eB, EYE_Y + LID_RY - 0.5);
  const w = halfWidth(y);
  return { up, y, xl: cx - w, xr: cx + w, active: lidBottom > 0 };
}

/**
 * The upper lid: bows down when relaxed, up into a ^ when happy; fully closed it covers the eye and a curved line remains. The
 * lid is the part of the eye above its edge, bounded by the eye's own ellipse, so it needs no clip-path (spec 2026-10-13 §7):
 * the lid logic (eT, curve, closed) is unchanged.
 */
export function upperLid(cx: number, lidTop: number, lidArc: number) {
  const g = upperGeom(cx, lidTop, lidArc);
  const yy = 127 - lidArc * 3;
  const bend = 4 - lidArc * 18;
  const [xl, xr, y] = [f2(g.xl), f2(g.xr), f2(g.y)];
  const ctl = f2(g.y + g.curve);
  return {
    fill: g.shut ? fullEye(cx) : !g.active ? none(cx) : `M${xl} ${y} A${LID_RX} ${LID_RY} 0 ${g.y > EYE_Y ? 1 : 0} 1 ${xr} ${y} Q${cx} ${ctl} ${xl} ${y}Z`,
    edge: `M${xl} ${y} Q${cx} ${ctl} ${xr} ${y}`,
    closed: `M${cx - 19} ${yy} Q${cx} ${yy + bend} ${cx + 19} ${yy}`,
    closedOn: 1 - ringOn(lidTop), // cross-fades in as the open eye fades out: a line shows in every frame of a blink
  };
}
/** The lower lid rises in the middle: a smile squint (bounded by the eye's ellipse, like the upper lid). */
export function lowerLid(cx: number, lidBottom: number) {
  const g = lowerGeom(cx, lidBottom);
  const [xl, xr, y] = [f2(g.xl), f2(g.xr), f2(g.y)];
  return {
    fill: !g.active ? none(cx) : `M${xl} ${y} A${LID_RX} ${LID_RY} 0 ${g.y < EYE_Y ? 1 : 0} 0 ${xr} ${y} Q${cx} ${f2(g.y - g.up)} ${xl} ${y}Z`,
    edge: `M${xl} ${y} Q${cx} ${f2(g.y - g.up)} ${xr} ${y}`,
  };
}

type Pt = [number, number];
/** How deep the lilac lid shadow falls on the white under the top line (row D). */
const SHADE_DEPTH = 6;
const CONTOUR_N = 60;
const poly = (p: Pt[]) => 'M' + p.map(([x, y]) => `${f2(x)} ${f2(y)}`).join(' L');
/**
 * The eye line (row D, spec 2026-10-13 §7) follows the visible white: its top is the lower of the eye's top and the upper lid's
 * edge, its bottom the higher of the eye's bottom and the lower lid's edge, so it is never drawn over covered eye. Sampled as
 * two open paths that meet at the corners, plus the lilac shadow under the top line; all empty when the eye is shut.
 */
export function eyeContour(cx: number, lidTop: number, lidArc: number, lidBottom: number): { top: string; bottom: string; shade: string } {
  const u = upperGeom(cx, lidTop, lidArc);
  const l = lowerGeom(cx, lidBottom);
  const eTop = (x: number) => EYE_Y - EYE_RY * Math.sqrt(Math.max(0, 1 - ((x - cx) / EYE_RX) ** 2));
  const eBot = (x: number) => 2 * EYE_Y - eTop(x);
  const top = (x: number) => {
    if (u.shut) return Infinity;
    if (!u.active) return eTop(x);
    if (x >= u.xl && x <= u.xr) { const t = (x - u.xl) / (u.xr - u.xl); return Math.max(eTop(x), u.y + 2 * t * (1 - t) * u.curve); }
    return u.y > EYE_Y ? Infinity : eTop(x); // past the lid's ends: covered below the middle, open above it
  };
  const bot = (x: number) => {
    if (!l.active || x < l.xl || x > l.xr) return eBot(x);
    const t = (x - l.xl) / (l.xr - l.xl);
    return Math.min(eBot(x), l.y - 2 * t * (1 - t) * l.up);
  };
  const gap = (x: number) => bot(x) - top(x);
  const xs = Array.from({ length: CONTOUR_N + 1 }, (_, i) => cx - EYE_RX + (2 * EYE_RX * i) / CONTOUR_N);
  const vis = xs.map((x) => gap(x) > 0.2);
  const i0 = vis.indexOf(true);
  const i1 = vis.lastIndexOf(true);
  if (i0 < 0 || i1 - i0 < 2) return { top: none(cx), bottom: none(cx), shade: none(cx) };
  // where the white begins and ends between two samples
  const corner = (out: number, inn: number) => { for (let k = 0; k < 24; k++) { const m = (out + inn) / 2; if (gap(m) > 0.2) inn = m; else out = m; } return inn; };
  const xa = i0 > 0 ? corner(xs[i0 - 1], xs[i0]) : xs[0];
  const xb = i1 < CONTOUR_N ? corner(xs[i1 + 1], xs[i1]) : xs[CONTOUR_N];
  const X = [xa, ...xs.slice(i0, i1 + 1).filter((x) => x > xa && x < xb), xb];
  const T: Pt[] = X.map((x) => [x, top(x)]);
  const B: Pt[] = X.map((x) => [x, bot(x)]);
  // the two lines meet at the corners
  const n = X.length - 1;
  const a: Pt = [xa, (T[0][1] + B[0][1]) / 2];
  const b: Pt = [xb, (T[n][1] + B[n][1]) / 2];
  T[0] = B[0] = a;
  T[n] = B[n] = b;
  const band = T.map(([x, y], i) => [x, Math.min(B[i][1], y + SHADE_DEPTH)] as Pt).reverse();
  return { top: poly(T), bottom: poly(B), shade: poly([...T, ...band]) + 'Z' };
}
/** His small "ω" (spec 2026-10-13 §7): shown while the mouth is shut and not frowning; the open mouth takes over as it opens. */
export const MOUTH_W = 'M160 152 L160 157 M150 160 C153 164 158 164 160 157.5 C162 164 167 164 170 160';
export const mouthW = (smile: number, open: number) => Math.max(0, Math.min(1, 1 - open * 4)) * Math.max(0, Math.min(1, smile * 4));
/** The mouth: corners rise with the smile; it opens into a pink shape. */
export function mouthPath(smile: number, open: number) {
  const cy = 165 - smile * 3;
  const u = 165 + smile * 6;
  const low = u + 2 + open * 16;
  const w = 10 + open * 2;
  return { d: `M${160 - w} ${cy} C${156 - w * 0.2} ${u} ${164 + w * 0.2} ${u} ${160 + w} ${cy} C${164 + w * 0.3} ${low} ${156 - w * 0.3} ${low} ${160 - w} ${cy}Z`, fillOpacity: Math.min(1, open * 3) };
}
/** Brows: lift, angle (grumpy: inner ends down), and one brow raised for curious. */
export function browTransform(side: 'L' | 'R', f: Face): string {
  return side === 'L'
    ? `translate(0 ${f.browY + f.browAsym * 2}) rotate(${f.browAngle * 14} 116 87)`
    : `translate(0 ${f.browY - f.browAsym * 9}) rotate(${-f.browAngle * 14 - f.browAsym * 8} 204 87)`;
}
