// The parent's Library (spec 2026-10-15 §9, 2026-10-24 §8): every built-in passage with its source, term, his fit now, reads,
// his last read's questions right, when it is due and whether he often skips it; and his right share by kind of question.
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import type { Passage, QuestionKind, ReadingHistory, TakeAnswer } from '../types';
import { daysBetween, entryOf, isRetired } from './history';
import { passageFit, termIndex } from './level';

/** Swapped out this often (下一篇): shown as "often skipped", so the parent can see whether it is too hard. */
export const OFTEN_SKIPPED = 3;

/** `qs`: the last lesson read's questions right of asked ('2/3'), '—' before any (or with older questions, which keep no kind). */
export interface LibraryRow { id: string; title: string; source: 'ZiJi' | 'Global Storybooks'; term: string; fit: number; reads: number; qs: string; next: string; oftenSkipped: boolean }

export function libraryRows(passages: readonly Passage[], r: ReadingHistory, readable: ReadonlySet<string>): LibraryRow[] {
  return [...passages]
    .sort((a, b) => termIndex(a.term) - termIndex(b.term) || a.id.localeCompare(b.id))
    .map((p) => {
      const e = entryOf(r, p.id);
      const next = !e.reads || !e.lastRead ? 'not read yet' : isRetired(e) ? 'retired' : localDateKey(addDays(parseDateKey(e.lastRead), e.rest));
      const newest = (e.answers ?? []).reduce((m, a) => (a.at > m ? a.at : m), ''); // the day of the last read that asked questions
      const last = (e.answers ?? []).filter((a) => a.at === newest);
      const qs = last.length ? `${last.filter((a) => a.correct).length}/${last.length}` : '—';
      return { id: p.id, title: p.title, source: p.source === 'gsb' ? 'Global Storybooks' : 'ZiJi', term: p.term, fit: passageFit(p.text, readable, p.names), reads: e.reads, qs, next, oftenSkipped: (e.skips ?? 0) >= OFTEN_SKIPPED };
    });
}

/** The by-kind line covers this many days, today included (spec 2026-10-24 §8). */
export const KIND_DAYS = 14;
/** How the parent sees each kind, in the line's order. */
export const KIND_LABEL: Readonly<Record<QuestionKind, string>> = { why: '为什么', word: '词义', order: '顺序', main: '主要意思', fact: '事实' };

export interface KindShare { kind: QuestionKind; label: string; right: number; total: number; weakest: boolean }

/** His answers over the last 14 days, every passage's, by kind: right of asked, kinds he met only, in KIND_LABEL's order; the
 *  lowest share is the weakest (the first of a tie), marked only when he has met two kinds or more and it is strictly below the best. */
export function kindShares(r: ReadingHistory, today: string): KindShare[] {
  const recent = Object.values(r.history).flatMap((e) => e.answers ?? []).filter((a) => {
    const ago = daysBetween(a.at, today);
    return ago >= 0 && ago < KIND_DAYS;
  });
  const rows = (Object.keys(KIND_LABEL) as QuestionKind[])
    .map((kind) => {
      const of = recent.filter((a) => a.kind === kind);
      return { kind, label: KIND_LABEL[kind], right: of.filter((a) => a.correct).length, total: of.length, weakest: false };
    })
    .filter((x) => x.total > 0);
  if (rows.length < 2) return rows;
  const share = (x: KindShare) => x.right / x.total;
  const low = rows.reduce((a, b) => (share(b) < share(a) ? b : a));
  const best = Math.max(...rows.map(share));
  return rows.map((x) => (x === low && share(x) < best ? { ...x, weakest: true } : x));
}

/** A take's answers for Listen & confirm: right of asked, then each miss with its kind and what he picked. */
export function answersLine(answers: readonly TakeAnswer[]): string {
  const right = answers.filter((a) => a.correct).length;
  const misses = answers.filter((a) => !a.correct).map((a) => `missed ${a.kind ? `${KIND_LABEL[a.kind]} ` : ''}(picked ${a.picked})`);
  return [`Questions: ${right}/${answers.length} right`, ...misses].join(' · ');
}
