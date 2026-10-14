// 竹林 (spec 2026-10-13 §6): a panda munches, then rolls over; a frog hops on the stepping stones.
import { beadEye, blush, mix } from '../../cel';
import { box } from './draw';

const WHITE = '#f7f4ee';
const WHITE_SH = mix(WHITE, '#7a7398', 0.2);
const BLACK = '#3b3545';
const BLACK_SH = mix(BLACK, '#7a7398', 0.25);
const BAMBOO = '#8cc06a';

/** A panda sitting, holding a bamboo stalk, round where it sits: 90 wide, 96 tall. `chew` opens its mouth a little. */
export const panda = (chew = false) => box(1, 0, 0, (k) =>
  k.ell(-26, -8, 14, 10, BLACK, { shade: BLACK_SH }) + k.ell(26, -8, 14, 10, BLACK, { shade: BLACK_SH }) + // feet
  k.ell(0, -32, 34, 30, WHITE, { shade: WHITE_SH }) +
  k.flat('M-30 -50 Q0 -36 30 -50 Q0 -42 -30 -50 Z', WHITE_SH) +
  // the bamboo it holds, in front of its body
  k.path('M10 -96 L16 -96 L14 -10 L8 -10 Z', BAMBOO, 'M13 -96 L16 -96 L14 -10 L11 -10 Z', { shade: '#6ea352', inner: true }) +
  k.stroke('M8 -70 L16 -70 M9 -42 L15 -42') +
  k.path('M14 -92 C24 -100 34 -98 40 -92 C30 -90 22 -90 14 -92 Z', '#9fd27a', '', { inner: true }) +
  k.ell(-22, -40, 11, 13, BLACK, { shade: BLACK_SH }) + k.ell(20, -50, 11, 11, BLACK, { shade: BLACK_SH }) + // arms
  k.ell(-24, -88, 10, 10, BLACK, { shade: BLACK_SH }) + k.ell(24, -88, 10, 10, BLACK, { shade: BLACK_SH }) + // ears
  k.ell(0, -70, 28, 24, WHITE, { shade: WHITE_SH, k: 0.16 }) +
  `<ellipse cx="-11" cy="-72" rx="8" ry="10" transform="rotate(25 -11 -72)" fill="${BLACK}"/><ellipse cx="11" cy="-72" rx="8" ry="10" transform="rotate(-25 11 -72)" fill="${BLACK}"/>` +
  beadEye(-10, -72, 3.4) + beadEye(10, -72, 3.4) +
  k.ell(0, -61, 4, 3, BLACK, { inner: true, k: 0 }) + blush(-17, -60, 5, 2.6, k.wi * 0.6) + blush(17, -60, 5, 2.6, k.wi * 0.6) +
  (chew ? k.path('M-4 -55 Q0 -50 4 -55 Z', '#8a3d4c', '', { inner: true }) : k.stroke('M-4 -56 Q-2 -53 0 -56 Q2 -53 4 -56')));

const GREEN = '#7cc46a';
const GREEN_SH = mix(GREEN, '#7a7398', 0.32);

/** A frog sitting on a stone, round its feet: 40 wide, 30 tall. */
export const FROG = box(1, 0, 0, (k) =>
  k.ell(-14, -4, 9, 5, GREEN, { shade: GREEN_SH }) + k.ell(14, -4, 9, 5, GREEN, { shade: GREEN_SH }) +
  k.ell(0, -13, 17, 13, GREEN, { shade: GREEN_SH }) + k.ell(0, -9, 10, 6, '#e9f3c8', { inner: true, k: 0.1 }) +
  k.ell(-9, -25, 7, 7, GREEN, { shade: GREEN_SH }) + k.ell(9, -25, 7, 7, GREEN, { shade: GREEN_SH }) +
  beadEye(-9, -25, 3.6) + beadEye(9, -25, 3.6) + blush(-12, -13, 3.5, 2, k.wi * 0.6) + blush(12, -13, 3.5, 2, k.wi * 0.6) +
  k.stroke('M-6 -15 Q0 -11 6 -15'));
