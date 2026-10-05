import type { FlashItem, SessionPlan, SessionRecord, StepKind } from '../types';
import { noteRecall } from './recall';
import type { PracticeItem } from './round';

/** A missed card comes back about 3 cards later, then about 6 after that (or at the end of a short queue). Spec §20 part 2. */
export const RETRY_GAPS = [3, 6] as const;
// Ceilings on the time one card, written word or whole step can count, so an app
// left open or backgrounded can't use up the time box or inflate the parent's minutes.
export const MAX_CARD_MS = 60_000;
export const MAX_WORD_MS = 3 * 60_000;
export const MAX_STEP_MS = 10 * 60_000;

export function createSessionRecord(plan: SessionPlan, date: string, now: number, free = false): SessionRecord {
  // 认新字 (spec 2026-10-05 §2.1): each new word's card, then its recall. 练一练 builds its own round when it starts.
  const flashQueue: FlashItem[] = plan.newWordIds.map((wordId) => ({ wordId, isNew: true, retry: false }));
  return {
    date, startedAt: now, activeMs: 0, free, plan, stepIndex: 0,
    flashQueue, flashIndex: 0, flashElapsedMs: 0, writeIndex: 0, writeDone: 0,
    completedSteps: [], completed: plan.steps.length === 0,
  };
}

/** Today's new words 认一认 actually introduced: its time box can end before it reaches them, and 认一认 may be off. */
export function introducedNewWords(rec: SessionRecord): string[] {
  const met = new Set(rec.flashQueue.slice(0, rec.flashIndex).filter((i) => i.isNew).map((i) => i.wordId));
  return rec.plan.newWordIds.filter((id) => met.has(id));
}

export function currentStep(rec: SessionRecord): StepKind | null {
  return rec.completed ? null : (rec.plan.steps[rec.stepIndex] ?? null);
}

export function currentFlashItem(rec: SessionRecord): FlashItem | null {
  const step = currentStep(rec);
  return step === 'flashcards' || step === 'newwords' ? (rec.flashQueue[rec.flashIndex] ?? null) : null;
}

/** 写一写 passes (spec §20 part 3): a new word is traced, written with a hint, then from memory; a review word from memory only. */
export type WritePass = 'trace' | 'hint' | 'recall';
const NEW_WORD_PASSES: WritePass[] = ['trace', 'hint', 'recall'];
/** `at`: the character of the word to write (spec 2026-10-05 §5); `last`: this item finishes the word, so it rates its write card. */
export interface WriteTask { wordId: string; isNew: boolean; pass: WritePass; redo: boolean; at?: number; last?: boolean }

const itemKey = (i: { wordId: string; at: number }) => `${i.wordId}#${i.at}`;
const fromKey = (key: string) => { const k = key.lastIndexOf('#'); return { wordId: key.slice(0, k), at: Number(key.slice(k + 1)) }; };
/** The next character to write from `from`, past words whose strokes failed to load. */
function nextItem(rec: SessionRecord, from: number): number {
  const items = rec.plan.writeItems ?? [];
  let i = from;
  while (i < items.length && rec.writeSkipped?.includes(items[i]!.wordId)) i++;
  return i;
}
const mainWritingDone = (rec: SessionRecord) =>
  rec.plan.writeItems
    ? nextItem(rec, rec.writeIndex) >= rec.plan.writeItems.length
    : rec.writeDone >= rec.plan.writeCount || rec.writeIndex >= rec.plan.writeCandidates.length;

/** A word's misses from memory so far this lesson (tracing doesn't count): its last character adds its own and rates it. */
export const wordMisses = (rec: SessionRecord, wordId: string): number => rec.writeMisses?.[wordId] ?? 0;

/** The word and pass to write now; after the main words, the words to redo once more (redo: true). */
export function currentWriteTask(rec: SessionRecord): WriteTask | null {
  if (currentStep(rec) !== 'writing') return null;
  if (mainWritingDone(rec)) {
    const id = (rec.writeRedo ?? [])[rec.writeRedoIndex ?? 0];
    if (!id) return null;
    if (!rec.plan.writeItems) return { wordId: id, isNew: false, pass: 'recall', redo: true };
    return { ...fromKey(id), isNew: false, pass: 'recall', redo: true };
  }
  const items = rec.plan.writeItems;
  if (items) {
    const it = items[nextItem(rec, rec.writeIndex)]!;
    return { wordId: it.wordId, isNew: it.isNew, pass: it.pass, redo: false, at: it.at, last: !!it.last };
  }
  const c = rec.plan.writeCandidates[rec.writeIndex]!;
  const passes: WritePass[] = c.isNew ? NEW_WORD_PASSES : ['recall'];
  return { wordId: c.wordId, isNew: c.isNew, pass: passes[Math.min(rec.writePass ?? 0, passes.length - 1)]!, redo: false };
}

