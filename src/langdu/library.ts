// The parent's Library (spec 2026-10-15 §9): every built-in passage with its source, term, his fit now, reads, when it is due
// and whether he often skips it.
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import type { Passage, ReadingHistory } from '../types';
import { entryOf, isRetired } from './history';
import { passageFit, termIndex } from './level';

/** Swapped out this often (下一篇): shown as "often skipped", so the parent can see whether it is too hard. */
export const OFTEN_SKIPPED = 3;

export interface LibraryRow { id: string; title: string; source: 'ZiJi' | 'Global Storybooks'; term: string; fit: number; reads: number; next: string; oftenSkipped: boolean }

export function libraryRows(passages: readonly Passage[], r: ReadingHistory, readable: ReadonlySet<string>): LibraryRow[] {
  return [...passages]
    .sort((a, b) => termIndex(a.term) - termIndex(b.term) || a.id.localeCompare(b.id))
    .map((p) => {
      const e = entryOf(r, p.id);
      const next = !e.reads || !e.lastRead ? 'not read yet' : isRetired(e) ? 'retired' : localDateKey(addDays(parseDateKey(e.lastRead), e.rest));
      return { id: p.id, title: p.title, source: p.source === 'gsb' ? 'Global Storybooks' : 'ZiJi', term: p.term, fit: passageFit(p.text, readable, p.names), reads: e.reads, next, oftenSkipped: (e.skips ?? 0) >= OFTEN_SKIPPED };
    });
}
