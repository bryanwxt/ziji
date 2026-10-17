// src/weeklist/save.ts
// Writes an approved draft (weekly list spec 2026-10-17 §3.5): new parent words, unpauses and the list, in one transaction.
// A stored word is referenced as it is; nothing about it changes except an unpause the parent ticked.
import { ladderWordsBesides } from '../content/ladder';
import { newId } from '../lib/id';
import type { AppDb } from '../store/db';
import { allCards, allWords, getWeekList } from '../store/repo';
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

export async function saveWeekList(db: AppDb, draft: ApprovedDraft, now: Date, update?: string): Promise<WeekList> {
  const stored = await allWords(db);
  const byText = new Map<string, Word>([...stored, ...ladderWordsBesides(stored)].map((w) => [w.text, w]));
  const cards = new Map((await allCards(db)).map((c) => [c.id, c]));
  const old = update ? await getWeekList(db, update) : undefined;
  const writes: Word[] = [];
  const items: WeekItem[] = [...(old?.items ?? [])];
  for (const d of draft.items) {
    const m = matchText(d.text, byText, now.getTime());
    let word = m.word;
    if (m.kind === 'new') {
      word = { ...word, listName: draft.name, ...(d.pinyin ? { pinyin: d.pinyin } : {}), ...(d.meaning ? { meaning: d.meaning } : {}) };
      writes.push(word);
      byText.set(word.text, word);
    } else if (m.kind === 'stored' && d.unpause && word.paused) writes.push({ ...word, paused: false });
    if (!items.some((i) => i.wordId === word.id)) items.push({ wordId: word.id, text: d.text, from: d.from, addedStatus: itemStatus(word.id, cards) });
  }
  const fits = draft.fits.map((f) => ({ ...f, wordId: byText.get(f.wordId)?.id ?? f.wordId }));
  const list: WeekList = {
    id: old?.id ?? `wl:${newId()}`, name: draft.name, createdAt: old?.createdAt ?? now.getTime(),
    readyBy: draft.readyBy, homeworkDue: draft.homeworkDue, items, pairs: draft.pairs, fits, ...(old?.check ? { check: old.check } : {}),
  };
  const tx = db.transaction(['words', 'weekLists'], 'readwrite');
  await Promise.all([...writes.map((w) => tx.objectStore('words').put(w)), tx.objectStore('weekLists').put(list), tx.done]);
  return list;
}
