// src/ui/truffle/timelines.ts
import type { Expression } from './rig';

export interface Motion { y: number; squash: number; shake: number; lean: number }
export const REST: Motion = { y: 0, squash: 0, shake: 0, lean: 0 };
export type Track = (t: number) => Motion | null;
export type ReactionKind = 'right' | 'hard' | 'wrong' | 'streak' | 'newWord' | 'nod' | 'done' | 'excited' | 'pounce' | 'flinch' | 'purr';
export type Reaction = { kind: ReactionKind; key: number };

const easeOut = (k: number) => 1 - (1 - k) ** 3;
const easeIn = (k: number) => k ** 3;
const back = (k: number) => { const c = 1.7; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
type Key = [ms: number, m: Partial<Motion>, ease?: (k: number) => number];
/** A track from keyframes (each key: time from the start, the values reached, the easing into them). */
function track(keys: Key[]): Track {
  const end = keys[keys.length - 1]![0];
  return (t) => {
    if (t > end) return null;
    let prev: Motion = REST;
    let prevT = 0;
    for (const [ms, m, ease = easeOut] of keys) {
      const next = { ...prev, ...m };
      if (t <= ms) {
        const k = ms === prevT ? 1 : ease((t - prevT) / (ms - prevT));
        return { y: prev.y + (next.y - prev.y) * k, squash: prev.squash + (next.squash - prev.squash) * k, shake: prev.shake + (next.shake - prev.shake) * k, lean: prev.lean + (next.lean - prev.lean) * k };
      }
      prev = next;
      prevT = ms;
    }
    return prev;
  };
}
/** Two tracks at once, the second starting `delay` ms after the first. */
function both(a: Track, b: Track, delay: number): Track {
  return (t) => {
    const x = a(t);
    const y = t < delay ? REST : b(t - delay);
    if (!x && !y) return null;
    const p = x ?? REST;
    const q = y ?? REST;
    return { y: p.y + q.y, squash: p.squash + q.squash, shake: p.shake + q.shake, lean: p.lean + q.lean };
  };
}
export const TRACKS = {
  hop: track([[130, { squash: 0.09 }], [250, { squash: -0.07, y: -30 }], [360, { squash: 0, y: -46 }], [570, { y: 0 }, easeIn], [650, { squash: 0.08 }], [910, { squash: 0 }, back]]),
  bigHop: track([[150, { squash: 0.12 }], [280, { squash: -0.1, y: -44 }], [420, { squash: 0, y: -70 }], [660, { y: 0 }, easeIn], [740, { squash: 0.1 }], [1040, { squash: 0 }, back]]),
  shake: track([[110, { shake: -6 }], [250, { shake: 6 }], [390, { shake: -3 }], [550, { shake: 0 }]]),
  pounce: track([[450, { lean: 6 }], [710, { squash: 0.1, lean: 8 }], [830, { squash: -0.08, y: -30, lean: 12 }], [1030, { squash: 0, y: 0, lean: 4 }, easeIn], [1100, { squash: 0.06 }], [1400, { squash: 0, lean: 0 }, back]]),
  nod: track([[120, { y: 2, shake: 0 }], [260, { y: 0 }, back]]),
  wiggle: track([[150, { lean: -4 }], [300, { lean: 4 }], [450, { lean: -3 }], [600, { lean: 3 }], [760, { lean: 0 }]]),
  /** a tap on his head: he ducks, then shakes it off 140 ms later (one reaction, so nothing replaces the duck) */
  flinch: both(track([[90, { squash: 0.06, y: 3 }], [390, { squash: 0, y: 0 }, back]]), track([[110, { shake: -6 }], [250, { shake: 6 }], [390, { shake: -3 }], [550, { shake: 0 }]]), 140),
  purr: track([[2200, {}]]), // the body shimmer comes from the loop's purr flag; the track only holds the time
} satisfies Record<string, Track>;

/** What each moment does (spec 2026-10-04 §4.4): an expression, a body move, how long it holds, and what follows. */
export const REACTIONS: Record<ReactionKind, { expr: Expression; track: keyof typeof TRACKS | null; holdMs: number; then?: Expression }> = {
  right: { expr: 'happy', track: 'hop', holdMs: 1200 },
  hard: { expr: 'joy', track: 'bigHop', holdMs: 1500 },
  wrong: { expr: 'curious', track: null, holdMs: 1600 },
  streak: { expr: 'content', track: 'purr', holdMs: 2200 },
  newWord: { expr: 'surprised', track: null, holdMs: 700, then: 'curious' },
  nod: { expr: 'happy', track: 'nod', holdMs: 500 },
  done: { expr: 'joy', track: 'bigHop', holdMs: 1400, then: 'proud' },
  excited: { expr: 'surprised', track: 'wiggle', holdMs: 900 },
  pounce: { expr: 'joy', track: 'pounce', holdMs: 1500 },
  flinch: { expr: 'grumpy', track: 'flinch', holdMs: 1300 },
  purr: { expr: 'content', track: 'purr', holdMs: 900 },
};
