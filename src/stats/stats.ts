import { Rating } from 'ts-fsrs';
import { addDays, endOfLocalDay, localDateKey, parseDateKey } from '../lib/date';
import { ladderWords } from '../content/ladder';
import { isOwned, rungOf, type RungKind } from '../ladder/rungs';
import type { CardRecord, ReviewLog, SessionRecord, Word } from '../types';

export interface Knowledge {
  words: Word[];
  cards: CardRecord[];
  wordsById: Map<string, Word>;
  cardsById: Map<string, CardRecord>;
  ladderById: Map<string, Word>;
  knownWordIds: Set<string>; // words whose Read rung has passed
  knownChars: Set<string>; // characters recognised: in any word whose Read has passed (spec 2026-10-06 §3.3)
  known: number; // = knownChars.size
  heard: number;
  understood: number; // understood in a sentence he heard (plan 2b)
  read: number;
  used: number;
  owned: number;
  written: number; // characters whose writing has passed
}

export function summarize(words: Word[], cards: CardRecord[]): Knowledge {
  const wordsById = new Map(words.map((w) => [w.id, w]));
  const ladderById = new Map(ladderWords().map((w) => [w.id, w]));
  const word = (id: string) => wordsById.get(id) ?? ladderById.get(id);
  const passedRungs = new Map<string, Set<RungKind>>();
  for (const c of cards) {
    const r = rungOf(c.kind);
    if (!r || !c.passed || !word(c.wordId)) continue;
    (passedRungs.get(c.wordId) ?? passedRungs.set(c.wordId, new Set()).get(c.wordId)!).add(r);
  }
  const count = (r: RungKind) => [...passedRungs.values()].filter((s) => s.has(r)).length;
  const knownWordIds = new Set([...passedRungs].filter(([, s]) => s.has('read')).map(([id]) => id));
  const knownChars = new Set<string>();
  for (const id of knownWordIds) for (const ch of Array.from(word(id)!.text)) if (/\p{Script=Han}/u.test(ch)) knownChars.add(ch);
  return {
    words, cards, wordsById, ladderById,
    cardsById: new Map(cards.map((c) => [c.id, c])),
    knownWordIds, knownChars, known: knownChars.size,
    heard: count('hear'), understood: count('understand'), read: count('read'), used: count('use'),
    owned: [...passedRungs].filter(([id, s]) => isOwned(word(id)!, s)).length,
    written: cards.filter((c) => c.kind === 'write' && c.passed).length,
  };
}

/** A word by id: one he has, or a ladder 词语 (the parent's lists name both: final review I8). */
export const wordOf = (know: Pick<Knowledge, 'wordsById' | 'ladderById'>, id: string): Word | undefined => know.wordsById.get(id) ?? know.ladderById.get(id);

/** Consecutive completed days ending today (or yesterday, while today is still to do). */
export function streak(sessions: SessionRecord[], today: string): number {
  const done = new Set(sessions.filter((s) => s.completed && !s.free).map((s) => s.date));
  let day = parseDateKey(today);
  if (!done.has(today)) day = addDays(day, -1);
  let n = 0;
  while (done.has(localDateKey(day))) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** One star per finished activity; 用一用 closes the lesson but isn't a star of its own; 练一练 counts two (it replaces 选一选, 钓鱼 and 用一用, spec 2026-10-05). */
export const starsOf = (steps: readonly string[]) => steps.reduce((n, s) => n + (s === 'wrapup' ? 0 : s === 'practice' ? 2 : 1), 0);
/** Lessons before this day counted 用一用 as a star: they keep it, so his total (and a stars goal) never goes down. */
export const WRAPUP_NO_STAR_FROM = '2026-10-05';

export function totalStars(sessions: SessionRecord[], bonusStars: number): number {
  return sessions.reduce((sum, s) => sum + (s.date < WRAPUP_NO_STAR_FROM ? s.completedSteps.length : starsOf(s.completedSteps)), 0) + bonusStars;
}

export function minutesPerDay(sessions: SessionRecord[], today: string, days = 30): { date: string; minutes: number }[] {
  const byDate = new Map(sessions.map((s) => [s.date, Math.round(s.activeMs / 60_000)]));
  const end = parseDateKey(today);
  return Array.from({ length: days }, (_, i) => {
    const date = localDateKey(addDays(end, i - days + 1));
    return { date, minutes: byDate.get(date) ?? 0 };
  });
}

export function weeklyAccuracy(logs: ReviewLog[], now: Date, weeks = 6): { weekStart: string; accuracy: number | null }[] {
  const today = parseDateKey(localDateKey(now));
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(today, -7 * (weeks - i) + 1);
    const end = addDays(start, 7).getTime();
    const inWeek = logs.filter((l) => l.at >= start.getTime() && l.at < end);
    return {
      weekStart: localDateKey(start),
      accuracy: inWeek.length ? inWeek.filter((l) => l.correct).length / inWeek.length : null,
    };
  });
}

export function troubleWords(logs: ReviewLog[], limit = 10): { wordId: string; misses: number }[] {
  const misses = new Map<string, number>();
  for (const l of logs) if (l.rating === Rating.Again) misses.set(l.wordId, (misses.get(l.wordId) ?? 0) + 1);
  return [...misses]
    .map(([wordId, n]) => ({ wordId, misses: n }))
    .sort((a, b) => b.misses - a.misses || a.wordId.localeCompare(b.wordId))
    .slice(0, limit);
}

export function dueTomorrow(cards: CardRecord[], words: Word[], now: Date): number {
  const active = new Set(words.filter((w) => !w.paused).map((w) => w.id));
  const from = endOfLocalDay(now).getTime();
  const to = endOfLocalDay(addDays(now, 1)).getTime();
  return cards.filter((c) => active.has(c.wordId) && c.fsrs.due.getTime() > from && c.fsrs.due.getTime() <= to).length;
}

export interface WeekDay { label: string; date: string; done: boolean; today: boolean }

/** This week, Monday first: which days a (non-free) lesson was finished. */
export function weekDays(sessions: SessionRecord[], today: string): WeekDay[] {
  const done = new Set(sessions.filter((s) => s.completed && !s.free).map((s) => s.date));
  const day = parseDateKey(today);
  const monday = addDays(day, -((day.getDay() + 6) % 7));
  return [...'一二三四五六日'].map((label, i) => {
    const date = localDateKey(addDays(monday, i));
    return { label, date, done: done.has(date), today: date === today };
  });
}
