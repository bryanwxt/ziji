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

/** Each world's lights (spec 2026-10-13 §6), placed by eye on its painting; each world's task fills in its own. */
const LIGHTS: Record<WorldId, (w: WorldId) => string> = {
  home: () => '', rainforest: () => '', bamboo: () => '', terraces: () => '', dino: () => '', lantern: () => '', cove: () => '', milkyway: () => '',
};
/** The boat's lantern glows in every world. */
const boatGlow = (w: WorldId) => { const b = RIVER[w].props.boat!; return `<g data-part="boat-lantern">${glow(`${w}-boat`, b.x + 34, b.y - 46, 40, '#ffb86b', 0.8)}</g>`; };

/** What evening adds over the painting. */
export function eveningOver(world: WorldId): string {
  const r = RIVER[world];
  const tint = r.dusk > 0 ? `<rect data-part="dusk" width="1000" height="1000" fill="${DUSK}" opacity="${r.dusk}" style="mix-blend-mode:multiply"/>` : '';
  return tint + (r.moon ? moon(world, r.moon.x, r.moon.y) : '') + `<g data-part="lights">${LIGHTS[world](world)}${boatGlow(world)}</g>`;
}
