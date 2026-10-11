import { describe, expect, it } from 'vitest';
import { glossFor } from './glossary';
import { familyOf, wordsAround } from './family';

const texts = (ch: string, readable: string) => familyOf(ch, new Set(readable)).map((f) => f.text);

describe('familyOf: words of a character he can read (spec 2026-10-12 §5)', () => {
  it('only words whose every other character he reads', () => {
    expect(texts('生', '男女气先日')).toEqual(['男生', '女生', '生气', '先生', '生日']);
    expect(texts('生', '')).toEqual([]);
  });
  it('a word needs English (学生 has none in the glossary)', () => {
    expect(glossFor('学生')).toBeUndefined();
    expect(texts('生', '学中')).toEqual([]);
  });
  it('ordered by HSK level, then length (门口 1, 出门 2, 大门 2, 串门 7, 五花八门 7)', () => {
    expect(texts('门', '口出大串五花八')).toEqual(['门口', '出门', '大门', '串门', '五花八门']);
  });
  it('a word in the examples, the ladder and the HSK list comes once, with its pinyin and English', () => {
    expect(familyOf('门', new Set('口'))).toEqual([{ text: '门口', pinyin: 'mén kǒu', en: 'doorway; gate' }]);
    const around = wordsAround('门').map((x) => x.text);
    expect(new Set(around).size).toBe(around.length);
    expect(around.every((t) => Array.from(t).length >= 2 && t.includes('门'))).toBe(true);
  });
});
