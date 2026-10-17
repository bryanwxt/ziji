// src/weeklist/parse.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseWeekList, weekIsWord } from './parse';

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
  it('rejects a token longer than four characters, and says so in notes', () => {
    const long = parseWeekList('> 词语\n高高兴兴地', isWord, KNOWN);
    expect(long.items).toEqual([]);
    expect(long.notes).toEqual(['too long: 高高兴兴地']);
  });
  it('a lone token that is also a pair half on the sheet is no heading (rule 6): unpaired for the parent', () => {
    const h = parseWeekList(['> 词语搭配', '牛奶', '吃 面包 喝 牛奶'].join('\n'), isWord, KNOWN);
    expect(h.pairs).toEqual([{ left: '吃', right: '面包' }, { left: '喝', right: '牛奶' }]);
    expect(h.unpaired).toEqual(['牛奶']);
  });
  it('rejoins a word Live Text split into cells (rule 3), and keeps the parts for Split', () => {
    const j = parseWeekList(['> 词语', '苹 果 跑步', '书', '包'].join('\n'), isWord, KNOWN);
    expect(j.items.map((i) => i.text)).toEqual(['苹果', '跑步', '书包']);
    expect(j.items[0]!.parts).toEqual(['苹', '果']);
    expect(j.items[1]!.parts).toBeUndefined();
  });
  it('never joins 生字 cells', () => {
    expect(parseWeekList(['> 生字', '苹 果'].join('\n'), isWord, KNOWN).items.map((i) => i.text)).toEqual(['苹', '果']);
  });
});

describe('the suggested name (rule 1)', () => {
  const day = new Date(2026, 9, 20, 9);
  it('the sheet title above the first heading, with its page code', () => {
    expect(parseWeekList(ROW_WISE, isWord, KNOWN, day).title).toBe('考考自己 Q3-L12');
  });
  it('a page code alone', () => {
    expect(parseWeekList(['K1-L07-复习', '> 词语', '跑步'].join('\n'), isWord, KNOWN, day).title).toBe('K1-L07');
  });
  it('a title alone; brand, slogan and copyright lines are never the name', () => {
    expect(parseWeekList(['百力果', '想象·表达·自信', '小小练习', '> 词语', '跑步'].join('\n'), isWord, KNOWN, day).title).toBe('小小练习');
  });
  it('nothing usable: a date-based name', () => {
    expect(parseWeekList('> 词语\n跑步', isWord, KNOWN, day).title).toBe('10月20日的词语');
    expect(parseWeekList('跑步 书包', isWord, KNOWN, day).title).toBe('10月20日的词语');
  });
});

describe('pairs that Live Text breaks up', () => {
  it('an odd pairs line followed by its lone last cell is joined and re-read', () => {
    const d = parseWeekList(['> 词语搭配', '吃 面包 喝', '牛奶', '戴 帽子'].join('\n'), isWord, KNOWN);
    expect(d.pairs).toEqual([{ left: '吃', right: '面包', check: true }, { left: '喝', right: '牛奶', check: true }, { left: '戴', right: '帽子' }]);
    expect(d.unpaired).toEqual([]);
  });
  it('the tokens of an unpaired line become items to check', () => {
    const d = parseWeekList('> 词语搭配\n吃 面包 喝', isWord, KNOWN);
    expect(d.items.map((i) => [i.text, i.flags])).toEqual([['吃', ['checkPair']], ['面包', ['checkPair']], ['喝', ['checkPair']]]);
  });
  it('the same pair twice is one pair', () => {
    expect(parseWeekList('> 词语搭配\n吃 面包\n吃 面包 喝 牛奶', isWord, KNOWN).pairs).toEqual([{ left: '吃', right: '面包' }, { left: '喝', right: '牛奶' }]);
  });
});

