import type { WorldArt } from './art';
import { cloud, flower, ground, groundShadow, leafyTree, picketFence, sky, tuft } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { sprinkler: { x: 68, y: 392, w: 60, h: 52 }, bowl: { x: 84, y: 456, w: 44, h: 40 }, ball: { x: 314, y: 446, w: 44, h: 44 }, birdhouse: { x: 88, y: 338, w: 40, h: 50 } };

/** 后院 (spec 2026-10-04 §2): Truffle's bowl, his red ball and the birdhouse he watches; the sprinkler; fence and tree. */
export const YARD: WorldArt = {
  prefix: 'yp',
  sky: sky('yp-sky', P.sky, P.paperSky),
  land: [
    cloud(40, 150, 1),
    cloud(250, 120, 0.8),
    ground('yp-far', 'M0 258 C60 238 120 242 180 252 C240 262 300 238 360 244', P.far, P.farLow, P.farEdge),
    ground('yp-h1', 'M0 290 C80 262 170 270 250 288 C300 300 340 282 360 284', P.hill1, P.hill1Low, P.hill1Edge),
    picketFence(214, 284, 9),
    leafyTree(40, 246, 0.85), // low enough that a landscape iPad (which shows the lower half) still sees its crown
    prop('birdhouse', at.birdhouse.x, at.birdhouse.y),
    ground('yp-h2', 'M0 330 C90 310 190 322 280 332 C320 336 345 326 360 328', P.hill2, P.hill2Low, P.hill2Edge),
    groundShadow('yp-s1', at.sprinkler.x, at.sprinkler.y + 1, 16),
    prop('sprinkler', at.sprinkler.x, at.sprinkler.y),
    groundShadow('yp-s3', at.ball.x, at.ball.y + 1, 12),
    prop('ball', at.ball.x, at.ball.y),
    ground('yp-h3', 'M0 448 C100 436 220 446 320 452 C340 453 352 450 360 451', P.hill3, P.hill3Low, P.hill3Edge),
    groundShadow('yp-s2', at.bowl.x, at.bowl.y + 1, 18),
    prop('bowl', at.bowl.x, at.bowl.y),
    flower(22, 440, P.pink),
    flower(130, 462, P.blush),
    flower(336, 458, P.sun),
    flower(350, 468, P.pink),
    tuft(6, 480, P.tuft1, 1.4),
    tuft(190, 480, P.tuft2, 1),
    tuft(352, 480, P.tuft1, 1.3),
  ].join(''),
  props: at,
};
