import { describe, expect, it } from 'vitest';
import type { SessionPlan } from '../types';
import { sessionProgress } from './progress';
import { afterFlashAnswer, afterWriteWord, createSessionRecord, finishStep } from './runner';

const plan: SessionPlan = {
  steps: ['flashcards', 'writing'], reviewWordIds: ['a', 'b', 'c', 'd'], newWordIds: [],
  flashTimeBoxMs: 1_000_000, writeCandidates: [{ wordId: 'w', isNew: false }, { wordId: 'x', isNew: false }], writeCount: 2,
};

describe('sessionProgress', () => {
  it('starts at 0 and counts progress within the current step', () => {
    // a lesson saved before 2026-10-05: its 认一认 queue held four cards
    let rec = { ...createSessionRecord(plan, 'd', 0), flashQueue: ['a', 'b', 'c', 'd'].map((wordId) => ({ wordId, isNew: false, retry: false })) };
    expect(sessionProgress(rec)).toBe(0);
    rec = afterFlashAnswer(rec, true, 10);
    expect(sessionProgress(rec)).toBeCloseTo(0.125);
    rec = finishStep(rec);
    expect(sessionProgress(rec)).toBe(0.5);
    rec = afterWriteWord(rec, true, 10);
    expect(sessionProgress(rec)).toBe(0.75);
  });
  it('uses the time box when it is further along than the card count', () => {
    const rec = { ...createSessionRecord({ ...plan, flashTimeBoxMs: 100 }, 'd', 0), flashElapsedMs: 50 };
    expect(sessionProgress(rec)).toBe(0.25);
  });
  it('is complete when the session is', () => {
    expect(sessionProgress(createSessionRecord({ ...plan, steps: [] }, 'd', 0))).toBe(1);
  });
});

describe('steps that keep their own count (deferred minor, plan 13)', () => {
  it('选一选, 字辨 and 用一用 move the bar by how far through their items he is', () => {
    const rec = createSessionRecord({ steps: ['choose', 'components'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, 'd', 0);
    expect(sessionProgress(rec)).toBe(0);
    expect(sessionProgress(rec, 0.5)).toBe(0.25);
  });
});

it('练一练 shows how far through its round he is (items or time, whichever is further)', () => {
  const plan = { steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 100_000, writeCandidates: [], writeCount: 0 } as SessionPlan;
  const rec = { ...createSessionRecord(plan, '2026-10-06', 0), stepIndex: 1, practiceQueue: new Array(10).fill({ wordId: 'b:a', rung: 1, ask: 'read', grades: null, retry: false }), practiceIndex: 5, practiceElapsedMs: 20_000 };
  expect(sessionProgress(rec)).toBeCloseTo(0.75); // step 2 of 2, halfway through it
});
