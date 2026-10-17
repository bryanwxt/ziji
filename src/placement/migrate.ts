// An older placement under the new recheck rules, once (spec 2026-10-14, parent ruling): the band check's cards whose first
// recheck hasn't happened are marked placed — so a missed recheck sends the character back to learn and a lesson takes 10 —
// and re-spread from today in school order, at most 10 a day, never earlier than they were due.
import { addDays, startOfLocalDay } from '../lib/date';
import type { AppDb } from '../store/db';
import { allCards, allWords, answeredCardIds, getSettings, putCards, updateSettings } from '../store/repo';
import type { CardRecord } from '../types';
import { MAX_FIRST_CHECKS_PER_DAY, schoolOrder } from './placement';

const MINUTE = 60_000;

/** Marks and re-spreads an older placement's unrechecked cards; returns how many. Runs once (settings.placementMarked). */
export async function markOldPlacement(db: AppDb, now: Date): Promise<number> {
  const settings = await getSettings(db);
  if (settings.placementMarked) return 0;
  const at = settings.placementResult?.at;
  let marked: CardRecord[] = [];
  if (at !== undefined) {
    // the byCard index's keys only, not every log (review 2026-10-17)
    const [cards, words, answered] = await Promise.all([allCards(db), allWords(db), answeredCardIds(db)]);
    // its first recheck is a log on this (reading) card; an answer by ear or meaning is on another card and doesn't count (review
    // M4). A card earned in lessons, or passed on the ladder, has reading logs, so it is never marked
    const byId = new Map(words.map((w) => [w.id, w]));
    const old = cards.filter((c) => c.kind === 'recognise' && !c.placed && c.passed !== undefined && c.passed <= at + MINUTE && !answered.has(c.id) && byId.has(c.wordId));
    old.sort((a, b) => schoolOrder(byId.get(a.wordId)!, byId.get(b.wordId)!));
    const today = startOfLocalDay(now).getTime();
    const dayOf = (t: number) => Math.max(0, Math.round((startOfLocalDay(new Date(t)).getTime() - today) / 86_400_000));
    const load = new Map<number, number>();
    marked = old.map((c, i) => {
      let day = dayOf(c.fsrs.due.getTime()); // never earlier than it was due; overdue: today
      while ((load.get(day) ?? 0) >= MAX_FIRST_CHECKS_PER_DAY) day++;
      load.set(day, (load.get(day) ?? 0) + 1);
      const due = Math.max(c.fsrs.due.getTime(), addDays(new Date(today), day).getTime() + i); // + i ms: school order within a day
      return { ...c, placed: true, fsrs: { ...c.fsrs, due: new Date(due) } };
    });
    await putCards(db, marked);
  }
  await updateSettings(db, { placementMarked: true });
  return marked.length;
}
