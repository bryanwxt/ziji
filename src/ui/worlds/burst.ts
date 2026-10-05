// The celebration's sunburst in the current world's colours (spec 2026-10-04 §3): two ray colours and a glow, from the palette.
import type { WorldId } from '../../fun/worlds';
import { P } from './kit/palette';

export const WORLD_BURST: Record<WorldId, { a: string; b: string; glow: string }> = {
  yard: { a: P.sun, b: P.hill1Edge, glow: P.cream },
  grass: { a: P.hill1Edge, b: P.sun, glow: P.cream },
  race: { a: P.warm, b: P.sun, glow: P.cream },
  blocks: { a: P.hill2Edge, b: P.woodLight, glow: P.cream },
  dino: { a: P.duskLow, b: P.sun, glow: P.cream },
  sea: { a: P.seaEdge, b: P.sandEdge, glow: P.white },
  space: { a: P.lilac, b: P.moonEdge, glow: P.white },
  pirate: { a: P.sand, b: P.seaEdge, glow: P.cream },
};

/** The sunburst's colours as CSS custom properties for the .burst element. */
export function burstStyle(world: WorldId): string {
  const c = WORLD_BURST[world];
  return `--burst-a:${c.a};--burst-b:${c.b};--burst-glow:${c.glow}`;
}
