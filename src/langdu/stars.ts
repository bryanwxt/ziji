import type { Recording } from '../types';
export function earnsBonus(prev: Pick<Recording, 'level' | 'durationSec'> | undefined, cur: { level: number; durationSec: number }): boolean {
  if (!prev) return false;
  if (cur.durationSec < prev.durationSec * 0.5) return false; // stopping straight away is not a quicker read
  const louder = typeof prev.level === 'number' && cur.level > prev.level;
  const quicker = prev.durationSec > 0 && cur.durationSec <= prev.durationSec * 0.9;
  return louder || quicker;
}

/** The take kept after a re-read (spec 2026-10-12 §3): the second when it beats the first by earnsBonus's rule, else the first. */
export function betterTake<T extends { level?: number; durationSec: number }>(takes: T[]): T | null {
  const [first, second] = takes;
  if (!first) return null;
  if (!second) return first;
  return earnsBonus(first, { level: second.level ?? 0, durationSec: second.durationSec }) ? second : first;
}
