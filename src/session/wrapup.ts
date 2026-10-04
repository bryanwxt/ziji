import type { UseItem } from '../practice/useItems';
import type { SessionRecord } from '../types';
import type { Recall } from './recall';
import { introducedNewWords } from './runner';

export const WRAPUP_TRIES = 3;
export const WRAPUP_CAP = 12;

/** The words 用一用 closes the lesson with (spec §20 part 7): today's new words he was introduced to, then any word missed today. */
export function wrapupTargets(rec: SessionRecord): string[] {
  const missed = Object.entries(rec.recalls ?? {}).filter(([, r]) => r.missed).map(([id]) => id);
  return [...new Set([...introducedNewWords(rec), ...missed])];
}

/**
 * One item per target (always its last recall), plus one more for a word with no recall in context yet, after the first round.
 * At most 12; the targets that missed out are reported so their meaning cards can come due the next day.
 */
export function planWrapup(targets: string[], recalls: Record<string, Recall>, make: (wordId: string, n: number) => UseItem | null, cap = WRAPUP_CAP) {
  const firsts: UseItem[] = [];
  const extras: UseItem[] = [];
  const usable: string[] = [];
  for (const id of targets) {
    const first = make(id, 0);
    if (!first) continue; // no sentence anywhere: nothing to use it in
    usable.push(id);
    firsts.push(first);
    if ((recalls[id]?.inContext ?? 0) + 1 < 2) {
      const extra = make(id, 1);
      if (extra) extras.push(extra);
    }
  }
  // words with an extra item go first, so the extra comes after the others: no word twice in a row (spec §20 part 7)
  const hasExtra = new Set(extras.map((i) => i.wordId));
  const ordered = [...firsts.filter((i) => hasExtra.has(i.wordId)), ...firsts.filter((i) => !hasExtra.has(i.wordId))];
  const items = [...ordered, ...extras].slice(0, cap);
  const kept = new Set(items.map((i) => i.wordId));
  return { items, dropped: usable.filter((id) => !kept.has(id)) };
}
