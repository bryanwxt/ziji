// Today's stops sit on a path drawn in each world's colours (spec 2026-10-04 §3, phase D): a dirt path in the yard, the road on
// 赛车山, stepping blocks in 方块世界, sand on the beach. Drawn with non-scaling strokes, so it stretches to the row of stops and
// its marks keep their shape. Paper style: no ink outlines, palette colours only.
import type { WorldId } from '../../fun/worlds';
import { P } from './kit/palette';

type Mark = 'dash' | 'stones' | 'blocks' | 'none';
export const WORLD_TRAIL: Record<WorldId, { fill: string; edge: string; mark: Mark; markColour: string }> = {
  yard: { fill: P.dirtEdge, edge: P.dirt, mark: 'stones', markColour: P.dirtLow },
  grass: { fill: P.hill1Edge, edge: P.hill2Low, mark: 'none', markColour: P.hill2 },
  race: { fill: P.stone, edge: P.stoneLow, mark: 'dash', markColour: P.white },
  blocks: { fill: P.hill2, edge: P.hill2Low, mark: 'blocks', markColour: P.woodLight },
  dino: { fill: P.rockWarm, edge: P.rockWarmLow, mark: 'stones', markColour: P.stoneEdge },
  sea: { fill: P.sand, edge: P.sandLow, mark: 'stones', markColour: P.sandEdge },
  space: { fill: P.moonEdge, edge: P.crater, mark: 'stones', markColour: P.moonRockLow },
  pirate: { fill: P.sandEdge, edge: P.sandLow, mark: 'stones', markColour: P.sand },
};

const LINE = 'M-4 15 C12 8 26 21 42 14 S70 7 86 14 S100 17 104 12';
const stroke = (colour: string, width: number, extra = '', cap: 'round' | 'butt' = 'round') => `<path d="${LINE}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="${cap}" vector-effect="non-scaling-stroke"${extra}/>`;

/** The world's path, in a 0 0 100 24 box stretched to the row. */
export function trailSvg(world: WorldId): string {
  const t = WORLD_TRAIL[world];
  const marks: Record<Mark, string> = {
    dash: stroke(t.markColour, 3, ' stroke-dasharray="14 12" data-mark="dash"', 'butt'),
    stones: stroke(t.markColour, 7, ' stroke-dasharray="0 26" data-mark="stones"'),
    blocks: stroke(t.markColour, 18, ' stroke-dasharray="18 14" data-mark="blocks"', 'butt'),
    none: '',
  };
  return stroke(t.edge, 40) + stroke(t.fill, 32) + marks[t.mark];
}
