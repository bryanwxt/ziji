// src/weeklist/answers.ts
// Every answer on a list word (lessons and the check) updates its item (weekly list spec 2026-10-17 §8.3, §2.1).
import { localDateKey } from '../lib/date';
import type { Ask } from '../session/round';
import type { AppDb } from '../store/db';
import type { WeekForm, WeekItem, WeekList } from '../types';
import { activeLists } from './plan';

/** The list form a practice ask tests, or null for one that doesn't count toward readiness. */
export function formOf(ask: Ask): WeekForm | null {
  if (ask === 'read' || ask === 'listen') return 'read';
  if (ask === 'meaningRead' || ask === 'hear') return 'meaning';
  if (ask === 'fit') return 'fit';
  if (ask === 'match') return 'dapei';
  return null;
}

/** After the check has begun (or its day has passed), answers count toward solid (§2.1). */
const pastCheck = (l: WeekList, day: string) => day > l.readyBy || !!l.check;

/**
 * Notes the answer on every active list the word is on: the latest per form; after the check, a miss sets `missedOn` and clears
 * the right days, a right answer adds its day. A pair answer also marks the pair. One readwrite transaction, so answers given
 * close together never overwrite each other.
 */
export async function noteListAnswer(db: AppDb, wordId: string, form: WeekForm, correct: boolean, now: Date, pair?: { left: string; right: string }): Promise<void> {
  await note(db, (it) => it.wordId === wordId, form, correct, now, pair);
}

/**
 * A 搭配 question or one pair of a 连一连 board on a list (spec §7.5): the pair is marked, and each half that is an item on that
 * list gets the 搭配 answer. Returns the left half's word id (its meaning card is the one 搭配 rates), if it is an item.
 */
export async function noteListPairAnswer(db: AppDb, listId: string, pair: { left: string; right: string }, correct: boolean, now: Date): Promise<string | undefined> {
  const noted = await note(db, (it, l) => l.id === listId && (it.text === pair.left || it.text === pair.right), 'dapei', correct, now, pair, listId);
  return noted.find((it) => it.text === pair.left)?.wordId;
}

async function note(db: AppDb, mine: (it: WeekItem, l: WeekList) => boolean, form: WeekForm, correct: boolean, now: Date, pair?: { left: string; right: string }, only?: string): Promise<WeekItem[]> {
  const day = localDateKey(now);
  const noted: WeekItem[] = [];
  const tx = db.transaction('weekLists', 'readwrite');
  const store = tx.objectStore('weekLists');
  const lists = activeLists(await store.getAll(), now);
  const out: WeekList[] = [];
  for (const l of lists) {
    if (only && l.id !== only) continue;
    let changed = false;
    const after = pastCheck(l, day);
    const items = l.items.map((it) => {
      if (!mine(it, l)) return it;
      changed = true;
      noted.push(it);
      const next = { ...it, last: { ...it.last, [form]: { at: now.getTime(), correct } } };
      if (!after) return next;
      if (!correct) return { ...next, missedOn: day, rightDays: [] };
      if (day === it.missedOn) return next; // right again on the day of a miss: not a day of its own (§2.1)
      return { ...next, rightDays: [...new Set([...(it.rightDays ?? []), day])] };
    });
    const pairs = pair
      ? l.pairs.map((p) => {
        if (p.left !== pair.left || p.right !== pair.right) return p;
        changed = true;
        return { ...p, last: { at: now.getTime(), correct } };
      })
      : l.pairs;
    if (changed) out.push({ ...l, items, pairs });
  }
  await Promise.all([...out.map((l) => store.put(l)), tx.done]);
  return noted;
}
