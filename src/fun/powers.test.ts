import { describe, expect, it } from 'vitest';
import { BUILTIN } from '../content';
import { newTiers, powerFamilies, powerOf, powerProgress, POWERS, tierFor } from './powers';

describe('powers', () => {
  const fam = powerFamilies(BUILTIN);
  it('builds families from content, leaving out 冫 and the radicals themselves', () => {
    expect(POWERS).toHaveLength(11);
    expect(fam.water).toContain('河');
    expect(fam.water).not.toContain('冷');
    expect(fam.water).not.toContain('水');
    expect(fam.fire).not.toContain('火');
    expect(fam.metal.length).toBeGreaterThanOrEqual(5);
  });
  it('tiers: 3 known, half, all — sensible for tiny families', () => {
    expect([0, 2, 3, 9, 10, 19, 20].map((k) => tierFor(20, k))).toEqual([0, 0, 1, 1, 2, 2, 3]);
    // size 5: t1 = 3, t2 = max(ceil(5/2), t1) = 3, t3 = 5 → the higher tier wins when thresholds coincide
    expect([0, 2, 3, 4, 5].map((k) => tierFor(5, k))).toEqual([0, 0, 2, 2, 3]);
    // size 2: t1 = t2 = t3 = 2 → nothing until both are known, then mastered
    expect([0, 1, 2].map((k) => tierFor(2, k))).toEqual([0, 0, 3]);
    expect(tierFor(0, 0)).toBe(0);
  });
  it('reports only tiers above what the child has already seen', () => {
    const p = powerProgress({ ...fam, water: ['河', '海', '湖', '洗'] }, new Set(['河', '海', '湖', '洗']));
    const w = p.find((x) => x.id === 'water')!;
    expect(w.tier).toBe(3);
    expect(newTiers(p, { water: 3 }).find((n) => n.id === 'water')).toBeUndefined();
    expect(newTiers(p, { water: 1 }).find((n) => n.id === 'water')?.tier).toBe(3);
  });
  it("knows a character's power", () => {
    expect(powerOf(BUILTIN.find((c) => c.char === '河')!)).toBe('water');
    expect(powerOf(BUILTIN.find((c) => c.char === '大')!)).toBeNull();
  });
});

describe('power families with HSK 1–9 content', () => {
  it('count only HSK 1–2 characters, so tiers keep the pace they were tuned for', () => {
    const fam = powerFamilies(BUILTIN);
    const level = new Map(BUILTIN.map((c) => [c.char, c.level]));
    expect(Object.values(fam).flat().every((ch) => level.get(ch)! <= 2)).toBe(true);
    expect(fam.water.length).toBeGreaterThan(3);
  });
});
