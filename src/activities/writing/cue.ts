import type { Example, Word } from '../../types';
import { syllableTone } from '../flashcards/distractors';
import { KID_MEANING } from './meanings';
import { meaningCue } from '../flashcards/meaning';

export interface WritingCue {
  meaning: string | null; // first sense only: "son, child" → "son"
  blanked: string | null; // an example word with the target hidden: 儿子 → ＿子
  blankedPy: string | null; // its remaining syllables as said in that word: zi, not zǐ
  speech: string; // 儿，儿子的儿 — how a teacher names the character in 听写
  sentence: string | null; // the word in use with a gap for each character: 这个书包＿大。 (his class sentence, else the bank's)
}

/** What tells a child which character to write when several share the same sound. */
/** The example word to show for a character: one that uses this reading, preferring one where it appears once. */
export function pickExample(word: Word): { example: Example; once: boolean } | null {
  const usable = (word.examples ?? []).filter((e) => e.text.length > word.text.length && e.text.includes(word.text) && sameReading(e, word));
  const once = usable.find((e) => e.text.split(word.text).length === 2);
  const example = once ?? usable[0];
  return example ? { example, once: !!once } : null;
}

export function writingCue(word: Word): WritingCue {
  const meaning = kidMeaning(word);
  // More than the pinyin (parent, 2026-10-04): a sentence that uses the word, with a gap for it, said in full after the word.
  const cue = meaningCue(word, 1);
  if (cue && cue.kind === 'sentence') {
    return { meaning, blanked: null, blankedPy: null, speech: `${word.text}，${cue.full}`, sentence: cue.before + '＿'.repeat(Array.from(word.text).length) + cue.after };
  }
  const picked = pickExample(word);
  if (!picked) return { meaning, blanked: null, blankedPy: null, speech: word.text, sentence: null };
  const { example, once } = picked;
  const speech = `${word.text}，${example.text}的${word.text}`;
  if (!once) return { meaning, blanked: null, blankedPy: null, speech, sentence: null }; // 爸爸 → two empty boxes would tell him nothing
  return {
    meaning,
    blanked: example.text.split(word.text).join('＿'.repeat(word.text.length)),
    blankedPy: blankedSyllables(example.text, example.pinyin, word.text),
    speech,
    sentence: null,
  };
}

/** The first sense, unless it misleads (curated), is a grammar label, or is too long to read at a glance. */
function kidMeaning(word: Word): string | null {
  if (word.text in KID_MEANING) return KID_MEANING[word.text]!;
  const first = word.meaning?.split(/[,;，；]/)[0]?.trim();
  if (!first || /particle|marker|measure word|classifier|surname|\(|\?/i.test(first) || first.split(/\s+/).length > 3) return null;
  return first.replace(/^to /, '');
}

/** Does the example say the character the way the prompt does? A neutral tone of the same syllable counts (儿子 zi for 子 zǐ). */
function sameReading(e: Example, word: Word): boolean {
  const syl = e.pinyin.trim().split(/\s+/);
  const want = word.pinyin.trim().split(/\s+/);
  const at = e.text.indexOf(word.text);
  if (syl.length !== [...e.text].length || at < 0) return true; // can't line them up: trust the data
  return want.every((w, j) => {
    const got = syl[at + j];
    if (!got) return false;
    if (got === w) return true;
    const a = syllableTone(got), b = syllableTone(w);
    return a.base === b.base && a.tone === 5;
  });
}

/** The example's syllables minus the hidden character's, or null when they don't line up one per character. */
function blankedSyllables(text: string, py: string, target: string): string | null {
  const chars = [...text];
  const syl = py.trim().split(/\s+/);
  if (syl.length !== chars.length) return null;
  const hidden = new Set<number>();
  for (let i = text.indexOf(target); i >= 0; i = text.indexOf(target, i + target.length)) {
    for (let j = 0; j < target.length; j++) hidden.add(i + j);
  }
  return syl.filter((_, i) => !hidden.has(i)).join(' ');
}
