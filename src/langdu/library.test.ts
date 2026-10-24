import { describe, expect, it } from 'vitest';
import { EMPTY_READING, type Passage, type PassageAnswer, type ReadingHistory } from '../types';
import { RETIRED_REST } from './history';
import { answersLine, kindShares, libraryRows } from './library';

const p = (id: string, term: string, source: Passage['source'] = 'ziji'): Passage => ({ id, title: id, text: '我爱妈妈。', term, source });

describe('libraryRows (spec 2026-10-15 §9)', () => {
  it('by term then id, with source, fit, reads, when it is due, retired, and often skipped', () => {
    const r = { ...EMPTY_READING, history: {
      p02: { reads: 2, lastRead: '2026-10-10', rest: 7, q: 2 },
      'gsb:0001-1': { reads: 5, lastRead: '2026-09-01', rest: RETIRED_REST, q: 5 },
      p01: { reads: 0, lastRead: null, rest: 0, q: 0, lastSkipped: '2026-10-12', skips: 3 },
    } };
    expect(libraryRows([p('p02', '二下'), p('gsb:0001-1', '二上', 'gsb'), p('p01', '二下')], r, new Set(['我', '爱']))).toEqual([
      { id: 'gsb:0001-1', title: 'gsb:0001-1', source: 'Global Storybooks', term: '二上', fit: 0.5, reads: 5, qs: '—', next: 'retired', oftenSkipped: false },
      { id: 'p01', title: 'p01', source: 'ZiJi', term: '二下', fit: 0.5, reads: 0, qs: '—', next: 'not read yet', oftenSkipped: true },
      { id: 'p02', title: 'p02', source: 'ZiJi', term: '二下', fit: 0.5, reads: 2, qs: '—', next: '2026-10-17', oftenSkipped: false },
    ]);
  });
  it("a passage's names never count against his fit", () => {
    const named: Passage = { id: 'gsb:0089-1', title: '卡莱', text: '卡莱爱我。', term: '三上', source: 'gsb', names: ['卡莱'] };
    expect(libraryRows([named], EMPTY_READING, new Set(['我', '爱']))[0]!.fit).toBe(1);
  });
});

describe("what the parent sees of his questions (spec 2026-10-24 §8)", () => {
  const a = (kind: PassageAnswer['kind'], correct: boolean, at: string): PassageAnswer => ({ kind, correct, at });
  it("each passage's last read: right of asked, 'Qs 2/3'; an earlier read's answers don't count", () => {
    const r: ReadingHistory = { ...EMPTY_READING, history: { p01: { reads: 2, lastRead: '2026-10-10', rest: 21, q: 2, answers: [a('why', false, '2026-10-01'), a('why', false, '2026-10-10'), a('word', true, '2026-10-10'), a('fact', true, '2026-10-10')] } } };
    expect(libraryRows([p('p01', '二下')], r, new Set())[0]!.qs).toBe('2/3');
  });
  it('the last 14 days by kind, in order 为什么 词义 顺序 主要意思 事实, kinds he met only; the weakest marked', () => {
    const r: ReadingHistory = { ...EMPTY_READING, history: {
      p01: { reads: 1, lastRead: '2026-10-20', rest: 21, q: 1, answers: [a('why', true, '2026-10-20'), a('main', false, '2026-10-20'), a('fact', true, '2026-10-20')] },
      p02: { reads: 1, lastRead: '2026-10-11', rest: 21, q: 1, answers: [a('why', false, '2026-10-11'), a('main', true, '2026-10-11'), a('word', true, '2026-10-11')] }, // 13 days ago: in
      p03: { reads: 1, lastRead: '2026-10-01', rest: 21, q: 1, answers: [a('order', false, '2026-10-01')] }, // 23 days ago: out
    } };
    expect(kindShares(r, '2026-10-24')).toEqual([
      { kind: 'why', label: '为什么', right: 1, total: 2, weakest: true }, // ties 主要意思 at 1/2: the first is the weakest
      { kind: 'word', label: '词义', right: 1, total: 1, weakest: false },
      { kind: 'main', label: '主要意思', right: 1, total: 2, weakest: false },
      { kind: 'fact', label: '事实', right: 1, total: 1, weakest: false },
    ]);
    expect(kindShares(EMPTY_READING, '2026-10-24')).toEqual([]);
    expect(kindShares({ ...EMPTY_READING, history: { p01: { reads: 1, lastRead: '2026-10-20', rest: 3, q: 1, answers: [a('why', false, '2026-10-20')] } } }, '2026-10-24')).toEqual([{ kind: 'why', label: '为什么', right: 0, total: 1, weakest: false }]); // one kind: nothing to compare
  });
  it('no kind is marked weakest when every share is equal', () => {
    const r: ReadingHistory = { ...EMPTY_READING, history: { p01: { reads: 1, lastRead: '2026-10-20', rest: 3, q: 1, answers: [a('why', true, '2026-10-20'), a('main', true, '2026-10-20'), a('fact', true, '2026-10-20')] } } };
    expect(kindShares(r, '2026-10-24').map((x) => x.weakest)).toEqual([false, false, false]);
  });
  it("qs follows the newest answer's day: a later 多读一遍 doesn't blank it, and an earlier day's answers aren't pooled", () => {
    const base = { reads: 3, rest: 21, q: 3 };
    const later: ReadingHistory = { ...EMPTY_READING, history: { p01: { ...base, lastRead: '2026-10-12', answers: [a('why', true, '2026-10-10'), a('word', false, '2026-10-10')] } } }; // re-read on 10-12 asked nothing
    expect(libraryRows([p('p01', '二下')], later, new Set())[0]!.qs).toBe('1/2');
    const two: ReadingHistory = { ...EMPTY_READING, history: { p01: { ...base, lastRead: '2026-10-12', answers: [a('why', false, '2026-10-10'), a('why', true, '2026-10-12'), a('word', true, '2026-10-12')] } } };
    expect(libraryRows([p('p01', '二下')], two, new Set())[0]!.qs).toBe('2/2'); // the newest answers' day only
  });
  it("a take's answers for Listen & confirm", () => {
    expect(answersLine([{ kind: 'why', correct: false, picked: '球掉进河里' }, { kind: 'order', correct: true, picked: '找来竹子' }, { kind: 'fact', correct: true, picked: '河里' }])).toBe('Questions: 2/3 right · missed 为什么 (picked 球掉进河里)');
    expect(answersLine([{ correct: false, picked: '小马' }])).toBe('Questions: 0/1 right · missed (picked 小马)');
  });
});
