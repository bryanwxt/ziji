export type SceneKind = 'home' | 'sky' | 'desk' | 'pond' | 'stage' | 'night';

const SWASHES: Record<SceneKind, [string, string]> = {
  home: ['#ffd56a', '#bfe0ff'],
  sky: ['#bfe0ff', '#ffd56a'],
  desk: ['#ffd56a', '#c9efc6'],
  pond: ['#bfe0ff', '#c9efc6'],
  stage: ['#ffd56a', '#ffc6b0'],
  night: ['#fbf6ea', '#fbf6ea'],
};

/** Paper background with two soft brush swashes (a red block for celebrations). */
export function Scene({ kind }: { kind: SceneKind }) {
  const [a, b] = SWASHES[kind];
  return (
    <div class={`scene scene--${kind}`} aria-hidden="true">
      <svg class="scene__swash scene__swash--a" viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M10 80 C110 30 230 50 390 20" stroke={a} stroke-width="54" fill="none" stroke-linecap="round" />
      </svg>
      <svg class="scene__swash scene__swash--b" viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M10 40 C120 90 260 70 390 96" stroke={b} stroke-width="46" fill="none" stroke-linecap="round" />
      </svg>
    </div>
  );
}
