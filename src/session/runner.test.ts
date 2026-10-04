import { describe, expect, it } from 'vitest';
import type { SessionPlan, SessionRecord, StepKind } from '../types';
import {
  addActiveTime, afterFlashAnswer, afterWriteWord, createFreePlayRecord, MAX_CARD_MS, MAX_STEP_MS, MAX_WORD_MS, createSessionRecord, currentFlashItem,
  currentStep, currentWriteTask, finishStep, finishStepIf, skipFlashItem,
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
  it('queues reviews before new words (each new word read again after it)', () => {
    const rec = createSessionRecord(plan(), '2026-10-02', 0);
    expect(rec.flashQueue.map((i) => [i.wordId, i.isNew])).toEqual([['r1', false], ['r2', false], ['n1', true], ['n1', false]]);
    expect(currentStep(rec)).toBe('flashcards');
  });

  it('re-shows a wrong card later as retries; a missed retry adds no more', () => {
    let rec = createSessionRecord(plan({ newWordIds: [] }), 'd', 0);
    rec = afterFlashAnswer(rec, false, 1000);
    expect(rec.flashQueue.map((i) => i.wordId)).toEqual(['r1', 'r2', 'r1', 'r1']);
    expect(rec.flashQueue[2]).toEqual({ wordId: 'r1', isNew: false, retry: true });
    rec = afterFlashAnswer(rec, true, 1000);
    expect(currentFlashItem(rec)?.retry).toBe(true);
    rec = afterFlashAnswer(rec, false, 1000);
    rec = afterFlashAnswer(rec, false, 1000);
    expect(rec.flashQueue).toHaveLength(4);
    expect(currentStep(rec)).toBe('writing');
    expect(rec.completedSteps).toEqual(['flashcards']);
    expect(rec.activeMs).toBe(4000);
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
    expect(currentWriteTask(rec)?.wordId).toBe('w1');
    rec = afterWriteWord(rec, false, 0);
    for (let i = 0; i < 3; i++) rec = afterWriteWord(rec, true, 1000); // w2 is new: trace, hint, recall
    expect(rec.completed).toBe(false);
    for (let i = 0; i < 3; i++) rec = afterWriteWord(rec, true, 1000);
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
  expect(q).toEqual(['a:read', 'b:read', 'c:meaning', 'n:read+new', 'n:read', 'm:meaning']); // n: its second reading
});
it('meaning reviews take at most one slot in three, and never push new words behind them', () => {
  const p = plan({ steps: ['flashcards'], reviewWordIds: ['a', 'b', 'c', 'd'], meaningReviewIds: ['m1', 'm2', 'm3', 'm4', 'm5'], newWordIds: ['n'], newMeaningIds: ['x'] });
  const q = createSessionRecord(p, '2026-10-04', 0).flashQueue.map((i) => i.wordId);
  expect(q).toEqual(['a', 'b', 'm1', 'c', 'd', 'm2', 'n', 'n', 'm3', 'm4', 'm5', 'x']);
});
});

