import { describe, expect, it } from 'vitest';
import { builtinWords, schoolTerm } from './index';
import { isLadderId, ladderId, ladderWord, ladderWords } from './ladder';

const chars = builtinWords(0).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text));
const rankOf = new Map(chars.map((w) => [w.text, w.rank!]));
const words = ladderWords();

describe('ladder words (spec 2026-10-06 §3.1)', () => {
  it('multi-character 词语 only, each with an id, pinyin for every character, and an English meaning', () => {
    expect(words.length).toBeGreaterThan(1500);
    expect(words.length).toBeLessThan(8000);
    for (const w of words) {
      expect(Array.from(w.text).length, w.text).toBeGreaterThan(1);
      expect(w.id).toBe(ladderId(w.text));
      expect(isLadderId(w.id)).toBe(true);
      expect(w.pinyin.split(/\s+/).length, w.text).toBe(Array.from(w.text).length);
      expect(w.meaning, w.text).toBeTruthy();
    }
  });
  it('a word arrives just after the last of its characters in school order, never before', () => {
    for (const w of words) for (const c of Array.from(w.text)) expect(w.rank!, `${w.text} after ${c}`).toBeGreaterThan(rankOf.get(c)!);
    const ranks = words.map((w) => w.rank!);
    expect(new Set(ranks).size).toBe(ranks.length);
  });
  it("a school character's 组词 is a ladder word, at the card's own reading", () => {
    const withExample = chars.find((c) => (c.examples ?? []).some((e) => Array.from(e.text).length > 1 && Array.from(e.text).every((x) => rankOf.has(x))))!;
    const e = withExample.examples!.find((x) => Array.from(x.text).length > 1 && Array.from(x.text).every((c) => rankOf.has(c)))!;
    expect(ladderWord(ladderId(e.text))?.pinyin).toBe(e.pinyin);
  });
  it('the same list every time, and no word twice', () => {
    expect(ladderWords().map((w) => w.id)).toEqual(words.map((w) => w.id));
    expect(new Set(words.map((w) => w.text)).size).toBe(words.length);
  });
});
