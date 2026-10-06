import type { Word } from '../types';

/** The adaptive placement check (spec §19 part 6): 30 bands of 100 characters, 4 questions a visit, two results. */
export const BAND_SIZE = 100;
export const START_BAND = 6; // band 7 of 30: with school order (MOE 2.0 lists), late 二上/二下 — where a P2 child is in his books
export const PER_VISIT = 4;
export const MAX_QUESTIONS = 40;
export const WARMUP = 3; // easy reading questions first, so a nervous start doesn't skew the result
export const LOW_START = 2; // band 3 (一上/一下 in school order): where the walk starts when the warm-up went badly (at most 1 of 3 right)
/** 不知道 this many times in a row ends the visit as a miss; each further one steps down at once (parent, 2026-10-05). */
export const DONT_KNOW_RUN = 3;

export type Style = 'read' | 'hear' | 'fill' | 'fit'; // 读一读 听一听 补一补 选一选; 听一听 = hear a word, pick its meaning (spec 2026-10-06 §3.5) (真的假的 was dropped: a 50/50 guess, and odd to the parent)
export const READING_STYLES: Style[] = ['read', 'fill'];

export interface WalkAnswer { band: number; style: Style; wordId: string; correct: boolean; dontKnow?: boolean } // dontKnow: he tapped 不知道 (a miss, said honestly)

const share = (xs: WalkAnswer[]) => (xs.length ? xs.filter((a) => a.correct).length / xs.length : 0);
export interface WalkState {
  band: number;
  warmup: number; // warm-up questions answered (not scored)
  warmRight?: number; // warm-up questions answered right
  warmDontKnow?: number; // warm-up questions answered 不知道
  dontKnowRun?: number; // 不知道 in a row, now
  visit: WalkAnswer[]; // this visit's answers so far
  answers: WalkAnswer[]; // every scored answer
  visits: Record<number, number>; // completed visits per band
  direction: -1 | 0 | 1; // the last move
  turns: number; // changes of direction: the boundary crossed
  done: boolean;
}

/** A band's HSK level (that of its last character): 1–6, or 7 for 七—九级. */
export function bandLevel(bands: Word[][], band: number): number {
  return bands[Math.max(0, Math.min(band, bands.length - 1))]?.at(-1)?.level ?? 1;
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
    const warmDontKnow = (s.warmDontKnow ?? 0) + (a.dontKnow ? 1 : 0);
    const last = s.warmup + 1 === WARMUP;
    // a shaky warm-up starts the walk low: quicker for a beginner, and a guesser isn't carried up by luck; all 不知道: the first band
    const band = !last ? s.band : warmDontKnow === WARMUP ? 0 : warmRight <= 1 ? Math.min(s.band, LOW_START) : s.band;
    return { ...s, warmup: s.warmup + 1, warmRight, warmDontKnow, band };
  }
  const answer = { ...a, band: s.band };
  const visit = [...s.visit, answer];
  const answers = [...s.answers, answer];
  const dontKnowRun = a.dontKnow ? (s.dontKnowRun ?? 0) + 1 : 0; // a guess, right or wrong, breaks the run
  const lost = dontKnowRun >= DONT_KNOW_RUN; // he keeps saying he doesn't know: down now, not after the rest of the visit
  if (!lost && visit.length < PER_VISIT) return { ...s, visit, answers, dontKnowRun, done: answers.length >= MAX_QUESTIONS };
  const right = share(visit) * PER_VISIT; // 0–4 right
  const seen = (s.visits[s.band] ?? 0) + 1;
  const move: -1 | 0 | 1 = lost || right <= 1 ? -1 : right >= 3 ? 1 : seen >= 2 ? -1 : 0;
  const turns = s.turns + (move !== 0 && s.direction !== 0 && move !== s.direction ? 1 : 0);
  const band = s.band + move;
  const done = turns >= 2 || answers.length >= MAX_QUESTIONS || band < 0 || band >= bandCount;
  return {
    band: Math.max(0, Math.min(bandCount - 1, band)), warmup: s.warmup, visit: [], answers,
    visits: { ...s.visits, [s.band]: seen }, direction: move === 0 ? s.direction : move, turns, done, dontKnowRun,
  };
}

/**
 * The three results (spec §19 part 6; 2026-10-06 §3.5). Reading holds in a band when 2/3 of its 读一读/补一补 answers are right;
 * understanding (选一选) when half are, never above reading; listening (听一听) when half are, on its own — he may hear more than he
 * reads. Each level is the highest band that holds; bands below the first one visited count as held. -1 = none (no 听一听: -1).
 */
export function placementLevels(answers: WalkAnswer[]): { reading: number; understanding: number; listening: number } {
  const bands = [...new Set(answers.map((a) => a.band))].sort((x, y) => x - y);
  if (!bands.length) return { reading: -1, understanding: -1, listening: -1 };
  const holds = (band: number, g: StyleGroup, need: number) => {
    const xs = answers.filter((a) => a.band === band && styleGroup(a.style) === g);
    return xs.length > 0 && share(xs) >= need;
  };
  const top = (g: StyleGroup, need: number, cap: number) => {
    const held = bands.filter((b) => b <= cap && holds(b, g, need));
    return held.length ? Math.max(...held) : Math.min(cap, bands[0]! - 1);
  };
  const reading = top('read', 2 / 3, Infinity);
  const listening = answers.some((a) => a.style === 'hear') ? top('hear', 0.5, Infinity) : -1;
  // a lucky 选一选 in a band he can't read says nothing: understanding looks only at bands he reads
  return { reading, understanding: top('fit', 0.5, reading), listening };
}

export type StyleGroup = 'read' | 'fit' | 'hear';
/** What an answer measures: reading (读一读, 补一补), understanding (选一选) or listening (听一听). */
export const styleGroup = (s: Style): StyleGroup => (s === 'fit' ? 'fit' : s === 'hear' ? 'hear' : 'read');
