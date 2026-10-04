import { describe, expect, it } from 'vitest';
import { BUILTIN } from '../content';
import type { BuiltinChar } from '../types';
import { completedBadges, familyProgress, newBadges, stickerFamilies } from './stickers';

const ch = (char: string, radical: string, components: string[], rank: number): BuiltinChar => ({
  char, pinyin: '', meaning: '', level: 1, rank, radical, components, strokes: 1, writeable: false, examples: [],
});
const builtin = [
  ch('河', '氵', ['氵', '可'], 3), ch('汉', '氵', ['氵', '又'], 1), ch('洗', '氵', ['氵', '先'], 2),
  ch('吃', '口', ['口', '乞'], 4), ch('叫', '口', ['口', '丩'], 5), ch('喝', '口', ['口', '曷'], 7),
  ch('日', '日', ['口', '一'], 6), ch('水', '水', [], 0),
];

describe('sticker families', () => {
  const families = stickerFamilies(builtin);
  it('groups characters by radical, keeping families of 3 or more, in rank order', () => {
    expect(families.map((f) => [f.component, f.chars])).toEqual([['口', ['吃', '叫', '喝']], ['氵', ['汉', '洗', '河']]]);
  });
  it('tracks progress and completed badges', () => {
    expect(familyProgress(families.find((f) => f.component === '氵')!, new Set(['汉', '洗']))).toEqual({ known: 2, total: 3, complete: false });
    const all = new Set(['汉', '洗', '河']);
    expect(completedBadges(families, all)).toEqual(['氵']);
    expect(newBadges(families, all, [])).toEqual(['氵']);
    expect(newBadges(families, all, ['氵'])).toEqual([]);
  });
  it('finds plenty of families in the real built-in set', () => {
    const real = stickerFamilies(BUILTIN);
    expect(real.length).toBeGreaterThan(10);
    expect(real[0]!.chars.length).toBeGreaterThanOrEqual(10);
  });
});

describe('sticker badges with HSK 1–9 content', () => {
  it('families count HSK 1–2 characters only, so badges stay as earnable as they were tuned', () => {
    const level = new Map(BUILTIN.map((c) => [c.char, c.level]));
    const fams = stickerFamilies(BUILTIN);
    expect(fams.flatMap((f) => f.chars).every((ch) => level.get(ch)! <= 2)).toBe(true);
    expect(fams.find((f) => f.component === '氵')!.chars.length).toBeLessThan(40);
  });
});

