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
    props: { boat: { x: 712, y: 812, w: 80, h: 60 }, otter: { x: 795, y: 822, w: 80, h: 80 }, kingfisher: { x: 930, y: 690, w: 60, h: 50 } }, // the boat and the otter float on the canal (inside the phone crop); the kingfisher is on the shaded strip above the far wall; tight boxes clear 宝箱 on a 1024 iPad
    dusk: 0.36,
    moon: { x: 640, y: 420 },
  },
  rainforest: {
    props: { boat: { x: 700, y: 955, w: 100, h: 90 }, hornbill: { x: 880, y: 560, w: 80, h: 64 }, monkey: { x: 300, y: 470, w: 60, h: 96 }, butterfly: { x: 200, y: 860, w: 60, h: 60 } },
    dusk: 0.36,
    moon: { x: 520, y: 380 },
  },
  bamboo: {
    props: { boat: { x: 862, y: 830, w: 100, h: 90 }, panda: { x: 340, y: 935, w: 100, h: 100 }, frog: { x: 560, y: 820, w: 60, h: 50 } }, // the water inside the phone's crop lies under Home's path row, so the boat stays on the right; the panda sits on the open ground left of the stepping stones, clear of the lesson Truffle and inside the phone crop
    dusk: 0.34,
    moon: { x: 640, y: 380 },
  },
  terraces: {
    props: { boat: { x: 815, y: 940, w: 120, h: 90 }, ducks: { x: 650, y: 835, w: 110, h: 56 }, kite: { x: 300, y: 420, w: 70, h: 96 }, dragonfly: { x: 200, y: 880, w: 60, h: 56 } }, // mid-stream: the water near the bottom is right of the phone's crop
    dusk: 0.36,
    moon: { x: 620, y: 360 },
  },
  dino: {
    props: { boat: { x: 868, y: 945, w: 100, h: 90 }, nest: { x: 300, y: 860, w: 90, h: 70 }, pterosaur: { x: 840, y: 525, w: 120, h: 56 }, volcano: { x: 850, y: 320, w: 120, h: 80 } }, // boat mid-river below the far bank: the water in the phone's crop is under Home's path
    dusk: 0.34,
    moon: { x: 380, y: 260 },
  },
  lantern: {
    props: { boat: { x: 670, y: 880, w: 120, h: 90 }, lotus: { x: 840, y: 900, w: 70, h: 70 }, koi: { x: 735, y: 985, w: 70, h: 60 }, skylantern: { x: 870, y: 640, w: 60, h: 70 } },
    dusk: 0.28,
    moon: { x: 560, y: 300 },
  },
  cove: {
    props: { boat: { x: 845, y: 955, w: 100, h: 90 }, x: { x: 300, y: 870, w: 70, h: 56 }, crab: { x: 390, y: 950, w: 60, h: 50 }, parrot: { x: 115, y: 545, w: 56, h: 66 } },
    dusk: 0.22,
    moon: { x: 560, y: 260 },
  },
  milkyway: {
    props: { boat: { x: 700, y: 950, w: 100, h: 90 }, magpies: { x: 190, y: 770, w: 120, h: 70 }, shootingstar: { x: 880, y: 525, w: 64, h: 52 } },
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
