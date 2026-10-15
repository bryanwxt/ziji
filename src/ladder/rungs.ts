// The word ladder's rungs (spec 2026-10-06 §3.2): heard, understood in a sentence, read, used. Read and Use are the reading and meaning cards he
// already had, so nothing he has learned is lost; Hear is new. A rung passes on two different days' right first answers.
// Say (spec 2026-10-11 §3): he reads the word aloud and the parent confirms the take; it passes on two days with a confirmed take.
// Sentence (production practice spec §4): he says a sentence with the word, confirmed the same way: "can use".
import { meaningCue } from '../activities/flashcards/meaning';
import { localDateKey } from '../lib/date';
import { cardMeaning, questionMeaning } from '../content/glossary';
import { bankFor } from '../content/sentenceBank';
import { sentencesFor } from '../content/understand';
import type { CardKind, ReviewLog, Word } from '../types';

export type RungKind = 'hear' | 'understand' | 'read' | 'use' | 'say' | 'sentence';
export const RUNGS: RungKind[] = ['hear', 'understand', 'read', 'use', 'say', 'sentence'];
export const RUNG_CARD: Record<RungKind, CardKind> = { hear: 'hear', understand: 'understand', read: 'recognise', use: 'meaning', say: 'say', sentence: 'sentence' };
/** The rungs a pass opens one after another. Say and Sentence are not among them: a lesson asks them once Read has passed, and
 *  their cards are made then (spec 2026-10-11 §3; production practice spec §4); owning a word (the town's full light) still means
 *  these four, so nothing he has lights less. */
const LADDER: RungKind[] = ['hear', 'understand', 'read', 'use'];
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

/** The days that count toward a pass, oldest first: each day whose first answer was right and not too fast (its time). */
export function passDays(logs: ReviewLog[], cardId: string, fastMs: number): number[] {
  const firsts = new Map<string, ReviewLog>();
  for (const l of logs.filter((x) => x.cardId === cardId).sort((a, b) => a.at - b.at)) {
    const day = localDateKey(new Date(l.at));
    if (!firsts.has(day)) firsts.set(day, l);
  }
  return [...firsts.values()].filter((l) => l.correct && !(typeof l.responseMs === 'number' && l.responseMs < fastMs)).map((l) => l.at);
}

/** When the card passed: the answer that made the second day whose first answer was right and not too fast; else null. */
export function passedAt(logs: ReviewLog[], cardId: string, fastMs: number): number | null {
  return passDays(logs, cardId, fastMs)[PASS_DAYS - 1] ?? null;
}

/** The rungs the parent confirms from a take (Listen & confirm), not from his answers. */
export type TakeRung = 'say' | 'sentence';

/**
 * The Say rung's days (spec 2026-10-11 §3), or the Sentence rung's (production practice spec §4): the local days of his takes the
 * parent confirmed (✓), oldest first. A take is logged on the day he recorded it, whenever the parent listens; a day with a ✗
 * take and a ✓ take still has a confirmed take.
 */
export function sayDays(logs: ReviewLog[], cardId: string, kind: TakeRung = 'say'): string[] {
  const days = logs.filter((l) => l.cardId === cardId && l.kind === kind && l.correct).sort((a, b) => a.at - b.at).map((l) => localDateKey(new Date(l.at)));
  return [...new Set(days)];
}

/** The Say (or Sentence) rung passes on two separate days with a confirmed take. */
export const sayPassed = (logs: ReviewLog[], cardId: string, kind: TakeRung = 'say'): boolean => sayDays(logs, cardId, kind).length >= PASS_DAYS;

/** Whether a rung can be asked of this word: hearing needs its English question (he picks the meaning: a kid gloss, never a
 *  grammar word's, glossary.ts questionMeaning), using a question to use it in, a sentence a sentence-bank example to pattern
 *  on; reading and saying always. A word with no English question climbs from Read (record.ts beginNewWord). */
export function canAskRung(word: Word, rung: RungKind): boolean {
  if (rung === 'say') return true;
  if (rung === 'sentence') return !!bankFor(word.text);
  if (rung === 'hear') return !!questionMeaning(word);
  if (rung === 'understand') return !!cardMeaning(word) && sentencesFor(word.text).length >= 2; // a sentence he hears (plan 2b)
  return rung !== 'use' || meaningCue(word) !== null;
}

/** The rung that opens when this one passes: the next one the word can be asked, or none. */
export function nextRung(word: Word, rung: RungKind): RungKind | null {
  if (!LADDER.includes(rung)) return null;
  return LADDER.slice(LADDER.indexOf(rung) + 1).find((r) => canAskRung(word, r)) ?? null;
}

/** Every reading rung it can be asked has passed (Say is counted on its own: can produce, spec 2026-10-11 §3). */
export function isOwned(word: Word, passed: ReadonlySet<RungKind>): boolean {
  return LADDER.every((r) => !canAskRung(word, r) || passed.has(r));
}
