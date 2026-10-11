import { describe, expect, it } from 'vitest';
import { BUILTIN, builtinWords, EXAMPLE_DROPS } from '../content';
import { mulberry32 } from '../lib/random';
import { makeWord } from '../test/fixtures';
import { familyBoard, familyDistractors } from './family';

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;
const K = new Set('男女气先口出学家人');

describe('the 找一家人 board (spec 2026-10-12 §5)', () => {
  it('distractors hold a look-alike instead of the character, readable and one per look-alike first', () => {
    expect(familyDistractors('生', K).map((d) => [d.text, d.swap])).toEqual([['星星', '星'], ['出去', '去'], ['在家', '在'], ['坏人', '坏']]);
  });
  it('six different tiles: two family words with the character, four distractors without it', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const b = familyBoard(w('生'), K, mulberry32(seed))!;
      expect(b.tiles).toHaveLength(6);
      expect(new Set(b.tiles).size).toBe(6);
      expect(b.family).toHaveLength(2);
      for (const f of b.family) { expect(f.text).toContain('生'); expect(b.tiles).toContain(f.text); }
      expect(b.distractors).toHaveLength(4);
      for (const d of b.distractors) { expect(d.text).not.toContain('生'); expect(b.tiles).toContain(d.text); expect(d.en).toBeTruthy(); }
    }
    expect(familyBoard(w('生'), K, mulberry32(1))!.family.map((f) => f.text)).toEqual(['先生', '女生']);
  });
  it('none for a character with fewer than two family words he reads, or for a 词语', () => {
    expect(familyBoard(w('火'), K, mulberry32(1))).toBeNull(); // 火车: he doesn't read 车
    expect(familyBoard(w('木'), K, mulberry32(1))).toBeNull();
    expect(familyBoard(makeWord('朋友'), K, mulberry32(1))).toBeNull();
  });
  it('a distractor is never a dropped word, and its pinyin lines up one syllable per character', () => {
    const known = new Set(BUILTIN.slice(0, 300).map((c) => c.char));
    for (const c of BUILTIN.slice(0, 200)) {
      for (const d of familyDistractors(c.char, known)) {
        expect(EXAMPLE_DROPS.has(d.text), `${c.char}: ${d.text}`).toBe(false);
        expect(d.pinyin.trim().split(/\s+/)).toHaveLength(Array.from(d.text).length);
        expect(d.text).toContain(d.swap);
        expect(d.text).not.toContain(c.char);
      }
    }
  });
});
