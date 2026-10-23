import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import type { ReviewLog } from '../types';
import { isMadeRight, isTap, rightHistory } from './fromMemory';

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
