import { describe, expect, it } from 'vitest';
import { builtinWords } from '../../content';
import { ladderWords } from '../../content/ladder';
import { mulberry32 } from '../../lib/random';
import { makeWord } from '../../test/fixtures';
import { alike, meaningChoices, pickCharacterDistractors } from './distractors';
import { ambiguousByEar, heardReadings, readingsOf, sameSound, soundsLike } from './homophones';

describe('sounds alike', () => {
  it('the same syllables and tones; a neutral syllable matches any tone; a different tone is a different sound', () => {
    expect(sameSound('tā', 'tā')).toBe(true);
    expect(sameSound('tā', 'tà')).toBe(false);
    expect(sameSound('tā', 'tà', false)).toBe(true);
    expect(sameSound('de', 'dé')).toBe(true);
    expect(sameSound('tā men', 'tā')).toBe(false);
  });
  it("a lone character by every reading it has: 地 is dì and de, 一 is yī, yí and yì", () => {
    expect(readingsOf('地')).toEqual(expect.arrayContaining(['dì', 'de']));
    expect(readingsOf('一')).toEqual(expect.arrayContaining(['yī', 'yí', 'yì']));
    expect(soundsLike(readingsOf('的', 'de'), readingsOf('地', 'dì'))).toBe(true);
  });
});

const all = [...builtinWords(0), ...ladderWords()];

describe('questions asked by ear alone (parent 2026-10-17: 她 heard, "he, him" marked wrong)', () => {
  it('她: no choice is the meaning of 他 or 它, and the question shows the character', () => {
    const ta = all.find((w) => w.text === '她')!;
    for (let seed = 1; seed <= 200; seed++) {
      const c = meaningChoices(ta, all, mulberry32(seed), undefined, true)!;
      expect(c).toContain('she, her');
      expect(c.filter((x) => /\b(he|him|it)\b/.test(x))).toEqual([]);
    }
    expect(ambiguousByEar(ta, all, alike)).toBe(true);
  });
  it('read for meaning (the character shown) keeps every choice it had', () => {
    const ta = all.find((w) => w.text === '她')!;
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) for (const c of meaningChoices(ta, all, mulberry32(seed))!) seen.add(c);
    expect(seen.size).toBeGreaterThan(20);
  });
  it('only a 同音字 set his book teaches is shown: other words are asked by ear alone', () => {
    const at = (t: string) => all.find((w) => w.text === t)!;
    for (const t of ['门', '爸爸', '大', '视']) expect(ambiguousByEar(at(t), all, alike)).toBe(false); // 视 has sound-alikes, none taught beside it
    for (const t of ['他', '它', '在', '再', '坐', '进', '近']) expect(ambiguousByEar(at(t), all, alike)).toBe(true);
  });
  it('the sound is the one Truffle says: 她 is tā, never its old reading jiě', () => {
    expect(heardReadings(all.find((w) => w.text === '她')!)).toEqual(['tā']);
    expect(heardReadings(all.find((w) => w.text === '一')!)).toEqual(expect.arrayContaining(['yī', 'yí', 'yì']));
  });
  it('find the character by ear: a choice said like it by another of its readings is never offered (的 de, never 地)', () => {
    const chars = builtinWords(0);
    const de = chars.find((w) => w.text === '的')!;
    for (let seed = 1; seed <= 40; seed++) expect(pickCharacterDistractors(de, chars, mulberry32(seed)).map((w) => w.text)).not.toContain('地');
  });
  it("his own word counts: a parent's 他 beside a 她", () => {
    const she = makeWord('她', { pinyin: 'tā', meaning: 'she', source: 'parent', id: 'p:she' });
    const he = makeWord('他', { pinyin: 'tā', meaning: 'he', source: 'parent', id: 'p:he' });
    const others = ['big', 'door', 'water', 'fire', 'tree'].map((m, i) => makeWord('大门水火树'[i]!, { meaning: m, source: 'parent', id: `p:${i}`, pinyin: ['dà', 'mén', 'shuǐ', 'huǒ', 'shù'][i]! }));
    for (let seed = 1; seed <= 30; seed++) expect(meaningChoices(she, [she, he, ...others], mulberry32(seed), undefined, true)).not.toContain('he');
  });

});
