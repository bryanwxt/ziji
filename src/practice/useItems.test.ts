import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { makeWord } from '../test/fixtures';
import { mulberry32 } from '../lib/random';
import { fitItem, usageItem } from './useItems';

describe('use items (spec §20 part 4)', () => {
  it('a fit item from the bank uses its hand-picked choices', () => {
    const item = fitItem(makeWord('很', { pinyin: 'hěn' }), builtinWords(0), mulberry32(1))!;
    expect(item).toMatchObject({ kind: 'fit', wordId: 'b:很', word: '很', before: '今天', after: '热。' });
    expect(item.kind === 'fit' && [...item.options].sort()).toEqual(['和', '在', '很', '跟'].sort());
  });
  it("a class-sentence fit item gets automatic choices, and the word's pairing", () => {
    const w = makeWord('保持', { id: 'p:1', pinyin: 'bǎo chí', level: null, source: 'parent', pairs: ['安静'], sentences: [{ text: '教室里要保持安静，大家看书。', pinyin: '' }] });
    const item = fitItem(w, builtinWords(0), mulberry32(1))!;
    expect(item).toMatchObject({ kind: 'fit', wordId: 'p:1', pair: '安静', before: '教室里要' });
    expect(item.kind === 'fit' && item.options).toHaveLength(4);
  });
  it('用对了吗: the right use and the wrong use from the bank', () => {
    expect(usageItem('很', 'b:很')).toEqual({ kind: 'usage', wordId: 'b:很', word: '很', right: '这个书包很大。', wrong: '我很一个书包。', pair: undefined });
    expect(usageItem('欺负', null)).toBeNull();
  });
  it('no item for a word with nothing to show', () => {
    expect(fitItem(makeWord('欺负', { id: 'p:2', level: null, source: 'parent' }), builtinWords(0), mulberry32(1))).toBeNull();
  });
});
