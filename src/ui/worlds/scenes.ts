/* The journey worlds (spec §15), all in storybook paper (spec 2026-10-04 §2) on one 360×480 canvas: the ground lives at y ≥ 300 and the middle stays calm for the lesson card. Each world borrows a kind of fun, never anyone's characters or art. */
import { WORLDS, type TimeOfDay, type WorldId } from '../../fun/worlds';
import type { WorldArt } from './art';
import { eveningLights, eveningSky } from './evening';
import { YARD } from './yard';
import { SEA } from './sea';
import { SPACE } from './space';
import { PIRATE } from './pirate';
import { BLOCKS } from './blocks';
import { DINO } from './dino';
import { GRASS } from './grass';
import { RACE } from './race';

export const SCENE_VIEWBOX = '0 0 360 480';

/** Every world, in storybook paper. */
export const WORLD_ART: Record<WorldId, WorldArt> = { yard: YARD, grass: GRASS, race: RACE, blocks: BLOCKS, dino: DINO, sea: SEA, space: SPACE, pirate: PIRATE };

/** Each world by day (thumbnails in 松露's room, the arrival card). */
export const SCENES = Object.fromEntries(WORLDS.map((w) => [w.id, WORLD_ART[w.id].sky + WORLD_ART[w.id].land])) as Record<WorldId, string>;

/** A world at a time of day: morning and afternoon share the art; evening swaps the sky and adds its lights. */
export function sceneFor(world: WorldId, time: TimeOfDay): string {
  const a = WORLD_ART[world];
  return time === 'evening' ? eveningSky(world, a.sky) + a.land + eveningLights(world) : a.sky + a.land;
}
