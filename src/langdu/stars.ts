// The 朗读 bonus star (learning rules 2026-10-17): it rewards reading accurately, never quickly or loudly — a star for speed
// teaches rushing (Kuhn & Stahl 2003). A re-read of a passage (the next lesson that reads it) earns it:
//   - the parent listened to the last take: when he or she marks fewer misreads on this one (or none, both times), at review;
//   - no review of the last take to compare with: when this read is complete, at once.
// Either way the read must be complete: long enough for every character, and stopped by him, not by the recorder's limit.
import type { Recording } from '../types';
import { readLimitMs } from './sentences';

/** No P2 child reads aloud faster than this: a take shorter than the passage at this pace was stopped part-way. */
export const MAX_CHARS_PER_SEC = 4;
const HAN = /\p{Script=Han}/u;

/** A read not cut short: at least the passage's characters at 4 a second, and ended a second or more before the recorder's limit. */
export function isCompleteRead(take: { durationSec: number }, text: string): boolean {
  const chars = Array.from(text).filter((c) => HAN.test(c)).length;
  return take.durationSec >= chars / MAX_CHARS_PER_SEC && take.durationSec < readLimitMs(text) / 1000 - 1;
}

/** What a lesson read earns: `now`, the star at once; `misreadsBefore`, the baseline his next review is compared with. */
export interface ReadBonus { now: boolean; misreadsBefore?: number }

export function bonusOnRead(prev: Pick<Recording, 'review' | 'misread'> | undefined, cur: { durationSec: number }, text: string): ReadBonus {
  if (!prev || !isCompleteRead(cur, text)) return { now: false };
  if (prev.review === 'ok') return { now: false, misreadsBefore: prev.misread?.length ?? 0 };
  return { now: true };
}

/** At the parent's review of a take with a baseline: fewer misreads than the last take, or clean both times. */
export const bonusOnReview = (misreadsBefore: number | undefined, misreads: number): boolean =>
  misreadsBefore !== undefined && (misreads < misreadsBefore || (misreads === 0 && misreadsBefore === 0));

/** The take kept after a re-read (spec 2026-10-12 §3, amended 2026-10-17): the re-read — he has just compared with the model —
 *  when it is complete, else the first. Never the quicker or the louder. */
export function betterTake<T extends { durationSec: number }>(takes: T[], text: string): T | null {
  const [first, second] = takes;
  if (!first) return null;
  if (!second) return first;
  return isCompleteRead(second, text) ? second : first;
}
