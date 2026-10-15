// The v3 costumes (rewards spec 2026-10-15 §5.1): each changes his whole silhouette, has one dominant colour, carries one thing
// a child knows it by, in light cel, with its held props in the paw slots. Each family file adds its entries here (Tasks 8–11).
import { RIVER_ONESIES } from './onesiesRiver';
import type { CostumeLayer } from './costumes';

export const V3: Record<string, () => CostumeLayer> = { ...RIVER_ONESIES };
