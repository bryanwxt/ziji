// Evening in every world (spec 2026-10-04 §2): the day sky is swapped for a dusk sky with the moon and stars (under the land,
// so hills, peaks and trees stay in front), then a dusk tint and warm lights that suit the world go over it.
import type { WorldId } from '../../fun/worlds';
import { glow, lift, sky, star } from './kit/paper';
import { P } from './kit/palette';

const moon = (pre: string) => `<g data-part="moon">${glow(`${pre}-ev-moon`, 300, 80, 56, P.lamp, 0.35)}<circle cx="300" cy="80" r="26" fill="${P.cream}"/><circle cx="291" cy="73" r="5" fill="${P.creamShade}"/><circle cx="309" cy="90" r="4" fill="${P.creamShade}"/></g>`;
const stars = () => [star(60, 120, 7, P.lamp, 'star'), star(150, 170, 6, P.lamp, 'star'), star(210, 100, 8, P.lamp, 'star'), star(40, 60, 5, P.lamp, 'star'), star(250, 160, 5, P.lamp, 'star')].join('');
const tint = (o = 0.16) => `<rect data-part="dusk" width="360" height="480" fill="${P.dusk}" opacity="${o}"/>`;
const light = (id: string, x: number, y: number, r = 36) => glow(id, x, y, r, P.warm, 0.6);

const lantern = (pre: string, i: number, x: number, y: number) => `<g data-part="lantern">${light(`${pre}-ev-l${i}`, x, y, 28)}${lift(`<ellipse cx="${x}" cy="${y}" rx="8" ry="10" fill="${P.coral}"/>`)}<ellipse cx="${x}" cy="${y}" rx="4" ry="6" fill="${P.lamp}"/></g>`;
const lanterns = (pre: string) => `<g data-part="lanterns"><path d="M0 210 Q90 234 180 216 T360 220" fill="none" stroke="${P.woodDark}" stroke-width="1.6"/>${lantern(pre, 1, 40, 226)}${lantern(pre, 2, 130, 226)}${lantern(pre, 3, 230, 222)}${lantern(pre, 4, 320, 224)}</g>`;
const firefly = (pre: string, i: number, x: number, y: number) => `<g data-part="firefly">${glow(`${pre}-ev-f${i}`, x, y, 14, P.lamp, 0.8)}<circle cx="${x}" cy="${y}" r="2.4" fill="${P.lamp}"/></g>`;
const lampPost = (pre: string, i: number, x: number, y: number) => `<g data-part="lamp">${light(`${pre}-ev-p${i}`, x, y - 60, 46)}${lift(`<rect x="${x - 2}" y="${y - 60}" width="4" height="60" fill="${P.stoneLow}"/><path d="M${x - 8} ${y - 60} h16 l-3 -10 h-10Z" fill="${P.stoneLow}"/>`)}<rect x="${x - 5}" y="${y - 68}" width="10" height="7" fill="${P.lamp}"/></g>`;
const torch = (pre: string, i: number, x: number, y: number) => `<g data-part="torch">${light(`${pre}-ev-t${i}`, x, y - 14, 34)}${lift(`<rect x="${x - 3}" y="${y - 14}" width="6" height="14" fill="${P.wood}"/>`)}<rect x="${x - 5}" y="${y - 24}" width="10" height="10" fill="${P.orange}"/><rect x="${x - 3}" y="${y - 22}" width="6" height="6" fill="${P.lamp}"/></g>`;
const jelly = (pre: string, i: number, x: number, y: number) => `<g data-part="jelly">${glow(`${pre}-ev-j${i}`, x, y, 26, P.lilac, 0.7)}<path d="M${x - 10} ${y} a10 9 0 0 1 20 0Z" fill="${P.lilac}"/><path d="M${x - 6} ${y} q-2 8 1 14 M${x} ${y} q2 8 -1 16 M${x + 6} ${y} q-2 8 1 14" stroke="${P.lilac}" stroke-width="1.6" fill="none"/></g>`;

const PREFIX: Record<WorldId, string> = { yard: 'yp', grass: 'gp', race: 'rp', blocks: 'bp', dino: 'dp', sea: 'sp', space: 'xp', pirate: 'ip' };

/** The dusk sky that takes the day sky's place. The moon base is always night: it keeps its own sky. */
export function eveningSky(world: WorldId, daySky: string): string {
  const pre = PREFIX[world];
  if (world === 'space') return daySky;
  if (world === 'sea') return sky(`${pre}-ev-sky`, P.duskSea, P.duskSeaLow);
  return sky(`${pre}-ev-sky`, P.duskTop, P.duskLow) + moon(pre) + stars();
}

/** The lights over the land: a dusk tint, then lamps, lanterns, fireflies or glows that belong in this world. */
export function eveningLights(world: WorldId): string {
  const pre = PREFIX[world];
  switch (world) {
    case 'yard': return tint() + lanterns(pre);
    case 'grass': return tint() + firefly(pre, 1, 40, 330) + firefly(pre, 2, 70, 372) + firefly(pre, 3, 300, 340) + firefly(pre, 4, 332, 392) + firefly(pre, 5, 120, 420);
    case 'race': return tint() + lampPost(pre, 1, 22, 400) + lampPost(pre, 2, 342, 396);
    case 'blocks': return tint() + torch(pre, 1, 13, 402) + torch(pre, 2, 347, 402);
    case 'dino': return tint() + `<g data-part="lava">${glow(`${pre}-ev-v`, 312, 186, 60, P.ember, 0.6)}${glow(`${pre}-ev-v2`, 312, 240, 70, P.warm, 0.3)}</g>`;
    case 'sea': return tint(0.3) + jelly(pre, 1, 34, 300) + jelly(pre, 2, 326, 310) + jelly(pre, 3, 120, 270);
    case 'space': return `<g data-part="window">${light(`${pre}-ev-w`, 324, 404, 30)}</g>${glow(`${pre}-ev-r`, 62, 340, 30, P.lamp, 0.45)}`;
    case 'pirate': return tint() + `<g data-part="lamp">${light(`${pre}-ev-s`, 300, 280, 30)}<rect x="296" y="276" width="8" height="8" fill="${P.lamp}"/></g><path d="M282 318 h36 M290 326 h22 M296 334 h10" stroke="${P.lamp}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`;
  }
}
