import type { BuiltinChar } from '../types';
import type { IconName } from '../ui/icons/icons';

export type PowerId = 'water' | 'fire' | 'wood' | 'metal' | 'earth' | 'roar' | 'friends' | 'voice' | 'dash' | 'heart' | 'sun';

export interface PowerDef {
  id: PowerId;
  name: string; // shown on the cape and in the room
  radicals: string[];
  color: string;
  mark: IconName; // drawn with the ink icon set
}

/** Truffle's powers: the five elements 五行 plus the biggest radical families. 冫 (ice) is not water. */
export const POWERS: PowerDef[] = [
  { id: 'water', name: '水', radicals: ['氵', '水'], color: '#4aa3ff', mark: 'drop' },
  { id: 'fire', name: '火', radicals: ['火', '灬'], color: '#ff6a3d', mark: 'flame' },
  { id: 'wood', name: '木', radicals: ['木'], color: '#46b06a', mark: 'leaf' },
  { id: 'metal', name: '金', radicals: ['金', '钅'], color: '#b9a46a', mark: 'sparkle' },
  { id: 'earth', name: '土', radicals: ['土'], color: '#b07a4a', mark: 'rock' },
  { id: 'roar', name: '口', radicals: ['口'], color: '#ff8fb1', mark: 'shout' },
  { id: 'friends', name: '亻', radicals: ['亻', '人'], color: '#7b8cff', mark: 'hands' },
  { id: 'voice', name: '讠', radicals: ['讠', '言'], color: '#2fbfb0', mark: 'speech' },
  { id: 'dash', name: '辶', radicals: ['辶'], color: '#ffc94a', mark: 'wind' },
  { id: 'heart', name: '心', radicals: ['心', '忄'], color: '#ff5a7a', mark: 'heart' },
  { id: 'sun', name: '日', radicals: ['日'], color: '#ffb020', mark: 'sun' },
];

export const powerDef = (id: string | null | undefined): PowerDef | undefined => POWERS.find((p) => p.id === id);

export function powerOf(c: BuiltinChar): PowerId | null {
  const p = POWERS.find((x) => x.radicals.includes(c.radical) && !x.radicals.includes(c.char));
  return p ? p.id : null;
}

/** Families count HSK 1–2 characters only: the tiers were tuned for those 600, and HSK 1–9 would make them five times slower. */
export function powerFamilies(builtin: BuiltinChar[]): Record<PowerId, string[]> {
  const sorted = builtin.filter((c) => c.level <= 2).sort((a, b) => a.rank - b.rank);
  return Object.fromEntries(POWERS.map((p) => [p.id, sorted.filter((c) => powerOf(c) === p.id).map((c) => c.char)])) as Record<PowerId, string[]>;
}

/** Tier 1 at 3 known (or all of a tiny family), tier 2 at half, tier 3 at all; tier 2 never comes before tier 1. */
export function tierFor(size: number, known: number): 0 | 1 | 2 | 3 {
  if (size === 0) return 0;
  const t1 = Math.min(3, size);
  const t2 = Math.max(Math.ceil(size / 2), t1);
  if (known >= size) return 3;
  if (known >= t2) return 2;
  if (known >= t1) return 1;
  return 0;
}

export interface PowerProgress {
  id: PowerId;
  known: number;
  size: number;
  tier: 0 | 1 | 2 | 3;
}

export function powerProgress(families: Record<PowerId, string[]>, knownChars: Set<string>): PowerProgress[] {
  return POWERS.map(({ id }) => {
    const chars = families[id];
    const known = chars.filter((c) => knownChars.has(c)).length;
    return { id, known, size: chars.length, tier: tierFor(chars.length, known) };
  });
}

export function newTiers(progress: PowerProgress[], seen: Record<string, number>): { id: PowerId; tier: number }[] {
  return progress.filter((p) => p.tier > (seen[p.id] ?? 0)).map((p) => ({ id: p.id, tier: p.tier }));
}
