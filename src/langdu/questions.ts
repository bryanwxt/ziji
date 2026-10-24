// 朗读's questions (spec 2026-10-15 §6, 2026-10-24 §5): three a read from a built-in passage's six, varied in kind and never the
// set the read before asked; a parent text's own; the choices shuffled at each showing so the right one's place is never learnt.
import { shuffle, type Rng } from '../lib/random';
import type { AskedQuestion, QuestionKind, ReadingHistory } from '../types';
import { entryOf } from './history';
import type { ReadingPassage } from './pool';

/** The question for this turn: its questions in turn; none when it has none. */
export const questionFor = (qs: readonly AskedQuestion[] | undefined, turn: number): AskedQuestion | undefined => (qs?.length ? qs[turn % qs.length] : undefined);

/** The passage with the question this read asks (history's `q`). */
export function withQuestion<T extends ReadingPassage>(p: T, r: ReadingHistory): T {
  const question = questionFor(p.questions, entryOf(r, p.id).q);
  return question ? { ...p, question } : p;
}

/** Questions a read asks (spec 2026-10-24 §5). */
export const PER_READ = 3;
/** The order a read's questions are asked in: the first is also shown before he reads (「读的时候想一想」), so the deepest
 *  kinds lead and a plain fact comes last. */
export const ASK_ORDER: readonly QuestionKind[] = ['why', 'main', 'order', 'word', 'fact'];
const kindOf = (q: AskedQuestion | undefined): QuestionKind | undefined => (q && 'kind' in q ? q.kind : undefined);

/** Every way to choose `k` of `n` indices, in lexical order. */
function choose(n: number, k: number, from = 0): number[][] {
  if (k === 0) return [[]];
  const out: number[][] = [];
  for (let i = from; i <= n - k; i++) for (const rest of choose(n, k - 1, i + 1)) out.push([i, ...rest]);
  return out;
}

/**
 * This read's questions, as indices into the passage's (spec 2026-10-24 §5): three, at most one `fact`, never the set the
 * previous read asked (`prev`), taking kinds the previous read didn't where it can, then as many different kinds as it can;
 * among sets as good, the read's turn picks, so revisits go round them. Three or fewer (a parent text's, an older two): all.
 * In ASK_ORDER.
 */
export function questionSet(qs: readonly AskedQuestion[], prev: readonly number[] | undefined, turn: number): number[] {
  const byOrder = (s: number[]) => [...s].sort((a, b) => ASK_ORDER.indexOf(kindOf(qs[a])!) - ASK_ORDER.indexOf(kindOf(qs[b])!) || a - b);
  if (qs.length <= PER_READ) return qs.map((_, i) => i);
  const before = new Set((prev ?? []).map((i) => kindOf(qs[i])));
  const same = (s: number[]) => !!prev && prev.length === s.length && s.every((i) => prev.includes(i));
  const sets = choose(qs.length, PER_READ).filter((s) => s.filter((i) => kindOf(qs[i]) === 'fact').length <= 1 && !same(s));
  if (!sets.length) return byOrder(qs.slice(0, PER_READ).map((_, i) => i)); // never with six that pass the content checks
  const score = (s: number[]) => s.filter((i) => !before.has(kindOf(qs[i]))).length * 10 + new Set(s.map((i) => kindOf(qs[i]))).size;
  const top = Math.max(...sets.map(score));
  const best = sets.filter((s) => score(s) === top);
  return byOrder(best[turn % best.length]!);
}

/** The passage with this read's questions (history's last set and turn), and their indices for the history. */
export function withQuestions<T extends ReadingPassage>(p: T, r: ReadingHistory): T & { asked: readonly AskedQuestion[]; askedSet: readonly number[] } {
  const e = entryOf(r, p.id);
  const set = p.questions?.length ? questionSet(p.questions, e.lastSet, e.q) : [];
  return { ...p, asked: set.map((i) => p.questions![i]!), askedSet: set };
}

/** The same question with its choices in a new order (three or four); `answer` follows the right one. */
export function shuffleQuestion<Q extends AskedQuestion>(q: Q, rng: Rng): Q {
  const order = shuffle(q.choices.map((_, i) => i), rng);
  return { ...q, choices: order.map((i) => q.choices[i]!), answer: order.indexOf(q.answer) } as Q;
}
