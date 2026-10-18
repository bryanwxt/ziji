import type { Word } from '../types';
import { MEANING_FIXES } from '.';
import { chengyuOf } from './chengyu';
import data from './glossary.json';
import { EXTRA_GLOSS } from './extraExamples';
import { SWEEP_GLOSSES } from './sweepFixes';
import { kidGloss } from './kidGloss';
import { noEnglishQuestion } from './grammarWords';

const entries = (data as { entries: Record<string, string> }).entries;

/** English the dictionary gets wrong or lacks for words a card shows (content sweep, parent 2026-10-05). */
export const GLOSS_FIXES: Record<string, string> = {
  ...SWEEP_GLOSSES,
  车上: 'in the car; on the bus', 不太: 'not very', 很难说: 'hard to say', 送到: 'to deliver to', 姓名: 'full name', 体检: 'health check-up',
  纪录: 'record (a best result)', 二手: 'second-hand',
  衣: 'clothes', 竹: 'bamboo', 犬: 'dog', 鸟: 'bird', 欧: 'Europe; euro', 闲: 'free (not busy); idle', 啡: '(in 咖啡: coffee)',
};
/** The dictionary's notes for scholars, out of a child's card (parent 2026-10-07: 衣 showed "clothes; Kangxi radical 145"): radical
 *  numbers, and the "(abbr. for" / "(variant of" whose Chinese the glossary build cut off. A later sense that was only an
 *  abbreviation goes (麦 "…; mic"); nothing left = no gloss, so the card falls back to the character's own meaning. */
export function cleanGloss(gloss: string): string | undefined {
  const senses = gloss.split(/;\s*/).flatMap((sense, i) => {
    if (/\bradical\b/i.test(sense)) return [];
    const cut = /\s*\((?:abbr\. for|(?:old )?variant of)[^)]*$/i;
    if (!cut.test(sense)) return [sense.trim()];
    if (i > 0 && /abbr\./i.test(sense)) return [];
    const kept = sense.replace(cut, '').trim();
    return kept ? [kept] : [];
  });
  return senses.length ? senses.join('; ') : undefined;
}
const dictionary = (text: string): string | undefined => (entries[text] === undefined ? undefined : cleanGloss(entries[text]));
/** The dictionary's English (cleaned, with the sweep's fixes): the parent's detail, and the fallback beyond his school lists. */
export const dictionaryGloss = (text: string): string | undefined => GLOSS_FIXES[text] ?? dictionary(text) ?? EXTRA_GLOSS[text]; // then the 组词 written for the app
/** English for a character or 词语 wherever the child reads it: its kid gloss (kidGloss.json), else the dictionary's. */
export const glossFor = (text: string): string | undefined => kidGloss(text) ?? dictionaryGloss(text);

/** A built-in word's dictionary meaning: a fixed meaning first (了 le), then its everyday sense at its reading, then the stored
 *  meaning. The parent's detail beside the kid gloss. */
export function dictionaryMeaning(word: Word): string | undefined {
  if (word.source !== 'builtin') return word.meaning ?? chengyuOf(word.text)?.meaning;
  return MEANING_FIXES[word.text] ?? dictionaryGloss(word.text) ?? word.meaning;
}

/** A school or weekly list word's English for a question: its own meaning, the 成语 list's, else its kid gloss (a list saved
 *  before the parent typed one, parent 2026-10-18: 共用). */
const ownMeaning = (word: Word): string | undefined => word.meaning || chengyuOf(word.text)?.meaning || kidGloss(word.text);

/** The English on the 认字 card and everywhere else he reads a word's meaning: a built-in word's kid gloss, else its dictionary
 *  meaning; a school word's own meaning, else the 成语 list's, its kid gloss, the dictionary's. */
export function cardMeaning(word: Word): string | undefined {
  if (word.source !== 'builtin') return ownMeaning(word) ?? dictionaryGloss(word.text);
  return kidGloss(word.text) ?? dictionaryMeaning(word);
}

/**
 * The English an English-meaning question asks (hear, 这个词是什么意思, placement 听一听) or offers as a wrong choice: a built-in
 * word's kid gloss only (never the dictionary's: parent 2026-10-15), a school word's own meaning (else its kid gloss); never a grammar word's
 * (grammarWords.ts). None: the word takes no English question, and its ladder skips the Hear rung.
 */
export function questionMeaning(word: Word): string | undefined {
  if (noEnglishQuestion(word.text)) return undefined;
  return word.source === 'builtin' ? kidGloss(word.text) : ownMeaning(word); // never the dictionary's, as for a built-in word
}
