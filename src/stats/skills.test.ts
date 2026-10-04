import { describe, expect, it } from 'vitest';
import { skillAccuracy, topMissed } from './skills';

const log = (kind: 'recognise' | 'meaning' | 'write', wordId: string, correct: boolean) => ({ cardId: `${wordId}:${kind}`, wordId, kind, at: 1, rating: 3 as const, correct });

describe('skills (spec §19 part 7)', () => {
  it('counts each skill from its own source', () => {
    const acc = skillAccuracy(
      [log('recognise', 'a', true), log('recognise', 'b', false), log('meaning', 'a', true), log('write', 'a', false)],
      [{ at: 1, wordId: 'a', skill: 'use', correct: true }, { at: 1, wordId: 'b', skill: 'zibian', correct: false }],
    );
    expect(acc).toEqual({
      reading: { right: 1, total: 2 }, meaning: { right: 1, total: 1 }, use: { right: 1, total: 1 }, zibian: { right: 0, total: 1 }, writing: { right: 0, total: 1 },
    });
  });
  it('the most-missed words of one skill, worst first', () => {
    const answers = [
      { at: 1, wordId: 'a', skill: 'zibian' as const, correct: false },
      { at: 2, wordId: 'b', skill: 'zibian' as const, correct: false },
      { at: 3, wordId: 'b', skill: 'zibian' as const, correct: false },
      { at: 4, wordId: 'c', skill: 'use' as const, correct: false },
    ];
    expect(topMissed([], answers, 'zibian')).toEqual([{ wordId: 'b', misses: 2 }, { wordId: 'a', misses: 1 }]);
    expect(topMissed([log('recognise', 'x', false)], [], 'reading')).toEqual([{ wordId: 'x', misses: 1 }]);
  });
});

describe('no double counting (deferred minor, plan 14)', () => {
  it("the Meaning row leaves out the day's first 选一选 answer (it is counted under Words in use)", () => {
    const acc = skillAccuracy([{ ...log('meaning', 'a', true), source: 'use' as const }, log('meaning', 'b', false)], [{ at: 1, wordId: 'a', skill: 'use', correct: true }]);
    expect(acc.meaning).toEqual({ right: 0, total: 1 });
    expect(acc.use).toEqual({ right: 1, total: 1 });
  });
});