export function finishStep(rec: SessionRecord): SessionRecord {
  const step = currentStep(rec);
  if (!step) return rec;
  const stepIndex = rec.stepIndex + 1;
  return { ...rec, stepIndex, completedSteps: [...rec.completedSteps, step], completed: stepIndex >= rec.plan.steps.length };
}

/** Ends `step` only while it is still the current one, so a second 继续 or a late callback never skips the next step. */
export function finishStepIf(rec: SessionRecord, step: StepKind): SessionRecord {
  return currentStep(rec) === step ? finishStep(rec) : rec;
}

export function addActiveTime(rec: SessionRecord, ms: number): SessionRecord {
  return { ...rec, activeMs: rec.activeMs + Math.min(ms, MAX_STEP_MS) };
}

export function afterFlashAnswer(rec: SessionRecord, correct: boolean, rawElapsedMs: number, inContext = false): SessionRecord {
  const elapsedMs = Math.min(rawElapsedMs, MAX_CARD_MS);
  const item = currentFlashItem(rec);
  if (!item) return rec;
  const legacy = currentStep(rec) === 'flashcards'; // a lesson saved before 2026-10-05: its own retries and time box
  const flashQueue = [...rec.flashQueue];
  if (legacy && !correct && !item.retry) {
    const again = { ...item, isNew: false, retry: true };
    const first = Math.min(rec.flashIndex + 1 + RETRY_GAPS[0], flashQueue.length);
    flashQueue.splice(first, 0, again);
    flashQueue.splice(Math.min(first + 1 + RETRY_GAPS[1], flashQueue.length), 0, again);
  }
  const next: SessionRecord = {
    ...rec,
    flashQueue,
    recalls: noteRecall(rec.recalls, item.wordId, correct, inContext),
    flashIndex: rec.flashIndex + 1,
    flashElapsedMs: rec.flashElapsedMs + elapsedMs,
    activeMs: rec.activeMs + elapsedMs,
  };
  const done = next.flashIndex >= flashQueue.length || (legacy && next.flashElapsedMs >= rec.plan.flashTimeBoxMs);
  return done ? finishStep(next) : next;
}

export function skipFlashItem(rec: SessionRecord): SessionRecord {
  const next = { ...rec, flashIndex: rec.flashIndex + 1 };
  return next.flashIndex >= rec.flashQueue.length ? finishStep(next) : next;
}

/** A missed 练一练 item comes back once, about 4 items later, at the same rung, as practice only (spec 2026-10-05 §3.2). */
export const PRACTICE_RETRY_GAP = 4;

/** 练一练's round, built when the step starts (it needs today's 认新字 answers and his rungs); an empty round ends the step. */
export function startPractice(rec: SessionRecord, queue: PracticeItem[]): SessionRecord {
  const next: SessionRecord = { ...rec, practiceQueue: queue, practiceIndex: 0, practiceElapsedMs: 0 };
  return queue.length ? next : finishStep(next);
}

export function currentPracticeItem(rec: SessionRecord): PracticeItem | null {
  return currentStep(rec) === 'practice' ? (rec.practiceQueue?.[rec.practiceIndex ?? 0] ?? null) : null;
}

export function afterPracticeAnswer(rec: SessionRecord, correct: boolean, rawElapsedMs: number, inContext = false): SessionRecord {
  const item = currentPracticeItem(rec);
  if (!item) return rec;
  const elapsedMs = Math.min(rawElapsedMs, MAX_CARD_MS);
  const index = rec.practiceIndex ?? 0;
  const queue = [...rec.practiceQueue!];
  if (!correct && !item.retry) {
    const { due: _due, ...again } = item; // a retry is practice only, never a due first appearance
    let at = Math.min(index + 1 + PRACTICE_RETRY_GAP, queue.length);
    while (at < queue.length && (queue[at - 1]?.wordId === item.wordId || queue[at]?.wordId === item.wordId)) at++; // never beside the same word (sweep)
    queue.splice(at, 0, { ...again, grades: null, retry: true, missed: true });
  }
  const next: SessionRecord = {
    ...rec,
    practiceQueue: queue,
    practiceIndex: index + 1,
    practiceElapsedMs: (rec.practiceElapsedMs ?? 0) + elapsedMs,
    activeMs: rec.activeMs + elapsedMs,
    recalls: noteRecall(rec.recalls, item.wordId, correct, inContext),
  };
  if (next.practiceIndex! >= queue.length) return finishStep(next);
  // what time left for tomorrow: only due revision never reached counts (new words' later rungs, retries and meaning starts don't)
  if (next.practiceElapsedMs! >= (rec.plan.practiceTimeBoxMs ?? Number.POSITIVE_INFINITY)) return finishStep({ ...next, practiceLeft: queue.slice(next.practiceIndex!).filter((x) => x.due).length });
  return next;
}

