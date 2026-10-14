// 梯田 (spec 2026-10-13 §6): a duck family paddles downstream; a kite dips overhead; a dragonfly.
import { beadEye, mix } from '../../cel';
import { box } from './draw';

const DUCK = '#fbf7ee';
const DUCK_SH = mix(DUCK, '#7a7398', 0.22);
const CHICK = '#ffd85e';
const CHICK_SH = mix(CHICK, '#7a7398', 0.25);
const BILL = '#f39a3a';

const duck = (x: number, s: number, body: string, sh: string) => box(s, -x / s, 0, (k) =>
  k.path('M-24 -4 C-26 -18 -8 -20 6 -14 C14 -24 22 -12 20 -4 C14 4 -18 4 -24 -4 Z', body, 'M20 -4 C14 4 -18 4 -24 -4 C-10 -2 8 -4 18 -10 Z', { shade: sh }) +
  k.ell(-16, -24, 10, 10, body, { shade: sh }) + k.path('M-25 -24 L-36 -21 L-25 -18 Z', BILL, '', { inner: true }) +
  beadEye(-18, -26, 2.4) + k.path('M2 -12 C8 -14 12 -10 10 -6 C6 -6 2 -8 2 -12 Z', sh, '', { inner: true }));

/** A duck and three ducklings in a line on the water, swimming left, round the mother's waterline: 110 wide, 36 tall. */
export const DUCKS = duck(0, 1, DUCK, DUCK_SH) + duck(34, 0.55, CHICK, CHICK_SH) + duck(56, 0.55, CHICK, CHICK_SH) + duck(78, 0.55, CHICK, CHICK_SH) +
  `<path d="M-30 2 q8 -4 16 0 M30 3 q8 -3 14 0 M66 3 q8 -3 14 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;

/** A diamond kite with a ribbon tail and its string down to the lower left, round its tail's end: 60 wide, 86 tall. */
export const KITE = box(1, 0, 0, (k) =>
  k.stroke('M0 -40 C-30 -10 -60 20 -90 70', true, 'opacity=".7"') +
  k.stroke('M0 -40 C8 -30 -4 -20 4 -10 C10 -2 2 4 4 0', false) +
  k.path('M8 -8 L14 -2 L6 -2 Z M-2 -22 L4 -16 L-4 -16 Z', '#ff8fa3', '', { inner: true }) +
  k.path('M0 -86 L26 -60 L0 -36 L-26 -60 Z', '#ff7a59', 'M0 -86 L26 -60 L0 -36 Z', { shade: '#e05a4a' }) +
  k.path('M0 -86 L-26 -60 L0 -60 Z', '#ffd166', '', { inner: true }) + k.stroke('M0 -86 L0 -36 M-26 -60 L26 -60'));

/** A dragonfly hovering, round the point under it: 50 wide. */
export const DRAGONFLY = box(1, 0, 0, (k) => `<g transform="translate(0 -24)">` +
  `<g fill="#e8f6ff" fill-opacity=".8">${k.path('M-2 -2 C-14 -12 -26 -10 -24 -4 C-20 0 -10 0 -2 -2 Z', '#e8f6ff')}${k.path('M-2 2 C-12 8 -22 10 -22 4 C-20 0 -10 0 -2 2 Z', '#e8f6ff')}${k.path('M2 -2 C14 -12 26 -10 24 -4 C20 0 10 0 2 -2 Z', '#e8f6ff')}${k.path('M2 2 C12 8 22 10 22 4 C20 0 10 0 2 2 Z', '#e8f6ff')}</g>` +
  k.path('M-2 -6 L2 -6 L1.4 22 L-1.4 22 Z', '#3f9fd8', '', { shade: '#2f6f9f', inner: true }) + k.ell(0, -8, 4, 3.4, '#3f9fd8', { inner: true, k: 0.1 }) + `</g>`);
