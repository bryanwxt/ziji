import { describe, expect, it } from 'vitest';
import { HSK_WORDS } from '../../content';
import { makeWord } from '../../test/fixtures';
import { mulberry32 } from '../../lib/random';
import { buildZibianRound, lookAlikeChars, zibianCount } from './zibian';

describe('字辨 (spec §20 part 8)', () => {
  it('look-alikes share the phonetic part first (跟 → 根 很 银), then the radical (容 → 室)', () => {
    expect(lookAlikeChars('跟')).toEqual(expect.arrayContaining(['根', '很', '银']));
    expect(lookAlikeChars('容')).toContain('室');
    expect(lookAlikeChars('跟')).not.toContain('跟');
  });
  it('builds a word with one character missing and 4 look-alike choices, none of which makes another real word there', () => {
    const words = [makeWord('树根', { id: 'p:1', source: 'parent', level: null, listedAt: 1 }), ...'根跟很银恨树爸妈'.split('').map((c) => makeWord(c))];
    for (let seed = 1; seed < 10; seed++) {
      const round = buildZibianRound({ words, knownChars: new Set('根跟很银恨树'), practised: new Map(), rng: mulberry32(seed), count: 1 })!;
      const item = round[0]!;
      expect(item.word).toBe('树根');
      expect(item.options).toContain(item.answer);
      expect(new Set(item.options).size).toBe(4);
      for (const o of item.options.filter((x) => x !== item.answer)) expect(HSK_WORDS.has([...item.word].map((c, i) => (i === item.index ? o : c)).join(''))).toBe(false);
    }
  });
  it('a single character practises inside one of its 组词 words', () => {
    const gen = makeWord('跟', { examples: [{ text: '跟着', pinyin: 'gēn zhe' }], listedAt: 1 });
    const round = buildZibianRound({ words: [gen], knownChars: new Set('根跟很银'), practised: new Map(), rng: mulberry32(1), count: 1 })!;
    expect(round[0]).toMatchObject({ wordId: 'b:跟', word: '跟着', index: 0, answer: '跟' });
  });
  it('his class-list words and recent words only, newest first', () => {
    const words = [makeWord('跟', { examples: [{ text: '跟着', pinyin: '' }] }), makeWord('根', { examples: [{ text: '树根', pinyin: '' }], listedAt: 5 })];
    const round = buildZibianRound({ words, knownChars: new Set('根跟很银恨树'), practised: new Map([['b:跟', 9]]), rng: mulberry32(1), count: 2 })!;
    expect(round.map((r) => r.wordId)).toEqual(['b:跟', 'b:根']); // 跟 answered at 9 is newer than 根 listed at 5
  });
  it('fewer than 4 items can be built: no round (the step is skipped)', () => {
    expect(buildZibianRound({ words: [makeWord('一', { listedAt: 1 })], knownChars: new Set('一'), practised: new Map(), rng: mulberry32(1), count: 6 })).toBeNull();
  });
  it('6 items at 30 minutes, 4 in a shorter lesson', () => expect([zibianCount(30), zibianCount(20)]).toEqual([6, 4]));
  it('his own mistake comes first: same phonetic part, different radical (银 → 根 很 跟), before same-radical characters (铁 钟)', () => {
    const w = makeWord('银行', { id: 'p:2', source: 'parent', level: null, listedAt: 1 });
    for (let seed = 1; seed < 15; seed++) {
      const round = buildZibianRound({ words: [w], knownChars: new Set('根很跟铁钟银行'), practised: new Map(), rng: mulberry32(seed), count: 1 })!;
      const item = round[0]!;
      if (item.answer !== '银') continue; // this seed blanked 行
      expect(item.options.filter((o) => o !== '银').sort()).toEqual(['很', '跟', '根'].sort());
    }
  });
});
