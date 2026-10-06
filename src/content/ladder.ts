// The 词语 of his word ladder beyond single characters (spec 2026-10-06 §3.1): each in-range character's 组词 and the HSK 1–3
// words, each arriving just after the last of its characters in school order. Static content: never stored or paused; a
// word's progress lives on its cards (ids `w:<text>:<kind>`).
import { pinyin } from 'pinyin-pro';
import type { Level, Word } from '../types';
import { glossFor } from './glossary';
import { builtinWords, EXAMPLE_FIXES, HSK_WORDS, schoolTerm } from './index';

export const ladderId = (text: string): string => `w:${text}`;
export const isLadderId = (id: string): boolean => id.startsWith('w:');

let cache: { words: Word[]; byId: Map<string, Word> } | null = null;

function build(now: number): Word[] {
  const chars = builtinWords(now).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text));
  const rankOf = new Map(chars.map((w) => [w.text, w.rank!]));
  const levelOf = new Map(chars.map((w) => [w.text, w.level ?? 7]));
  const found = new Map<string, string>(); // text → pinyin
  for (const c of chars) for (const e of c.examples ?? []) if (Array.from(e.text).length > 1 && !found.has(e.text)) found.set(e.text, e.pinyin);
  for (const [text, level] of HSK_WORDS) if (level <= 3 && Array.from(text).length > 1 && !found.has(text)) found.set(text, EXAMPLE_FIXES[text] ?? pinyin(text));
  const rows: { text: string; py: string; last: number; meaning: string }[] = [];
  for (const [text, py] of found) {
    const cs = Array.from(text);
    if (!cs.every((c) => rankOf.has(c))) continue; // a character outside his range
    if (py.trim().split(/\s+/).length !== cs.length) continue; // pinyin that doesn't line up can't be checked or said
    const meaning = glossFor(text);
    if (!meaning) continue; // a word with no meaning can't be heard or read for meaning
    rows.push({ text, py, last: Math.max(...cs.map((c) => rankOf.get(c)!)), meaning });
  }
  rows.sort((a, b) => a.last - b.last || (HSK_WORDS.get(a.text) ?? 9) - (HSK_WORDS.get(b.text) ?? 9) || a.text.length - b.text.length || (a.text < b.text ? -1 : 1));
  let prev = -1;
  let k = 0;
  return rows.map(({ text, py, last, meaning }) => {
    k = last === prev ? k + 1 : 1;
    prev = last;
    const level = (HSK_WORDS.get(text) ?? Math.max(...Array.from(text).map((c) => levelOf.get(c)!))) as Level;
    return { id: ladderId(text), text, pinyin: py, meaning, level, rank: last + k / 1000, source: 'builtin', writeable: false, paused: false, createdAt: now };
  });
}

/** The ladder words in order (now = 0: the shared, cached list). */
export function ladderWords(now = 0): Word[] {
  if (now !== 0) return build(now);
  if (!cache) {
    const words = build(0);
    cache = { words, byId: new Map(words.map((w) => [w.id, w])) };
  }
  return cache.words;
}

export function ladderWord(id: string): Word | undefined {
  if (!cache) ladderWords();
  return cache!.byId.get(id);
}

/** The ladder's 词语 he doesn't already have as one of his words (a list word 朋友 is learned once, as his: final review I7). */
export function ladderWordsBesides(words: readonly Word[]): Word[] {
  const have = new Set(words.map((w) => w.text));
  return ladderWords().filter((w) => !have.has(w.text));
}
