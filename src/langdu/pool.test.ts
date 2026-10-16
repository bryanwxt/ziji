import { describe, expect, it } from 'vitest';
import { readingPool } from './pool';

const reader = (chars: string) => ({ readable: new Set(Array.from(chars)), classTerm: null });

describe('readingPool (spec 2026-10-15 §4)', () => {
  it('his school texts first, in the order added, then the built-ins, each with how much of it he reads', () => {
    const pool = readingPool([{ id: 'pp:b', title: 'b', text: '我爱你。', createdAt: 2 }, { id: 'pp:a', title: 'a', text: '我。', createdAt: 1 }], [{ id: 'p01', title: 'x', text: '我爱鬱。', term: '一上', source: 'ziji' }], reader('我爱'));
    expect(pool.map((p) => [p.id, p.source, Number(p.fit.toFixed(2))])).toEqual([['pp:a', 'parent', 1], ['pp:b', 'parent', 0.67], ['p01', 'ziji', 0.67]]);
  });
  it("a built-in brings its questions; a parent text brings the parent's one, or none", () => {
    const q = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'] as [string, string, string], answer: 1 as const };
    const pool = readingPool(
      [{ id: 'pp:a', title: 'a', text: '我。', createdAt: 1, question: q }, { id: 'pp:b', title: 'b', text: '我。', createdAt: 2 }],
      [{ id: 'p01', title: 'x', text: '我。', term: '一上', source: 'ziji' }],
      reader('我'),
      { p01: [{ ...q, sentence: 0 }, { ...q, q: '谁爱我？' }] },
    );
    expect(pool.map((p) => p.questions)).toEqual([[q], undefined, [{ ...q, sentence: 0 }, { ...q, q: '谁爱我？' }]]);
  });
  it('a built-in brings what the step shows (names, 生词, picture, story, credit); its names leave its fit', () => {
    const credit = { title: '好', text: 'A', illustration: 'B', translation: 'C', licence: 'CC BY 3.0' as const, adapted: false, source: 'https://x' };
    const [p] = readingPool([], [{ id: 'gsb:0001-1', title: '好', text: '卡莱爱我。', term: '一下', source: 'gsb', names: ['卡莱'], image: 'passages/gsb-0001-1.webp', story: { id: '0001', part: 1, parts: 1 }, credit }], reader('爱我'), {}); // no questions: the step's parts only
    expect(p).toEqual({ id: 'gsb:0001-1', title: '好', text: '卡莱爱我。', term: '一下', source: 'gsb', fit: 1, names: ['卡莱'], image: 'passages/gsb-0001-1.webp', story: { id: '0001', part: 1, parts: 1 }, credit });
  });
  it('no built-in more than a term past his class (spec §3)', () => {
    const b = (id: string, term: string) => ({ id, title: id, text: '我。', term, source: 'ziji' as const });
    expect(readingPool([], [b('p01', '二下'), b('p02', '三上'), b('p03', '三下')], { readable: new Set(['我']), classTerm: '二下' }).map((p) => p.id)).toEqual(['p01', 'p02']);
  });
});
