// What he picked, named on the miss sheet with its English (parent 2026-10-16: "when a wrong answer is given sometimes the
// English meaning is not shown beside the wrong words"). One lookup for every 练一练 choice: a character, a 词语, a 成语, a
// bound character (its pair), a decoy (choiceGloss.ts), a pinyin choice (the character or word read so), an English choice
// (the word it means), 都不对. A made-up 组词 or a pure slip of his own word's sound names nothing.
// Where no line is added, on purpose: a 组句 (build) has no pick, only an order; Understand's choices are English sentences
// already, and the sheet gives the heard sentence with its English; 用对了吗 (usage) picks between two sentences of the same
// word, and the sheet shows the right one; a wrong 连一连 join makes no word, and the sheet lists every 组词 with its English
// (choiceGloss); 找一家人 gives each wrong word its English already (family.ts takes only words that have some).
import { chengyuOf } from '../content/chengyu';
import { CHOICE_GLOSS } from '../content/choiceGloss';
import { dictionaryGloss, questionMeaning } from '../content/glossary';
import { askedAs, boundPair, kidGloss, kidGlossReading } from '../content/kidGloss';
import { wordComponents } from '../content';
import { firstSense } from '../activities/flashcards/distractors';
import type { MeaningCue } from '../activities/flashcards/meaning';
import { soundParts } from '../activities/flashcards/pinyinTraps';
import type { Word } from '../types';
import { NONE_OF_THESE } from './noneOfThese';

/** A line on the miss sheet: the Chinese he picked (or its pair, or the word a pinyin or English choice belongs to), its pinyin
 *  when it is known better than the label's guess, its English, and the picked character marked inside a longer word. */
export interface PickedNote { zh: string; py?: string; en?: string; mark?: [number, number] }

/** 都不对 picked when the answer was among the choices. */
export const NONE_PICKED_EN = 'the answer was there';

const isHanChar = (t: string) => /^\p{Script=Han}$/u.test(t);

/** The dictionary's English cut to what a kid gloss would say (parent 2026-10-16: 扬 showed "to raise; to hoist"): its first
 *  sense, the first of its comma parts (not inside brackets), no leading "to" — "raise". */
export function shortGloss(gloss: string): string {
  const first = gloss.split(';')[0]!.trim();
  let depth = 0;
  let cut = first.length;
  for (let i = 0; i < first.length; i++) {
    const c = first[i]!;
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if ((c === ',' || c === '，') && depth === 0) { cut = i; break; }
  }
  const out = first.slice(0, cut).trim().replace(/^to\s+(?=\S)/i, '');
  return out || first;
}

/** English for any Chinese choice: a 成语's, a parent word's own (from the pool), the kid gloss, one written for a decoy
 *  (CHOICE_GLOSS), and only then the dictionary's, cut short (shortGloss). */
export function choiceGloss(text: string, pool: readonly Word[] = []): string | undefined {
  const parent = pool.find((w) => w.text === text && w.source === 'parent' && w.meaning);
  const dict = dictionaryGloss(text);
  return chengyuOf(text)?.meaning ?? parent?.meaning ?? kidGloss(text) ?? CHOICE_GLOSS[text] ?? (dict ? shortGloss(dict) : undefined);
}

/** A Chinese choice he picked: 都不对 said plainly; a bound character as its pair (番 → 番茄 tomato, 番 marked); a word or
 *  character with its English; a lone character with none still named (he may not know how to say it). Null for anything
 *  else (a made-up 组词). */
export function pickedNote(picked: string, pool: readonly Word[] = []): PickedNote | null {
  if (picked === NONE_OF_THESE) return { zh: NONE_OF_THESE, en: NONE_PICKED_EN };
  const pair = isHanChar(picked) ? boundPair(picked) : undefined;
  if (pair && kidGloss(pair)) return { zh: pair, py: kidGlossReading(pair), en: kidGloss(pair), mark: [Array.from(pair).indexOf(picked), 1] };
  const en = choiceGloss(picked, pool);
  if (en) return { zh: picked, en };
  return isHanChar(picked) ? { zh: picked } : null;
}

/** A gap (组词 or sentence) filled with what he picked: the word it makes when that is a real word with English, else the
 *  choice itself (树跟 is no word; 跟 is). */
export function cuePickNote(cue: Pick<MeaningCue, 'before' | 'after'>, choice: string, pool: readonly Word[] = []): PickedNote | null {
  if (choice === NONE_OF_THESE) return pickedNote(choice);
  const made = cue.before + choice + cue.after;
  const en = made !== choice ? choiceGloss(made, pool) : undefined;
  if (en) return { zh: made, en, mark: [Array.from(cue.before).length, Array.from(choice).length] };
  return pickedNote(choice, pool);
}

/**
 * A pinyin choice he picked for `word`: what is read so — a part of the character (静 → 青 qīng, his worksheet trap), else one
 * of his words of the same length (a look-alike first, then the nearest in his order) — with its English. Null when nothing
 * is (a tone or sound slip of his own word: the why line explains it).
 */
export function pinyinPickNote(word: Word, py: string, pool: readonly Word[]): PickedNote | null {
  const chars = Array.from(word.text);
  if (chars.length === 1) {
    const part = soundParts(word.text).find((p) => p.reading === py);
    if (part) return { zh: part.part, py, en: choiceGloss(part.part, pool) };
  }
  const parts = new Set(wordComponents(word.text));
  const near = (w: Word) => Math.abs((w.rank ?? 1e9) - (word.rank ?? 0));
  const owners = pool
    .filter((w) => w.text !== word.text && w.pinyin === py && Array.from(w.text).length === chars.length)
    .sort((a, b) => Number(wordComponents(b.text).some((p) => parts.has(p))) - Number(wordComponents(a.text).some((p) => parts.has(p))) || near(a) - near(b));
  const w = owners[0];
  return w ? { zh: w.text, py, en: choiceGloss(w.text, pool) } : null;
}

/** An English choice he picked for `word`: the word it is the meaning of (askedAs: a bound character's pair), nearest in his
 *  order first, as meaningChoices took it. Null when no word in the pool means it. */
export function meaningPickNote(en: string, word: Word, pool: readonly Word[]): PickedNote | null {
  const near = (w: Word) => Math.abs((w.rank ?? 1e9) - (word.rank ?? 0));
  const owner = pool
    .filter((w) => w.text !== word.text && !w.paused && questionMeaning(w) !== undefined && firstSense(questionMeaning(w)!) === en)
    .sort((a, b) => near(a) - near(b))[0];
  if (!owner) return null;
  const zh = askedAs(owner.text);
  return { zh, py: zh === owner.text ? owner.pinyin : kidGlossReading(zh), en, ...(zh === owner.text ? {} : { mark: [Array.from(zh).indexOf(owner.text), 1] as [number, number] }) };
}
