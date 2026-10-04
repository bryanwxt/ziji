import { State, type Card } from 'ts-fsrs';
import type { TruffleMood } from '../ui/truffle/parts';

/** Truffle warms up as the child gets answers right this session. */
export function restingMood(correct: number): 'sulk' | 'neutral' | 'pleased' {
  if (correct >= 8) return 'pleased';
  if (correct >= 3) return 'neutral';
  return 'sulk';
}

/** A short reaction to one answer (combo = run length after it). Priority: wow > content > side. */
export function reactionMood(e: { correct: boolean; hard: boolean; combo: number }): TruffleMood | null {
  if (!e.correct) return 'side';
  if (e.hard) return 'wow';
  if (e.combo >= 3) return 'content';
  return null;
}

/**
 * Hard = the card (before this answer) was relearning after a lapse, or still learning after
 * more than one look — ts-fsrs keeps no last rating, and that only happens after Again/Hard.
 */
export function isHardRecognition(card: Card | undefined): boolean {
  if (!card) return false;
  return card.state === State.Relearning || (card.state === State.Learning && card.reps >= 2);
}

export function isHardWrite(isNew: boolean, misses: number): boolean {
  return isNew && misses === 0;
}

export const CLOSEUP_EVERY = 5;

export function closeupAllowed(cardsSince: number, reduced: boolean): boolean {
  return !reduced && cardsSince >= CLOSEUP_EVERY;
}

