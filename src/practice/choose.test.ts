import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import { mulberry32 } from '../lib/random';
import { chooseCount, planChoose, type ChooseInput } from './choose';

const words = ['很', '在', '和', '跟', '吃', '喝'].map((t, i) => makeWord(t, { rank: i + 1 }));
const base = (): ChooseInput => ({
  words, cards: words.map((w) => makeCard(w.id, 'recognise', new Date('2026-10-01'), true)),
  newWordIds: ['b:吃'], meaningDueIds: ['b:喝'], missedIds: [], knownChars: new Set(words.map((w) => w.text)), rng: mulberry32(1), count: 4,
});

describe('planChoose (spec §19 part 3, §20 part 4)', () => {
  it("today's new words first, then due meaning words, then his other words; fit and usage alternate", () => {
    const items = planChoose(base());
    expect(items.slice(0, 2).map((i) => i.word)).toEqual(['吃', '喝']);
    expect(items.map((i) => i.kind)).toEqual(['fit', 'usage', 'fit', 'usage']);
    expect(new Set(items.map((i) => i.word)).size).toBe(4);
    expect(items.every((i) => i.wordId?.startsWith('b:'))).toBe(true);
  });
  it('too few words of his own: bank words he can read fill in, unrecorded (wordId null)', () => {
    const items = planChoose({ ...base(), words: [], cards: [], newWordIds: [], meaningDueIds: [], knownChars: new Set('今天很热这个书包大我一在妈家里做饭桌子上和'.split('')) });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.wordId === null)).toBe(true);
  });
  it('nothing he can read: no items (the step is skipped)', () => {
    expect(planChoose({ ...base(), words: [], cards: [], newWordIds: [], meaningDueIds: [], knownChars: new Set() })).toEqual([]);
  });
  it('about 8 items at 30 minutes, fewer in a shorter lesson, never under 4', () => {
    expect([chooseCount(30), chooseCount(20), chooseCount(10)]).toEqual([8, 5, 4]);
  });
});
