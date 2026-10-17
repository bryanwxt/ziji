// src/weeklist/schedule.ts
// Reviews pinned to the ready-by day (weekly list spec 2026-10-17 §6.2) and quick checks for words he knows (§6.1).
import { addDays, localDateKey, parseDateKey, startOfLocalDay } from '../lib/date';
import type { AppDb } from '../store/db';
import { allCards, allWeekLists, putCards } from '../store/repo';
import type { CardKind, CardRecord, WeekList } from '../types';
import { itemStatus } from './match';
import { activeLists, listOwner } from './plan';

export const PINNED_KINDS: ReadonlySet<CardKind> = new Set<CardKind>(['recognise', 'hear', 'understand', 'meaning']);
/** A quick check goes on one of the first days of the list (§5.4: Mon–Tue); a short week checks them today. */
const QUICK_CHECK_DAYS = 2;

/**
 * A list word's reading or meaning card, reviewed before its list's ready-by day, is due no later than the start of that day
 * (the earliest, when it is on two lists), so the check grades it. Never earlier than FSRS put it; stability and state unchanged.
 */
export function pinDue(card: CardRecord, lists: WeekList[], reviewedAt: Date): CardRecord {
  if (!PINNED_KINDS.has(card.kind)) return card;
  const today = localDateKey(reviewedAt);
  const ready = lists
    .filter((l) => !l.closedAt && today < l.readyBy && l.items.some((i) => i.wordId === card.wordId))
    .map((l) => l.readyBy)
    .sort()[0];
  if (!ready) return card;
  const pin = parseDateKey(ready); // the start of the ready-by day, which is at least tomorrow
  return card.fsrs.due.getTime() > pin.getTime() ? { ...card, fsrs: { ...card.fsrs, due: pin } } : card;
}

/**
 * wordId → the day its reading card is brought forward to: a known or placed word due after the ready-by day starts (not already
 * due before it, nor checked and pinned to it), spread evenly over the front-load days. Nothing from the ready-by day on.
 */
export function quickCheckDates(list: WeekList, cards: ReadonlyMap<string, CardRecord>, now: Date): Map<string, Date> {
  const today = startOfLocalDay(now);
  const ready = parseDateKey(list.readyBy);
  if (today.getTime() >= ready.getTime()) return new Map(); // from the ready-by day the check asks them
  const days = Math.round((ready.getTime() - today.getTime()) / 86_400_000);
  const front = Math.min(QUICK_CHECK_DAYS, days);
  const todo = list.items.filter((i) => {
    const s = itemStatus(i.wordId, cards);
    const c = cards.get(`${i.wordId}:recognise`);
    // due after the ready-by day starts: never checked yet (a checked card is pinned to the start of that day, §6.2)
    return (s === 'known' || s === 'placed') && !!c && c.fsrs.due.getTime() > ready.getTime();
  });
  const out = new Map<string, Date>();
  todo.forEach((i, k) => out.set(i.wordId, addDays(today, Math.floor((k * front) / todo.length))));
  return out;
}

/** Brings each active list's quick checks forward (never later) before a plan is made; a word is its earlier list's. */
export async function applyQuickChecks(db: AppDb, now: Date): Promise<void> {
  const lists = activeLists(await allWeekLists(db), now);
  const before = lists.filter((l) => localDateKey(now) < l.readyBy);
  if (!before.length) return;
  const cards = new Map((await allCards(db)).map((c) => [c.id, c]));
  const owner = listOwner(lists);
  const moved: CardRecord[] = [];
  for (const l of before) for (const [wordId, day] of quickCheckDates(l, cards, now)) {
    if (owner.get(wordId) !== l) continue;
    const c = cards.get(`${wordId}:recognise`)!;
    if (c.fsrs.due.getTime() > day.getTime()) moved.push({ ...c, fsrs: { ...c.fsrs, due: day } });
  }
  if (moved.length) await putCards(db, moved);
}
