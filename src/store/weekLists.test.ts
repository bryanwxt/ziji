// src/store/weekLists.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { DB_VERSION, LIST_STORES, openAppDb } from './db';
import { allWeekLists, deleteWeekList, putWeekList } from './repo';
import type { WeekList } from '../types';

const list = (id: string): WeekList => ({
  id, name: '复习一', createdAt: 1, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'b:跑', text: '跑', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [],
});

describe('weekLists store (DB v6)', () => {
  it('is version 6 and backed up', () => {
    expect(DB_VERSION).toBe(6);
    expect(LIST_STORES).toContain('weekLists');
  });
  it('saves, lists and deletes', async () => {
    const db = await openAppDb(`test-${crypto.randomUUID()}`);
    await putWeekList(db, list('wl:1'));
    await putWeekList(db, list('wl:2'));
    expect((await allWeekLists(db)).map((l) => l.id).sort()).toEqual(['wl:1', 'wl:2']);
    await deleteWeekList(db, 'wl:1');
    expect((await allWeekLists(db)).map((l) => l.id)).toEqual(['wl:2']);
  });
  it('upgrades a v5 database without touching its data or indexes', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const v5 = await openDB(name, 5, {
      upgrade(db) {
        db.createObjectStore('words', { keyPath: 'id' });
        db.createObjectStore('cards', { keyPath: 'id' }).createIndex('byWord', 'wordId');
        const logs = db.createObjectStore('reviewLogs', { keyPath: 'id', autoIncrement: true });
        logs.createIndex('byAt', 'at'); logs.createIndex('byCard', 'cardId'); logs.createIndex('byWord', 'wordId');
        for (const s of ['sessions', 'recordings', 'prompts', 'rewards', 'passages', 'answers', 'ladder', 'restorePoints']) db.createObjectStore(s, { keyPath: s === 'sessions' ? 'date' : s === 'ladder' ? 'wordId' : 'id', autoIncrement: s === 'answers' });
        db.createObjectStore('settings'); db.createObjectStore('kid');
      },
    });
    await v5.put('words', { id: 'b:跑', text: '跑' });
    v5.close();
    const db = await openAppDb(name);
    expect(await db.get('words', 'b:跑')).toMatchObject({ text: '跑' });
    expect(db.transaction('reviewLogs').store.indexNames.contains('byCard')).toBe(true);
    expect(await allWeekLists(db)).toEqual([]);
  });
});
