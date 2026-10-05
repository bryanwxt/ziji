import { describe, expect, it } from 'vitest';
import type { SessionPlan, SessionRecord, StepKind } from '../types';
import {
  addActiveTime, afterFlashAnswer, afterWriteWord, MAX_CARD_MS, MAX_STEP_MS, MAX_WORD_MS, createSessionRecord, currentFlashItem,
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
/** A lesson saved before 2026-10-05 (spec 2026-10-05 §7): its 认一认 queue held the reviews, built by the old record. */
const legacy = (p: SessionPlan, date = 'd'): SessionRecord => ({ ...createSessionRecord(p, date, 0), flashQueue: p.reviewWordIds.map((wordId) => ({ wordId, isNew: false, retry: false })) });

describe('session runner', () => {
  it('re-shows a wrong card later as retries; a missed retry adds no more', () => {
    let rec = legacy(plan({ newWordIds: [] }));
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
    const rec = afterFlashAnswer(legacy(plan({ flashTimeBoxMs: 5000 })), true, 6000);
    expect(currentStep(rec)).toBe('writing');
  });

  it('skips an item without counting time', () => {
    const rec = skipFlashItem(legacy(plan()));
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

});

describe('idle time does not count as practice', () => {
  it('caps one card at a minute so a backgrounded app cannot eat the time box', () => {
    const rec = afterFlashAnswer(legacy(plan({ flashTimeBoxMs: 8 * 60_000 })), true, 20 * 60_000);
    expect(rec.flashElapsedMs).toBe(MAX_CARD_MS);
    expect(currentStep(rec)).toBe('flashcards');
  });
  it('caps a step and a written word too', () => {
    expect(addActiveTime(createSessionRecord(plan(), 'd', 0), 60 * 60_000).activeMs).toBe(MAX_STEP_MS);
    const writing = finishStep(createSessionRecord(plan(), 'd', 0));
    expect(afterWriteWord(writing, true, 60 * 60_000).activeMs).toBe(MAX_WORD_MS);
  });
});

describe('reading repetition (spec §20 part 2)', () => {
  const p = { steps: ['flashcards'] as StepKind[], reviewWordIds: ['r1', 'r2'], newWordIds: ['n1', 'n2'], flashTimeBoxMs: 1e9, writeCandidates: [], writeCount: 0, newWordMeaningIds: ['n1'] };
  it('a missed item comes back twice: about 3 items later, then about 6 after that', () => {
    const many = { ...p, reviewWordIds: Array.from({ length: 14 }, (_, i) => `r${i}`), newWordIds: [], newWordMeaningIds: [] };
    const rec = afterFlashAnswer(legacy(many, '2026-10-05'), false, 100);
    const ids = rec.flashQueue.map((i) => i.wordId);
    expect(ids.indexOf('r0', 1)).toBe(4);
    expect(ids.indexOf('r0', 5)).toBe(11);
  });
  it("counts today's recalls per word, with the in-context flag", () => {
    let rec = legacy(p, '2026-10-05');
    rec = afterFlashAnswer(rec, true, 100, true);
    expect(rec.recalls?.r1).toEqual({ right: 1, inContext: 1, missed: false });
    rec = afterFlashAnswer(rec, false, 100);
    expect(rec.recalls?.r2).toEqual({ right: 0, inContext: 0, missed: true });
  });
  it('an old saved lesson without recalls resumes and counts', () => {
    const old = { ...legacy(p, '2026-10-05') } as SessionRecord;
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

import { createFreePracticeRecord, currentPracticeItem, afterPracticeAnswer, skipPracticeItem, startPractice, PRACTICE_RETRY_GAP } from './runner';
import type { PracticeItem } from './round';

const planOf = (over: Partial<SessionPlan> = {}): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: ['b:a'], newWordIds: ['b:x', 'b:y'], flashTimeBoxMs: 0, practiceTimeBoxMs: 60_000, writeCandidates: [], writeCount: 0, ...over });
const p = (wordId: string, over: Partial<PracticeItem> = {}): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: 'recognise', retry: false, ...over });

describe('认新字 (spec 2026-10-05 §2.1)', () => {
  it("the lesson's flash queue is today's new words, each introduced once, nothing else", () => {
    expect(createSessionRecord(planOf(), '2026-10-06', 0).flashQueue).toEqual([
      { wordId: 'b:x', isNew: true, retry: false },
      { wordId: 'b:y', isNew: true, retry: false },
    ]);
  });
  it('a miss adds no retry (the word comes first in 练一练 instead), and 认新字 ends after its last word', () => {
    let rec = createSessionRecord(planOf(), '2026-10-06', 0);
    rec = afterFlashAnswer(rec, false, 1000);
    expect(rec.flashQueue).toHaveLength(2);
    expect(rec.recalls?.['b:x']?.missed).toBe(true);
    rec = afterFlashAnswer(rec, true, 1000);
    expect(currentStep(rec)).toBe('practice');
  });
});

describe('练一练 on the record (spec 2026-10-05 §3)', () => {
  const inPractice = () => {
    const rec = createSessionRecord(planOf({ newWordIds: [] }), '2026-10-06', 0);
    expect(currentStep(rec)).toBe('newwords');
    return finishStep(rec);
  };
  it('an empty round ends the step at once (review focus 4)', () => {
    expect(currentStep(startPractice(inPractice(), []))).toBeNull();
  });
  it('items come in order; a right answer moves on', () => {
    const rec = startPractice(inPractice(), [p('b:a'), p('b:b')]);
    expect(currentPracticeItem(rec)?.wordId).toBe('b:a');
    expect(currentPracticeItem(afterPracticeAnswer(rec, true, 2000))?.wordId).toBe('b:b');
  });
  it('a miss brings the item back once, about 4 items later, at the same rung, as an ungraded retry', () => {
    const queue = ['b:a', 'b:b', 'b:c', 'b:d', 'b:e', 'b:f'].map((w) => p(w, { rung: 2, ask: 'word', grades: 'meaning' }));
    const rec = afterPracticeAnswer(startPractice(inPractice(), queue), false, 2000);
    const again = rec.practiceQueue!.filter((x) => x.wordId === 'b:a');
    expect(again).toHaveLength(2);
    expect(again[1]).toEqual({ wordId: 'b:a', rung: 2, ask: 'word', grades: null, retry: true });
    expect(rec.practiceQueue!.findIndex((x, i) => i > 0 && x.wordId === 'b:a')).toBe(1 + PRACTICE_RETRY_GAP);
    expect(afterPracticeAnswer({ ...rec, practiceIndex: 1 + PRACTICE_RETRY_GAP }, false, 100).practiceQueue).toHaveLength(7); // a retry never adds another
  });
  it('the time box ends the round and notes what was left for tomorrow (pacing reads it)', () => {
    const rec = afterPracticeAnswer(startPractice(inPractice(), [p('b:a'), p('b:b', { due: true }), p('b:c', { due: true })]), true, 60_000);
    expect(currentStep(rec)).toBeNull();
    expect(rec.practiceLeft).toBe(2); // two due words never reached
  });
  it('finishing every item leaves nothing over', () => {
    const rec = afterPracticeAnswer(startPractice(inPractice(), [p('b:a')]), true, 1000);
    expect(currentStep(rec)).toBeNull();
    expect(rec.practiceLeft ?? 0).toBe(0);
  });
  it('a skipped item (a paused word) moves on without a recall', () => {
    const rec = skipPracticeItem(startPractice(inPractice(), [p('b:a'), p('b:b')]));
    expect(currentPracticeItem(rec)?.wordId).toBe('b:b');
    expect(rec.recalls?.['b:a']).toBeUndefined();
  });
  it('the round is kept on the record, so a lesson resumes at the same item (review focus 1)', () => {
    const rec = afterPracticeAnswer(startPractice(inPractice(), [p('b:a'), p('b:b'), p('b:c')]), true, 1000);
    const back = structuredClone(rec);
    expect(currentPracticeItem(back)).toEqual(p('b:b'));
  });
  it('free play is one 练一练 round, never time-boxed', () => {
    const rec = createFreePracticeRecord([p('b:a', { grades: null, retry: true })], '2026-10-06', 0);
    expect(rec.free).toBe(true);
    expect(currentStep(rec)).toBe('practice');
    expect(currentStep(afterPracticeAnswer(rec, true, 10 * 60_000))).toBeNull(); // ended by its last item, not by time
  });
});

describe('final review I1: only due revision left over counts as revision piling up', () => {
  const inPractice = () => finishStep(createSessionRecord(planOf({ newWordIds: [] }), '2026-10-06', 0));
  it('time running out with only new-word rungs, retries or meaning starts left leaves nothing due over', () => {
    const rec = afterPracticeAnswer(startPractice(inPractice(), [p('b:a', { due: true }), p('b:b'), p('b:c', { retry: true })]), true, 60_000);
    expect(currentStep(rec)).toBeNull();
    expect(rec.practiceLeft).toBe(0);
  });
  it('a due word never reached counts', () => {
    const rec = afterPracticeAnswer(startPractice(inPractice(), [p('b:a'), p('b:b', { due: true }), p('b:c')]), true, 60_000);
    expect(rec.practiceLeft).toBe(1);
  });
  it('a retry is not a due first appearance', () => {
    const rec = afterPracticeAnswer(startPractice(inPractice(), [p('b:a', { due: true }), p('b:b'), p('b:c'), p('b:d'), p('b:e'), p('b:f')]), false, 1000);
    expect(rec.practiceQueue!.filter((x) => x.due)).toHaveLength(1);
  });
});
