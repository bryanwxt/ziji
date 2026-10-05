// 写一写 (spec 2026-10-05 §5): 8–10 characters from memory, at or below his level, traced only once, never back to back.
import { hanChars } from '../content';
import { isKnown } from '../srs/scheduler';
import type { CardRecord, Word } from '../types';

export const MAX_WRITE_CHARS = 10;
/** Characters a lesson: 6 at 20 minutes, 8–10 from 25 (9 at the usual 30). */
export const writeCharTarget = (minutes: number): number => Math.min(MAX_WRITE_CHARS, minutes < 25 ? 6 : minutes < 30 ? 8 : minutes < 40 ? 9 : 10);

/** A word to write this lesson: its characters, and whether he has never written it (each character is traced once first). */
export interface WriteUnit { wordId: string; chars: string[]; isNew: boolean }
/** One character of a word, one pass; `last` is the item that finishes the word, which rates its write card. */
export interface WriteItem { wordId: string; at: number; pass: 'trace' | 'recall'; isNew: boolean; last?: boolean }

/**
 * The words to write (spec §5), up to `target` characters and never half a word: writing due today, then today's new words
 * and recent lesson words he reads, then characters he reads at his level and going down. Never one he can't read.
 */
export function pickWriteUnits({ cards, words, newWordIds, practised, level, cutoff, target }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number; cutoff: number; target: number;
}): WriteUnit[] {
  const byId = new Map(words.filter((w) => !w.paused && w.writeable).map((w) => [w.id, w]));
  const write = new Map(cards.filter((c) => c.kind === 'write').map((c) => [c.wordId, c]));
  const reads = new Map(cards.filter((c) => c.kind === 'recognise').map((c) => [c.wordId, c]));
  const due = [...write.values()].filter((c) => byId.has(c.wordId) && c.fsrs.due.getTime() <= cutoff).sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());
  const unwritten = (w: Word) => !write.has(w.id);
  const skippedLast = (a: Word, b: Word) => (a.writeSkippedAt ?? 0) - (b.writeSkippedAt ?? 0); // strokes that failed to load go last
  const today = newWordIds.map((id) => byId.get(id)).filter((w): w is Word => !!w && unwritten(w));
  const recent = [...byId.values()]
    .filter((w) => unwritten(w) && reads.has(w.id) && practised.has(w.id))
    .sort((a, b) => skippedLast(a, b) || practised.get(b.id)! - practised.get(a.id)!);
  const readable = [...byId.values()]
    .filter((w) => { const r = reads.get(w.id); return unwritten(w) && !practised.has(w.id) && !!r && isKnown(r.fsrs) && (w.level ?? 0) <= level; })
    .sort((a, b) => skippedLast(a, b) || (b.level ?? 0) - (a.level ?? 0) || (b.rank ?? -1) - (a.rank ?? -1));
  const out: WriteUnit[] = [];
  const seen = new Set<string>();
  let n = 0;
  const add = (w: Word, isNew: boolean) => {
    const chars = hanChars(w.text);
    if (seen.has(w.id) || !chars.length || n + chars.length > target) return; // a word that doesn't fit waits; a shorter one may
    seen.add(w.id);
    out.push({ wordId: w.id, chars, isNew });
    n += chars.length;
  };
  for (const c of due) { if (n >= target) break; add(byId.get(c.wordId)!, c.fsrs.reps === 0); }
  for (const w of [...today, ...recent, ...readable]) { if (n >= target) break; add(w, true); }
  return out;
}

/**
 * The order (spec §5): a never-written character is traced once, early, and comes back from memory at least two items later;
 * the same character never twice in a row, and a word's characters apart where anything else can come between.
 */
export function orderWriteItems(units: WriteUnit[]): WriteItem[] {
  type Slot = { u: WriteUnit; at: number; key: string; passes: ('trace' | 'recall')[]; next: number; readyAt: number };
  const slots: Slot[] = units.flatMap((u) => u.chars.map((_, at): Slot => ({ u, at, key: `${u.wordId}#${at}`, passes: u.isNew ? ['trace', 'recall'] : ['recall'], next: 0, readyAt: 0 })));
  const fresh = [...slots.filter((s) => s.u.isNew), ...slots.filter((s) => !s.u.isNew)]; // tracing early
  const out: WriteItem[] = [];
  let last: Slot | null = null;
  const left = () => slots.filter((s) => s.next < s.passes.length);
  while (left().length) {
    const p = out.length;
    const apart = (s: Slot) => !last || (s.key !== last.key && s.u.wordId !== last.u.wordId);
    const notSame = (s: Slot) => !last || s.key !== last.key;
    const ready = left().filter((s) => s.next > 0 && s.readyAt <= p).sort((a, b) => a.readyAt - b.readyAt);
    const unstarted = fresh.filter((s) => s.next === 0);
    const waiting = left().filter((s) => s.next > 0 && s.readyAt > p).sort((a, b) => a.readyAt - b.readyAt);
    const order = [...ready, ...unstarted, ...waiting];
    const s = order.find(apart) ?? order.find(notSame) ?? order[0]!;
    out.push({ wordId: s.u.wordId, at: s.at, pass: s.passes[s.next]!, isNew: s.u.isNew });
    s.next += 1;
    s.readyAt = p + 3;
    last = s;
  }
  const done = new Set<string>();
  for (let i = out.length - 1; i >= 0; i--) {
    if (done.has(out[i]!.wordId)) continue;
    done.add(out[i]!.wordId);
    out[i] = { ...out[i]!, last: true };
  }
  return out;
}
