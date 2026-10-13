// One River (spec 2026-10-13 §3, §5): each world is a square painting in a 1000 × 1000 box, and everything drawn on it is placed
// in that box. Every anchor was placed by eye on the painting and checked in WebKit at iPad landscape, iPad portrait and phone.
import type { WorldId } from '../../fun/worlds';

/** A prop's place: (x, y) is where it stands on the painting; its tap box is w wide, centred on x, and h tall above y. */
export interface PropSpot { x: number; y: number; w: number; h: number }

export interface RiverWorld {
  props: Record<string, PropSpot>;
  /** evening: the dusk tint's strength over the painting (multiply); 0 = none */
  dusk: number;
  /** evening: where the moon hangs in this painting's sky; null when the sky doesn't show or the painting has its own */
  moon: { x: number; y: number } | null;
}

export const RIVER: Record<WorldId, RiverWorld> = {
  home: {
    props: { boat: { x: 690, y: 880, w: 120, h: 90 } },
    dusk: 0.36,
    moon: { x: 640, y: 420 },
  },
  rainforest: {
    props: { boat: { x: 690, y: 930, w: 120, h: 90 } },
    dusk: 0.36,
    moon: { x: 520, y: 380 },
  },
  bamboo: {
    props: { boat: { x: 800, y: 770, w: 120, h: 90 } },
    dusk: 0.34,
    moon: { x: 640, y: 380 },
  },
  terraces: {
    props: { boat: { x: 640, y: 950, w: 120, h: 90 } },
    dusk: 0.36,
    moon: { x: 620, y: 360 },
  },
  dino: {
    props: { boat: { x: 720, y: 870, w: 120, h: 90 } },
    dusk: 0.34,
    moon: { x: 380, y: 260 },
  },
  lantern: {
    props: { boat: { x: 640, y: 880, w: 120, h: 90 } },
    dusk: 0.28,
    moon: { x: 560, y: 300 },
  },
  cove: {
    props: { boat: { x: 680, y: 900, w: 120, h: 90 } },
    dusk: 0.22,
    moon: { x: 560, y: 260 },
  },
  milkyway: {
    props: { boat: { x: 640, y: 900, w: 120, h: 90 } },
    dusk: 0,
    moon: null,
  },
};

/** The part of the painting a box of this shape (width ÷ height) shows, with preserveAspectRatio="xMidYMax slice". */
export function cropFor(aspect: number): { x0: number; x1: number; y0: number; y1: number } {
  if (aspect >= 1) return { x0: 0, x1: 1000, y0: 1000 - 1000 / aspect, y1: 1000 };
  return { x0: 500 - 500 * aspect, x1: 500 + 500 * aspect, y0: 0, y1: 1000 };
}

/** Home's world box at the three crops (spec §5): iPad Air landscape (the shortest), iPad portrait, and iPhone 15 (the narrowest). */
export const CROPS = { landscape: 1180 / (820 - 84), portrait: 768 / (1024 - 84), phone: 390 / (844 - 72) } as const;

/** A tap box wholly inside a crop. */
export const inCrop = (s: PropSpot, c: ReturnType<typeof cropFor>) => s.x - s.w / 2 >= c.x0 && s.x + s.w / 2 <= c.x1 && s.y - s.h >= c.y0 && s.y <= c.y1;
