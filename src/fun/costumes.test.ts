import { describe, expect, it } from 'vitest';
import { addDays, localDateKey } from '../lib/date';
import { DEFAULT_KID } from '../types';
import { canOpenChest, costumeById, COSTUMES, ONESIES, openChest, OUTFITS, visibleAccessory, type ChestResult } from './costumes';
import { ACCESSORIES } from './pet';

describe('costumes', () => {
  it('has 12 onesies and 13 outfits with Chinese names', () => {
    expect(ONESIES).toHaveLength(12);
    expect(OUTFITS).toHaveLength(13);
    // the parent's additions (2026-10-06): a robot, a chess rook, a football jersey, basketball, a BJJ gi
    expect(costumeById('robot')).toMatchObject({ zh: '机器人', py: 'jī qì rén', kind: 'outfit' });
    expect(costumeById('rook')).toMatchObject({ zh: '城堡', py: 'chéng bǎo', kind: 'outfit' });
    expect(costumeById('football')).toMatchObject({ zh: '足球服', py: 'zú qiú fú', kind: 'outfit' });
    expect(costumeById('basketball')).toMatchObject({ zh: '篮球服', py: 'lán qiú fú', kind: 'outfit' });
    expect(costumeById('gi')).toMatchObject({ zh: '柔术服', py: 'róu shù fú', kind: 'outfit' });
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

describe('costume and accessory names', () => {
  it('carry one pinyin syllable per character, so the room labels read 星星 xīng xing, not a guess', async () => {
    const { ACCESSORY_DEFS } = await import('./accessories');
    for (const d of [...COSTUMES, ...ACCESSORY_DEFS]) expect(d.py.split(' ').length, d.zh).toBe([...d.zh].length);
  });
});

describe('chest replays', () => {
  it('the same day and the same owned things always give the same prize after the first chest', () => {
    const first = openChest(DEFAULT_KID, '2026-10-02', 'tiger').kid;
    expect(openChest(first, '2026-10-05', 'tiger').result).toEqual(openChest(first, '2026-10-05', 'tiger').result);
  });
});

describe('telling the zodiac onesies apart (parent, 2026-10-06: some were hard to identify)', () => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const far = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]!)) > 70;
  it('the lookalikes no longer share a colour', () => {
    const col = (id: string) => costumeById(id)!.color;
    for (const [a, b] of [['ox', 'horse'], ['ox', 'monkey'], ['ox', 'dog'], ['horse', 'monkey'], ['horse', 'dog'], ['monkey', 'dog'], ['dragon', 'snake'], ['rabbit', 'goat']]) {
      expect(far(col(a!), col(b!)), `${a} vs ${b}`).toBe(true);
    }
  });
});

describe('myth costumes (parent, 2026-10-06: he is really into the Greek myths)', () => {
  it('every Greek god, the heroes and the creatures, and the Chinese figures, in their own wardrobe sets', async () => {
    const { GREEK, CHINESE } = await import('./costumes');
    expect(GREEK.map((c) => c.zh)).toEqual([
      '宙斯', '赫拉', '波塞冬', '得墨忒耳', '雅典娜', '阿波罗', '阿耳忒弥斯', '阿瑞斯', '阿佛洛狄忒', '赫菲斯托斯', '赫尔墨斯', '狄俄尼索斯', '哈迪斯', '赫斯提亚',
      '赫拉克勒斯', '奥德修斯', '珀耳修斯', '阿喀琉斯', '忒修斯', '伊阿宋',
      '美杜莎', '米诺陶洛斯', '飞马', '刻耳柏洛斯',
    ]);
    expect(CHINESE.map((c) => c.zh)).toEqual(['孙悟空', '哪吒', '嫦娥', '后羿', '财神', '招财猫', '舞狮']);
    expect(COSTUMES).toHaveLength(12 + 13 + 24 + 7);
    expect(new Set(COSTUMES.map((c) => c.id)).size).toBe(COSTUMES.length);
    expect(GREEK.every((c) => c.set === 'greek') && CHINESE.every((c) => c.set === 'chinese')).toBe(true);
    expect(costumeById('nezha')).toMatchObject({ py: 'né zhā' });
  });
  it("the first chest still gives his own zodiac animal, never a hooded creature", () => {
    expect(openChest(DEFAULT_KID, '2026-10-02', 'minotaur' as never).result).toEqual({ kind: 'costume', id: 'dragon' });
  });
});

