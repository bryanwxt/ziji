// src/weeklist/answers.ts
// Every answer on a list word (lessons and the check) updates its item (weekly list spec 2026-10-17 §8.3, §2.1).
import { localDateKey } from '../lib/date';
import type { Ask } from '../session/round';
import type { AppDb } from '../store/db';
import type { WeekForm, WeekList } from '../types';
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
  const day = localDateKey(now);
  const tx = db.transaction('weekLists', 'readwrite');
  const store = tx.objectStore('weekLists');
  const lists = activeLists(await store.getAll(), now);
  const out: WeekList[] = [];
  for (const l of lists) {
    let changed = false;
    const after = pastCheck(l, day);
    const items = l.items.map((it) => {
      if (it.wordId !== wordId) return it;
      changed = true;
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
}
