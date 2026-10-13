import { afterEach, describe, expect, it } from 'vitest';
import type { Card } from 'ts-fsrs';
import { default_w, fsrs, generatorParameters, get_fuzz_range, Rating, State } from 'ts-fsrs';
import { isKnown, localDayGap, newCard, review, schedulerParams, seededKnownCard, setSchedulerParams, snapshot, toRating, validParams } from './scheduler';

const now = new Date(2026, 9, 2, 9, 0);

describe('toRating', () => {
  it('maps writing misses', () => {
    expect(toRating({ kind: 'write', totalMisses: 0 })).toBe(Rating.Good);
    expect(toRating({ kind: 'write', totalMisses: 1 })).toBe(Rating.Hard);
    expect(toRating({ kind: 'write', totalMisses: 3 })).toBe(Rating.Hard);
    expect(toRating({ kind: 'write', totalMisses: 4 })).toBe(Rating.Again);
  });
  // SRS tuning spec §3.1: every row of the table, for every tap kind
  for (const kind of ['recognise', 'meaning', 'hear', 'understand'] as const) {
    it(`${kind}: wrong is Again, produced or not`, () => {
      expect(toRating({ kind, correct: false, responseMs: 500, produced: false, state: State.Review })).toBe(Rating.Again);
      expect(toRating({ kind, correct: false, responseMs: 500, produced: true, state: State.Review })).toBe(Rating.Again);
    });
    it(`${kind}: right and slow is Hard, produced or not`, () => {
      expect(toRating({ kind, correct: true, responseMs: 6001, produced: false, state: State.Review })).toBe(Rating.Hard);
      expect(toRating({ kind, correct: true, responseMs: 6001, produced: true, state: State.Review })).toBe(Rating.Hard);
    });
    it(`${kind}: right is Hard until produced, then Good`, () => {
      expect(toRating({ kind, correct: true, responseMs: 6000, produced: false, state: State.Review })).toBe(Rating.Hard);
      expect(toRating({ kind, correct: true, responseMs: 6000, produced: true, state: State.Review })).toBe(Rating.Good);
    });
  }
  for (const kind of ['recognise', 'meaning', 'hear', 'understand'] as const) {
    it(`${kind}: right, not slow, not produced: Hard when New or Review, Good when Learning or Relearning (ts-fsrs learning steps repeat on Hard)`, () => {
      const right = (state: State) => toRating({ kind, correct: true, responseMs: 1500, produced: false, state });
      expect(right(State.New)).toBe(Rating.Hard);
      expect(right(State.Review)).toBe(Rating.Hard);
      expect(right(State.Learning)).toBe(Rating.Good);
      expect(right(State.Relearning)).toBe(Rating.Good);
    });
    it(`${kind}: slow stays Hard and wrong stays Again in a learning state`, () => {
      for (const state of [State.Learning, State.Relearning]) {
        expect(toRating({ kind, correct: true, responseMs: 6001, produced: true, state })).toBe(Rating.Hard);
        expect(toRating({ kind, correct: false, responseMs: 500, produced: false, state })).toBe(Rating.Again);
      }
    });
  }
  it('his own slow line replaces the 6 s default (spec §3.2)', () => {
    expect(toRating({ kind: 'recognise', correct: true, responseMs: 4000, produced: true, state: State.Review, slowMs: 3500 })).toBe(Rating.Hard);
    expect(toRating({ kind: 'recognise', correct: true, responseMs: 9000, produced: true, state: State.Review, slowMs: 9500 })).toBe(Rating.Good);
  });
});

describe('a tapped-only card, answered right once a day (final review C1)', () => {
  const walk = (kind: 'recognise' | 'meaning' | 'hear' | 'understand', start?: Card) => {
    let card = start ?? newCard(now);
    for (let day = 1; day <= 14; day++) {
      const at = new Date(now.getTime() + (day - 1) * 86_400_000);
      card = review(card, toRating({ kind, correct: true, responseMs: 1800, produced: false, state: card.state }), at);
      if (card.state === State.Review) return day;
    }
    return null;
  };
  for (const kind of ['recognise', 'meaning', 'hear', 'understand'] as const) {
    it(`${kind}: reaches Review within 3 days`, () => {
      const day = walk(kind);
      console.info(`C1 walk: ${kind} tapped-only reaches Review on day ${day}`);
      expect(day).not.toBeNull();
      expect(day!).toBeLessThanOrEqual(3);
    });
  }
  it('a Review-state card, not produced, still rates Hard', () => {
    const card = review(review(newCard(now), Rating.Good, now), Rating.Good, new Date(now.getTime() + 86_400_000));
    expect(card.state).toBe(State.Review);
    expect(toRating({ kind: 'recognise', correct: true, responseMs: 1800, produced: false, state: card.state })).toBe(Rating.Hard);
  });
  it('a Relearning card answered right leaves Relearning', () => {
    const known = seededKnownCard(now);
    const lapsed = review(known, Rating.Again, known.due);
    expect(lapsed.state).toBe(State.Relearning);
    const back = review(lapsed, toRating({ kind: 'recognise', correct: true, responseMs: 1800, produced: false, state: lapsed.state }), new Date(lapsed.due.getTime() + 86_400_000));
    expect(back.state).toBe(State.Review);
  });
});

