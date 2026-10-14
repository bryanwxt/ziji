// 家门口 (spec 2026-10-13 §6): otters pop up in the canal; a kingfisher darts past. The mockup's otter is the reference.
import { blush, beadEye, mix } from '../../cel';
import { box } from './draw';

const BROWN = '#9a7556';
const CREAM = '#f1dfc2';
const BR_SH = mix(BROWN, '#7a7398', 0.38);

/** An otter up to its chest in the water, drawn round its waterline centre: 44 wide, 54 tall. `look` turns its eyes (-1…1). */
export const otter = (look = 0) => box(0.42, 100, 150, (k) =>
  k.ell(62, 38, 11, 11, BROWN) + k.ell(138, 38, 11, 11, BROWN) +
  k.path('M58 150 C58 118 74 90 100 90 C126 90 142 118 142 150 Z', BROWN, 'M120 94 C134 104 142 126 142 150 L126 150 C128 128 124 108 112 98 Z', { shade: BR_SH }) +
  k.path('M76 150 C76 126 86 104 100 104 C114 104 124 126 124 150 Z', CREAM, 'M112 110 C120 120 124 134 124 150 L116 150 C116 134 114 120 106 112 Z', { inner: true }) +
  k.flat('M68 104 Q100 122 132 104 Q100 112 68 104 Z', BR_SH) +
  k.ell(100, 63, 50, 41, BROWN, { shade: BR_SH, k: 0.16 }) +
  k.flat('M62 52 C66 38 80 28 96 26 C82 32 74 42 69 54 Z', mix(BROWN, '#ffffff', 0.25)) +
  k.ell(100, 86, 27, 16, CREAM, { inner: true, k: 0.18 }) +
  beadEye(80 + look * 3, 60, 9) + beadEye(120 + look * 3, 60, 9) +
  blush(66, 80, 9, 5, k.wi * 0.8) + blush(134, 80, 8, 4.5, k.wi * 0.8) +
  k.path('M92 76 C92 71 108 71 108 76 C108 81 102 84 100 84 C98 84 92 81 92 76 Z', '#3a2a30', '', { inner: true }) +
  k.stroke('M100 84 L100 88 M92 90 C95 94 99 94 100 88 C101 94 105 94 108 90') +
  k.stroke('M82 86 L62 83 M82 91 L64 95 M118 86 L138 83 M118 91 L136 95', true, 'opacity=".6"') +
  k.ell(88, 128, 9, 11, BROWN, { shade: BR_SH }) + k.ell(112, 128, 9, 11, BROWN, { shade: BR_SH }) +
  `<path d="M40 150 q14 -7 28 0 M132 150 q14 -7 28 0" fill="none" stroke="#fff" stroke-width="${k.w * 1.1}" stroke-linecap="round" opacity=".85"/>`);

const BLUE = '#3f9fd8';
const ORANGE = '#f28a3c';

/** A kingfisher perched, facing left, drawn round its feet: 46 long, 30 tall. */
export const KINGFISHER = box(1, 0, 0, (k) =>
  k.path('M14 -12 L30 -4 L28 0 L12 -6 Z', '#2f6f9f') + // tail
  k.path('M-14 -14 C-14 -26 4 -28 14 -18 C20 -12 16 -2 4 0 C-8 1 -14 -6 -14 -14 Z', BLUE, 'M14 -18 C20 -12 16 -2 4 0 C10 -4 12 -10 10 -16 Z') +
  k.path('M-12 -10 C-10 -2 2 2 8 -2 C2 -8 -6 -12 -12 -10 Z', ORANGE, '', { inner: true }) +
  k.ell(-10, -20, 9, 8, BLUE, { k: 0.18 }) +
  k.path('M-18 -22 L-36 -19 L-18 -17 Z', '#2a2630', '', { inner: true }) +
  k.flat('M-14 -16 q4 3 8 0 q-4 -1 -8 0 Z', '#ffffff') +
  beadEye(-12, -22, 2.4) +
  k.path('M2 -16 C6 -22 14 -20 14 -14 C10 -12 4 -12 2 -16 Z', '#2f6f9f', '', { inner: true }) +
  k.stroke('M-4 0 L-4 4 M2 0 L2 4'));
