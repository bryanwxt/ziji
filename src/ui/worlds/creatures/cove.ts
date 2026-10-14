// 海湾 (spec 2026-10-13 §6): an X in the sand by the shipwreck — dig it to find a star; a crab scuttles; a parrot on a palm.
import { beadEye, mix } from '../../cel';
import { box } from './draw';

/** The X, painted on the sand, round its centre. */
export const X_ART = box(1, 0, 0, (k) => k.rope('M-14 -14 L14 6 M14 -14 L-14 6', '#e0574a', 6));

const CRAB = '#f07a5a';
const CRAB_SH = mix(CRAB, '#7a7398', 0.3);

/** A crab, round its feet: 44 wide, 28 tall. */
export const CRAB_ART = box(1, 0, 0, (k) =>
  k.stroke('M-12 -6 L-22 0 M-10 -4 L-18 2 M12 -6 L22 0 M10 -4 L18 2', false) +
  k.path('M-20 -18 C-30 -26 -30 -34 -22 -36 C-24 -30 -18 -28 -16 -22 Z', CRAB, '', { inner: true }) +
  k.path('M20 -18 C30 -26 30 -34 22 -36 C24 -30 18 -28 16 -22 Z', CRAB, '', { inner: true }) +
  k.ell(0, -12, 18, 11, CRAB, { shade: CRAB_SH }) +
  k.stroke('M-5 -20 L-6 -27 M5 -20 L6 -27') + beadEye(-6, -29, 2.6) + beadEye(6, -29, 2.6) + k.stroke('M-4 -10 Q0 -7 4 -10'));

const RED = '#ef5d52';
const RED_SH = mix(RED, '#7a7398', 0.32);

/** A parrot perched, facing left, round its feet: 34 wide, 56 tall (its wing in a part of its own, for the flap). */
export const PARROT_BODY = box(1, 0, 0, (k) =>
  k.path('M4 -10 L10 14 L2 6 L-2 16 L-2 -8 Z', '#4fa3e0', '', { inner: true }) + // tail
  k.path('M0 0 C-14 -2 -16 -22 -8 -34 C-2 -44 12 -42 14 -30 C16 -16 12 -2 0 0 Z', RED, 'M14 -30 C16 -16 12 -2 0 0 C8 -8 10 -20 8 -32 Z', { shade: RED_SH }) +
  k.path('M-8 -36 C-16 -36 -18 -26 -12 -22 C-12 -28 -10 -32 -6 -32 Z', '#ffd166', '', { inner: true }) +
  k.ell(-2, -34, 4.6, 4.6, '#fff', { inner: true, k: 0 }) + beadEye(-2, -34, 2.6) + k.stroke('M-4 0 L-4 5 M2 0 L2 5'));
export const PARROT_WING = box(1, 0, 0, (k) => k.path('M2 -26 C12 -24 14 -12 8 -4 C2 -8 0 -16 2 -26 Z', '#4fa3e0', '', { shade: '#3a7fc0', inner: true }));
export const PARROT = PARROT_BODY + `<g data-part="wing">${PARROT_WING}</g>`;

/** The star he digs up. */
export const STAR = box(1, 0, 0, (k) =>
  k.path('M0 -16 L4.6 -6 L15 -5 L7 2 L9.6 13 L0 7 L-9.6 13 L-7 2 L-15 -5 L-4.6 -6 Z', '#ffd45a', 'M0 7 L9.6 13 L7 2 L15 -5 L4.6 -6 L4 -2 L6 3 L4 6 Z', { shade: '#e8ad3a' }));
