import data from './builtin.json';
import hsk from './hskwords.json';
import passages from './passages.json';
import type { BuiltinChar, CharInfo, Passage, Word } from '../types';

export const BUILTIN: BuiltinChar[] = (data as unknown as { chars: BuiltinChar[] }).chars;
/** Changes when the built-in content or its fixes below change: only then does a launch rewrite the 3,000 built-in words. */
export const CONTENT_VERSION = `${(data as unknown as { version: number }).version}.2`;
export const PASSAGES: Passage[] = passages as Passage[];

const infoByChar = new Map<string, CharInfo>(
  BUILTIN.map((c) => [c.char, { char: c.char, radical: c.radical, components: c.components }]),
);

/** HSK 3.0 words (two characters or more) → HSK level 1–7 (7 = 七—九级). */
export const HSK_WORDS: ReadonlyMap<string, number> = new Map((hsk as unknown as { words: [string, number][] }).words);
const wordsByChar = new Map<string, string[]>();
for (const w of HSK_WORDS.keys()) for (const ch of new Set(w)) (wordsByChar.get(ch) ?? wordsByChar.set(ch, []).get(ch)!).push(w);
/** HSK words containing the character (组词). */
export const wordsWithChar = (ch: string): string[] => wordsByChar.get(ch) ?? [];

export function getCharInfo(char: string): CharInfo | undefined {
  return infoByChar.get(char);
}

export function isHan(ch: string): boolean {
  return /\p{Script=Han}/u.test(ch);
}

export function hanChars(text: string): string[] {
  return Array.from(text).filter(isHan);
}

export const builtinWordId = (char: string) => `b:${char}`;

export function builtinWords(now: number): Word[] {
  return BUILTIN.map((c) => ({
    id: builtinWordId(c.char),
    text: c.char,
    pinyin: READING_FIXES[c.char] ?? c.pinyin,
    meaning: c.meaning,
    level: c.level,
    rank: c.rank,
    source: 'builtin' as const,
    writeable: c.writeable,
    paused: false,
    createdAt: now,
    examples: c.examples.map((e) => (EXAMPLE_FIXES[e.text] ? { ...e, pinyin: EXAMPLE_FIXES[e.text]! } : e)),
  }));
}

/** The reading a P2 child meets, where the dictionary's citation reading isn't it (了 is le every day, liǎo only in 了解). */
const READING_FIXES: Record<string, string> = { 了: 'le' };
/** 组词 readings the source data gets wrong (包子's 子 is 轻声). */
const EXAMPLE_FIXES: Record<string, string> = { 包子: 'bāo zi' };

/** Radical and components of every character in the text, de-duplicated, in order. */
export function wordComponents(text: string): string[] {
  const out: string[] = [];
  for (const ch of hanChars(text)) {
    const info = getCharInfo(ch);
    if (!info) continue;
    for (const part of [info.radical, ...info.components]) if (part && !out.includes(part)) out.push(part);
  }
  return out;
}
