// What each prop moment draws (spec 2026-10-13 §6; 2026-10-04 §4.5): the creature or thing moving in its own place, in light cel,
// as SMIL in a fresh <svg> each time. With reduced motion nothing moves: things that appear only fade in and out.
import type { WorldId } from '../../fun/worlds';
import { sparkle } from '../cel';
import type { Fx } from './moments';
import { RIVER } from './river';
import { BOAT, RIPPLE } from './creatures/boat';
import { ANIMAL_FACES } from './tapArt';

/** How long each moment plays (ms); a tap he makes during it is ignored. */
export const FX_MS: Record<Fx['kind'], number> = {
  boat: 1400,
};

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
    const pop = animal ? `<g class="tap-pop" data-animal="${animal}" transform="translate(0 -84)"><circle r="30" fill="#fffdf7" stroke="#706889" stroke-width="2.2"/><g transform="scale(1.1)">${ANIMAL_FACES[animal] ?? ''}</g>${rise(40, FX_MS.boat + 800, still)}</g>` : '';
    return { svg: at(s.x, s.y, RIPPLE + rings + bob + pop, 'tap-boat'), hide: '[data-prop="boat"]' };
  },
};

/** Which prop a moment plays on (the zodiac animal's on the boat in any world). */
const PROP_OF: Record<Fx['kind'], string> = {
  boat: 'boat',
};

/** The moment's art, and the scene part it stands in for while it plays (that part is hidden, then shown again). */
export function momentFx(world: WorldId, fx: Fx, still: boolean): { svg: string; hide: string | null } {
  const s = RIVER[world].props[PROP_OF[fx.kind]]!;
  return DRAW[fx.kind](fx, s, still, world);
}
