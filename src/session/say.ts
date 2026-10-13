// Say takes (spec 2026-10-11 §3, §6, §7): in 练一练 he reads a word aloud; the take is kept like the other recordings and the
// parent confirms (✓) or rejects (✗) it in Listen & confirm. Speech recognition is not used. 说一句 takes (production practice
// spec §4) — a sentence he says with a word — are kept, reviewed and tidied the same way, on the word's Sentence card.
import { Rating } from 'ts-fsrs';
import type { FinishedRecording } from '../audio/recorder';
import { sayPassed, type TakeRung } from '../ladder/rungs';
import { addDays, endOfLocalDay, startOfLocalDay } from '../lib/date';
import { newId } from '../lib/id';
import { waitingPassageTakes } from '../langdu/review';
import { newCard, review, snapshot } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { deleteRecording, getCard, getRecording, keepRecording, listRecordings, logsForCard, putCards, settleTake } from '../store/repo';
import type { CardRecord, Recording } from '../types';
import { bringForward } from './record';

/** Reviewed takes are kept this long (each word's newest take too, until its rung has passed). */
export const REVIEWED_KEEP_DAYS = 14;
/** Past this many waiting takes, only each word's newest waiting take of each kind is kept. */
export const WAITING_CAP = 60;

/** What a take is of: a Say take or a 说一句 take; null for any other recording. */
export const takeKind = (r: Recording): TakeRung | null => (r.prompt.kind === 'say' || r.prompt.kind === 'sentence' ? r.prompt.kind : null);
/** The word a Say or 说一句 take is of; null for any other recording. */
export const takeWord = (r: Recording): string | null => (r.prompt.kind === 'say' || r.prompt.kind === 'sentence' ? r.prompt.wordId : null);
/** The card a take counts toward: `${wordId}:say` or `${wordId}:sentence`. */
const takeCard = (r: Recording): string => `${takeWord(r)}:${takeKind(r)}`;

/** Takes waiting for the parent, oldest first: Say and 说一句 takes, and each passage's newest take (spec 2026-10-12 §6). */
export function waitingTakes(recs: Recording[]): Recording[] {
  return [...recs.filter((r) => takeWord(r) !== null && !r.review), ...waitingPassageTakes(recs)].sort((a, b) => a.createdAt - b.createdAt);
}

/** The newest of each card's takes among `list` (a word's Say and 说一句 takes apart). */
function newestByCard(list: Recording[]): Map<string, Recording> {
  const out = new Map<string, Recording>();
  for (const r of list) {
    const c = takeCard(r);
    const had = out.get(c);
    if (!had || r.createdAt > had.createdAt) out.set(c, r);
  }
  return out;
}

/**
 * The takes to delete (spec §6, §7): reviewed takes older than 14 days, except each card's newest take while its rung has not
 * passed (`passed`: the card ids, `${wordId}:say` or `${wordId}:sentence`, whose rung has; final review I5); and when more than
 * 60 wait, every waiting take but each card's newest. Other recordings are never touched.
 */
export function takesToDrop(recs: Recording[], now: Date, passed: ReadonlySet<string> = new Set()): string[] {
  const takes = recs.filter((r) => takeWord(r) !== null);
  const newest = newestByCard(takes);
  const cutoff = now.getTime() - REVIEWED_KEEP_DAYS * 86_400_000;
  const keepNewest = (r: Recording) => !passed.has(takeCard(r)) && newest.get(takeCard(r)) === r;
  const drop = new Set(takes.filter((r) => r.review && r.createdAt < cutoff && !keepNewest(r)).map((r) => r.id));
  const waiting = takes.filter((r) => !r.review);
  if (waiting.length > WAITING_CAP) {
    const keep = newestByCard(waiting);
    for (const r of waiting) if (keep.get(takeCard(r)) !== r) drop.add(r.id);
  }
  return [...drop];
}

/**
 * He recorded a take: it is kept for the parent, and its card (made now if it is his first) is scheduled like a right answer
 * (FSRS Good), but never due again before tomorrow — a second lesson today must not ask the same words (final review I4).
 * Nothing is logged: only the parent's verdict counts toward the pass. Old takes are tidied after.
 */
export async function recordTake(db: AppDb, kind: TakeRung, wordId: string, take: FinishedRecording, now: Date): Promise<CardRecord> {
  const id = `${wordId}:${kind}`;
  const had = await getCard(db, id);
  const was = had?.fsrs ?? newCard(now);
  // the take keeps its card as it was now, for the parent's verdict's log (SRS tuning spec §4)
  await keepRecording(db, { id: newId(), createdAt: now.getTime(), prompt: { kind, wordId }, ...take, cardBefore: snapshot(was, now) });
  const next = review(was, Rating.Good, now);
  const tomorrow = startOfLocalDay(addDays(now, 1));
  const card: CardRecord = { ...(had ?? {}), id, wordId, kind, fsrs: next.due < tomorrow ? { ...next, due: tomorrow } : next }; // keeps its pass
  await putCards(db, [card]);
  const recs = await listRecordings(db);
  const ids = [...new Set(recs.filter((r) => takeWord(r) !== null).map(takeCard))];
  const passed = new Set<string>();
  for (const c of ids) if ((c === id ? card : await getCard(db, c))?.passed) passed.add(c);
  for (const gone of takesToDrop(recs, now, passed)) await deleteRecording(db, gone);
  return card;
}

/** A Say card take (spec 2026-10-11 §3). */
export const recordSayTake = (db: AppDb, wordId: string, take: FinishedRecording, now: Date): Promise<CardRecord> => recordTake(db, 'say', wordId, take, now);
/** A 说一句 take (production practice spec §4). */
export const recordSentenceTake = (db: AppDb, wordId: string, take: FinishedRecording, now: Date): Promise<CardRecord> => recordTake(db, 'sentence', wordId, take, now);

/**
 * The parent's ✓ or ✗ on a take (spec §3): logged on the day he recorded it, on the take's own card (Say or Sentence). ✓ passes
 * the rung once two days have a confirmed take (the pass is dated now, when it became known); ✗ brings the card forward to be
 * due today. A take already reviewed (a second tap) or gone is left alone.
 */
export async function reviewTake(db: AppDb, recordingId: string, verdict: 'ok' | 'no', now: Date): Promise<void> {
  const rec = await getRecording(db, recordingId);
  const wordId = rec ? takeWord(rec) : null;
  const kind = rec ? takeKind(rec) : null;
  if (!rec || !wordId || !kind || rec.review) return;
  const ok = verdict === 'ok';
  const cardId = `${wordId}:${kind}`;
  // verdict and log commit together, and only once (a double tap finds it reviewed)
  if (!(await settleTake(db, recordingId, verdict, { cardId, wordId, kind, at: rec.createdAt, rating: ok ? Rating.Good : Rating.Again, correct: ok, ...rec.cardBefore }))) return;
  if (!ok) {
    await bringForward(db, wordId, kind, endOfLocalDay(now));
    return;
  }
  const card = await getCard(db, cardId);
  if (card && !card.passed && sayPassed(await logsForCard(db, cardId), cardId, kind)) await putCards(db, [{ ...card, passed: now.getTime() }]);
}
