import type { WorldArt } from './art';
import { cloud, flower, ground, groundShadow, layer, sky, tuft } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { kart: { x: 70, y: 418, w: 64, h: 56 }, cone: { x: 314, y: 446, w: 44, h: 40 } };
/** The road's middle line: the kart drives it on a lap (scene units). */
export const RACE_TRACK = 'M-30 470 C60 470 120 440 170 410 C230 374 300 372 330 352 C356 334 350 316 380 306';

/** 赛车山: far peaks, a winding road up the hill to the finish flag, Truffle's go-kart with its paw-print flag, a cone he knocks over. */
export const RACE: WorldArt = {
  prefix: 'rp',
  sky: sky('rp-sky', P.skyDeep, P.paperSky),
  land: [
    cloud(250, 110, 0.8),
    layer('rp-peaks', 'M0 262 L46 206 L80 236 L130 180 L178 240 L220 214 L262 250 L310 196 L360 240 V480 H0Z', P.peak, P.peakLow, P.snow, 'M30 226 L46 206 L60 218 M116 196 L130 180 L144 196 M296 212 L310 196 L324 212'),
    ground('rp-far', 'M0 282 C80 266 160 272 240 280 C300 286 340 272 360 274', P.far, P.farLow, P.farEdge),
    ground('rp-h1', 'M0 320 C80 300 170 306 250 318 C300 326 340 312 360 314', P.hill1, P.hill1Low, P.hill1Edge),
    `<path d="${RACE_TRACK}" fill="none" stroke="${P.stoneLow}" stroke-width="30" stroke-linecap="round" transform="translate(0 3)" opacity=".5"/>`,
    `<path d="${RACE_TRACK}" fill="none" stroke="${P.stone}" stroke-width="28" stroke-linecap="round"/>`,
    `<path d="${RACE_TRACK}" fill="none" stroke="${P.white}" stroke-width="2.4" stroke-dasharray="10 12" opacity=".9"/>`,
    groundShadow('rp-s3', 300, 353, 10, 3),
    prop('flag', 300, 352),
    groundShadow('rp-s1', at.kart.x, at.kart.y + 1, 30),
    prop('kart', at.kart.x, at.kart.y),
    groundShadow('rp-s2', at.cone.x, at.cone.y + 1, 18),
    prop('cone', at.cone.x, at.cone.y),
    ground('rp-h3', 'M0 458 C100 448 220 456 320 462 C340 463 352 460 360 461', P.hill3, P.hill3Low, P.hill3Edge),
    flower(20, 450, P.sun),
    flower(346, 456, P.pink),
    tuft(6, 480, P.tuft1, 1.4),
    tuft(352, 480, P.tuft1, 1.3),
  ].join(''),
  props: at,
};
