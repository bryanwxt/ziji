import type { WorldArt } from './art';
import { cloud, ground, groundShadow, layer, palm, shell, sky, starfish } from './kit/paper';
import { P } from './kit/palette';
import { prop, ship } from './kit/props';

const at = { x: { x: 84, y: 420, w: 44, h: 40 }, chest: { x: 318, y: 446, w: 48, h: 40 }, parrot: { x: 66, y: 316, w: 40, h: 44 } };

/** 海盗岛: sea to the horizon with a ship, a sandy island with a palm, the X to dig, Truffle's treasure chest, a parrot friend. */
export const PIRATE: WorldArt = {
  prefix: 'ip',
  sky: sky('ip-sky', P.skyDeep, P.paperSky),
  land: [
    cloud(240, 120, 0.9),
    cloud(30, 180, 0.6),
    layer('ip-sea', 'M0 300 Q30 294 60 300 T120 300 T180 300 T240 300 T300 300 T360 300 V480 H0Z', P.sea, P.seaLow, P.seaEdge, 'M0 300 Q30 294 60 300 T120 300 T180 300 T240 300 T300 300 T360 300'),
    ship(300, 300),
    `<path d="M150 318 q10 -3 20 0 M210 330 q10 -3 20 0 M90 336 q10 -3 20 0" stroke="${P.foam}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ground('ip-sand1', 'M0 360 C60 340 140 344 200 352 C260 360 320 348 360 352', P.sand, P.sandLow, P.sandEdge),
    palm(40, 392, 1),
    prop('parrot', at.parrot.x, at.parrot.y),
    ground('ip-sand2', 'M0 400 C90 386 200 394 290 402 C326 405 348 398 360 400', P.sandEdge, P.sand, P.white),
    prop('x', at.x.x, at.x.y),
    groundShadow('ip-s1', at.chest.x, at.chest.y + 1, 26),
    prop('chest', at.chest.x, at.chest.y),
    shell(30, 462), starfish(250, 466), shell(180, 470, P.lilac),
  ].join(''),
  props: at,
};
