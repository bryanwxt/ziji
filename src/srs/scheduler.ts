import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

export const SLOW_ANSWER_MS = 6000;

export type Outcome =
  | { kind: 'recognise' | 'meaning'; correct: boolean; responseMs: number }
  | { kind: 'write'; totalMisses: number };

export function toRating(o: Outcome): Grade {
  if (o.kind === 'write') {
    if (o.totalMisses === 0) return Rating.Good;
    return o.totalMisses <= 3 ? Rating.Hard : Rating.Again;
  }
  if (!o.correct) return Rating.Again; // reading or meaning
  return o.responseMs > SLOW_ANSWER_MS ? Rating.Hard : Rating.Good;
}

export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

export function review(card: Card, rating: Grade, now: Date): Card {
  return scheduler.next(card, now, rating).card;
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
