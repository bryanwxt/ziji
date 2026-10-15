import { describe, expect, it } from 'vitest';
import { addDays, localDateKey } from '../lib/date';
import { DEFAULT_KID, type KidState } from '../types';
import { costumeLayer } from '../ui/truffle/costumes';
import { CHEST_COSTUMES, CHINESE, costumeById, COSTUMES, costumesLeft, GREEK, inChest, JOBS, OLD_OUTFITS, ONESIES, openChest, prizeGroup, visibleAccessory, type ChestResult } from './costumes';
import { EMPTY_METER } from './meter';
import { ACCESSORIES } from './pet';

const day = (d: number) => localDateKey(addDays(new Date(2026, 10, 1), d));
const groupOf = (r: ChestResult) => (r.kind === 'accessory' ? 'accessory' : r.kind === 'stars' ? 'stars' : prizeGroup(costumeById(r.id)!));

describe('the costume catalogue (rewards spec §5.2)', () => {
  it('keeps the 12 zodiac onesies; jobs and Chinese myths are in the chest; Greek and the old outfits are out of it', () => {
    expect(ONESIES.map((c) => c.zh)).toEqual(['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']);
    expect(CHINESE.map((c) => c.zh)).toEqual(['孙悟空', '哪吒', '嫦娥', '后羿', '财神', '招财猫', '舞狮']);
    expect(GREEK).toHaveLength(23);
    expect(OLD_OUTFITS.map((c) => c.zh)).toEqual(['探险家', '超人', '像素', '雨衣', '机器人', '城堡', '篮球服', '柔术服']);
    expect(costumeById('football')).toMatchObject({ zh: '足球员', py: 'zú qiú yuán', set: 'job' }); // its id is kept: owned ones stay owned
    expect(JOBS.every(inChest) && CHINESE.every(inChest) && ONESIES.every(inChest)).toBe(true);
    expect(CHEST_COSTUMES.some((c) => c.set === 'greek' || c.set === 'old')).toBe(false);
    expect(new Set(COSTUMES.map((c) => c.id)).size).toBe(COSTUMES.length);
    expect(costumeById('nope')).toBeUndefined();
  });
  it('names carry one pinyin syllable per character', async () => {
    const { ACCESSORY_DEFS } = await import('./accessories');
    for (const d of [...COSTUMES, ...ACCESSORY_DEFS]) expect(d.py.split(' ').length, d.zh).toBe([...d.zh].length);
  });
  it('accessories are add-ons: they show with any costume', () => {
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: 'scarf', outfit: 'tiger' })).toBe('scarf');
    expect(visibleAccessory({ ...DEFAULT_KID, wearing: 'bogus', outfit: null })).toBeNull();
  });
});

