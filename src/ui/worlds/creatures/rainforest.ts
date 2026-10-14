// 雨林 (spec 2026-10-13 §6): a hornbill flies between the trees; a monkey swings under the walkway; a butterfly.
import { beadEye, blush, mix } from '../../cel';
import { box } from './draw';

const INKY = '#3b3545';
const INKY_SH = mix(INKY, '#7a7398', 0.3);

/** A hornbill perched, facing left, round its feet: 70 long, 56 tall. */
export const HORNBILL = box(1, 0, 0, (k) =>
  k.path('M16 -18 L44 -4 L40 2 L12 -10 Z', INKY, '', { shade: INKY_SH }) + // tail
  k.path('M-16 -22 C-16 -40 14 -42 22 -22 C26 -10 14 0 0 0 C-12 0 -16 -10 -16 -22 Z', INKY, 'M22 -22 C26 -10 14 0 0 0 C10 -6 16 -14 14 -26 Z', { shade: INKY_SH }) +
  k.path('M-12 -14 C-8 -4 4 -2 10 -6 C2 -12 -6 -16 -12 -14 Z', '#f6f0e4', '', { inner: true }) +
  k.ell(-14, -36, 11, 10, INKY, { shade: INKY_SH }) +
  // the big curved beak with its casque
  k.path('M-22 -40 C-34 -42 -46 -34 -52 -22 C-42 -28 -32 -30 -22 -30 Z', '#f6c445', 'M-52 -22 C-42 -28 -32 -30 -22 -30 L-24 -34 C-34 -33 -44 -29 -52 -22 Z', { shade: '#e09a3a' }) +
  k.path('M-20 -42 C-28 -50 -40 -48 -46 -40 C-38 -42 -28 -42 -22 -38 Z', '#ef7b45', '', { inner: true }) +
  k.ell(-12, -38, 4.2, 4.2, '#f6f0e4', { inner: true, k: 0 }) + beadEye(-12, -38, 2.6) +
  k.stroke('M-4 0 L-6 5 M4 0 L4 5'));

/** The hornbill in flight (for its moment): wings out. */
export const HORNBILL_FLY = box(1, 0, 0, (k) =>
  k.path('M-10 -30 C-20 -60 10 -66 30 -50 C14 -46 4 -38 -2 -28 Z', INKY, '', { shade: INKY_SH }) +
  k.path('M6 -26 C30 -14 50 -26 60 -40 C46 -36 26 -34 10 -34 Z', INKY, '', { shade: INKY_SH }) + HORNBILL);

const FUR = '#a8744c';
const FUR_SH = mix(FUR, '#7a7398', 0.38);
const FACE = '#f3d7b4';

/** A monkey hanging by one arm from the walkway, round its feet: 46 wide, 92 from its hand to its feet. */
export const MONKEY = box(1, 0, 0, (k) =>
  k.rope('M12 -22 C34 -22 40 -4 30 4 C24 10 28 16 36 14', FUR, 4) + // tail
  k.path('M-4 -92 C-2 -80 4 -70 6 -60 L-2 -58 C-6 -70 -10 -80 -12 -90 Z', FUR, '', { shade: FUR_SH }) + // the arm up to the walkway
  k.ell(-8, -94, 6, 5, FACE, { inner: true }) +
  k.ell(0, -26, 16, 22, FUR, { shade: FUR_SH }) + k.ell(0, -22, 9, 13, FACE, { inner: true }) +
  k.rope('M-10 -10 C-14 -4 -12 0 -8 0 M10 -10 C14 -4 12 0 8 0', FUR, 5) + // legs
  k.ell(-21, -60, 7, 7, FUR, { shade: FUR_SH }) + k.ell(21, -60, 7, 7, FUR, { shade: FUR_SH }) +
  k.ell(-21, -60, 3.5, 3.5, FACE, { inner: true, k: 0 }) + k.ell(21, -60, 3.5, 3.5, FACE, { inner: true, k: 0 }) +
  k.ell(0, -56, 18, 16, FUR, { shade: FUR_SH }) +
  k.path('M0 -64 C-6 -70 -15 -64 -12 -56 C-15 -48 -8 -42 0 -44 C8 -42 15 -48 12 -56 C15 -64 6 -70 0 -64 Z', FACE, '', { inner: true }) +
  beadEye(-6, -57, 3) + beadEye(6, -57, 3) + blush(-11, -49, 3.5, 2, k.wi * 0.6) + blush(11, -49, 3.5, 2, k.wi * 0.6) +
  k.stroke('M-3 -48 Q0 -45 3 -48'));

/** A butterfly with its wings open, round the point under it: 40 wide. */
export const BUTTERFLY = box(1, 0, 0, (k) =>
  `<g transform="translate(0 -26)">` +
  k.path('M0 -2 C-8 -20 -26 -18 -22 -4 C-26 6 -12 12 0 2 Z', '#f59fbf', 'M0 2 C-12 12 -26 6 -22 -4 C-16 2 -8 2 0 -2 Z', { shade: '#d97fa6' }) +
  k.path('M0 -2 C8 -20 26 -18 22 -4 C26 6 12 12 0 2 Z', '#b9a2f0', 'M0 2 C12 12 26 6 22 -4 C18 2 8 2 0 -2 Z', { shade: '#9a84d6' }) +
  k.ell(-12, -8, 3, 3, '#fff6c4', { inner: true, k: 0 }) + k.ell(12, -8, 3, 3, '#fff6c4', { inner: true, k: 0 }) +
  k.path('M-1.6 -8 L1.6 -8 L1.2 8 L-1.2 8 Z', '#4a4250', '', { inner: true }) + k.stroke('M0 -8 L-5 -16 M0 -8 L5 -16') + `</g>`);
