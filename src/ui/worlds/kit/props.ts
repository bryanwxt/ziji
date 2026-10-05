// Truffle's things in each world (spec 2026-10-04 §2), and the bits of scenery that go with them. Each prop is drawn
// around the point where it touches the ground, so a moment (moments.ts) can redraw it moving in the same place.
import { block, lift } from './paper';
import { P } from './palette';

// parts that moments animate on their own
export const BOWL = `<path d="M-13 -4 q13 9 26 0 l-3 4 q-10 5 -20 0Z" fill="${P.pinkDeep}"/><ellipse cx="0" cy="-4" rx="13" ry="3.5" fill="${P.pinkSoft}"/>`;
export const FOOD = (rx = 8) => `<ellipse data-part="food" cx="0" cy="-4.5" rx="${rx}" ry="2" fill="${P.brownFood}"/>`;
export const EGG = `<ellipse cx="0" cy="-12" rx="10" ry="13" fill="${P.egg}"/><circle cx="-4" cy="-16" r="2.2" fill="${P.eggSpot}"/><circle cx="4" cy="-8" r="2.6" fill="${P.eggSpot}"/><circle cx="3" cy="-19" r="1.6" fill="${P.eggSpot}"/>`;
export const NEST = lift(`<ellipse cx="0" cy="-3" rx="24" ry="8" fill="${P.wood}"/>`);
export const NEST_FRONT = `<path d="M-22 -4 q22 10 44 0 M-18 0 q18 7 36 0" stroke="${P.woodDark}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-24 -6 q24 6 48 0" stroke="${P.woodLight}" stroke-width="2" fill="none"/>`;
export const CHEST_BASE = lift(`<rect x="-20" y="-20" width="40" height="20" rx="2" fill="${P.wood}"/>`) + `<path d="M-14 -20 V0 M14 -20 V0" stroke="${P.sunDeep}" stroke-width="3"/><circle cx="0" cy="-10" r="3.4" fill="${P.woodDark}"/><circle cx="-4" cy="-15" r="1.6" fill="${P.woodDark}"/><circle cx="0" cy="-16.5" r="1.6" fill="${P.woodDark}"/><circle cx="4" cy="-15" r="1.6" fill="${P.woodDark}"/>`;
export const CHEST_LID = lift(`<path d="M-20 -20 C-20 -34 20 -34 20 -20Z" fill="${P.woodLight}"/>`) + `<path d="M-14 -20 C-14 -30 -12 -31 -12 -31 M14 -20 C14 -30 12 -31 12 -31" stroke="${P.sunDeep}" stroke-width="3" fill="none"/><rect x="-4" y="-24" width="8" height="9" rx="2" fill="${P.sun}"/>`;
export const PARROT_BODY = lift(`<path d="M0 0 C-12 -2 -14 -18 -6 -26 C0 -32 10 -30 12 -22 C14 -12 10 -2 0 0Z" fill="${P.red}"/><path d="M-2 0 l-4 16 l6 -8 l2 10 l2 -16Z" fill="${P.sun}"/>`) + `<path d="M10 -24 q8 2 6 10 q-4 -4 -6 -4Z" fill="${P.sun}"/><circle cx="4" cy="-22" r="3" fill="${P.white}"/><circle cx="5" cy="-22" r="1.6" fill="${P.night}"/>`;
export const PARROT_WING = `<path d="M-4 -4 C-2 -14 6 -16 10 -10 C8 -2 2 0 -4 -4Z" fill="${P.blue}"/>`;
export const BUTTERFLY = `<path d="M0 0 C-10 -14 -20 -6 -14 2 C-20 8 -10 14 0 4Z" fill="${P.pink}"/><path d="M0 0 C10 -14 20 -6 14 2 C20 8 10 14 0 4Z" fill="${P.sun}"/><path d="M0 -6 V8" stroke="${P.woodDark}" stroke-width="2" stroke-linecap="round"/><path d="M0 -6 l-4 -6 M0 -6 l4 -6" stroke="${P.woodDark}" stroke-width="1.2" stroke-linecap="round"/>`;
export const KART = `<path d="M-24 -6 C-24 -14 -16 -18 -6 -18 L8 -18 C14 -18 18 -14 22 -10 L26 -6 Z" fill="${P.red}"/><path d="M-26 -6 H28 V-1 H-26Z" fill="${P.redDeep}"/><path d="M-12 -18 V-27 Q-12 -30 -9 -30 H-3 Q0 -30 0 -27 V-18Z" fill="${P.redDeep}"/><circle cx="-16" cy="0" r="7" fill="${P.night}"/><circle cx="16" cy="0" r="7" fill="${P.night}"/><circle cx="-16" cy="0" r="2.6" fill="${P.stoneEdge}"/><circle cx="16" cy="0" r="2.6" fill="${P.stoneEdge}"/><path d="M-22 -18 V-46" stroke="${P.woodDark}" stroke-width="2.2" stroke-linecap="round"/><path d="M-22 -46 h18 l-4 6 l4 6 h-18Z" fill="${P.cream}"/><circle cx="-13" cy="-40" r="2.6" fill="${P.coral}"/><circle cx="-17" cy="-44" r="1.3" fill="${P.coral}"/><circle cx="-13" cy="-45.5" r="1.3" fill="${P.coral}"/><circle cx="-9" cy="-44" r="1.3" fill="${P.coral}"/>`;
export const FISH = `<path d="M-16 0 C-8 -12 10 -12 16 0 C10 12 -8 12 -16 0Z" fill="${P.orange}"/><path d="M14 0 l12 -9 v18Z" fill="${P.ember}"/><path d="M-2 -9 q4 -6 10 -2" fill="${P.ember}"/><circle cx="-8" cy="-2" r="2.4" fill="${P.night}"/><path d="M0 -8 q4 8 0 16" stroke="${P.cream}" stroke-width="2" fill="none" opacity=".7"/>`;
export const SUB = `<ellipse cx="0" cy="-16" rx="30" ry="16" fill="${P.sun}"/><path d="M26 -16 l12 -9 v18Z" fill="${P.sunDeep}"/><circle cx="-6" cy="-16" r="8" fill="${P.glass}"/><circle cx="-8" cy="-18" r="3" fill="${P.white}" opacity=".8"/><rect x="8" y="-38" width="4" height="10" fill="${P.sunDeep}"/><path d="M6 -38 l3 -7 l3 7Z M10 -38 l3 -7 l3 7Z" fill="${P.sunDeep}"/><circle cx="14" cy="-14" r="3" fill="${P.sunDeep}"/>`;
export const ROCKET = `<path d="M-14 -16 C-24 -12 -28 -4 -28 4 L-12 0Z M14 -16 C24 -12 28 -4 28 4 L12 0Z" fill="${P.coral}"/><path d="M-14 0 C-18 -40 -10 -70 0 -84 C10 -70 18 -40 14 0Z" fill="${P.cream}"/><path d="M-9 -66 l-3 -22 l11 15Z M9 -66 l3 -22 l-11 15Z" fill="${P.cream}"/><path d="M-7.5 -70 l-2 -12 l6 8Z M7.5 -70 l2 -12 l-6 8Z" fill="${P.pinkSoft}"/><circle cx="0" cy="-44" r="8" fill="${P.glass}"/><circle cx="-2" cy="-46" r="3" fill="${P.white}" opacity=".8"/>`;
export const FLAME = `<path d="M-10 2 q10 22 20 0" fill="${P.sun}"/>`;
export const YARN = `<circle cx="0" cy="0" r="12" fill="${P.pink}"/><path d="M-10 -6 q10 6 20 -2 M-11 2 q11 6 22 -1 M-6 -10 q4 10 0 20 M3 -11 q5 11 1 22" stroke="${P.pinkSoft}" stroke-width="1.6" fill="none"/><path d="M10 6 q10 10 4 20 q-6 8 4 14" stroke="${P.pink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
export const CONE = `<path d="M-6 -26 L6 -26 L13 -2 H-13Z" fill="${P.orange}"/><path d="M-9 -14 H9 L10.5 -9 H-10.5Z" fill="${P.cream}"/><rect x="-17" y="-3" width="34" height="5" rx="2" fill="${P.ember}"/>`;
export const LEAF = `<path d="M0 0 C2 -20 -2 -40 4 -58" stroke="${P.stem}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M4 -58 C-30 -60 -44 -40 -40 -26 C-28 -36 -10 -40 4 -58 C16 -40 34 -34 46 -22 C48 -40 34 -60 4 -58Z" fill="${P.leaf2}"/>`;
export const LEAF_VEINS = `<path d="M4 -58 C-14 -50 -28 -40 -38 -28 M4 -58 C20 -50 32 -40 42 -26" stroke="${P.leaf3}" stroke-width="2" fill="none"/>`;
const flagSquares = [0, 1, 2, 3].flatMap((c) => [0, 1, 2].map((r) => ((c + r) % 2 ? '' : `<rect x="${2 + c * 7}" y="${-60 + r * 7}" width="7" height="7" fill="${P.night}"/>`))).join('');

/** Every prop's art, drawn around the point where it touches the ground. */
export const PROP_ART: Record<string, string> = {
  // 后院
  bowl: lift(BOWL) + FOOD(),
  ball: lift(`<circle cx="0" cy="-9" r="9" fill="${P.red}"/>`) + `<path d="M-8 -11 q8 -4 16 0" stroke="${P.white}" stroke-width="2" fill="none"/>`,
  birdhouse: lift(`<rect x="-2" y="-34" width="4" height="34" fill="${P.wood}"/><path d="M-12 -34 l12 -12 l12 12Z" fill="${P.coral}"/><rect x="-9" y="-34" width="18" height="14" rx="2" fill="${P.yellow}"/>`) + `<circle cx="0" cy="-27" r="3" fill="${P.woodDark}"/>`,
  sprinkler: lift(`<rect x="-3" y="-14" width="6" height="14" rx="2" fill="${P.mintDeep}"/><path d="M-10 -14 h20 l-4 -6 h-12Z" fill="${P.mint}"/><circle cx="0" cy="-22" r="3" fill="${P.sun}"/>`),
  // 草丛
  box: lift(`<path d="M-20 0 V-26 H20 V0Z" fill="${P.woodLight}"/><path d="M-20 -26 l-8 -9 h18 l10 9Z M20 -26 l8 -9 h-18 l-10 9Z" fill="${P.dirtEdge}"/>`) + `<path d="M-20 -26 H20" stroke="${P.dirt}" stroke-width="2"/><path d="M-6 -14 h12" stroke="${P.dirt}" stroke-width="2" stroke-linecap="round"/>`,
  butterfly: `<g transform="translate(0 -26)">${lift(BUTTERFLY)}</g>`,
  // 赛车山
  kart: `<g transform="translate(0 -7)">${lift(KART)}</g>`,
  cone: lift(CONE),
  flag: lift(`<rect x="-1.5" y="-62" width="3" height="62" fill="${P.stoneLow}"/><rect x="2" y="-60" width="28" height="21" fill="${P.white}"/>`) + flagSquares,
  // 方块世界
  post: lift(block(-15, 0, 30, P.woodLight, P.dirtEdge, P.dirt) + block(-15, -30, 30, P.woodLight, P.dirtEdge, P.dirt)) + `<path d="M-8 -48 l4 12 M-1 -50 l4 12 M6 -48 l4 12 M-9 -18 l4 10 M-1 -19 l4 10" stroke="${P.woodDark}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
  statue: lift(`<rect x="-24" y="-30" width="34" height="30" fill="${P.stone}"/><rect x="2" y="-52" width="28" height="24" fill="${P.stone}"/><rect x="2" y="-60" width="8" height="8" fill="${P.stone}"/><rect x="22" y="-60" width="8" height="8" fill="${P.stone}"/><rect x="-30" y="-24" width="8" height="18" fill="${P.stone}"/>`) + `<rect x="-24" y="-30" width="34" height="6" fill="${P.stoneEdge}"/><rect x="2" y="-52" width="28" height="5" fill="${P.stoneEdge}"/><rect x="8" y="-44" width="4" height="4" fill="${P.night}"/><rect x="20" y="-44" width="4" height="4" fill="${P.night}"/><rect x="14" y="-38" width="4" height="3" fill="${P.pink}"/>`,
  'gem-block': lift(block(-20, 0, 40, P.stone, P.stoneEdge, P.stoneLow)) + `<rect x="-11" y="-30" width="7" height="7" fill="${P.teal}"/><rect x="5" y="-19" width="6" height="6" fill="${P.purple}"/><rect x="-4" y="-12" width="5" height="5" fill="${P.teal}"/><rect x="9" y="-33" width="4" height="4" fill="${P.white}" opacity=".8"/>`,
  // 恐龙谷
  nest: NEST + `<g data-part="egg">${lift(EGG)}</g>` + NEST_FRONT,
  leaf: lift(LEAF) + LEAF_VEINS,
  volcano: lift(`<path d="M-70 0 C-46 -40 -28 -96 -16 -118 L16 -118 C28 -96 46 -40 70 0Z" fill="${P.rockWarm}"/><path d="M-16 -118 C-8 -112 8 -112 16 -118 L12 -104 C4 -98 -6 -98 -12 -104Z" fill="${P.ember}"/>`) + `<path d="M-10 -104 C-14 -90 -6 -82 -10 -70 M8 -104 C12 -92 6 -86 10 -76" stroke="${P.warm}" stroke-width="4" fill="none" stroke-linecap="round"/><g opacity=".85"><circle cx="-4" cy="-132" r="10" fill="${P.white}"/><circle cx="8" cy="-146" r="12" fill="${P.white}"/><circle cx="-2" cy="-160" r="9" fill="${P.white}"/></g>`,
  // 海底
  sub: `<g transform="translate(0 -4)">${lift(SUB)}</g>`,
  fish: `<g transform="translate(0 -30)">${lift(FISH)}</g>`,
  // 月球基地
  rocket: `<g transform="translate(0 -6)">${lift(ROCKET)}${FLAME}</g>`,
  yarn: `<g transform="translate(0 -40)">${lift(YARN)}</g>`,
  dome: lift(`<path d="M-44 0 A44 40 0 0 1 44 0Z" fill="${P.glass}"/><rect x="-50" y="-4" width="100" height="8" rx="3" fill="${P.stoneEdge}"/>`) + `<path d="M-30 -8 A32 28 0 0 1 -6 -34" stroke="${P.white}" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/><rect x="-8" y="-20" width="16" height="16" rx="3" fill="${P.stone}"/><circle data-part="window" cx="22" cy="-16" r="5" fill="${P.lamp}" opacity=".9"/>`,
  // 海盗岛
  chest: `<g data-part="base">${CHEST_BASE}</g><g data-part="lid">${CHEST_LID}</g>`,
  parrot: PARROT_BODY + `<g data-part="wing">${PARROT_WING}</g>`,
  x: `<path d="M-10 -8 L10 4 M10 -8 L-10 4" stroke="${P.redDeep}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`,
};

