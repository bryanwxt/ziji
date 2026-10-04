import type { Word } from '../../types';

export interface MeaningCue {
  full: string;
  pinyin: string;
  before: string;
  after: string;
}

/** 组词 as the meaning cue: the first longer example containing the word, with the word blanked. Never English (spec §19). */
export function meaningCue(word: Word): MeaningCue | null {
  const ex = (word.examples ?? []).find((e) => e.text.length > word.text.length && e.text.includes(word.text));
  if (!ex) return null;
  const at = ex.text.indexOf(word.text);
  return { full: ex.text, pinyin: ex.pinyin, before: ex.text.slice(0, at), after: ex.text.slice(at + word.text.length) };
}
