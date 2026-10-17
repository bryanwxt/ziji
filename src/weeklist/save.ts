// src/weeklist/save.ts
// Writes an approved draft (weekly list spec 2026-10-17 §3.5): new parent words, unpauses and the list, in one transaction.
// A stored word is referenced as it is; nothing about it changes except an unpause the parent ticked.
import { ladderWordsBesides } from '../content/ladder';
import { newId } from '../lib/id';
import type { AppDb } from '../store/db';
import type { WeekFit, WeekItem, WeekList, WeekPair, Word } from '../types';
import { itemStatus, matchText } from './match';

export interface ApprovedDraft {
  name: string;
  readyBy: string;
  homeworkDue: string;
  items: { text: string; from: WeekItem['from']; pinyin?: string; meaning?: string; unpause?: boolean }[];
  pairs: WeekPair[];
  fits: WeekFit[]; // wordId holds the item's text until saved
}

/** The open list this draft is again: the one being updated, or one with the same name and dates (a re-paste, a double tap). */
const sameList = (lists: WeekList[], draft: ApprovedDraft, update?: string) =>
  update ? lists.find((l) => l.id === update) : lists.find((l) => !l.closedAt && l.name === draft.name && l.readyBy === draft.readyBy && l.homeworkDue === draft.homeworkDue);

/**
 * Reads and writes in one readwrite transaction, so two saves at once (a double tap on Add) run one after the other and the
 * second finds the first's words and list: nothing is added twice.
 */
export async function saveWeekList(db: AppDb, draft: ApprovedDraft, now: Date, update?: string): Promise<WeekList> {
  const tx = db.transaction(['words', 'cards', 'weekLists'], 'readwrite');
  const [stored, cardList, lists] = await Promise.all([tx.objectStore('words').getAll(), tx.objectStore('cards').getAll(), tx.objectStore('weekLists').getAll()]);
  // from here to the puts nothing awaits, so the transaction stays open
  const byText = new Map<string, Word>([...stored, ...ladderWordsBesides(stored)].map((w) => [w.text, w]));
  const cards = new Map(cardList.map((c) => [c.id, c]));
  const old = sameList(lists, draft, update);
  const writes = new Map<string, Word>();
  const items: WeekItem[] = [...(old?.items ?? [])];
  for (const d of draft.items) {
    const m = matchText(d.text, byText, now.getTime());
    let word = m.word;
    if (m.kind === 'new') {
      const { meaning: auto, ...rest } = word;
      // the parent's meaning wins; one she cleared stays empty, never refilled from the glossary
      const meaning = 'meaning' in d ? d.meaning?.trim() : auto;
      word = { ...rest, listName: draft.name, ...(d.pinyin ? { pinyin: d.pinyin } : {}), ...(meaning ? { meaning } : {}) };
      writes.set(word.id, word);
      byText.set(word.text, word);
    } else if (m.kind === 'stored' && d.unpause && word.paused) {
      word = { ...word, paused: false };
      writes.set(word.id, word);
      byText.set(word.text, word);
    }
    if (!items.some((i) => i.wordId === word.id)) items.push({ wordId: word.id, text: d.text, from: d.from, addedStatus: itemStatus(word.id, cards) });
  }
  const newFits = draft.fits.map((f) => ({ ...f, wordId: byText.get(f.wordId)?.id ?? f.wordId }));
  const newPairs = draft.pairs.filter((p, i) => draft.pairs.findIndex((q) => q.left === p.left && q.right === p.right) === i);
  // a re-paste merges, as items do (final review 2026-10-17): pairs by left|right, fill-ins by word. An old one stays; one pasted
  // again takes the new wrong answers and keeps the answers he gave it (`last`)
  const key = (p: WeekPair) => `${p.left}|${p.right}`;
  const pastedPair = new Map(newPairs.map((p) => [key(p), p]));
  const pairs: WeekPair[] = [
    ...(old?.pairs ?? []).map((p) => { const n = pastedPair.get(key(p)); return n ? { ...n, ...(p.last ? { last: p.last } : {}) } : p; }),
    ...newPairs.filter((p) => !(old?.pairs ?? []).some((q) => key(q) === key(p))),
  ];
  const pastedFit = new Map(newFits.map((f) => [f.wordId, f]));
  const fits: WeekFit[] = [
    ...(old?.fits ?? []).map((f) => pastedFit.get(f.wordId) ?? f),
    ...newFits.filter((f) => !(old?.fits ?? []).some((q) => q.wordId === f.wordId)),
  ];
  const list: WeekList = {
    id: old?.id ?? `wl:${newId()}`, name: draft.name, createdAt: old?.createdAt ?? now.getTime(),
    readyBy: draft.readyBy, homeworkDue: draft.homeworkDue, items, pairs, fits, ...(old?.check ? { check: old.check } : {}),
  };
  await Promise.all([...[...writes.values()].map((w) => tx.objectStore('words').put(w)), tx.objectStore('weekLists').put(list), tx.done]);
  return list;
}
