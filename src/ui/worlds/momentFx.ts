// What each prop moment draws (spec 2026-10-04 §4.5): the prop moving in its own place, in the paper style (no ink outlines,
// no filters), as SMIL in a fresh <svg> each time. With reduced motion nothing moves: things that appear only fade.
import type { WorldId } from '../../fun/worlds';
import type { Fx } from './moments';
import { star } from './kit/paper';
import { P } from './kit/palette';
import { BOWL, BUTTERFLY, CHEST_BASE, CHEST_LID, CONE, EGG, FISH, FLAME, FOOD, KART, LEAF, LEAF_VEINS, PARROT_BODY, PARROT_WING, PROP_ART, ROCKET, SUB, YARN } from './kit/props';
import { lift } from './kit/paper';
import { RACE_TRACK } from './race';
import { WORLD_ART } from './scenes';
import { ANIMAL_FACES, BABY_DINO, GEM } from './tapArt';

/** How long each moment plays (ms); a tap during it is ignored. */
export const FX_MS: Record<Fx['kind'], number> = {
  spray: 1200, munch: 1300, roll: 1400, bird: 2000, animal: 2200, flutter: 1600, lap: 2600, tip: 1200, crack: 500, scratch: 1000,
  sparkle: 1400, wobble: 800, hop: 900, drops: 1400, bubbles: 1600, swim: 2000, launch: 4300, drift: 2400, dig: 1400, open: 1600, flap: 1400,
};
export const GEM_POP_MS = 1400; // the day's gem stays up even if he keeps tapping

const fade = (dur: number) => `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="${dur}ms" fill="freeze"/>`;
const move = (values: string, dur: number, keyTimes?: string) => `<animateTransform attributeName="transform" type="translate" additive="sum" values="${values}"${keyTimes ? ` keyTimes="${keyTimes}"` : ''} dur="${dur}ms" fill="freeze"/>`;
const turn = (values: string, dur: number, keyTimes?: string) => `<animateTransform attributeName="transform" type="rotate" additive="sum" values="${values}"${keyTimes ? ` keyTimes="${keyTimes}"` : ''} dur="${dur}ms" fill="freeze"/>`;
const at = (x: number, y: number, inner: string, cls = '') => `<g${cls ? ` class="${cls}"` : ''} transform="translate(${x} ${y})">${inner}</g>`;
const rise = (from: number, dur: number, still: boolean) => (still ? fade(dur) : move(`0 ${from};0 0;0 0`, dur, '0;0.3;1') + fade(dur));
const sparkle = (x: number, y: number, r: number, delay: number, dur: number) => `<g transform="translate(${x} ${y})" opacity="0">${star(0, 0, r, P.sun)}<animate attributeName="opacity" values="0;1;0" dur="${dur}ms" begin="${delay}ms" fill="freeze"/></g>`;

