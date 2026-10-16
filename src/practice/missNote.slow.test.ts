// The miss sheet names what he picked in English (parent 2026-10-16: "when a wrong answer is given sometimes the English
// meaning is not shown beside the wrong words"). A sweep over the real content: for every 练一练 question the app can build
// for every word, every wrong choice gets English on the sheet wherever one exists or can be made. Gaps are listed by type.
// The questions built for every word (slow); missNote.test.ts sweeps the content the other questions draw on.
import { describe, expect, it } from 'vitest';
import { builtinWords, schoolTerm } from '../content';
import { questionMeaning } from '../content/glossary';
import { ladderWords } from '../content/ladder';
import { meaningCue, pickSoundAlikes, wordCue } from '../activities/flashcards/meaning';
import { firstSense, MANY_WRONG, meaningChoices, pickCharacterDistractors, pickLookAlikes, pickPinyinDistractors } from '../activities/flashcards/distractors';
import { soundParts } from '../activities/flashcards/pinyinTraps';
import { mulberry32 } from '../lib/random';
import type { Word } from '../types';
import { cuePickNote, meaningPickNote, pickedNote, pinyinPickNote } from './missNote';

const school = builtinWords(0).filter((w) => schoolTerm(w.text));
const words: Word[] = [...school, ...ladderWords()];
const pool = words;
const rngFor = (w: Word) => mulberry32(w.text.codePointAt(0)! * 31 + Array.from(w.text).length);

/** Gaps by the choice that has none, each with the word whose question offered it. */
function sweep(each: (add: (choice: string, word: string) => void) => void): string[] {
  const gaps = new Map<string, string>();
  each((choice, word) => { if (!gaps.has(choice)) gaps.set(choice, word); });
  return [...gaps].map(([c, w]) => `${c} (${w})`);
}
const english = (picked: string) => pickedNote(picked, pool)?.en;

describe('every wrong pick has English on the miss sheet (sweep of the real content)', { timeout: 120_000 }, () => {
  it('找字 listen: each look-alike character he can pick', () => {
    expect(sweep((add) => {
      for (const w of words) {
        const rng = rngFor(w);
        const five = pickLookAlikes(w, pool, rng);
        for (const x of five.length ? five : pickCharacterDistractors(w, pool, rng)) if (!english(x.text)) add(x.text, w.text);
      }
    })).toEqual([]);
  });

  it('读音 read: a pinyin choice that is another character or word names it, with its English', () => {
    expect(sweep((add) => {
      for (const w of words) {
        for (const py of pickPinyinDistractors(w, pool, rngFor(w), MANY_WRONG)) {
          // it belongs to something: one of his words is read so, or (a single character) a part of it is
          const owned = pool.some((x) => x.pinyin === py && x.text !== w.text) || (Array.from(w.text).length === 1 && soundParts(w.text).some((p) => p.reading === py));
          if (!owned) continue;
          const note = pinyinPickNote(w, py, pool);
          if (!note) add(py, w.text);
          else if (!note.en && pool.some((x) => x.text === note.zh)) add(`${py} → ${note.zh}`, w.text); // one of his words always has English
        }
      }
    })).toEqual([]);
  });

  it('意思 meaning (heard or read): each wrong English meaning names its Chinese word', () => {
    expect(sweep((add) => {
      for (const w of words) {
        const answer = questionMeaning(w) && firstSense(questionMeaning(w)!);
        for (const en of meaningChoices(w, pool, rngFor(w)) ?? []) {
          if (en === answer) continue;
          const note = meaningPickNote(en, w, pool);
          if (!note || note.en !== en || note.zh === w.text) add(en, w.text);
        }
      }
    })).toEqual([]);
  });

  it('组词 cue and sentence cue (and 选一选): each wrong character or word, not the made-up word it makes', () => {
    expect(sweep((add) => {
      for (const w of words) {
        for (const cue of [meaningCue(w, 0), meaningCue(w, 1), wordCue(w)]) {
          if (!cue) continue;
          for (const c of cue.wrong ?? pickSoundAlikes(w, cue, pool, rngFor(w), MANY_WRONG)) if (!cuePickNote(cue, c, pool)?.en) add(c, w.text);
        }
      }
    })).toEqual([]);
  });
});
