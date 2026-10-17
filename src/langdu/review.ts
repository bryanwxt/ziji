// His passage takes in Listen & confirm (spec 2026-10-12 §6): each passage's newest lesson take waits until the parent has
// listened; Done saves the characters he misread. Takes older than 14 days are tidied, reviewed or not, except each passage's
// newest lesson take (final review I5, I6). A 多读一遍 take (prompt.extra) is listed in Recordings but never the queue's take.
import type { AppDb } from '../store/db';
import { deleteRecording, getRecording, listRecordings, updateKid, updateRecording } from '../store/repo';
import type { Recording } from '../types';
import { applyMisreads } from './misreads';
import { bonusOnReview } from './stars';

/** Passage takes are kept this long; each passage's newest lesson take stays whatever its age. */
export const PASSAGE_KEEP_DAYS = 14;

/** The passage a take is of; null for any other recording (a self-introduction, a Say take). */
export const passageOf = (r: Recording): string | null => (r.prompt.kind === 'passage' ? r.prompt.passageId : null);

/** A 多读一遍 take: listed, tidied after 14 days, never waiting for the parent nor a bonus baseline (final review I6). */
export const isExtraTake = (r: Recording): boolean => r.prompt.kind === 'passage' && r.prompt.extra === true;

/** Each passage's newest lesson take (extra rounds left out): the one that waits, and the one kept forever. */
export function newestByPassage(recs: Recording[]): Map<string, Recording> {
  const out = new Map<string, Recording>();
  for (const r of recs) {
    const p = passageOf(r);
    if (p === null || isExtraTake(r)) continue;
    const had = out.get(p);
    if (!had || r.createdAt > had.createdAt) out.set(p, r);
  }
  return out;
}

/** Each passage's newest lesson take, if the parent hasn't listened to it yet; an older one left the queue when a newer one came. */
export function waitingPassageTakes(recs: Recording[]): Recording[] {
  return [...newestByPassage(recs).values()].filter((r) => !r.review);
}

/**
 * Passage takes older than 14 days, except each passage's newest lesson take. Reviewed or not: a superseded take left the queue
 * and can never be reviewed (final review I5); extra-round takes go too. Other recordings stay.
 */
export function passageTakesToDrop(recs: Recording[], now: Date): string[] {
  const newest = newestByPassage(recs);
  const cutoff = now.getTime() - PASSAGE_KEEP_DAYS * 86_400_000;
  return recs.filter((r) => passageOf(r) !== null && r.createdAt < cutoff && newest.get(passageOf(r)!) !== r).map((r) => r.id);
}

export async function tidyPassageTakes(db: AppDb, now: Date): Promise<void> {
  for (const id of passageTakesToDrop(await listRecordings(db), now)) await deleteRecording(db, id);
}

/** Done on a passage take: its marks become priority words (as before), and it is listened to. Not graded. A re-read with a
 *  reviewed take before it earns the bonus star here, once, for fewer misreads than that take (learning rules 2026-10-17). */
export async function finishPassageReview(db: AppDb, rec: Recording, marks: string[], now: Date): Promise<{ updated: number; notInApp: string[]; bonus: boolean }> {
  // work from the stored take, not the row's copy: a retry after a failed save must not grant the extra day twice
  const stored = await getRecording(db, rec.id);
  if (!stored || stored.review === 'ok') return { updated: 0, notInApp: [], bonus: false };
  const res = await applyMisreads(db, stored, marks, now);
  const saved = await getRecording(db, rec.id);
  const first = !!saved && !saved.review;
  if (first) await updateRecording(db, { ...saved!, review: 'ok' });
  const bonus = first && bonusOnReview(stored.misreadsBefore, new Set(marks).size);
  if (bonus) await updateKid(db, (k) => ({ ...k, bonusStars: k.bonusStars + 1 }));
  return { ...res, bonus };
}
