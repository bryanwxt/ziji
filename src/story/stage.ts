// Where the cast stands in each painting (story polish 2026-10-07): the middle of their feet as a fraction of the painting (x across,
// y down) and their height as a fraction of its height — so Truffle stands on that scene's floor at that scene's size.
export interface Mark { x: number; y: number; h: number }

const DEFAULT: Mark = { x: 0.5, y: 0.92, h: 0.27 };
const MARKS: Record<string, Mark> = {
  'hdb-morning': { x: 0.46, y: 0.92, h: 0.27 }, // the corridor floor, short of the shoe rack
  'hdb-night': { x: 0.6, y: 0.91, h: 0.25 }, // the open plaza, clear of the stone tables
  'hdb-voiddeck': { x: 0.44, y: 0.9, h: 0.25 }, // the empty floor between the plants and the tables
  'hawker-noon': { x: 0.52, y: 0.92, h: 0.25 }, // the tiled aisle
  'market-morning': { x: 0.5, y: 0.92, h: 0.25 }, // the wet-market aisle
  'playground-afternoon': { x: 0.44, y: 0.9, h: 0.25 }, // the paving in front of the fence
  'school-field': { x: 0.6, y: 0.91, h: 0.25 }, // the grass
  'school-garden': { x: 0.5, y: 0.92, h: 0.25 }, // the path between the beds
};

export const markFor = (scene: string | null): Mark => (scene && MARKS[scene]) || DEFAULT;
