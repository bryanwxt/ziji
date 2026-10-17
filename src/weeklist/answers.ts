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
/** `echo`: given right after its card (认新字, or the day it was re-taught): updates `last`, never counts as learned (fix round
 *  2026-10-17); a set names the words that are echoes. `reteach`: the answer to its re-teaching card. */
export interface NoteOpts { echo?: boolean | ReadonlySet<string>; reteach?: boolean }

export async function noteListAnswer(db: AppDb, wordId: string, form: WeekForm, correct: boolean, now: Date, pair?: { left: string; right: string }, opts: NoteOpts = {}): Promise<void> {
  await note(db, (it) => it.wordId === wordId, form, correct, now, pair, undefined, opts);
}

/**
 * A 搭配 question or one pair of a 连一连 board on a list (spec §7.5): the pair is marked, and each half that is an item on that
 * list gets the 搭配 answer. Returns the left half's word id (its meaning card is the one 搭配 rates), if it is an item.
 */
export async function noteListPairAnswer(db: AppDb, listId: string, pair: { left: string; right: string }, correct: boolean, now: Date, opts: NoteOpts = {}): Promise<string | undefined> {
  const noted = await note(db, (it, l) => l.id === listId && (it.text === pair.left || it.text === pair.right), 'dapei', correct, now, pair, listId, opts);
  return noted.find((it) => it.text === pair.left)?.wordId;
}

async function note(db: AppDb, mine: (it: WeekItem, l: WeekList) => boolean, form: WeekForm, correct: boolean, now: Date, pair?: { left: string; right: string }, only?: string, { echo = false, reteach = false }: NoteOpts = {}): Promise<WeekItem[]> {
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
      const isEcho = typeof echo === 'boolean' ? echo : echo.has(it.wordId);
      const next: WeekItem = { ...it, last: { ...it.last, [form]: { at: now.getTime(), correct, ...(isEcho ? { echo: true as const } : {}) } }, ...(reteach && correct ? { reteachedOn: day } : {}) };
      if (!after) return next;
      if (!correct) { const { reteachedOn: _r, ...rest } = next; return { ...rest, missedOn: day, rightDays: [] }; } // a miss resets, echo or not
      if (isEcho || day === it.missedOn) return next; // right after its card, or again on the day of a miss: not a day of its own (§2.1)
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
