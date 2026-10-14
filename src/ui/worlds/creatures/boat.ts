// The paper boat 纸船 (spec 2026-10-13 §5–6): on the water in every world, drawn round its waterline centre.
import { mix } from '../../cel';
import { box } from './draw';

/** The boat is drawn at this scale of its design box, so its whole hull, sail and lantern pole fit the open water (fix round 0). */
export const BOAT_SCALE = 0.85;
const PAPER = '#fbf5ea';
const FOLD = '#e9dfcf';

/** The paper hull and sail, 96 wide, the sail 52 above the water. */
const HULL = box(BOAT_SCALE, 0, 0, (k) =>
  // the hull: two wings and a flat keel; the sail stands from its middle
  k.path('M-48 -16 L-30 4 L30 4 L48 -16 L22 -16 L0 -52 L-22 -16 Z', PAPER, 'M0 -52 L22 -16 L48 -16 L30 4 L8 4 L14 -14 Z', { shade: mix(PAPER, '#7a7398', 0.22) }) +
  k.stroke('M-22 -16 L-14 4 M22 -16 L14 4 M-22 -16 L22 -16') +
  k.flat('M-4 -40 L-14 -20 L-8 -20 Z', '#ffffff', 'opacity=".8"') +
  `<path d="M-40 -11 L-30 -1" stroke="${FOLD}" stroke-width="2" stroke-linecap="round"/>`);

/** Rings on the water round the boat (always under it). */
export const RIPPLE = `<g transform="scale(${BOAT_SCALE})" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity=".75"><path d="M-62 6 q10 -5 20 0 M44 7 q10 -5 20 0"/><path d="M-34 10 q34 8 68 0" opacity=".6"/></g>`;

/** A little red lantern on a mast at its stern (it glows in the evening: evening.ts). */
const LANTERN = box(BOAT_SCALE, 0, 0, (k) =>
  k.stroke('M34 -15 L34 -40', false) + k.ell(34, -46, 7, 8, '#ff7a59', { k: 0.25 }) + k.flat('M30 -47 a4 4 0 0 1 8 0 Z', '#ffd77a'));

/** The boat with its lantern: 96 wide, 54 tall, round its waterline centre. */
export const BOAT = HULL + LANTERN;
