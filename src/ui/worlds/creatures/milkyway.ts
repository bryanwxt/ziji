// 银河 (spec 2026-10-13 §6): magpies fly in and form a bridge over the silver river (鹊桥); a shooting star.
import { beadEye, mix, sparkle } from '../../cel';
import { box } from './draw';

const INKY = '#3b3545';
const INKY_SH = mix(INKY, '#7a7398', 0.25);
const WING = '#4f7fc9';

const RIM = '#e4eaff';
/** A pale rim round a dark shape, so a magpie reads against the night rock and sea. */
const rim = (d: string) => `<path d="${d}" fill="${RIM}" stroke="${RIM}" stroke-width="4" stroke-linejoin="round" opacity=".75"/>`;
const WHITE = '#f8f4ea';

/** One magpie in flight, facing right, round its middle: 40 long. `up` raises its wings. Light belly, a white patch in each wing, a pale rim. */
export const magpie = (up = true) => box(1, 0, 0, (k) =>
  `<ellipse cx="-4" cy="-2" rx="30" ry="15" fill="#cfe0ff" opacity=".2"/>` +
  rim('M-16 0 L-30 -4 L-28 4 Z M-16 0 C-14 -8 6 -10 12 -4 C16 0 8 6 -4 6 C-10 6 -16 4 -16 0 Z M6 -11 a8 7 0 1 0 12 0 a8 7 0 1 0 -12 0') +
  k.path('M-16 0 L-30 -4 L-28 4 Z', INKY, '', { inner: true }) +
  (up ? k.path('M-4 -2 C-8 -16 0 -22 6 -18 C4 -12 4 -6 2 -2 Z', WING, '', { shade: mix(WING, '#7a7398', 0.3), inner: true }) + k.flat('M-2 -10 C0 -15 3 -16 4 -14 C2 -12 1 -10 -2 -10 Z', WHITE) : '') +
  k.path('M-16 0 C-14 -8 6 -10 12 -4 C16 0 8 6 -4 6 C-10 6 -16 4 -16 0 Z', INKY, '', { shade: INKY_SH }) +
  k.flat('M-10 1 C-3 5 6 4 10 -1 C4 -2 -4 -2 -10 1 Z', WHITE) +
  k.ell(12, -6, 6, 5.4, INKY, { shade: INKY_SH, inner: true }) + k.path('M17 -7 L23 -5 L17 -4 Z', '#2a2630', '', { inner: true }) +
  beadEye(13, -7, 1.6) +
  (up ? '' : k.path('M-4 -2 C-6 8 2 14 8 10 C4 6 4 2 2 -2 Z', WING, '', { inner: true }) + k.flat('M-1 4 C1 8 4 9 5 7 C3 6 2 4 -1 4 Z', WHITE)));

/** One magpie perched, facing right, round its feet: tail back and down, wing folded, light belly, a pale rim. 40 wide, 36 tall. */
const perched = box(1, 0, 0, (k) =>
  `<ellipse cx="-4" cy="-16" rx="26" ry="20" fill="#cfe0ff" opacity=".2"/>` +
  rim('M-6 -12 L-27 3 L-23 8 L-2 -4 Z M-10 -10 C-8 -26 8 -30 12 -20 C14 -12 8 -4 -2 -4 C-8 -4 -11 -7 -10 -10 Z M4 -26 a7 6.4 0 1 0 14 0 a7 6.4 0 1 0 -14 0') +
  k.stroke('M-2 -6 L-3 0 M3 -6 L3 0') +
  k.path('M-6 -12 L-27 3 L-23 8 L-2 -4 Z', INKY, '', { inner: true }) +
  k.path('M-10 -10 C-8 -26 8 -30 12 -20 C14 -12 8 -4 -2 -4 C-8 -4 -11 -7 -10 -10 Z', INKY, '', { shade: INKY_SH, inner: true }) +
  k.flat('M0 -5 C6 -7 11 -13 11 -19 C13 -12 10 -5 0 -5 Z', WHITE) +
  k.path('M-9 -12 C-6 -25 4 -24 6 -18 C2 -14 -4 -10 -9 -12 Z', WING, '', { shade: mix(WING, '#7a7398', 0.3), inner: true }) +
  k.flat('M-3 -20 C0 -22 3 -21 4 -19 C1 -19 -1 -18 -3 -20 Z', WHITE) +
  k.ell(11, -26, 6, 5.4, INKY, { shade: INKY_SH, inner: true }) + k.path('M16 -27 L22 -25 L16 -23 Z', '#2a2630', '', { inner: true }) +
  beadEye(12.5, -27, 1.6));
/** A pair of magpies resting on the rock ledge (they fly into the bridge in their moment), facing each other. */
export const MAGPIE_PAIR = `<g transform="scale(1.3)"><g transform="translate(-22 0)">${perched}</g><g transform="translate(22 0) scale(-1 1)">${perched}</g></g>`;

/** The shooting star at rest: one bright twinkle in the sky. */
export const TWINKLE = sparkle(0, -24, 13, '#fff6c4', 1.4) + sparkle(18, -40, 5, '#ffffff', 1);
/** The shooting star itself: a head and its long tail behind it to the upper right. */
export const SHOOTING = box(1, 0, 0, (k) =>
  `<path d="M0 0 L120 -60" stroke="#fff6c4" stroke-width="6" stroke-linecap="round" opacity=".45"/><path d="M0 0 L70 -35" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".8"/>` + sparkle(0, 0, 12, '#fff6c4', k.wi));
