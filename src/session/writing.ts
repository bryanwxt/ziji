// 写一写 (spec 2026-10-05 §5; spec 2026-10-11 §4): 4 characters from memory at the usual 15 minutes (writeCharTarget), at or below his level, traced only once, never back to back.
import { hanChars } from '../content';
import { State } from 'ts-fsrs';
import { writeAt } from '../content/curriculum';
import type { Course } from '../content';
import { isKnown } from '../srs/scheduler';
import type { CardRecord, Word } from '../types';

export const MAX_WRITE_CHARS = 10;
/** Characters a lesson (spec 2026-10-12 §4, 朗读 takes its ~3 minutes): 4 under 20 minutes (the usual 15), 5 at 20, 7 at 25, 8 at 30, 9 from 40. */
export const writeCharTarget = (minutes: number): number => Math.min(MAX_WRITE_CHARS, minutes < 20 ? 4 : minutes < 25 ? 5 : minutes < 30 ? 7 : minutes < 40 ? 8 : 9);

/**
 * A word to write this lesson: the characters to write (each once — 妈妈 is one; one another word already brings is left out),
 * `ats` their places in the word, and whether he has never written it (each character is traced once first).
 */
export interface WriteUnit { wordId: string; chars: string[]; ats?: number[]; isNew: boolean }
/** One character of a word, one pass; `last` is the item that finishes the word, which rates its write card. */
export interface WriteItem { wordId: string; at: number; pass: 'trace' | 'recall'; isNew: boolean; last?: boolean }

/**
 * The words to write (spec §5), up to `target` characters and never half a word: writing due today, then today's new words
 * and recent lesson words he reads, then characters he reads within reach — a book character once his class has written it, others at his level — going down. Never one he can't read.
 */
export function pickWriteUnits({ cards, words, newWordIds, practised, level, writeBy, cutoff, target }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number;
  /** the book's write position decides the last fallback for a book character (spec 2026-10-11 §6); null class: the level rule */
  writeBy?: { course: Course; classAt: number | null }; cutoff: number; target: number;
}): WriteUnit[] {
  const write = new Map(cards.filter((c) => c.kind === 'write').map((c) => [c.wordId, c]));
  // a character he already writes keeps its write card, even if his course no longer asks for it (writeability only grows)
  const byId = new Map(words.filter((w) => !w.paused && (w.writeable || write.has(w.id))).map((w) => [w.id, w]));
  const inReach = (w: Word) => {
    const at = writeBy && writeBy.classAt !== null && Array.from(w.text).length === 1 ? writeAt(w.text, writeBy.course) : undefined;
    return at !== undefined ? at <= writeBy!.classAt! : (w.level ?? 0) <= level;
  };
  const reads = new Map(cards.filter((c) => c.kind === 'recognise').map((c) => [c.wordId, c]));
  const skippedAt = (id: string) => byId.get(id)?.writeSkippedAt ?? 0;
  // due ones by when they came due; one whose strokes failed to load goes behind the rest (sweep)
  const due = [...write.values()].filter((c) => byId.has(c.wordId) && c.fsrs.due.getTime() <= cutoff).sort((a, b) => skippedAt(a.wordId) - skippedAt(b.wordId) || a.fsrs.due.getTime() - b.fsrs.due.getTime());
  const unwritten = (w: Word) => !write.has(w.id);
  const skippedLast = (a: Word, b: Word) => (a.writeSkippedAt ?? 0) - (b.writeSkippedAt ?? 0); // strokes that failed to load go last
  const today = newWordIds.map((id) => byId.get(id)).filter((w): w is Word => !!w && unwritten(w));
  const recent = [...byId.values()]
    .filter((w) => unwritten(w) && reads.has(w.id) && practised.has(w.id) && reads.get(w.id)!.fsrs.state !== State.Relearning) // he can read it now (sweep)
    .sort((a, b) => skippedLast(a, b) || practised.get(b.id)! - practised.get(a.id)!);
  const readable = [...byId.values()]
    .filter((w) => { const r = reads.get(w.id); return unwritten(w) && !practised.has(w.id) && !!r && isKnown(r.fsrs) && inReach(w); })
    .sort((a, b) => skippedLast(a, b) || (b.level ?? 0) - (a.level ?? 0) || (b.rank ?? -1) - (a.rank ?? -1));
  const out: WriteUnit[] = [];
  const seen = new Set<string>();
  const taken = new Set<string>(); // a character comes once a lesson (final review I2)
  let n = 0;
  const add = (w: Word, isNew: boolean) => {
    const all = hanChars(w.text);
    const ats = all.map((_, i) => i).filter((i) => all.indexOf(all[i]!) === i && !taken.has(all[i]!));
    const chars = ats.map((i) => all[i]!);
    // a word that doesn't fit waits and a shorter one may; one longer than the whole count is written on its own (sweep)
    if (seen.has(w.id) || !chars.length || (n + chars.length > target && n > 0)) return;
    seen.add(w.id);
    for (const c of chars) taken.add(c);
    out.push({ wordId: w.id, chars, ats, isNew });
    n += chars.length;
  };
  for (const c of due) { if (n >= target) break; add(byId.get(c.wordId)!, c.fsrs.reps === 0); }
  for (const w of [...today, ...recent, ...readable]) { if (n >= target) break; add(w, true); }
  return out;
}

/**
 * The order (spec §5; final review I1): a never-written character is traced once, early, and comes back from memory at least two
 * items later; the same character never twice in a row, and a word's characters apart, wherever anything can come between. The
 * words with the most still to do go first (as when spreading out letters), so none is left to pile up at the end.
 */
export function orderWriteItems(units: WriteUnit[]): WriteItem[] {
  type Slot = { u: WriteUnit; at: number; ch: string; passes: ('trace' | 'recall')[]; next: number; readyAt: number; order: number };
  let order = 0;
  const slots: Slot[] = units.flatMap((u) => u.chars.map((ch, i): Slot => ({ u, at: u.ats?.[i] ?? i, ch, passes: u.isNew ? ['trace', 'recall'] : ['recall'], next: 0, readyAt: 0, order: order++ })));
  const out: WriteItem[] = [];
  let last: Slot | null = null;
  while (true) {
    const left = slots.filter((s) => s.next < s.passes.length);
    if (!left.length) break;
    const p = out.length;
    const otherChar = (s: Slot) => !last || s.ch !== last.ch;
    const otherWord = (s: Slot) => !last || s.u.wordId !== last.u.wordId;
    const ready = (s: Slot) => s.readyAt <= p;
    const rem = (s: Slot) => s.passes.length - s.next;
    const wordLeft = (s: Slot) => left.reduce((n, x) => n + (x.u === s.u ? rem(x) : 0), 0); // a word's characters together
    const most = (a: Slot, b: Slot) => wordLeft(b) - wordLeft(a) || rem(b) - rem(a) || a.order - b.order;
    const soonest = (a: Slot, b: Slot) => a.readyAt - b.readyAt || most(a, b);
    // in order of giving way: the word apart, then the two-item gap after a trace, then the character apart
    const tiers: [Slot[], (a: Slot, b: Slot) => number][] = [
      [left.filter((s) => ready(s) && otherChar(s) && otherWord(s)), most],
      [left.filter((s) => ready(s) && otherChar(s)), most],
      [left.filter((s) => otherChar(s) && otherWord(s)), soonest],
      [left.filter(otherChar), soonest],
      [left, soonest],
    ];
    const [tier, by] = tiers.find(([t]) => t.length)!;
    const s = [...tier].sort(by)[0]!;
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
