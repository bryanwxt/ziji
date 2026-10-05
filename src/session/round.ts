// 练一练 (spec 2026-10-05 §3): today's new words and due revision in one mixed round, each word climbing the context
// ladder one rung per appearance, interleaved and spaced, with the question type changing from item to item.
import { shuffle, type Rng } from '../lib/random';
import { TOP_RUNG, type Rung } from './ladder';

/** read: pick the pinyin · listen: hear it, find it · word: the 组词 gap · fit: the sentence gap · usage: 用对了吗. */
export type Ask = 'read' | 'listen' | 'word' | 'fit' | 'usage';
export const ASKS: Record<Rung, Ask[]> = { 1: ['read', 'listen'], 2: ['word'], 3: ['fit', 'usage'] };
/** Which memory card an answer grades (spec §3.5); null = practice only (a retry, or already graded today). */
export type Grades = 'recognise' | 'meaning' | 'use' | null;

export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean }

export interface RoundWord {
  wordId: string;
  isNew: boolean; // introduced in today's 认新字
  from: Rung; // the rung of its first appearance
  appearances: number;
  gradesRecognise: boolean; // its reading card is due today: its first appearance grades it
  gradesMeaning: boolean; // its meaning card is due (or starts) today: its first 词语 question grades it
  early?: boolean; // missed in 认新字: it comes back first
}

const FIRST_GAP = 3; // a word's second appearance comes at least 2 items after its first
const LATER_GAP = 5; // then at least 4 items apart

/** The rungs a word climbs, one per appearance; past the top it goes round the upper rungs again (3, 2, 3…). */
export function climb(from: Rung, n: number): Rung[] {
  return Array.from({ length: n }, (_, i) => {
    let r = from + i;
    while (r > TOP_RUNG) r -= 2;
    return r as Rung;
  });
}

/** The question for a rung, or for the nearest rung below that can be asked of this word (rung 1's reading always can). */
function askFor(wordId: string, rung: Rung, canAsk: (wordId: string, ask: Ask) => boolean, avoid: Ask | null, rng: Rng): { rung: Rung; ask: Ask } {
  for (let r = rung; r >= 1; r--) {
    const options = shuffle(ASKS[r as Rung].filter((a) => canAsk(wordId, a)), rng);
    if (options.length) return { rung: r as Rung, ask: options.find((a) => a !== avoid) ?? options[0]! };
  }
  return { rung: 1, ask: 'read' };
}

export function buildRound(words: RoundWord[], canAsk: (wordId: string, ask: Ask) => boolean, rng: Rng): PracticeItem[] {
  type Slot = { w: RoundWord; rungs: Rung[]; next: number; readyAt: number; meaningDone: boolean };
  const slots: Slot[] = words.filter((w) => w.appearances > 0).map((w) => ({ w, rungs: climb(w.from, w.appearances), next: 0, readyAt: 0, meaningDone: false }));
  // first appearances: words missed in 认新字, then new and revision words taking turns (each in the order given)
  const early = slots.filter((s) => s.w.early);
  const news = slots.filter((s) => s.w.isNew && !s.w.early);
  const revs = slots.filter((s) => !s.w.isNew && !s.w.early);
  // words that need more appearances start sooner, so the round never ends on one word's last items crammed together
  const firsts: Slot[] = [...early, ...[...news, ...revs].sort((a, b) => b.rungs.length - a.rungs.length)];

  const out: PracticeItem[] = [];
  let lastWord: string | null = null;
  let lastAsk: Ask | null = null;
  const left = () => slots.filter((s) => s.next < s.rungs.length);
  while (left().length) {
    const p = out.length;
    const others = left().filter((s) => s.w.wordId !== lastWord);
    // in order of preference: a word already climbing that is due again, then the next first appearance, then whoever is
    // due soonest (spacing gives way before a word repeats back to back), and last of all the same word again
    const started = others.filter((s) => s.next > 0 && s.readyAt <= p).sort((a, b) => a.readyAt - b.readyAt);
    const fresh = firsts.filter((s) => s.next === 0 && s.w.wordId !== lastWord);
    const waiting = others.filter((s) => s.next > 0 && s.readyAt > p).sort((a, b) => a.readyAt - b.readyAt);
    const order = [...started, ...fresh, ...waiting, ...left()];
    const plans = order.map((s) => ({ s, ...askFor(s.w.wordId, s.rungs[s.next]!, canAsk, lastAsk, rng) }));
    // a different word always wins over a different question type; the type changes whenever another word allows it
    const notSame = plans.filter((x) => x.s.w.wordId !== lastWord);
    const pick = notSame.find((x) => x.ask !== lastAsk) ?? notSame[0] ?? plans[0]!;
    const { s, rung, ask } = pick;
    let grades: Grades = null;
    if (s.next === 0 && s.w.gradesRecognise) grades = 'recognise';
    else if (rung === 2 && s.w.gradesMeaning && !s.meaningDone) {
      grades = 'meaning';
      s.meaningDone = true;
    } else if (rung === 3) grades = 'use';
    out.push({ wordId: s.w.wordId, rung, ask, grades, retry: false });
    s.readyAt = p + (s.next === 0 ? FIRST_GAP : LATER_GAP);
    s.next += 1;
    lastWord = s.w.wordId;
    lastAsk = ask;
  }
  return out;
}
