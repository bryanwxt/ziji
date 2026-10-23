import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import type { ReviewLog } from '../types';
import { evidenceLine, isMadeRight, isTap, rightHistory, weekFromMemory, wordEvidence } from './fromMemory';

const log = (wordId: string, kind: ReviewLog['kind'], at: number, over: Partial<ReviewLog> = {}): ReviewLog => ({ cardId: `${wordId}:${kind}`, wordId, kind, at, rating: Rating.Good, correct: true, ...over });

describe('from memory or by tapping (real test spec 2026-10-23 §7)', () => {
  it('a production is a 默写 with at most 1 miss, or a confirmed Say or 说一句 take', () => {
    expect(isMadeRight(log('b:草', 'write', 1, { misses: 1, source: 'recall' }))).toBe(true);
    expect(isMadeRight(log('b:草', 'write', 1, { misses: 2 }))).toBe(false); // 写一写's correct (≤ 3) is not right from memory
    expect(isMadeRight(log('b:草', 'say', 1))).toBe(true);
    expect(isMadeRight(log('b:草', 'sentence', 1, { correct: false }))).toBe(false);
  });
  it('a tap is a reading, meaning, hear or understand answer that no writing gave', () => {
    expect(isTap(log('b:草', 'recognise', 1))).toBe(true);
    expect(isTap(log('b:草', 'meaning', 1, { source: 'use' }))).toBe(true);
    expect(isTap(log('b:草', 'meaning', 1, { source: 'write' }))).toBe(false);
    expect(isTap(log('b:草', 'recognise', 1, { source: 'recall' }))).toBe(false);
  });
  it('each word: whether its last right answer was a tap, and when it was last produced', () => {
    const h = rightHistory([log('b:草', 'recognise', 30), log('b:草', 'write', 10, { misses: 0 }), log('b:花', 'write', 20, { misses: 0 }), log('b:花', 'recognise', 25, { correct: false, rating: Rating.Again }), log('b:山', 'hear', 5)]);
    expect(h.get('b:草')).toEqual({ tapLast: true, madeAt: 10 });
    expect(h.get('b:花')).toEqual({ tapLast: false, madeAt: 20 });
    expect(h.get('b:山')).toEqual({ tapLast: true, madeAt: 0 });
  });
});

describe('what the parent sees (real test spec 2026-10-23 §7)', () => {
  const now = new Date(2026, 9, 23, 18);
  const day = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
  it('a word’s line: its last 默写 with its date, then up to 5 latest taps, oldest first', () => {
    const logs = [
      log('b:草', 'recognise', day(15), { correct: false, rating: Rating.Again }),
      ...[16, 17, 18, 19, 20].map((d) => log('b:草', 'recognise', day(d), d === 19 ? { correct: false, rating: Rating.Again } : {})),
      log('b:草', 'write', day(22), { misses: 0, source: 'recall' }),
      log('b:草', 'recognise', day(1)), // before the 14 days: left out
    ];
    const e = wordEvidence(logs, now).get('b:草')!;
    expect(e).toEqual({ memory: { right: true, at: day(22) }, taps: [true, true, true, false, true], tapOnly: false });
    expect(evidenceLine(e)).toBe('默写 ✓ 10/22 · 点选 ✓✓✓✗✓');
  });
  it('只点选: right taps but no right production in the 14 days (a wrong 默写 doesn’t count)', () => {
    const logs = [log('b:花', 'meaning', day(20), { source: 'use' }), log('b:花', 'write', day(21), { misses: 3, correct: false, source: 'recall' }), log('b:山', 'hear', day(20)), log('b:山', 'say', day(21))];
    const ev = wordEvidence(logs, now);
    expect(ev.get('b:花')!.tapOnly).toBe(true);
    expect(evidenceLine(ev.get('b:花')!)).toBe('默写 ✗ 10/21 · 点选 ✓ · 只点选');
    expect(ev.get('b:山')!.tapOnly).toBe(false); // a confirmed Say take is a production
  });
  it('this week from memory: earlier words written (a write card he had), and how many his latest try got right', () => {
    const logs = [
      log('b:草', 'write', day(20), { misses: 0, source: 'recall', state: State.Review }),
      log('b:花', 'write', day(21), { misses: 2, correct: false, source: 'recall', state: State.Review }),
      log('b:花', 'write', day(22), { misses: 0, state: State.Review }), // 写一写 later in the week: its latest try is right
      log('b:山', 'write', day(22), { misses: 0, state: State.New }), // a new word's first writing: not an earlier word
      log('b:水', 'write', day(10), { misses: 0, state: State.Review }), // last week
    ];
    expect(weekFromMemory(logs, now)).toEqual({ words: 2, right: 2 });
  });
});
