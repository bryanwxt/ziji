import { firstSense, meaningChoices, pickPinyinDistractors } from '../activities/flashcards/distractors';
import { schoolTerm } from '../content';
import { cardMeaning } from '../content/glossary';
import { ladderWords } from '../content/ladder';
import { canAskRung } from '../ladder/rungs';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';
import { TERMS, type Style } from './walk';

/**
 * One placement question (spec 2026-10-14). charId: the term character it uses (a 词语 heard uses its newest character), so no
 * character is asked twice. The right answer is never shown as right or wrong to the child (§14).
 */
export type PlacementQuestion =
  | { style: 'read'; wordId: string; charId: string; text: string; answer: string; options: string[] } // 读一读: the character → its pinyin
  | { style: 'hear'; wordId: string; charId: string; text: string; answer: string; options: string[] }; // 听一听: Truffle says a word → pick its meaning

/** Each term's characters: the built-in characters first read in it (taughtAt), in book order. */
export function termWords(words: Word[]): Word[][] {
  const chars = words.filter((w) => w.source === 'builtin' && Array.from(w.text).length === 1).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  return TERMS.map((t) => chars.filter((w) => schoolTerm(w.text) === t));
}

/** A term's 3 styles: with a voice 2 读一读 and 1 听一听 in a random order; without, 3 读一读. The one more on a 2 of 3 is a 读一读. */
export const termStyles = (canHear: boolean, rng: Rng): Style[] => (canHear ? shuffle<Style>(['read', 'read', 'hear'], rng) : ['read', 'read', 'read']);

export function buildQuestion(style: Style, word: Word, pool: Word[], rng: Rng, charId = word.id): PlacementQuestion | null {
  if (style === 'read') {
    const wrong = pickPinyinDistractors(word, pool, rng);
    return wrong.length >= 3 ? { style, wordId: word.id, charId, text: word.text, answer: word.pinyin, options: shuffle([word.pinyin, ...wrong.slice(0, 3)], rng) } : null;
  }
  const options = canAskRung(word, 'hear') ? meaningChoices(word, pool, rng) : null;
  return options ? { style, wordId: word.id, charId, text: word.text, answer: firstSense(cardMeaning(word)!), options } : null;
}

/** Words to hear for a term's characters: each character, and the ladder 词语 it completes (a 词语's rank is its newest character's + k/1000). */
function hearable(chars: Word[]): { word: Word; charId: string }[] {
  const byRank = new Map(chars.map((w) => [w.rank, w.id]));
  const words = ladderWords().flatMap((w) => { const id = byRank.get(Math.floor(w.rank!)); return id ? [{ word: w, charId: id }] : []; });
  return [...chars.map((w) => ({ word: w, charId: w.id })), ...words];
}

/**
 * A question of `style` on an untested character of the term, picked at random. A term run short (never in practice: each term
 * has 150+ characters and is asked at most 4) borrows the nearest term's untested characters. 读一读 is the fallback style.
 */
export function nextQuestion(terms: Word[][], term: number, style: Style, pool: Word[], rng: Rng, used: ReadonlySet<string>): PlacementQuestion {
  const near = terms.map((_, i) => i).sort((a, b) => Math.abs(a - term) - Math.abs(b - term) || a - b);
  for (const t of near) {
    const fresh = terms[t]!.filter((w) => !used.has(w.id));
    if (!fresh.length) continue;
    const tries = style === 'hear' ? hearable(fresh) : fresh.map((w) => ({ word: w, charId: w.id }));
    for (const { word, charId } of shuffle(tries, rng).slice(0, 25)) {
      const q = buildQuestion(style, word, pool, rng, charId);
      if (q) return q;
    }
    for (const w of shuffle(fresh, rng)) {
      const q = buildQuestion('read', w, pool, rng);
      if (q) return q;
    }
  }
  const w = terms[term]![0] ?? pool[0]!; // every character asked: cannot happen within 15 questions
  return { style: 'read', wordId: w.id, charId: w.id, text: w.text, answer: w.pinyin, options: [w.pinyin] };
}
