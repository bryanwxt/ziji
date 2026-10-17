// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allWeekLists, putWeekList, updateWeekList } from '../store/repo';
import { freshDb } from '../test/fixtures';
import type { WeekList } from '../types';
import { formOf, noteListAnswer } from './answers';
import { isReady, isSolid, notSolid } from './readiness';

const base: WeekList = { id: 'wl:1', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'b:a', text: 'a', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [] };
const first = async (db: Awaited<ReturnType<typeof freshDb>>) => (await allWeekLists(db))[0]!;

describe('list answers and readiness (spec §8.3, §2.1)', () => {
  it('notes the latest answer per form; ready when every form it can be asked is right', async () => {
    const db = await freshDb();
    await putWeekList(db, base);
    await noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 19, 9));
    const l = await first(db);
    expect(l.items[0]!.last?.read?.correct).toBe(true);
    expect(l.items[0]!.rightDays).toBeUndefined(); // before the check, days aren't counted
    expect(isReady(l.items[0]!, l)).toBe(true); // no English, no fit row, no pair: read is all
  });
  it('after the check: a miss marks missedOn; solid after right answers on two days with no miss since', async () => {
    const db = await freshDb();
    await putWeekList(db, { ...base, check: { at: 0, day: '2026-10-21', results: { 'b:a': { form: 'read', correct: false } }, done: true } });
    await noteListAnswer(db, 'b:a', 'read', false, new Date(2026, 9, 21, 18));
    await noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 22, 18));
    let l = await first(db);
    expect([l.items[0]!.missedOn, isSolid(l.items[0]!, l)]).toEqual(['2026-10-21', false]);
    expect(notSolid(l, new Date(2026, 9, 22, 19)).map((i) => i.wordId)).toEqual(['b:a']);
    await noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 22, 19)); // the same day again: still one day
    expect(isSolid((await first(db)).items[0]!, await first(db))).toBe(false);
    await noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 23, 18));
    l = await first(db);
    expect(isSolid(l.items[0]!, l)).toBe(true);
  });
  it('a miss in the check itself (not yet done) counts: re-taught the next day', async () => {
    const db = await freshDb();
    const at = new Date(2026, 9, 21, 17).getTime();
    await putWeekList(db, { ...base, check: { at, day: '2026-10-21', results: { 'b:a': { form: 'read', correct: false } }, done: false } });
    await noteListAnswer(db, 'b:a', 'read', false, new Date(2026, 9, 21, 17, 1));
    expect((await first(db)).items[0]!.missedOn).toBe('2026-10-21');
  });
  it('a right answer on the day of a miss does not count toward solid', async () => {
    const db = await freshDb();
    await putWeekList(db, { ...base, check: { at: 0, day: '2026-10-21', results: { 'b:a': { form: 'read', correct: false } }, done: true } });
    await noteListAnswer(db, 'b:a', 'read', false, new Date(2026, 9, 22, 9));
    await noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 22, 10));
    await noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 23, 10));
    const l = await first(db);
    expect([l.items[0]!.rightDays, isSolid(l.items[0]!, l)]).toEqual([['2026-10-23'], false]);
  });
  it('two answers at once both land; so does a field update beside them', async () => {
    const db = await freshDb();
    await putWeekList(db, { ...base, items: [...base.items, { wordId: 'b:b', text: 'b', from: 'grid', addedStatus: 'new' }] });
    await Promise.all([
      noteListAnswer(db, 'b:a', 'read', true, new Date(2026, 9, 19, 9)),
      noteListAnswer(db, 'b:b', 'read', false, new Date(2026, 9, 19, 9)),
      updateWeekList(db, 'wl:1', (l) => ({ ...l, name: 'Renamed' })),
    ]);
    const l = await first(db);
    expect([l.name, l.items[0]!.last?.read?.correct, l.items[1]!.last?.read?.correct]).toEqual(['Renamed', true, false]);
  });
  it('updateWeekList: nothing for a list that is gone', async () => {
    const db = await freshDb();
    expect(await updateWeekList(db, 'wl:x', (l) => l)).toBeUndefined();
  });
  it('a later miss undoes solid; two more right days restore it', async () => {
    const db = await freshDb();
    await putWeekList(db, { ...base, check: { at: 0, day: '2026-10-21', results: { 'b:a': { form: 'read', correct: true } }, done: true } });
    let l = await first(db);
    expect(isSolid(l.items[0]!, l)).toBe(true);
    await noteListAnswer(db, 'b:a', 'meaning', false, new Date(2026, 9, 24, 9));
    l = await first(db);
    expect([isSolid(l.items[0]!, l), l.items[0]!.rightDays]).toEqual([false, []]);
  });
  it('a pair answer marks the pair; a word on two lists is noted on both; closed lists are left alone', async () => {
    const db = await freshDb();
    const pair = { left: '摘', right: '苹果', wrong: ['喝', '跑', '唱'] as [string, string, string] };
    await putWeekList(db, { ...base, items: [{ wordId: 'b:摘', text: '摘', from: 'pair', addedStatus: 'new' }], pairs: [pair] });
    await putWeekList(db, { ...base, id: 'wl:2', readyBy: '2026-10-28', homeworkDue: '2026-10-30', items: [{ wordId: 'b:摘', text: '摘', from: 'grid', addedStatus: 'new' }] });
    await putWeekList(db, { ...base, id: 'wl:3', closedAt: 1, items: [{ wordId: 'b:摘', text: '摘', from: 'grid', addedStatus: 'new' }] });
    await noteListAnswer(db, 'b:摘', 'dapei', true, new Date(2026, 9, 19, 9), { left: '摘', right: '苹果' });
    const ls = new Map((await allWeekLists(db)).map((l) => [l.id, l]));
    expect(ls.get('wl:1')!.pairs[0]!.last?.correct).toBe(true);
    expect(ls.get('wl:1')!.items[0]!.last?.dapei?.correct).toBe(true);
    expect(ls.get('wl:2')!.items[0]!.last?.dapei?.correct).toBe(true);
    expect(ls.get('wl:3')!.items[0]!.last).toBeUndefined();
  });
  it('formOf: practice asks to list forms', () => {
    expect(['read', 'listen', 'meaningRead', 'hear', 'fit', 'match', 'build'].map((a) => formOf(a as never))).toEqual(['read', 'read', 'meaning', 'meaning', 'fit', 'dapei', null]);
  });
});