describe('the chest (rewards spec §5.3)', () => {
  it('a round is a onesie, then a job or myth, then an accessory, before any group repeats', () => {
    let kid: KidState = { ...DEFAULT_KID };
    const groups: string[] = [];
    for (let d = 0; d < 9; d++) {
      const { kid: next, result } = openChest(kid, day(d));
      groups.push(groupOf(result));
      kid = next;
    }
    expect(groups).toEqual(['onesie', 'story', 'accessory', 'onesie', 'story', 'accessory', 'onesie', 'story', 'accessory']);
  });
  it('a group already ahead waits: a profile with many onesies gets jobs, myths and accessories first', () => {
    const kid = { ...DEFAULT_KID, ownedCostumes: ['rat', 'ox', 'tiger'] };
    expect(groupOf(openChest(kid, day(0)).result)).toBe('story');
  });
  it('never repeats, never gives a removed item, and ends in 3 bonus stars (review focus 5)', () => {
    let kid: KidState = { ...DEFAULT_KID, ownedCostumes: ['zeus', 'robot'] };
    const seen = new Set<string>();
    for (let d = 0; d < CHEST_COSTUMES.length + ACCESSORIES.length; d++) {
      const { kid: next, result } = openChest(kid, day(d));
      expect(result.kind).not.toBe('stars');
      const key = result.kind === 'costume' ? result.id : result.kind === 'accessory' ? result.item : '';
      if (result.kind === 'costume') expect(inChest(costumeById(result.id)!), key).toBe(true);
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      kid = next;
    }
    const end = openChest(kid, '2027-06-01');
    expect(end.result).toEqual({ kind: 'stars', amount: 3 });
    expect(end.kid.bonusStars).toBe(kid.bonusStars + 3);
    expect(end.kid.ownedCostumes).toEqual(expect.arrayContaining(['zeus', 'robot'])); // what he had stays
  });
  it('opening takes one owed chest and marks the day', () => {
    const { kid } = openChest({ ...DEFAULT_KID, meter: { ...EMPTY_METER, owed: 2 } }, '2026-10-15');
    expect(kid.meter.owed).toBe(1);
    expect(kid.lastChestDate).toBe('2026-10-15');
    expect(openChest(kid, '2026-10-15').kid.meter.owed).toBe(0);
    expect(openChest({ ...DEFAULT_KID }, '2026-10-15').kid.meter.owed).toBe(0); // never below 0
  });
  it('a kid with no meter or a damaged one (an old backup) still opens: owed stays a safe count (fix round 1)', () => {
    expect(openChest({ ...DEFAULT_KID, meter: undefined as never }, '2026-10-15').kid.meter.owed).toBe(0);
    expect(openChest({ ...DEFAULT_KID, meter: { owed: 'x' } as never }, '2026-10-15').kid.meter).toEqual({ ...EMPTY_METER, owed: 0 });
    expect(openChest({ ...DEFAULT_KID, meter: { ...EMPTY_METER, owed: 9 } }, '2026-10-15').kid.meter.owed).toBe(3);
  });
  it('the same day and the same owned things always give the same prize', () => {
    expect(openChest(DEFAULT_KID, '2026-10-05').result).toEqual(openChest(DEFAULT_KID, '2026-10-05').result);
  });
  it('unknown owned ids are ignored', () => {
    expect(openChest({ ...DEFAULT_KID, ownedCostumes: ['bogus'] }, '2026-10-02').result.kind).toBe('costume');
  });
  it('a dragon-era profile: a migrated accessory is never awarded again, and the chest still ends in stars', async () => {
    const { normalizeKid } = await import('../store/repo');
    let kid = normalizeKid({ ...DEFAULT_KID, ownedAccessories: ['👑', '🎓', '⭐'], wearing: '👑', ownedCostumes: ['tiger'] })!;
    const owned = new Set(kid.ownedAccessories);
    for (let d = 0; d < CHEST_COSTUMES.length + ACCESSORIES.length; d++) {
      const { kid: next, result } = openChest(kid, day(d));
      if (result.kind === 'accessory') expect(owned.has(result.item)).toBe(false);
      if (result.kind === 'accessory') owned.add(result.item);
      kid = next;
    }
    expect(openChest(kid, '2027-06-01').result).toEqual({ kind: 'stars', amount: 3 });
  });
  it('how many new clothes are left in it (the chest goal)', () => {
    expect(costumesLeft(DEFAULT_KID)).toBe(CHEST_COSTUMES.length);
    expect(costumesLeft({ ...DEFAULT_KID, ownedCostumes: ['tiger', 'zeus'] })).toBe(CHEST_COSTUMES.length - 1); // zeus is not in the chest
  });
  it('a costume from the chest is a real costume id (checked by tsc in the build)', () => {
    // @ts-expect-error not a costume
    const bad: ChestResult = { kind: 'costume', id: 'banana' };
    expect(bad.kind).toBe('costume');
  });
});

describe('costumes out of the chest stay his (rewards spec §5.2, review focus 5)', () => {
  it('every Greek and old costume still draws, for whoever owns it', () => {
    for (const c of COSTUMES.filter((x) => !inChest(x))) expect(costumeLayer(c.id), c.id).not.toBeNull();
  });
});

describe('telling the onesies apart (parent, 2026-10-06; rewards spec §5.1: one dominant colour each)', () => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const far = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]!)) > 70;
  /** Lookalike pairs; each costume task adds its own (only pairs whose costumes exist are checked). */
  const PAIRS: [string, string][] = [['ox', 'horse'], ['ox', 'monkey'], ['ox', 'dog'], ['horse', 'monkey'], ['horse', 'dog'], ['monkey', 'dog'], ['dragon', 'snake'], ['rabbit', 'goat'], ['koi', 'crab']];
  it('the lookalikes never share a colour', () => {
    for (const [a, b] of PAIRS) {
      const ca = costumeById(a);
      const cb = costumeById(b);
      if (ca && cb) expect(far(ca.color, cb.color), `${a} vs ${b}`).toBe(true);
    }
  });
});
