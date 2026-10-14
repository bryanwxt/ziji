import type { TimeOfDay, WorldId } from '../../fun/worlds';
import { SCENE_VIEWBOX, sceneFor } from './scene';

/** The world's painting behind Home and the lessons, at its time of day, with its creatures and things. Decorative. */
export function WorldScene({ world, time }: { world: WorldId; time: TimeOfDay }) {
  return (
    <div class="world-scene" data-world={world} data-time={time} aria-hidden="true">
      <svg viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: sceneFor(world, time) }} />
    </div>
  );
}
