// A 多音字's second reading and a surname character's real meaning (rulings 2026-10-18): the card teaches one reading and its
// everyday sense; a word at the other reading (背书包 bēi) is a ladder 词语 of its own, read its own way; a character that is
// commonly a family name leads with a real meaning (胡子, 李子) and keeps 姓X as a later 组词; only a character with no child
// meaning is glossed 「family name X」 with 姓X first.
import { describe, expect, it } from 'vitest';
import { builtinWords, schoolTerm } from './index';
import { boundPair, kidGloss } from './kidGloss';
import { ladderWords } from './ladder';
import { sentencesFor } from './understand';
import { readingOf, sentenceReading } from './wordGate';

const card = new Map(builtinWords(0).map((w) => [w.text, w]));
const zuci = (ch: string) => (card.get(ch)!.examples ?? []).map((e) => e.text);
const ladder = new Map(ladderWords().map((w) => [w.text, w]));

describe('a second reading is its own word, never the card\'s (背 bèi / 背书包 bēi)', () => {
  it.each([
    ['背', 'bèi', '背书包', 'bēi shū bāo'], ['背', 'bèi', '背包', 'bēi bāo'], ['数', 'shù', '数一数', 'shǔ yi shǔ'],
    ['系', 'xì', '系鞋带', 'jì xié dài'], ['刹', 'chà', '刹车', 'shā chē'],
  ])('%s stays %s; %s is a ladder word read %s, off the card', (ch, at, word, py) => {
    expect(card.get(ch)!.pinyin).toBe(at);
    expect(zuci(ch)).not.toContain(word);
    expect(ladder.get(word)?.pinyin).toBe(py);
    expect(readingOf(word)).toBe(py);
    expect(kidGloss(word)).toBeTruthy();
  });
  it('背 has a bèi sentence on its card and bēi sentences on 背书包', () => {
    const at = (s: string) => sentenceReading(s).split(' ')[Array.from(s).filter((c) => /\p{Script=Han}/u.test(c)).indexOf('背')];
    expect(sentencesFor('背').map((s) => at(s.zh))).toEqual(['bèi', 'bèi']);
    expect(sentencesFor('背书包').map((s) => at(s.zh))).toEqual(['bēi', 'bēi']);
  });
});

describe('surname characters lead with a real meaning (parent 2026-10-18)', () => {
  it('胡 is "beard" through 胡子, with 胡萝卜, and 姓胡 later', () => {
    expect(boundPair('胡')).toBeUndefined();
    expect(kidGloss('胡')).toBe('beard');
    expect(zuci('胡').slice(0, 2)).toEqual(['胡子', '胡萝卜']);
    expect(zuci('胡').indexOf('姓胡')).toBeGreaterThan(1);
  });
  it('李 is "plum" through 李子, with 行李, and 姓李 later', () => {
    expect(kidGloss('李')).toBe('plum');
    expect(zuci('李')[0]).toBe('李子');
    expect(zuci('李')).toContain('行李');
    expect(zuci('李').indexOf('姓李')).toBeGreaterThan(0);
  });
  it('a school character glossed as a family name has no child meaning: 「family name X」 with 姓X first, never a bare one', () => {
    const bad = builtinWords(0).filter((w) => schoolTerm(w.text) && w.text !== '姓' && /family name/i.test(kidGloss(w.text) ?? ''))
      .filter((w) => !/^family name [A-Z][a-z]+$/.test(kidGloss(w.text)!) || zuci(w.text)[0] !== `姓${w.text}`).map((w) => w.text);
    expect(bad).toEqual([]);
    expect(['陈', '吴'].map((c) => kidGloss(c))).toEqual(['family name Chen', 'family name Wu']);
  });
});
