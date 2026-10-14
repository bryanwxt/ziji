// 恐龙谷 (spec 2026-10-13 §6): the egg in a fern nest wobbles and hatches after a lesson; a pterosaur glides; the volcano puffs.
import { beadEye, blush, mix } from '../../cel';
import { box } from './draw';

const TWIG = '#b8844f';
const TWIG_SH = mix(TWIG, '#7a7398', 0.35);
const FERN = '#5fae7a';
const EGG = '#fbf1d8';
const SPOT = '#9fcf90';

/** The nest of twigs and fern fronds, round its foot: 72 wide (the back half; NEST_FRONT goes over the egg). */
export const NEST = box(1, 0, 0, (k) =>
  k.path('M-30 -14 C-44 -24 -50 -34 -46 -40 C-38 -32 -30 -24 -22 -18 Z M30 -14 C44 -24 50 -34 46 -40 C38 -32 30 -24 22 -18 Z', FERN, '', { inner: true }) +
  k.ell(0, -10, 34, 11, TWIG, { shade: TWIG_SH }));
export const NEST_FRONT = box(1, 0, 0, (k) =>
  k.path('M-36 -10 C-30 2 30 2 36 -10 C30 -4 -30 -4 -36 -10 Z', TWIG, '', { shade: TWIG_SH }) +
  k.stroke('M-26 -6 L-14 -2 M-2 -4 L10 -1 M18 -5 L28 -3'));

/** The egg, standing in the nest (round the nest's foot). */
export const EGG_ART = box(1, 0, 0, (k) =>
  k.ell(0, -30, 15, 19, EGG, { shade: mix(EGG, '#7a7398', 0.2) }) +
  k.ell(-5, -36, 3.4, 3, SPOT, { inner: true, k: 0 }) + k.ell(6, -26, 4, 3.4, SPOT, { inner: true, k: 0 }) + k.ell(4, -42, 2.4, 2, SPOT, { inner: true, k: 0 }));

/** The egg in its nest at rest: its egg in a part of its own so the wobble can stand in for it. */
export const NEST_ART = NEST + `<g data-part="egg">${EGG_ART}</g>` + NEST_FRONT;

const DINO = '#9fcf90';
const DINO_SH = mix(DINO, '#7a7398', 0.32);

/** The baby dinosaur, round its feet: 44 wide, 40 tall, facing right, an eggshell cap on its head. */
export const BABY_DINO = box(1, 0, 0, (k) =>
  k.path('M-12 -8 C-22 -8 -30 -4 -34 -10 C-28 -12 -24 -16 -16 -16 Z', DINO, '', { shade: DINO_SH }) + // tail
  k.ell(-2, -12, 14, 12, DINO, { shade: DINO_SH }) + k.ell(0, -9, 8, 7, '#e9f3c8', { inner: true, k: 0.1 }) +
  k.ell(-8, -1, 5, 3, DINO, { shade: DINO_SH, inner: true }) + k.ell(6, -1, 5, 3, DINO, { shade: DINO_SH, inner: true }) +
  k.ell(8, -28, 13, 11, DINO, { shade: DINO_SH }) +
  k.path('M-2 -34 C0 -46 18 -46 20 -34 L16 -36 L12 -32 L8 -37 L4 -32 L0 -36 Z', EGG, '', { inner: true }) +
  beadEye(12, -28, 2.8) + blush(16, -22, 3, 1.8, k.wi * 0.6) + k.stroke('M15 -21 Q18 -19 20 -22'));

const WING = '#c9a2e8';
const WING_SH = mix(WING, '#7a7398', 0.32);

/** A pterosaur gliding, facing left, round the point under its body: 120 wide. */
export const PTEROSAUR = box(1, 0, 0, (k) =>
  k.path('M-6 -30 C-30 -52 -56 -50 -62 -44 C-44 -40 -26 -32 -12 -22 Z', WING, 'M-62 -44 C-44 -40 -26 -32 -12 -22 L-14 -28 C-28 -36 -44 -42 -62 -44 Z', { shade: WING_SH }) +
  k.path('M6 -30 C30 -56 56 -56 62 -48 C44 -42 26 -32 12 -22 Z', WING, 'M62 -48 C44 -42 26 -32 12 -22 L10 -28 C26 -38 44 -46 62 -48 Z', { shade: WING_SH }) +
  k.ell(0, -24, 14, 8, '#f2b98a', { shade: mix('#f2b98a', '#7a7398', 0.3) }) +
  k.path('M-10 -30 C-14 -40 -24 -42 -28 -36 L-46 -32 L-26 -30 C-20 -24 -14 -24 -10 -26 Z', '#f2b98a', '', { inner: true }) +
  k.path('M-20 -40 L-14 -50 L-12 -40 Z', '#ef7b45', '', { inner: true }) + beadEye(-20, -35, 2.4));

/** The volcano's puff (the painting draws the volcano): three cel smoke balls, round the crater. */
export const PUFF = box(1, 0, 0, (k) =>
  k.ell(-10, -14, 14, 12, '#f1ecf4', { shade: '#d6cde3' }) + k.ell(10, -30, 17, 15, '#f1ecf4', { shade: '#d6cde3' }) + k.ell(-4, -52, 12, 10, '#f1ecf4', { shade: '#d6cde3' }));
