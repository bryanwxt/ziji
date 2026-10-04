import type { FlashItem, SessionPlan, SessionRecord, StepKind } from '../types';
import { noteRecall } from './recall';

/** A missed card comes back about 3 cards later, then about 6 after that (or at the end of a short queue). Spec §20 part 2. */
export const RETRY_GAPS = [3, 6] as const;
/** A new word's second reading comes about this many cards after its intro. */
export const REPEAT_GAP = 5;
// Ceilings on the time one card, written word or whole step can count, so an app
// left open or backgrounded can't use up the time box or inflate the parent's minutes.
export const MAX_CARD_MS = 60_000;
export const MAX_WORD_MS = 3 * 60_000;
export const MAX_STEP_MS = 10 * 60_000;

export function createSessionRecord(plan: SessionPlan, date: string, now: number, free = false): SessionRecord {
  // Reading reviews lead, with one meaning review after every two (meaning takes at most a third of the head);
  // new words come next, so a meaning backlog can never push them out of the time box; then the rest.
  const read = plan.reviewWordIds.map((wordId): FlashItem => ({ wordId, isNew: false, retry: false }));
  const mean = (plan.meaningReviewIds ?? []).map((wordId): FlashItem => ({ wordId, isNew: false, retry: false, mode: 'meaning' }));
  const head: FlashItem[] = [];
  let m = 0;
  read.forEach((item, i) => {
    head.push(item);
    if (i % 2 === 1 && m < mean.length) head.push(mean[m++]!);
  });
  // A new word is met 3 times (spec §20 part 2): intro + reading, a second reading about 5 cards on, then its meaning.
  const fresh: FlashItem[] = plan.newWordIds.map((wordId) => ({ wordId, isNew: true, retry: false }));
  for (const wordId of plan.newWordIds) {
    const intro = fresh.findIndex((i) => i.wordId === wordId && i.isNew);
    fresh.splice(Math.min(intro + 1 + REPEAT_GAP, fresh.length), 0, { wordId, isNew: false, retry: true });
  }
  const freshMeaning = (plan.newWordMeaningIds ?? []).map((wordId): FlashItem => ({ wordId, isNew: false, retry: false, mode: 'meaning' }));
  const flashQueue: FlashItem[] = [
    ...head,
    ...fresh,
    ...freshMeaning,
    ...mean.slice(m),
    ...(plan.newMeaningIds ?? []).map((wordId): FlashItem => ({ wordId, isNew: false, retry: false, mode: 'meaning' })),
  ];
  return {
    date, startedAt: now, activeMs: 0, free, plan, stepIndex: 0,
    flashQueue, flashIndex: 0, flashElapsedMs: 0, writeIndex: 0, writeDone: 0,
    completedSteps: [], completed: plan.steps.length === 0,
  };
}

export function createFreePlayRecord(queue: FlashItem[], date: string, now: number): SessionRecord {
  const plan: SessionPlan = {
    steps: ['flashcards'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: Number.POSITIVE_INFINITY,
    writeCandidates: [], writeCount: 0,
  };
  return { ...createSessionRecord(plan, date, now, true), flashQueue: queue };
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
  return currentStep(rec) === 'flashcards' ? (rec.flashQueue[rec.flashIndex] ?? null) : null;
}

/** 写一写 passes (spec §20 part 3): a new word is traced, written with a hint, then from memory; a review word from memory only. */
export type WritePass = 'trace' | 'hint' | 'recall';
const NEW_WORD_PASSES: WritePass[] = ['trace', 'hint', 'recall'];
export interface WriteTask { wordId: string; isNew: boolean; pass: WritePass; redo: boolean }

const mainWritingDone = (rec: SessionRecord) => rec.writeDone >= rec.plan.writeCount || rec.writeIndex >= rec.plan.writeCandidates.length;

/** The word and pass to write now; after the main words, the words to redo once more (redo: true). */
export function currentWriteTask(rec: SessionRecord): WriteTask | null {
  if (currentStep(rec) !== 'writing') return null;
  if (mainWritingDone(rec)) {
    const id = (rec.writeRedo ?? [])[rec.writeRedoIndex ?? 0];
    return id ? { wordId: id, isNew: false, pass: 'recall', redo: true } : null;
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
  const flashQueue = [...rec.flashQueue];
  if (!correct && !item.retry) {
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
  const done = next.flashIndex >= flashQueue.length || next.flashElapsedMs >= rec.plan.flashTimeBoxMs;
  return done ? finishStep(next) : next;
}

export function skipFlashItem(rec: SessionRecord): SessionRecord {
  const next = { ...rec, flashIndex: rec.flashIndex + 1 };
  return next.flashIndex >= rec.flashQueue.length ? finishStep(next) : next;
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
  if (task.redo) next = { ...base, writeRedoIndex: (rec.writeRedoIndex ?? 0) + 1 };
  else if (!done) next = { ...base, writeIndex: rec.writeIndex + 1, writePass: 0 };
  else if (task.pass !== 'recall') next = { ...base, writePass: (rec.writePass ?? 0) + 1 };
  else {
    const redo = outcome.hinted || (outcome.misses ?? 0) > 3 ? [...(rec.writeRedo ?? []), task.wordId] : (rec.writeRedo ?? []);
    next = { ...base, writeIndex: rec.writeIndex + 1, writeDone: rec.writeDone + 1, writePass: 0, writeRedo: redo };
  }
  return currentWriteTask(next) ? next : finishStep(next);
}
