import { HSK_WORDS } from '../../content';
import { shuffle, type Rng } from '../../lib/random';
import { toneless } from './tones';
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

/** Same-sound choices (same syllable first, then same initial), minus any that would make a real word with the cue. */
export function pickSoundAlikes(word: Word, cue: MeaningCue, pool: Word[], rng: Rng, n = 3): string[] {
  const sound = toneless(word.pinyin);
  const initial = sound.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?/)![0];
  const fits = (t: string) => HSK_WORDS.has(cue.before + t + cue.after);
  const eligible = pool.filter((w) => w.text.length === word.text.length && w.text !== word.text && !fits(w.text));
  // Around his word's own level first (a level-1 word doesn't get HSK 7–9 choices), then any level.
  const near = eligible.filter((w) => (w.level ?? 7) <= (word.level ?? 7) + 1);
  const sameSound = (list: Word[]) => list.filter((w) => toneless(w.pinyin) === sound);
  const sameInitial = (list: Word[]) => list.filter((w) => toneless(w.pinyin).startsWith(initial || '\u0000'));
  const tiers = [sameSound(near), sameInitial(near), near, sameSound(eligible), eligible];
  const out: string[] = [];
  for (const tier of tiers) for (const w of shuffle(tier, rng)) { if (out.length >= n) return out; if (!out.includes(w.text)) out.push(w.text); }
  return out;
}
