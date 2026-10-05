/* The journey worlds (spec §15) on one 360×480 canvas: the ground lives at y ≥ 300 and the middle stays calm for the lesson
 * card. Redrawn in storybook paper (spec 2026-10-04 §2) one by one; the rest stay in ink (legacy.ts) until then. */
import { WORLDS, type TimeOfDay, type WorldId } from '../../fun/worlds';
import type { WorldArt } from './art';
import { eveningLights, eveningSky } from './evening';
import { INK, inkLayers } from './legacy';
import { YARD } from './yard';
import { SEA } from './sea';
import { SPACE } from './space';
import { BLOCKS } from './blocks';
import { DINO } from './dino';
import { GRASS } from './grass';
import { RACE } from './race';

export const SCENE_VIEWBOX = '0 0 360 480';

/** The worlds in storybook paper so far. */
export const WORLD_ART: Partial<Record<WorldId, WorldArt>> = { yard: YARD, grass: GRASS, race: RACE, blocks: BLOCKS, dino: DINO, sea: SEA, space: SPACE };

/** Each world by day (thumbnails in 松露's room, the arrival card). */
export const SCENES = Object.fromEntries(WORLDS.map((w) => {
  const a = WORLD_ART[w.id];
  return [w.id, a ? a.sky + a.land : INK[w.id]!];
})) as Record<WorldId, string>;

/** A world at a time of day: morning and afternoon share the art; evening swaps the sky and adds its lights. */
export function sceneFor(world: WorldId, time: TimeOfDay): string {
  const a = WORLD_ART[world];
  if (!a) {
    const { wash, over } = inkLayers(time, world);
    return wash + INK[world]! + over;
  }
  return time === 'evening' ? eveningSky(world, a.sky) + a.land + eveningLights(world) : a.sky + a.land;
}
