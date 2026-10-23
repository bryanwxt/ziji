import { describe, expect, it } from 'vitest';
import { afterGuess, GUESS_NUDGE, isGuess } from './guess';
import type { PracticeItem } from './round';

const item = (over: Partial<PracticeItem> = {}): PracticeItem => ({ wordId: 'b:草', rung: 1, ask: 'read', grades: 'recognise', retry: false, ...over });

describe('too fast to count (real test spec 2026-10-23 §6)', () => {
  it('a right tap under 900 ms is a guess; at 901 ms it is not', () => {
    expect(isGuess(item(), { correct: true, responseMs: 899 })).toBe(true);
    expect(isGuess(item(), { correct: true, responseMs: 901 })).toBe(false);
  });
  it('a wrong tap is never a guess (it stays Again)', () => {
    expect(isGuess(item(), { correct: false, responseMs: 300 })).toBe(false);
  });
  it('连一连, 组句, a list board and the 都不对 answer are left out: they take longer anyway', () => {
    for (const ask of ['pair', 'family', 'build', 'idiomBuild', 'say', 'sentence'] as const) expect(isGuess(item({ ask }), { correct: true, responseMs: 300 }), ask).toBe(false);
    expect(isGuess(item({ ask: 'match', list: { listId: 'l', form: 'dapei', pairs: [] } }), { correct: true, responseMs: 300 })).toBe(false);
    expect(isGuess(item({ ask: 'word', none: 'answer' }), { correct: true, responseMs: 300 })).toBe(false);
    expect(isGuess(item({ ask: 'word', none: 'decoy' }), { correct: true, responseMs: 300 })).toBe(true); // the real answer, picked fast
  });
  it('Truffle nudges once, after the second guess of the lesson', () => {
    let seen = { count: 0, nudged: false };
    const nudges: boolean[] = [];
    for (const g of [true, false, true, true, true]) {
      const next = afterGuess(seen, g);
      nudges.push(next.nudge);
      seen = { count: next.count, nudged: next.nudged };
    }
    expect(nudges).toEqual([false, false, true, false, false]);
    expect(GUESS_NUDGE).toBe('慢慢看，想好再点');
  });
});
