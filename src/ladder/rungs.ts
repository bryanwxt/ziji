// The word ladder's rungs (spec 2026-10-06 §3.2): heard, read, used. Read and Use are the reading and meaning cards he
// already had, so nothing he has learned is lost; Hear is new. A rung passes on two different days' right first answers.
import { meaningCue } from '../activities/flashcards/meaning';
import { localDateKey } from '../lib/date';
import { cardMeaning } from '../content/glossary';
import type { CardKind, ReviewLog, Word } from '../types';

export type RungKind = 'hear' | 'read' | 'use';
export const RUNGS: RungKind[] = ['hear', 'read', 'use'];
export const RUNG_CARD: Record<RungKind, CardKind> = { hear: 'hear', read: 'recognise', use: 'meaning' };
export const rungOf = (kind: CardKind): RungKind | null => RUNGS.find((r) => RUNG_CARD[r] === kind) ?? null;

export const PASS_DAYS = 2;
export const FAST_FLOOR_MS = 400;
const FAST_SHARE = 0.25;
const FAST_SAMPLE = 40;
const FAST_MIN_SAMPLE = 10;

/** Quicker than this is a guess, not an answer: a quarter of his usual right answer for this kind, never under 400 ms. */
export function fastLimit(logs: ReviewLog[], kind: CardKind): number {
  const times = logs.filter((l) => l.kind === kind && l.correct && typeof l.responseMs === 'number').slice(-FAST_SAMPLE).map((l) => l.responseMs!);
  if (times.length < FAST_MIN_SAMPLE) return FAST_FLOOR_MS;
  const sorted = [...times].sort((a, b) => a - b);
  return Math.max(FAST_FLOOR_MS, Math.round(FAST_SHARE * sorted[Math.floor(sorted.length / 2)]!));
}

/** When the card passed: the answer that made the second day whose first answer was right and not too fast; else null. */
export function passedAt(logs: ReviewLog[], cardId: string, fastMs: number): number | null {
  const firsts = new Map<string, ReviewLog>();
  for (const l of logs.filter((x) => x.cardId === cardId).sort((a, b) => a.at - b.at)) {
    const day = localDateKey(new Date(l.at));
    if (!firsts.has(day)) firsts.set(day, l);
  }
  let days = 0;
  for (const l of firsts.values()) {
    if (!l.correct || (typeof l.responseMs === 'number' && l.responseMs < fastMs)) continue;
    if (++days >= PASS_DAYS) return l.at;
  }
  return null;
}

/** Whether a rung can be asked of this word: hearing needs its English (he picks the meaning), using a question to use it in; reading always. */
export function canAskRung(word: Word, rung: RungKind): boolean {
  if (rung === 'hear') return !!cardMeaning(word);
  return rung !== 'use' || meaningCue(word) !== null;
}

/** The rung that opens when this one passes: the next one the word can be asked, or none. */
export function nextRung(word: Word, rung: RungKind): RungKind | null {
  return RUNGS.slice(RUNGS.indexOf(rung) + 1).find((r) => canAskRung(word, r)) ?? null;
}

export function isOwned(word: Word, passed: ReadonlySet<RungKind>): boolean {
  return RUNGS.every((r) => !canAskRung(word, r) || passed.has(r));
}
