// Evening on One River (spec 2026-10-13 §5–6): the painting is never swapped. A dusk tint (multiply) at the world's own
// strength, a moon where the sky shows, and the lights that belong in that world, all over the painting and under the props.
import type { WorldId } from '../../fun/worlds';
import { RIVER } from './river';

const DUSK = '#3d3a6b';
const WARM = '#ffcf7a';

/** A soft round light: a radial gradient (never a filter). `id` must be unique on the page. */
export const glow = (id: string, x: number, y: number, r: number, color = WARM, strength = 0.7) =>
  `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})"/>`;

const moon = (w: WorldId, x: number, y: number) =>
  `<g data-part="moon">${glow(`${w}-moon`, x, y, 90, '#fff4c8', 0.45)}<circle cx="${x}" cy="${y}" r="34" fill="#fff8e1"/><path d="M${x + 6} ${y - 30} a34 34 0 0 1 0 60 a26 30 0 0 0 0 -60Z" fill="#efe2b8"/></g>`;

/** Fireflies: a dot and its glow; they pulse (CSS, only on Home and never with reduced motion). */
const fireflies = (w: WorldId, pts: [number, number][]) => pts.map(([x, y], i) =>
  `<g data-part="firefly" class="world-anim world-anim--pulse" style="animation-delay:${(i * 0.37).toFixed(2)}s">${glow(`${w}-ff${i}`, x, y, 18, '#e9ff9a', 0.8)}<circle cx="${x}" cy="${y}" r="3.2" fill="#f6ffc4"/></g>`).join('');
/** Warm glows over lit windows or lanterns the painting already has. */
const glows = (w: WorldId, part: string, pts: [number, number, number][]) => pts.map(([x, y, r], i) => `<g data-part="${part}">${glow(`${w}-${part}${i}`, x, y, r)}</g>`).join('');
/** A drawn street lamp, standing at (x, y). */
const lamp = (w: WorldId, i: number, x: number, y: number) =>
  `<g data-part="lamp">${glow(`${w}-lamp${i}`, x, y - 52, 44)}<path d="M${x} ${y} L${x} ${y - 48}" stroke="#706889" stroke-width="3" stroke-linecap="round"/><path d="M${x - 7} ${y - 48} h14 l-3 -8 h-8 Z" fill="#fff4c8" stroke="#706889" stroke-width="1.6" stroke-linejoin="round"/></g>`;


const r1 = (n: number) => +n.toFixed(1);
/** Stars that twinkle (the night sky of 银河). */
const twinkles = (pts: [number, number, number][]) => pts.map(([x, y, r], i) =>
  `<path data-part="star" class="world-anim world-anim--twinkle" style="animation-delay:${(i * 0.53).toFixed(2)}s" d="M${x} ${r1(y - r)} Q${r1(x + r * 0.25)} ${r1(y - r * 0.25)} ${r1(x + r)} ${y} Q${r1(x + r * 0.25)} ${r1(y + r * 0.25)} ${x} ${r1(y + r)} Q${r1(x - r * 0.25)} ${r1(y + r * 0.25)} ${r1(x - r)} ${y} Q${r1(x - r * 0.25)} ${r1(y - r * 0.25)} ${x} ${r1(y - r)}Z" fill="#fffbe0"/>`).join('');

/** Each world's lights (spec 2026-10-13 §6), placed by eye on its painting; each world's task fills in its own. */
const LIGHTS: Record<WorldId, (w: WorldId) => string> = {
  home: (w) => glows(w, 'window', [[230, 380, 60], [400, 440, 60], [930, 330, 70], [920, 520, 60]]) + lamp(w, 1, 440, 650) + lamp(w, 2, 790, 660),
  rainforest: (w) => fireflies(w, [[150, 700], [260, 640], [380, 760], [620, 700], [780, 640], [860, 760], [500, 860], [90, 860]]),
  bamboo: (w) => `<g data-part="moonlight">${glow(`${w}-mist`, 640, 650, 140, '#eaf0ff', 0.5)}</g>` + fireflies(w, [[120, 640], [250, 700], [380, 620], [880, 600], [930, 720], [160, 900]]),
  terraces: (w) => glows(w, 'window', [[200, 395, 50]]) + fireflies(w, [[100, 700], [240, 760], [380, 820], [880, 700], [160, 900], [420, 640]]),
  dino: (w) => `<g data-part="lava">${glow(`${w}-lava`, 855, 300, 110, '#ff6a3a', 0.75)}${glow(`${w}-lava2`, 855, 360, 150, '#ffb86b', 0.35)}<path d="M846 298 q-6 20 2 40 M864 300 q8 18 0 36" stroke="#ff8a4a" stroke-width="4" stroke-linecap="round" fill="none"/></g>`,
  lantern: (w) => glows(w, 'lantern', [[40, 530, 50], [125, 515, 46], [310, 515, 36], [345, 512, 32], [380, 500, 30], [660, 500, 30], [760, 515, 40], [830, 520, 44], [885, 520, 44], [820, 390, 36], [870, 380, 36]]),
  cove: (w) => `<g data-part="beam">${glow(`${w}-lamp`, 845, 285, 70, '#fff1b8', 0.9)}<path class="world-anim world-anim--sweep" d="M845 285 L340 200 L340 330 Z" fill="#fff1b8" opacity=".28"/></g>`,
  milkyway: () => twinkles([[80, 70, 12], [910, 110, 13], [510, 260, 10], [650, 650, 9], [920, 690, 9], [610, 845, 10], [970, 965, 11], [312, 640, 10], [200, 140, 7]]),
};
/** The boat's lantern glows in every world. */
const boatGlow = (w: WorldId) => { const b = RIVER[w].props.boat!; return `<g data-part="boat-lantern">${glow(`${w}-boat`, b.x + 34, b.y - 46, 40, '#ffb86b', 0.8)}</g>`; };

/** What evening adds over the painting. */
export function eveningOver(world: WorldId): string {
  const r = RIVER[world];
  const tint = r.dusk > 0 ? `<rect data-part="dusk" width="1000" height="1000" fill="${DUSK}" opacity="${r.dusk}" style="mix-blend-mode:multiply"/>` : '';
  return tint + (r.moon ? moon(world, r.moon.x, r.moon.y) : '') + `<g data-part="lights">${LIGHTS[world](world)}${boatGlow(world)}</g>`;
}
