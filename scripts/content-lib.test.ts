import { describe, expect, it } from 'vitest';
import { buildBuiltin, buildWordDictionary, cleanHskWord, extractComponents, firstSenses, parseHskSections, type MmahEntry, type SchoolLesson } from './content-lib';

const charlist = '# header\n\n一级汉字表\n1\t大\n2\t河\n3\t人\n\n二级汉字表\n1\t可\n2\t人\n\n初等手写字表\n1\t大\n2\t人\n';
const wordlist = '# header\n\n一级词汇表\n1 大人\n2 爸爸｜爸\n\n二级词汇表\n1 大河（名）\n\n三级词汇表\n1 可人\n';

function entry(character: string, strokes: number, decomposition: string, radical: string): MmahEntry {
  return { character, definition: `def of ${character}; more; extra`, pinyin: [], decomposition, radical, matches: Array(strokes).fill(null) };
}
const dictionary = new Map<string, MmahEntry>([
  ['大', entry('大', 3, '？', '大')],
  ['河', entry('河', 8, '⿰氵可', '氵')],
  ['人', entry('人', 2, '？', '人')],
  ['可', entry('可', 5, '⿹丁口', '口')],
]);
const pinyinOf = (t: string) => [...t].map((c) => `py(${c})`).join(' ');

describe('parseHskSections', () => {
  it('groups numbered entries under their section headers', () => {
    const s = parseHskSections(charlist);
    expect(s.get('一级汉字表')).toEqual(['大', '河', '人']);
    expect(s.get('初等手写字表')).toEqual(['大', '人']);
    expect(parseHskSections(wordlist).get('一级词汇表')).toEqual(['大人', '爸爸｜爸']);
  });
});

describe('cleanHskWord', () => {
  it('keeps the first variant and drops part-of-speech notes', () => {
    expect(cleanHskWord('爸爸｜爸')).toBe('爸爸');
    expect(cleanHskWord('大河（名）')).toBe('大河');
  });
});

describe('extractComponents', () => {
  it('drops structure symbols, unknown markers and duplicates', () => {
    expect(extractComponents('⿰氵可')).toEqual(['氵', '可']);
    expect(extractComponents('？')).toEqual([]);
    expect(extractComponents('⿱口口')).toEqual(['口']);
  });
});

describe('firstSenses', () => {
  it('keeps the first two senses', () => {
    expect(firstSenses('river, stream; the Yellow river')).toBe('river, stream');
    expect(firstSenses(undefined)).toBe('');
  });
});

describe('buildBuiltin', () => {
  const chars = buildBuiltin({ hskChars: parseHskSections(charlist), hskWords: parseHskSections(wordlist), dictionary, pinyinOf });

  it('orders by HSK level then stroke count, skipping repeats', () => {
    expect(chars.map((c) => c.char)).toEqual(['人', '大', '河', '可']);
    expect(chars.map((c) => c.rank)).toEqual([0, 1, 2, 3]);
  });
  it('marks handwriting-list characters as writeable', () => {
    expect(chars.filter((c) => c.writeable).map((c) => c.char)).toEqual(['人', '大']);
  });
  it('picks up to two example words made of same-or-lower-level characters', () => {
    const da = chars.find((c) => c.char === '大')!;
    expect(da.examples.map((e) => e.text)).toEqual(['大人', '大河']);
    expect(da.examples[0]!.pinyin).toBe('py(大) py(人)');
  });
  it('carries radical, components, strokes and meaning', () => {
    expect(chars.find((c) => c.char === '河')).toMatchObject({
      radical: '氵', components: ['氵', '可'], strokes: 8, meaning: 'def of 河, more', level: 1,
    });
  });
});

