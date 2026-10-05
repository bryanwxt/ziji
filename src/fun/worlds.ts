import { mulberry32, seedFromString } from '../lib/random';
import type { KidState } from '../types';

export type WorldId = 'yard' | 'grass' | 'race' | 'blocks' | 'dino' | 'sea' | 'space' | 'pirate';
export interface WorldDef { id: WorldId; zh: string; py: string; at: number }

/** The journey, in unlock order. "at" is the characters learned since placement (src/placement/journey.ts). */
export const WORLDS: WorldDef[] = [
  { id: 'yard', zh: '后院', py: 'hòuyuàn', at: 0 },
  { id: 'grass', zh: '草丛', py: 'cǎocóng', at: 30 },
  { id: 'race', zh: '赛车山', py: 'sàichē shān', at: 60 },
  { id: 'blocks', zh: '方块世界', py: 'fāngkuài shìjiè', at: 100 },
  { id: 'dino', zh: '恐龙谷', py: 'kǒnglóng gǔ', at: 150 },
  { id: 'sea', zh: '海底', py: 'hǎidǐ', at: 200 },
  { id: 'space', zh: '月球基地', py: 'yuèqiú jīdì', at: 300 },
  { id: 'pirate', zh: '海盗岛', py: 'hǎidào dǎo', at: 400 },
];

const ORDER = new Map(WORLDS.map((w, i) => [w.id as string, i]));
export const worldById = (id: string | null | undefined) => WORLDS.find((w) => w.id === id);
const inOrder = (ids: Iterable<string>) => [...new Set(ids)].filter((id) => ORDER.has(id)).sort((a, b) => ORDER.get(a)! - ORDER.get(b)!) as WorldId[];

export function reachedWorlds(known: number): WorldId[] {
  return WORLDS.filter((w) => known >= w.at).map((w) => w.id);
}

export interface WorldUpdate { kid: KidState; arrived: WorldId | null; changed: boolean }

/** Record newly reached worlds (never removes any). Only the newest new one is announced, never the backyard. */
export function updateWorlds(kid: KidState, known: number): WorldUpdate {
  const seen = new Set(kid.worldsSeen);
  const fresh = reachedWorlds(known).filter((id) => !seen.has(id));
  if (!fresh.length) return { kid, arrived: null, changed: false };
  const worldsSeen = inOrder([...kid.worldsSeen, ...fresh]);
  const newest = fresh[fresh.length - 1]!;
  const arrived = newest === 'yard' ? null : newest;
  return { kid: { ...kid, worldsSeen, world: arrived ? null : kid.world }, arrived, changed: true };
}

/** His worlds as the count reaches them now, keeping the room's pick only if it is still reached (a one-off when the counting changes). */
export function resetWorlds(kid: KidState, count: number): KidState {
  const worldsSeen = reachedWorlds(count);
  return { ...kid, worldsSeen, world: kid.world && worldsSeen.includes(kid.world as WorldId) ? kid.world : null };
}

export function currentWorld(kid: KidState): WorldId {
  const seen = inOrder(['yard', ...kid.worldsSeen]);
  return kid.world && seen.includes(kid.world as WorldId) ? (kid.world as WorldId) : seen[seen.length - 1]!;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export function timeOfDay(d: Date): TimeOfDay {
  const h = d.getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

/** What Truffle says on Home in each world. */
export const WORLD_LINES: Record<WorldId, string[]> = {
  yard: ['下雨了？不是，是洒水器！', '我们来玩球！', '球在哪儿？'],
  grass: ['嘘……草里有什么？', '我听见声音了！', '小心，别吓跑它！'],
  race: ['三，二，一，出发！', '好快的车！', '我们去比赛！'],
  blocks: ['挖！挖！挖！', '这里有宝石！', '我们来盖房子！'],
  dino: ['哇，好大的恐龙！', '火山在冒烟！', '蛋里有什么？'],
  sea: ['咕噜咕噜……', '小鱼，你好！', '我们坐潜水艇！'],
  space: ['我们在月亮上！', '火箭要飞了！', '星星好亮！'],
  pirate: ['宝藏在哪儿？', '船来了！', '我们去挖宝！'],
};

export function worldLine(id: WorldId, dateKey: string): string {
  const lines = WORLD_LINES[id];
  return lines[Math.floor(mulberry32(seedFromString(`${id}:${dateKey}`))() * lines.length)]!;
}
