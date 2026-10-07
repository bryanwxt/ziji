import type { Word } from '../types';
import { MEANING_FIXES } from '.';
import { chengyuOf } from './chengyu';
import data from './glossary.json';
import { EXTRA_GLOSS } from './extraExamples';
import { SWEEP_GLOSSES } from './sweepFixes';

const entries = (data as { entries: Record<string, string> }).entries;

/** A short English gloss for a built-in character or 组词 (from CC-CEDICT, CC BY-SA 4.0), shown on the 认字 card only. */
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
export const glossFor = (text: string): string | undefined => GLOSS_FIXES[text] ?? dictionary(text) ?? EXTRA_GLOSS[text]; // then the 组词 written for the app

/** The character's English on the 认字 card: a fixed meaning first (了 le), then its everyday sense at its reading, then the stored meaning; a school word's own meaning, else the 成语 list's. */
export function cardMeaning(word: Word): string | undefined {
  if (word.source !== 'builtin') return word.meaning ?? chengyuOf(word.text)?.meaning; // a school 成语 in the list
  return MEANING_FIXES[word.text] ?? glossFor(word.text) ?? word.meaning;
}
