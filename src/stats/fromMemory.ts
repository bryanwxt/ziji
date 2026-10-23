// From memory or by tapping (real test spec 2026-10-23 §4, §7): what his review logs say about how he last got a word right.
import { RECALL_RIGHT_MISSES } from '../session/writeCredit';
import { TAP_KINDS, type TapKind } from '../srs/scheduler';
import type { ReviewLog } from '../types';

/** A right production: a character written from memory with at most 1 miss (练一练's 默写 or 写一写's; a 词语's 默写 rates its
 *  reading as a recall), or a 说一句 or Say take the parent confirmed. */
export const isMadeRight = (l: ReviewLog): boolean =>
  l.correct && ((l.kind === 'write' && (l.misses ?? 0) <= RECALL_RIGHT_MISSES) || l.source === 'recall' || l.kind === 'say' || l.kind === 'sentence');

/** A tap answer: a reading, meaning, hear or understand rating from a choice, not one a written 组词 or a 默写 gave. */
export const isTap = (l: ReviewLog): boolean => TAP_KINDS.includes(l.kind as TapKind) && l.source !== 'write' && l.source !== 'recall';

/** How a word was last got right: `tapLast` when that was a tap, not a production; `madeAt` its last right production (0: never). */
export interface RightHistory { tapLast: boolean; madeAt: number }

/** Each word's RightHistory from its logs (any order). Words never got right are absent. */
export function rightHistory(logs: readonly ReviewLog[]): Map<string, RightHistory> {
  const out = new Map<string, RightHistory>();
  for (const l of [...logs].sort((a, b) => a.at - b.at)) {
    if (!l.correct) continue;
    const had = out.get(l.wordId) ?? { tapLast: false, madeAt: 0 };
    if (isMadeRight(l)) out.set(l.wordId, { tapLast: false, madeAt: l.at });
    else if (isTap(l)) out.set(l.wordId, { ...had, tapLast: true });
  }
  return out;
}
