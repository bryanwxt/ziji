import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { createSessionRecord } from '../session/runner';
import { makeCard, makeWord } from '../test/fixtures';
import type { ReviewLog, SessionPlan, SessionRecord } from '../types';
import { dueTomorrow, minutesPerDay, starsOf, streak, streakDays, summarize, totalStars, troubleWords, weekDays, weeklyAccuracy } from './stats';

const emptyPlan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const session = (date: string, over: Partial<SessionRecord> = {}): SessionRecord => ({ ...createSessionRecord(emptyPlan, date, 0), completed: true, ...over });
const log = (wordId: string, rating: ReviewLog['rating'], at: number): ReviewLog => ({
  cardId: `${wordId}:recognise`, wordId, kind: 'recognise', at, rating, correct: rating !== Rating.Again,
});

describe('summarize', () => {
  it('counts the characters in words whose reading passed, and written cards', () => {
    const now = new Date(2026, 9, 2);
    const words = [makeWord('大'), makeWord('朋友', { id: 'p:1' }), makeWord('人')];
    const cards = [
      makeCard('b:大', 'recognise', now, true),
      makeCard('p:1', 'recognise', now, true),
      makeCard('b:人', 'recognise', now, false),
      makeCard('b:大', 'write', now, true),
    ];
    const k = summarize(words, cards);
    // a character is recognised when any word with it has passed Read: 朋友 brings 朋 and 友 (spec 2026-10-06 §3.3)
    expect([k.known, k.written]).toEqual([3, 1]);
    expect([...k.knownChars].sort()).toEqual(['大', '朋', '友'].sort());
    expect(k.knownWordIds.has('p:1')).toBe(true);
    expect([...k.begunTexts].sort()).toEqual(['人', '大', '朋友'].sort()); // begun: a Read or Hear card, passed or not (real test spec §5)
  });
  it("records each known character's reading from words whose pinyin lines up one syllable per character (final review I1)", () => {
    const now = new Date(2026, 9, 2);
    const words = [
      makeWord('一只', { id: 'p:1', pinyin: 'yì zhī' }),
      makeWord('杯子', { id: 'p:2', pinyin: 'bēi zi' }),
      makeWord('哪儿', { id: 'p:3', pinyin: 'nǎr' }),
      makeWord('只有', { id: 'p:4', pinyin: 'zhǐ yǒu' }),
    ];
    const k = summarize(words, ['p:1', 'p:2', 'p:3'].map((id) => makeCard(id, 'recognise', now, true)));
    expect(Object.fromEntries([...k.knownReadings].map(([ch, s]) => [ch, [...s]]))).toEqual({ 一: ['yì'], 只: ['zhī'], 杯: ['bēi'], 子: ['zi'] });
    expect(k.knownChars.has('哪')).toBe(true); // 哪儿 nǎr: known, no reading on record
  });
});

describe('streak', () => {
  // Mon 09-28 missed: that week's rest day, so Sun 09-27 still counts (spec 2026-10-11 §5)
  const sessions = [session('2026-09-29'), session('2026-09-30'), session('2026-10-01'), session('2026-09-27')];
  it('counts completed days up to yesterday while today is not done, over one rest day', () => {
    expect(streakDays(sessions, '2026-10-02')).toEqual({ count: 4, rest: ['2026-09-28'] });
  });
  it('includes today once it is done', () => {
    expect(streak([...sessions, session('2026-10-02')], '2026-10-02')).toBe(5);
  });
  it('ignores unfinished sessions', () => {
    expect(streak([session('2026-10-01', { completed: false })], '2026-10-02')).toBe(0);
  });
});

