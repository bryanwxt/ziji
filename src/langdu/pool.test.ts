import { describe, expect, it } from 'vitest';
import { readingPool } from './pool';

const reader = (chars: string) => ({ readable: new Set(Array.from(chars)), classTerm: null });

describe('readingPool (spec 2026-10-15 §4)', () => {
  it('his school texts first, in the order added, then the built-ins, each with how much of it he reads', () => {
    const pool = readingPool([{ id: 'pp:b', title: 'b', text: '我爱你。', createdAt: 2 }, { id: 'pp:a', title: 'a', text: '我。', createdAt: 1 }], [{ id: 'p01', title: 'x', text: '我爱鬱。' }], reader('我爱'));
    expect(pool.map((p) => [p.id, p.source, Number(p.fit.toFixed(2))])).toEqual([['pp:a', 'parent', 1], ['pp:b', 'parent', 0.67], ['p01', 'ziji', 0.67]]);
  });
  it("a built-in brings its question; a parent text brings the parent's, or none", () => {
    const q = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'] as [string, string, string], answer: 1 as const };
    const pool = readingPool(
      [{ id: 'pp:a', title: 'a', text: '我。', createdAt: 1, question: q }, { id: 'pp:b', title: 'b', text: '我。', createdAt: 2 }],
      [{ id: 'p01', title: 'x', text: '我。' }],
      reader('我'),
      { p01: { ...q, sentence: 0 } },
    );
    expect(pool.map((p) => p.question)).toEqual([q, undefined, { ...q, sentence: 0 }]);
  });
});
