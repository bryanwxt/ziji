// What the Celebration needs before it plays (rewards spec §3–4): the lesson counted on the river meter once, and later the goal facts.
import { BUILTIN, hanChars } from '../content';
import type { GoalFacts } from '../fun/goals';
import { fillMeter, lessonOf, type MeterFill } from '../fun/meter';
import { powerFamilies } from '../fun/powers';
import { stickerFamilies } from '../fun/stickers';
import { startOfLocalDay } from '../lib/date';
import { journeyCount } from '../placement/journey';
import { oneDayAway } from '../stats/produce';
import type { Knowledge } from '../stats/stats';
import type { AppDb } from '../store/db';
import { getKid, logsSince, saveKid, updateKid } from '../store/repo';
import { DEFAULT_KID, type KidState, type SessionRecord } from '../types';

/** Counts a finished lesson on the meter, once (a celebration shown again counts nothing); free play counts nothing (fill null).
 *  `today` is the device's local day: a meter dated after it (a clock that ran ahead) would refuse every lesson, so its day is
 *  set aside first and the lesson counts as on a new meter day. */
export async function settleMeter(db: AppDb, rec: SessionRecord, today: string): Promise<{ kid: KidState; fill: MeterFill | null }> {
  const lesson = lessonOf(rec);
  const stored = await getKid(db);
  if (!lesson) return { kid: stored ?? DEFAULT_KID, fill: null };
  let fill: MeterFill | null = null;
  const saved = await updateKid(db, (k) => {
    const r = fillMeter(k.meter.day > today ? { ...k, meter: { ...k.meter, day: '' } } : k, lesson);
    fill = r.fill;
    return r.fill.counted ? r.kid : null;
  });
  if (saved) return { kid: saved, fill: fill as MeterFill | null };
  if (stored) return { kid: stored, fill: fill as MeterFill | null };
  const r = fillMeter(DEFAULT_KID, lesson); // nothing stored yet: count it on a new kid
  await saveKid(db, r.kid);
  return { kid: r.kid, fill: r.fill };
}

/** The facts the goals are worked out from (rewards spec §4), read once as the Celebration loads. */
export async function loadGoalFacts(db: AppDb, know: Knowledge, counted: boolean, now: Date): Promise<GoalFacts> {
  const [journey, logs] = await Promise.all([journeyCount(db, know.known), logsSince(db, now.getTime() - 60 * 86_400_000)]);
  const dayStart = startOfLocalDay(now).getTime();
  const lessonChars = new Set(know.cards.filter((c) => c.kind === 'recognise' && (c.passed ?? 0) >= dayStart).flatMap((c) => hanChars(know.wordsById.get(c.wordId)?.text ?? '')));
  return { journey, oneDay: oneDayAway(know.cards, logs, (id) => know.wordsById.get(id)), lessonChars, counted, families: stickerFamilies(BUILTIN), powers: powerFamilies(BUILTIN) };
}
