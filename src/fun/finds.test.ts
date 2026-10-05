import { describe, expect, it } from 'vitest';
import { DEFAULT_FINDS, dig, findAnimal, hatchAfterLesson, tapEgg, tapGem, ZODIAC_ORDER } from './finds';

const D1 = '2026-10-06';
const D2 = '2026-10-07';

describe('animals in the tall grass', () => {
  it('finds the next animal in zodiac order, one new one a day', () => {
    const a = findAnimal(DEFAULT_FINDS, D1);
    expect(a).toMatchObject({ animal: 'rat', isNew: true });
    expect(a.finds.animals).toEqual(['rat']);
    const again = findAnimal(a.finds, D1);
    expect(again).toMatchObject({ animal: 'rat', isNew: false });
    expect(again.finds.animals).toEqual(['rat']);
    expect(findAnimal(again.finds, D2)).toMatchObject({ animal: 'ox', isNew: true });
  });
  it('once all twelve are found, one waves', () => {
    const all = { ...DEFAULT_FINDS, animals: [...ZODIAC_ORDER], lastAnimalDate: '2026-01-01' };
    const r = findAnimal(all, D1);
    expect(r.isNew).toBe(false);
    expect(ZODIAC_ORDER).toContain(r.animal);
    expect(r.finds.animals).toHaveLength(12);
  });
});

describe('gems in the block world', () => {
  it('three taps crack the block, the fourth pops one gem a day', () => {
    expect(tapGem(DEFAULT_FINDS, D1, 1)).toMatchObject({ cracks: 1, gem: false });
    expect(tapGem(DEFAULT_FINDS, D1, 3)).toMatchObject({ cracks: 3, gem: false });
    const got = tapGem(DEFAULT_FINDS, D1, 4);
    expect(got).toMatchObject({ cracks: 3, gem: true });
    expect(got.finds.gems).toBe(1);
    expect(tapGem(got.finds, D1, 4)).toMatchObject({ gem: false });
    expect(tapGem(got.finds, D2, 4).finds.gems).toBe(2);
  });
});

describe('the dino egg', () => {
  it('hatches only after a lesson that follows a tap on the egg', () => {
    expect(hatchAfterLesson(DEFAULT_FINDS).dinoHatched).toBe(false);
    const tapped = tapEgg(DEFAULT_FINDS);
    expect(tapped.eggTapped).toBe(true);
    expect(hatchAfterLesson(tapped).dinoHatched).toBe(true);
  });
});

describe('treasure on the island', () => {
  it('the first dig each day gives one star', () => {
    const a = dig(DEFAULT_FINDS, D1);
    expect(a.star).toBe(true);
    expect(dig(a.finds, D1).star).toBe(false);
    expect(dig(a.finds, D2).star).toBe(true);
  });
});

describe('applyFind (final review: a find adds to what is stored, never writes over it)', () => {
  it('adds what the find changed onto the stored state', async () => {
    const { applyFind, DEFAULT_FINDS: D } = await import('./finds');
    const before = { finds: { ...D, animals: ['rat'], gems: 1 }, bonusStars: 3 };
    const after = { finds: { ...D, animals: ['rat', 'ox'], gems: 1, lastAnimalDate: '2026-10-06' }, bonusStars: 3 };
    const stored = { finds: { ...D, animals: ['rat'], gems: 2, lastGemDate: '2026-10-06' }, bonusStars: 4 }; // a gem and a star saved meanwhile
    expect(applyFind(stored, before, after)).toEqual({
      finds: { ...D, animals: ['rat', 'ox'], gems: 2, lastAnimalDate: '2026-10-06', lastGemDate: '2026-10-06' },
      bonusStars: 4,
    });
    const dug = { finds: { ...before.finds, lastDigDate: '2026-10-06' }, bonusStars: 4 };
    expect(applyFind(stored, before, dug).bonusStars).toBe(5);
  });
});
