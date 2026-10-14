// 灯笼水乡 (spec 2026-10-13 §6): a lotus bud — three taps, then the fourth opens it to show a pearl; a koi leaps; a sky lantern rises.
import { beadEye, mix } from '../../cel';
import { box } from './draw';

const PAD = '#6fae7a';
const PAD_SH = mix(PAD, '#7a7398', 0.3);
const PINK = '#f7a8c4';
const PINK_SH = mix(PINK, '#7a7398', 0.25);

/** A lily pad on the water, round its centre. */
export const PAD_ART = box(1, 0, 0, (k) => k.path('M0 0 C-34 2 -40 -14 -24 -20 C-10 -24 6 -24 22 -20 C38 -14 32 2 0 0 L4 -10 Z', PAD, 'M0 0 C-34 2 -40 -14 -24 -20 C-30 -10 -18 -4 0 -4 Z', { shade: PAD_SH }));

/** The lotus, round its stem's foot on the pad: `open` petals out of 3 opened (a bud at 0), 30 wide, 46 tall. */
export const lotus = (open: number) => box(1, 0, 0, (k) => {
  const spread = Math.min(3, Math.max(0, open));
  const petal = (deg: number, fill: string) => `<g transform="rotate(${deg} 0 -24)">${k.path('M0 -24 C-10 -34 -8 -50 0 -56 C8 -50 10 -34 0 -24 Z', fill, 'M0 -24 C10 -34 8 -50 0 -56 C4 -46 4 -34 0 -24 Z', { shade: PINK_SH })}</g>`;
  return k.stroke('M0 -10 L0 -24', false) +
    (spread ? petal(-18 * spread, PINK) + petal(18 * spread, PINK) : '') +
    (spread >= 2 ? petal(-34 * (spread - 1), '#fbc6d8') + petal(34 * (spread - 1), '#fbc6d8') : '') +
    petal(0, PINK);
});

/** The pearl in an open lotus. */
export const PEARL = box(1, 0, 0, (k) => k.ell(0, -12, 11, 11, '#fdf8f2', { shade: '#e6dbe8' }) + k.ell(-4, -16, 3, 2.4, '#ffffff', { inner: true, k: 0 }));

const KOI = '#ffffff';
const KOI_RED = '#f26b4a';

/** A koi mid-leap, curved, head up-left, round the water under it: 56 long. */
export const KOI_ART = box(1, 0, 0, (k) => `<g transform="translate(0 -30) rotate(-20)">` +
  k.path('M20 0 L36 -10 L34 10 Z', KOI_RED, '', { inner: true }) +
  k.path('M-26 0 C-18 -14 14 -14 22 0 C14 12 -18 12 -26 0 Z', KOI, 'M22 0 C14 12 -18 12 -26 0 C-10 6 10 6 22 0 Z', { shade: mix(KOI, '#7a7398', 0.2) }) +
  k.flat('M-10 -9 C-4 -4 4 -4 8 -8 C2 -12 -6 -12 -10 -9 Z M6 4 C10 6 14 4 16 1 C12 0 8 2 6 4 Z', KOI_RED) +
  k.path('M-2 6 L4 14 L8 6 Z', KOI_RED, '', { inner: true }) + beadEye(-18, -2, 2.2) + `</g>`);

/** A sky lantern (孔明灯) with a little flame, round its bottom: 34 wide, 46 tall. */
export const SKY_LANTERN = box(1, 0, 0, (k) =>
  k.path('M-14 -2 C-20 -20 -18 -40 0 -46 C18 -40 20 -20 14 -2 Z', '#ffcf7a', 'M0 -46 C18 -40 20 -20 14 -2 L6 -2 C10 -18 10 -34 0 -46 Z', { shade: '#f2a65a' }) +
  k.stroke('M-8 -40 C-12 -26 -10 -12 -8 -2 M8 -40 C12 -26 10 -12 8 -2') +
  k.ell(0, 2, 4, 5, '#ff7a45', { inner: true, k: 0 }));

/** The koi at rest: its back just under the water, and a ring where it will leap. */
export const KOI_GLIMPSE = `<g opacity=".75"><ellipse cx="0" cy="-6" rx="20" ry="6" fill="#ffffff"/><path d="M-12 -9 c4 3 10 3 14 0 M6 -4 c3 1 6 0 8 -2" stroke="#f26b4a" stroke-width="4" stroke-linecap="round" fill="none"/></g><ellipse cx="0" cy="-4" rx="30" ry="8" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>`;
