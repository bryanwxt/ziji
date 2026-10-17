import { Rating, State } from 'ts-fsrs';
import { addDays, endOfLocalDay, localDateKey, startOfLocalDay } from '../lib/date';
import { canAskRung, fastLimit, nextRung, passedAt, RUNG_CARD, rungOf } from '../ladder/rungs';
import { findWord } from '../ladder/words';
import { ladderWordsBesides } from '../content/ladder';
import { newCard, review, snapshot, toRating, type TapKind } from '../srs/scheduler';
import { LISTEN_MS, slowLines, USE_READING_MS, type SlowLines } from '../srs/slow';
import type { AppDb } from '../store/db';
import { addReviewLog, allCards, allSessions, allWords, deleteCards, getCard, getSession, getSettings, getWord, logsForCard, logsForWord, logsSince, putCards, putWords, saveSession, practisedWords, updateSettings } from '../store/repo';
import type { CardKind, CardRecord, CardSnapshot, Grade, ReviewLog, SessionRecord, Settings, Word } from '../types';
import { keptRecent, LOOKBACK_DAYS, nextPace, ranOut } from './pace';
import { buildSessionPlan } from './plan';
import { createSessionRecord } from './runner';

export { LISTEN_MS, USE_READING_MS };

/** A tap answer: right or not, how long it took, and this lesson's slow lines (spec §3.2; absent: 6 s). */
export interface TapOutcome { correct: boolean; responseMs: number; slow?: SlowLines }

/** His slow lines for a lesson (spec §3.2): from all his review logs, once, as the lesson starts. */
export const SLOW_LOOKBACK_DAYS = 120; // the line needs his last 40 right answers per kind; older ones only slow the read

export async function lessonSlowLines(db: AppDb, now: Date = new Date()): Promise<SlowLines> {
  try {
    return slowLines(await logsSince(db, now.getTime() - SLOW_LOOKBACK_DAYS * 86_400_000));
  } catch {
    return {}; // a storage error degrades to the 6 s default
  }
}

/** Reviews a card (made now if it is the first) and returns it with what it was before, for the log (spec §4). */
async function reviewCard(db: AppDb, wordId: string, kind: CardKind, rating: Grade, now: Date): Promise<{ card: CardRecord; before: CardSnapshot }> {
  const id = `${wordId}:${kind}`;
  const existing = await getCard(db, id);
  const was = existing?.fsrs ?? newCard(now);
  const card: CardRecord = { ...(existing ?? {}), id, wordId, kind, fsrs: review(was, rating, now) }; // keeps its pass
  await putCards(db, [card]);
  return { card, before: snapshot(was, now) };
}

/** Produced (spec §3.1): the word has a passed write, Say or 说一句 card. */
export async function isProduced(db: AppDb, wordId: string): Promise<boolean> {
  const cards = await Promise.all((['write', 'say', 'sentence'] as const).map((k) => getCard(db, `${wordId}:${k}`)));
  return cards.some((c) => c?.passed !== undefined);
}

/** Rates a tap answer (spec §3.1: Hard until produced, Hard when slow for him), logs it with the card's state, and settles its rung. */
async function rateTap(db: AppDb, wordId: string, kind: TapKind, o: TapOutcome, ratedMs: number, now: Date, extra: Pick<ReviewLog, 'source' | 'placedCheck'> = {}): Promise<CardRecord> {
  const state = (await getCard(db, `${wordId}:${kind}`))?.fsrs.state ?? State.New; // the card before this review
  const produced = o.correct && (await isProduced(db, wordId));
  const rating = toRating({ kind, correct: o.correct, responseMs: ratedMs, produced, state, slowMs: o.slow?.[kind] });
  const { card, before } = await reviewCard(db, wordId, kind, rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind, at: now.getTime(), rating, correct: o.correct, responseMs: o.responseMs, ...before, ...extra });
  return (await settleRung(db, wordId, kind, now)) ?? card;
}

/**
 * A reading answer. A placed card's first recheck (spec 2026-10-14) ends its placement: missed (Again), the character goes back
 * to learn — every card of it but a write card he has answered is deleted (the logs stay), so it is unstarted and the catch-up lane
 * teaches it again with a proper 认新字 introduction; the log is kept. Only placement cards, only their first recheck.
 */
