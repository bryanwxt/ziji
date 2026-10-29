// What the parent reads about a placement (spec 2026-10-14): the term he reads up to, how many characters were tested and
// assumed, and how the rechecks of placed characters are going.
import { schoolTerm } from '../content';
import { localDateKey } from '../lib/date';
import type { CardRecord, LegacyPlacementResult, PlacementResult, ReviewLog, Word } from '../types';

type Counts = Pick<PlacementResult, 'readsUpTo' | 'tested' | 'assumed'>;

/** The result screen: 「读到 一下 · 已测 12 个字，推定 360 个」; none: 「还没开始 · 已测 6 个字」. */
export const placementLineZh = (r: Counts): string =>
  r.readsUpTo ? `读到 ${r.readsUpTo} · 已测 ${r.tested} 个字，推定 ${r.assumed} 个` : `还没开始 · 已测 ${r.tested} 个字`;

/**
 * The result screen's line in phrases that never break inside (spec v2.1: 「个」 was left alone on a phone's last line):
 * 「读到 三下 ·」「已测 14 个字，」「推定 1017 个」.
 */
export const placementPhrasesZh = (r: Counts): string[] =>
  r.readsUpTo ? [`读到 ${r.readsUpTo} ·`, `已测 ${r.tested} 个字，`, `推定 ${r.assumed} 个`] : ['还没开始 ·', `已测 ${r.tested} 个字`];

/** Skills: "Reads up to 一下 — 12 tested, 360 assumed." */
export const placementLine = (r: Counts): string =>
  r.readsUpTo ? `Reads up to ${r.readsUpTo} — ${r.tested} tested, ${r.assumed} assumed.` : `Reads none of the terms yet — ${r.tested} tested.`;

export interface RecheckProgress { done: number; total: number; sentBack: number }

/** Rechecks since the placement at `at`: first rechecks logged (missed ones sent back), of those plus the placed cards still waiting. */
export function recheckProgress(cards: CardRecord[], logs: ReviewLog[], at: number): RecheckProgress {
  const checks = logs.filter((l) => l.placedCheck && l.at >= at);
  const done = new Set(checks.map((l) => l.wordId));
  const sentBack = new Set(checks.filter((l) => !l.correct).map((l) => l.wordId)).size;
  const waiting = cards.filter((c) => c.kind === 'recognise' && c.placed && !done.has(c.wordId)).length;
  return { done: done.size, total: done.size + waiting, sentBack };
}

/** "Placement rechecks: 40 of 360 done, 3 sent back to learn." */
export const recheckLine = (p: RecheckProgress): string => `Placement rechecks: ${p.done} of ${p.total} done, ${p.sentBack} sent back to learn.`;

export interface SentBack { text: string; missed: string; taught?: string }

/**
 * Words a missed placement recheck sent back to learn in the last `days` days (parent 2026-10-29: they come back in 认新字 the next
 * lesson, which looked like a repeat): each with the day it was missed and the day 认新字 taught it again, if it has yet.
 */
export function recentSentBack(logs: ReviewLog[], words: ReadonlyMap<string, Word>, now: Date, days = 7): SentBack[] {
  const since = now.getTime() - days * 86_400_000;
  const last = new Map<string, ReviewLog>();
  for (const l of logs) if (l.placedCheck && !l.correct && l.at >= since && l.at > (last.get(l.wordId)?.at ?? -1)) last.set(l.wordId, l);
  return [...last.values()].sort((a, b) => a.at - b.at).flatMap((miss) => {
    const w = words.get(miss.wordId);
    if (!w) return [];
    const missed = localDateKey(new Date(miss.at));
    const again = logs.filter((l) => l.wordId === miss.wordId && l.at > miss.at && localDateKey(new Date(l.at)) > missed).sort((a, b) => a.at - b.at)[0];
    return [{ text: w.text, missed, ...(again ? { taught: localDateKey(new Date(again.at)) } : {}) }];
  });
}

const md = (day: string) => day.slice(5); // 2026-10-28 → 10-28

/** "Missed on a recheck, taught again in 认新字: 照顾 (missed 10-27, retaught 10-28) · 碰 (missed 10-28, next lesson)." */
export const sentBackLine = (back: SentBack[]): string =>
  `Missed on a recheck, taught again in 认新字: ${back.map((b) => `${b.text} (missed ${md(b.missed)}, ${b.taught ? `retaught ${md(b.taught)}` : 'next lesson'})`).join(' · ')}.`;

/** A band result saved before 2026-10-14, read-only: each band (100 characters in rank order) by its last character's term. */
export function legacyPlacementLine(r: LegacyPlacementResult, words: Word[]): string {
  const ranked = words.filter((w) => w.source === 'builtin' && w.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const term = (band: number) => {
    if (band < 0) return 'none';
    const last = ranked[Math.min(band * 100 + 99, ranked.length - 1)];
    return (last && schoolTerm(last.text)) ?? 'beyond 三下';
  };
  return `Earlier check (bands) — Reading: ${term(r.reading)} · Understanding: ${term(r.understanding)}. Re-run it for a term result.`;
}
