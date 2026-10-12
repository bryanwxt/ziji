import { describe, expect, it } from 'vitest';
import { glossFor } from './glossary';
import { familyOf, wordsAround } from './family';
import { BUILTIN, suitableExample } from './index';

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
  it('leaves out unsuitable words and other readings of the character', () => {
    expect(texts('蛋', '笨')).not.toContain('笨蛋');
    expect(texts('调', '查')).not.toContain('调查'); // the 调 card teaches tiáo
    expect(wordsAround('调').map((x) => x.text)).not.toContain('调查');
    expect(texts('脏', '心')).not.toContain('心脏');
    expect(texts('门', '口')).toContain('门口');
  });
});

describe('suitableExample with the card\'s own reading (final review M3)', () => {
  it('a character that is not built in is checked against the reading it is given', () => {
    expect(BUILTIN.some((c) => c.char === '乂')).toBe(false);
    expect(suitableExample('乂', { text: '乂安', pinyin: 'yì ān' }, 'yì')).toBe(true);
    expect(suitableExample('乂', { text: '乂安', pinyin: 'ài ān' }, 'yì')).toBe(false);
    expect(suitableExample('乂', { text: '乂安', pinyin: 'ài ān' })).toBe(true); // no reading: can't be checked
  });
  it("a built-in character keeps its card's reading (a stored word's pinyin never overrides it)", () => {
    expect(suitableExample('长', { text: '长大', pinyin: 'zhǎng dà' }, 'cháng')).toBe(suitableExample('长', { text: '长大', pinyin: 'zhǎng dà' }));
  });
});
