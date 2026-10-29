// The week for the parent (parent loop spec §5, 2026-10-18 update): Monday to Sunday, the family's talk time next to his app
// progress, and one focus line for next week. Pure: weekLoad.ts reads the stores.
import { THEME_EN, THEME_LABEL } from '../content/talkPrompts';
import { addDays, localDateKey, parseDateKey, startOfLocalDay } from '../lib/date';
import { readHow } from '../langdu/history';
import { introducedNewWords } from '../session/runner';
import { troubleWords } from '../stats/stats';
import type { CardRecord, Recording, ReviewLog, SessionRecord, TalkLog } from '../types';
import { themeForWords } from './pick';

/** Monday to Sunday: its first and last day keys, and [start, end) in ms. */
export interface WeekRange { from: string; to: string; start: number; end: number }

/** The week holding `now`, or `back` weeks before it. */
export function weekRange(now: Date, back = 0): WeekRange {
  const day = startOfLocalDay(now);
  const monday = addDays(day, -((day.getDay() + 6) % 7) - 7 * back);
  const next = addDays(monday, 7);
  return { from: localDateKey(monday), to: localDateKey(addDays(monday, 6)), start: monday.getTime(), end: next.getTime() };
}

export interface TalkTotals { days: number; minutes: number; times: number }

/** Talks in [start, end): the days with one, the minutes picked (none counts 0), and how many. */
export function talkTotals(talks: readonly TalkLog[], start: number, end: number): TalkTotals {
  const inside = talks.filter((t) => t.at >= start && t.at < end);
  return { days: new Set(inside.map((t) => localDateKey(new Date(t.at)))).size, minutes: inside.reduce((n, t) => n + (t.minutes ?? 0), 0), times: inside.length };
}

/** The last day a talk was logged; null when none ever was. */
export const lastTalkDay = (talks: readonly TalkLog[]): string | null =>
  talks.length ? localDateKey(new Date(talks.reduce((m, t) => Math.max(m, t.at), -Infinity))) : null;

const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '19 Oct': the same on every iPad (not the locale's). */
export const shortDate = (key: string) => { const d = parseDateKey(key); return `${d.getDate()} ${EN_MONTHS[d.getMonth()]}`; };

/** Days from one key to another. */
const between = (a: string, b: string) => Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);

/** The gentle note when nothing was logged today or yesterday (spec §5): its weekday within six days, its date beyond. */
export function talkNudge(talks: readonly TalkLog[], now: Date): string | null {
  const last = lastTalkDay(talks);
  if (!last) return 'No talk logged yet.';
  const gap = between(last, localDateKey(now));
  if (gap < 2) return null;
  return `No talk logged since ${gap <= 6 ? EN_DAYS[parseDateKey(last).getDay()] : shortDate(last)}.`;
}

/** A passage read with a take this week, and how he did on its question (its newest take's answer; null: no answer kept). */
export interface WeekReading { passageId: string; title: string; meaning: 'right' | 'missed' | null }

export interface WeekSummary {
  talk: TalkTotals;
  lessons: number; // completed lessons (not free play)
  langduDays: number; // days whose lesson reached its 朗读 step, finished or not (one session a day), so it can exceed `lessons`
  newly: { read: string[]; write: string[]; say: string[] }; // newly passed this week
  newWords: string[]; // introduced by his lessons this week
  shaky: string[]; // up to 5 missed most this week, all card kinds
  reading: WeekReading[];
  waiting: number; // takes waiting in Listen & confirm now
  focus: { zh: string; en: string };
}

export interface WeekInput {
  range: WeekRange;
  talks: readonly TalkLog[];
  sessions: readonly SessionRecord[];
  cards: readonly CardRecord[];
  logs: readonly ReviewLog[];
  recordings: readonly Recording[];
  textOf: (wordId: string) => string | undefined;
  titleOf: (passageId: string) => string | undefined;
  waiting: number;
}

export const SHAKY_MAX = 5;

const texts = (ids: readonly string[], textOf: WeekInput['textOf']) => [...new Set(ids.map(textOf).filter((t): t is string => !!t))];

