import { eligiblePassages } from '../activities/speaking/prompts';
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import type { ParentPassage, Passage, PassageQuestion, ReadingState } from '../types';

export const CYCLE_DAYS = 3;
export const MAX_EXTRA = 2;
export const RECENT_DAYS = 30;
export interface ReadingPassage { id: string; title: string; text: string; source: 'parent' | 'builtin'; question?: PassageQuestion }

/** Parent texts first (in the order added), then built-ins he can read; each with its meaning question when it has one. */
export function readingPool(parent: ParentPassage[], builtins: Passage[], knownChars: Set<string>, questions: Readonly<Record<string, PassageQuestion>> = PASSAGE_QUESTIONS): ReadingPassage[] {
  return [
    ...[...parent].sort((a, b) => a.createdAt - b.createdAt).map((p) => ({ id: p.id, title: p.title, text: p.text, source: 'parent' as const, ...(p.question ? { question: p.question } : {}) })),
    ...eligiblePassages(builtins, knownChars).map((p) => ({ ...p, source: 'builtin' as const, ...(questions[p.id] ? { question: questions[p.id] } : {}) })),
  ];
}

const doneWith = (r: ReadingState) => r.days >= CYCLE_DAYS + r.extra;

/** Today's passage: the current one until its days are used up, then the next unread parent text, then a built-in not read lately. */
export function pickPassage(r: ReadingState, pool: ReadingPassage[], today: string): ReadingPassage | null {
  if (!pool.length) return null;
  const current = pool.find((p) => p.id === r.passageId);
  if (current && (!doneWith(r) || r.lastDay === today)) return current;
  const others = pool.filter((p) => p.id !== r.passageId);
  const unreadParent = others.find((p) => p.source === 'parent' && !r.lastRead[p.id]);
  if (unreadParent) return unreadParent;
  const cutoff = localDateKey(addDays(parseDateKey(today), -RECENT_DAYS));
  const fresh = others.find((p) => p.source === 'builtin' && !(r.lastRead[p.id] && r.lastRead[p.id]! > cutoff));
  if (fresh) return fresh;
  const byOldest = [...(others.length ? others : pool)].sort((a, b) => (r.lastRead[a.id] ?? '').localeCompare(r.lastRead[b.id] ?? ''));
  return byOldest[0] ?? null;
}

/** Count one practice day for this passage (once per date). Switching passage starts a fresh cycle. */
export function finishDay(r: ReadingState, passageId: string, today: string): ReadingState {
  const same = r.passageId === passageId;
  if (same && r.lastDay === today) return r;
  return { ...r, passageId, days: same ? r.days + 1 : 1, extra: same ? r.extra : 0, lastDay: today, lastRead: { ...r.lastRead, [passageId]: today } };
}

export function addExtraDay(r: ReadingState, passageId: string): ReadingState {
  if (r.passageId !== passageId || r.extra >= MAX_EXTRA) return r;
  return { ...r, extra: r.extra + 1 };
}

/**
 * Day 1 of this passage (spec 2026-10-12 §3: the warm-up runs then only): a passage the cycle hasn't counted yet (its count
 * still belongs to the last passage until finishDay), day 0, or a second lesson on its first day.
 */
export function isFirstDay(r: ReadingState, passageId: string, today: string): boolean {
  if (r.passageId !== passageId) return true;
  return r.days === 0 || (r.days === 1 && r.lastDay === today);
}
