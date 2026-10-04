import { pickCharacterDistractors, pickPinyinDistractors } from '../activities/flashcards/distractors';
import { fillChoices, lookAlikeChars } from '../activities/components/zibian';
import { BUILTIN, HSK_WORDS, wordsWithChar } from '../content';
import { shuffle, type Rng } from '../lib/random';
import { fitItem, type UseItem } from '../practice/useItems';
import type { Word } from '../types';
import { READING_STYLES, type Style } from './walk';

/** One placement question (spec §19 part 6). The right answer is never shown as right or wrong to the child (§14). */
export type PlacementQuestion =
  | { style: 'read'; wordId: string; text: string; answer: string; options: string[] } // 读一读: the character → its pinyin
  | { style: 'listen'; wordId: string; text: string; options: string[] } // 听一听: Truffle says it → pick it
  | { style: 'real'; wordId: string; shown: string; real: boolean } // 真的假的: a real word or a made-up look-alike
  | { style: 'fill'; wordId: string; word: string; index: number; answer: string; options: string[] } // 补一补
  | { style: 'fit'; wordId: string; item: Extract<UseItem, { kind: 'fit' }> }; // 选一选

const LEVEL = new Map(BUILTIN.map((c) => [c.char, c.level]));

/** A two-character HSK word with the character, at most a level above it, easiest first; else one of its own 组词 that is an HSK word. */
function partnerWord(w: Word): string | undefined {
  const near = wordsWithChar(w.text)
    .filter((t) => Array.from(t).length === 2 && (HSK_WORDS.get(t) ?? 9) <= (w.level ?? 7) + 1)
    .sort((a, b) => (HSK_WORDS.get(a) ?? 9) - (HSK_WORDS.get(b) ?? 9))[0];
  return near ?? w.examples?.map((e) => e.text).find((t) => Array.from(t).length === 2 && HSK_WORDS.has(t));
}

export function buildQuestion(style: Style, word: Word, pool: Word[], rng: Rng): PlacementQuestion | null {
  switch (style) {
    case 'read': {
      const wrong = pickPinyinDistractors(word, pool, rng);
      return wrong.length >= 3 ? { style, wordId: word.id, text: word.text, answer: word.pinyin, options: shuffle([word.pinyin, ...wrong.slice(0, 3)], rng) } : null;
    }
    case 'listen': {
      const wrong = pickCharacterDistractors(word, pool, rng);
      return wrong.length >= 3 ? { style, wordId: word.id, text: word.text, options: shuffle([word.text, ...wrong.slice(0, 3).map((w) => w.text)], rng) } : null;
    }
    case 'real': {
      const real = partnerWord(word);
      if (!real) return null;
      const chars = Array.from(real);
      const k = chars[0] === word.text ? 1 : 0; // the other character becomes a look-alike
      // a look-alike near the word's level: a rare character would give the made-up word away
      const near = lookAlikeChars(chars[k]!).filter((c) => (LEVEL.get(c) ?? 9) <= (word.level ?? 7) + 1);
      const fake = shuffle(near, rng).map((c) => chars.map((x, i) => (i === k ? c : x)).join('')).find((t) => !HSK_WORDS.has(t));
      const showReal = !fake || rng() < 0.5;
      return { style, wordId: word.id, shown: showReal ? real : fake, real: showReal };
    }
    case 'fill': {
      const w2 = partnerWord(word);
      if (!w2) return null;
      const chars = Array.from(w2);
      const index = chars.indexOf(word.text);
      const options = fillChoices(chars, index, rng);
      return options ? { style, wordId: word.id, word: w2, index, answer: word.text, options } : null;
    }
    case 'fit': {
      const item = fitItem(word, pool, rng);
      return item && item.kind === 'fit' ? { style, wordId: word.id, item } : null;
    }
  }
}

/** A visit's 4 styles: three reading styles and one 选一选, never the same style twice in a row; 听一听 only with a voice. */
export function visitStyles(prev: Style | null, canListen: boolean, rng: Rng): Style[] {
  const reading = READING_STYLES.filter((s) => canListen || s !== 'listen');
  for (let tries = 0; tries < 50; tries++) {
    const v = shuffle([...shuffle(reading, rng).slice(0, 3), 'fit' as Style], rng);
    const all = prev ? [prev, ...v] : v;
    if (all.every((s, i) => i === 0 || s !== all[i - 1])) return v;
  }
  return prev === 'fit' ? ['read', 'fit', 'real', 'fill'] : ['fit', 'read', 'real', 'fill'];
}

/** A question of `style` from the band, its words in a random order, skipping words asked already; 读一读 is the fallback. */
export function nextQuestion(band: Word[], style: Style, pool: Word[], rng: Rng, used: ReadonlySet<string>): PlacementQuestion {
  const fresh = shuffle(band.filter((w) => !used.has(w.id)), rng);
  const words = fresh.length ? fresh : shuffle(band, rng);
  for (const w of words.slice(0, 25)) {
    const q = buildQuestion(style, w, pool, rng);
    if (q) return q;
  }
  for (const w of words) {
    const q = buildQuestion('read', w, pool, rng);
    if (q) return q;
  }
  const w = words[0]!;
  return { style: 'read', wordId: w.id, text: w.text, answer: w.pinyin, options: [w.pinyin] };
}