export async function recordRecognition(db: AppDb, wordId: string, outcome: TapOutcome, now: Date): Promise<CardRecord> {
  const placed = (await getCard(db, `${wordId}:recognise`))?.placed === true;
  const card = await rateTap(db, wordId, 'recognise', outcome, outcome.responseMs, now, placed ? { placedCheck: true } : {});
  if (!placed) return card;
  const { placed: _done, ...rest } = card;
  if (outcome.correct) {
    await putCards(db, [rest]);
    return rest;
  }
  // truly unstarted (review I1): every card of the word goes — a passed hear rung would reopen its Read card — but a write card he
  // has answered (his handwriting stays his); 认新字 gives the hear card back when it teaches the word again
  const written = (await logsForWord(db, wordId)).some((l) => l.kind === 'write');
  const gone = (await allCards(db)).filter((c) => c.wordId === wordId && !(c.kind === 'write' && written));
  await deleteCards(db, gone.map((c) => c.id));
  return rest;
}

/** ratedMs: the time that counts toward "slow" (reading time taken off); the log keeps responseMs. */
export const recordMeaning = (db: AppDb, wordId: string, outcome: TapOutcome & { ratedMs?: number }, now: Date, source?: 'use'): Promise<CardRecord> =>
  rateTap(db, wordId, 'meaning', outcome, outcome.ratedMs ?? outcome.responseMs, now, source ? { source } : {});

export async function recordWriting(db: AppDb, wordId: string, totalMisses: number, now: Date): Promise<CardRecord> {
  const rating = toRating({ kind: 'write', totalMisses });
  const { card, before } = await reviewCard(db, wordId, 'write', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'write', at: now.getTime(), rating, correct: totalMisses <= 3, misses: totalMisses, ...before });
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
export async function beginNewWord(db: AppDb, word: Word, asked: 'hear' | 'read' | 'meaning', outcome: TapOutcome, now: Date): Promise<CardRecord> {
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
  // heard right, for real: asked only for a guessed card, from its word's Hear card's own logs (not every log)
  const heard = new Map<string, boolean>();
  const confirmed = async (wordId: string) => {
    if (!heard.has(wordId)) heard.set(wordId, (await logsForCard(db, `${wordId}:hear`)).some((l) => l.kind === 'hear' && l.correct));
    return heard.get(wordId)!;
  };
  for (const c of cards) {
    const rung = rungOf(c.kind);
    if (!rung) continue;
    // a Hear placement guess waits for a real right answer: hundreds placed at once would open hundreds of rungs tomorrow (final review I1)
    if (c.guess && !(await confirmed(c.wordId))) continue;
    const word = await findWord(db, c.wordId);
    // a rung that can no longer be asked (its sentences were removed) never strands the word: the next rung opens (plan 2b)
    if (!c.passed && !(word && !canAskRung(word, rung))) continue;
    const next = word ? nextRung(word, rung) : null;
    const id = next ? `${c.wordId}:${RUNG_CARD[next]}` : null;
    if (!next || !id || have.has(id)) continue;
    have.add(id);
    made.push({ id, wordId: c.wordId, kind: RUNG_CARD[next], fsrs: { ...newCard(now), due: addDays(startOfLocalDay(now), 1) } });
  }
  await putCards(db, made);
  return made.length;
}

/** He heard a sentence with the word and picked its English (the Understand rung, spec 2026-10-06 §3.2): listening time isn't slowness. */
export const recordUnderstand = (db: AppDb, wordId: string, outcome: TapOutcome, now: Date): Promise<CardRecord> =>
  rateTap(db, wordId, 'understand', outcome, Math.max(0, outcome.responseMs - LISTEN_MS), now);

/** He heard the word and picked its meaning (the Hear rung, spec 2026-10-06 §3.2). */
export const recordHear = (db: AppDb, wordId: string, outcome: TapOutcome, now: Date): Promise<CardRecord> =>
  rateTap(db, wordId, 'hear', outcome, outcome.responseMs, now);

