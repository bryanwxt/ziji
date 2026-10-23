// Too fast to count (real test spec 2026-10-23 §6): a right tap on a one-tap choice question faster than GUESS_MS from when the
// choices appear is rated Hard, settles no rung, and after the second one in a lesson Truffle says 「慢慢看，想好再点」 once.
import { tooFast } from '../srs/scheduler';
import type { Ask, PracticeItem } from './round';

/** Questions answered by one tap among choices. Not 连一连 (pair, family, a list board), 组句 (build, idiomBuild), Say, 说一句 or 默写. */
const ONE_TAP: ReadonlySet<Ask> = new Set<Ask>(['read', 'listen', 'hear', 'meaningRead', 'word', 'match', 'whole', 'fit', 'usage', 'understand', 'idiom', 'idiomFit', 'fish']);

/** What Truffle says after the second guess of a lesson: no penalty, no timer shown. */
export const GUESS_NUDGE = '慢慢看，想好再点';

/** A right answer too fast to have read the question. Never a wrong one, a board or tiles, or 都不对 picked as the answer. */
export function isGuess(item: PracticeItem, r: { correct: boolean; responseMs: number }): boolean {
  if (!r.correct || !ONE_TAP.has(item.ask) || item.list?.pairs || item.none === 'answer' || item.none === true) return false;
  return tooFast(r.responseMs);
}

/** The lesson's guesses so far and whether Truffle has nudged: after this answer, the new count and whether to nudge now. */
export function afterGuess(seen: { count: number; nudged: boolean }, guess: boolean): { count: number; nudged: boolean; nudge: boolean } {
  if (!guess) return { ...seen, nudge: false };
  const count = seen.count + 1;
  const nudge = count >= 2 && !seen.nudged;
  return { count, nudged: seen.nudged || nudge, nudge };
}