/** The moment's art, and the scene part it stands in for while it plays (that part is hidden, then shown again). */
export function momentFx(world: WorldId, fx: Fx, still: boolean): { svg: string; hide: string | null } {
  const p = (name: string) => WORLD_ART[world].props[name]!;
  const ms = FX_MS[fx.kind];
  switch (fx.kind) {
    case 'spray': {
      const s = p('sprinkler');
      const arcs = `<g fill="none" stroke="${P.skyDeep}" stroke-width="3" stroke-linecap="round"><path d="M0 0 q-14 -26 -30 -18"/><path d="M0 0 q-4 -32 -12 -34"/><path d="M0 0 q4 -32 12 -34"/><path d="M0 0 q14 -26 30 -18"/></g><g fill="${P.sea}"><circle cx="-32" cy="-14" r="2.6"/><circle cx="-13" cy="-36" r="2.6"/><circle cx="13" cy="-36" r="2.6"/><circle cx="32" cy="-14" r="2.6"/></g>`;
      return { svg: at(s.x, s.y - 22, arcs + fade(ms), 'tap-spray'), hide: null }; // from the nozzle (phase A minor: it sprayed from the ground)
    }
    case 'munch': {
      const b = p('bowl');
      const food = still ? FOOD(5) : `<ellipse cx="0" cy="-4.5" rx="8" ry="2" fill="${P.brownFood}"><animate attributeName="rx" values="8;6.5;5" keyTimes="0;0.5;1" dur="${ms}ms" fill="freeze"/></ellipse>`;
      const crumbs = still ? '' : `<g fill="${P.brownFood}"><circle cx="-10" cy="-10" r="1.4">${move('0 0;-4 -6;-6 2', ms)}</circle><circle cx="9" cy="-11" r="1.2">${move('0 0;5 -5;7 3', ms)}</circle></g>`;
      return { svg: at(b.x, b.y, lift(BOWL) + food + crumbs, 'tap-bowl'), hide: '[data-prop="bowl"]' };
    }
    case 'roll': {
      if (still) return { svg: '', hide: null };
      const b = p('ball');
      const ball = `<g>${lift(`<circle cx="0" cy="-9" r="9" fill="${P.red}"/>`)}<path d="M-8 -11 q8 -4 16 0" stroke="${P.white}" stroke-width="2" fill="none"/>${turn('0 0 -9;-280 0 -9;-280 0 -9;0 0 -9', ms, '0;0.4;0.55;1')}</g>`;
      return { svg: at(b.x, b.y, `<g>${ball}${move('0 0;-46 0;-46 0;0 0', ms, '0;0.4;0.55;1')}</g>`, 'tap-ball'), hide: '[data-prop="ball"]' };
    }
    case 'bird': {
      const h = p('birdhouse');
      const bird = `<path d="M-7 0 C-7 -7 3 -8 6 -3 L11 -4 L7 0 C5 4 -5 5 -7 0Z" fill="${P.blue}"/><path d="M-2 -2 q4 -6 8 0" fill="${P.skyDeep}"/><circle cx="3" cy="-3" r="1.2" fill="${P.night}"/>`;
      const path = still ? fade(ms) : move('0 0;0 -10;6 -26;6 -26;-60 -110', ms, '0;0.15;0.35;0.7;1') + fade(ms);
      return { svg: at(h.x, h.y - 27, `<g>${bird}${path}</g>`, 'tap-bird'), hide: null };
    }
    case 'animal': {
      const b = p('box');
      const face = `<g class="tap-pop" data-animal="${fx.animal}" transform="translate(0 -40) scale(0.9)"><circle r="24" fill="${P.cream}"/>${ANIMAL_FACES[fx.animal] ?? ''}${rise(30, ms, still)}</g>`;
      const box = still ? '' : `<g>${PROP_ART.box}${turn('0 0 0;-6 0 0;6 0 0;-3 0 0;0 0 0', 600)}</g>`;
      return { svg: at(b.x, b.y, box + face), hide: still ? null : '[data-prop="box"]' };
    }
    case 'flutter': {
      if (still) return { svg: '', hide: null };
      const b = p('butterfly');
      const wings = `<g>${lift(BUTTERFLY)}<animateTransform attributeName="transform" type="scale" values="1 1;0.4 1;1 1" dur="220ms" repeatCount="${Math.round(ms / 220)}"/></g>`;
      return { svg: at(b.x, b.y - 26, `<g>${wings}<animateMotion dur="${ms}ms" path="M0 0 C-30 -40 -64 -10 -44 18 C-24 40 10 14 0 0" fill="freeze"/></g>`, 'tap-butterfly'), hide: '[data-prop="butterfly"]' };
    }
    case 'lap': {
      if (still) return { svg: '', hide: null };
      const k = p('kart');
      const drive = `<g class="tap-kart" opacity="0"><g transform="translate(0 -14)">${lift(KART)}</g><animateMotion dur="${ms - 600}ms" begin="300ms" path="${RACE_TRACK}" rotate="auto" fill="freeze"/><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.95;1" dur="${ms - 600}ms" begin="300ms" fill="freeze"/></g>`;
      const back = `<g opacity="0">${at(k.x, k.y, PROP_ART.kart)}<animate attributeName="opacity" values="0;1" dur="300ms" begin="${ms - 300}ms" fill="freeze"/></g>`;
      return { svg: drive + back, hide: '[data-prop="kart"]' };
    }
    case 'tip': {
      if (still) return { svg: '', hide: null };
      const c = p('cone');
      return { svg: at(c.x, c.y, `<g>${lift(CONE)}${turn('0 -13 0;-80 -13 0;-80 -13 0;0 -13 0', ms, '0;0.3;0.6;1')}</g>`, 'tap-cone'), hide: '[data-prop="cone"]' };
    }
    case 'crack': {
      const g = p('gem-block');
      const lines = ['M-12 -30 l8 8 -4 6', 'M6 -32 l-6 10 5 6', 'M-8 -12 l6 -6 6 2'].slice(0, fx.cracks).map((d) => `<path class="tap-crack" d="${d}" fill="none" stroke="${P.white}" stroke-width="2.4" stroke-linecap="round"/>`).join('');
      const gem = fx.gem ? `<g class="tap-gem" transform="translate(0 -52)">${GEM}${rise(24, GEM_POP_MS, still)}</g>` : '';
      return { svg: at(g.x, g.y, lines + gem), hide: null };
    }
    case 'scratch': {
      const s = p('post');
      const marks = [-8, -1, 6].map((x, i) => `<path class="tap-scratch" d="M${x} -50 l4 14" stroke="${P.white}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="16" stroke-dashoffset="${still ? 0 : 16}">${still ? '' : `<animate attributeName="stroke-dashoffset" values="16;0" dur="250ms" begin="${i * 220}ms" fill="freeze"/>`}</path>`).join('');
      const chips = still ? '' : [-10, 4, 12].map((x, i) => `<rect x="${x}" y="-36" width="3" height="3" fill="${P.woodLight}">${move(`0 0;${(i - 1) * 8} 30`, 800)}${fade(800)}</rect>`).join('');
      return { svg: at(s.x, s.y, marks + chips), hide: null };
    }
    case 'sparkle': {
      const s = p('statue');
      return { svg: at(s.x, s.y, [[-28, -40, 6, 0], [30, -64, 7, 250], [36, -20, 5, 500], [-6, -70, 5, 750]].map(([x, y, r, d]) => sparkle(x!, y!, r!, d!, 600)).join(''), 'tap-sparkle'), hide: null };
    }
    case 'wobble': {
      const n = p('nest');
      return { svg: at(n.x, n.y, `<g class="tap-egg">${lift(EGG)}${still ? '' : turn('0 0 0;-14 0 0;12 0 0;-8 0 0;6 0 0;0 0 0', ms)}</g>`), hide: '[data-prop="nest"] [data-part="egg"]' };
    }
    case 'hop': {
      const n = p('nest');
      return { svg: at(n.x + 10, n.y - 8, `<g class="tap-baby-dino is-hopping" transform="scale(0.9)">${BABY_DINO}${still ? '' : move('0 0;0 -14;0 0;0 -7;0 0', ms)}</g>`), hide: null }; // the props layer leaves out its resting baby while this plays
    }
    case 'drops': {
      const l = p('leaf');
      const sway = still ? lift(LEAF) + LEAF_VEINS : `<g>${lift(LEAF)}${LEAF_VEINS}${turn('0 0 0;-6 0 0;5 0 0;0 0 0', 900)}</g>`;
      const drops = [[-36, -26, 0], [42, -22, 200], [6, -40, 400]].map(([x, y, d]) => `<path d="M${x} ${y} q-3 5 0 7 q3 -2 0 -7Z" fill="${P.skyDeep}" opacity="0"><animate attributeName="opacity" values="0;1;1;0" dur="900ms" begin="${d}ms" fill="freeze"/>${still ? '' : `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${-(y as number) - 4}" dur="900ms" begin="${d}ms" fill="freeze"/>`}</path>`).join('');
      return { svg: at(l.x, l.y, sway + drops, 'tap-drops'), hide: still ? null : '[data-prop="leaf"]' };
    }
    case 'bubbles': {
      const s = p('sub');
      const bob = still ? '' : `<g transform="translate(0 -4)">${lift(SUB)}${move('0 0;0 -6;0 0;0 -4;0 0', ms)}</g>`;
      const bubbles = [0, 1, 2, 3].map((i) => `<circle cx="${10 + (i % 2) * 6}" cy="-44" r="${3 + (i % 2)}" fill="none" stroke="${P.foam}" stroke-width="1.8" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="${900 + i * 200}ms" begin="${i * 150}ms" fill="freeze"/>${still ? '' : `<animate attributeName="cy" values="-44;-100" dur="${900 + i * 200}ms" begin="${i * 150}ms" fill="freeze"/>`}</circle>`).join('');
      return { svg: at(s.x, s.y, `<g class="tap-sub">${bob}</g>` + bubbles), hide: still ? null : '[data-prop="sub"]' };
    }
    case 'swim': {
      if (still) return { svg: '', hide: null };
      const f = p('fish');
      const flip = `<animateTransform attributeName="transform" type="scale" values="1 1;1 1;-1 1;-1 1;1 1" keyTimes="0;0.45;0.5;0.95;1" dur="${ms}ms" fill="freeze"/>`;
      return { svg: at(f.x, f.y - 30, `<g>${move('0 0;-60 -6;-60 -6;0 0', ms, '0;0.45;0.5;1')}<g>${lift(FISH)}${flip}</g></g>`, 'tap-fish'), hide: '[data-prop="fish"]' };
    }
    case 'launch': {
      const r = p('rocket');
      const lift_ = still ? fade(ms) : `<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 -440;0 -440;0 0" keyTimes="0;0.4;0.55;1" begin="1500ms" dur="2800ms" fill="freeze"/>`;
      return { svg: at(r.x, r.y - 6, `<g class="tap-rocket">${lift(ROCKET)}${FLAME}${lift_}</g>`), hide: '[data-prop="rocket"]' };
    }
    case 'drift': {
      if (still) return { svg: '', hide: null };
      const y = p('yarn');
      return { svg: at(y.x, y.y - 40, `<g>${move('0 0;-10 -30;-4 -40;0 0', ms)}<g>${lift(YARN)}${turn('0;200;360', ms)}</g></g>`, 'tap-yarn'), hide: '[data-prop="yarn"]' };
    }
    case 'dig': {
      const x = p('x');
      const puffs = [[-14, -2, 4], [10, -6, 3.5], [-2, -8, 3]].map(([dx, dy, r]) => `<circle cx="${dx}" cy="${dy}" r="${r}" fill="${P.sandLow}">${still ? '' : move(`0 0;${(dx as number) * 0.6} -10;${(dx as number) * 0.8} 0`, ms)}${fade(ms)}</circle>`).join('');
      const prize = fx.star ? `<g transform="translate(0 -26)">${star(0, 0, 12, P.sun)}${rise(20, ms, still)}</g>` : '';
      return { svg: at(x.x, x.y, puffs + prize, 'tap-dig'), hide: null };
    }
    case 'open': {
      const c = p('chest');
      const lid = `<g>${CHEST_LID}${still ? '' : turn('0 -20 -20;-28 -20 -20;-28 -20 -20;0 -20 -20', ms, '0;0.25;0.75;1')}</g>`;
      const shine = [[-6, -36, 5, 300], [8, -44, 6, 500], [0, -54, 4, 700]].map(([x, y, r, d]) => sparkle(x!, y!, r!, d!, 700)).join('');
      return { svg: at(c.x, c.y, CHEST_BASE + lid + shine, 'tap-chest'), hide: '[data-prop="chest"]' };
    }
    case 'flap': {
      const b = p('parrot');
      const wing = `<g>${PARROT_WING}${still ? '' : `<animateTransform attributeName="transform" type="rotate" values="0 -4 -4;-30 -4 -4;0 -4 -4" dur="280ms" repeatCount="5"/>`}</g>`;
      return { svg: at(b.x, b.y, `<g>${PARROT_BODY}${wing}${still ? '' : '<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 -4;0 0" dur="700ms" repeatCount="2"/>'}</g>`, 'tap-parrot'), hide: '[data-prop="parrot"]' };
    }
  }
}
