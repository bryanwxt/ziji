// What the Celebration needs before it plays (rewards spec §3–4): the lesson counted on the river meter once, and later the goal facts.
import { fillMeter, lessonOf, type MeterFill } from '../fun/meter';
import type { AppDb } from '../store/db';
import { getKid, saveKid, updateKid } from '../store/repo';
import { DEFAULT_KID, type KidState, type SessionRecord } from '../types';

/** Counts a finished lesson on the meter, once (a celebration shown again counts nothing); free play counts nothing (fill null). */
export async function settleMeter(db: AppDb, rec: SessionRecord): Promise<{ kid: KidState; fill: MeterFill | null }> {
  const lesson = lessonOf(rec);
  const stored = await getKid(db);
  if (!lesson) return { kid: stored ?? DEFAULT_KID, fill: null };
  let fill: MeterFill | null = null;
  const saved = await updateKid(db, (k) => {
    const r = fillMeter(k, lesson);
    fill = r.fill;
    return r.fill.counted ? r.kid : null;
  });
  if (saved) return { kid: saved, fill: fill as MeterFill | null };
  if (stored) return { kid: stored, fill: fill as MeterFill | null };
  const r = fillMeter(DEFAULT_KID, lesson); // nothing stored yet: count it on a new kid
  await saveKid(db, r.kid);
  return { kid: r.kid, fill: r.fill };
}
