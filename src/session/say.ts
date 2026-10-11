// Say takes (spec 2026-10-11 §3, §6, §7): in 练一练 he reads a word aloud; the take is kept like the other recordings and the
// parent confirms (✓) or rejects (✗) it in Listen & confirm. Speech recognition is not used.
import { Rating } from 'ts-fsrs';
import type { FinishedRecording } from '../audio/recorder';
import { sayPassed } from '../ladder/rungs';
import { endOfLocalDay } from '../lib/date';
import { newId } from '../lib/id';
import { newCard, review } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { deleteRecording, getCard, getRecording, keepRecording, listRecordings, logsForCard, putCards, settleTake } from '../store/repo';
import type { CardRecord, Recording } from '../types';
import { bringForward } from './record';

/** Reviewed takes are kept this long (each word's newest take is always kept). */
export const REVIEWED_KEEP_DAYS = 14;
/** Past this many waiting takes, only each word's newest waiting take is kept. */
export const WAITING_CAP = 60;

/** The word a Say take is of; null for any other recording. */
export const takeWord = (r: Recording): string | null => (r.prompt.kind === 'say' ? r.prompt.wordId : null);

/** Takes waiting for the parent, oldest first. */
export function waitingTakes(recs: Recording[]): Recording[] {
  return recs.filter((r) => takeWord(r) !== null && !r.review).sort((a, b) => a.createdAt - b.createdAt);
}

/** The newest of each word's takes among `list`. */
function newestByWord(list: Recording[]): Map<string, Recording> {
  const out = new Map<string, Recording>();
  for (const r of list) {
    const w = takeWord(r)!;
    const had = out.get(w);
    if (!had || r.createdAt > had.createdAt) out.set(w, r);
  }
  return out;
}

/**
 * The takes to delete (spec §6, §7): reviewed takes older than 14 days, except each word's newest take; and when more than 60
 * wait, every waiting take but each word's newest. Other recordings are never touched.
 */
export function takesToDrop(recs: Recording[], now: Date): string[] {
  const takes = recs.filter((r) => takeWord(r) !== null);
  const newest = newestByWord(takes);
  const cutoff = now.getTime() - REVIEWED_KEEP_DAYS * 86_400_000;
  const drop = new Set(takes.filter((r) => r.review && r.createdAt < cutoff && newest.get(takeWord(r)!) !== r).map((r) => r.id));
  const waiting = takes.filter((r) => !r.review);
  if (waiting.length > WAITING_CAP) {
    const keep = newestByWord(waiting);
    for (const r of waiting) if (keep.get(takeWord(r)!) !== r) drop.add(r.id);
  }
  return [...drop];
}

/**
 * He recorded a take: it is kept for the parent, and his Say card (made now if it is his first) is scheduled like a right
 * answer (FSRS Good). Nothing is logged: only the parent's verdict counts toward the pass. Old takes are tidied after.
 */
export async function recordSayTake(db: AppDb, wordId: string, take: FinishedRecording, now: Date): Promise<CardRecord> {
  await keepRecording(db, { id: newId(), createdAt: now.getTime(), prompt: { kind: 'say', wordId }, ...take });
  const id = `${wordId}:say`;
  const had = await getCard(db, id);
  const card: CardRecord = { ...(had ?? {}), id, wordId, kind: 'say', fsrs: review(had?.fsrs ?? newCard(now), Rating.Good, now) }; // keeps its pass
  await putCards(db, [card]);
  for (const gone of takesToDrop(await listRecordings(db), now)) await deleteRecording(db, gone);
  return card;
}

/**
 * The parent's ✓ or ✗ on a take (spec §3): logged on the day he recorded it. ✓ passes the rung once two days have a confirmed
 * take (the pass is dated now, when it became known); ✗ brings his Say card forward to be due today. A take already
 * reviewed (a second tap) or gone is left alone.
 */
export async function reviewTake(db: AppDb, recordingId: string, verdict: 'ok' | 'no', now: Date): Promise<void> {
  const rec = await getRecording(db, recordingId);
  const wordId = rec ? takeWord(rec) : null;
  if (!rec || !wordId || rec.review) return;
  const ok = verdict === 'ok';
  const cardId = `${wordId}:say`;
  // verdict and log commit together, and only once (a double tap finds it reviewed)
  if (!(await settleTake(db, recordingId, verdict, { cardId, wordId, kind: 'say', at: rec.createdAt, rating: ok ? Rating.Good : Rating.Again, correct: ok }))) return;
  if (!ok) {
    await bringForward(db, wordId, 'say', endOfLocalDay(now));
    return;
  }
  const card = await getCard(db, cardId);
  if (card && !card.passed && sayPassed(await logsForCard(db, cardId), cardId)) await putCards(db, [{ ...card, passed: now.getTime() }]);
}
