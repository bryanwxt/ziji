import { endOfLocalDay, localDateKey } from '../lib/date';
import { newCard, review, toRating } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { addReviewLog, allCards, allWords, getCard, getSession, getSettings, getWord, putCards, putWords, saveSession, practisedWords } from '../store/repo';
import type { CardKind, CardRecord, Grade, SessionRecord } from '../types';
import { buildSessionPlan } from './plan';
import { createSessionRecord } from './runner';

async function reviewCard(db: AppDb, wordId: string, kind: CardKind, rating: Grade, now: Date): Promise<CardRecord> {
  const id = `${wordId}:${kind}`;
  const existing = await getCard(db, id);
  const rec: CardRecord = { id, wordId, kind, fsrs: review(existing?.fsrs ?? newCard(now), rating, now) };
  await putCards(db, [rec]);
  return rec;
}

export async function recordRecognition(
  db: AppDb, wordId: string, outcome: { correct: boolean; responseMs: number }, now: Date,
): Promise<CardRecord> {
  const rating = toRating({ kind: 'recognise', ...outcome });
  const card = await reviewCard(db, wordId, 'recognise', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'recognise', at: now.getTime(), rating, ...outcome });
  return card;
}

export async function recordMeaning(
  db: AppDb, wordId: string, outcome: { correct: boolean; responseMs: number }, now: Date, source?: 'use',
): Promise<CardRecord> {
  const rating = toRating({ kind: 'meaning', ...outcome });
  const card = await reviewCard(db, wordId, 'meaning', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'meaning', at: now.getTime(), rating, ...outcome, ...(source ? { source } : {}) });
  return card;
}

export async function recordWriting(db: AppDb, wordId: string, totalMisses: number, now: Date): Promise<CardRecord> {
  const rating = toRating({ kind: 'write', totalMisses });
  const card = await reviewCard(db, wordId, 'write', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'write', at: now.getTime(), rating, correct: totalMisses <= 3, misses: totalMisses });
  return card;
}

const ratedToday = (c: CardRecord | undefined, now: Date) => !!c?.fsrs.last_review && localDateKey(c.fsrs.last_review) === localDateKey(now);

/** Brings a card forward so the next lesson includes it; never pushes it later. */
export async function bringForward(db: AppDb, wordId: string, kind: CardKind, due: Date): Promise<void> {
  const c = await getCard(db, `${wordId}:${kind}`);
  if (c && c.fsrs.due.getTime() > due.getTime()) await putCards(db, [{ ...c, fsrs: { ...c.fsrs, due } }]);
}

/** A word used in context (选一选, 用对了吗, 用一用): the day's first answer rates its meaning card; a later miss brings it forward. */
export async function recordUse(db: AppDb, wordId: string, correct: boolean, now: Date, responseMs = 0): Promise<CardRecord> {
  const existing = await getCard(db, `${wordId}:meaning`);
  if (!ratedToday(existing, now)) return recordMeaning(db, wordId, { correct, responseMs }, now, 'use'); // logged as from 选一选/用一用, so Skills counts it once
  if (!correct) await bringForward(db, wordId, 'meaning', endOfLocalDay(now));
  return (await getCard(db, `${wordId}:meaning`))!;
}

export async function markWriteSkipped(db: AppDb, wordId: string, now: Date): Promise<void> {
  const word = await getWord(db, wordId);
  if (word) await putWords(db, [{ ...word, writeSkippedAt: now.getTime() }]);
}

/** Today's session if one exists (finished or not), otherwise a new plan. Earlier days are never resumed. */
export async function startOrResumeSession(db: AppDb, now: Date): Promise<SessionRecord> {
  const date = localDateKey(now);
  const existing = await getSession(db, date);
  // An untouched plan is rebuilt, so a parent's settings change applies today rather than tomorrow.
  if (existing && (existing.completed || existing.activeMs > 0 || existing.stepIndex > 0 || existing.flashIndex > 0 || existing.writeIndex > 0)) {
    return existing;
  }
  const [cards, words, settings, practised] = await Promise.all([allCards(db), allWords(db), getSettings(db), practisedWords(db)]);
  const rec = createSessionRecord(buildSessionPlan({ cards, words, settings, now, practised }), date, now.getTime());
  await saveSession(db, rec);
  return rec;
}
