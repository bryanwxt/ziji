import type { FlashItem, SessionPlan, SessionRecord, StepKind } from '../types';

/** A wrong card comes back after this many other cards (or at the end of a short queue). */
export const RETRY_GAP = 4;
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
  const flashQueue: FlashItem[] = [
    ...head,
    ...plan.newWordIds.map((wordId) => ({ wordId, isNew: true, retry: false })),
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

export function currentStep(rec: SessionRecord): StepKind | null {
  return rec.completed ? null : (rec.plan.steps[rec.stepIndex] ?? null);
}

export function currentFlashItem(rec: SessionRecord): FlashItem | null {
  return currentStep(rec) === 'flashcards' ? (rec.flashQueue[rec.flashIndex] ?? null) : null;
}

export function currentWriteCandidate(rec: SessionRecord): { wordId: string; isNew: boolean } | null {
  return currentStep(rec) === 'writing' ? (rec.plan.writeCandidates[rec.writeIndex] ?? null) : null;
}

export function finishStep(rec: SessionRecord): SessionRecord {
  const step = currentStep(rec);
  if (!step) return rec;
  const stepIndex = rec.stepIndex + 1;
  return { ...rec, stepIndex, completedSteps: [...rec.completedSteps, step], completed: stepIndex >= rec.plan.steps.length };
}

export function addActiveTime(rec: SessionRecord, ms: number): SessionRecord {
  return { ...rec, activeMs: rec.activeMs + Math.min(ms, MAX_STEP_MS) };
}

export function afterFlashAnswer(rec: SessionRecord, correct: boolean, rawElapsedMs: number): SessionRecord {
  const elapsedMs = Math.min(rawElapsedMs, MAX_CARD_MS);
  const item = currentFlashItem(rec);
  if (!item) return rec;
  const flashQueue = [...rec.flashQueue];
  if (!correct && !item.retry) {
    flashQueue.splice(Math.min(rec.flashIndex + 1 + RETRY_GAP, flashQueue.length), 0, { ...item, isNew: false, retry: true });
  }
  const next: SessionRecord = {
    ...rec,
    flashQueue,
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

/** done=false means the word was skipped (e.g. no stroke data) and does not count. */
export function afterWriteWord(rec: SessionRecord, done: boolean, rawElapsedMs: number): SessionRecord {
  const elapsedMs = Math.min(rawElapsedMs, MAX_WORD_MS);
  const next: SessionRecord = {
    ...rec,
    writeIndex: rec.writeIndex + 1,
    writeDone: rec.writeDone + (done ? 1 : 0),
    activeMs: rec.activeMs + elapsedMs,
  };
  const finished = next.writeDone >= rec.plan.writeCount || next.writeIndex >= rec.plan.writeCandidates.length;
  return finished ? finishStep(next) : next;
}
