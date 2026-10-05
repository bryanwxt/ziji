// 成语 questions, rung 5 (spec 2026-10-05 §3.2): complete the 成语, pick it for a sentence, build a sentence with it.
import { BUILTIN, HSK_WORDS } from '../content';
import { CHENGYU, chengyuLevel, chengyuOf, type Idiom } from '../content/chengyu';
import { zujuOf, type ZujuItem } from '../content/zuju';
import { shuffle, type Rng } from '../lib/random';
import type { UseItem } from './useItems';

/** Complete the 成语: `at` is where the answer goes. */
export interface IdiomGap { idiom: Idiom; at: number; answer: string; options: string[] }

const LEVEL = new Map(BUILTIN.map((c) => [c.char, c.level as number]));
let idiomChars: string[] | null = null;
/** Characters from the 成语 list: wrong choices that look like they could belong in one. */
const IDIOM_CHARS = () => (idiomChars ??= [...new Set(CHENGYU.flatMap((c) => Array.from(c.text)))]);

/**
 * The 成语 with one character blanked: `blank` (the word he is practising), or with null a character that appears once.
 * The 3 wrong characters aren't in it, are at most a level above the answer, and never make it another real word.
 */
export function idiomGap(idiom: Idiom, blank: string | null, rng: Rng): IdiomGap | null {
  const chars = Array.from(idiom.text);
  const single = chars.filter((ch) => chars.indexOf(ch) === chars.lastIndexOf(ch));
  const answer = blank ?? shuffle(single, rng)[0];
  if (!answer || !single.includes(answer)) return null;
  const at = chars.indexOf(answer);
  const cap = Math.max(2, (LEVEL.get(answer) ?? 7) + 1);
  const makes = (o: string) => { const t = [...chars]; t[at] = o; const s = t.join(''); return HSK_WORDS.has(s) || !!chengyuOf(s); };
  const wrong = shuffle(IDIOM_CHARS().filter((o) => !chars.includes(o) && (LEVEL.get(o) ?? 99) <= cap && !makes(o)), rng).slice(0, 3);
  if (wrong.length < 3) return null;
  return { idiom, at, answer, options: shuffle([answer, ...wrong], rng) };
}

/** Which 成语 fits the sentence: one of its sentences with it blanked; wrong choices from `others` (his own) first, then the list near its level. */
export function idiomFitItem(idiom: Idiom, others: Idiom[] | null, rng: Rng): Extract<UseItem, { kind: 'fit' }> | null {
  const full = shuffle(idiom.sentences, rng)[0];
  if (!full) return null;
  const at = full.indexOf(idiom.text);
  if (at < 0) return null;
  const level = chengyuLevel(idiom.text);
  const own = [...new Set((others ?? []).map((i) => i.text))].filter((t) => t !== idiom.text);
  const near = CHENGYU.filter((x) => x.text !== idiom.text && !own.includes(x.text) && Math.abs(chengyuLevel(x.text) - level) <= 1).map((x) => x.text);
  const wrong = [...shuffle(own, rng), ...shuffle(near, rng)].slice(0, 3);
  if (wrong.length < 3) return null;
  return { kind: 'fit', wordId: null, word: idiom.text, before: full.slice(0, at), after: full.slice(at + idiom.text.length), options: shuffle([idiom.text, ...wrong], rng) };
}

/** A 组句 from one of its sentences, the 成语 whole in one tile. */
export function idiomZuju(idiom: Idiom, rng: Rng): ZujuItem | null {
  const all = idiom.sentences.map((s) => zujuOf(s, idiom.text)).filter((z): z is ZujuItem => z !== null);
  return all.length ? all[Math.floor(rng() * all.length)]! : null;
}
