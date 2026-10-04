import { describe, expect, it } from 'vitest';
import { BUILTIN, builtinWords } from '../content';
import { summarize } from '../stats/stats';
import { makeCard } from '../test/fixtures';
import { collectionCards, starsFor } from './collection';

describe('collection', () => {
  it('stars by memory strength', () => {
    expect([0.5, 6.9, 7, 29, 30, 200].map(starsFor)).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it('one card per built-in character; caught, gold and rarity', () => {
    const rec = makeCard('b:河', 'recognise', new Date(2026, 9, 20), true);
    rec.fsrs = { ...rec.fsrs, stability: 40 };
    const wr = makeCard('b:河', 'write', new Date(2026, 9, 20), true);
    const cards = collectionCards(BUILTIN, summarize(builtinWords(0), [rec, wr]));
    const he = BUILTIN.find((c) => c.char === '河')!.level;
    expect(cards).toHaveLength(BUILTIN.filter((c) => c.level <= Math.max(2, he + 1)).length); // up to one level past his highest
    expect(cards.find((c) => c.char === '河')).toMatchObject({ caught: true, stars: 3, gold: true, power: 'water' });
    expect(cards.find((c) => c.char === '大')).toMatchObject({ caught: false, stars: 0, gold: false });
    expect(new Set(cards.map((c) => c.rarity))).toEqual(new Set(['common', 'rare']));
  });
  it('shows the HSK levels he is working in: every caught card, and backs up to one level past his highest', () => {
    const lv = (c: string) => BUILTIN.find((b) => b.char === c)!.level;
    const hsk4 = BUILTIN.find((b) => b.level === 4)!.char;
    const rec = makeCard(`b:${hsk4}`, 'recognise', new Date(2026, 9, 20), true);
    const cards = collectionCards(BUILTIN, summarize(builtinWords(0), [rec]));
    expect(cards.find((c) => c.char === hsk4)?.caught).toBe(true);
    expect(Math.max(...cards.map((c) => lv(c.char)))).toBe(5);
    expect(cards).toHaveLength(BUILTIN.filter((c) => c.level <= 5).length);
  });
});
