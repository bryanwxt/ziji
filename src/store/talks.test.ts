// @vitest-environment node
// The talk log (parent loop spec §6): its own store (v7), in every backup; a backup from before it leaves this device's talks
// alone (they are the family's, not his progress), and Undo puts back exactly what was there.
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import { exportBackup, readBackup, restoreWithUndo, undoRestore } from './backup';
import { DB_VERSION, LIST_STORES, openAppDb } from './db';
import { addTalk, allTalks, allWords, deleteTalk, putWords, talksBetween } from './repo';

const NOW = new Date(2026, 9, 19, 21);
const at = (d: number, h = 19) => new Date(2026, 9, d, h).getTime();

describe('the talk log store', () => {
  it('adds, lists oldest first, reads [from, to) and deletes', async () => {
    const db = await freshDb();
    await addTalk(db, { id: 'b', at: at(13), minutes: 10 });
    await addTalk(db, { id: 'a', at: at(12) });
    await addTalk(db, { id: 'c', at: at(19, 0) });
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect((await talksBetween(db, new Date(2026, 9, 12).getTime(), new Date(2026, 9, 19).getTime())).map((t) => t.id)).toEqual(['a', 'b']);
    await deleteTalk(db, 'b');
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['a', 'c']);
  });
  it('v7 adds the store to a v6 database and keeps what it had', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const old = await openDB(name, 6, { upgrade(db) { db.createObjectStore('words', { keyPath: 'id' }); } });
    await old.put('words', makeWord('大'));
    old.close();
    const db = await openAppDb(name);
    expect(DB_VERSION).toBe(7);
    expect(db.objectStoreNames.contains('talks')).toBe(true);
    expect((await allWords(db)).map((w) => w.text)).toEqual(['大']);
    expect(LIST_STORES).toContain('talks');
  });
});

describe('talks in a backup', () => {
  it('a v7 backup carries its talks, and restoring brings them in place of the ones here', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('大')]);
    await addTalk(db, { id: 'a', at: at(12), minutes: 5 });
    const text = await exportBackup(db, { includeMedia: false, now: NOW.getTime() });
    expect(JSON.parse(text).stores.talks).toEqual([{ id: 'a', at: at(12), minutes: 5 }]);
    expect(readBackup(text).talksMissing).toBe(false);
    const other = await freshDb();
    await addTalk(other, { id: 'old', at: at(1) });
    await restoreWithUndo(other, readBackup(text), NOW);
    expect(await allTalks(other)).toEqual([{ id: 'a', at: at(12), minutes: 5 }]);
  });
  it('a backup from before talks keeps the talks here; undoing the restore keeps them too', async () => {
    const old = await freshDb();
    await putWords(old, [makeWord('山')]);
    const file = JSON.parse(await exportBackup(old, { includeMedia: false, now: NOW.getTime() }));
    delete file.stores.talks;
    file.dbVersion = 6;
    const db = await freshDb();
    await addTalk(db, { id: 'kept', at: at(18), minutes: 10 });
    const preview = readBackup(JSON.stringify(file));
    expect(preview.talksMissing).toBe(true);
    await restoreWithUndo(db, preview, NOW);
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['kept']);
    await addTalk(db, { id: 'after', at: at(19) }); // logged after the restore: Undo goes back to before it
    await undoRestore(db);
    expect((await allTalks(db)).map((t) => t.id)).toEqual(['kept']);
  });
});
