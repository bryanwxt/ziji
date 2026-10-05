import type { WorldArt } from './art';
import { cloud, flower, ground, groundShadow, sky, tallGrass, tuft } from './kit/paper';
import { P } from './kit/palette';
import { fencePost, prop } from './kit/props';

const at = { box: { x: 78, y: 412, w: 60, h: 48 }, butterfly: { x: 316, y: 380, w: 44, h: 50 } };

/** 草丛: tall grass at the edges, Truffle's cardboard box (the day's animal hides in it) and a butterfly he chases. */
export const GRASS: WorldArt = {
  prefix: 'gp',
  sky: sky('gp-sky', P.sky, P.paperSky),
  land: [
    cloud(30, 130, 0.9),
    cloud(262, 160, 0.7),
    ground('gp-far', 'M0 268 C70 250 140 256 200 262 C270 270 320 248 360 252', P.far, P.farLow, P.farEdge),
    ground('gp-h1', 'M0 300 C70 280 150 288 230 300 C290 308 330 292 360 294', P.hill1, P.hill1Low, P.hill1Edge),
    tallGrass(26, 352, 1.1, P.leaf1),
    tallGrass(340, 346, 1, P.leaf1),
    fencePost(296, 352),
    ground('gp-h2', 'M0 342 C80 326 180 336 270 344 C318 348 344 338 360 340', P.hill2, P.hill2Low, P.hill2Edge),
    tallGrass(14, 420, 1.2),
    groundShadow('gp-s1', at.box.x, at.box.y + 1, 26),
    prop('box', at.box.x, at.box.y),
    tallGrass(118, 430, 0.7),
    flower(304, 400, P.pink),
    prop('butterfly', at.butterfly.x, at.butterfly.y),
    tallGrass(350, 440, 1.1),
    ground('gp-h3', 'M0 450 C100 438 220 448 320 454 C340 455 352 452 360 453', P.hill3, P.hill3Low, P.hill3Edge),
    flower(24, 444, P.sun),
    flower(42, 456, P.white),
    flower(316, 448, P.pink),
    flower(338, 460, P.lilac),
    tuft(6, 480, P.tuft1, 1.4),
    tuft(200, 480, P.tuft2, 1),
    tuft(354, 480, P.tuft1, 1.3),
  ].join(''),
  props: at,
};
