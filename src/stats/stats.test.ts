import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { createSessionRecord } from '../session/runner';
import { makeCard, makeWord } from '../test/fixtures';
import type { ReviewLog, SessionPlan, SessionRecord } from '../types';
import { dueTomorrow, minutesPerDay, streak, summarize, totalStars, troubleWords, weekDays, weeklyAccuracy } from './stats';

const emptyPlan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const session = (date: string, over: Partial<SessionRecord> = {}): SessionRecord => ({ ...createSessionRecord(emptyPlan, date, 0), completed: true, ...over });
const log = (wordId: string, rating: ReviewLog['rating'], at: number): ReviewLog => ({
  cardId: `${wordId}:recognise`, wordId, kind: 'recognise', at, rating, correct: rating !== Rating.Again,
});

describe('summarize', () => {
  it('counts known recognise and write cards and collects known single characters', () => {
    const now = new Date(2026, 9, 2);
    const words = [makeWord('大'), makeWord('朋友', { id: 'p:1' }), makeWord('人')];
    const cards = [
      makeCard('b:大', 'recognise', now, true),
      makeCard('p:1', 'recognise', now, true),
      makeCard('b:人', 'recognise', now, false),
      makeCard('b:大', 'write', now, true),
    ];
    const k = summarize(words, cards);
    expect([k.known, k.written]).toEqual([2, 1]);
    expect([...k.knownChars]).toEqual(['大']);
    expect(k.knownWordIds.has('p:1')).toBe(true);
  });
});

describe('streak', () => {
  const sessions = [session('2026-09-29'), session('2026-09-30'), session('2026-10-01'), session('2026-09-27')];
  it('counts consecutive completed days up to yesterday while today is not done', () => {
    expect(streak(sessions, '2026-10-02')).toBe(3);
  });
  it('includes today once it is done', () => {
    expect(streak([...sessions, session('2026-10-02')], '2026-10-02')).toBe(4);
  });
  it('ignores unfinished sessions', () => {
    expect(streak([session('2026-10-01', { completed: false })], '2026-10-02')).toBe(0);
  });
});

describe('totals', () => {
  it('adds completed steps and chest bonus stars', () => {
    const sessions = [session('a', { completedSteps: ['flashcards', 'writing'] }), session('b', { completedSteps: ['flashcards'] })];
    expect(totalStars(sessions, 3)).toBe(6);
  });
  it('lists minutes for each of the last N days, zero-filled', () => {
    expect(minutesPerDay([session('2026-10-01', { activeMs: 12 * 60_000 })], '2026-10-02', 3)).toEqual([
      { date: '2026-09-30', minutes: 0 },
      { date: '2026-10-01', minutes: 12 },
      { date: '2026-10-02', minutes: 0 },
    ]);
  });
});

describe('logs and cards', () => {
  const now = new Date(2026, 9, 2, 12);
  it('ranks trouble words by number of Again ratings', () => {
    const logs = [log('a', Rating.Again, 1), log('b', Rating.Again, 2), log('b', Rating.Again, 3), log('c', Rating.Good, 4)];
    expect(troubleWords(logs)).toEqual([{ wordId: 'b', misses: 2 }, { wordId: 'a', misses: 1 }]);
  });
  it('computes weekly accuracy for 7-day windows ending today, null when empty', () => {
    const at = new Date(2026, 9, 2, 9).getTime();
    expect(weeklyAccuracy([log('a', Rating.Good, at), log('a', Rating.Again, at)], now, 2)).toEqual([
      { weekStart: '2026-09-19', accuracy: null },
      { weekStart: '2026-09-26', accuracy: 0.5 },
    ]);
  });
  it('counts cards due tomorrow for active words only', () => {
    const words = [makeWord('a', { id: 'a' }), makeWord('b', { id: 'b', paused: true })];
    const cards = [
      makeCard('a', 'recognise', new Date(2026, 9, 3, 10)),
      makeCard('b', 'recognise', new Date(2026, 9, 3, 10)),
      makeCard('a', 'write', new Date(2026, 9, 2, 20)),
    ];
    expect(dueTomorrow(cards, words, now)).toBe(1);
  });
});

describe('earned progress never goes backwards', () => {
  it('still counts a known card that lapsed into relearning', () => {
    const now = new Date(2026, 9, 2);
    const relearning = { ...makeCard('b:大', 'recognise', now, true) };
    relearning.fsrs = { ...relearning.fsrs, state: 3 };
    const k = summarize([makeWord('大')], [relearning]);
    expect(k.known).toBe(1);
    expect(k.knownChars.has('大')).toBe(true);
  });
});

describe('weekDays', () => {
  it('Monday to Sunday of this week, filled where a lesson was finished', () => {
    const s = (date: string, over = {}) => session(date, over);
    const days = weekDays([s('2026-09-28'), s('2026-09-29'), s('2026-10-01'), s('2026-10-02', { free: true }), s('2026-09-30', { completed: false }), s('2026-09-27')], '2026-10-03');
    expect(days.map((d) => d.label).join('')).toBe('一二三四五六日');
    expect(days.map((d) => d.done)).toEqual([true, true, false, true, false, false, false]);
    expect(days.findIndex((d) => d.today)).toBe(5);
  });
  it('a Sunday is the end of its week', () => {
    expect(weekDays([], '2026-10-04').findIndex((d) => d.today)).toBe(6);
  });
});

describe('stars (deferred minor, plan 13)', () => {
  it('用一用 closes the lesson but is not a star of its own: one star per activity', async () => {
    const { totalStars } = await import('./stats');
    const s = { completedSteps: ['flashcards', 'choose', 'components', 'writing', 'speaking', 'wrapup'] } as unknown as import('../types').SessionRecord;
    expect(totalStars([s], 0)).toBe(5);
  });
});
