// src/weeklist/extraSentences.ts
// The list sentence bank and the Tatoeba subset (parent ruling 2026-10-17), loaded only when the parent's 本周词语 panel opens:
// separate chunks, never in the main bundle, as the CC-CEDICT word list is (cedictWords.ts). A confirmed row keeps its sentence,
// so the child's side never needs them.
import type { ExtraSentences } from './fit';

let pending: Promise<ExtraSentences | null> | null = null;

/** Both files, loaded once; null when they can't be had (offline on first use), and tried again next time. */
export function loadExtraSentences(): Promise<ExtraSentences | null> {
  pending ??= (async () => {
    try {
      const [bank, tatoeba] = await Promise.all([import('../content/weekSentences.json'), import('../content/tatoeba.json')]);
      return { bank: (bank.default as { words: ExtraSentences['bank'] }).words, tatoeba: (tatoeba.default as unknown as { words: ExtraSentences['tatoeba'] }).words };
    } catch {
      return null;
    }
  })().then((x) => {
    if (!x) pending = null;
    return x;
  });
  return pending;
}
