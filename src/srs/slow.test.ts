// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { CardKind, ReviewLog } from '../types';
import { LISTEN_MS, ratedMs, slowLines, slowMs, USE_READING_MS } from './slow';

let t = 0;
const log = (responseMs: number, over: Partial<ReviewLog> = {}): ReviewLog =>
  ({ cardId: 'b:大:recognise', wordId: 'b:大', kind: 'recognise' as CardKind, at: ++t, rating: 3, correct: true, responseMs, ...over });
const many = (n: number, ms: number, over: Partial<ReviewLog> = {}) => Array.from({ length: n }, () => log(ms, over));

describe('slowMs (spec §3.2)', () => {
  it('is twice the median of his right answers of that kind', () => {
    expect(slowMs([...many(5, 2000), ...many(6, 2500)], 'recognise')).toBe(5000);
  });
  it('an even sample uses the middle two', () => {
    expect(slowMs([...many(5, 2000), ...many(5, 3000)], 'recognise')).toBe(5000);
  });
  it('is clamped to 3–12 s', () => {
    expect(slowMs(many(12, 900), 'recognise')).toBe(3000);
    expect(slowMs(many(12, 9000), 'recognise')).toBe(12_000);
  });
  it('stays at 6 s with fewer than 10 samples', () => {
    expect(slowMs(many(9, 2000), 'recognise')).toBe(6000);
    expect(slowMs([], 'hear')).toBe(6000);
  });
  it('counts only right, timed answers of that kind', () => {
    const logs = [...many(12, 2000), ...many(20, 9000, { correct: false, rating: 1 }), ...many(20, 9000, { kind: 'hear' }), ...many(5, 9000, { responseMs: undefined })];
    expect(slowMs(logs, 'recognise')).toBe(4000);
  });
  it('uses his last 40 answers', () => {
    expect(slowMs([...many(40, 5000), ...many(40, 2000)], 'recognise')).toBe(4000);
  });
  it('leaves out guesses (faster than fastLimit)', () => {
    // 30 answers at 4 s make his guess line 1 s; ten at 300 ms are guesses and don't pull the median down
    expect(slowMs([...many(30, 4000), ...many(10, 300)], 'recognise')).toBe(8000);
  });
  it('takes listening time off Understand and reading time off 选一选/用一用', () => {
    expect(ratedMs(log(LISTEN_MS + 1500, { kind: 'understand' }))).toBe(1500);
    expect(ratedMs(log(USE_READING_MS + 2000, { kind: 'meaning', source: 'use' }))).toBe(2000);
    expect(ratedMs(log(2000, { kind: 'meaning' }))).toBe(2000);
    expect(slowMs(many(10, LISTEN_MS + 2000, { kind: 'understand' }), 'understand')).toBe(4000);
  });
  it('slowLines has one line per tap kind', () => {
    expect(slowLines(many(10, 2500))).toEqual({ recognise: 5000, meaning: 6000, hear: 6000, understand: 6000 });
  });
});
