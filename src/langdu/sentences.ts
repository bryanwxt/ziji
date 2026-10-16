// 朗读's model reads whole sentences (spec 2026-10-12 §3): split at 。！？, never at commas or 、; a parent's "/" ends a sentence
// only when a sentence-length stretch has come before it.
import type { PassageQuestion } from '../types';

const END = '。！？';
const OPEN = '“「『';
const CLOSE = '”」』';
const HAN = /\p{Script=Han}/u;
/** A "/" splits when at least this many Han characters came since the last break; otherwise it is a pause mark and is dropped. */
export const SLASH_MIN_HAN = 6;

export function splitSentences(text: string): string[] {
  const chars = Array.from(text.replace(/\s*\/\s*/g, '/'));
  const count = (set: string) => chars.filter((c) => set.includes(c)).length;
  const quotes = count(OPEN) === count(CLOSE); // unpaired quotes are ignored: they must never swallow the rest of the text
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  const push = () => {
    const s = cur.trim();
    if (s) out.push(s);
    cur = '';
  };
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const next = chars[i + 1] ?? '';
    if (ch === '/') {
      if (depth === 0 && Array.from(cur).filter((c) => HAN.test(c)).length >= SLASH_MIN_HAN) push();
      continue;
    }
    cur += ch;
    if (quotes && OPEN.includes(ch)) depth++;
    else if (quotes && CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    const before = Array.from(cur).at(-2) ?? '';
    const ends = END.includes(ch) || (quotes && CLOSE.includes(ch) && END.includes(before));
    const more = END.includes(next) || (quotes && CLOSE.includes(next));
    if (ends && depth === 0 && !more) push();
  }
  push();
  return out;
}

/** The sentence a miss reads again: the question's own, else the first holding the right choice; −1 when none does. */
export function answeringSentence(q: Pick<PassageQuestion, 'choices' | 'answer' | 'sentence'>, sentences: string[]): number {
  if (q.sentence !== undefined && Number.isInteger(q.sentence) && q.sentence >= 0 && q.sentence < sentences.length) return q.sentence;
  const right = q.choices[q.answer];
  return right ? sentences.findIndex((s) => s.includes(right)) : -1;
}

/** 朗读's read stops by itself after this (spec 2026-10-15 §8): the recorder's minute, or 0.8 s a character for a long passage
 *  (88 s for 110). Here, not in recorder.ts, which the step's tests replace. */
export const readLimitMs = (text: string): number => Math.max(60_000, Math.round(Array.from(text).filter((c) => HAN.test(c)).length * 800));
