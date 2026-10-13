import { createEmptyCard, State } from 'ts-fsrs';
import { openAppDb, type AppDb } from '../store/db';
import { putCards } from '../store/repo';
import type { CardKind, CardRecord, Word } from '../types';

export function freshDb(): Promise<AppDb> {
  return openAppDb(`test-${crypto.randomUUID()}`);
}

export function makeWord(text: string, over: Partial<Word> = {}): Word {
  return { id: `b:${text}`, text, pinyin: 'x', level: 1, rank: 0, source: 'builtin', writeable: true, paused: false, createdAt: 0, ...over };
}

export function makeCard(wordId: string, kind: CardKind, due: Date, known = false): CardRecord {
  return {
    id: `${wordId}:${kind}`,
    wordId,
    kind,
    fsrs: { ...createEmptyCard(due), due, reps: 1, state: known ? State.Review : State.Learning },
    // a known card has passed its rung: on a device the ladder migration marks every earned card passed (spec 2026-10-06 §3.6)
    ...(known ? { passed: due.getTime() } : {}),
  };
}

/** The word has a passed write card, so it counts as produced: a right tap on it rates Good, not Hard (SRS tuning spec §3.1). */
export async function markProduced(db: AppDb, wordId: string): Promise<void> {
  await putCards(db, [makeCard(wordId, 'write', new Date(2026, 0, 1), true)]);
}
