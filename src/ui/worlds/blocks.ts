import type { WorldArt } from './art';
import { block, cloud, groundShadow, layer, lift, sky } from './kit/paper';
import { P } from './kit/palette';
import { blockTree, prop } from './kit/props';

const at = { 'gem-block': { x: 326, y: 410, w: 48, h: 48 }, post: { x: 86, y: 446, w: 40, h: 64 }, statue: { x: 50, y: 352, w: 64, h: 64 } };
const steps = (pts: [number, number][]) => 'M' + pts.map(([x, y]) => `${x} ${y}`).join(' L');
const stepLayer = (id: string, pts: [number, number][], top: string, bottom: string, edge: string) => layer(id, `${steps(pts)} L360 480 L0 480Z`, top, bottom, edge, steps(pts));
/** A column of blocks at the edge: grass on top, dirt under it. */
const stack = (x: number, y: number, n: number) => lift(block(x, y - (n - 1) * 26, 26, P.hill2, P.hill2Edge, P.hill2Low) + Array.from({ length: n - 1 }, (_, i) => block(x, y - i * 26, 26, i % 2 ? P.dirt : P.dirtLow, P.dirtEdge, P.dirtLow)).join(''));

/** 方块世界: stepped block hills, block trees, Truffle's scratching-post block, his cat statue, and the gem block. */
export const BLOCKS: WorldArt = {
  prefix: 'bp',
  sky: sky('bp-sky', P.sky, P.paperSky),
  land: [
    cloud(40, 120, 0.8),
    lift(`<rect x="250" y="140" width="56" height="18" fill="${P.white}"/><rect x="262" y="128" width="30" height="14" fill="${P.white}"/>`) + `<rect x="250" y="158" width="56" height="6" fill="${P.cloudShade}"/>`,
    stepLayer('bp-far', [[0, 270], [40, 270], [40, 254], [100, 254], [100, 270], [170, 270], [170, 260], [250, 260], [250, 246], [300, 246], [300, 262], [360, 262]], P.far, P.farLow, P.farEdge),
    stepLayer('bp-h1', [[0, 312], [60, 312], [60, 300], [150, 300], [150, 308], [240, 308], [240, 296], [300, 296], [300, 306], [360, 306]], P.hill1, P.hill1Low, P.hill1Edge),
    blockTree(300, 340),
    groundShadow('bp-s1', at.statue.x, at.statue.y + 1, 30),
    prop('statue', at.statue.x, at.statue.y),
    stepLayer('bp-h2', [[0, 366], [80, 366], [80, 358], [200, 358], [200, 366], [290, 366], [290, 356], [360, 356]], P.hill2, P.hill2Low, P.hill2Edge),
    groundShadow('bp-s2', at['gem-block'].x, at['gem-block'].y + 1, 24),
    prop('gem-block', at['gem-block'].x, at['gem-block'].y),
    groundShadow('bp-s3', at.post.x, at.post.y + 1, 20),
    prop('post', at.post.x, at.post.y),
    stepLayer('bp-h3', [[0, 456], [120, 456], [120, 462], [250, 462], [250, 456], [360, 456]], P.hill3, P.hill3Low, P.hill3Edge),
    stack(0, 480, 3), stack(26, 480, 2), stack(334, 480, 3), stack(308, 480, 2),
  ].join(''),
  props: at,
};
