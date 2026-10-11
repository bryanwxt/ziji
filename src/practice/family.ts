// 找一家人 (spec 2026-10-12 §5): two words of the character's family among four that hold a look-alike or sound-alike instead.
import { BUILTIN, builtinReading } from '../content';
import { familyOf, wordsAround, type FamilyWord } from '../content/family';
import { glossFor } from '../content/glossary';
import { charsContaining, lookAlikeChars } from '../activities/components/zibian';
import { toneless } from '../activities/flashcards/tones';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

export interface FamilyDistractor extends FamilyWord { swap: string } // swap: the look-alike it holds instead
export interface FamilyBoard { ch: string; family: FamilyWord[]; distractors: FamilyDistractor[]; tiles: string[] }

const levelOf = new Map(BUILTIN.map((c) => [c.char, c.level]));
let bySound: Map<string, string[]> | null = null;
/** Built-in characters read the same, tones aside (生 → 声 升…). */
function soundAlikes(ch: string): string[] {
  if (!bySound) {
    bySound = new Map();
    for (const c of BUILTIN) { const s = toneless(builtinReading(c)); (bySound.get(s) ?? bySound.set(s, []).get(s)!).push(c.char); }
  }
  const own = BUILTIN.find((c) => c.char === ch);
  return own ? bySound.get(toneless(builtinReading(own)))!.filter((c) => c !== ch) : [];
}

/** What he might take for `ch`: characters with it inside (星), its look-alikes, then its sound-alikes — at most two levels above it. */
function swapsFor(ch: string): string[] {
  const top = (levelOf.get(ch) ?? 7) + 2;
  return [...new Set([...charsContaining(ch), ...lookAlikeChars(ch), ...soundAlikes(ch)])].filter((x) => x !== ch && (levelOf.get(x) ?? 9) <= top);
}

/**
 * Four real words with English that hold a look-alike instead of `ch` (never `ch`): ones he can read and one per look-alike first.
 * They come from `wordsAround(swap)`, so each already passed `suitableExample` for its swap (never a dropped word, one syllable
 * per character, the swap at its card's reading).
 */
export function familyDistractors(ch: string, readable: ReadonlySet<string>): FamilyDistractor[] {
  const pool: (FamilyDistractor & { readable: boolean })[] = [];
  for (const swap of swapsFor(ch)) {
    for (const { text, pinyin } of wordsAround(swap)) {
      const en = glossFor(text);
      if (!en || text.includes(ch) || pool.some((x) => x.text === text)) continue;
      pool.push({ text, pinyin, en, swap, readable: Array.from(text).every((c) => c === swap || readable.has(c)) });
    }
  }
  const out: (typeof pool)[number][] = [];
  const take = (ok: (x: (typeof pool)[number]) => boolean) => { for (const x of pool) if (out.length < 4 && !out.includes(x) && ok(x)) out.push(x); };
  take((x) => x.readable && !out.some((o) => o.swap === x.swap));
  take((x) => x.readable);
  take((x) => !out.some((o) => o.swap === x.swap));
  take(() => true);
  return out.map(({ text, pinyin, en, swap }) => ({ text, pinyin, en, swap }));
}

/** A board for a single character with two or more family words he reads and four distractors; else null. */
export function familyBoard(word: Word, readable: ReadonlySet<string>, rng: Rng): FamilyBoard | null {
  if (Array.from(word.text).length !== 1) return null;
  const family = familyOf(word.text, readable);
  if (family.length < 2) return null;
  const distractors = familyDistractors(word.text, readable);
  if (distractors.length < 4) return null;
  const two = shuffle(family.slice(0, 4), rng).slice(0, 2);
  return { ch: word.text, family: two, distractors, tiles: shuffle([...two, ...distractors].map((x) => x.text), rng) };
}
