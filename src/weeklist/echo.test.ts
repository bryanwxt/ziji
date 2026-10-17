// @vitest-environment node
// Answers right after the card are echoes (fix round 2026-10-17): they update `last` but never count as learned; a miss still
// resets. A re-teaching card waits for a miss after the last one, so a skipped day keeps it.
import { describe, expect, it } from 'vitest';
import { allWeekLists, putWeekList } from '../store/repo';
import { freshDb } from '../test/fixtures';
import type { WeekList } from '../types';
import { noteListAnswer } from './answers';
import { reteachIds } from './plan';
import { isReady, isSolid } from './readiness';

const list: WeekList = { id: 'wl:e', name: 'E', createdAt: 0, readyBy: '2026-11-11', homeworkDue: '2026-11-13',
  items: [{ wordId: 'p:低下头', text: '低下头', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [] };
const item = async (db: Awaited<ReturnType<typeof freshDb>>) => (await allWeekLists(db))[0]!.items[0]!;

describe('echo answers', () => {
  it('before the check: a read right after the card is not ready; the same read a later day is', async () => {
    const db = await freshDb();
    await putWeekList(db, list);
    await noteListAnswer(db, 'p:低下头', 'read', true, new Date(2026, 10, 9, 9), undefined, { echo: true });
    expect((await item(db)).last?.read).toMatchObject({ correct: true, echo: true });
    expect(isReady(await item(db), list)).toBe(false);
    await noteListAnswer(db, 'p:低下头', 'read', true, new Date(2026, 10, 10, 9));
    expect(isReady(await item(db), list)).toBe(true);
  });
  it('after the check: an echo never adds a right day; a missed echo still resets', async () => {
    const db = await freshDb();
    const after = { ...list, check: { at: 1, day: '2026-11-11', done: true, results: { 'p:低下头': { form: 'read' as const, correct: false } } } };
    await putWeekList(db, { ...after, items: after.items.map((i) => ({ ...i, missedOn: '2026-11-11' })) });
    await noteListAnswer(db, 'p:低下头', 'read', true, new Date(2026, 10, 12, 9), undefined, { echo: true, reteach: true });
    await noteListAnswer(db, 'p:低下头', 'read', true, new Date(2026, 10, 13, 9), undefined, { echo: true });
    let it_ = await item(db);
    expect(it_.rightDays ?? []).toEqual([]);
    expect(it_.reteachedOn).toBe('2026-11-12');
    await noteListAnswer(db, 'p:低下头', 'read', false, new Date(2026, 10, 13, 10), undefined, { echo: true });
    it_ = await item(db);
    expect([it_.missedOn, it_.reteachedOn]).toEqual(['2026-11-13', undefined]);
    expect(isSolid(it_, after)).toBe(false);
  });
});

describe('re-teaching survives a skipped day', () => {
  const after = (over: Partial<WeekList['items'][number]>): WeekList => ({ ...list, check: { at: 1, day: '2026-11-11', done: true, results: { 'p:低下头': { form: 'read', correct: false } } },
    items: [{ ...list.items[0]!, missedOn: '2026-11-11', ...over }] });
  it('missed Wednesday, no lesson Thursday: Friday still re-teaches it', () => {
    expect(reteachIds([after({})], new Date(2026, 10, 13, 9))).toEqual(['p:低下头']);
  });
  it('re-taught since the miss: not again until a new miss', () => {
    expect(reteachIds([after({ reteachedOn: '2026-11-12' })], new Date(2026, 10, 13, 9))).toEqual([]);
    expect(reteachIds([after({ reteachedOn: '2026-11-12', missedOn: '2026-11-13' })], new Date(2026, 10, 14, 9))).toEqual(['p:低下头']);
  });
  it('a miss earlier today waits for tomorrow', () => {
    expect(reteachIds([after({ missedOn: '2026-11-13' })], new Date(2026, 10, 13, 18))).toEqual([]);
  });
});
