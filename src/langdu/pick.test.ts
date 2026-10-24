import { describe, expect, it } from 'vitest';
import { EMPTY_READING, type ReadingHistory } from '../types';
import { afterRead, afterSkip, RETIRED_REST } from './history';
import { BAND_AIM, BAND_HIGH, BAND_LOW, inBand, pickOrder, pickPassage, swapTarget, type Candidate } from './pick';

const H0: ReadingHistory = EMPTY_READING;
const c = (id: string, fit: number, over: Partial<Candidate> = {}): Candidate => ({ id, source: id.startsWith('pp:') ? 'parent' : id.startsWith('gsb:') ? 'gsb' : 'ziji', fit, ...over });
const ids = (xs: Candidate[]) => xs.map((x) => x.id);
const T = '2026-10-15';

describe('the stretch band (spec 2026-10-24 §3)', () => {
  it('85–92% readable, aiming at 88%', () => {
    expect([BAND_LOW, BAND_HIGH, BAND_AIM]).toEqual([0.85, 0.92, 0.88]);
    expect([0.84, 0.85, 0.88, 0.92, 0.93].map(inBand)).toEqual([false, true, true, true, false]);
  });
  it('a new passage in band, nearest 0.88; an easy one (above 0.92) only when nothing is in band', () => {
    expect(pickPassage(H0, [c('p01', 0.92), c('p02', 0.875), c('p03', 0.85)], T)?.id).toBe('p02');
    expect(pickPassage(H0, [c('p01', 0.96), c('p02', 0.9)], T)?.id).toBe('p02');
    expect(pickPassage(H0, [c('p01', 0.96)], T)?.id).toBe('p01');
  });
  it('under 0.85 is never offered, new, due or retired; a school text is, whatever its fit', () => {
    expect(pickPassage(H0, [c('p01', 0.84)], T)).toBeNull();
    const r: ReadingHistory = { ...H0, history: { p01: { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1, lastHow: 'not-well' }, p02: { reads: 4, lastRead: '2026-06-01', rest: RETIRED_REST, q: 4 } } };
    expect(pickOrder(r, [c('p01', 0.8), c('p02', 0.7)], T)).toEqual([]);
    expect(pickPassage(H0, [c('p01', 0.88), c('pp:a', 0.5)], T)?.id).toBe('pp:a');
  });
});

