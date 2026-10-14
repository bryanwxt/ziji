// What each prop moment draws (spec 2026-10-13 §6; 2026-10-04 §4.5): the creature or thing moving in its own place, in light cel,
// as SMIL in a fresh <svg> each time. With reduced motion nothing moves: things that appear only fade in and out.
import type { WorldId } from '../../fun/worlds';
import { sparkle } from '../cel';
import type { Fx } from './moments';
import { RIVER } from './river';
import { BOAT, RIPPLE } from './creatures/boat';
import { FROG, panda } from './creatures/bamboo';
import { DRAGONFLY, DUCKS, KITE } from './creatures/terraces';
import { KINGFISHER, otter } from './creatures/home';
import { BUTTERFLY, HORNBILL, HORNBILL_FLY, MONKEY } from './creatures/rainforest';
import { BABY_DINO, EGG_ART, PTEROSAUR, PUFF } from './creatures/dino';
import { KOI_ART, PEARL, SKY_LANTERN, lotus } from './creatures/lantern';
import { ANIMAL_FACES } from './tapArt';

/** How long each moment plays (ms); a tap he makes during it is ignored. */
export const FX_MS: Record<Fx['kind'], number> = {
  boat: 1400,
  otters: 2400, dart: 1600, glide: 2600, swing: 2000, flutter: 1800,
  roll: 2200, hop: 1200, paddle: 3000, dip: 2000, zip: 1600,
  wobble: 800, hatchling: 900, soar: 2800, puff: 2000, bloom: 500, leap: 1400, rise: 3200,
};

/** The day's pearl stays up even if he keeps tapping. */
export const PEARL_MS = 1600;

/** A boat that brings the day's zodiac animal stays up until the animal has risen and faded (its pop runs this long). */
export const BOAT_FIND_MS = FX_MS.boat + 800;

export const fade = (dur: number, begin = 0) => `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="${dur}ms"${begin ? ` begin="${begin}ms"` : ''} fill="freeze"/>`;
export const move = (values: string, dur: number, keyTimes?: string, begin = 0) => `<animateTransform attributeName="transform" type="translate" additive="sum" values="${values}"${keyTimes ? ` keyTimes="${keyTimes}"` : ''} dur="${dur}ms"${begin ? ` begin="${begin}ms"` : ''} fill="freeze"/>`;
export const turn = (values: string, dur: number, keyTimes?: string) => `<animateTransform attributeName="transform" type="rotate" additive="sum" values="${values}"${keyTimes ? ` keyTimes="${keyTimes}"` : ''} dur="${dur}ms" fill="freeze"/>`;
export const at = (x: number, y: number, inner: string, cls = '') => `<g${cls ? ` class="${cls}"` : ''} transform="translate(${x} ${y})">${inner}</g>`;
const rise = (from: number, dur: number, still: boolean) => (still ? fade(dur) : move(`0 ${from};0 0;0 0`, dur, '0;0.3;1') + fade(dur));
export const glint = (x: number, y: number, r: number, delay: number, dur: number) => `<g transform="translate(${x} ${y})" opacity="0">${sparkle(0, 0, r, '#ffe27a', 1.4)}<animate attributeName="opacity" values="0;1;0" dur="${dur}ms" begin="${delay}ms" fill="freeze"/></g>`;

type Draw = (fx: Fx, s: { x: number; y: number }, still: boolean, world: WorldId) => { svg: string; hide: string | null };
const none = () => ({ svg: '', hide: null });

