import { describe, expect, it } from 'vitest';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, afterSkip, RETIRED_REST } from './history';
import { pickOrder, pickPassage, swapTarget, type Candidate } from './pick';

const H0: ReadingHistory = EMPTY_READING;
const c = (id: string, fit: number, over: Partial<Candidate> = {}): Candidate => ({ id, source: id.startsWith('pp:') ? 'parent' : id.startsWith('gsb:') ? 'gsb' : 'ziji', fit, ...over });
const ids = (xs: Candidate[]) => xs.map((x) => x.id);
const T = '2026-10-15';

describe('pickPassage (spec 2026-10-15 §4)', () => {
  it('an unread school text comes first, in the order added, whatever its fit', () => {
    expect(pickPassage(H0, [c('p01', 0.93), c('pp:b', 0.5), c('pp:a', 0.95)], T)?.id).toBe('pp:b');
  });
  it('a new passage in band, nearest 0.93; never one he can barely read; an easy one only when nothing is in band', () => {
    expect(pickPassage(H0, [c('p01', 0.97), c('p02', 0.925), c('p03', 0.9)], T)?.id).toBe('p02');
    expect(pickPassage(H0, [c('p01', 0.85), c('p02', 0.99)], T)?.id).toBe('p02');
    expect(pickPassage(H0, [c('p01', 0.85)], T)).toBeNull();
  });
  it('no repeats within 3 days, the same day included: a second lesson today gets another passage', () => {
    const r = afterRead(H0, 'p02', T, 'well');
    expect(pickPassage(r, [c('p02', 0.93), c('p03', 0.95)], T)?.id).toBe('p03');
    expect(pickPassage(r, [c('p02', 0.93)], '2026-10-17')).toBeNull();
    expect(pickPassage(r, [c('p02', 0.93)], '2026-10-18')?.id).toBe('p02'); // due after its 3-day rest
  });
  it('new and revisit take turns: after a new passage the most overdue revisit, after a revisit a new one', () => {
    let r = afterRead(afterRead(H0, 'p01', '2026-10-01', 'well'), 'p02', '2026-10-05', 'well'); // p01 due 10-04, p02 due 10-08
    r = afterRead(r, 'p03', '2026-10-12', 'well'); // a new one last
    const pool = [c('p01', 0.95), c('p02', 0.95), c('p03', 0.95), c('p04', 0.93)];
    expect(pickPassage(r, pool, T)?.id).toBe('p01'); // 11 days overdue; p02 7, p03 0
    const after = afterRead(r, 'p01', T, 'well');
    expect(after.lastKind).toBe('revisit');
    expect(pickPassage(after, pool, '2026-10-18')?.id).toBe('p04');
  });
  it('nothing new in band: a due revisit; then anything readable outside the gap; retired ones last, oldest first', () => {
    const r: ReadingHistory = {
      ...H0,
      lastKind: 'revisit',
      history: {
        p01: { reads: 2, lastRead: '2026-10-10', rest: 7, q: 2 }, // not due
        p02: { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1 }, // due
        p03: { reads: 6, lastRead: '2026-08-01', rest: RETIRED_REST, q: 6 },
        p04: { reads: 6, lastRead: '2026-07-01', rest: RETIRED_REST, q: 6 },
      },
    };
    expect(ids(pickOrder(r, [c('p01', 0.95), c('p02', 0.95), c('p03', 0.95), c('p04', 0.95)], T))).toEqual(['p02', 'p01', 'p04', 'p03']);
  });
  it('a skipped passage keeps out of the way for 3 days', () => {
    const r = afterSkip(H0, 'p02', T);
    expect(pickPassage(r, [c('p02', 0.93), c('p03', 0.96)], T)?.id).toBe('p03');
    expect(pickPassage(r, [c('p02', 0.93), c('p03', 0.96)], '2026-10-18')?.id).toBe('p02');
  });
  it('ZiJi and Global Storybooks take turns: the source with fewer passages read first, ZiJi on a tie', () => {
    const pool = [c('gsb:0001-1', 0.93), c('p05', 0.95)];
    expect(pickPassage(H0, pool, T)?.id).toBe('p05');
    const r = afterRead(H0, 'p09', '2026-10-14', 'well'); // inside its gap today
    expect(pickPassage(r, [...pool, c('p09', 0.95)], T)?.id).toBe('gsb:0001-1');
  });
  it('story parts only in order, and the next part of a started story comes first', () => {
    const s = (part: number, fit: number) => c(`gsb:0066-${part}`, fit, { story: { id: '0066', part, parts: 3 } });
    const pool = [s(2, 0.93), s(3, 0.93), s(1, 0.91), c('p05', 0.93)];
    expect(ids(pickOrder(H0, pool, T))).toEqual(['p05', 'gsb:0066-1']); // ZiJi on the tie; parts 2 and 3 wait for part 1
    const r = afterRead(H0, 'gsb:0066-1', '2026-10-10', 'well');
    expect(pickPassage({ ...r, lastKind: 'revisit' }, pool, T)?.id).toBe('gsb:0066-2'); // ahead of p05
  });
  it('an empty pool, or everything inside the gap, gives nothing', () => {
    expect(pickPassage(H0, [], T)).toBeNull();
    expect(pickPassage(afterRead(H0, 'p01', T, 'well'), [c('p01', 0.93)], T)).toBeNull();
  });
  it('history for a passage no longer in the pool (a deleted school text) is ignored', () => {
    expect(pickPassage(afterRead(H0, 'pp:gone', '2026-10-01', 'well'), [c('p01', 0.93)], T)?.id).toBe('p01');
  });
});

describe('下一篇 (spec 2026-10-15 §5, D5)', () => {
  const pool = [c('p01', 0.93), c('p02', 0.94), c('p03', 0.95)];
  it('the next in the order, with the swapped one skipped', () => {
    expect(swapTarget(H0, pool, pool[0]!, T, 0)?.id).toBe('p02');
    expect(swapTarget(afterSkip(H0, 'p01', T), pool, pool[1]!, T, 1)?.id).toBe('p03');
  });
  it('two swaps a step, never a school text, and none when nothing else is there', () => {
    expect(swapTarget(H0, pool, pool[0]!, T, 2)).toBeNull();
    expect(swapTarget(H0, [c('pp:a', 0.5), ...pool], c('pp:a', 0.5), T, 0)).toBeNull();
    expect(swapTarget(H0, [c('p01', 0.93)], c('p01', 0.93), T, 0)).toBeNull();
  });
});
