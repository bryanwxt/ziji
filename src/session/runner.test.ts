import { describe, expect, it } from 'vitest';
import type { SessionPlan } from '../types';
import {
  addActiveTime, afterFlashAnswer, afterWriteWord, createFreePlayRecord, MAX_CARD_MS, MAX_STEP_MS, MAX_WORD_MS, createSessionRecord, currentFlashItem,
  currentStep, currentWriteCandidate, finishStep, skipFlashItem,
} from './runner';

const plan = (over: Partial<SessionPlan> = {}): SessionPlan => ({
  steps: ['flashcards', 'writing'],
  reviewWordIds: ['r1', 'r2'],
  newWordIds: ['n1'],
  flashTimeBoxMs: 600_000,
  writeCandidates: [{ wordId: 'w1', isNew: false }, { wordId: 'w2', isNew: true }, { wordId: 'w3', isNew: true }],
  writeCount: 2,
  ...over,
});

describe('session runner', () => {
  it('queues reviews before new words', () => {
    const rec = createSessionRecord(plan(), '2026-10-02', 0);
    expect(rec.flashQueue.map((i) => [i.wordId, i.isNew])).toEqual([['r1', false], ['r2', false], ['n1', true]]);
    expect(currentStep(rec)).toBe('flashcards');
  });

  it('re-shows a wrong card later as a retry, only once', () => {
    let rec = createSessionRecord(plan(), 'd', 0);
    rec = afterFlashAnswer(rec, false, 1000);
    expect(rec.flashQueue.map((i) => i.wordId)).toEqual(['r1', 'r2', 'n1', 'r1']);
    expect(rec.flashQueue[3]).toEqual({ wordId: 'r1', isNew: false, retry: true });
    rec = afterFlashAnswer(rec, true, 1000);
    rec = afterFlashAnswer(rec, true, 1000);
    expect(currentFlashItem(rec)?.retry).toBe(true);
    rec = afterFlashAnswer(rec, false, 1000);
    expect(rec.flashQueue).toHaveLength(4);
    expect(currentStep(rec)).toBe('writing');
    expect(rec.completedSteps).toEqual(['flashcards']);
    expect(rec.activeMs).toBe(4000);
  });

  it('inserts the retry four cards later when the queue is long', () => {
    const rec = afterFlashAnswer(createSessionRecord(plan({ reviewWordIds: ['a', 'b', 'c', 'd', 'e', 'f'], newWordIds: [] }), 'd', 0), false, 10);
    expect(rec.flashQueue.map((i) => i.wordId)).toEqual(['a', 'b', 'c', 'd', 'e', 'a', 'f']);
  });

  it('ends flashcards when the time box runs out', () => {
    const rec = afterFlashAnswer(createSessionRecord(plan({ flashTimeBoxMs: 5000 }), 'd', 0), true, 6000);
    expect(currentStep(rec)).toBe('writing');
  });

  it('skips an item without counting time', () => {
    const rec = skipFlashItem(createSessionRecord(plan(), 'd', 0));
    expect(currentFlashItem(rec)?.wordId).toBe('r2');
    expect(rec.flashElapsedMs).toBe(0);
  });

  it('ends writing after writeCount words; skipped words do not count', () => {
    let rec = finishStep(createSessionRecord(plan(), 'd', 0));
    expect(currentWriteCandidate(rec)?.wordId).toBe('w1');
    rec = afterWriteWord(rec, false, 0);
    rec = afterWriteWord(rec, true, 1000);
    expect(rec.completed).toBe(false);
    rec = afterWriteWord(rec, true, 1000);
    expect(rec.completed).toBe(true);
    expect(rec.completedSteps).toEqual(['flashcards', 'writing']);
  });

  it('ends writing when the candidates run out', () => {
    let rec = finishStep(createSessionRecord(plan({ writeCandidates: [{ wordId: 'w1', isNew: false }] }), 'd', 0));
    rec = afterWriteWord(rec, true, 0);
    expect(rec.completed).toBe(true);
  });

  it('treats a plan with no steps as already complete', () => {
    expect(createSessionRecord(plan({ steps: [] }), 'd', 0).completed).toBe(true);
  });

  it('creates free play with only flashcards and no time box', () => {
    const rec = createFreePlayRecord([{ wordId: 'a', isNew: false, retry: true }], 'd', 0);
    expect(rec.free).toBe(true);
    expect(rec.plan.steps).toEqual(['flashcards']);
    expect(currentFlashItem(rec)?.wordId).toBe('a');
  });
});

describe('idle time does not count as practice', () => {
  it('caps one card at a minute so a backgrounded app cannot eat the time box', () => {
    const rec = afterFlashAnswer(createSessionRecord(plan({ flashTimeBoxMs: 8 * 60_000 }), 'd', 0), true, 20 * 60_000);
    expect(rec.flashElapsedMs).toBe(MAX_CARD_MS);
    expect(currentStep(rec)).toBe('flashcards');
  });
  it('caps a step and a written word too', () => {
    expect(addActiveTime(createSessionRecord(plan(), 'd', 0), 60 * 60_000).activeMs).toBe(MAX_STEP_MS);
    const writing = finishStep(createSessionRecord(plan(), 'd', 0));
    expect(afterWriteWord(writing, true, 60 * 60_000).activeMs).toBe(MAX_WORD_MS);
  });
});

describe('meaning items in the queue', () => {
it('interleaves reading and meaning reviews, then new words, then new meaning items', () => {
  const p = plan({ steps: ['flashcards'], reviewWordIds: ['a', 'b'], meaningReviewIds: ['c'], newWordIds: ['n'], newMeaningIds: ['m'] });
  const q = createSessionRecord(p, '2026-10-04', 0).flashQueue.map((i) => `${i.wordId}:${i.mode ?? 'read'}${i.isNew ? '+new' : ''}`);
  expect(q).toEqual(['a:read', 'b:read', 'c:meaning', 'n:read+new', 'm:meaning']);
});
it('meaning reviews take at most one slot in three, and never push new words behind them', () => {
  const p = plan({ steps: ['flashcards'], reviewWordIds: ['a', 'b', 'c', 'd'], meaningReviewIds: ['m1', 'm2', 'm3', 'm4', 'm5'], newWordIds: ['n'], newMeaningIds: ['x'] });
  const q = createSessionRecord(p, '2026-10-04', 0).flashQueue.map((i) => i.wordId);
  expect(q).toEqual(['a', 'b', 'm1', 'c', 'd', 'm2', 'n', 'm3', 'm4', 'm5', 'x']);
});
});
