// src/weeklist/listMeanings.ts
// English for weekly list words saved without it (parent 2026-10-18: "共用 meaning is not showing": the English field was
// optional, and 共用, 扁豆, 鸡翅… had no kid gloss then). Once, on the next open, a missing meaning takes the word's kid gloss
// (bundled); the 本周词语 panel offers the rest from CC-CEDICT (cedictGlosses.ts) in one tap. A meaning is the parent's to edit.
import { kidGloss } from '../content/kidGloss';
import type { AppDb } from '../store/db';
import { allWeekLists, allWords, getSettings, putWords, updateSettings } from '../store/repo';
import type { WeekList, Word } from '../types';
import { activeLists } from './plan';

/** The parent words on lists still running that have no English of their own, once each, in list order. */
export function missingEnglish(lists: WeekList[], words: readonly Word[], now: Date): Word[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  const out = new Map<string, Word>();
  for (const l of activeLists(lists, now)) for (const it of l.items) {
    const w = byId.get(it.wordId);
    if (w && w.source === 'parent' && !w.meaning?.trim()) out.set(w.id, w);
  }
  return [...out.values()];
}

/** Writes each word's English from `english` (word text → English); returns how many took one. */
export async function fillMeanings(db: AppDb, words: readonly Word[], english: ReadonlyMap<string, string>): Promise<number> {
  const filled = words.flatMap((w) => { const e = english.get(w.text)?.trim(); return e && !w.meaning?.trim() ? [{ ...w, meaning: e }] : []; });
  if (filled.length) await putWords(db, filled);
  return filled.length;
}

/** Once per install: the active lists' words without English take their kid gloss. Returns how many did. */
export async function fillListMeaningsOnce(db: AppDb, now: Date): Promise<number> {
  if ((await getSettings(db)).listMeaningsFilled) return 0;
  const missing = missingEnglish(await allWeekLists(db), await allWords(db), now);
  const n = await fillMeanings(db, missing, new Map(missing.flatMap((w) => { const g = kidGloss(w.text); return g ? [[w.text, g] as const] : []; })));
  await updateSettings(db, { listMeaningsFilled: true });
  return n;
}
