import type { WorldArt } from './art';
import { ground, groundShadow, rock, sky, star } from './kit/paper';
import { P } from './kit/palette';
import { prop } from './kit/props';

const at = { rocket: { x: 62, y: 384, w: 56, h: 100 }, yarn: { x: 316, y: 362, w: 44, h: 60 } };
const crater = (x: number, y: number, r: number) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.35}" fill="${P.crater}"/><path d="M${x - r} ${y} A${r} ${r * 0.35} 0 0 1 ${x + r} ${y}" stroke="${P.moonEdge}" stroke-width="2" fill="none"/>`;

/** 月球基地: a deep sky with stars and a ringed planet, grey moon ground with craters, Truffle's cat-ear rocket, a floating ball of yarn, the base dome. */
export const SPACE: WorldArt = {
  prefix: 'xp',
  sky: sky('xp-sky', P.night, P.nightLow) + [star(40, 70, 4), star(120, 40, 3), star(200, 90, 5), star(300, 140, 3), star(60, 200, 3), star(170, 180, 2.5), star(330, 60, 2.5), star(250, 230, 3), star(20, 270, 2.5)].join(''),
  land: [
    `<circle cx="96" cy="140" r="22" fill="${P.lilac}"/><circle cx="90" cy="134" r="6" fill="${P.purple}" opacity=".35"/><ellipse cx="96" cy="140" rx="38" ry="8" fill="none" stroke="${P.sun}" stroke-width="3" transform="rotate(-18 96 140)"/>`,
    ground('xp-far', 'M0 318 C60 300 120 306 180 312 C250 320 300 300 360 306', P.moonRockLow, P.crater, P.moonEdge),
    ground('xp-h1', 'M0 360 C80 346 180 354 270 362 C318 366 344 356 360 358', P.moonRock, P.moonRockLow, P.moonEdge),
    crater(150, 392, 16),
    groundShadow('xp-s3', 302, 421, 48),
    prop('dome', 302, 420),
    groundShadow('xp-s1', at.rocket.x, at.rocket.y + 1, 26),
    prop('rocket', at.rocket.x, at.rocket.y),
    prop('yarn', at.yarn.x, at.yarn.y),
    ground('xp-h3', 'M0 452 C100 442 220 450 320 456 C340 457 352 454 360 455', P.moonEdge, P.moonRock, P.white),
    crater(40, 466, 12), crater(250, 470, 10),
    rock(340, 480, 0.7, P.moonRockLow, P.moonEdge),
  ].join(''),
  props: at,
};
