// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import type { CardKind, ReviewLog } from '../types';
import { retention } from './retention';

const now = new Date(2026, 9, 13, 18);
const daysAgo = (d: number, hour = 9) => new Date(2026, 9, 13 - d, hour).getTime();
let n = 0;
const log = (over: Partial<ReviewLog> = {}): ReviewLog =>
  ({ cardId: `b:${++n}:recognise`, wordId: 'b:x', kind: 'recognise' as CardKind, at: daysAgo(1), rating: Rating.Good, correct: true, state: State.Review, ...over });
const many = (k: number, over: Partial<ReviewLog> = {}) => Array.from({ length: k }, () => log(over));

describe('retention (spec §5)', () => {
  it('measures until a line has 30 counted reviews', () => {
    const r = retention(many(12), now);
    expect(r.taps).toEqual({ counted: 12, remembered: 12, rate: null, note: null });
    expect(r.writing).toEqual({ counted: 0, remembered: 0, rate: null, note: null });
  });
  it('is the share not rated Again, once 30 are counted', () => {
    const r = retention([...many(27), ...many(3, { rating: Rating.Again, correct: false })], now);
    expect(r.taps.rate).toBeCloseTo(0.9);
    expect(r.taps.note).toBeNull();
  });
  it('Hard still counts as remembered', () => {
    expect(retention(many(30, { rating: Rating.Hard }), now).taps.rate).toBe(1);
  });
  it("counts only a card's first review of the day", () => {
    const card = 'b:大:recognise';
    const logs = [...many(29), log({ cardId: card, at: daysAgo(1, 9), rating: Rating.Again }), log({ cardId: card, at: daysAgo(1, 10), rating: Rating.Good })];
    expect(retention(logs, now).taps).toMatchObject({ counted: 30, remembered: 29 });
  });
  it('counts only cards that were in Review: not New, Learning, Relearning, nor older logs with no state', () => {
    const logs = [...many(30), ...many(5, { state: State.New }), ...many(5, { state: State.Learning }), ...many(5, { state: State.Relearning }), ...many(5, { state: undefined })];
    expect(retention(logs, now).taps.counted).toBe(30);
  });
  it('only the last 30 days', () => {
    expect(retention([...many(30), ...many(10, { at: daysAgo(31) })], now).taps.counted).toBe(30);
  });
  it('two lines: taps (recognise, meaning, hear, understand) and writing; Say and 说一句 are left out', () => {
    const logs = [
      ...(['recognise', 'meaning', 'hear', 'understand'] as const).flatMap((kind) => many(2, { kind })),
      ...many(3, { kind: 'write' }),
      ...many(4, { kind: 'say' }), ...many(4, { kind: 'sentence' }),
    ];
    const r = retention(logs, now);
    expect(r.taps.counted).toBe(8);
    expect(r.writing.counted).toBe(3);
  });
  it('a note under 85%', () => {
    expect(retention([...many(25), ...many(5, { rating: Rating.Again })], now).taps.note).toBe('low'); // 83%
  });
  it('a note over 95%', () => {
    expect(retention([...many(39), ...many(1, { rating: Rating.Again })], now).taps.note).toBe('high'); // 97.5%
  });
  it('no note at exactly 85% or 95%', () => {
    expect(retention([...many(34), ...many(6, { rating: Rating.Again })], now).taps.note).toBeNull(); // 85%
    expect(retention([...many(38), ...many(2, { rating: Rating.Again })], now).taps.note).toBeNull(); // 95%
  });
});