/** A prop in its place, tagged with its name so moments can find it. */
export const prop = (name: string, x: number, y: number) => `<g data-prop="${name}" transform="translate(${x} ${y})">${PROP_ART[name]}</g>`;

/** Scenery that isn't Truffle's (it never moves). */
export const fencePost = (x: number, y: number) => lift(`<path d="M${x - 5} ${y} V${y - 44} l5 -6 l5 6 V${y}Z" fill="${P.cream}"/><rect x="${x + 5}" y="${y - 34}" width="26" height="5" rx="2" fill="${P.creamShade}"/>`);
export const blockTree = (x: number, y: number) => {
  const b = (dx: number, dy: number, c: string, t: string) => block(x + dx, y + dy, 26, c, t, P.leaf1);
  return lift(block(x - 9, y, 18, P.trunk, P.wood, P.woodDark) + block(x - 9, y - 18, 18, P.trunk, P.wood, P.woodDark)) + lift(b(-39, -36, P.leaf2, P.leaf3) + b(-13, -36, P.leaf1, P.leaf2) + b(13, -36, P.leaf2, P.leaf3) + b(-26, -62, P.leaf3, P.leafLight) + b(0, -62, P.leaf2, P.leaf3));
};
export const ship = (x: number, y: number) => lift(`<path d="M${x - 26} ${y} h52 l-8 10 h-36Z" fill="${P.woodDark}"/><path d="M${x} ${y} V${y - 40}" stroke="${P.woodDark}" stroke-width="2.4"/><path d="M${x + 2} ${y - 38} q18 14 0 32Z M${x - 2} ${y - 34} q-16 12 0 26Z" fill="${P.cream}"/>`);
