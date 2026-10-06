import { addDays, endOfLocalDay, localDateKey, startOfLocalDay } from '../lib/date';
import { canAskRung, fastLimit, nextRung, passedAt, RUNG_CARD, rungOf } from '../ladder/rungs';
import { findWord } from '../ladder/words';
import { ladderWordsBesides } from '../content/ladder';
import { newCard, review, toRating } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { addReviewLog, allCards, allSessions, allWords, getCard, getSession, getSettings, getWord, logsSince, putCards, putWords, saveSession, practisedWords, updateSettings } from '../store/repo';
import type { CardKind, CardRecord, Grade, SessionRecord, Settings, Word } from '../types';
import { keptRecent, LOOKBACK_DAYS, nextPace, ranOut } from './pace';
import { buildSessionPlan } from './plan';
import { createSessionRecord } from './runner';

async function reviewCard(db: AppDb, wordId: string, kind: CardKind, rating: Grade, now: Date): Promise<CardRecord> {
  const id = `${wordId}:${kind}`;
  const existing = await getCard(db, id);
  const rec: CardRecord = { ...(existing ?? {}), id, wordId, kind, fsrs: review(existing?.fsrs ?? newCard(now), rating, now) }; // keeps its pass
  await putCards(db, [rec]);
  return rec;
}

export async function recordRecognition(
  db: AppDb, wordId: string, outcome: { correct: boolean; responseMs: number }, now: Date,
): Promise<CardRecord> {
  const rating = toRating({ kind: 'recognise', ...outcome });
  const card = await reviewCard(db, wordId, 'recognise', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'recognise', at: now.getTime(), rating, ...outcome });
  return (await settleRung(db, wordId, 'recognise', now)) ?? card;
}

export async function recordMeaning(
  db: AppDb, wordId: string, outcome: { correct: boolean; responseMs: number; ratedMs?: number }, now: Date, source?: 'use',
): Promise<CardRecord> {
  const { correct, responseMs, ratedMs = responseMs } = outcome; // ratedMs: the time that counts toward "slow" (reading time taken off)
  const rating = toRating({ kind: 'meaning', correct, responseMs: ratedMs });
  const card = await reviewCard(db, wordId, 'meaning', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'meaning', at: now.getTime(), rating, correct, responseMs, ...(source ? { source } : {}) });
  return (await settleRung(db, wordId, 'meaning', now)) ?? card;
}

export async function recordWriting(db: AppDb, wordId: string, totalMisses: number, now: Date): Promise<CardRecord> {
  const rating = toRating({ kind: 'write', totalMisses });
  const card = await reviewCard(db, wordId, 'write', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'write', at: now.getTime(), rating, correct: totalMisses <= 3, misses: totalMisses });
  // written now: a day its strokes failed to load no longer keeps it at the back of the queue (final review I1)
  const word = await getWord(db, wordId);
  if (word?.writeSkippedAt !== undefined) {
    const { writeSkippedAt: _gone, ...rest } = word;
    await putWords(db, [rest]);
  }
  await settleRung(db, wordId, 'write', now); // not a rung: it passes, and opens nothing
  return (await getCard(db, card.id))!;
}

/**
 * After a rung's answer (spec 2026-10-06 §3.2): if this card has now had two days of right first answers, it passes, and the
 * word's next rung opens (due the next morning). A card already passed stays passed; an opened card never replaces one he has.
 */
export async function settleRung(db: AppDb, wordId: string, kind: CardKind, now: Date): Promise<CardRecord | undefined> {
  const card = await getCard(db, `${wordId}:${kind}`);
  if (!card || card.passed) return card;
  // one read of the last 60 days serves both: a rung not passed in 60 days can lose its oldest right day (final review I6)
  const recent = (await logsSince(db, now.getTime() - 60 * 86_400_000)).filter((l) => l.kind === kind);
  const at = passedAt(recent, card.id, fastLimit(recent, kind));
  if (at === null) return card;
  const passed = { ...card, passed: at };
  await putCards(db, [passed]);
  const rung = rungOf(kind);
  const word = rung ? await findWord(db, wordId) : undefined;
  const next = rung && word ? nextRung(word, rung) : null;
  if (next) {
    const id = `${wordId}:${RUNG_CARD[next]}`;
    if (!(await getCard(db, id))) await putCards(db, [{ id, wordId, kind: RUNG_CARD[next], fsrs: { ...newCard(now), due: addDays(startOfLocalDay(now), 1) } }]);
  }
  return passed;
}

/**
 * A word met in 认新字 is begun, whatever he could be asked (final review C1): heard, its hear card is graded; read instead (no
 * voice today), a word that can be heard gets its hear card for tomorrow, ungraded; a word with no English (a school list word)
 * starts on its Read rung, graded by that reading.
 */
export async function beginNewWord(db: AppDb, word: Word, asked: 'hear' | 'read' | 'meaning', outcome: { correct: boolean; responseMs: number }, now: Date): Promise<CardRecord> {
  if (asked === 'hear') return recordHear(db, word.id, outcome, now);
  if (!canAskRung(word, 'hear')) return recordRecognition(db, word.id, outcome, now);
  const id = `${word.id}:hear`;
  const have = await getCard(db, id);
  if (have) return have;
  const card: CardRecord = { id, wordId: word.id, kind: 'hear', fsrs: { ...newCard(now), due: addDays(startOfLocalDay(now), 1) } };
  await putCards(db, [card]);
  return card;
}

