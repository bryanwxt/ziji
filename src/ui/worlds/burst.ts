// The celebration's sunburst in the current world's colours (spec 2026-10-13 §6): two ray colours and a glow, taken by eye from
// each painting's sky and its accent.
import type { WorldId } from '../../fun/worlds';

export const WORLD_BURST: Record<WorldId, { a: string; b: string; glow: string }> = {
  home: { a: '#f6c6d6', b: '#f7d9a0', glow: '#fff4dc' },
  rainforest: { a: '#9fd49a', b: '#f6c6d6', glow: '#f4fbe6' },
  bamboo: { a: '#bfe3c8', b: '#d9c6f0', glow: '#f6f2ff' },
  terraces: { a: '#cde58a', b: '#f7d9a0', glow: '#fffbe6' },
  dino: { a: '#f4b98a', b: '#c9e6d6', glow: '#fff2e0' },
  lantern: { a: '#f7b26a', b: '#e98a8a', glow: '#fff1dc' },
  cove: { a: '#f7b8a0', b: '#c9b6ea', glow: '#fff0ea' },
  milkyway: { a: '#9fb8f0', b: '#cdeee6', glow: '#f2f6ff' },
};

/** The sunburst's colours as CSS custom properties for the .burst element. */
export function burstStyle(world: WorldId): string {
  const c = WORLD_BURST[world];
  return `--burst-a:${c.a};--burst-b:${c.b};--burst-glow:${c.glow}`;
}
