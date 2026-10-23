// 默写 in 练一练 (real test spec 2026-10-23 §4): which earlier words are written from memory this lesson.
import { writingCue } from '../activities/writing/cue';
import { hanChars } from '../content';
import { localDateKey } from '../lib/date';
import type { RightHistory } from '../stats/fromMemory';
import type { CardRecord, RecallPick, Word } from '../types';

/** 默写 items a lesson: 3 under 20 minutes, 4 from 20 (§4: about 40 s each, 2–3 minutes inside 练一练's box). */
export const RECALL_PER_LESSON = 3;
export const RECALL_PER_LONG_LESSON = 4;
export const recallTarget = (minutes: number): number => (minutes < 20 ? RECALL_PER_LESSON : RECALL_PER_LONG_LESSON);

/**
 * Today's 默写 (§4). From today's due revision (`dueIds`: reading or meaning due), never a word introduced today (`newIds`), one
 * whose hear or understand card is due (`earIds`: its first appearance is asked by ear), or a placed reading card's first recheck.
 * Each must be a begun character with a write card, or a 词语 all of whose characters are; a 词语 writes the character whose write
 * card is due soonest. Never a character written today already, one cue it can't show (no 组词 gap or sentence), or the same
 * character twice. Order: words whose last right answer was a tap (the longest since he produced it first), then those whose
 * write card is due, then the rest; `n` at most.
 */
export function pickRecall({ dueIds, newIds, earIds, words, cards, history, cutoff, now, n }: {
  dueIds: string[]; newIds: ReadonlySet<string>; earIds: ReadonlySet<string>; words: Word[]; cards: CardRecord[];
  history: ReadonlyMap<string, RightHistory>; cutoff: number; now: Date; n: number;
}): RecallPick[] {
  const byId = new Map(words.filter((w) => !w.paused).map((w) => [w.id, w]));
  const begun = new Set(cards.filter((c) => c.kind === 'recognise' || c.kind === 'hear').map((c) => c.wordId));
  const placed = new Set(cards.filter((c) => c.kind === 'recognise' && c.placed).map((c) => c.wordId));
  // each character he writes: its single-character word's write card
  const writeOf = new Map<string, CardRecord>();
  for (const c of cards) {
    const w = byId.get(c.wordId);
    if (c.kind === 'write' && w && begun.has(w.id) && Array.from(w.text).length === 1 && hanChars(w.text).length === 1) writeOf.set(w.text, c);
  }
  const today = localDateKey(now);
  const writtenToday = (c: CardRecord) => !!c.fsrs.last_review && localDateKey(c.fsrs.last_review) === today;
  type Cand = { pick: RecallPick; tier: number; key: number };
  const out: Cand[] = [];
  for (const id of new Set(dueIds)) {
    const w = byId.get(id);
    if (!w || newIds.has(id) || earIds.has(id) || placed.has(id)) continue;
    const chars = hanChars(w.text);
    if (!chars.length || chars.length !== Array.from(w.text).length || !chars.every((ch) => writeOf.has(ch))) continue;
    const at = chars.reduce((best, ch, i) => (writeOf.get(ch)!.fsrs.due.getTime() < writeOf.get(chars[best]!)!.fsrs.due.getTime() ? i : best), 0);
    const write = writeOf.get(chars[at]!)!;
    if (writtenToday(write)) continue;
    const cue = writingCue(w, at);
    if (!cue.blanked && !cue.sentence) continue;
    const h = history.get(id);
    const writeDue = write.fsrs.due.getTime() <= cutoff;
    out.push({ pick: { wordId: id, at, writeId: write.wordId }, tier: h?.tapLast ? 0 : writeDue ? 1 : 2, key: h?.tapLast ? h.madeAt : writeDue ? write.fsrs.due.getTime() : 0 });
  }
  const seen = new Set<string>();
  return out
    .map((c, i) => ({ ...c, i }))
    .sort((a, b) => a.tier - b.tier || a.key - b.key || a.i - b.i)
    .filter((c) => (seen.has(c.pick.writeId) ? false : (seen.add(c.pick.writeId), true)))
    .slice(0, n)
    .map((c) => c.pick);
}
