import { firstSense, meaningChoices, pickPinyinDistractors } from '../activities/flashcards/distractors';
import { fillChoices } from '../activities/components/zibian';
import { HSK_WORDS, wordsWithChar } from '../content';
import { cardMeaning } from '../content/glossary';
import { ladderWords } from '../content/ladder';
import { canAskRung } from '../ladder/rungs';
import { shuffle, type Rng } from '../lib/random';
import { fitItem, type UseItem } from '../practice/useItems';
import type { Word } from '../types';
import { READING_STYLES, type Style } from './walk';

/** One placement question (spec §19 part 6). The right answer is never shown as right or wrong to the child (§14). */
export type PlacementQuestion =
  | { style: 'read'; wordId: string; text: string; answer: string; options: string[] } // 读一读: the character → its pinyin
  | { style: 'hear'; wordId: string; text: string; answer: string; options: string[] } // 听一听: Truffle says a word → pick its meaning (spec 2026-10-06 §3.5)
  | { style: 'fill'; wordId: string; word: string; index: number; answer: string; options: string[] } // 补一补
  | { style: 'fit'; wordId: string; item: Extract<UseItem, { kind: 'fit' }> }; // 选一选


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
    case 'hear': {
      const options = meaningChoices(word, pool, rng);
      return options ? { style, wordId: word.id, text: word.text, answer: firstSense(cardMeaning(word)!), options } : null;
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

/** A band's words to hear: its characters and the 词语 that arrive with them (a ladder word's rank is its last character's + k/1000). */
export function hearBand(band: Word[]): Word[] {
  const ranks = new Set(band.map((w) => w.rank));
  return [...band, ...ladderWords().filter((w) => ranks.has(Math.floor(w.rank!)))].filter((w) => canAskRung(w, 'hear'));
}

/** A visit's 4 styles (spec 2026-10-06 §3.5): with a voice one 听一听, one 选一选 and two of 读一读/补一补; without, one 选一选 and three
 *  reading questions. Never the same style twice in a row, counting the last visit's last style. */
export function visitStyles(prev: Style | null, canHear: boolean, rng: Rng): Style[] {
  const pickReading = () => READING_STYLES[Math.floor(rng() * READING_STYLES.length)]!;
  for (let tries = 0; tries < 200; tries++) {
    const v: Style[] = canHear ? ['hear', 'fit', pickReading(), pickReading()] : ['fit', pickReading(), pickReading(), pickReading()];
    const order = shuffle(v, rng);
    const all = prev ? [prev, ...order] : order;
    if (all.every((s, i) => i === 0 || s !== all[i - 1])) return order;
  }
  if (canHear) return prev === 'read' ? ['fill', 'hear', 'read', 'fit'] : ['read', 'hear', 'fill', 'fit'];
  return prev === 'read' ? ['fill', 'read', 'fit', 'read'] : ['read', 'fill', 'fit', 'read'];
}

/** A question of `style` from the band (听一听: from its words too), in a random order, skipping words asked already; 读一读 is the fallback. */
export function nextQuestion(band: Word[], style: Style, pool: Word[], rng: Rng, used: ReadonlySet<string>): PlacementQuestion {
  const from = style === 'hear' ? hearBand(band) : band;
  const fresh = shuffle(from.filter((w) => !used.has(w.id)), rng);
  const words = fresh.length ? fresh : shuffle(from.length ? from : band, rng);
  for (const w of words.slice(0, 25)) {
    const q = buildQuestion(style, w, pool, rng);
    if (q) return q;
  }
  const reading = shuffle(band, rng);
  for (const w of reading) {
    const q = buildQuestion('read', w, pool, rng);
    if (q) return q;
  }
  const w = reading[0]!;
  return { style: 'read', wordId: w.id, text: w.text, answer: w.pinyin, options: [w.pinyin] };
}