describe('the rest day (spec 2026-10-11 §5)', () => {
  const s = (date: string) => session(date);
  it('one missed day a week is forgiven, and does not add to the count', () => {
    expect(streakDays([s('2026-09-29'), s('2026-10-01')], '2026-10-02')).toEqual({ count: 2, rest: ['2026-09-30'] });
  });
  it('a second missed day in the same week ends the streak', () => {
    expect(streakDays([s('2026-09-28'), s('2026-10-01')], '2026-10-02')).toEqual({ count: 1, rest: [] });
  });
  it('each calendar week has its own: a missed Sunday and Monday are both forgiven', () => {
    expect(streakDays([s('2026-09-26'), s('2026-09-29')], '2026-09-30')).toEqual({ count: 2, rest: ['2026-09-28', '2026-09-27'] });
  });
  it('a missed day with no lesson before it is not a rest day', () => {
    expect(streakDays([], '2026-10-02')).toEqual({ count: 0, rest: [] });
    expect(streakDays([s('2026-10-01')], '2026-10-02')).toEqual({ count: 1, rest: [] });
  });
  it('the week strip marks the rest day', () => {
    const days = weekDays([s('2026-09-28'), s('2026-09-30')], '2026-10-01');
    expect(days.map((d) => d.rest)).toEqual([false, true, false, false, false, false, false]);
  });
});

describe('totals', () => {
  it("adds each lesson's stars and chest bonus stars (spec 2026-10-11 §5)", () => {
    const sessions = [session('2026-10-12', { completedSteps: ['practice', 'writing'], stars: 4 }), session('2026-10-13', { completedSteps: ['practice'], stars: 1 })];
    expect(totalStars(sessions, 3)).toBe(8);
  });
  it('a lesson from before mastery stars keeps the stars its steps earned; a new lesson not yet finished has none', () => {
    const { stars: _none, ...old } = session('2026-10-06', { completedSteps: ['newwords', 'practice', 'writing'] });
    expect(totalStars([old, session('2026-10-12', { completed: false, completedSteps: ['newwords', 'practice'] })], 0)).toBe(4);
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
    const s = { date: '2026-10-05', completedSteps: ['flashcards', 'choose', 'components', 'writing', 'speaking', 'wrapup'] } as unknown as import('../types').SessionRecord;
    expect(totalStars([s], 0)).toBe(5);
  });
  it('lessons from before the change keep the star their 用一用 earned, so his total never goes down', async () => {
    const { totalStars } = await import('./stats');
    const steps = ['flashcards', 'choose', 'components', 'writing', 'speaking', 'wrapup'];
    const old = { date: '2026-10-04', completedSteps: steps } as unknown as import('../types').SessionRecord;
    expect(totalStars([old], 0)).toBe(6);
  });
});

it('练一练 counts two stars (it replaces three starred steps), so a full lesson stays at 5', () => {
  expect(starsOf(['newwords', 'practice', 'writing', 'speaking'])).toBe(5);
});

describe('summarize: confirmed characters (parent decision 2026-10-25)', () => {
  const now = new Date(2026, 9, 25);
  const words = [makeWord('大'), makeWord('朋友', { id: 'p:1' }), makeWord('人'), makeWord('山')];
  const placed = (id: string) => ({ ...makeCard(id, 'recognise', now, true), placed: true as const });
  it('counts only words learned in lessons or rechecked right; placement guesses stay in known', () => {
    const cards = [
      makeCard('p:1', 'recognise', now, true), // learned in a lesson: never placed
      placed('b:大'), // a placement guess not yet rechecked
      makeCard('b:人', 'recognise', now, true), // a placement guess its first recheck got right: `placed` is cleared
      makeCard('b:山', 'recognise', now, false), // not passed
    ];
    const k = summarize(words, cards);
    expect(k.known).toBe(4); // 大 朋 友 人: reading support still has the guesses
    expect([...k.confirmedChars].sort()).toEqual(['人', '朋', '友'].sort());
    expect(k.confirmed).toBe(3);
  });
  it('a missed first recheck (the cards go) lowers known but never confirmed', () => {
    const before = summarize(words, [makeCard('p:1', 'recognise', now, true), placed('b:大')]);
    const after = summarize(words, [makeCard('p:1', 'recognise', now, true)]);
    expect([before.known, after.known]).toEqual([3, 2]);
    expect([before.confirmed, after.confirmed]).toEqual([2, 2]);
  });
  it('a passed card he never answered (a placement guess the ladder migration stamped) is not confirmed (review I2)', () => {
    const cards = [makeCard('p:1', 'recognise', now, true), makeCard('b:人', 'recognise', now, true)];
    const k = summarize(words, cards, new Set(['p:1:recognise'])); // only 朋友 has a reading answer
    expect(k.known).toBe(3);
    expect([...k.confirmedChars].sort()).toEqual(['朋', '友'].sort());
  });
});
