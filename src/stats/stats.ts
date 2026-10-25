import { Rating } from 'ts-fsrs';
import { addDays, endOfLocalDay, localDateKey, parseDateKey } from '../lib/date';
import { goneWord, ladderWords } from '../content/ladder';
import { isOwned, rungOf, type RungKind } from '../ladder/rungs';
import type { CardRecord, ReviewLog, SessionRecord, WeekList, Word } from '../types';

export interface Knowledge {
  words: Word[];
  cards: CardRecord[];
  wordsById: Map<string, Word>;
  cardsById: Map<string, CardRecord>;
  ladderById: Map<string, Word>;
  passedRungs: Map<string, Set<RungKind>>; // each word's passed rungs (the town lights from these: spec 2026-10-06 §3.7)
  knownWordIds: Set<string>; // words whose Read rung has passed
  knownChars: Set<string>; // characters recognised: in any word whose Read has passed (spec 2026-10-06 §3.3)
  /** each known character's syllables in those words, tone-marked and lowercased (只 → {zhī} from 一只): pinyin fades per reading (final review I1) */
  knownReadings: ReadonlyMap<string, ReadonlySet<string>>;
  known: number; // = knownChars.size
  /** known words whose reading is confirmed (parent decision 2026-10-25): learned in lessons, or a placement guess its first
   *  recheck got right — never `placed`, and he has answered the reading card. A guess not yet rechecked, or a pass he never
   *  answered (an older placement's, stamped by the ladder migration: review I2), still counts in known, never here. */
  confirmedWordIds: Set<string>;
  confirmedChars: Set<string>; // characters in confirmed words: what his own numbers count, so they only ever go up
  confirmed: number; // = confirmedChars.size
  heard: number;
  understood: number; // understood in a sentence he heard (plan 2b)
  read: number;
  used: number;
  owned: number;
  written: number; // characters whose writing has passed
  canUse: number; // words whose Sentence rung has passed: he said sentences with them (production practice spec §4)
  begun: number; // words begun: heard or read (a Hear or Read card)
  begunTexts: Set<string>; // those words' texts: a 组词 gap's choices are drawn from them (real test spec 2026-10-23 §5)
}

/** `answered`: the card ids with a review log (firstLogByCard's keys; loadKnowledge passes them). Absent, as in a test without
 *  logs: every card counts as answered. */
export function summarize(words: Word[], cards: CardRecord[], answered?: ReadonlySet<string>): Knowledge {
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
  const unconfirmed = new Set(cards.filter((c) => c.kind === 'recognise' && (c.placed === true || (answered && !answered.has(c.id)))).map((c) => c.wordId));
  const confirmedWordIds = new Set([...knownWordIds].filter((id) => !unconfirmed.has(id)));
  const confirmedChars = new Set([...confirmedWordIds].flatMap((id) => Array.from(word(id)!.text).filter((ch) => /\p{Script=Han}/u.test(ch))));
  const knownChars = new Set<string>();
  const knownReadings = new Map<string, Set<string>>();
  for (const id of knownWordIds) {
    const w = word(id)!;
    const han = Array.from(w.text).filter((ch) => /\p{Script=Han}/u.test(ch));
    for (const ch of han) knownChars.add(ch);
    // only a word whose pinyin lines up one syllable per character says which reading each one has
    const syl = w.pinyin.trim().toLowerCase().normalize('NFC').split(/\s+/);
    if (syl.length === han.length) han.forEach((ch, i) => (knownReadings.get(ch) ?? knownReadings.set(ch, new Set()).get(ch)!).add(syl[i]!));
  }
  const begunIds = new Set(cards.filter((c) => (c.kind === 'recognise' || c.kind === 'hear') && word(c.wordId)).map((c) => c.wordId));
  return {
    words, cards, wordsById, ladderById, passedRungs,
    cardsById: new Map(cards.map((c) => [c.id, c])),
    knownWordIds, knownChars, knownReadings, known: knownChars.size,
    confirmedWordIds, confirmedChars, confirmed: confirmedChars.size,
    heard: count('hear'), understood: count('understand'), read: count('read'), used: count('use'),
    owned: [...passedRungs].filter(([id, s]) => isOwned(word(id)!, s)).length,
    written: cards.filter((c) => c.kind === 'write' && c.passed).length,
    canUse: [...passedRungs].filter(([id, s]) => s.has('sentence') && begunIds.has(id)).length, // only over begun words, so it never exceeds begun
    begun: begunIds.size,
    begunTexts: new Set([...begunIds].map((id) => word(id)!.text)),
  };
}

/** A word by id: one he has, or a ladder 词语 (the parent's lists name both: final review I8). */
export const wordOf = (know: Pick<Knowledge, 'wordsById' | 'ladderById'>, id: string): Word | undefined => know.wordsById.get(id) ?? know.ladderById.get(id);

/** Monday of the calendar week (Mon–Sun) a day is in. */
const weekOf = (d: Date): string => localDateKey(addDays(d, -((d.getDay() + 6) % 7)));

