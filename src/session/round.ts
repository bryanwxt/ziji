// 练一练 (spec 2026-10-05 §3): today's new words and due revision in one mixed round, each word climbing the context
// ladder one rung per appearance, interleaved and spaced, with the question type changing from item to item.
import { shuffle, type Rng } from '../lib/random';
import { TOP_RUNG, type Rung } from './ladder';

/** read: pick the pinyin · listen: hear it, find it · word: the 组词 gap · pair: join 组词 halves · match: join 搭配 ·
 *  whole: complete a school 成语 itself (its 词语 rung) · fit: the sentence gap · usage: 用对了吗 · build: 组句 tiles ·
 *  idiom: complete a 成语 that uses the word · idiomFit: pick that 成语 for a sentence · idiomBuild: 组句 with it ·
 *  fish: 钓鱼 for a look-alike he confused (not a rung). */
export type Ask = 'read' | 'listen' | 'hear' | 'meaningRead' | 'word' | 'pair' | 'match' | 'whole' | 'fit' | 'usage' | 'build' | 'idiom' | 'idiomFit' | 'idiomBuild' | 'fish';
export const ASKS: Record<Rung, Ask[]> = {
  1: ['read', 'listen', 'hear', 'meaningRead'], // hear / meaningRead: the word ladder's English meaning (spec 2026-10-06 §3.2)
  2: ['word', 'pair', 'match', 'whole'],
  3: ['fit', 'usage'],
  4: ['build'],
  5: ['idiom', 'idiomFit', 'idiomBuild'],
};
/** Which memory card an answer grades (spec §3.5); null = practice only (a retry, or already graded today). */
export type Grades = 'recognise' | 'meaning' | 'use' | 'hear' | null;

/** due: the first appearance of a word whose revision is due today (pacing counts these when time runs out, spec §2.2). */
export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean; due?: boolean; missed?: boolean; idiom?: string } // missed: it came back after a wrong answer (Truffle peeks); idiom: the 成语 a missed rung-5 question asked

export interface RoundWord {
  wordId: string;
  isNew: boolean; // introduced in today's 认新字
  from: Rung; // the rung of its first appearance
  appearances: number;
  gradesRecognise: boolean; // its reading card is due today: its first appearance grades it
  gradesMeaning: boolean; // its meaning card is due (or starts) today: its first 词语 question grades it
  early?: boolean; // missed in 认新字: it comes back first
  gradesHear?: boolean; // its hear card is due today: its first appearance is asked by ear and grades it (spec 2026-10-06 §3.2)
  due?: boolean; // its reading or meaning card is due today (not a meaning start): it starts before words that only start meaning practice
}

const FIRST_GAP = 3; // a word's second appearance comes at least 2 items after its first
const LATER_GAP = 5; // then at least 4 items apart

/** The rungs a word climbs, one per appearance; past the top it goes round the upper rungs again (3, 4, 5, 3…). */
export function climb(from: Rung, n: number): Rung[] {
  return Array.from({ length: n }, (_, i) => {
    let r = from + i;
    while (r > TOP_RUNG) r -= 3;
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
  // words that need more appearances start sooner, so the round never ends on one word's last items crammed together;
  // due revision starts before words only starting meaning practice, so time running out never leaves the due ones behind
  const most = (list: Slot[]) => [...list].sort((a, b) => b.rungs.length - a.rungs.length);
  const firsts: Slot[] = [...early, ...most([...news, ...revs.filter((s) => s.w.due)]), ...most(revs.filter((s) => !s.w.due))];

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
    // a due Read card is graded by reading: its first appearance is never asked by ear (final review I2)
    const noEar = (id: string, a: Ask) => a !== 'hear' && canAsk(id, a);
    const plans = order.map((s) => (s.next === 0 && s.w.gradesHear && canAsk(s.w.wordId, 'hear') ? { s, rung: 1 as Rung, ask: 'hear' as Ask } : { s, ...askFor(s.w.wordId, s.rungs[s.next]!, s.next === 0 && s.w.gradesRecognise && !s.w.gradesHear ? noEar : canAsk, lastAsk, rng) }));
    // a different word always wins over a different question type; the type changes whenever another word allows it
    const notSame = plans.filter((x) => x.s.w.wordId !== lastWord);
    const pick = notSame.find((x) => x.ask !== lastAsk) ?? notSame[0] ?? plans[0]!;
    const { s, rung, ask } = pick;
    let grades: Grades = null;
    if (s.next === 0 && s.w.gradesHear && ask === 'hear') grades = 'hear';
    else if (s.next === 0 && s.w.gradesRecognise) grades = 'recognise';
    else if (ask === 'idiomBuild') grades = 'use'; // a 组句 is a use question on any rung
    else if ((rung === 2 || rung === 5) && s.w.gradesMeaning && !s.meaningDone) {
      grades = 'meaning'; // 词语 and 成语 grade meaning (spec §3.5)
      s.meaningDone = true;
    } else if (rung === 3 || rung === 4) grades = 'use';
    out.push({ wordId: s.w.wordId, rung, ask, grades, retry: false, ...(s.next === 0 && s.w.due ? { due: true } : {}) });
    s.readyAt = p + (s.next === 0 ? FIRST_GAP : LATER_GAP);
    s.next += 1;
    lastWord = s.w.wordId;
    lastAsk = ask;
  }
  return out;
}
