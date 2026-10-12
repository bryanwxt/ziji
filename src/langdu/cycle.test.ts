import { describe, expect, it } from 'vitest';
import type { ReadingState } from '../types';
import { PASSAGES } from '../content';
import { addExtraDay, CYCLE_DAYS, finishDay, isFirstDay, pickPassage, readingPool, type ReadingPassage } from './cycle';
const R0: ReadingState = { passageId: null, days: 0, extra: 0, lastDay: null, lastRead: {}, warmups: 0 };
const P = (id: string, source: 'parent' | 'builtin' = 'builtin'): ReadingPassage => ({ id, title: id, text: '我。', source });
describe('reading cycle', () => {
  it('parent passages come first, in the order added, then eligible built-ins', () => {
    const pool = readingPool([{ id: 'pp:b', title: 'b', text: '我。', createdAt: 2 }, { id: 'pp:a', title: 'a', text: '我。', createdAt: 1 }], [{ id: 'p01', title: 'x', text: '我。' }, { id: 'p02', title: 'y', text: '鬱。' }], new Set(['我']));
    expect(pool.map((p) => p.id)).toEqual(['pp:a', 'pp:b', 'p01']);
  });
  it('keeps a passage for 3 practice days, counting each date once, then moves on', () => {
    const pool = [P('pp:a', 'parent'), P('p01')];
    let r = { ...R0 };
    expect(pickPassage(r, pool, '2026-10-05')?.id).toBe('pp:a');
    r = finishDay(r, 'pp:a', '2026-10-05');
    r = finishDay(r, 'pp:a', '2026-10-05'); // same day twice
    expect(r.days).toBe(1);
    r = finishDay(finishDay(r, 'pp:a', '2026-10-06'), 'pp:a', '2026-10-07');
    expect(r.days).toBe(CYCLE_DAYS);
    expect(pickPassage(r, pool, '2026-10-08')?.id).toBe('p01');
  });
  it('an extra day keeps the current passage one more day, at most twice', () => {
    let r = finishDay(finishDay(finishDay({ ...R0 }, 'pp:a', '2026-10-05'), 'pp:a', '2026-10-06'), 'pp:a', '2026-10-07');
    r = addExtraDay(addExtraDay(addExtraDay(r, 'pp:a'), 'pp:a'), 'pp:a');
    expect(r.extra).toBe(2);
    expect(pickPassage(r, [P('pp:a', 'parent'), P('p01')], '2026-10-08')?.id).toBe('pp:a');
    expect(addExtraDay(r, 'p01')).toBe(r); // not the current passage: no change
  });
  it('skips built-ins read in the last 30 days, and falls back to the least recently read', () => {
    const r = { ...R0, lastRead: { p01: '2026-10-01', p02: '2026-09-01' } };
    expect(pickPassage(r, [P('p01'), P('p02')], '2026-10-05')?.id).toBe('p02');
    const all = { ...R0, lastRead: { p01: '2026-10-01', p02: '2026-10-02' } };
    expect(pickPassage(all, [P('p01'), P('p02')], '2026-10-05')?.id).toBe('p01');
  });
  it('a deleted current passage moves the cycle on; an empty pool gives nothing', () => {
    const r = { ...R0, passageId: 'pp:gone', days: 1, lastDay: '2026-10-04' };
    expect(pickPassage(r, [P('p01')], '2026-10-05')?.id).toBe('p01');
    expect(pickPassage(R0, [], '2026-10-05')).toBeNull();
  });
});
describe('the pool carries meaning questions (spec 2026-10-12 §3)', () => {
  it("a built-in brings its question; a parent text brings the parent's, or none", () => {
    const q = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'] as [string, string, string], answer: 1 as const };
    const pool = readingPool(
      [{ id: 'pp:a', title: 'a', text: '我。', createdAt: 1, question: q }, { id: 'pp:b', title: 'b', text: '我。', createdAt: 2 }],
      [{ id: 'p01', title: 'x', text: '我。' }],
      new Set(['我']),
      { p01: { ...q, sentence: 0 } },
    );
    expect(pool.map((p) => p.question)).toEqual([q, undefined, { ...q, sentence: 0 }]);
  });
});

describe('isFirstDay: a new passage, day 0, and a second lesson on day 1', () => {
  const r = (over: Partial<ReadingState>): ReadingState => ({ ...R0, ...over });
  it('a passage new to the cycle is on day 1, whatever the last one counted', () => {
    expect(isFirstDay(r({ passageId: 'pp:old', days: 3, lastDay: '2026-10-04' }), 'pp:new', '2026-10-05')).toBe(true);
    expect(isFirstDay(R0, 'p01', '2026-10-05')).toBe(true);
    expect(isFirstDay(r({ passageId: 'p01', days: 0 }), 'p01', '2026-10-05')).toBe(true);
  });
  it('a second lesson the same first day is still day 1; the next day is not', () => {
    expect(isFirstDay(r({ passageId: 'p01', days: 1, lastDay: '2026-10-05' }), 'p01', '2026-10-05')).toBe(true);
    expect(isFirstDay(r({ passageId: 'p01', days: 1, lastDay: '2026-10-04' }), 'p01', '2026-10-05')).toBe(false);
    expect(isFirstDay(r({ passageId: 'p01', days: 2, lastDay: '2026-10-05' }), 'p01', '2026-10-05')).toBe(false);
  });
});

describe('which built-ins a P1 reader gets (spec 2026-10-12 §3: ≥90% of the characters known)', () => {
  it('knowing the 一上 and 一下 reading lists makes 12 of the 20 eligible', async () => {
    const moe = (await import('../content/moe2024.json')).default as { lessons: { term: string; read: string }[] };
    const known = new Set(moe.lessons.filter((l) => l.term === '一上' || l.term === '一下').map((l) => l.read).join(''));
    expect(readingPool([], PASSAGES, known).map((p) => p.id)).toEqual(['p01', 'p02', 'p04', 'p05', 'p07', 'p08', 'p10', 'p11', 'p12', 'p13', 'p15', 'p20']);
  });
});
