// 写一写 does the 组词 work (production practice spec §3): a written item whose cue is a 组词 rates that word's meaning card —
// the card 练一练's rung-2 组词 questions rate — once a lesson.
import { writingCue } from '../activities/writing/cue';
import type { SessionRecord, Word } from '../types';
import type { WriteTask } from './runner';

/** A write-list character from memory counts as right with no hint and at most this many misses. */
export const RECALL_RIGHT_MISSES = 1;
/** A 默写 in 练一练 is right with no hint and at most RECALL_RIGHT_MISSES misses (real test spec 2026-10-23 §4). */
export const recallRight = (o: { totalMisses: number; hinted: boolean }): boolean => !o.hinted && o.totalMisses <= RECALL_RIGHT_MISSES;
/** A traced read-only character counts as right with at most this many misses. */
export const TRACE_RIGHT_MISSES = 3;

/**
 * Whether this written item rates its word's meaning card: true (right), false (wrong), or null (it doesn't). It counts when the
 * word's Use rung is open (`useOpen`: it has a meaning card, or starts one today), its cue is a 组词 (「计，计划的计」), the item is
 * a write-list character from memory or a read-only character traced (never a redo or a write-list trace), and nothing written
 * earlier in the lesson has rated the word. Free play rates nothing.
 */
export function meaningCredit(rec: SessionRecord, task: WriteTask, result: { totalMisses: number; hinted: boolean }, word: Word, useOpen: boolean): boolean | null {
  if (rec.free || task.redo || !useOpen || (rec.meaningCredit ?? []).includes(task.wordId)) return null;
  if (task.pass !== (task.readOnly ? 'trace' : 'recall')) return null;
  if (writingCue(word, task.at).blanked === null) return null;
  return task.readOnly ? result.totalMisses <= TRACE_RIGHT_MISSES : !result.hinted && result.totalMisses <= RECALL_RIGHT_MISSES;
}
