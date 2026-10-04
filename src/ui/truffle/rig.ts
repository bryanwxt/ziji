// src/ui/truffle/rig.ts
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
export const FUR = '#b8b3b6';

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

const INK = '#2a2630';
/** Small marks that come with some expressions (faded in and out with them). Drawn, never emoji. */
export const EXTRAS: Partial<Record<Expression, string>> = {
  curious: `<g transform="translate(236 40)"><rect width="34" height="34" rx="12" fill="#fffdf7" stroke="${INK}" stroke-width="2.4"/><text x="17" y="26" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="24" fill="${INK}">?</text></g>`,
  surprised: `<path d="M70 52 L80 64 M58 70 L72 76 M250 52 L240 64 M262 70 L248 76" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
  sleepy: `<text x="236" y="70" font-family="Nunito" font-weight="900" font-size="26" fill="${INK}">z</text><text x="256" y="48" font-family="Nunito" font-weight="900" font-size="18" fill="${INK}">z</text>`,
  joy: `<circle cx="44" cy="70" r="5" fill="#7fdc7a"/><rect x="266" y="60" width="9" height="9" rx="2" fill="#ffc94a" transform="rotate(20 270 64)"/><circle cx="282" cy="106" r="4" fill="#ff7f6a"/><rect x="30" y="104" width="8" height="8" rx="2" fill="#7fb8ff" transform="rotate(-15 34 108)"/>`,
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

/** The upper lid: bows down when relaxed, up into a ^ when happy; fully closed it covers the eye and a curved ink line remains. */
export function upperLid(cx: number, lidTop: number, lidArc: number) {
  const cl = Math.max(0, (lidTop - 0.86) / 0.14);
  const eT = 95 + lidTop * 47 + cl * 6;
  const curve = (6 - lidTop * 3 - lidArc * 22) * (1 - cl);
  const yy = 127 - lidArc * 3;
  const bend = 4 - lidArc * 18;
  return {
    fill: `M${cx - 26} 90 L${cx + 26} 90 L${cx + 26} ${eT} Q${cx} ${eT + curve} ${cx - 26} ${eT}Z`,
    edge: `M${cx - 26} ${eT} Q${cx} ${eT + curve} ${cx + 26} ${eT}`,
    edgeOn: lidTop > 0.06 && lidTop < 0.9,
    closed: `M${cx - 19} ${yy} Q${cx} ${yy + bend} ${cx + 19} ${yy}`,
    closedOn: cl,
  };
}
/** The lower lid rises in the middle: a smile squint. */
export function lowerLid(cx: number, lidBottom: number) {
  const eB = 141 - lidBottom * 20;
  const up = lidBottom * 12;
  return { fill: `M${cx - 26} 146 L${cx + 26} 146 L${cx + 26} ${eB} Q${cx} ${eB - up} ${cx - 26} ${eB}Z`, edge: `M${cx - 26} ${eB} Q${cx} ${eB - up} ${cx + 26} ${eB}`, edgeOn: lidBottom > 0.05 };
}
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
