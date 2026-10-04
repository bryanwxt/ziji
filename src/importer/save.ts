import { pinyin } from 'pinyin-pro';
import { HSK_WORDS } from '../content';
import { makeParentWords } from '../content/parseWordList';
import type { AppDb } from '../store/db';
import { allWords, listParentPassages, putWords, saveParentPassage } from '../store/repo';
import type { Word } from '../types';
import type { ImportDraft } from './parse';

export interface ImportSummary { added: number; promoted: number; duplicates: string[]; sentences: number; passages: number; pairs: number; unmatched: string[] }

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
  // a word he already had, found in a 成语 section, is a 成语 too
  for (const t of idioms) {
    const w = byText.get(t);
    if (w && !(edit(w).tags ?? []).includes('成语')) { const cur = edit(w); changed.set(cur.id, { ...cur, tags: uniq([...(cur.tags ?? []), '成语']) }); }
  }
  /** The word stands on its own somewhere in the sentence, not only inside a longer word (人民 in 人民币). */
  const standsAlone = (s: string, t: string) => {
    const len = Array.from(t).length;
    for (let at = s.indexOf(t); at >= 0; at = s.indexOf(t, at + 1)) {
      const inside = [1, 2].some((extra) => [0, ...Array.from({ length: extra }, (_, k) => k + 1)].some((back) => {
        const from = at - back;
        if (from < 0) return false;
        const longer = s.slice(from, at + t.length + (extra - back));
        return Array.from(longer).length > len && longer.includes(t) && (HSK_WORDS.has(longer) || byText.has(longer));
      }));
      if (!inside) return true;
    }
    return false;
  };
  const unmatched: string[] = [];
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
      if (Array.from(w.text).length < 2 || !s.includes(w.text) || !standsAlone(s, w.text)) continue; // single characters get 组词, not sentences
      const cur = edit(w);
      if ((cur.sentences ?? []).some((x) => x.text === s)) continue;
      changed.set(cur.id, { ...cur, sentences: [...(cur.sentences ?? []), { text: s, pinyin: py(s) }] });
      used = true;
    }
    if (used) sentenceCount++;
    else unmatched.push(s);
  }
  await putWords(db, [...changed.values()]);

  const existing = new Set((await listParentPassages(db)).map((p) => p.text));
  let passageCount = 0;
  for (const [i, text] of draft.passages.entries()) {
    if (existing.has(text)) continue;
    await saveParentPassage(db, { id: `pp:${opts.now}-${i}`, title: `${draft.title ?? opts.listName} 朗读${draft.passages.length > 1 ? ` ${i + 1}` : ''}`, text, createdAt: opts.now + i });
    passageCount++;
  }
  return { added: added.length, promoted: promoted.length, duplicates, sentences: sentenceCount, passages: passageCount, pairs: pairCount, unmatched };
}