const ratedToday = (c: CardRecord | undefined, now: Date) => !!c?.fsrs.last_review && localDateKey(c.fsrs.last_review) === localDateKey(now);

/** Brings a card forward so the next lesson includes it; never pushes it later. */
export async function bringForward(db: AppDb, wordId: string, kind: CardKind, due: Date): Promise<void> {
  const c = await getCard(db, `${wordId}:${kind}`);
  if (c && c.fsrs.due.getTime() > due.getTime()) await putCards(db, [{ ...c, fsrs: { ...c.fsrs, due } }]);
}

/** A word used in context (选一选, 用对了吗, 用一用): the day's first answer rates its meaning card; a later miss brings it forward. */
export async function recordUse(db: AppDb, wordId: string, correct: boolean, now: Date, responseMs = 0, slow?: SlowLines): Promise<CardRecord> {
  const existing = await getCard(db, `${wordId}:meaning`);
  // he reads a sentence (or two) first: that time doesn't make a right answer Hard
  if (!ratedToday(existing, now)) return recordMeaning(db, wordId, { correct, responseMs, ratedMs: Math.max(0, responseMs - USE_READING_MS), slow }, now, 'use'); // logged as from 选一选/用一用, so Skills counts it once
  if (!correct) await bringForward(db, wordId, 'meaning', endOfLocalDay(now));
  return (await getCard(db, `${wordId}:meaning`))!;
}

/**
 * A 组词 written in 写一写 (production practice spec §3): the day's first rating of the word's meaning card, right (Good) or wrong
 * (Again), logged like the other meaning ratings (so the Use rung's two-day pass applies) with no answer time — writing is slow,
 * never a guess. Already rated today (练一练 asked it): a miss brings it forward instead.
 */
export async function recordWrittenMeaning(db: AppDb, wordId: string, correct: boolean, now: Date): Promise<CardRecord> {
  const existing = await getCard(db, `${wordId}:meaning`);
  if (ratedToday(existing, now)) {
    if (!correct) await bringForward(db, wordId, 'meaning', endOfLocalDay(now));
    return (await getCard(db, `${wordId}:meaning`))!;
  }
  const rating = correct ? Rating.Good : Rating.Again; // writing is production: counts as produced for its own rating (spec §3.1)
  const { card, before } = await reviewCard(db, wordId, 'meaning', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'meaning', at: now.getTime(), rating, correct, source: 'write', ...before });
  return (await settleRung(db, wordId, 'meaning', now)) ?? card;
}

/** A read-only character traced (production practice spec §3): a recent lesson word is traced once, not every lesson. */
export async function markTraced(db: AppDb, wordId: string, now: Date): Promise<void> {
  const word = await getWord(db, wordId);
  if (word && word.tracedAt === undefined) await putWords(db, [{ ...word, tracedAt: now.getTime() }]);
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

async function planNow(db: AppDb, now: Date, extra = false) {
  await openMissingRungs(db, now);
  const [cards, words, settings, practised] = await Promise.all([allCards(db), allWords(db), getSettings(db), practisedWords(db)]);
  const all = [...words, ...ladderWordsBesides(words)];
  // an extra lesson never asks the pace: it takes no new words (learning rules 2026-10-17)
  if (extra) return buildSessionPlan({ cards, words: all, settings, now, practised, extra: true });
  return buildSessionPlan({ cards, words: all, settings, now, practised, newPerDay: await todaysPace(db, now, settings) });
}

/**
 * Another lesson after today's (parent, 2026-10-05: more than one a day, the baseline stays one). Review only (learning rules
 * 2026-10-17; Cepeda et al. 2006): no new words — what is due or due by tomorrow, and the practice and production steps for words
 * he has met; with nothing due, a short round of his weakest words. Graded like any lesson, but never saved over the day's record:
 * the day, its streak and its chest stay the first lesson's. Leaving one part-way keeps his answers; the next starts afresh.
 */
export async function startExtraLesson(db: AppDb, now: Date): Promise<SessionRecord> {
  return { ...createSessionRecord(await planNow(db, now, true), localDateKey(now), now.getTime()), extra: true };
}
