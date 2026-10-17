// @vitest-environment node
// Every older database upgrades to v6 (weekly list spec 2026-10-17 §4): its data kept, each later step's stores and indexes added.
import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { openAppDb } from './db';
import { allWeekLists } from './repo';

/** The schema as each old build made it, up to `version`. */
async function oldDb(name: string, version: number) {
  const db = await openDB(name, version, {
    upgrade(d, from) {
      if (from < 1) {
        d.createObjectStore('words', { keyPath: 'id' });
        d.createObjectStore('cards', { keyPath: 'id' }).createIndex('byWord', 'wordId');
        d.createObjectStore('reviewLogs', { keyPath: 'id', autoIncrement: true }).createIndex('byAt', 'at');
        d.createObjectStore('sessions', { keyPath: 'date' });
        d.createObjectStore('recordings', { keyPath: 'id' }).createIndex('byCreatedAt', 'createdAt');
        for (const s of ['prompts', 'rewards']) d.createObjectStore(s, { keyPath: 'id' });
        d.createObjectStore('settings');
        d.createObjectStore('kid');
      }
      if (version >= 2) d.createObjectStore('passages', { keyPath: 'id' });
      if (version >= 3) d.createObjectStore('answers', { keyPath: 'id', autoIncrement: true }).createIndex('byAt', 'at');
      if (version >= 4) d.createObjectStore('ladder', { keyPath: 'wordId' });
    },
  });
  await db.put('words', { id: 'b:山', text: '山' });
  await db.add('reviewLogs', { cardId: 'b:山:recognise', wordId: 'b:山', at: 5 });
  db.close();
}

describe('upgrading an older database to v6', () => {
  it.each([1, 2, 3, 4])('from v%i', async (v) => {
    const name = `test-${crypto.randomUUID()}`;
    await oldDb(name, v);
    const db = await openAppDb(name);
    expect(db.version).toBe(6);
    expect(await db.get('words', 'b:山')).toMatchObject({ text: '山' });
    expect(await db.getAllFromIndex('reviewLogs', 'byCard', 'b:山:recognise')).toHaveLength(1);
    for (const s of ['passages', 'answers', 'ladder', 'restorePoints', 'weekLists'] as const) expect(db.objectStoreNames.contains(s)).toBe(true);
    expect(await allWeekLists(db)).toEqual([]);
  });
});
