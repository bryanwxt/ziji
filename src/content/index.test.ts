import { describe, expect, it } from 'vitest';
import { BUILTIN, builtinWords, getCharInfo, hanChars, HSK_WORDS, wordComponents, wordsWithChar } from './index';
import { gzipSync } from 'node:zlib';
import builtinJson from './builtin.json';
import hskJson from './hskwords.json';
import { radicalMeaning } from './radicals';

describe('content module', () => {
  it('maps every built-in character to an active built-in word', () => {
    const words = builtinWords(123);
    expect(words).toHaveLength(3000);
    expect(words[0]).toMatchObject({ id: `b:${BUILTIN[0]!.char}`, source: 'builtin', paused: false, createdAt: 123 });
    // school order (MOE 《欢乐伙伴2.0》): 一上 lesson 1 opens with 衣, so it comes first; a character his books don't teach comes after them all
    const byText = new Map(words.map((w) => [w.text, w]));
    expect(byText.get('衣')!.rank).toBe(0);
    expect(byText.get('竹')!.rank).toBeLessThan(200); // 一上, though HSK puts it late
    expect(byText.get('介')!.rank).toBeGreaterThanOrEqual(1031); // not in his books through 三下
  });
  it('knows the components of 河', () => {
    expect(getCharInfo('河')?.components).toContain('氵');
  });
  it('hanChars ignores punctuation and letters', () => {
    expect(hanChars('我，ok 你！')).toEqual(['我', '你']);
  });
  it('wordComponents unions radicals and components of each character', () => {
    expect(wordComponents('汉河')).toEqual(expect.arrayContaining(['氵', '又', '可']));
  });
  it('explains common radicals for children', () => {
    expect(radicalMeaning('氵')).toEqual({ zh: '水', en: 'water', icon: 'drop' });
  });
});

describe('HSK 1–9 content', () => {
it('ships HSK 1–9: ~3,000 characters and ~11,000 words, small enough for an offline app', () => {
  expect(BUILTIN.length).toBeGreaterThan(2900);
  expect(new Set(BUILTIN.map((c) => c.level))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
  expect(HSK_WORDS.size).toBeGreaterThan(9000); // two characters or more
  expect(HSK_WORDS.get('珍惜')).toBeDefined();
  expect(wordsWithChar('惜')).toContain('珍惜');
  const gz = gzipSync(JSON.stringify(builtinJson)).length + gzipSync(JSON.stringify(hskJson)).length;
  expect(gz).toBeLessThan(1_500_000);
});
});
