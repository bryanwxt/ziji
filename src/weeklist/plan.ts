// src/weeklist/plan.ts
// The new-word budget with a weekly list (weekly list spec 2026-10-17 §5): front-load the list, up to 12 a lesson from the first
// lesson, more (up to 20) only when that's the only way to teach it all before ready-by (parent rulings 2026-10-18); protect his
// class lane over the week, let catch-up yield; revision is never planned away. Pure: the planner and the parent's plan line both use it.
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import { bookLesson } from '../session/lanes';
import { PACE_MIN } from '../session/pace';
import { MAX_SENTENCE_CUE } from '../activities/flashcards/meaning';
import { hanChars } from '../content';
import { boundPair } from '../content/kidGloss';
import { bankFor, fillGap } from '../content/sentenceBank';
import { sentencesFor } from '../content/understand';
import { readingOf } from '../content/wordGate';
import { pairGloss } from '../practice/missNote';
import { mulberry32 } from '../lib/random';
import { listBoard } from '../practice/pairs';
import type { PracticeItem } from '../session/round';
import type { CardRecord, ListCard, WeekForm, WeekList, WeekPair, Word } from '../types';
import { daysBetween } from './dates';
import { fitStillGood, pairStillGood } from './fit';
import { itemStatus } from './match';
import { afterCheck, formsFor, isReady, notSolid } from './readiness';

export const CLOSE_AFTER_DAYS = 7;
export const HEADROOM = 2;
/**
 * List words one lesson front-loads (parent ruling 2026-10-18: learn the list early in the week, then class words and revision):
 * as many new list words as are left, up to 12. More only when that's the only way to teach every word before ready-by.
 */
export const MAX_FRONT_LOAD = 12;
/** The hard ceiling on one lesson's list words (parent ruling 2026-10-18): past it, the rest come after the check. */
export const MAX_LIST_LESSON = 20;

/** The old front-load rate (spec §5.1): pace + 2, never above the ceiling (unless his pace already is). */
export const paceRate = (pace: number, ceiling: number, headroom = HEADROOM) => Math.min(pace + headroom, Math.max(ceiling, pace));

/** About how much longer a lesson gets for each list word over pace + 2 (认新字's card and 练一练's extra time). */
export const LIST_WORD_MINUTES = 1;
/** How much longer any front-load lesson runs: 练一练's +2 minutes, with 写一写 never halved (parent ruling 2026-10-18). */
export const FRONT_LOAD_MINUTES = 2;

/**
 * One front-load lesson's list words (spec §5.1, parent rulings 2026-10-18), recomputed each day from what is left: `left` new list
 * words, `days` lesson days before ready-by counting today's. Front-loaded (up to 12) and deadline-safe (at least what's left
 * spread over the days), never over 20, never under `rate` (the old pace + 2), never more than are left. A skipped day raises the
 * days after it by itself.
 */
export function frontLoadTake(rate: number, left: number, days: number): number {
  if (left <= 0) return 0;
  const needPerDay = Math.ceil(left / Math.max(1, days));
  return Math.min(left, Math.max(rate, Math.min(MAX_LIST_LESSON, Math.max(Math.min(MAX_FRONT_LOAD, left), needPerDay))));
}

/** The front-load days as the planner will run them, a lesson a day from `from` to the day before ready-by; `late`: what's left. */
export function frontLoadDays(i: { rate: number; left: number; from: string; readyBy: string }): { days: { date: string; n: number }[]; late: number } {
  const days: { date: string; n: number }[] = [];
  let left = i.left;
  for (let d = i.from; d < i.readyBy && left > 0; d = localDateKey(addDays(parseDateKey(d), 1))) {
    const n = frontLoadTake(i.rate, left, daysBetween(d, i.readyBy));
    days.push({ date: d, n });
    left -= n;
  }
  return { days, late: left };
}

/**
 * The parent's plan line (spec §3.5): each front-load day's new words and about how long its lesson runs.
 * `lessonDone`: today's daily lesson is done (or under way, its plan made): the front-load starts tomorrow.
 */
export function frontLoadPreview(i: { pace: number; ceiling: number; sessionMinutes: number; newCount: number; today: string; readyBy: string; lessonDone: boolean }): { days: { date: string; n: number; minutes: number }[]; late: number } {
  const base = Math.max(1, paceRate(i.pace, i.ceiling));
  const from = i.lessonDone ? localDateKey(addDays(parseDateKey(i.today), 1)) : i.today;
  const { days, late } = frontLoadDays({ rate: base, left: i.newCount, from, readyBy: i.readyBy });
  return { days: days.map((d) => ({ ...d, minutes: i.sessionMinutes + FRONT_LOAD_MINUTES + Math.max(0, d.n - base) * LIST_WORD_MINUTES })), late };
}

