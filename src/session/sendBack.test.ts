import { describe, expect, it } from 'vitest';
import type { SessionPlan } from '../types';
import type { PracticeItem } from './round';
import { createSessionRecord, currentPracticeItem, currentStep, sendBack, startPractice } from './runner';

// A word sent back to learn by a missed placement recheck picks up nothing more in that lesson (review M1).
const plan: SessionPlan = { steps: ['newwords', 'practice', 'writing'], reviewWordIds: [], newWordIds: ['b:新'], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const item = (wordId: string, grades: PracticeItem['grades'], ask: PracticeItem['ask'] = 'read'): PracticeItem => ({ wordId, rung: 1, ask, grades, retry: false });
const inPractice = (queue: PracticeItem[]) => startPractice({ ...createSessionRecord(plan, '2026-10-14', 0), stepIndex: 1 }, queue);

describe('a word sent back in the lesson (review M1)', () => {
  it("drops the word's practice still to come: retries, meaning, Say, 说一句", () => {
    let rec = inPractice([item('b:x', 'recognise'), item('b:y', 'recognise'), item('b:x', 'meaning', 'word'), item('b:x', 'say', 'say'), item('b:x', 'sentence', 'sentence'), item('b:z', 'recognise')]);
    rec = { ...rec, practiceIndex: 1 }; // the recheck was answered
    rec = sendBack(rec, 'b:x');
    expect(rec.practiceQueue!.map((x) => x.wordId)).toEqual(['b:x', 'b:y', 'b:z']);
    expect(currentPracticeItem(rec)!.wordId).toBe('b:y');
    expect(rec.sentBack).toEqual(['b:x']);
  });
  it('nothing left: the step ends', () => {
    let rec = inPractice([item('b:x', 'recognise'), item('b:x', 'meaning', 'word')]);
    rec = sendBack({ ...rec, practiceIndex: 1 }, 'b:x');
    expect(currentStep(rec)).toBe('writing');
  });
  it('sent back before 练一练 is planned (in 认一认): its practice never joins the round', () => {
    const rec = sendBack({ ...createSessionRecord(plan, '2026-10-14', 0) }, 'b:x');
    const next = startPractice({ ...rec, stepIndex: 1 }, [item('b:x', 'meaning', 'word'), item('b:y', 'recognise')]);
    expect(next.practiceQueue!.map((x) => x.wordId)).toEqual(['b:y']);
  });
});
