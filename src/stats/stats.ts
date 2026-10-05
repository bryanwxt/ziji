import { Rating } from 'ts-fsrs';
import { addDays, endOfLocalDay, localDateKey, parseDateKey } from '../lib/date';
import { isEarned } from '../srs/scheduler';
import type { CardRecord, ReviewLog, SessionRecord, Word } from '../types';

export interface Knowledge {
  words: Word[];
  cards: CardRecord[];
  wordsById: Map<string, Word>;
  cardsById: Map<string, CardRecord>;
  knownWordIds: Set<string>;
  knownChars: Set<string>; // single-character words the child knows
  known: number;
  written: number;
}

export function summarize(words: Word[], cards: CardRecord[]): Knowledge {
  const wordsById = new Map(words.map((w) => [w.id, w]));
  const knownWordIds = new Set(cards.filter((c) => c.kind === 'recognise' && isEarned(c.fsrs)).map((c) => c.wordId));
  const knownChars = new Set<string>();
  for (const id of knownWordIds) {
    const text = wordsById.get(id)?.text;
    if (text && Array.from(text).length === 1) knownChars.add(text);
  }
  return {
    words,
    cards,
    wordsById,
    cardsById: new Map(cards.map((c) => [c.id, c])),
    knownWordIds,
    knownChars,
    known: knownWordIds.size,
    written: cards.filter((c) => c.kind === 'write' && isEarned(c.fsrs)).length,
  };
}

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
