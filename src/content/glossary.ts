import type { Word } from '../types';
import { MEANING_FIXES } from '.';
import data from './glossary.json';

const entries = (data as { entries: Record<string, string> }).entries;

/** A short English gloss for a built-in character or 组词 (from CC-CEDICT, CC BY-SA 4.0), shown on the 认字 card only. */
export const glossFor = (text: string): string | undefined => entries[text];

/** The character's English on the 认字 card: a fixed meaning first (了 le), then its everyday sense at its reading, then the stored meaning. */
export function cardMeaning(word: Word): string | undefined {
  if (word.source !== 'builtin') return word.meaning;
  return MEANING_FIXES[word.text] ?? glossFor(word.text) ?? word.meaning;
}
