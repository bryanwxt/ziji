// 朗读's meaning questions (spec 2026-10-15 §6): two per passage, asked in turn so a revisit asks the other, the choices shuffled
// at each showing so the right one's place is never learnt.
import { shuffle, type Rng } from '../lib/random';
import type { AskedQuestion, ReadingHistory } from '../types';
import { entryOf } from './history';
import type { ReadingPassage } from './pool';

/** The question for this turn: its questions in turn; none when it has none. */
export const questionFor = (qs: readonly AskedQuestion[] | undefined, turn: number): AskedQuestion | undefined => (qs?.length ? qs[turn % qs.length] : undefined);

/** The passage with the question this read asks (history's `q`). */
export function withQuestion<T extends ReadingPassage>(p: T, r: ReadingHistory): T {
  const question = questionFor(p.questions, entryOf(r, p.id).q);
  return question ? { ...p, question } : p;
}

/** The same question with its choices in a new order (three or four); `answer` follows the right one. */
export function shuffleQuestion<Q extends AskedQuestion>(q: Q, rng: Rng): Q {
  const order = shuffle(q.choices.map((_, i) => i), rng);
  return { ...q, choices: order.map((i) => q.choices[i]!), answer: order.indexOf(q.answer) } as Q;
}