export function skipPracticeItem(rec: SessionRecord): SessionRecord {
  const next: SessionRecord = { ...rec, practiceIndex: (rec.practiceIndex ?? 0) + 1 };
  return next.practiceIndex! >= (rec.practiceQueue?.length ?? 0) ? finishStep(next) : next;
}

/** 再玩一会儿 (spec 2026-10-05 §7): one 练一练 round of words he knows; never saved, never graded, no time box. */
export function createFreePracticeRecord(queue: PracticeItem[], date: string, now: number): SessionRecord {
  const plan: SessionPlan = {
    steps: ['practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: Number.POSITIVE_INFINITY,
    writeCandidates: [], writeCount: 0,
  };
  return { ...createSessionRecord(plan, date, now, true), practiceQueue: queue, practiceIndex: 0, practiceElapsedMs: 0 };
}

/**
 * After one written pass. done=false means the word was skipped (e.g. no stroke data) and does not count.
 * Only the recall pass finishes a word; one that needed a hint or had more than 3 misses is written once more at the end.
 */
export function afterWriteWord(rec: SessionRecord, done: boolean, rawElapsedMs: number, outcome: { hinted?: boolean; misses?: number } = {}): SessionRecord {
  const task = currentWriteTask(rec);
  if (!task) return rec;
  const base: SessionRecord = { ...rec, activeMs: rec.activeMs + Math.min(rawElapsedMs, MAX_WORD_MS) };
  let next: SessionRecord;
  if (rec.plan.writeItems && !task.redo) next = afterWriteItem(rec, base, task, done, outcome);
  else if (task.redo) next = { ...base, writeRedoIndex: (rec.writeRedoIndex ?? 0) + 1 };
  else if (!done) next = { ...base, writeIndex: rec.writeIndex + 1, writePass: 0 };
  else if (task.pass !== 'recall') next = { ...base, writePass: (rec.writePass ?? 0) + 1 };
  else {
    const redo = outcome.hinted || (outcome.misses ?? 0) > 3 ? [...(rec.writeRedo ?? []), task.wordId] : (rec.writeRedo ?? []);
    next = { ...base, writeIndex: rec.writeIndex + 1, writeDone: rec.writeDone + 1, writePass: 0, writeRedo: redo };
  }
  return currentWriteTask(next) ? next : finishStep(next);
}

/**
 * One character written (spec 2026-10-05 §5). A recall adds its misses to the word's; one that needed a hint or had more than 3
 * misses is written once more at the end — never straight after itself. A character that couldn't load skips the rest of its word.
 */
function afterWriteItem(rec: SessionRecord, base: SessionRecord, task: WriteTask, done: boolean, outcome: { hinted?: boolean; misses?: number }): SessionRecord {
  const i = nextItem(rec, rec.writeIndex);
  if (!done) return { ...base, writeIndex: i + 1, writeSkipped: [...(rec.writeSkipped ?? []), task.wordId] };
  const key = itemKey({ wordId: task.wordId, at: task.at ?? 0 });
  const recall = task.pass === 'recall';
  const misses = outcome.misses ?? 0;
  let redo = recall && (outcome.hinted || misses > 3) ? [...(rec.writeRedo ?? []), key] : (rec.writeRedo ?? []);
  const next: SessionRecord = {
    ...base, writeIndex: i + 1, writeDone: rec.writeDone + 1, writeRedo: redo,
    ...(recall ? { writeMisses: { ...(rec.writeMisses ?? {}), [task.wordId]: wordMisses(rec, task.wordId) + misses } } : {}),
  };
  if (mainWritingDone(next) && redo[0] === key) {
    redo = redo.length > 1 ? [...redo.slice(1), key] : []; // never the same character twice in a row
    return { ...next, writeRedo: redo };
  }
  return next;
}

