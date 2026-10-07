/** A story painting behind a lesson, softened so the paper card reads first; under it the old world stays as a fallback while a
 *  chapter's painting isn't in yet (a missing file shows nothing). Decorative. */
export function PaintedBackdrop({ scene }: { scene: string }) {
  return <div class="painted-backdrop" data-scene={scene} aria-hidden="true" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}story/bg/${scene}.webp)` }} />;
}
