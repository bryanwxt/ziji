// The Understand question (spec 2026-10-06 §3.2): one of the word's sentences, heard; its English among three — the right one,
// the word's other sentence (catching the word alone isn't enough), and a sentence of another word from the same term.
import { inScopeWords, sentencesFor, wordTerm } from '../content/understand';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

export interface UnderstandItem { zh: string; en: string; choices: string[] }

export function understandItem(word: Word, rng: Rng): UnderstandItem | null {
  const own = sentencesFor(word.text);
  if (own.length < 2) return null;
  const pick = Math.floor(rng() * own.length);
  const right = own[pick]!;
  const other = own[(pick + 1) % own.length]!;
  if (other.en === right.en) return null;
  const term = wordTerm(word.text);
  const pool = shuffle((term ? inScopeWords(term) : []).filter((w) => w.text !== word.text).flatMap((w) => sentencesFor(w.text)), rng);
  const third = pool.find((s) => s.en !== right.en && s.en !== other.en && !s.zh.includes(word.text));
  if (!third) return null;
  return { zh: right.zh, en: right.en, choices: shuffle([right.en, other.en, third.en], rng) };
}
