// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import { seededKnownCard } from './scheduler';
import type { CardKind, CardRecord, ReviewLog } from '../types';
import { fitData } from './fitData';

const at = (day: number, hour = 9) => new Date(2026, 9, day, hour).getTime();
const log = (cardId: string, day: number, rating: number, over: Partial<ReviewLog> = {}): ReviewLog =>
  ({ cardId, wordId: cardId.split(':').slice(0, 2).join(':'), kind: cardId.split(':')[2] as CardKind, at: at(day), rating: rating as ReviewLog['rating'], correct: rating > 1, ...over });

describe('fitData (spec §6.1)', () => {
  it('each review from the second on is one item: the history up to it, the first gap 0', () => {
    const logs = [
      log('b:大:recognise', 1, Rating.Good, { state: State.New, elapsedDays: 0 }),
      log('b:大:recognise', 2, Rating.Again, { state: State.Learning, elapsedDays: 1 }),
      log('b:大:recognise', 5, Rating.Good, { state: State.Relearning, elapsedDays: 3 }),
    ];
    expect(fitData(logs, [])).toEqual({ ratings: [3, 1, 3, 1, 3], deltaTs: [0, 1, 0, 1, 3], lengths: [2, 3], count: 2 });
  });
  it("only a card's first log of a day counts", () => {
    const logs = [log('b:大:hear', 1, Rating.Good), log('b:大:hear', 1, Rating.Again, { at: at(1, 10) }), log('b:大:hear', 3, Rating.Good)];
    expect(fitData(logs, [])).toMatchObject({ ratings: [3, 3], deltaTs: [0, 2], count: 1 });
  });
  it('older logs without elapsedDays: the gap is the local days since the previous kept log', () => {
    const logs = [log('b:大:meaning', 1, Rating.Good, { at: at(1, 23) }), log('b:大:meaning', 2, Rating.Good, { at: at(2, 7) }), log('b:大:meaning', 9, Rating.Hard)];
    expect(fitData(logs, []).deltaTs).toEqual([0, 1, 0, 1, 7]);
  });
  it('logs out of order are sorted by time', () => {
    const logs = [log('b:大:write', 4, Rating.Hard), log('b:大:write', 1, Rating.Good)];
    expect(fitData(logs, [])).toMatchObject({ ratings: [3, 2], deltaTs: [0, 3] });
  });
  it('a card with one review gives no item', () => {
    expect(fitData([log('b:大:recognise', 1, Rating.Good)], []).count).toBe(0);
  });
  it('leaves out cards that began from placement: by state on new logs', () => {
    const logs = [log('b:大:recognise', 10, Rating.Good, { state: State.Review, elapsedDays: 9 }), log('b:大:recognise', 20, Rating.Good, { state: State.Review })];
    expect(fitData(logs, []).count).toBe(0);
  });
  it('leaves out cards that began from placement: by the pass before the first answer on older logs', () => {
    const placed: CardRecord = { id: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', fsrs: seededKnownCard(new Date(at(1))), passed: at(1, 8) };
    const earned: CardRecord = { id: 'b:小:recognise', wordId: 'b:小', kind: 'recognise', fsrs: seededKnownCard(new Date(at(3))), passed: at(3) }; // passed on its second right day
    const logs = [log('b:大:recognise', 10, Rating.Good), log('b:大:recognise', 20, Rating.Good), log('b:小:recognise', 2, Rating.Good), log('b:小:recognise', 3, Rating.Good)];
    expect(fitData(logs, [placed, earned])).toMatchObject({ ratings: [3, 3], count: 1 });
  });
  it('leaves out Say and 说一句 cards (parent verdicts)', () => {
    const logs = [log('b:大:say', 1, Rating.Good), log('b:大:say', 3, Rating.Good), log('b:大:sentence', 1, Rating.Good), log('b:大:sentence', 3, Rating.Again)];
    expect(fitData(logs, []).count).toBe(0);
  });
  it('the count is the number of items across cards', () => {
    const logs = [1, 2, 4, 8].flatMap((d) => [log('b:大:recognise', d, Rating.Good), log('b:大:write', d, Rating.Good)]);
    expect(fitData(logs, []).count).toBe(6);
    expect(fitData(logs, []).lengths).toEqual([2, 3, 4, 2, 3, 4]);
  });
});
