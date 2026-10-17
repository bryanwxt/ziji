// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { WeekItem, WeekList } from '../types';
import { afterCheck, formsFor, isReady, isSolid, notSolid } from './readiness';

const item = (wordId: string, over: Partial<WeekItem> = {}): WeekItem => ({ wordId, text: wordId.slice(2), from: 'grid', addedStatus: 'new', ...over });
const list = (over: Partial<WeekList> = {}): WeekList => ({ id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [item('b:摘'), item('p:x')], pairs: [{ left: '摘', right: '苹果', wrong: ['喝', '跑', '唱'] }],
  fits: [{ wordId: 'p:x', sentence: '我＿', source: 'parent', wrong: ['a', 'b', 'c'] }], ...over });
const right = (at: number) => ({ at, correct: true });

describe('readiness (spec §8.3)', () => {
  it('the forms an item can be asked: read; meaning with English; fit with a confirmed row; dapei as a pair half', () => {
    const l = list();
    expect(formsFor(l.items[0]!, l)).toEqual(['read', 'dapei']);
    expect(formsFor(l.items[1]!, l, makeWord('x', { id: 'p:x', source: 'parent', meaning: 'to pick' }))).toEqual(['read', 'meaning', 'fit']);
  });
  it('before the check: ready when the latest answer in every form is right', () => {
    const l = list();
    expect(isReady(item('b:摘', { last: { read: right(1) } }), l)).toBe(false);
    expect(isReady(item('b:摘', { last: { read: right(1), dapei: right(2) } }), l)).toBe(true);
    expect(isReady(item('b:摘', { last: { read: right(1), dapei: { at: 2, correct: false } } }), l)).toBe(false);
  });
  it('after the check: its check question right and nothing wrong since', () => {
    const l = list({ check: { at: 10, day: '2026-10-21', results: { 'b:摘': { form: 'dapei', correct: true } }, done: true } });
    expect(isReady(item('b:摘'), l)).toBe(true);
    expect(isReady(item('b:摘', { last: { read: { at: 11, correct: false } } }), l)).toBe(false);
    expect(isReady(item('b:摘', { last: { read: { at: 9, correct: false } } }), l)).toBe(true); // before the check: it counted
  });
  it('afterCheck: the day after ready-by, or the check done', () => {
    expect(afterCheck(list(), new Date(2026, 9, 21, 20))).toBe(false);
    expect(afterCheck(list(), new Date(2026, 9, 22, 8))).toBe(true);
    expect(afterCheck(list({ check: { at: 0, day: '2026-10-21', results: {}, done: true } }), new Date(2026, 9, 21, 20))).toBe(true);
  });
  it('not solid after the check: missed, not yet asked, or wrong since; the oldest last answer first; nothing before the check', () => {
    const l = list({
      items: [item('b:a', { last: { read: right(50) } }), item('b:b', { last: { read: right(20) } }), item('b:c'), item('b:d', { rightDays: ['2026-10-22', '2026-10-23'] })],
      check: { at: 0, day: '2026-10-21', results: { 'b:a': { form: 'read', correct: true }, 'b:b': { form: 'read', correct: false } }, done: true },
    });
    expect(isSolid(l.items[0]!, l)).toBe(true);
    expect(isSolid(l.items[3]!, l)).toBe(true);
    expect(notSolid(l, new Date(2026, 9, 22, 9)).map((i) => i.wordId)).toEqual(['b:c', 'b:b']);
    expect(notSolid({ ...l, check: undefined }, new Date(2026, 9, 20, 9))).toEqual([]);
  });
});