/**
 * The streak (spec 2026-10-11 §5): days with a finished lesson, back from today (or yesterday, while today is still to do). One
 * missed day in a calendar week (Mon–Sun) is forgiven as a rest day — it doesn't add to the count — and a second missed day in
 * the same week ends the streak. `rest`: the forgiven days, only those with a finished day before them (newest first).
 */
export function streakDays(sessions: SessionRecord[], today: string, practised: ReadonlySet<string> = new Set()): { count: number; rest: string[] } {
  const done = new Set(sessions.filter((s) => s.completed && !s.free).map((s) => s.date));
  let day = parseDateKey(today);
  if (!done.has(today)) day = addDays(day, -1);
  const used = new Set<string>(); // weeks whose rest day is taken
  const rest: string[] = [];
  let pending: string[] = []; // missed days forgiven so far, kept once a finished day comes before them
  let count = 0;
  for (;;) {
    const key = localDateKey(day);
    if (done.has(key)) {
      count++;
      rest.push(...pending);
      pending = [];
    } else if (practised.has(key)) {
      // a day with only 考考自己 (parent ruling 2026-10-17): practice, not a rest day — the streak goes on through it, no longer
    } else {
      const week = weekOf(day);
      if (used.has(week)) break;
      used.add(week);
      pending.push(key);
    }
    day = addDays(day, -1);
  }
  return { count, rest };
}

export const streak = (sessions: SessionRecord[], today: string, practised?: ReadonlySet<string>): number => streakDays(sessions, today, practised).count;

/** Days he answered in a weekly list's 考考自己 (parent ruling 2026-10-17): practice, though not the day's lesson. */
export function practisedDays(lists: readonly WeekList[]): Set<string> {
  return new Set(lists.filter((l) => l.check && Object.keys(l.check.results).length > 0).map((l) => l.check!.day));
}

/** One star per finished activity; 用一用 closes the lesson but isn't a star of its own; 练一练 counts two (it replaces 选一选, 钓鱼 and 用一用, spec 2026-10-05). */
export const starsOf = (steps: readonly string[]) => steps.reduce((n, s) => n + (s === 'wrapup' ? 0 : s === 'practice' ? 2 : 1), 0);
/** Lessons before this day counted 用一用 as a star: they keep it, so his total (and a stars goal) never goes down. */
export const WRAPUP_NO_STAR_FROM = '2026-10-05';

/** His star total: each lesson's mastery stars (spec 2026-10-11 §5); a lesson from before them keeps the stars its steps earned. */
export function totalStars(sessions: SessionRecord[], bonusStars: number): number {
  return sessions.reduce((sum, s) => sum + (typeof s.stars === 'number' ? s.stars : s.date < WRAPUP_NO_STAR_FROM ? s.completedSteps.length : starsOf(s.completedSteps)), 0) + bonusStars;
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

export function troubleWords(logs: ReviewLog[], limit = 10, keep: (wordId: string) => boolean = (id) => !goneWord(id)): { wordId: string; misses: number }[] {
  const misses = new Map<string, number>();
  for (const l of logs) if (l.rating === Rating.Again && keep(l.wordId)) misses.set(l.wordId, (misses.get(l.wordId) ?? 0) + 1); // never a word the content dropped
  return [...misses]
    .map(([wordId, n]) => ({ wordId, misses: n }))
    .sort((a, b) => b.misses - a.misses || a.wordId.localeCompare(b.wordId))
    .slice(0, limit);
}

/** Cards due by the end of today, his active words' (the weekly list's readiness line, spec 2026-10-17 §8.3). */
export function dueToday(cards: CardRecord[], words: Word[], now: Date): number {
  const active = new Set(words.filter((w) => !w.paused).map((w) => w.id));
  const to = endOfLocalDay(now).getTime();
  return cards.filter((c) => active.has(c.wordId) && c.fsrs.due.getTime() <= to).length;
}

export function dueTomorrow(cards: CardRecord[], words: Word[], now: Date): number {
  const active = new Set(words.filter((w) => !w.paused).map((w) => w.id));
  const from = endOfLocalDay(now).getTime();
  const to = endOfLocalDay(addDays(now, 1)).getTime();
  return cards.filter((c) => active.has(c.wordId) && c.fsrs.due.getTime() > from && c.fsrs.due.getTime() <= to).length;
}

export interface WeekDay { label: string; date: string; done: boolean; today: boolean; rest: boolean; practised?: boolean }

/**
 * This week, Monday first: which days a (non-free) lesson was finished, the streak's rest day (休息日, spec 2026-10-11 §5), and
 * the days with only 考考自己 (`practised`, parent ruling 2026-10-17: active, never 休).
 */
export function weekDays(sessions: SessionRecord[], today: string, practisedOn: ReadonlySet<string> = new Set()): WeekDay[] {
  const done = new Set(sessions.filter((s) => s.completed && !s.free).map((s) => s.date));
  const rest = new Set(streakDays(sessions, today, practisedOn).rest);
  const day = parseDateKey(today);
  const monday = addDays(day, -((day.getDay() + 6) % 7));
  return [...'一二三四五六日'].map((label, i) => {
    const date = localDateKey(addDays(monday, i));
    return { label, date, done: done.has(date), today: date === today, rest: rest.has(date), practised: !done.has(date) && practisedOn.has(date) };
  });
}
