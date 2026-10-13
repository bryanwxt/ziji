import { checkParameters, createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type FSRS, type Grade } from 'ts-fsrs';
import { localDateKey, parseDateKey } from '../lib/date';
import type { CardSnapshot } from '../types';

/** FSRS-6 has 21 parameters; a fit (src/srs/optimizer.ts) returns 21 and settings.fsrs.w stores them (SRS tuning spec §6.2). */
export const FSRS_PARAM_COUNT = 21;

/** Fuzz on (spec §3.3): words learned together spread over nearby days. ts-fsrs seeds it from the card and the review time, so a
 *  given review always lands on the same day — tests stay repeatable. */
const build = (w?: number[]): FSRS => fsrs(generatorParameters({ enable_fuzz: true, ...(w ? { w } : {}) }));

let scheduler = build();

/** Fitted parameters the scheduler can use: 21 finite numbers that ts-fsrs's checkParameters accepts. */
export function validParams(w: unknown): w is number[] {
  if (!Array.isArray(w) || w.length !== FSRS_PARAM_COUNT) return false;
  try {
    checkParameters(w as number[]);
    return true;
  } catch {
    return false;
  }
}

/** Use his fitted parameters (null or invalid: the defaults). Called at app start and whenever settings.fsrs changes (spec §6.2). */
export function setSchedulerParams(w: readonly number[] | null | undefined): void {
  scheduler = build(w && validParams([...w]) ? [...w] : undefined);
}

/** The parameters the scheduler is using now (its defaults, or his fitted ones after clipping). */
export const schedulerParams = (): readonly number[] => scheduler.parameters.w;

/** The tap-answered card kinds (spec §3.1): a right answer rates Hard until the word has a production pass. */
export type TapKind = 'recognise' | 'meaning' | 'hear' | 'understand';
export const TAP_KINDS: readonly TapKind[] = ['recognise', 'meaning', 'hear', 'understand'];

/** The slow line before he has 10 answers of a kind (spec §3.2). */
export const SLOW_ANSWER_MS = 6000;

export type Outcome =
  | { kind: TapKind; correct: boolean; responseMs: number; produced: boolean; state: State; slowMs?: number }
  | { kind: 'write'; totalMisses: number };

/**
 * The one rating rule (spec §3.1): a write by its misses; a tap wrong → Again, right but slower than his line → Hard, right before
 * the word has a production pass → Hard (only while the card is New or in Review: in (Re)Learning steps ts-fsrs's Hard repeats
 * the step, so a card rated Hard daily would never graduate), otherwise Good. `state` is the card's state before this review.
 */
export function toRating(o: Outcome): Grade {
  if (o.kind === 'write') {
    if (o.totalMisses === 0) return Rating.Good;
    return o.totalMisses <= 3 ? Rating.Hard : Rating.Again;
  }
  if (!o.correct) return Rating.Again;
  if (o.responseMs > (o.slowMs ?? SLOW_ANSWER_MS)) return Rating.Hard;
  const learning = o.state === State.Learning || o.state === State.Relearning;
  return o.produced || learning ? Rating.Good : Rating.Hard;
}

export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

export function review(card: Card, rating: Grade, now: Date): Card {
  return scheduler.next(card, now, rating).card;
}

/** Whole local days from one moment to another (0 = the same day). */
export function localDayGap(from: Date | number, to: Date | number): number {
  const a = parseDateKey(localDateKey(new Date(from)));
  const b = parseDateKey(localDateKey(new Date(to)));
  return Math.round((b.getTime() - a.getTime()) / 86_400_000); // round: a daylight-saving day is 23 or 25 hours
}

/** What a review log keeps about the card before this review (spec §4), so retention can be measured and FSRS fitted. */
export function snapshot(card: Card, now: Date): CardSnapshot {
  return { state: card.state, elapsedDays: card.last_review ? Math.max(0, localDayGap(card.last_review, now)) : 0, scheduledDays: card.scheduled_days };
}

export function isKnown(card: Card): boolean {
  return card.state === State.Review;
}

/** Known at some point — a lapse into relearning doesn't take earned rewards away. */
export function isEarned(card: Card): boolean {
  return card.state === State.Review || card.state === State.Relearning;
}

/** A card for a character the child already knew at placement: in review, due in `days` (14 by default). */
export function seededKnownCard(now: Date, days = 14): Card {
  return {
    ...createEmptyCard(now),
    state: State.Review,
    stability: days,
    difficulty: 5,
    reps: 1,
    scheduled_days: days,
    due: new Date(now.getTime() + days * 86_400_000),
    last_review: now,
  };
}
