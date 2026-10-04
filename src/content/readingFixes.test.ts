import { describe, expect, it } from 'vitest';
import { builtinWords } from '.';
import { pickPinyinDistractors } from '../activities/flashcards/distractors';
import { trapReadings } from '../activities/flashcards/pinyinTraps';
import { mulberry32 } from '../lib/random';
import { makeWord } from '../test/fixtures';

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));

describe('readings a P2 child meets (deferred minors, plans 1 and 5)', () => {
  it('了 is read le, the way he meets it every day (liǎo only in words like 了解)', () => {
    expect(byText.get('了')!.pinyin).toBe('le');
  });
  it('包子 is bāo zi everywhere it appears', () => {
    for (const ch of ['包', '子']) expect(byText.get(ch)!.examples!.find((e) => e.text === '包子')?.pinyin ?? 'bāo zi').toBe('bāo zi');
  });
  it('never offers the toneless form of the answer as wrong (爸 is ba in 爸爸)', () => {
    for (const ch of ['爸', '妈', '哥', '子']) {
      const w = byText.get(ch)!;
      const plain = w.pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '');
      for (let seed = 1; seed < 40; seed++) expect(pickPinyinDistractors(w, words, mulberry32(seed))).not.toContain(plain);
    }
  });
  it('八 and 七 change tone before a 4th tone like 一 and 不: bá and qí are never offered as wrong', () => {
    for (const [ch, alt] of [['八', 'bá'], ['七', 'qí']] as const) {
      for (let seed = 1; seed < 40; seed++) expect(pickPinyinDistractors(byText.get(ch)!, words, mulberry32(seed))).not.toContain(alt);
    }
  });
  it('a 轻声 word whose full-tone reading is also a word (东西 dōng xī) is never given that reading as a trap', () => {
    expect(trapReadings(makeWord('东西', { pinyin: 'dōng xi', source: 'parent', level: null }))).not.toContain('dōng xī');
    expect(trapReadings(makeWord('桌子', { pinyin: 'zhuō zi', source: 'parent', level: null }))).toContain('zhuō zǐ'); // an ordinary 轻声 word still gets its trap
  });
});
