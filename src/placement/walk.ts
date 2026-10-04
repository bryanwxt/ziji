import type { Word } from '../types';

/** The adaptive placement check (spec §19 part 6): 30 bands of 100 characters, 4 questions a visit, two results. */
export const BAND_SIZE = 100;
export const START_BAND = 6; // band 7 of 30: the first HSK 3 band, just past what a P2 child usually reads
export const PER_VISIT = 4;
export const MAX_QUESTIONS = 40;
export const WARMUP = 3; // easy reading questions first, so a nervous start doesn't skew the result
export const LOW_START = 2; // band 3: where the walk starts when the warm-up went badly (at most 1 of 3 right)

export type Style = 'read' | 'listen' | 'real' | 'fill' | 'fit'; // 读一读 听一听 真的假的 补一补 选一选
export const READING_STYLES: Style[] = ['read', 'listen', 'real', 'fill'];

export interface WalkAnswer { band: number; style: Style; wordId: string; correct: boolean }

/** 真的假的 is a two-way guess, so it counts half: a child who guesses instead of tapping 不知道 isn't placed high by luck. */
export const weightOf = (style: Style) => (style === 'real' ? 0.5 : 1);
const share = (xs: WalkAnswer[]) => {
  const total = xs.reduce((n, a) => n + weightOf(a.style), 0);
  return total ? xs.reduce((n, a) => n + (a.correct ? weightOf(a.style) : 0), 0) / total : 0;
};
export interface WalkState {
  band: number;
  warmup: number; // warm-up questions answered (not scored)
  warmRight?: number; // warm-up questions answered right
  visit: WalkAnswer[]; // this visit's answers so far
  answers: WalkAnswer[]; // every scored answer
  visits: Record<number, number>; // completed visits per band
  direction: -1 | 0 | 1; // the last move
  turns: number; // changes of direction: the boundary crossed
  done: boolean;
}

/** The built-in characters in rank order, in bands of 100. */
export function rankBands(words: Word[]): Word[][] {
  const ranked = words.filter((w) => w.source === 'builtin' && w.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const bands: Word[][] = [];
  for (let i = 0; i < ranked.length; i += BAND_SIZE) bands.push(ranked.slice(i, i + BAND_SIZE));
  return bands;
}

export const startWalk = (bandCount: number): WalkState => ({
  band: Math.max(0, Math.min(START_BAND, bandCount - 1)), warmup: 0, visit: [], answers: [], visits: {}, direction: 0, turns: 0, done: bandCount === 0,
});

/** One answer. After a visit of 4: up after 3–4 right, down after 0–1, a second visit after a 2 (then down). Stops at the second turn, after 40 questions, or off either end. */
export function walkStep(s: WalkState, a: Omit<WalkAnswer, 'band'>, bandCount: number): WalkState {
  if (s.done) return s;
  if (s.warmup < WARMUP) {
    const warmRight = (s.warmRight ?? 0) + (a.correct ? 1 : 0);
    const last = s.warmup + 1 === WARMUP;
    // a shaky warm-up starts the walk low: quicker for a beginner, and a guesser isn't carried up by luck
    return { ...s, warmup: s.warmup + 1, warmRight, band: last && warmRight <= 1 ? Math.min(s.band, LOW_START) : s.band };
  }
  const answer = { ...a, band: s.band };
  const visit = [...s.visit, answer];
  const answers = [...s.answers, answer];
  if (visit.length < PER_VISIT) return { ...s, visit, answers, done: answers.length >= MAX_QUESTIONS };
  const right = share(visit) * PER_VISIT; // 0–4, 真的假的 at half weight
  const seen = (s.visits[s.band] ?? 0) + 1;
  const move: -1 | 0 | 1 = right >= 3 ? 1 : right <= 1.5 ? -1 : seen >= 2 ? -1 : 0;
  const turns = s.turns + (move !== 0 && s.direction !== 0 && move !== s.direction ? 1 : 0);
  const band = s.band + move;
  const done = turns >= 2 || answers.length >= MAX_QUESTIONS || band < 0 || band >= bandCount;
  return {
    band: Math.max(0, Math.min(bandCount - 1, band)), warmup: s.warmup, visit: [], answers,
    visits: { ...s.visits, [s.band]: seen }, direction: move === 0 ? s.direction : move, turns, done,
  };
}

/**
 * The two results (spec §19 part 6). Reading holds in a band when 2/3 of its reading-style answers are right; understanding
 * (选一选) when half are. Each level is the highest band that holds; bands below the first one visited count as held.
 * Understanding is never above reading. -1 = none.
 */
export function placementLevels(answers: WalkAnswer[]): { reading: number; understanding: number } {
  const bands = [...new Set(answers.map((a) => a.band))].sort((x, y) => x - y);
  if (!bands.length) return { reading: -1, understanding: -1 };
  const holds = (band: number, fit: boolean, need: number) => {
    const xs = answers.filter((a) => a.band === band && (a.style === 'fit') === fit);
    return xs.length > 0 && share(xs) >= need;
  };
  const top = (fit: boolean, share: number, cap: number) => {
    const held = bands.filter((b) => b <= cap && holds(b, fit, share));
    return held.length ? Math.max(...held) : Math.min(cap, bands[0]! - 1);
  };
  const reading = top(false, 2 / 3, Infinity);
  // a lucky 选一选 in a band he can't read says nothing: understanding looks only at bands he reads
  return { reading, understanding: top(true, 0.5, reading) };
}
