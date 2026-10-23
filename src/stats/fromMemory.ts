// From memory or by tapping (real test spec 2026-10-23 §4, §7): what his review logs say about how he last got a word right.
import { RECALL_RIGHT_MISSES } from '../session/writeCredit';
import { TAP_KINDS, type TapKind } from '../srs/scheduler';
import { State } from 'ts-fsrs';
import type { ReviewLog } from '../types';

/** A right production: a character written from memory with at most 1 miss (练一练's 默写 or 写一写's; a 词语's 默写 rates its
 *  reading as a recall), or a 说一句 or Say take the parent confirmed. */
export const isMadeRight = (l: ReviewLog): boolean =>
  l.correct && ((l.kind === 'write' && (l.misses ?? 0) <= RECALL_RIGHT_MISSES) || l.source === 'recall' || l.kind === 'say' || l.kind === 'sentence');

/** A from-memory result, right or not: anything written (练一练's 默写, 写一写), or a word's reading a 默写 rated. */
export const isFromMemory = (l: ReviewLog): boolean => l.kind === 'write' || l.source === 'recall';

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

/** The parent's word line looks back this many days (§7), and shows this many of the latest taps. */
export const EVIDENCE_DAYS = 14;
export const TAPS_SHOWN = 5;

/** A word's last from-memory result (right or not, when), its latest taps (oldest first), and whether it is 只点选: right taps but
 *  no right production in the window. */
export interface WordEvidence { memory: { right: boolean; at: number } | null; taps: boolean[]; tapOnly: boolean }

/** Every word with a from-memory result or a tap in the last EVIDENCE_DAYS days. */
export function wordEvidence(logs: readonly ReviewLog[], now: Date): Map<string, WordEvidence> {
  const since = now.getTime() - EVIDENCE_DAYS * 86_400_000;
  const out = new Map<string, WordEvidence & { made: boolean }>();
  for (const l of [...logs].filter((x) => x.at >= since).sort((a, b) => a.at - b.at)) {
    const memory = isFromMemory(l);
    if (!memory && !isTap(l) && !isMadeRight(l)) continue;
    const e = out.get(l.wordId) ?? { memory: null, taps: [], tapOnly: false, made: false };
    if (memory) e.memory = { right: isMadeRight(l), at: l.at };
    else if (isTap(l)) e.taps = [...e.taps, l.correct].slice(-TAPS_SHOWN);
    if (isMadeRight(l)) e.made = true;
    out.set(l.wordId, e);
  }
  return new Map([...out].map(([id, { made, ...e }]) => [id, { ...e, tapOnly: !made && e.taps.some(Boolean) }]));
}

const mark = (right: boolean) => (right ? '✓' : '✗');
const monthDay = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()}`; };

/** 「默写 ✓ 10/22 · 点选 ✓✓✗」, then 「只点选」 when it is tap-only (§7). */
export function evidenceLine(e: WordEvidence): string {
  return [
    e.memory ? `默写 ${mark(e.memory.right)} ${monthDay(e.memory.at)}` : null,
    e.taps.length ? `点选 ${e.taps.map(mark).join('')}` : null,
    e.tapOnly ? '只点选' : null,
  ].filter(Boolean).join(' · ');
}

/** This week (the last 7 days) from memory (§7): earlier words written (a write card he had before), and how many of them his
 *  latest try got right. */
export function weekFromMemory(logs: readonly ReviewLog[], now: Date): { words: number; right: number } {
  const since = now.getTime() - 7 * 86_400_000;
  const last = new Map<string, ReviewLog>();
  for (const l of [...logs].sort((a, b) => a.at - b.at)) if (l.at >= since && l.kind === 'write' && l.state !== State.New) last.set(l.wordId, l);
  return { words: last.size, right: [...last.values()].filter(isMadeRight).length };
}
