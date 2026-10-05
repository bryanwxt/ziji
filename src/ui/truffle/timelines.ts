// src/ui/truffle/timelines.ts
import type { Expression } from './rig';

export interface Motion { y: number; squash: number; shake: number; lean: number }
export const REST: Motion = { y: 0, squash: 0, shake: 0, lean: 0 };
export type Track = (t: number) => Motion | null;
export type ReactionKind = 'right' | 'hard' | 'wrong' | 'streak' | 'newWord' | 'nod' | 'done' | 'excited' | 'pounce' | 'flinch' | 'purr' | 'munch' | 'watch' | 'proud' | 'hello' | 'peek' | 'huff' | 'bouncy';
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
  chew: track([[110, { y: 2 }], [220, { y: 0 }], [330, { y: 2 }], [440, { y: 0 }], [550, { y: 2 }], [700, { y: 0 }, back]]),
  wiggle: track([[150, { lean: -4 }], [300, { lean: 4 }], [450, { lean: -3 }], [600, { lean: 3 }], [760, { lean: 0 }]]),
  /** a tap on his head: he ducks, then shakes it off 140 ms later (one reaction, so nothing replaces the duck) */
  flinch: both(track([[90, { squash: 0.06, y: 3 }], [390, { squash: 0, y: 0 }, back]]), track([[110, { shake: -6 }], [250, { shake: 6 }], [390, { shake: -3 }], [550, { shake: 0 }]]), 140),
  /** a new word: he leans in toward the card, has a good look, and comes back upright (spec §4.4) */
  lean: track([[320, { lean: 5 }], [1300, { lean: 5 }], [1700, { lean: 0 }, back]]),
  purr: track([[2200, {}]]), // the body shimmer comes from the loop's purr flag; the track only holds the time
} satisfies Record<string, Track>;

/** Where his front paws are (spec 2026-10-04 §4.6): offsets from where they sit at his feet, in svg units, and a turn in degrees. */
export interface PawPose { lx: number; ly: number; lr: number; rx: number; ry: number; rr: number }
export const PAW_REST: PawPose = { lx: 0, ly: 0, lr: 0, rx: 0, ry: 0, rr: 0 };
type PawKey = [ms: number, p: Partial<PawPose>, ease?: (k: number) => number];
const PAW_KEYS = ['lx', 'ly', 'lr', 'rx', 'ry', 'rr'] as const;
/** A paw move from keyframes, like track(); it starts and ends with the paws at his feet. */
function pawTrack(keys: PawKey[]): (t: number) => PawPose | null {
  const end = keys[keys.length - 1]![0];
  return (t) => {
    if (t > end) return null;
    let prev = PAW_REST;
    let prevT = 0;
    for (const [ms, p, ease = easeOut] of keys) {
      const next = { ...prev, ...p };
      if (t <= ms) {
        const k = ms === prevT ? 1 : ease((t - prevT) / (ms - prevT));
        return Object.fromEntries(PAW_KEYS.map((n) => [n, prev[n] + (next[n] - prev[n]) * k])) as unknown as PawPose;
      }
      prev = next;
      prevT = ms;
    }
    return prev;
  };
}
const home: Partial<PawPose> = { ...PAW_REST };
export const PAW_TRACKS = {
  /** hello: the right paw up beside his face, waving */
  wave: pawTrack([[260, { rx: 8, ry: -72, rr: -20 }], [460, { rr: 16 }], [660, { rr: -20 }], [860, { rr: 16 }], [1060, { rr: -8 }], [1360, home, back], [1440, home]]),
  /** a right answer: one paw up */
  raise: pawTrack([[200, { rx: 4, ry: -62, rr: -12 }], [700, {}], [1000, home, back], [1080, home]]),
  /** a hard one right, and the end of a lesson: a clap at his chest */
  clap: pawTrack([[220, { lx: 10, ly: -62, rx: -10, ry: -62 }], [340, { lx: 18, rx: -18 }], [460, { lx: 10, rx: -10 }], [580, { lx: 18, rx: -18 }], [700, { lx: 10, rx: -10 }], [1000, home, back], [1080, home]]),
  /** content: kneading, one paw then the other */
  knead: pawTrack([[150, { ly: -6 }], [300, { ly: 0, ry: -6 }], [450, { ry: 0, ly: -6 }], [600, { ly: 0, ry: -6 }], [750, { ry: 0, ly: -6 }], [900, { ly: 0, ry: -6 }], [1100, home]]),
  /** a hard question: both paws over his eyes, then he peeks past one */
  cover: pawTrack([[260, { lx: -20, ly: -148, rx: 20, ry: -148 }], [900, {}], [1100, { rx: 34, ry: -118 }], [1400, {}], [1700, home, back], [1780, home]]),
  /** the pounce: a swat */
  swat: pawTrack([[120, { rx: 10, ry: -30, rr: -30 }], [240, { rx: 34, ry: -20, rr: 35 }], [420, home]]),
} satisfies Record<string, (t: number) => PawPose | null>;

/** What each moment does (spec 2026-10-04 §4.4): an expression, a body move, how long it holds, and what follows. */
export const REACTIONS: Record<ReactionKind, { expr: Expression; track: keyof typeof TRACKS | null; holdMs: number; then?: Expression; paws?: keyof typeof PAW_TRACKS }> = {
  right: { expr: 'happy', track: 'hop', holdMs: 1200, paws: 'raise' },
  hard: { expr: 'joy', track: 'bigHop', holdMs: 1500, paws: 'clap' },
  wrong: { expr: 'curious', track: null, holdMs: 1600 },
  streak: { expr: 'content', track: 'purr', holdMs: 2200, paws: 'knead' },
  newWord: { expr: 'surprised', track: 'lean', holdMs: 700, then: 'curious' },
  nod: { expr: 'happy', track: 'nod', holdMs: 500 },
  munch: { expr: 'content', track: 'chew', holdMs: 1300 },
  watch: { expr: 'curious', track: null, holdMs: 1800 },
  proud: { expr: 'proud', track: 'nod', holdMs: 1500 },
  done: { expr: 'joy', track: 'bigHop', holdMs: 1400, then: 'proud', paws: 'clap' },
  excited: { expr: 'surprised', track: 'wiggle', holdMs: 900 },
  pounce: { expr: 'joy', track: 'pounce', holdMs: 1500, paws: 'swat' },
  flinch: { expr: 'grumpy', track: 'flinch', holdMs: 1300 },
  purr: { expr: 'content', track: 'purr', holdMs: 900, paws: 'knead' },
  hello: { expr: 'happy', track: 'hop', holdMs: 1400, paws: 'wave' }, // he greets him
  peek: { expr: 'embarrassed', track: null, holdMs: 1700, paws: 'cover' }, // a hard question: paws over his eyes, then a peek
  huff: { expr: 'grumpy', track: 'shake', holdMs: 2200 }, // he sulks a little after days away
  bouncy: { expr: 'joy', track: 'bigHop', holdMs: 1500, paws: 'wave' }, // a streak day: extra bouncy
};
