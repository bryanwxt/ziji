// 说一句 (production practice spec §4): the model sentence for a word, and the short frame he says his own sentence on.
import { HSK_WORDS } from './index';
import { bankFor, fillGap } from './sentenceBank';

/** The model sentence: the word's first sentence-bank gap with the word in it; null for a word the bank doesn't have. */
export function sentenceExample(text: string): string | null {
  const bank = bankFor(text);
  return bank ? fillGap(bank.gaps[0], bank.word) : null;
}

/** Punctuation that ends what comes after the word (it never makes a frame go on). */
const TRAILING = /[。！？!?.，,、；;：:]+$/u;

/**
 * The frame (「我们…计划…」): the example with the word kept and the rest blanked. What comes before the word stays when it is
 * two characters or fewer (今天很…); longer, only its first word does (the longest of 3 or 2 characters that is an HSK word, else
 * its first character), then 「…」. 「…」 after the word stands for anything that follows it.
 */
export function sentencePattern(example: string, word: string): string {
  const at = example.indexOf(word);
  if (at < 0) return word;
  const before = Array.from(example.slice(0, at));
  const after = example.slice(at + word.length).replace(TRAILING, '');
  const firstWord = [3, 2].find((n) => before.length > n && HSK_WORDS.has(before.slice(0, n).join(''))) ?? 1;
  const lead = before.length <= 2 ? before.join('') : `${before.slice(0, firstWord).join('')}…`;
  return `${lead}${word}${after ? '…' : ''}`;
}