describe('review', () => {
  it('graduates a new card to known after two good reviews', () => {
    const first = review(newCard(now), Rating.Good, now);
    expect(first.due.getTime()).toBeGreaterThan(now.getTime());
    expect(isKnown(first)).toBe(false);
    const second = review(first, Rating.Good, first.due);
    expect(second.state).toBe(State.Review);
    expect(isKnown(second)).toBe(true);
  });
  it('a lapse makes a known card not known', () => {
    const known = seededKnownCard(now);
    expect(isKnown(review(known, Rating.Again, known.due))).toBe(false);
  });
});

describe('fuzz (spec §3.3)', () => {
  it('a long interval lands inside ts-fsrs fuzz range around the unfuzzed one, the same day every time', () => {
    const plain = fsrs(generatorParameters({ enable_fuzz: false }));
    const c = seededKnownCard(now, 20);
    const at = c.due;
    const exact = plain.next(c, at, Rating.Good).card.scheduled_days;
    const fuzzed = review(c, Rating.Good, at);
    const { min_ivl, max_ivl } = get_fuzz_range(exact, 20, 36500);
    expect(fuzzed.scheduled_days).toBeGreaterThanOrEqual(min_ivl);
    expect(fuzzed.scheduled_days).toBeLessThanOrEqual(max_ivl);
    expect(review(c, Rating.Good, at).due.getTime()).toBe(fuzzed.due.getTime()); // seeded by card and time: repeatable
  });
  it('spreads words learned together over more than one day', () => {
    const plain = fsrs(generatorParameters({ enable_fuzz: false }));
    const days = new Set<number>();
    const unfuzzed = new Set<number>();
    for (let i = 0; i < 12; i++) {
      const c = { ...seededKnownCard(now, 20), difficulty: 5 + i * 0.01 }; // twelve near-identical words
      days.add(review(c, Rating.Good, c.due).scheduled_days);
      unfuzzed.add(plain.next(c, c.due, Rating.Good).card.scheduled_days);
    }
    expect(unfuzzed.size).toBe(1); // without fuzz they would all come back on one day
    expect(days.size).toBeGreaterThan(1);
  });
});

describe('fitted parameters (spec §6.2)', () => {
  afterEach(() => setSchedulerParams(null));
  const fitted = default_w.map((x, i) => (i === 0 ? x * 3 : x)); // a longer first interval after Again
  it('validParams takes 21 finite numbers only', () => {
    expect(validParams([...default_w])).toBe(true);
    expect(validParams(fitted)).toBe(true);
    expect(validParams(default_w.slice(0, 19))).toBe(false);
    expect(validParams([...default_w.slice(0, 20), Number.NaN])).toBe(false);
    expect(validParams('nope')).toBe(false);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, '1.5']) expect(validParams([...default_w.slice(0, 20), bad])).toBe(false); // 21 long, one bad entry
    expect(validParams(undefined)).toBe(false);
  });
  it('the scheduler uses valid fitted parameters', () => {
    setSchedulerParams(fitted);
    expect(schedulerParams()[0]).toBeCloseTo(fitted[0]!, 3);
    const a = review(newCard(now), Rating.Again, now);
    setSchedulerParams(null);
    const b = review(newCard(now), Rating.Again, now);
    expect(a.stability).toBeGreaterThan(b.stability);
  });
  it('falls back to the defaults on invalid parameters', () => {
    setSchedulerParams([1, 2, 3]);
    expect([...schedulerParams()]).toEqual([...default_w]);
    setSchedulerParams([...default_w.slice(0, 20), Number.POSITIVE_INFINITY]);
    expect([...schedulerParams()]).toEqual([...default_w]);
  });
});

describe('snapshot (spec §4)', () => {
  it('a new card: state New, no gap, no interval', () => {
    expect(snapshot(newCard(now), now)).toEqual({ state: State.New, elapsedDays: 0, scheduledDays: 0 });
  });
  it('a card in review: whole local days since its last review, and the interval it was on', () => {
    const c = seededKnownCard(new Date(2026, 9, 2, 23, 30), 14);
    expect(snapshot(c, new Date(2026, 9, 3, 0, 15))).toEqual({ state: State.Review, elapsedDays: 1, scheduledDays: 14 }); // 45 minutes, but a new day
    expect(snapshot(c, new Date(2026, 9, 2, 23, 50)).elapsedDays).toBe(0);
  });
  it('localDayGap counts calendar days, not 24-hour blocks', () => {
    expect(localDayGap(new Date(2026, 9, 2, 8), new Date(2026, 9, 9, 7))).toBe(7);
  });
});

describe('seededKnownCard', () => {
  it('is known and due in 14 days', () => {
    const c = seededKnownCard(now);
    expect(isKnown(c)).toBe(true);
    expect(c.due.getTime() - now.getTime()).toBe(14 * 86_400_000);
  });
  it('can be due on another day, with stability to match', () => {
    const c = seededKnownCard(now, 21);
    expect(c.due.getTime() - now.getTime()).toBe(21 * 86_400_000);
    expect(c.stability).toBe(21);
    expect(c.scheduled_days).toBe(21);
  });
  it('a good review at due date pushes it further out', () => {
    const c = seededKnownCard(now);
    const next = review(c, Rating.Good, c.due);
    expect(next.due.getTime() - c.due.getTime()).toBeGreaterThan(14 * 86_400_000);
  });
});