export function summarizeWeek(i: WeekInput): WeekSummary {
  const { range } = i;
  const inWeek = (ms: number) => ms >= range.start && ms < range.end;
  const lessons = i.sessions.filter((s) => !s.free && s.date >= range.from && s.date <= range.to);
  const passed = (kind: CardRecord['kind']) => texts(i.cards.filter((c) => c.kind === kind && c.passed !== undefined && inWeek(c.passed)).map((c) => c.wordId), i.textOf);
  const takes = i.recordings
    .filter((r) => r.prompt.kind === 'passage' && !r.prompt.extra && inWeek(r.createdAt))
    .sort((a, b) => a.createdAt - b.createdAt);
  const newest = new Map<string, Recording>();
  for (const r of takes) newest.set((r.prompt as { passageId: string }).passageId, r);
  const reading = [...newest].map(([passageId, r]): WeekReading => ({
    // a read's questions (spec 2026-10-24 §5): 'right' when it was read well (2 of 3), else 'missed'; an older take's one question
    passageId, title: i.titleOf(passageId) ?? passageId, meaning: r.answers?.length ? (readHow({ extra: false, answers: r.answers }) === 'well' ? 'right' : 'missed') : r.meaning ? (r.meaning.correct ? 'right' : 'missed') : null,
  }));
  const base = {
    talk: talkTotals(i.talks, range.start, range.end),
    lessons: lessons.filter((s) => s.completed).length,
    langduDays: lessons.filter((s) => s.completedSteps.includes('speaking')).length, // 看图说话 is parked: the speaking step is 朗读; counted whether or not the lesson was finished
    newly: { read: passed('recognise'), write: passed('write'), say: passed('say') },
    newWords: texts(lessons.flatMap(introducedNewWords), i.textOf),
    shaky: texts(troubleWords(i.logs.filter((l) => inWeek(l.at)), SHAKY_MAX).map((t) => t.wordId), i.textOf),
    reading,
    waiting: i.waiting,
  };
  return { ...base, focus: focusLine(base) };
}

/** Fewer talk days than this in a week asks for more talk. */
export const TALK_DAYS_AIM = 3;

/**
 * One line for next week (spec §5), the first that applies: a 朗读 question missed → read it again together; words he missed →
 * talk about them, in the theme they lean to; fewer than 3 talk days → five minutes a day; new words → use them; else keep going.
 */
export function focusLine(s: Omit<WeekSummary, 'focus'>): { zh: string; en: string } {
  const missed = s.reading.find((r) => r.meaning === 'missed');
  if (missed) return {
    zh: `多读：孩子这周的朗读题答错了。和孩子再读一次《${missed.title}》，轮流读，读完问问孩子故事里发生了什么。`,
    en: `Read more: they missed the question on 《${missed.title}》 this week. Read it again together, taking turns, then ask what happened.`,
  };
  const about = (words: string[], zhWhat: string, enWhat: string) => {
    const list = words.slice(0, 3);
    const theme = themeForWords(list);
    return theme
      ? { zh: `多聊${THEME_LABEL[theme]}：${zhWhat}${list.join('、')}，聊天的时候多用一用。`, en: `Talk more about ${THEME_EN[theme]}: ${enWhat} ${list.join(', ')}. Use them in conversation.` }
      : { zh: `多用这些词聊天：${zhWhat}${list.join('、')}。`, en: `Use these in conversation: ${enWhat} ${list.join(', ')}.` };
  };
  if (s.shaky.length) return about(s.shaky, '这周常错的词是', 'the words they missed most were');
  if (s.talk.days < TALK_DAYS_AIM) return {
    zh: `多聊：这周聊了${s.talk.days}天。试试每天聊五分钟，吃饭的时候就可以。`,
    en: `Talk more: ${s.talk.days} day${s.talk.days === 1 ? '' : 's'} this week. Try five minutes a day; dinner is enough.`,
  };
  if (s.newWords.length) return about(s.newWords, '这周的新词有', "this week's new words are");
  return { zh: '这周很好！下周继续每天聊一聊。', en: 'A good week. Keep the daily talk going.' };
}
