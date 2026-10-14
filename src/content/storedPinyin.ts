import data from './sentencePinyin.json';

/** Pinyin read in context for each sentence written for the app (scripts/gen-pinyin.ts): one syllable per Han character. */
export const STORED_PINYIN: Readonly<Record<string, string>> = (data as { sentences: Record<string, string> }).sentences;
/** The stored pinyin of a sentence written for the app, if it is one. */
export const storedPinyin = (zh: string): string | undefined => STORED_PINYIN[zh.trim()];
