import type { SessionRecord } from '../types';
import { currentStep } from './runner';

/** Overall session progress, 0–1: finished steps plus the fraction done within the current one (`stepFraction` for steps that keep their own count: 选一选, 字辨, 用一用). */
export function sessionProgress(rec: SessionRecord, stepFraction = 0): number {
  const n = rec.plan.steps.length;
  if (!n || rec.completed) return 1;
  const step = currentStep(rec);
  let within = 0;
  if (step === 'flashcards') {
    const byCards = rec.flashQueue.length ? rec.flashIndex / rec.flashQueue.length : 0;
    const byTime = Number.isFinite(rec.plan.flashTimeBoxMs) && rec.plan.flashTimeBoxMs > 0 ? rec.flashElapsedMs / rec.plan.flashTimeBoxMs : 0;
    within = Math.max(byCards, byTime);
  } else if (step === 'writing') {
    within = rec.plan.writeCount ? rec.writeDone / rec.plan.writeCount : 0;
  } else {
    within = stepFraction;
  }
  return Math.min(1, (rec.stepIndex + Math.min(1, within)) / n);
}
