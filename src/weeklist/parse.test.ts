// src/weeklist/parse.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseWeekList } from './parse';

// Invented words, shaped like Live Text on a weekly review sheet (never the parent's sheet).
const KNOWN = new Set(['跑步', '书包', '高兴', '吃饭', '洗脸', '苹果', '牛奶', '面包', '公园', '红红的', '看书', '帽子', '唱歌']);
const isWord = (w: string) => KNOWN.has(w) || [...w].length === 1;

const ROW_WISE = [
  'Q3-L12-练习', '考考自己', '一、复习（第1-5课）', '> 词语',
  '跑步 书包 高兴 喝 洗脸', '跳 看书 闪闪亮', '>词语搭配', '早餐',
  '吃 面包 喝 牛奶 红红的 苹果', '公园', '戴 帽子 唱 歌',
  '©2026 Example Publisher Pte Ltd. All Rights Reserved 版权所有.',
].join('\n');

describe('parseWeekList', () => {
  const d = parseWeekList(ROW_WISE, isWord, KNOWN);
  it('keeps grid items and drops page furniture and the title', () => {
    expect(d.items.filter((i) => i.from !== 'pair').map((i) => i.text)).toEqual(['跑步', '书包', '高兴', '喝', '洗脸', '跳', '看书', '闪闪亮']);
  });
  it('splits a line of several pairs, and theme headings are never items', () => {
    expect(d.pairs).toEqual([
      { left: '吃', right: '面包', group: '早餐' }, { left: '喝', right: '牛奶', group: '早餐' }, { left: '红红的', right: '苹果', group: '早餐' },
      { left: '戴', right: '帽子', group: '公园' }, { left: '唱', right: '歌', group: '公园' },
    ]);
    expect(d.items.map((i) => i.text)).not.toContain('早餐');
    expect(d.items.map((i) => i.text)).not.toContain('公园');
  });
  it('merges a grid item that is also a pair half, and never makes an X的 phrase an item', () => {
    expect(d.items.find((i) => i.text === '喝')?.from).toBe('both');
    expect(d.items.map((i) => i.text)).not.toContain('红红的');
    expect(d.items.find((i) => i.text === '面包')?.from).toBe('pair');
  });
  it('flags a phrase no dictionary knows', () => {
    expect(d.items.find((i) => i.text === '闪闪亮')?.flags).toContain('phrase');
  });
  it('column-wise pairs with a heading: paired in order and flagged', () => {
    const col = parseWeekList(['> 词语搭配', '早餐', '吃', '面包', '喝', '牛奶'].join('\n'), isWord, KNOWN);
    expect(col.pairs).toEqual([{ left: '吃', right: '面包', group: '早餐', check: true }, { left: '喝', right: '牛奶', group: '早餐', check: true }]);
  });
  it('an odd pairs line is kept for the parent, unpaired', () => {
    expect(parseWeekList('> 词语搭配\n吃 面包 喝', isWord, KNOWN).unpaired).toEqual(['吃 面包 喝']);
  });
  it('flags an unknown or traditional character with a look-alike fix when one exists', () => {
    const t = parseWeekList('> 词语\n書包', isWord, KNOWN);
    expect(t.items[0]).toMatchObject({ text: '書包', flags: ['unknown'] });
  });
  it('shows a blocked word with its reason', () => {
    const b = parseWeekList('> 词语\n一点儿', isWord, KNOWN);
    expect(b.items[0]).toMatchObject({ text: '一点儿', flags: ['blocked'] });
    expect(b.items[0]!.reason).toMatch(/一点/);
  });
  it('notes sections it leaves to From a worksheet', () => {
    expect(parseWeekList('> 词语\n跑步\n> 重点句\n我们去公园跑步。', isWord, KNOWN).notes).toEqual(['sentences']);
  });
  it('rejects a token longer than four characters', () => {
    expect(parseWeekList('> 词语\n高高兴兴地', isWord, KNOWN).items).toEqual([]);
  });
});
