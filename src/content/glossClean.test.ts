import { describe, expect, it } from 'vitest';
import data from './glossary.json';
import { cleanGloss, glossFor } from './glossary';

const entries = (data as { entries: Record<string, string> }).entries;

describe('glosses a child reads (parent 2026-10-07: 衣 "clothes; Kangxi radical 145")', () => {
  it('drops radical notes and the cut-off "(abbr. for" / "(variant of"', () => {
    expect(cleanGloss('clothes; Kangxi radical 145')).toBe('clothes');
    expect(cleanGloss('Kangxi radical 118')).toBeUndefined();
    expect(cleanGloss('senior high school (abbr. for')).toBe('senior high school');
    expect(cleanGloss('wheat; barley; oats; mic (abbr. for')).toBe('wheat; barley; oats');
    expect(cleanGloss('to praise; to laud (variant of')).toBe('to praise; to laud');
    expect(cleanGloss('bird; bird radical in Chinese characters')).toBe('bird');
  });
  it('no card gloss carries a dictionary note', () => {
    const bad = Object.keys(entries).map((w) => [w, glossFor(w)] as const).filter(([, g]) => g && /radical|Kangxi|abbr\.|variant of|\($/i.test(g));
    expect(bad).toEqual([]);
    expect(glossFor('衣')).toBe('clothes');
  });
});