/** Lists still running (not closed, up to 7 days after homework, decision 7), the earliest ready-by first. */
export function activeLists(lists: WeekList[], now: Date): WeekList[] {
  const today = localDateKey(now);
  return lists
    .filter((l) => !l.closedAt && daysBetween(l.homeworkDue, today) <= CLOSE_AFTER_DAYS)
    .sort((a, b) => a.readyBy.localeCompare(b.readyBy) || a.createdAt - b.createdAt);
}

/**
 * wordId → the list it counts for (decision 6, spec §10): the earliest list whose ready-by day hasn't passed, so a shared word is
 * the earlier list's until its ready-by and then the later one's; a word only on lists past their ready-by, the earliest of
 * those. Pass lists in activeLists order.
 */
export function listOwner(lists: WeekList[], now: Date): Map<string, WeekList> {
  const today = localDateKey(now);
  const out = new Map<string, WeekList>();
  for (const l of lists) if (today <= l.readyBy) for (const i of l.items) if (!out.has(i.wordId)) out.set(i.wordId, l);
  for (const l of lists) for (const i of l.items) if (!out.has(i.wordId)) out.set(i.wordId, l);
  return out;
}

export const isReadyByDay = (lists: WeekList[], now: Date) => lists.filter((l) => l.readyBy === localDateKey(now));

export interface ListBudget {
  listIds: string[]; // unlearned list words, in list order: the candidates for today's list quota
  listQuota: number; // list words today at most
  total: number; // all new words today
  frontLoad: boolean; // a day of list new words before ready-by: 练一练 +2 min, 写一写 as usual (§5.1, parent ruling 2026-10-18)
  schoolFirst: number; // his class lane's words before catch-up gets any (§5.3)
  classShort: number; // his class lane's words still unstarted on homework day at these numbers (best effort at his pace, §5.3): the parent's line shows it
}

/** The nearest homework day not yet behind, if any. */
const homeworkLeft = (lists: WeekList[], today: string): string | undefined => lists.map((l) => l.homeworkDue).filter((d) => d >= today).sort()[0];

/** Days from `a` to `b`, both counted (0 when b is before a). */
const daysIncl = (a: string, b: string) => Math.max(0, daysBetween(a, b) + 1);

export function listBudget(i: {
  lists: WeekList[]; cards: ReadonlyMap<string, CardRecord>; now: Date; pace: number; ceiling: number;
  ranOutYesterday: boolean; backlog: boolean; schoolNeed: number;
  /** the planner's new-word candidates (unstarted, not paused, still present): a list word outside it can't take a slot */
  candidates?: ReadonlySet<string>;
}): ListBudget {
  const today = localDateKey(i.now);
  const owner = listOwner(i.lists, i.now);
  // unlearned list words, in list order (earliest ready-by first). Each is taught by a deadline (parent report 2026-10-23: every
  // word before homework is due): its list's ready-by while that is ahead, then its homework day (the ready-by day and homework day
  // included). After homework day, while the list is still open (decision 7), they are leftovers at his pace.
  const listIds: string[] = [];
  let need = 0; // of them, words still to teach before a deadline
  let front: number | null = null; // lesson days to the nearest deadline, today's included
  for (const l of i.lists) {
    const fresh = l.items.filter((it) => owner.get(it.wordId) === l && itemStatus(it.wordId, i.cards) === 'new' && (!i.candidates || i.candidates.has(it.wordId))).map((it) => it.wordId);
    if (!fresh.length) continue;
    listIds.push(...fresh);
    const days = today < l.readyBy ? daysBetween(today, l.readyBy) : today <= l.homeworkDue ? daysIncl(today, l.homeworkDue) : null;
    if (days === null) continue;
    need += fresh.length;
    if (front === null || days < front) front = days;
  }
  const head = i.ranOutYesterday || i.backlog ? 0 : HEADROOM;
  const rate = paceRate(i.pace, i.ceiling, head);
  // his class lane (parent ruling 2026-10-23: clear both the list and his class's words by the end of the week): its unstarted
  // words spread evenly over the lesson days left to the nearest homework day, today's included, on top of the list, every day
  const homework = homeworkLeft(i.lists, today);
  const classTake = homework ? Math.ceil(i.schoolNeed / daysIncl(today, homework)) : 0;
  if (!need) {
    // nothing left before a deadline: his class lane first; list words left over (after homework) take his pace, or at most
    // PACE_MIN in a backlog (§5.1), which also holds his other new words
    const leftover = i.backlog ? Math.min(PACE_MIN, listIds.length) : Math.min(listIds.length, Math.max(0, i.pace - classTake));
    const total = i.backlog ? leftover + classTake : Math.max(i.pace, classTake + leftover);
    return { listIds, listQuota: leftover, total, frontLoad: false, schoolFirst: classTake, classShort: 0 };
  }
  // a front-load day (parent rulings 2026-10-18): the list up to 12, more when the days left before ready-by need it (up to 20).
  // Run-outs and a backlog never cut it (parent report 2026-10-23: two run-outs, which 12 list words make likely, had spilled it to
  // pace − 1, 3–4 a day): the lesson runs longer, 练一练 keeps what's left for tomorrow. Today's lesson is one of the days left.
  const days = Math.max(1, front!);
  const take = (left: number, days: number) => frontLoadTake(rate, left, days);
  const quota = Math.min(listIds.length, take(need, days));
  const schoolFirst = classTake;
  const total = Math.max(rate, quota + schoolFirst);
  return { listIds, listQuota: quota, total, frontLoad: quota > 0, schoolFirst, classShort: 0 };
}

