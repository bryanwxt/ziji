import { describe, expect, it } from 'vitest';
import { addDays, localDateKey } from '../lib/date';
import { DEFAULT_KID } from '../types';
import { canOpenChest, costumeById, COSTUMES, ONESIES, openChest, OUTFITS, visibleAccessory, type ChestResult } from './costumes';
import { ACCESSORIES } from './pet';

describe('costumes', () => {
  it('has 12 onesies and 8 outfits with Chinese names', () => {
    expect(ONESIES).toHaveLength(12);
    expect(OUTFITS).toHaveLength(8);
    expect(costumeById('tiger')).toMatchObject({ zh: '虎', py: 'hǔ', kind: 'onesie' });
    expect(costumeById('nope')).toBeUndefined();
  });
  it("first chest is the child's zodiac onesie (dragon by default), once", () => {
    const a = openChest(DEFAULT_KID, '2026-10-02', 'tiger');
    expect(a.result).toEqual({ kind: 'costume', id: 'tiger' });
    expect(a.kid.ownedCostumes).toEqual(['tiger']);
    expect(openChest(DEFAULT_KID, '2026-10-02', null).result).toEqual({ kind: 'costume', id: 'dragon' });
    const b = openChest(a.kid, '2026-10-03', 'rabbit');
    expect(b).toEqual(openChest(a.kid, '2026-10-03', null)); // the zodiac only matters for the very first chest
    expect(canOpenChest(b.kid, '2026-10-03')).toBe(false);
  });
  it('dragon-era installs with accessories still get the zodiac first', () => {
    const old = { ...DEFAULT_KID, ownedAccessories: ['medal', 'moustache'], lastChestDate: '2026-09-30' };
    expect(openChest(old, '2026-10-02', 'pig').result).toEqual({ kind: 'costume', id: 'pig' });
  });
  it('never repeats; stars when everything is owned', () => {
    let kid = { ...DEFAULT_KID };
    const seen = new Set<string>();
    for (let d = 0; d < COSTUMES.length + ACCESSORIES.length; d++) {
      const day = localDateKey(addDays(new Date(2026, 10, 1), d));
      const { kid: next, result } = openChest(kid, day, 'dog');
      const key = result.kind === 'costume' ? result.id : result.kind === 'accessory' ? result.item : 'stars';
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      kid = next;
    }
    expect(openChest(kid, '2026-12-25', 'dog').result).toEqual({ kind: 'stars', amount: 3 });
  });
  it('accessories are add-ons: they show with any costume', () => {
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: 'scarf', outfit: 'tiger' })).toBe('scarf');
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: 'wand', outfit: 'wizard' })).toBe('wand');
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: 'jetpack', outfit: 'bogus' })).toBe('jetpack');
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: 'bogus', outfit: null })).toBeNull();
  });

});

describe('costume input hardening', () => {
  it('ignores an unknown zodiac or unknown owned ids', () => {
    expect(openChest(DEFAULT_KID, '2026-10-02', 'bogus' as never).result).toEqual({ kind: 'costume', id: 'dragon' });
    expect(openChest({ ...DEFAULT_KID, ownedCostumes: ['bogus'] }, '2026-10-02', 'pig').result).toEqual({ kind: 'costume', id: 'pig' });
  });
});

describe('chest after migrating a dragon-era profile', () => {
  it('never re-awards a migrated accessory and still ends in stars', async () => {
    const { normalizeKid } = await import('../store/repo');
    let kid = normalizeKid({ ...DEFAULT_KID, ownedAccessories: ['👑', '🎓', '⭐'], wearing: '👑', ownedCostumes: ['tiger'] })!;
    const owned = new Set(kid.ownedAccessories);
    for (let d = 0; d < COSTUMES.length + ACCESSORIES.length; d++) {
      const { kid: next, result } = openChest(kid, localDateKey(addDays(new Date(2027, 0, 1), d)), 'dog');
      if (result.kind === 'accessory') expect(owned.has(result.item)).toBe(false);
      if (result.kind === 'accessory') owned.add(result.item);
      kid = next;
    }
    expect(openChest(kid, '2027-06-01', 'dog').result).toEqual({ kind: 'stars', amount: 3 });
  });
});

describe('chest result types', () => {
  it('a costume from the chest is a real costume id (checked by tsc in the build)', () => {
    // @ts-expect-error not a costume
    const bad: ChestResult = { kind: 'costume', id: 'banana' };
    expect(bad.kind).toBe('costume');
  });
});
