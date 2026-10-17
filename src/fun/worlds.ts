import { mulberry32, seedFromString } from '../lib/random';
import type { KidState } from '../types';

export type WorldId = 'home' | 'rainforest' | 'bamboo' | 'terraces' | 'dino' | 'lantern' | 'cove' | 'milkyway';
export interface WorldDef { id: WorldId; zh: string; py: string; at: number }

/** One river, in unlock order (spec 2026-10-13 §3.1). "at" is the characters learned since placement (src/placement/journey.ts). */
export const WORLDS: WorldDef[] = [
  { id: 'home', zh: '家门口', py: 'jiā ménkǒu', at: 0 },
  { id: 'rainforest', zh: '雨林', py: 'yǔlín', at: 30 },
  { id: 'bamboo', zh: '竹林', py: 'zhúlín', at: 60 },
  { id: 'terraces', zh: '梯田', py: 'tītián', at: 100 },
  { id: 'dino', zh: '恐龙谷', py: 'kǒnglóng gǔ', at: 150 },
  { id: 'lantern', zh: '灯笼水乡', py: 'dēnglong shuǐxiāng', at: 200 },
  { id: 'cove', zh: '海湾', py: 'hǎiwān', at: 300 },
  { id: 'milkyway', zh: '银河', py: 'yínhé', at: 400 },
];

/** The paper worlds before One River, by position (spec 2026-10-13 §8): his reached worlds and his pick map across. */
export const OLD_WORLDS: Record<string, WorldId> = { yard: 'home', grass: 'rainforest', race: 'bamboo', blocks: 'terraces', dino: 'dino', sea: 'lantern', space: 'cove', pirate: 'milkyway' };
/** A stored world id as a One River id: a new id stays, an old one maps by position, anything else is null. */
export const migrateWorldId = (id: unknown): WorldId | null =>
  typeof id !== 'string' ? null : WORLDS.some((w) => w.id === id) ? (id as WorldId) : Object.hasOwn(OLD_WORLDS, id) ? OLD_WORLDS[id]! : null; // own keys only: "constructor" is no world

const ORDER = new Map(WORLDS.map((w, i) => [w.id as string, i]));
export const worldById = (id: string | null | undefined) => WORLDS.find((w) => w.id === id);
const inOrder = (ids: Iterable<string>) => [...new Set(ids)].filter((id) => ORDER.has(id)).sort((a, b) => ORDER.get(a)! - ORDER.get(b)!) as WorldId[];

export function reachedWorlds(known: number): WorldId[] {
  return WORLDS.filter((w) => known >= w.at).map((w) => w.id);
}

export interface WorldUpdate { kid: KidState; arrived: WorldId | null; changed: boolean }

/** Record newly reached worlds (never removes any). Only the newest new one is announced, never the first (家门口). */
export function updateWorlds(kid: KidState, known: number): WorldUpdate {
  const seen = new Set(kid.worldsSeen);
  const fresh = reachedWorlds(known).filter((id) => !seen.has(id));
  if (!fresh.length) return { kid, arrived: null, changed: false };
  const worldsSeen = inOrder([...kid.worldsSeen, ...fresh]);
  const newest = fresh[fresh.length - 1]!;
  const arrived = newest === 'home' ? null : newest;
  return { kid: { ...kid, worldsSeen, world: arrived ? null : kid.world }, arrived, changed: true };
}

/** His worlds as the count reaches them now, keeping the room's pick only if it is still reached (a one-off when the counting changes). */
export function resetWorlds(kid: KidState, count: number): KidState {
  const worldsSeen = reachedWorlds(count);
  return { ...kid, worldsSeen, world: kid.world && worldsSeen.includes(kid.world as WorldId) ? kid.world : null };
}

export function currentWorld(kid: KidState): WorldId {
  const seen = inOrder(['home', ...kid.worldsSeen]);
  return kid.world && seen.includes(kid.world as WorldId) ? (kid.world as WorldId) : seen[seen.length - 1]!;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export function timeOfDay(d: Date): TimeOfDay {
  const h = d.getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

/** What Truffle says on Home in each world. */
export const WORLD_LINES: Record<WorldId, string[]> = {
  home: ['我们坐纸船去玩！', '水里有水獭！', '小鸟飞得好快！'],
  rainforest: ['好多大树！', '猴子在荡秋千！', '嘘……听，是犀鸟！'],
  bamboo: ['熊猫在吃竹子！', '青蛙跳过石头了！', '山上有雾！'],
  terraces: ['鸭子去游泳了！', '风筝飞得好高！', '水车转呀转！'],
  dino: ['火山在冒烟！', '蛋里有什么？', '翼龙飞过去了！'],
  lantern: ['灯笼好红啊！', '荷花开了吗？', '鱼跳起来了！'],
  cove: ['宝藏在哪里？', '螃蟹走路横着走！', '灯塔亮了！'],
  milkyway: ['星星好多啊！', '小河飞到天上了！', '喜鹊来搭桥！'],
};

export function worldLine(id: WorldId, dateKey: string): string {
  const lines = WORLD_LINES[id];
  return lines[Math.floor(mulberry32(seedFromString(`${id}:${dateKey}`))() * lines.length)]!;
}
