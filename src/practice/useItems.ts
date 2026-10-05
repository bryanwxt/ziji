import { meaningCue, pickSoundAlikes } from '../activities/flashcards/meaning';
import { bankFor, fillGap } from '../content/sentenceBank';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

/**
 * One "word in use" question (spec §20 part 4): which word fits the sentence (选一选), or which sentence uses the word
 * right (用对了吗). wordId is null for a bank word he doesn't have as a word of his own (practice only, never recorded).
 */
export type UseItem =
  | { kind: 'fit'; wordId: string | null; word: string; before: string; after: string; options: string[]; pair?: string; clue?: string; meaning?: string } // meaning: a school word's own English for the sheet
  | { kind: 'usage'; wordId: string | null; word: string; right: string; wrong: string; pair?: string };

export const fullSentence = (item: UseItem) => (item.kind === 'fit' ? item.before + item.word + item.after : item.right);

/** Which word fits: his class sentence, a bank sentence or a 组词 word, with 3 wrong choices. */
export function fitItem(word: Word, pool: Word[], rng: Rng, variant = 0): UseItem | null {
  const cue = meaningCue(word, variant);
  if (!cue) return null;
  const wrong = cue.wrong ?? pickSoundAlikes(word, cue, pool, rng);
  if (wrong.length < 3) return null;
  return {
    kind: 'fit', wordId: word.id || null, word: word.text, before: cue.before, after: cue.after,
    options: shuffle([word.text, ...wrong.slice(0, 3)], rng), pair: cue.pair ?? word.pairs?.[0], clue: cue.clue, ...(word.meaning && word.source === 'parent' ? { meaning: word.meaning } : {}),
  };
}

/** 用对了吗: the word used right (the bank's second gap) against its hand-written wrong use. Bank words only. */
export function usageItem(word: string, wordId: string | null): UseItem | null {
  const b = bankFor(word);
  return b ? { kind: 'usage', wordId, word, right: fillGap(b.gaps[1], word), wrong: b.misuse, pair: b.pair } : null;
}
