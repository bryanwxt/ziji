import { pinyin } from 'pinyin-pro';
import { makeParentWords } from '../content/parseWordList';
import type { AppDb } from '../store/db';
import { allWords, listParentPassages, putWords, saveParentPassage } from '../store/repo';
import type { Word } from '../types';
import type { ImportDraft } from './parse';

export interface ImportSummary { added: number; promoted: number; duplicates: string[]; sentences: number; passages: number; pairs: number }

const py = (t: string) => pinyin(t, { type: 'array' }).join(' ');
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** Saves an approved draft on the iPad: words as a school list, then pairings, sentences and passages. Re-importing adds nothing twice. */
export async function applyImport(db: AppDb, draft: ImportDraft, opts: { listName: string; writeable: boolean; now: number }): Promise<ImportSummary> {
  const parsed = [...draft.words, ...draft.idioms].map((w) => ({ text: w.text, pinyin: py(w.text) }));
  const { added, promoted, duplicates } = makeParentWords(parsed, { listName: opts.listName, writeable: opts.writeable, existing: await allWords(db), now: opts.now });
  const idioms = new Set(draft.idioms.map((w) => w.text));
  for (const w of added) if (idioms.has(w.text)) w.tags = uniq([...(w.tags ?? []), '成语']);
  await putWords(db, [...added, ...promoted]);

  const byText = new Map((await allWords(db)).map((w) => [w.text, w]));
  const changed = new Map<string, Word>();
  const edit = (w: Word) => changed.get(w.id) ?? w;
  let pairCount = 0;
  for (const [a, b] of draft.pairs) {
    const wa = byText.get(a);
    const wb = byText.get(b);
    if (wa) { const w = edit(wa); changed.set(w.id, { ...w, pairs: uniq([...(w.pairs ?? []), b]) }); }
    if (wb) { const w = edit(wb); changed.set(w.id, { ...w, pairs: uniq([...(w.pairs ?? []), a]) }); }
    if (wa || wb) pairCount++;
  }
  let sentenceCount = 0;
  for (const s of draft.sentences) {
    let used = false;
    for (const w of byText.values()) {
      if (Array.from(w.text).length < 2 || !s.includes(w.text)) continue; // single characters get 组词, not sentences
      const cur = edit(w);
      if ((cur.sentences ?? []).some((x) => x.text === s)) continue;
      changed.set(cur.id, { ...cur, sentences: [...(cur.sentences ?? []), { text: s, pinyin: py(s) }] });
      used = true;
    }
    if (used) sentenceCount++;
  }
  await putWords(db, [...changed.values()]);

  const existing = new Set((await listParentPassages(db)).map((p) => p.text));
  let passageCount = 0;
  for (const [i, text] of draft.passages.entries()) {
    if (existing.has(text)) continue;
    await saveParentPassage(db, { id: `pp:${opts.now}-${i}`, title: `${draft.title ?? opts.listName} 朗读${draft.passages.length > 1 ? ` ${i + 1}` : ''}`, text, createdAt: opts.now + i });
    passageCount++;
  }
  return { added: added.length, promoted: promoted.length, duplicates, sentences: sentenceCount, passages: passageCount, pairs: pairCount };
}