describe('numbered and punctuated cells are kept (Live Text)', () => {
  const texts = (t: string) => parseWeekList(t, isWord, KNOWN).items.map((i) => i.text);
  it.each([
    ['> 词语\n1.跑步 2.书包', ['跑步', '书包']],
    ['> 词语\n跑步；书包。', ['跑步', '书包']],
    ['> 词语\n（帽子）', ['帽子']],
    ['> 词语\n①看书 ②洗脸', ['看书', '洗脸']],
    ['> 词语\n(1)公园', ['公园']],
  ])('%s', (t, want) => expect(texts(t)).toEqual(want));
  it('pairs written with a dash or a colon', () => {
    expect(parseWeekList('> 词语搭配\n吃——面包\n戴：帽子', isWord, KNOWN).pairs).toEqual([{ left: '吃', right: '面包' }, { left: '戴', right: '帽子' }]);
  });
});

describe('the suggested name needs a heading after it', () => {
  it('plain words with no heading: a date-based name, never the first word', () => {
    expect(parseWeekList('小小练习\n跑步 书包', isWord, KNOWN, new Date(2026, 9, 20)).title).toBe('10月20日的词语');
  });
});

// The production isWord (HSK, the built-in characters and the glossaries, spec §3.2 rule 12), as the parent screen uses it.
describe('with the production isWord', () => {
  const isReal = weekIsWord();
  it('knows glossary words HSK lacks, and gives no misleading fix', () => {
    const d = parseWeekList(['> 词语', '面条 青菜 鸡翅 圈圈'].join('\n'), isReal, ['面包', '青年', '鸡蛋', '圈套']);
    const by = new Map(d.items.map((i) => [i.text, i]));
    expect(by.get('面条')!.flags).toEqual([]);
    expect(by.get('青菜')!.flags).toEqual([]);
    expect(by.get('鸡翅')!.suggestion).toBeUndefined();
    expect(by.get('圈圈')!.suggestion).toBeUndefined();
  });
  it('column-wise pairs under two theme headings: two groups, four pairs, none shifted', () => {
    const d = parseWeekList(['> 词语搭配', '食物', '煮', '面条', '炒', '青菜', '夜市', '套', '圈圈', '吃', '鸡翅'].join('\n'), isReal);
    expect(d.pairs).toEqual([
      { left: '煮', right: '面条', group: '食物', check: true }, { left: '炒', right: '青菜', group: '食物', check: true },
      { left: '套', right: '圈圈', group: '夜市', check: true }, { left: '吃', right: '鸡翅', group: '夜市', check: true },
    ]);
    expect(d.unpaired).toEqual([]);
    expect(d.items.map((i) => i.text)).not.toContain('夜市');
  });
  it('row-wise pairs under headings, and a split grid word rejoined', () => {
    const d = parseWeekList(['> 词语', '欺 负 原谅', '> 词语搭配', '操场', '放 风筝 拍 皮球', '厨房', '煎 鸡蛋'].join('\n'), isReal);
    expect(d.items.filter((i) => i.from === 'grid').map((i) => i.text)).toEqual(['欺负', '原谅']);
    expect(d.pairs.map((p) => `${p.group}:${p.left}${p.right}`)).toEqual(['操场:放风筝', '操场:拍皮球', '厨房:煎鸡蛋']);
  });
});

describe('weekIsWord also knows the school sentence words and pinyin-pro words (follow-up 2026-10-17)', () => {
  const isW = weekIsWord();
  it('a word in pinyin-pro\'s word dictionary is a word', () => {
    expect(isW('行长')).toBe(true); // pinyin-pro's dictionary (a polyphone word)
  });
  it('a nonsense pair of real characters is still unknown', () => {
    expect(isW('书跑')).toBe(false);
  });
});

describe('weekIsWord with the CC-CEDICT headwords, once loaded (follow-up 2026-10-17)', () => {
  it('a word in the injected set is a word; without it, today\'s answer', () => {
    expect(weekIsWord()('蜻蜓')).toBe(false);
    expect(weekIsWord(undefined, new Set(['蜻蜓', '秋千']))('蜻蜓')).toBe(true);
    expect(weekIsWord(undefined, new Set(['蜻蜓']))('书跑')).toBe(false);
  });
});