/** His class lane's unstarted words: his class lesson and the one before (spec §5.3, as pickNewWords' school pool). */
export function schoolNeed(
  words: { id: string; text: string }[], started: ReadonlySet<string>, classAt: number | null,
  lessonOf: (w: { id: string; text: string }) => number | undefined = bookLesson,
): number {
  if (classAt === null) return 0;
  return words.filter((w) => { const at = lessonOf(w); return !started.has(w.id) && (at === classAt || at === classAt - 1); }).length;
}


/** Re-teaching cards in one lesson at most (spec §2.1). */
export const MAX_RETEACH = 6;

/**
 * The pair a list verb is taught through (spec §7.2): a single character that is the left half of a pair on an active list, the
 * first on the page. A bound character (kidGloss.ts: 番 → 番茄) keeps its own pair, so it leads with none here.
 */
export function leadPair(word: Word, lists: WeekList[]): WeekPair | null {
  if (Array.from(word.text).length !== 1 || boundPair(word.text)) return null;
  for (const l of lists) {
    const p = l.pairs.find((x) => x.left === word.text);
    if (p) return p;
  }
  return null;
}

/**
 * What the 认新词 card shows for a list word (spec §7.1–7.2). A verb with a pair: the pair, at its reading, the verb marked, the
 * pair's English. Any other word: one short example sentence (his class sentence, the school file, the bank's first gap; at most
 * MAX_SENTENCE_CUE), and its first unbegun character marked when it has more than one.
 */
export function listCardFor(word: Word, lists: WeekList[], begun: ReadonlySet<string>): ListCard {
  const pair = leadPair(word, lists);
  if (pair) {
    const lead = pair.left + pair.right;
    const gloss = pairGloss(pair.left, pair.right);
    return { lead, leadReading: pair.reading ?? readingOf(lead), ...(gloss ? { leadGloss: gloss } : {}), mark: [0, Array.from(pair.left).length] };
  }
  const chars = Array.from(word.text);
  const at = chars.findIndex((c) => !begun.has(c));
  const ok = (s: string) => s.includes(word.text) && Array.from(s).length <= MAX_SENTENCE_CUE;
  const cls = (word.sentences ?? []).find((s) => ok(s.text));
  const school = sentencesFor(word.text).find((s) => ok(s.zh));
  const bank = bankFor(word.text);
  const filled = bank ? fillGap(bank.gaps[0], word.text) : undefined;
  const text = cls?.text ?? school?.zh ?? (filled && ok(filled) ? filled : undefined);
  const pinyin = cls?.pinyin && cls.pinyin.trim().split(/\s+/).length === hanChars(cls.text).length ? cls.pinyin : text ? readingOf(text) : '';
  return {
    ...(text ? { example: { text, pinyin } } : {}),
    ...(chars.length > 1 && at >= 0 ? { mark: [at, 1] as [number, number] } : {}),
  };
}

/**
 * Not-solid items whose card 认新字 shows again (spec §2.1): the next lesson day after a miss — a skipped day keeps it (fix round
 * 2026-10-17) — and never again until a miss after it was re-taught. Missed in the check first, then the oldest last answer; at
 * most `cap`.
 */
export function reteachIds(lists: WeekList[], now: Date, cap = MAX_RETEACH): string[] {
  const today = localDateKey(now);
  const inCheck: string[] = [];
  const later: string[] = [];
  for (const l of lists) {
    for (const it of notSolid(l, now)) {
      if (!it.missedOn || it.missedOn >= today || it.missedOn <= (it.reteachedOn ?? '') || inCheck.includes(it.wordId) || later.includes(it.wordId)) continue;
      (l.check?.results[it.wordId]?.correct === false ? inCheck : later).push(it.wordId);
    }
  }
  return [...inCheck, ...later].slice(0, cap);
}