describe('HSK 1–9', () => {
  const sections = (pairs: [string, string[]][]) => new Map(pairs);
  const mmah = (c: string) => ({ character: c, pinyin: [], decomposition: '？', radical: c, matches: [[0]], definition: 'x' });
  it('keeps every character section and takes the HSK level as the level', () => {
    const chars = sections([['一级汉字表', ['一']], ['二级汉字表', ['二']], ['三级汉字表', ['三']], ['四级汉字表', ['四']], ['五级汉字表', ['五']], ['六级汉字表', ['六']], ['七一九级汉字表', ['七']], ['初等手写字表', ['一']], ['高等手写字表', ['七']]]);
    const out = buildBuiltin({ hskChars: chars, hskWords: sections([['一级词汇表', ['一二']]]), dictionary: new Map([...'一二三四五六七'].map((c) => [c, mmah(c)])), pinyinOf: () => 'x' });
    expect(out.map((c) => [c.char, c.level])).toEqual([['一', 1], ['二', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['七', 7]]);
    expect(out.filter((c) => c.writeable).map((c) => c.char)).toEqual(['一', '七']); // any 手写字表
  });
  it('builds the word dictionary from every word section, cleaned, two characters or more', () => {
    const words = sections([['一级词汇表', ['爸爸｜爸', '白（形）']], ['七一九级词汇表', ['珍惜']]]);
    expect(buildWordDictionary(words)).toEqual([['爸爸', 1], ['珍惜', 7]]);
  });
});

describe('组词 examples a child can use', () => {
  it('prefer short, easy words: 四 gets 四周 (周 is one level up), not the idiom 四面八方', () => {
    const mmah = (c: string) => ({ character: c, pinyin: [], decomposition: '？', radical: c, matches: [[0]], definition: 'x' });
    const chars = new Map([['一级汉字表', ['四', '面', '八', '方']], ['二级汉字表', ['周']]]);
    const words = new Map([['五级词汇表', ['四周']], ['七一九级词汇表', ['四面八方']]]);
    const out = buildBuiltin({ hskChars: chars, hskWords: words, dictionary: new Map([...'四面八方周'].map((c) => [c, mmah(c)])), pinyinOf: () => 'x' });
    expect(out.find((c) => c.char === '四')!.examples.map((e) => e.text)).toEqual(['四周', '四面八方']);
  });
  it('reports characters with no stroke entry to the caller, fresh for each build', () => {
    const sections = (pairs: [string, string[]][]) => new Map(pairs);
    const mmah = (c: string) => ({ character: c, pinyin: [], decomposition: '？', radical: c, matches: [[0]], definition: 'x' });
    const chars = sections([['一级汉字表', [...'一二龘']]]);
    const run = () => {
      const skipped: string[] = [];
      buildBuiltin({ hskChars: chars, hskWords: sections([['一级词汇表', ['一二']]]), dictionary: new Map([...'一二'].map((c) => [c, mmah(c)])), pinyinOf: () => 'x' }, skipped);
      return skipped;
    };
    expect(run()).toEqual(['龘']);
    expect(run()).toEqual(['龘']); // a second build doesn't pile onto the first's list
  });
});

describe('his textbook in the build (spec 2026-10-11 §7)', () => {
  const hskChars = parseHskSections('一级汉字表\n1\t大\n2\t人\n3\t天\n');
  const hskWords = parseHskSections('一级词汇表\n1 大天\n2 大人\n3 大大\n');
  const dict = new Map(['大', '人', '天', '马'].map((c, i) => [c, entry(c, i + 2, '？', c)]));
  const school: SchoolLesson[] = [{ term: '一上', read: '大人' }, { term: '二上', read: '天马狸' }];
  const without = buildBuiltin({ hskChars, hskWords, dictionary: dict, pinyinOf });
  const skipped: string[] = [];
  const withBook = buildBuiltin({ hskChars, hskWords, dictionary: dict, pinyinOf, school }, skipped);
  const bare = (cs: typeof withBook) => cs.map(({ examples: _e, ...c }) => c);

  it('adds the characters his book teaches that HSK lacks, after every HSK character, at their grade; no HSK character moves', () => {
    expect(withBook.map((c) => [c.char, c.rank, c.level, c.school ?? false, c.writeable])).toEqual([
      ['大', 0, 1, false, false], ['人', 1, 1, false, false], ['天', 2, 1, false, false], ['马', 3, 2, true, false],
    ]);
    expect(bare(withBook.slice(0, 3))).toEqual(bare(without));
    expect(skipped).toEqual(['狸']); // no dictionary entry: skipped, never a broken card
  });
  it('puts 组词 whose other characters the book has already taught first, and keeps every one the card had', () => {
    expect(without.find((c) => c.char === '大')!.examples.map((e) => e.text)).toEqual(['大天', '大人', '大大']);
    // 大 is taught in lesson 0 with 人; 天 only later; 大大 has no other character to have learned
    expect(withBook.find((c) => c.char === '大')!.examples.map((e) => e.text)).toEqual(['大人', '大天', '大大']);
    expect(withBook.find((c) => c.char === '天')!.examples.map((e) => e.text)).toEqual(['大天']);
  });
});