const DRAW: Record<Fx['kind'], Draw> = {
  boat: (fx, s, still, world) => {
    const animal = fx.kind === 'boat' ? fx.animal : null;
    // in 银河 the boat lifts off the silver river for a moment (spec 2026-10-13 §5); elsewhere it bobs
    const path = world === 'milkyway' ? '0 0;0 -40;0 -64;0 -40;0 0' : '0 0;0 -7;0 0;0 -4;0 0';
    const bob = still ? BOAT : `<g>${BOAT}${move(path, FX_MS.boat)}${turn('0;-4;3;-2;0', FX_MS.boat)}</g>`;
    const rings = still ? '' : `<ellipse cx="0" cy="6" rx="40" ry="8" fill="none" stroke="#fff" stroke-width="2.4" opacity="0"><animate attributeName="rx" values="40;90" dur="${FX_MS.boat}ms" fill="freeze"/><animate attributeName="opacity" values="0.8;0" dur="${FX_MS.boat}ms" fill="freeze"/></ellipse>`;
    // in 银河 the animal rides up with the lifting boat, so it rises out of the boat there too (never over its sail)
    const lift = !still && world === 'milkyway' ? move(path, FX_MS.boat) : '';
    const pop = animal ? `<g class="tap-pop" data-animal="${animal}" transform="translate(0 -84)"><circle r="30" fill="#fffdf7" stroke="#706889" stroke-width="2.2"/><g transform="scale(1.1)">${ANIMAL_FACES[animal] ?? ''}</g>${rise(40, BOAT_FIND_MS, still)}${lift}</g>` : '';
    return { svg: at(s.x, s.y, RIPPLE + rings + bob + pop, 'tap-boat'), hide: '[data-prop="boat"]' };
  },
  otters: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, otter(0.6)), hide: '[data-prop="otter"]' };
    const up = `<g>${otter(0.6)}${move('0 0;0 -16;0 -16;0 -16;0 20', FX_MS.otters, '0;0.2;0.5;0.8;1')}</g>`;
    const friend = `<g opacity="0" transform="translate(-58 10) scale(0.85)">${otter(-0.6)}<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="${FX_MS.otters}ms" fill="freeze"/>${move('0 30;0 -10;0 -10;0 30', FX_MS.otters, '0;0.25;0.75;1')}</g>`;
    return { svg: at(s.x, s.y, friend + up, 'tap-otters'), hide: '[data-prop="otter"]' };
  },
  dart: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, KINGFISHER + glint(0, -40, 7, 0, 900)), hide: null };
    const fly = `<g>${KINGFISHER}${move('0 0;-60 -30;-200 10;-60 -30;0 0', FX_MS.dart, '0;0.2;0.5;0.8;1')}</g>`;
    return { svg: at(s.x, s.y, fly, 'tap-dart'), hide: '[data-prop="kingfisher"]' };
  },
  glide: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, HORNBILL + glint(-20, -60, 7, 0, 900)), hide: null };
    const fly = `<g opacity="0">${HORNBILL_FLY}<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.45;0.5" dur="${FX_MS.glide}ms" fill="freeze"/>${move('0 0;-220 -60;-220 -60', FX_MS.glide, '0;0.45;1')}</g>`;
    const back = `<g opacity="0">${HORNBILL_FLY}<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.5;0.55;1" dur="${FX_MS.glide}ms" fill="freeze"/>${move('180 -40;180 -40;0 0', FX_MS.glide, '0;0.5;1')}</g>`;
    return { svg: at(s.x, s.y, fly + back, 'tap-glide'), hide: '[data-prop="hornbill"]' };
  },
  swing: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, MONKEY), hide: '[data-prop="monkey"]' };
    return { svg: at(s.x, s.y, `<g>${MONKEY}<animateTransform attributeName="transform" type="rotate" values="0 -8 -94;24 -8 -94;-20 -8 -94;14 -8 -94;0 -8 -94" dur="${FX_MS.swing}ms" fill="freeze"/></g>`, 'tap-swing'), hide: '[data-prop="monkey"]' };
  },
  flutter: (_fx, s, still) => {
    if (still) return none();
    const wings = `<g>${BUTTERFLY}<animateTransform attributeName="transform" type="scale" values="1 1;0.4 1;1 1" dur="220ms" repeatCount="${Math.round(FX_MS.flutter / 220)}"/></g>`;
    return { svg: at(s.x, s.y, `<g>${wings}<animateMotion dur="${FX_MS.flutter}ms" path="M0 0 C40 -60 90 -20 70 20 C50 50 10 30 0 0" fill="freeze"/></g>`, 'tap-butterfly'), hide: '[data-prop="butterfly"]' };
  },
  roll: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, panda(true)), hide: '[data-prop="panda"]' };
    const munch = `<g>${panda(true)}<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.4;0.42" dur="${FX_MS.roll}ms" fill="freeze"/>${move('0 0;0 -3;0 0;0 -3;0 0', 880)}</g>`;
    const over = `<g opacity="0">${panda(false)}<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.4;0.42;1" dur="${FX_MS.roll}ms" fill="freeze"/><animateTransform attributeName="transform" type="rotate" values="0 0 -40;0 0 -40;-360 0 -40" keyTimes="0;0.42;1" dur="${FX_MS.roll}ms" fill="freeze"/></g>`;
    return { svg: at(s.x, s.y, munch + over, 'tap-roll'), hide: '[data-prop="panda"]' };
  },
  hop: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, FROG), hide: '[data-prop="frog"]' };
    return { svg: at(s.x, s.y, `<g>${FROG}${move('0 0;20 -40;40 0;40 0;20 -30;0 0', FX_MS.hop, '0;0.2;0.4;0.6;0.8;1')}</g>`, 'tap-hop'), hide: '[data-prop="frog"]' };
  },
  paddle: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, DUCKS), hide: '[data-prop="ducks"]' };
    return { svg: at(s.x, s.y, `<g>${DUCKS}${move('0 0;-40 30;-40 30;0 0', FX_MS.paddle, '0;0.45;0.55;1')}${turn('0;-2;2;-2;0', FX_MS.paddle)}</g>`, 'tap-paddle'), hide: '[data-prop="ducks"]' };
  },
  dip: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, KITE), hide: '[data-prop="kite"]' };
    return { svg: at(s.x, s.y, `<g>${KITE}${move('0 0;20 30;-10 -20;0 0', FX_MS.dip)}<animateTransform attributeName="transform" type="rotate" additive="sum" values="0 0 -60;18 0 -60;-14 0 -60;0 0 -60" dur="${FX_MS.dip}ms" fill="freeze"/></g>`, 'tap-dip'), hide: '[data-prop="kite"]' };
  },
  zip: (_fx, s, still) => {
    if (still) return none();
    return { svg: at(s.x, s.y, `<g>${DRAGONFLY}${move('0 0;60 -20;60 -20;-30 -40;0 0', FX_MS.zip, '0;0.25;0.45;0.75;1')}</g>`, 'tap-zip'), hide: '[data-prop="dragonfly"]' };
  },
  wobble: (_fx, s, still) => ({ svg: at(s.x, s.y, `<g class="tap-egg">${EGG_ART}${still ? '' : turn('0 0 -10;-14 0 -10;12 0 -10;-8 0 -10;6 0 -10;0 0 -10', FX_MS.wobble)}</g>`), hide: '[data-prop="nest"] [data-part="egg"]' }),
  hatchling: (_fx, s, still) => ({ svg: at(s.x + 12, s.y - 10, `<g class="tap-baby-dino is-hopping">${BABY_DINO}${still ? '' : move('0 0;0 -16;0 0;0 -8;0 0', FX_MS.hatchling)}</g>`), hide: null }), // the props layer leaves out its resting baby while this plays
  soar: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, PTEROSAUR + glint(0, -60, 8, 0, 900)), hide: null };
    return { svg: at(s.x, s.y, `<g>${PTEROSAUR}<animateMotion dur="${FX_MS.soar}ms" path="M0 0 C-80 -40 -200 -10 -240 30 C-180 60 -60 40 0 0" fill="freeze"/></g>`, 'tap-soar'), hide: '[data-prop="pterosaur"]' };
  },
  puff: (_fx, s, still) => {
    const glow = `<ellipse cx="0" cy="-6" rx="34" ry="10" fill="#ff8a4a" opacity="0">${fade(FX_MS.puff)}</ellipse>`;
    const smoke = `<g opacity="0">${PUFF}${still ? '' : move('0 0;6 -60', FX_MS.puff)}${fade(FX_MS.puff)}</g>`;
    return { svg: at(s.x, s.y - 30, glow + smoke, 'tap-puff'), hide: null };
  },
  bloom: (fx, s, still) => {
    const opened = fx.kind === 'bloom' ? fx.opened : 0;
    const pearl = fx.kind === 'bloom' && fx.pearl ? `<g class="tap-pearl" transform="translate(0 -28)">${PEARL}${rise(20, PEARL_MS, still)}</g>` : '';
    return { svg: at(s.x, s.y, `<g class="tap-petals" data-opened="${opened}">${lotus(opened)}</g>` + pearl), hide: '[data-prop="lotus"] [data-part="bud"]' };
  },
  leap: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, glint(0, -30, 8, 0, 900)), hide: null };
    const arc = `<g>${KOI_ART}<animateMotion dur="${FX_MS.leap}ms" path="M20 10 C10 -70 -40 -70 -50 10" fill="freeze"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="${FX_MS.leap}ms" fill="freeze"/></g>`;
    const splash = `<ellipse cx="-50" cy="-2" rx="10" ry="4" fill="none" stroke="#fff" stroke-width="2.4" opacity="0"><animate attributeName="rx" values="10;40" begin="${FX_MS.leap * 0.85}ms" dur="500ms" fill="freeze"/><animate attributeName="opacity" values="0.9;0" begin="${FX_MS.leap * 0.85}ms" dur="500ms" fill="freeze"/></ellipse>`;
    return { svg: at(s.x, s.y, arc + splash, 'tap-leap'), hide: null };
  },
  rise: (_fx, s, still) => {
    if (still) return { svg: at(s.x, s.y, SKY_LANTERN + glint(0, -50, 7, 0, 900)), hide: null };
    const up = `<g>${SKY_LANTERN}${move('0 0;-30 -240;-60 -480', FX_MS.rise)}<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.7;1" dur="${FX_MS.rise}ms" fill="freeze"/></g>`;
    const back = `<g opacity="0">${SKY_LANTERN}<animate attributeName="opacity" values="0;1" begin="${FX_MS.rise}ms" dur="300ms" fill="freeze"/></g>`;
    return { svg: at(s.x, s.y, up + back, 'tap-rise'), hide: '[data-prop="skylantern"]' };
  },
};

/** Which prop a moment plays on (the zodiac animal's on the boat in any world). */
const PROP_OF: Record<Fx['kind'], string> = {
  boat: 'boat',
  otters: 'otter', dart: 'kingfisher', glide: 'hornbill', swing: 'monkey', flutter: 'butterfly',
  roll: 'panda', hop: 'frog', paddle: 'ducks', dip: 'kite', zip: 'dragonfly',
  wobble: 'nest', hatchling: 'nest', soar: 'pterosaur', puff: 'volcano', bloom: 'lotus', leap: 'koi', rise: 'skylantern',
};

/** The moment's art, and the scene part it stands in for while it plays (that part is hidden, then shown again). */
export function momentFx(world: WorldId, fx: Fx, still: boolean): { svg: string; hide: string | null } {
  const s = RIVER[world].props[PROP_OF[fx.kind]]!;
  return DRAW[fx.kind](fx, s, still, world);
}
