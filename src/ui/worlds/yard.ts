import { cloud, flower, grad, groundShadow, layer, leafyTree, picketFence, tuft } from './kit/paper';
import { ball, birdhouse, bowl, sprinkler } from './kit/props';

/**
 * 后院 in storybook paper (spec 2026-10-04 §2) on the 360×480 world canvas (ground at y ≥ 300). Detail sits at the edges and
 * in the low ground band; the middle stays calm for the lesson card. The sprinkler is Home's tap target (68, 392).
 */
export const YARD_PAPER = [
  `<defs>${grad('yp-sky', '#a9dcf6', '#f6f1df')}</defs><rect width="360" height="480" fill="url(#yp-sky)"/>`,
  cloud(40, 150, 1),
  cloud(250, 120, 0.8),
  layer('yp-far', 'M0 258 C60 238 120 242 180 252 C240 262 300 238 360 244 V480 H0Z', '#c9e6cf', '#b9dcbf', '#e2f2e3', 'M0 258 C60 238 120 242 180 252 C240 262 300 238 360 244'),
  layer('yp-h1', 'M0 290 C80 262 170 270 250 288 C300 300 340 282 360 284 V480 H0Z', '#b4e28e', '#93cf70', '#d6f0b4', 'M0 290 C80 262 170 270 250 288 C300 300 340 282 360 284'),
  picketFence(214, 284, 9),
  leafyTree(48, 246, 0.85), // low enough that a landscape iPad (which shows the lower half) still sees its crown
  birdhouse(104, 338),
  layer('yp-h2', 'M0 330 C90 310 190 322 280 332 C320 336 345 326 360 328 V480 H0Z', '#97d474', '#72bd55', '#bfe79a', 'M0 330 C90 310 190 322 280 332 C320 336 345 326 360 328'),
  groundShadow('yp-s1', 68, 393, 16),
  sprinkler(68, 392),
  groundShadow('yp-s2', 116, 433, 18),
  bowl(116, 432),
  groundShadow('yp-s3', 262, 445, 12),
  ball(262, 444),
  layer('yp-h3', 'M0 448 C100 436 220 446 320 452 C340 453 352 450 360 451 V480 H0Z', '#6fbd52', '#56a442', '#93d070', 'M0 448 C100 436 220 446 320 452 C340 453 352 450 360 451'),
  flower(22, 440, '#ff8fa3'),
  flower(38, 452, '#fff2f2'),
  flower(330, 444, '#ffd166'),
  flower(344, 456, '#ff8fa3'),
  tuft(6, 480, '#4a9e4a', 1.4),
  tuft(190, 480, '#57ad52', 1),
  tuft(352, 480, '#4a9e4a', 1.3),
].join('');
