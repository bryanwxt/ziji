import { describe, expect, it } from 'vitest';
import { DEFAULT_KID, type KidState } from '../types';
import { CHEST_COSTUMES } from './costumes';
import { almostThere, type GoalFacts } from './goals';
import { POWERS, type PowerId } from './powers';
import type { StickerFamily } from './stickers';

const NOW = new Date(2026, 9, 15, 17, 0);
const T = NOW.getTime();
const noPowers = Object.fromEntries(POWERS.map((p) => [p.id, []])) as unknown as Record<PowerId, string[]>;
const facts = (over: Partial<GoalFacts> = {}): GoalFacts => ({ journey: 0, oneDay: [], lessonChars: new Set(), counted: false, families: [], powers: noPowers, ...over });
/** Owns every chest costume: no chest goal unless a test wants one. */
const allOwned: KidState = { ...DEFAULT_KID, ownedCostumes: CHEST_COSTUMES.map((c) => c.id) };
const know = (chars: string) => ({ knownChars: new Set([...chars]) });
const wood: StickerFamily = { component: '木', meaning: { zh: '树木', en: 'tree', icon: 'tree' }, chars: ['林', '森', '树', '村'] };

describe('almost there (rewards spec §4)', () => {
  it('nothing near: nothing shown', () => {
    expect(almostThere(allOwned, know(''), facts(), NOW)).toEqual([]); // 雨林 is 30 away and the lesson moved nothing
  });
  it('the next world: close, or moved by today', () => {
    expect(almostThere(allOwned, know(''), facts({ journey: 22 }), NOW)).toEqual([{ kind: 'world', zh: '还差 8 个字到 雨林', icon: 'mountain', effort: 8 }]);
    expect(almostThere(allOwned, know('水'), facts({ journey: 5, lessonChars: new Set(['水']) }), NOW)[0]).toMatchObject({ kind: 'world', effort: 25 });
  });
  it('the next power tier: 3 known, then half, then all', () => {
    const powers = { ...noPowers, water: ['河', '湖', '海', '洗', '没', '游'] };
    expect(almostThere(allOwned, know('河湖'), facts({ powers }), NOW)).toEqual([{ kind: 'power', zh: '再认识 1 个『水』字，解锁新能力', icon: 'drop', effort: 1 }]);
    expect(almostThere(allOwned, know('河湖海洗'), facts({ powers }), NOW)[0]).toMatchObject({ kind: 'power', effort: 2 });
  });
  it('can write or say tomorrow: up to two words, from the closest line', () => {
    const oneDay = [{ text: '鱼', kind: 'write' as const, at: T }, { text: '林', kind: 'say' as const, at: T - 1 }, { text: '森', kind: 'write' as const, at: T - 2 }];
    expect(almostThere(allOwned, know(''), facts({ oneDay }), NOW).map((g) => g.zh)).toEqual(['明天再写对『鱼』，就会写了！', '明天再说对『林』，就会说了！']);
  });
  it('the chest: the new clothes still in it, effort the halves to a full meter', () => {
    const kid = { ...DEFAULT_KID, meter: { halves: 1, chestsToday: 1, day: '2026-10-15', owed: 0, lesson: 1 } };
    expect(almostThere(kid, know(''), facts({ counted: true }), NOW)).toEqual([{ kind: 'chest', zh: `宝箱里还有 ${CHEST_COSTUMES.length} 件新衣服`, icon: 'gift', effort: 1 }]);
  });
  it("the chest on a new day: the boat sits where Home shows it, with the bank in it (fix round 1)", () => {
    const kid = { ...DEFAULT_KID, meter: { halves: 0, chestsToday: 2, day: '2026-10-14', owed: 0, lesson: 1 }, bank: 1 };
    expect(almostThere(kid, know(''), facts({ counted: true }), NOW)[0]).toMatchObject({ kind: 'chest', effort: 1 });
  });
  it('a badge: the family nearest to complete', () => {
    expect(almostThere(allOwned, know('林森'), facts({ families: [wood] }), NOW)).toEqual([{ kind: 'badge', zh: '再认识 2 个『木』字，得到新徽章', icon: 'medal', effort: 2 }]);
    expect(almostThere(allOwned, know('林森树村'), facts({ families: [wood] }), NOW)).toEqual([]); // complete: the Celebration's 新徽章 phase shows it instead
  });
  it('far away and untouched by today: left out; touched today: shown', () => {
    const big: StickerFamily = { ...wood, chars: Array.from({ length: 30 }, (_, i) => String.fromCharCode(0x4e00 + i)) };
    expect(almostThere(allOwned, know(''), facts({ families: [big] }), NOW)).toEqual([]);
    expect(almostThere(allOwned, know('一'), facts({ families: [big], lessonChars: new Set(['一']) }), NOW)[0]).toMatchObject({ kind: 'badge', effort: 29 });
  });
  it('ranks by the smallest effort (ties: write, chest, badge, power, world) and never shows more than 3', () => {
    const powers = { ...noPowers, water: ['河', '湖', '海', '洗'] };
    const goals = almostThere(DEFAULT_KID, know('河湖林森'), facts({ journey: 22, powers, families: [wood], oneDay: [{ text: '鱼', kind: 'write', at: T }], counted: true }), NOW);
    expect(goals.map((g) => g.kind)).toEqual(['write', 'power', 'chest']);
  });
});
