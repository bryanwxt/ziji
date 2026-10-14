// What each prop moment draws (spec 2026-10-13 §6; 2026-10-04 §4.5): the creature or thing moving in its own place, in light cel,
// as SMIL in a fresh <svg> each time. With reduced motion nothing moves: things that appear only fade in and out.
import type { WorldId } from '../../fun/worlds';
import { sparkle } from '../cel';
import type { Fx } from './moments';
import { RIVER } from './river';
import { BOAT, RIPPLE } from './creatures/boat';
import { KINGFISHER, otter } from './creatures/home';
import { BUTTERFLY, HORNBILL, HORNBILL_FLY, MONKEY } from './creatures/rainforest';
import { ANIMAL_FACES } from './tapArt';

/** How long each moment plays (ms); a tap he makes during it is ignored. */
export const FX_MS: Record<Fx['kind'], number> = {
  boat: 1400,
  otters: 2400, dart: 1600, glide: 2600, swing: 2000, flutter: 1800,
};

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
};

/** Which prop a moment plays on (the zodiac animal's on the boat in any world). */
const PROP_OF: Record<Fx['kind'], string> = {
  boat: 'boat',
  otters: 'otter', dart: 'kingfisher', glide: 'hornbill', swing: 'monkey', flutter: 'butterfly',
};

/** The moment's art, and the scene part it stands in for while it plays (that part is hidden, then shown again). */
export function momentFx(world: WorldId, fx: Fx, still: boolean): { svg: string; hide: string | null } {
  const s = RIVER[world].props[PROP_OF[fx.kind]]!;
  return DRAW[fx.kind](fx, s, still, world);
}
