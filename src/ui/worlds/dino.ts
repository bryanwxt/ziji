import type { WorldArt } from './art';
import { cloud, fern, ground, groundShadow, rock, sky, tuft } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { nest: { x: 80, y: 440, w: 56, h: 40 }, leaf: { x: 322, y: 432, w: 56, h: 70 } };

/** 恐龙谷: a smoking volcano far right, ferns at the edges, the egg Truffle guards in its nest, a big leaf umbrella. */
export const DINO: WorldArt = {
  prefix: 'dp',
  sky: sky('dp-sky', P.skyDeep, P.sandEdge),
  land: [
    cloud(30, 140, 0.8),
    ground('dp-far', 'M0 274 C70 258 150 262 220 270 C290 278 330 262 360 264', P.far, P.farLow, P.farEdge),
    prop('volcano', 312, 300),
    ground('dp-h1', 'M0 306 C80 290 160 296 240 304 C300 310 340 298 360 300', P.rockWarm, P.rockWarmLow, P.sandEdge),
    fern(30, 360, 1.1),
    rock(262, 352, 0.9, P.rockWarmLow, P.rockWarm),
    ground('dp-h2', 'M0 352 C90 336 190 346 280 354 C320 358 345 348 360 350', P.hill2, P.hill2Low, P.hill2Edge),
    fern(350, 410, 1.1, true),
    groundShadow('dp-s1', at.nest.x, at.nest.y + 1, 28),
    prop('nest', at.nest.x, at.nest.y),
    groundShadow('dp-s2', at.leaf.x, at.leaf.y + 1, 22),
    prop('leaf', at.leaf.x, at.leaf.y),
    ground('dp-h3', 'M0 456 C100 446 220 454 320 460 C340 461 352 458 360 459', P.hill3, P.hill3Low, P.hill3Edge),
    fern(10, 480, 0.8),
    rock(200, 476, 0.6),
    tuft(352, 480, P.tuft1, 1.3),
  ].join(''),
  props: at,
};