/** Any passed rung whose next rung has no card gets one (a placement re-run or a lost card can't strand a word: final review I5). */
export async function openMissingRungs(db: AppDb, now: Date): Promise<number> {
  const cards = await allCards(db);
  const have = new Set(cards.map((c) => c.id));
  const made: CardRecord[] = [];
  for (const c of cards) {
    const rung = rungOf(c.kind);
    if (!rung || !c.passed) continue;
    const word = await findWord(db, c.wordId);
    const next = word ? nextRung(word, rung) : null;
    const id = next ? `${c.wordId}:${RUNG_CARD[next]}` : null;
    if (!next || !id || have.has(id)) continue;
    have.add(id);
    made.push({ id, wordId: c.wordId, kind: RUNG_CARD[next], fsrs: { ...newCard(now), due: addDays(startOfLocalDay(now), 1) } });
  }
  await putCards(db, made);
  return made.length;
}

/** He heard the word and picked its meaning (the Hear rung, spec 2026-10-06 §3.2). */
export async function recordHear(db: AppDb, wordId: string, outcome: { correct: boolean; responseMs: number }, now: Date): Promise<CardRecord> {
  const rating = toRating({ kind: 'recognise', ...outcome }); // same rule: wrong Again, slow Hard, else Good
  const card = await reviewCard(db, wordId, 'hear', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'hear', at: now.getTime(), rating, ...outcome });
  return (await settleRung(db, wordId, 'hear', now)) ?? card;
}

const ratedToday = (c: CardRecord | undefined, now: Date) => !!c?.fsrs.last_review && localDateKey(c.fsrs.last_review) === localDateKey(now);

/** Brings a card forward so the next lesson includes it; never pushes it later. */
export async function bringForward(db: AppDb, wordId: string, kind: CardKind, due: Date): Promise<void> {
  const c = await getCard(db, `${wordId}:${kind}`);
  if (c && c.fsrs.due.getTime() > due.getTime()) await putCards(db, [{ ...c, fsrs: { ...c.fsrs, due } }]);
}

/** Reading time allowed before a 选一选/用一用 answer counts as slow (on top of the flashcard's 6 s). */
export const USE_READING_MS = 9000;

/** A word used in context (选一选, 用对了吗, 用一用): the day's first answer rates its meaning card; a later miss brings it forward. */
export async function recordUse(db: AppDb, wordId: string, correct: boolean, now: Date, responseMs = 0): Promise<CardRecord> {
  const existing = await getCard(db, `${wordId}:meaning`);
  // he reads a sentence (or two) first: that time doesn't make a right answer Hard
  if (!ratedToday(existing, now)) return recordMeaning(db, wordId, { correct, responseMs, ratedMs: Math.max(0, responseMs - USE_READING_MS) }, now, 'use'); // logged as from 选一选/用一用, so Skills counts it once
  if (!correct) await bringForward(db, wordId, 'meaning', endOfLocalDay(now));
  return (await getCard(db, `${wordId}:meaning`))!;
}

export async function markWriteSkipped(db: AppDb, wordId: string, now: Date): Promise<void> {
  const word = await getWord(db, wordId);
  if (word) await putWords(db, [{ ...word, writeSkippedAt: now.getTime() }]);
}

/** Today's number of new words, worked out once a day from the last few lessons and saved for the Skills panel (spec 2026-10-05 §2.2). */
async function todaysPace(db: AppDb, now: Date, settings: Settings): Promise<number> {
  const today = localDateKey(now);
  if (settings.pace?.day === today) return Math.min(settings.pace.perDay, settings.newPerDay); // a ceiling lowered today applies today
  if (settings.newPerDay <= 0) return 0; // new words switched off: his pace is kept for when they come back (sweep)
  const sessions = (await allSessions(db)).filter((s) => !s.free && s.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const logs = await logsSince(db, addDays(now, -(LOOKBACK_DAYS + 1)).getTime());
  const rounds = sessions.filter((s) => s.completedSteps.includes('practice')).slice(0, 2).map(ranOut);
  const pace = nextPace({ prev: settings.pace?.perDay ?? null, ceiling: settings.newPerDay, kept: keptRecent(sessions, logs, today), ranOut: [rounds[0] ?? false, rounds[1] ?? false] });
  await updateSettings(db, { pace: { day: today, ...pace } });
  return pace.perDay;
}

/** Today's session if one exists (finished or not), otherwise a new plan. Earlier days are never resumed. */
export async function startOrResumeSession(db: AppDb, now: Date): Promise<SessionRecord> {
  const date = localDateKey(now);
  const existing = await getSession(db, date);
  // An untouched plan is rebuilt, so a parent's settings change applies today rather than tomorrow.
  if (existing && (existing.completed || existing.activeMs > 0 || existing.stepIndex > 0 || existing.flashIndex > 0 || existing.writeIndex > 0)) {
    return existing;
  }
  const rec = createSessionRecord(await planNow(db, now), date, now.getTime());
  await saveSession(db, rec);
  return rec;
}

async function planNow(db: AppDb, now: Date) {
  await openMissingRungs(db, now);
  const [cards, words, settings, practised] = await Promise.all([allCards(db), allWords(db), getSettings(db), practisedWords(db)]);
  return buildSessionPlan({ cards, words: [...words, ...ladderWordsBesides(words)], settings, now, practised, newPerDay: await todaysPace(db, now, settings) });
}

/**
 * Another lesson after today's (parent, 2026-10-05: more than one a day, the baseline stays one): planned fresh from where he
 * is now, so it brings the next new words and what is due. Graded like any lesson, but never saved over the day's record:
 * the day, its streak and its chest stay the first lesson's. Leaving one part-way keeps his answers; the next starts afresh.
 */
export async function startExtraLesson(db: AppDb, now: Date): Promise<SessionRecord> {
  return { ...createSessionRecord(await planNow(db, now), localDateKey(now), now.getTime()), extra: true };
}
