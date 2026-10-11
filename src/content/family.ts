// A character's word family (spec 2026-10-12 §5): the words with it that he can read, for the 认新字 card's 「一家人」 row and
// the 找一家人 question. From its 组词, the word ladder's 词语 and the HSK list; static content, worked out on demand.
import { pinyin } from 'pinyin-pro';
import './pinyinFixes';
import type { Example, Word } from '../types';
import { glossFor } from './glossary';
import { builtinWords, EXAMPLE_FIXES, HSK_WORDS, isHan, suitableExample, wordsWithChar } from './index';
import { ladderWords } from './ladder';

export interface FamilyWord { text: string; pinyin: string; en: string }

let examples: Map<string, Example[]> | null = null;
let ladder: Map<string, Word[]> | null = null;
const examplesOf = (ch: string): Example[] => (examples ??= new Map(builtinWords(0).map((w) => [w.text, w.examples ?? []]))).get(ch) ?? [];
function ladderWith(ch: string): Word[] {
  if (!ladder) {
    ladder = new Map();
    for (const w of ladderWords()) for (const c of new Set(Array.from(w.text))) (ladder.get(c) ?? ladder.set(c, []).get(c)!).push(w);
  }
  return ladder.get(ch) ?? [];
}

/** Every word of two or more Han characters with `ch` in it, once: its 组词 first, then the ladder's, then the HSK list's. */
export function wordsAround(ch: string): { text: string; pinyin: string }[] {
  const out = new Map<string, string>();
  for (const e of examplesOf(ch)) if (!out.has(e.text)) out.set(e.text, e.pinyin);
  for (const w of ladderWith(ch)) if (!out.has(w.text)) out.set(w.text, w.pinyin);
  for (const t of wordsWithChar(ch)) if (!out.has(t)) out.set(t, EXAMPLE_FIXES[t] ?? pinyin(t));
  return [...out]
    .filter(([text, py]) => { const cs = Array.from(text); return cs.length >= 2 && cs.every(isHan) && cs.includes(ch) && suitableExample(ch, { text, pinyin: py }); })
    .map(([text, py]) => ({ text, pinyin: py }));
}

/** The words with `ch` whose every other character he reads, with English; by HSK level, then length, then where they came from. */
export function familyOf(ch: string, readable: ReadonlySet<string>): FamilyWord[] {
  const rows: (FamilyWord & { level: number; n: number; k: number })[] = [];
  wordsAround(ch).forEach(({ text, pinyin: py }, k) => {
    if (!Array.from(text).every((c) => c === ch || readable.has(c))) return;
    const en = glossFor(text);
    if (en) rows.push({ text, pinyin: py, en, level: HSK_WORDS.get(text) ?? 8, n: Array.from(text).length, k });
  });
  return rows.sort((a, b) => a.level - b.level || a.n - b.n || a.k - b.k).map(({ text, pinyin: py, en }) => ({ text, pinyin: py, en }));
}
