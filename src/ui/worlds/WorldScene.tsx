import type { TimeOfDay, WorldId } from '../../fun/worlds';
import { SCENE_VIEWBOX, paintingOf, sceneFor } from './scene';

/** The world's painting behind Home and the lessons, at its time of day, with its creatures and things. Decorative.
 *  `bare` is the painting alone under a pale veil, for the screens that only borrow his world (placement, 字卡, 松露's room, setup). */
export function WorldScene({ world, time, bare = false }: { world: WorldId; time: TimeOfDay; bare?: boolean }) {
  return (
    <div class={`world-scene${bare ? ' world-scene--bare' : ''}`} data-world={world} data-time={time} aria-hidden="true">
      <svg viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: bare ? paintingOf(world, time) : sceneFor(world, time) }} />
      {bare && <div class="world-scene__veil" />}
    </div>
  );
}
