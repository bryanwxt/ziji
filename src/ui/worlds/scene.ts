// One River's scene (spec 2026-10-13 §5): the painting as one <image> in a 1000 × 1000 box, the evening over it, then the props.
import type { TimeOfDay, WorldId } from '../../fun/worlds';
import { eveningOver } from './evening';
import { propsOf } from './props';

export const SCENE_VIEWBOX = '0 0 1000 1000';

/** The painting (or its 240 px thumbnail) under the app's base path. */
export const paintingHref = (world: WorldId, thumb = false) => `${import.meta.env.BASE_URL}worlds/${world}${thumb ? '-thumb' : ''}.webp`;

/** A world at a time of day: morning and afternoon are the painting as it is; evening tints it and lights it. */
export function sceneFor(world: WorldId, time: TimeOfDay): string {
  return `<image data-part="painting" href="${paintingHref(world)}" width="1000" height="1000" preserveAspectRatio="none"/>` + (time === 'evening' ? eveningOver(world) : '') + propsOf(world);
}