/** Boost items in one lesson at most (spec §6.4), and reserved items (§2.1). */
export const MAX_BOOST = 6;
export const MAX_RESERVED = 8;
const ASK_OF: Record<WeekForm, PracticeItem['ask']> = { read: 'read', meaning: 'meaningRead', fit: 'fit', dapei: 'match' };

/**
 * The list's items for today's 练一练 (spec §6.4, §2.1, §8.2), reserved first, then boost:
 * - before the check, one boost item for each begun word that isn't ready;
 * - after it, one reserved item for each item not yet solid (at most MAX_RESERVED, the oldest last answer first);
 * - none on the ready-by day before the check is done (the check asks them).
 * The form: the one it missed the day before (after the check), else the weakest — never answered, then last answered wrong, in
 * read → meaning → 选词填空 → 搭配 order, then rotating. A 选词填空 or 搭配 row is asked only while it is still guess-proof
 * (fitStillGood, pairStillGood). Pair items of one list that make a board (listBoard) become one 连一连 item.
 */
export function listPracticeItems(lists: WeekList[], words: ReadonlyMap<string, Word>, now: Date, begunIds: ReadonlySet<string>): PracticeItem[] {
  const owner = listOwner(lists, now);
  const day = localDateKey(now);
  const yesterday = localDateKey(addDays(now, -1));
  const reserved: PracticeItem[] = [];
  const boost: PracticeItem[] = [];
  for (const l of lists) {
    if (day === l.readyBy && !l.check?.done) continue; // the check asks them today
    const after = afterCheck(l, now);
    const texts = new Set(l.items.map((i) => i.text));
    const pool = after ? notSolid(l, now) : l.items.filter((it) => begunIds.has(it.wordId) && !isReady(it, l, words.get(it.wordId)));
    for (const it of pool) {
      const word = words.get(it.wordId);
      if (owner.get(it.wordId) !== l || !word || word.paused) continue;
      const fit = l.fits.find((f) => f.wordId === it.wordId && fitStillGood(f, it.text, texts));
      const pair = l.pairs.find((p) => p.left === it.text && pairStillGood(p)) ?? l.pairs.find((p) => p.right === it.text && pairStillGood(p));
      const forms = formsFor(it, l, word).filter((f) => (f !== 'fit' || !!fit) && (f !== 'dapei' || !!pair));
      const checked = l.check?.results[it.wordId];
      const missed = after && checked?.correct === false && it.missedOn === yesterday && forms.includes(checked.form) ? checked.form : undefined;
      const weakest = forms.find((f) => !it.last?.[f]) ?? forms.find((f) => it.last?.[f]?.correct === false) ?? forms[(it.rightDays?.length ?? 0) % forms.length]!;
      const form = missed ?? weakest;
      const x: PracticeItem = {
        wordId: it.wordId, rung: form === 'read' || form === 'meaning' ? 1 : 2, ask: ASK_OF[form], grades: null, retry: false,
        list: { listId: l.id, form, ...(form === 'dapei' && pair ? { pair } : {}), ...(form === 'fit' && fit ? { fit } : {}), ...(after ? { reserved: true as const } : {}) },
      };
      (after ? reserved : boost).push(x);
    }
  }
  return [...boards(reserved).slice(0, MAX_RESERVED), ...boards(boost)];
}

/** 搭配 items of one list whose pairs make a 连一连 board (spec §7.5): one board item in place of them, where the first of them was. */
function boards(xs: PracticeItem[]): PracticeItem[] {
  let out = [...xs];
  for (;;) {
    const byList = new Map<string, PracticeItem[]>();
    for (const x of out) if (x.list?.pair) byList.set(x.list.listId, [...(byList.get(x.list.listId) ?? []), x]);
    let made = false;
    for (const group of byList.values()) {
      const pairs = [...new Map(group.map((x) => [`${x.list!.pair!.left}|${x.list!.pair!.right}`, x.list!.pair!])).values()];
      if (pairs.length < 3) continue;
      const b = listBoard(pairs, mulberry32(7));
      if (!b) continue;
      const on = new Set(b.pairs.map(([l, r]) => `${l}|${r}`));
      const taken = group.filter((x) => on.has(`${x.list!.pair!.left}|${x.list!.pair!.right}`));
      const first = taken[0]!;
      const { pair: _one, ...ask } = first.list!;
      const board: PracticeItem = { ...first, list: { ...ask, pairs: pairs.filter((p) => on.has(`${p.left}|${p.right}`)) } };
      out = out.flatMap((x) => (x === first ? [board] : taken.includes(x) ? [] : [x]));
      made = true;
    }
    if (!made) return out;
  }
}
