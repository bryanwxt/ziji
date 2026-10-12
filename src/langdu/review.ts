// His passage takes in Listen & confirm (spec 2026-10-12 §6): each passage's newest take waits until the parent has listened;
// Done saves the characters he misread; reviewed takes are tidied after 14 days, each passage's newest kept.
import type { AppDb } from '../store/db';
import { deleteRecording, getRecording, listRecordings, updateRecording } from '../store/repo';
import type { Recording } from '../types';
import { applyMisreads } from './misreads';

/** Reviewed passage takes are kept this long; each passage's newest take stays whatever its age. */
export const PASSAGE_KEEP_DAYS = 14;

/** The passage a take is of; null for any other recording (a self-introduction, a Say take). */
export const passageOf = (r: Recording): string | null => (r.prompt.kind === 'passage' ? r.prompt.passageId : null);

function newestByPassage(recs: Recording[]): Map<string, Recording> {
  const out = new Map<string, Recording>();
  for (const r of recs) {
    const p = passageOf(r);
    if (p === null) continue;
    const had = out.get(p);
    if (!had || r.createdAt > had.createdAt) out.set(p, r);
  }
  return out;
}

/** Each passage's newest take, if the parent hasn't listened to it yet; an older one left the queue when a newer one came. */
export function waitingPassageTakes(recs: Recording[]): Recording[] {
  return [...newestByPassage(recs).values()].filter((r) => !r.review);
}

/** Reviewed passage takes older than 14 days, except each passage's newest. Unreviewed takes and other recordings stay. */
export function passageTakesToDrop(recs: Recording[], now: Date): string[] {
  const newest = newestByPassage(recs);
  const cutoff = now.getTime() - PASSAGE_KEEP_DAYS * 86_400_000;
  return recs.filter((r) => passageOf(r) !== null && r.review && r.createdAt < cutoff && newest.get(passageOf(r)!) !== r).map((r) => r.id);
}

export async function tidyPassageTakes(db: AppDb, now: Date): Promise<void> {
  for (const id of passageTakesToDrop(await listRecordings(db), now)) await deleteRecording(db, id);
}

/** Done on a passage take: its marks become priority words (as before), and it is listened to. Not graded. */
export async function finishPassageReview(db: AppDb, rec: Recording, marks: string[], now: Date): Promise<{ updated: number; notInApp: string[] }> {
  const res = await applyMisreads(db, rec, marks, now);
  const saved = await getRecording(db, rec.id);
  if (saved && !saved.review) await updateRecording(db, { ...saved, review: 'ok' });
  return res;
}
