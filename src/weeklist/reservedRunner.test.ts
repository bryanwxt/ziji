// @vitest-environment node
// The time box never ends 练一练 while a reserved list item is still unasked (weekly list spec §2.1; fix round 2026-10-17).
import { describe, expect, it } from 'vitest';
import { afterPracticeAnswer, createSessionRecord, startPractice } from '../session/runner';
import type { PracticeItem } from '../session/round';
import type { SessionPlan } from '../types';

const plan: SessionPlan = { steps: ['practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 30_000, writeCandidates: [], writeCount: 0 };
const item = (wordId: string, due = false): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: null, retry: false, ...(due ? { due: true } : {}) });
const reserved = (wordId: string): PracticeItem => ({ ...item(wordId), list: { listId: 'wl:r', form: 'read', reserved: true } });

describe('the time box and reserved items', () => {
  it('pulls the unasked reserved items forward and asks them; the due items it skipped still count as left', () => {
    let rec = startPractice(createSessionRecord(plan, '2026-11-06', 0), [item('a', true), item('b', true), item('c', true), reserved('p:甲'), item('d', true), reserved('p:乙')]);
    rec = afterPracticeAnswer(rec, true, 20_000);
    rec = afterPracticeAnswer(rec, true, 20_000); // the box is used up after two
    expect(rec.completedSteps).not.toContain('practice');
    expect(rec.practiceQueue!.slice(rec.practiceIndex!).map((x) => x.wordId)).toEqual(['p:甲', 'p:乙']);
    rec = afterPracticeAnswer(rec, true, 5000);
    rec = afterPracticeAnswer(rec, true, 5000);
    expect(rec.completedSteps).toContain('practice');
    expect(rec.practiceLeft).toBe(2); // c and d, never reached
  });
  it('with no reserved item left, the box ends the step as before', () => {
    let rec = startPractice(createSessionRecord(plan, '2026-11-06', 0), [item('a', true), item('b', true), item('c', true)]);
    rec = afterPracticeAnswer(rec, true, 31_000);
    expect(rec.completedSteps).toContain('practice');
    expect(rec.practiceLeft).toBe(2);
  });
});
