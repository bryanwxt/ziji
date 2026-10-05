import type { WorldArt } from './art';
import { ground, groundShadow, layer, rock, seaweed, shell, sky, starfish } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { sub: { x: 66, y: 392, w: 76, h: 48 }, fish: { x: 316, y: 392, w: 44, h: 60 } };
const ray = (x: number, w: number) => `<path d="M${x} 0 L${x + w} 0 L${x + w + 60} 360 L${x + 40} 360Z" fill="${P.white}" opacity=".12"/>`;
const bubble = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${P.foam}" stroke-width="1.6" opacity=".8"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.25}" fill="${P.white}" opacity=".8"/>`;

/** 海底: light water from above, soft rays, rocks and seaweed at the edges, Truffle's mini submarine and a curious fish. */
export const SEA: WorldArt = {
  prefix: 'sp',
  sky: sky('sp-sky', P.seaEdge, P.sea),
  land: [
    ray(40, 30), ray(150, 20), ray(250, 34),
    layer('sp-far', 'M0 300 C40 270 70 286 100 276 C150 260 180 290 230 282 C280 274 310 262 360 280 V480 H0Z', P.seaLow, P.deep, P.seaEdge, 'M0 300 C40 270 70 286 100 276 C150 260 180 290 230 282 C280 274 310 262 360 280'),
    seaweed(22, 380, 110, P.leaf1),
    seaweed(40, 380, 80, P.leaf3),
    seaweed(338, 390, 120, P.leaf1),
    seaweed(352, 390, 84, P.teal),
    ground('sp-sand1', 'M0 372 C80 360 180 368 270 374 C320 378 344 370 360 372', P.sand, P.sandLow, P.sandEdge),
    rock(282, 384, 0.8, P.deepLow, P.seaLow),
    groundShadow('sp-s1', at.sub.x, at.sub.y + 1, 30),
    prop('sub', at.sub.x, at.sub.y),
    prop('fish', at.fish.x, at.fish.y),
    bubble(110, 330, 4), bubble(118, 312, 3), bubble(112, 296, 2.4), bubble(300, 300, 3),
    ground('sp-sand2', 'M0 448 C100 438 220 446 320 452 C340 453 352 450 360 451', P.sandEdge, P.sand, P.white),
    shell(30, 466), starfish(330, 466), shell(352, 472, P.coral),
  ].join(''),
  props: at,
};