describe('reading repetition (spec §20 part 2)', () => {
  const p = { steps: ['flashcards'] as StepKind[], reviewWordIds: ['r1', 'r2'], newWordIds: ['n1', 'n2'], flashTimeBoxMs: 1e9, writeCandidates: [], writeCount: 0, newWordMeaningIds: ['n1'] };
  it('a new word is met 3 times: intro + reading, a second reading about 5 items on, a meaning question near the end', () => {
    const q = createSessionRecord(p, '2026-10-05', 0).flashQueue;
    expect(q.map((i) => `${i.wordId}${i.isNew ? '*' : ''}${i.retry ? '+' : ''}${i.mode === 'meaning' ? 'm' : ''}`)).toEqual(['r1', 'r2', 'n1*', 'n2*', 'n1+', 'n2+', 'n1m']);
  });
  it('the second reading sits about 5 items after its intro when more new words follow', () => {
    const q = createSessionRecord({ ...p, reviewWordIds: [], newWordIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], newWordMeaningIds: [] }, 'd', 0).flashQueue.map((i) => `${i.wordId}${i.isNew ? '*' : ''}`);
    expect(q.indexOf('a') - q.indexOf('a*')).toBe(6);
  });
  it('a missed item comes back twice: about 3 items later, then about 6 after that', () => {
    const many = { ...p, reviewWordIds: Array.from({ length: 14 }, (_, i) => `r${i}`), newWordIds: [], newWordMeaningIds: [] };
    const rec = afterFlashAnswer(createSessionRecord(many, '2026-10-05', 0), false, 100);
    const ids = rec.flashQueue.map((i) => i.wordId);
    expect(ids.indexOf('r0', 1)).toBe(4);
    expect(ids.indexOf('r0', 5)).toBe(11);
  });
  it("counts today's recalls per word, with the in-context flag", () => {
    let rec = createSessionRecord(p, '2026-10-05', 0);
    rec = afterFlashAnswer(rec, true, 100, true);
    expect(rec.recalls?.r1).toEqual({ right: 1, inContext: 1, missed: false });
    rec = afterFlashAnswer(rec, false, 100);
    expect(rec.recalls?.r2).toEqual({ right: 0, inContext: 0, missed: true });
  });
  it('an old saved lesson without recalls resumes and counts', () => {
    const old = { ...createSessionRecord(p, '2026-10-05', 0) } as SessionRecord;
    delete (old as { recalls?: unknown }).recalls;
    expect(afterFlashAnswer(old, true, 10).recalls?.r1?.right).toBe(1);
  });
});

describe('write passes (spec §20 part 3)', () => {
  const wp = { steps: ['writing'] as StepKind[], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [{ wordId: 'n', isNew: true }, { wordId: 'r', isNew: false }], writeCount: 4 };
  it('a new word: trace, then hint, then recall; a review word: recall only', () => {
    let rec = createSessionRecord(wp, 'd', 0);
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) { const t = currentWriteTask(rec)!; seen.push(`${t.wordId}:${t.pass}`); rec = afterWriteWord(rec, true, 10); }
    expect(seen).toEqual(['n:trace', 'n:hint', 'n:recall', 'r:recall']);
    expect(rec.completed).toBe(true);
  });
  it('a word that needed a hint, or had more than 3 misses, is written once more at the end', () => {
    let rec = createSessionRecord({ ...wp, writeCandidates: [{ wordId: 'a', isNew: false }, { wordId: 'b', isNew: false }, { wordId: 'c', isNew: false }] }, 'd', 0);
    rec = afterWriteWord(rec, true, 10, { hinted: true });
    rec = afterWriteWord(rec, true, 10, { misses: 1 });
    rec = afterWriteWord(rec, true, 10, { misses: 4 });
    expect(currentWriteTask(rec)).toEqual({ wordId: 'a', isNew: false, pass: 'recall', redo: true });
    rec = afterWriteWord(rec, true, 10, { hinted: true }); // a redo never queues another
    expect(currentWriteTask(rec)).toEqual({ wordId: 'c', isNew: false, pass: 'recall', redo: true });
    rec = afterWriteWord(rec, true, 10);
    expect(rec.completed).toBe(true);
  });
  it('an old record without writePass resumes at its first pass', () => {
    const rec = createSessionRecord(wp, 'd', 0);
    delete (rec as { writePass?: number }).writePass;
    expect(currentWriteTask(rec)?.pass).toBe('trace');
  });
});

describe('ending a step once', () => {
  it('finishStepIf ends the step only while it is still current (a second 继续 never skips the next step)', () => {
    const rec = createSessionRecord({ steps: ['choose', 'components', 'wrapup'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, 'd', 0);
    const once = finishStepIf(rec, 'choose');
    expect(currentStep(once)).toBe('components');
    expect(finishStepIf(once, 'choose')).toBe(once);
  });
});
