// Final review fixes for phase C (成语): readings, pinyin, near misses, near-synonyms.
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { meaningCue } from '../activities/flashcards/meaning';
import { mulberry32 } from '../lib/random';
import { idiomFitItem, idiomGap } from '../practice/idioms';
import { builtinIdiom, chengyuPinyin, idiomsFor, type Idiom } from './chengyu';

const asIdiom = (t: string): Idiom => builtinIdiom(t)!;
const char = (t: string, pinyin: string, level: 1 | 2 = 2) => makeWord(t, { id: `b:${t}`, pinyin, level });

describe('I1: a 成语 reads the character the way its card does (spec §2.1 one reading per card)', () => {
  it('skips 成语 that read it another way', () => {
    const texts = (w: ReturnType<typeof char>) => idiomsFor(w, 7, []).map((i) => i.text);
    expect(texts(char('了', 'le', 1))).not.toContain('没完没了');
    expect(texts(char('了', 'le', 1))).not.toContain('一目了然');
    expect(texts(char('为', 'wèi'))).not.toContain('自以为是');
    expect(texts(char('还', 'hái', 1))).not.toContain('讨价还价');
    expect(texts(char('长', 'cháng'))).not.toContain('土生土长');
    expect(texts(char('行', 'xíng', 1))).toContain('一言一行');
    expect(texts(char('一', 'yī', 1))).toContain('一路平安'); // 一's tone change (yí) is the same reading
  });
});

describe('I2: the 成语 pinyin is right', () => {
  it('fixes what the pinyin library gets wrong', () => {
    expect(chengyuPinyin('说干就干')).toBe('shuō gàn jiù gàn');
    expect(chengyuPinyin('一言一行')).toBe('yì yán yì xíng');
    expect(chengyuPinyin('粗心大意')).toBe('cū xīn dà yì');
    expect(chengyuPinyin('一动不动')).toBe('yí dòng bù dòng');
    expect(chengyuPinyin('五颜六色')).toBe('wǔ yán liù sè');
  });
});

describe('I5: a completion never offers a character that also makes a real phrase', () => {
  const never: [string, string, string][] = [['千家万户', '家', '门'], ['全心全意', '意', '力'], ['一举一动', '举', '言'], ['一路平安', '路', '生'], ['无忧无虑', '忧', '思'], ['成千上万', '千', '百'], ['一年到头', '年', '天'], ['前所未有', '有', '见'], ['齐心协力', '协', '合']];
  it.each(never)('%s [%s] never offers %s', (text, blank, bad) => {
    for (let s = 1; s < 200; s++) expect(idiomGap(asIdiom(text), blank, mulberry32(s))!.options).not.toContain(bad);
  });
});

describe('I7: "pick the 成语" never offers a second right answer', () => {
  const never: [string, string][] = [['一天到晚', '从早到晚'], ['一心一意', '全心全意'], ['东张西望', '交头接耳'], ['千方百计', '想方设法'], ['形形色色', '各式各样'], ['一言不发', '一动不动'], ['不约而同', '不由自主'], ['目不转睛', '聚精会神'], ['自由自在', '无忧无虑'], ['意想不到', '突如其来']];
  it.each(never)('%s is never offered against %s', (a, b) => {
    for (let s = 1; s < 200; s++) {
      expect(idiomFitItem(asIdiom(a), null, mulberry32(s))!.options).not.toContain(b);
      expect(idiomFitItem(asIdiom(b), null, mulberry32(s))!.options).not.toContain(a);
    }
  });
  it("a school 成语's sentence question doesn't offer its near-synonyms (五颜六色 / 五花八门)", () => {
    const w = makeWord('五颜六色', { id: 'p:9', source: 'parent', tags: ['成语'], level: null, rank: null });
    for (const v of [0, 1]) for (const o of meaningCue(w, v)!.wrong!) expect(['五花八门', '各式各样', '形形色色', '丰富多彩']).not.toContain(o);
  });
});
