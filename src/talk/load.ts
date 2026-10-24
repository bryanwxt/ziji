// What the talk picker needs from the stores (parent loop spec §4, 2026-10-18 update), and today's three kept in settings so
// Today shows the same cards all day.
import { PASSAGES } from '../content';
import { cardMeaning } from '../content/glossary';
import { ladderWordsBesides } from '../content/ladder';
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import { BLANK } from '../content/sentenceBank';
import { addDays, localDateKey, startOfLocalDay } from '../lib/date';
import { introducedNewWords } from '../session/runner';
import type { AppDb } from '../store/db';
import { allSessions, allWeekLists, allWords, getKid, getSettings, listParentPassages, updateSettings } from '../store/repo';
import type { Settings, TalkSlot, Word } from '../types';
import { sentenceFor } from '../weeklist/fit';
import { activeLists } from '../weeklist/plan';
import { isReady } from '../weeklist/readiness';
import { followPassage, markSeen, pickDay, swapCard, type PickInput, type TalkPassage, type TalkWord } from './pick';

/** His new class words: introduced in his lessons over this many days, today included. */
export const NEW_WORD_DAYS = 7;
/** Today's passage: the one read most recently, today or yesterday. */
export const READ_RECENT_DAYS = 2;

/** A word as its starter needs it: the first sense of its English, a sentence that uses it (`example`, else its own), its 组词. */
export function talkWord(w: Word | { text: string }, from: TalkWord['from'], example?: string): TalkWord {
  const word = 'id' in w ? w : null; // a list item whose word is gone keeps its text only
  const gloss = word ? cardMeaning(word)?.split(/[;；,]/)[0]?.trim() : undefined;
  const fit = word && !example ? sentenceFor(word) : null;
  const sentence = example ?? (fit ? fit.text.replace(BLANK, w.text) : undefined);
  const zuci = (word?.examples ?? []).map((e) => e.text).filter((t) => t !== w.text).slice(0, 3);
  return { text: w.text, ...(gloss ? { gloss } : {}), ...(sentence ? { example: sentence } : {}), zuci, from };
}

/** His words, best first (2026-10-18 update): this week's list words (lists whose homework day isn't behind; items not ready
 *  first, in list order; a confirmed 选词填空 row is the example), then the new words his lessons introduced in NEW_WORD_DAYS,
 *  the newest lesson first, his class's lane before catch-up. Each word once. */
export async function talkWords(db: AppDb, now: Date): Promise<TalkWord[]> {
  const today = localDateKey(now);
  const [stored, lists, sessions] = await Promise.all([allWords(db), allWeekLists(db), allSessions(db)]);
  const byId = new Map([...stored, ...ladderWordsBesides(stored)].map((w) => [w.id, w]));
  const out: TalkWord[] = [];
  const have = new Set<string>();
  const add = (t: TalkWord) => { if (!have.has(t.text)) { have.add(t.text); out.push(t); } };
  for (const l of activeLists(lists, now).filter((x) => today <= x.homeworkDue)) {
    const ready = (i: (typeof l.items)[number]) => Number(isReady(i, l, byId.get(i.wordId)));
    for (const i of [...l.items].sort((a, b) => ready(a) - ready(b))) {
      const fit = l.fits.find((f) => f.wordId === i.wordId);
      add(talkWord(byId.get(i.wordId) ?? { text: i.text }, 'list', fit ? fit.sentence.replace(BLANK, i.text) : undefined));
    }
  }
  const since = localDateKey(addDays(startOfLocalDay(now), -(NEW_WORD_DAYS - 1)));
  const lessons = sessions.filter((s) => !s.free && s.date >= since && s.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  for (const s of lessons) {
    const lane = (id: string) => s.plan.newWordLanes?.[id];
    const met = introducedNewWords(s).filter((id) => lane(id) !== 'list');
    for (const id of [...met.filter((id) => lane(id) === 'school'), ...met.filter((id) => lane(id) !== 'school')]) {
      const w = byId.get(id);
      if (w) add(talkWord(w, 'class'));
    }
  }
  return out;
}

/** Today's 朗读 passage (2026-10-18 update): with 朗读 on, the one he read most recently, today or yesterday; a parent text or
 *  a built-in, with its questions. */
export async function todaysPassage(db: AppDb, settings: Settings, now: Date): Promise<TalkPassage | null> {
  if (!settings.langdu) return null;
  const kid = await getKid(db);
  if (!kid) return null;
  const today = localDateKey(now);
  const since = localDateKey(addDays(startOfLocalDay(now), -(READ_RECENT_DAYS - 1)));
  const recent = Object.entries(kid.reading.history)
    .filter(([, e]) => !!e.lastRead && e.lastRead >= since && e.lastRead <= today)
    .sort(([a, x], [b, y]) => y.lastRead!.localeCompare(x.lastRead!) || a.localeCompare(b));
  const parent = await listParentPassages(db);
  for (const [id] of recent) {
    const own = parent.find((p) => p.id === id);
    if (own) return { id, title: own.title, questions: own.question ? [own.question] : [] };
    const built = PASSAGES.find((p) => p.id === id);
    if (built) return { id, title: built.title, questions: PASSAGE_QUESTIONS[id] ?? [] };
  }
  return null;
}

async function pickInput(db: AppDb, now: Date, settings: Settings): Promise<PickInput> {
  const [words, passage] = await Promise.all([talkWords(db, now), todaysPassage(db, settings, now)]);
  return { today: localDateKey(now), seen: settings.talkSeen ?? {}, words, passage };
}

async function keep(db: AppDb, settings: Settings, today: string, cards: TalkSlot[]): Promise<TalkSlot[]> {
  await updateSettings(db, { talkDay: { date: today, cards }, talkSeen: markSeen(settings.talkSeen ?? {}, cards, today) });
  return cards;
}

/** Today's three, in slot order (an empty slot is null): picked once a day and kept; the reading slot follows a passage read after they were picked. */
export async function todayTalk(db: AppDb, now: Date): Promise<TalkSlot[]> {
  const settings = await getSettings(db);
  const today = localDateKey(now);
  const input = await pickInput(db, now, settings);
  const stored = settings.talkDay?.date === today ? settings.talkDay.cards : null;
  const cards = stored ? followPassage(stored, input) : pickDay(input);
  if (stored && cards.length === stored.length && cards.every((c, i) => c?.id === stored[i]?.id)) return stored;
  return keep(db, settings, today, cards);
}

/** 「换一个」 on one card: the next of its kind, kept. */
export async function swapTalk(db: AppDb, now: Date, slot: number): Promise<TalkSlot[]> {
  const cards = await todayTalk(db, now);
  const settings = await getSettings(db);
  return keep(db, settings, localDateKey(now), swapCard(cards, slot, await pickInput(db, now, settings)));
}
