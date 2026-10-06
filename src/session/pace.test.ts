import { describe, expect, it } from 'vitest';
import type { ReviewLog, SessionPlan, SessionRecord } from '../types';
import { keptRecent, nextPace, ranOut } from './pace';
import { createSessionRecord } from './runner';

const plan = (newWordIds: string[]): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds, flashTimeBoxMs: 0, practiceTimeBoxMs: 1, writeCandidates: [], writeCount: 0 });
/** A lesson on `date` that introduced every one of `ids` in 认新字. */
const lesson = (date: string, ids: string[], over: Partial<SessionRecord> = {}): SessionRecord => ({ ...createSessionRecord(plan(ids), date, 0), flashIndex: ids.length, ...over });
const log = (wordId: string, date: string, correct: boolean): ReviewLog => ({ cardId: `${wordId}:recognise`, wordId, kind: 'recognise', at: new Date(`${date}T16:00:00`).getTime(), rating: correct ? 3 : 1, correct });

describe('how many new words he keeps (spec 2026-10-05 §2.2)', () => {
  it("counts the last 5 days' new words by the first time each came back on a later day", () => {
    const sessions = [lesson('2026-10-03', ['b:a', 'b:b']), lesson('2026-10-05', ['b:c'])];
    const logs = [
      log('b:a', '2026-10-03', true), // its intro day: not counted
      log('b:a', '2026-10-04', true), // first return: kept
      log('b:a', '2026-10-05', false), // later returns don't count
      log('b:b', '2026-10-05', false), // first return: missed
      log('b:c', '2026-10-05', true), // introduced today… of the lesson on 10-05, no later day yet: not measured
    ];
    expect(keptRecent(sessions, logs, '2026-10-06')).toEqual({ right: 1, total: 2 });
  });
  it('ignores lessons older than 5 days, and today’s', () => {
    const sessions = [lesson('2026-09-30', ['b:a']), lesson('2026-10-06', ['b:b'])];
    const logs = [log('b:a', '2026-10-01', true), log('b:b', '2026-10-07', true)];
    expect(keptRecent(sessions, logs, '2026-10-06')).toEqual({ right: 0, total: 0 });
  });
  it('a round that ran out of time left items over', () => {
    expect(ranOut(lesson('2026-10-05', [], { practiceLeft: 3 }))).toBe(true);
    expect(ranOut(lesson('2026-10-05', []))).toBe(false);
  });
});

describe('today’s number of new words (spec §2.2)', () => {
  const base = { prev: 5, ceiling: 8, ranOut: [false, false] as [boolean, boolean] };
  it('starts at 4', () => expect(nextPace({ ...base, prev: null, kept: { right: 0, total: 0 } }).perDay).toBe(4));
  it('goes up one when he keeps at least 85% and the last round finished', () => {
    expect(nextPace({ ...base, kept: { right: 9, total: 10 } })).toEqual({ perDay: 6, reason: 'kept 9 of 10 recent new words' });
    expect(nextPace({ ...base, kept: { right: 9, total: 10 }, ranOut: [true, false] }).perDay).toBe(5); // not while revision ran out yesterday
  });
  it('goes down one when he keeps under 70%, or when the last two rounds both ran out of time', () => {
    expect(nextPace({ ...base, kept: { right: 6, total: 10 } }).perDay).toBe(4);
    expect(nextPace({ ...base, kept: { right: 10, total: 10 }, ranOut: [true, true] })).toEqual({ perDay: 4, reason: 'revision is piling up (the last two rounds ran out of time)' });
  });
  it('stays put in between, and with too few words to judge (the first week, review focus 5)', () => {
    expect(nextPace({ ...base, kept: { right: 8, total: 10 } }).perDay).toBe(5);
    expect(nextPace({ ...base, kept: { right: 7, total: 7 } })).toEqual({ perDay: 5, reason: 'too few recent new words to judge yet (7)' });
  });
  it('stays within 3–8 and under the parent’s ceiling, even when the ceiling drops below today’s number (review focus 5)', () => {
    expect(nextPace({ ...base, prev: 8, kept: { right: 10, total: 10 } }).perDay).toBe(8);
    expect(nextPace({ ...base, prev: 3, kept: { right: 0, total: 10 } }).perDay).toBe(3);
    expect(nextPace({ ...base, prev: 7, ceiling: 5, kept: { right: 10, total: 10 } }).perDay).toBe(5);
    expect(nextPace({ ...base, prev: 4, ceiling: 2, kept: { right: 0, total: 10 } }).perDay).toBe(2); // a ceiling under 3 is the parent's word
    expect(nextPace({ ...base, ceiling: 0, kept: { right: 9, total: 10 } })).toEqual({ perDay: 0, reason: 'new words are switched off' });
  });
});

describe('pace on the ladder (spec 2026-10-06 §3.2)', () => {
  it('a new word is kept when he hears it right on a later day', () => {
    const hear = (wordId: string, date: string, correct: boolean): ReviewLog => ({ ...log(wordId, date, correct), cardId: `${wordId}:hear`, kind: 'hear' });
    expect(keptRecent([lesson('2026-10-03', ['b:a'])], [hear('b:a', '2026-10-04', true)], '2026-10-06')).toEqual({ right: 1, total: 1 });
  });
});
