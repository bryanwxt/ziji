import { describe, expect, it } from 'vitest';
import { EMPTY_READING, type Passage } from '../types';
import { RETIRED_REST } from './history';
import { libraryRows } from './library';

const p = (id: string, term: string, source: Passage['source'] = 'ziji'): Passage => ({ id, title: id, text: '我爱妈妈。', term, source });

describe('libraryRows (spec 2026-10-15 §9)', () => {
  it('by term then id, with source, fit, reads, when it is due, retired, and often skipped', () => {
    const r = { ...EMPTY_READING, history: {
      p02: { reads: 2, lastRead: '2026-10-10', rest: 7, q: 2 },
      'gsb:0001-1': { reads: 5, lastRead: '2026-09-01', rest: RETIRED_REST, q: 5 },
      p01: { reads: 0, lastRead: null, rest: 0, q: 0, lastSkipped: '2026-10-12', skips: 3 },
    } };
    expect(libraryRows([p('p02', '二下'), p('gsb:0001-1', '二上', 'gsb'), p('p01', '二下')], r, new Set(['我', '爱']))).toEqual([
      { id: 'gsb:0001-1', title: 'gsb:0001-1', source: 'Global Storybooks', term: '二上', fit: 0.5, reads: 5, next: 'retired', oftenSkipped: false },
      { id: 'p01', title: 'p01', source: 'ZiJi', term: '二下', fit: 0.5, reads: 0, next: 'not read yet', oftenSkipped: true },
      { id: 'p02', title: 'p02', source: 'ZiJi', term: '二下', fit: 0.5, reads: 2, next: '2026-10-17', oftenSkipped: false },
    ]);
  });
  it("a passage's names never count against his fit", () => {
    const named: Passage = { id: 'gsb:0089-1', title: '卡莱', text: '卡莱爱我。', term: '三上', source: 'gsb', names: ['卡莱'] };
    expect(libraryRows([named], EMPTY_READING, new Set(['我', '爱']))[0]!.fit).toBe(1);
  });
});