describe('pickPassage (spec 2026-10-15 §4, 2026-10-24 §6)', () => {
  it('an unread school text comes first, in the order added, whatever its fit', () => {
    expect(pickPassage(H0, [c('p01', 0.88), c('pp:b', 0.5), c('pp:a', 0.95)], T)?.id).toBe('pp:b');
  });
  it('no repeats within 3 days, the same day included: a second lesson today gets another passage', () => {
    const r = afterRead(H0, 'p02', T, 'not-well');
    expect(pickPassage(r, [c('p02', 0.88), c('p03', 0.9)], T)?.id).toBe('p03');
    expect(pickPassage(r, [c('p02', 0.88)], '2026-10-17')).toBeNull();
    expect(pickPassage(r, [c('p02', 0.88)], '2026-10-18')?.id).toBe('p02'); // due after its 3-day rest
  });
  it('fresh first: a new passage in band comes before a due revisit read well', () => {
    const r = afterRead(H0, 'p01', '2026-09-01', 'well'); // rest 21: due since 09-22
    expect(ids(pickOrder({ ...r, lastKind: 'new' }, [c('p01', 0.88), c('p02', 0.9)], T))).toEqual(['p02', 'p01']);
    expect(ids(pickOrder({ ...r, lastKind: 'revisit' }, [c('p01', 0.88), c('p02', 0.9)], T))).toEqual(['p02', 'p01']);
  });
  it("…except a due 'not-well' passage, which comes first — taking turns with new ones (lastKind)", () => {
    const r = afterRead(afterRead(H0, 'p01', '2026-10-01', 'not-well'), 'p03', '2026-10-05', 'well'); // p01 due 10-04; a new one last
    const pool = [c('p01', 0.88), c('p02', 0.9), c('p03', 0.88)];
    expect(pickPassage(r, pool, T)?.id).toBe('p01');
    const after = afterRead(r, 'p01', T, 'not-well');
    expect(after.lastKind).toBe('revisit');
    const two = afterRead(afterRead(H0, 'p05', '2026-10-01', 'not-well'), 'p06', '2026-10-01', 'not-well'); // two due 'not-well'
    expect(ids(pickOrder({ ...two, lastKind: 'revisit' }, [c('p05', 0.9), c('p06', 0.9), c('p07', 0.88)], T))).toEqual(['p07', 'p05', 'p06']);
    expect(ids(pickOrder({ ...two, lastKind: 'new' }, [c('p05', 0.9), c('p06', 0.9), c('p07', 0.88)], T))).toEqual(['p05', 'p06', 'p07']);
  });
  it('a due school text takes the alternating slot: back within two picks though 30 fresh passages wait', () => {
    const fresh = Array.from({ length: 30 }, (_, i) => c(`p${String(i + 1).padStart(2, '0')}`, 0.88));
    let r: ReadingHistory = afterRead(H0, 'pp:a', '2026-08-01', 'well'); // long since due
    const pool = [c('pp:a', 0.5), ...fresh];
    const got: string[] = [];
    for (let i = 0; i < 3; i++) {
      const pick = pickPassage(r, pool, T)!;
      got.push(pick.id);
      r = afterRead(r, pick.id, T, 'well');
    }
    expect(got.slice(0, 2)).toContain('pp:a');
  });
  it('a history from before 2026-10-24 (no lastHow) waits behind new passages like one read well', () => {
    const r: ReadingHistory = { ...H0, lastKind: 'new', history: { p01: { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1 } } };
    expect(ids(pickOrder(r, [c('p01', 0.88), c('p02', 0.9)], T))).toEqual(['p02', 'p01']);
  });
  it('nothing new in band: a due revisit; then anything readable outside the gap; retired ones last, oldest first', () => {
    const r: ReadingHistory = {
      ...H0,
      lastKind: 'revisit',
      history: {
        p01: { reads: 2, lastRead: '2026-10-10', rest: 21, q: 2 }, // not due
        p02: { reads: 1, lastRead: '2026-09-01', rest: 21, q: 1 }, // due
        p03: { reads: 6, lastRead: '2026-08-01', rest: RETIRED_REST, q: 6 },
        p04: { reads: 6, lastRead: '2026-07-01', rest: RETIRED_REST, q: 6 },
      },
    };
    expect(ids(pickOrder(r, [c('p01', 0.9), c('p02', 0.9), c('p03', 0.9), c('p04', 0.9)], T))).toEqual(['p02', 'p01', 'p04', 'p03']);
  });
  it('an unread easy passage comes before one read well that is due (final review: 47 unread ones were never offered)', () => {
    const r: ReadingHistory = { ...H0, lastKind: 'new', history: { p01: { reads: 1, lastRead: '2026-09-01', rest: 21, q: 1, lastHow: 'well' } } }; // in band, due
    expect(ids(pickOrder(r, [c('p01', 0.88), c('p02', 0.99)], T))).toEqual(['p02', 'p01']);
  });
  it('resting passages come back nearest their due day first', () => {
    const r: ReadingHistory = { ...H0, history: { p01: { reads: 2, lastRead: '2026-10-12', rest: 21, q: 2 }, p02: { reads: 2, lastRead: '2026-09-25', rest: 21, q: 2 } } };
    expect(ids(pickOrder(r, [c('p01', 0.88), c('p02', 0.92)], T))).toEqual(['p02', 'p01']); // p02 is due in 1 day, p01 in 18
  });
  it('a skipped passage keeps out of the way for 3 days', () => {
    const r = afterSkip(H0, 'p02', T);
    expect(pickPassage(r, [c('p02', 0.88), c('p03', 0.91)], T)?.id).toBe('p03');
    expect(pickPassage(r, [c('p02', 0.88), c('p03', 0.91)], '2026-10-18')?.id).toBe('p02');
  });
  it('ZiJi and Global Storybooks take turns: the source with fewer passages read first, ZiJi on a tie', () => {
    const pool = [c('gsb:0001-1', 0.88), c('p05', 0.9)];
    expect(pickPassage(H0, pool, T)?.id).toBe('p05');
    const r = afterRead(H0, 'p09', '2026-10-14', 'well'); // inside its gap today
    expect(pickPassage(r, [...pool, c('p09', 0.9)], T)?.id).toBe('gsb:0001-1');
  });
  it('story parts only in order, and the next part of a started story comes first', () => {
    const s = (part: number, fit: number) => c(`gsb:0066-${part}`, fit, { story: { id: '0066', part, parts: 3 } });
    const pool = [s(2, 0.88), s(3, 0.88), s(1, 0.86), c('p05', 0.88)];
    expect(ids(pickOrder(H0, pool, T))).toEqual(['p05', 'gsb:0066-1']); // ZiJi on the tie; parts 2 and 3 wait for part 1
    const r = afterRead(H0, 'gsb:0066-1', '2026-10-10', 'well');
    expect(pickPassage({ ...r, lastKind: 'revisit' }, pool, T)?.id).toBe('gsb:0066-2'); // ahead of p05
  });
  it('an empty pool, or everything inside the gap, gives nothing', () => {
    expect(pickPassage(H0, [], T)).toBeNull();
    expect(pickPassage(afterRead(H0, 'p01', T, 'well'), [c('p01', 0.88)], T)).toBeNull();
  });
  it('history for a passage no longer in the pool (a deleted school text) is ignored', () => {
    expect(pickPassage(afterRead(H0, 'pp:gone', '2026-10-01', 'well'), [c('p01', 0.88)], T)?.id).toBe('p01');
  });
});

describe('下一篇 (spec 2026-10-15 §5, D5)', () => {
  const pool = [c('p01', 0.88), c('p02', 0.89), c('p03', 0.9)];
  it('the next in the order, with the swapped one skipped', () => {
    expect(swapTarget(H0, pool, pool[0]!, T, 0)?.id).toBe('p02');
    expect(swapTarget(afterSkip(H0, 'p01', T), pool, pool[1]!, T, 1)?.id).toBe('p03');
  });
  it('two swaps a step, never a school text, and none when nothing else is there', () => {
    expect(swapTarget(H0, pool, pool[0]!, T, 2)).toBeNull();
    expect(swapTarget(H0, [c('pp:a', 0.5), ...pool], c('pp:a', 0.5), T, 0)).toBeNull();
    expect(swapTarget(H0, [c('p01', 0.88)], c('p01', 0.88), T, 0)).toBeNull();
  });
});
