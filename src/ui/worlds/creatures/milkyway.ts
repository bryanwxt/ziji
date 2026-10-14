// 银河 (spec 2026-10-13 §6): magpies fly in and form a bridge over the silver river (鹊桥); a shooting star.
import { beadEye, mix, sparkle } from '../../cel';
import { box } from './draw';

const INKY = '#3b3545';
const INKY_SH = mix(INKY, '#7a7398', 0.25);
const WING = '#4f7fc9';

/** One magpie in flight, facing right, round its middle: 40 long. `up` raises its wings. */
export const magpie = (up = true) => box(1, 0, 0, (k) =>
  k.path('M-16 0 L-30 -4 L-28 4 Z', INKY, '', { inner: true }) +
  (up ? k.path('M-4 -2 C-8 -16 0 -22 6 -18 C4 -12 4 -6 2 -2 Z', WING, '', { shade: mix(WING, '#7a7398', 0.3), inner: true }) : '') +
  k.path('M-16 0 C-14 -8 6 -10 12 -4 C16 0 8 6 -4 6 C-10 6 -16 4 -16 0 Z', INKY, '', { shade: INKY_SH }) +
  k.flat('M-8 2 C-2 4 4 4 8 0 C2 0 -4 0 -8 2 Z', '#f6f0e4') +
  k.ell(12, -6, 6, 5.4, INKY, { shade: INKY_SH, inner: true }) + k.path('M17 -7 L23 -5 L17 -4 Z', '#2a2630', '', { inner: true }) +
  beadEye(13, -7, 1.6) +
  (up ? '' : k.path('M-4 -2 C-6 8 2 14 8 10 C4 6 4 2 2 -2 Z', WING, '', { inner: true })));

/** One magpie perched, facing right, round its feet: its body tipped up, its tail down behind. */
const perched = box(1, 0, 0, (k) => k.stroke('M-2 -6 L-3 0 M3 -6 L3 0') + `<g transform="translate(0 -14) rotate(-28)">${magpie(false)}</g>`);
/** A pair of magpies resting on the rock ledge (they fly into the bridge in their moment), facing each other. */
export const MAGPIE_PAIR = `<g transform="translate(-20 0)">${perched}</g><g transform="translate(20 0) scale(-1 1)">${perched}</g>`;

/** The shooting star at rest: one bright twinkle in the sky. */
export const TWINKLE = sparkle(0, -24, 13, '#fff6c4', 1.4) + sparkle(18, -40, 5, '#ffffff', 1);
/** The shooting star itself: a head and its long tail behind it to the upper right. */
export const SHOOTING = box(1, 0, 0, (k) =>
  `<path d="M0 0 L120 -60" stroke="#fff6c4" stroke-width="6" stroke-linecap="round" opacity=".45"/><path d="M0 0 L70 -35" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".8"/>` + sparkle(0, 0, 12, '#fff6c4', k.wi));
