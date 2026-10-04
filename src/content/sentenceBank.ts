import { BANK_1 } from './bank/hsk1';
import { BANK_2 } from './bank/hsk2';
import { BANK_3 } from './bank/hsk3';

/** Sentences written for this app (spec §19 part 4, §20 part 4). Never from class material. */
export type WordType = 'n' | 'v' | 'adj' | 'adv' | 'conj' | 'prep' | 'pron' | 'mw' | 'other';
export interface BankGap { text: string; wrong: [string, string, string] } // text holds ＿ once, where the word goes
export interface BankItem {
  word: string;
  type: WordType;
  gaps: [BankGap, BankGap]; // two fill-the-gap sentences, each with 3 hand-picked wrong choices
  misuse: string; // the word in the wrong frame, for 用对了吗 (hand-written, never generated)
  pair?: string; // a word it often goes with (保持 + 安静)
  clue?: string; // shown after a miss (看'虽然'，后面用'但是')
}

export const BLANK = '＿';
export const fillGap = (gap: BankGap, word: string) => gap.text.replace(BLANK, word);
export const SENTENCE_BANK: readonly BankItem[] = [...BANK_1, ...BANK_2, ...BANK_3];
const BY_WORD = new Map(SENTENCE_BANK.map((i) => [i.word, i]));
export const bankFor = (text: string): BankItem | undefined => BY_WORD.get(text);
