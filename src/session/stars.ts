// A finished lesson's stars (spec 2026-10-11 §5): what newly reached "can produce" since the last lesson's stars, at least one.
import { parseDateKey, startOfLocalDay } from '../lib/date';
import { starsOf } from '../stats/stats';
import { closestToProduce, lessonStars, producedBetween } from '../stats/produce';
import type { AppDb } from '../store/db';
import { allCards, getKid, logsSince, updateKid } from '../store/repo';
import type { SessionRecord, Word } from '../types';

/**
 * Passes since his last starred lesson (or since the lesson's morning) earn this lesson's stars, so a Say take the parent
 * confirmed last night counts in today's lesson and nothing counts twice. An extra lesson's stars go to bonusStars (it is never
 * saved). Returns the record with its stars, what was produced, and — when nothing was — the words closest to it.
 */
export async function settleLessonStars(db: AppDb, rec: SessionRecord, now: Date, wordOf: (id: string) => Word | undefined): Promise<SessionRecord> {
  const at = now.getTime();
  const [cards, logs, kid] = await Promise.all([allCards(db), logsSince(db, at - 60 * 86_400_000), getKid(db)]);
  const since = kid?.starredUpTo ?? startOfLocalDay(parseDateKey(rec.date)).getTime();
  const p = producedBetween(cards, since, at);
  const produced = { write: p.write.length, say: p.say.length };
  // a lesson begun before mastery stars (no `stars` on it) counted its steps while in progress: it never ends with fewer (final review I2)
  const stars = rec.stars === undefined ? Math.max(lessonStars(produced), starsOf(rec.completedSteps)) : lessonStars(produced);
  await updateKid(db, (k) => ({ ...k, starredUpTo: at, ...(rec.extra ? { bonusStars: k.bonusStars + stars } : {}) }));
  return { ...rec, stars, produced, closest: produced.write + produced.say ? [] : closestToProduce(cards, logs, wordOf) };
}
