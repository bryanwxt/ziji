import { describe, expect, it } from 'vitest';
import { HSK_WORDS } from '../content';
import { CHENGYU, chengyuOf, type Idiom } from '../content/chengyu';
import { mulberry32 } from '../lib/random';
import { idiomFitItem, idiomGap, idiomZuju } from './idioms';

const asIdiom = (t: string): Idiom => ({ ...chengyuOf(t)!, sentences: [...chengyuOf(t)!.sentences], school: false });
const colours = asIdiom('五颜六色');

describe('idiomGap (complete the 成语)', () => {
  it('blanks the word, with 3 other characters that make no real word', () => {
    for (let s = 1; s < 30; s++) {
      const g = idiomGap(colours, '颜', mulberry32(s))!;
      expect(g.answer).toBe('颜');
      expect(g.at).toBe(1);
      expect(new Set(g.options).size).toBe(4);
      expect(g.options).toContain('颜');
      for (const o of g.options.filter((x) => x !== '颜')) {
        const made = '五' + o + '六色';
        expect(colours.text.includes(o)).toBe(false);
        expect(HSK_WORDS.has(made) || !!chengyuOf(made), made).toBe(false);
      }
    }
  });
  it('picks a character that appears once when no blank is given', () => {
    const twice = asIdiom(CHENGYU.find((c) => /(.).*\1/u.test(c.text))!.text);
    for (let s = 1; s < 10; s++) {
      const g = idiomGap(twice, null, mulberry32(s))!;
      expect(g.idiom.text.split(g.answer).length - 1).toBe(1);
    }
  });
  it('never blanks a character the 成语 has twice', () => {
    expect(idiomGap(asIdiom('一心一意'), '一', mulberry32(1))).toBeNull();
  });
});

describe('idiomFitItem (which 成语 fits)', () => {
  it('blanks it in its own sentence, with 3 other 成语', () => {
    const item = idiomFitItem(colours, null, mulberry32(4))!;
    expect(item.kind).toBe('fit');
    expect(item.options).toHaveLength(4);
    expect(new Set(item.options).size).toBe(4);
    expect(item.options).toContain('五颜六色');
    for (const o of item.options) expect(Array.from(o)).toHaveLength(4);
    if (item.kind === 'fit') expect(colours.sentences).toContain(item.before + '五颜六色' + item.after);
  });
  it('takes his own 成语 as the wrong choices first', () => {
    const mine = ['一心一意', '自由自在', '一路平安'].map(asIdiom);
    const item = idiomFitItem(colours, mine, mulberry32(4))!;
    expect([...item.options].sort()).toEqual(['一心一意', '一路平安', '五颜六色', '自由自在'].sort());
  });
  it('is null with no sentence', () => {
    expect(idiomFitItem({ text: '心花怒放', sentences: [], school: true }, null, mulberry32(1))).toBeNull();
  });
});

describe('idiomZuju (build a sentence)', () => {
  it('keeps the 成语 whole in one tile', () => {
    for (const c of CHENGYU) {
      const z = idiomZuju(asIdiom(c.text), mulberry32(2))!;
      expect(z.tiles.some((t) => t.includes(c.text)), c.text).toBe(true);
      expect(z.tiles.length).toBeGreaterThanOrEqual(4);
    }
  });
  it('is null when no sentence cuts into 4–6 tiles', () => {
    expect(idiomZuju({ text: '心花怒放', sentences: ['心花怒放。'], school: true }, mulberry32(1))).toBeNull();
  });
});
