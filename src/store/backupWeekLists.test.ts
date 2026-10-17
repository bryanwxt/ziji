// @vitest-environment node
// Weekly lists across a restore (weekly list spec 2026-10-17 §11): a backup from before v6 has no lists, and its restore wipes the
// parent words they point at, so it clears them too; undo brings them back. A backup from a newer build is refused.
import { describe, expect, it } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import type { WeekList } from '../types';
import { exportBackup, readBackup, restoreWithUndo, undoRestore } from './backup';
import { DB_VERSION } from './db';
import { allWeekLists, putWeekList, putWords } from './repo';

const NOW = new Date(2026, 9, 20, 10);
const list: WeekList = {
  id: 'wl:a', name: '小测验', createdAt: 1, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'p:x1', text: '闪闪亮', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [],
};

describe('weekLists in a backup', () => {
  it('a v6 backup carries its lists', async () => {
    const db = await freshDb();
    await putWeekList(db, list);
    const other = await freshDb();
    await restoreWithUndo(other, readBackup(await exportBackup(db, { includeMedia: false, now: NOW.getTime() })), NOW);
    expect((await allWeekLists(other)).map((l) => l.id)).toEqual(['wl:a']);
  });
  it('restoring a backup from before v6 clears the lists, and undoing it brings them back', async () => {
    const old = await freshDb();
    await putWords(old, [makeWord('山')]);
    const file = JSON.parse(await exportBackup(old, { includeMedia: false, now: NOW.getTime() }));
    delete file.stores.weekLists;
    file.dbVersion = 5;
    const db = await freshDb();
    await putWords(db, [makeWord('闪闪亮', { id: 'p:x1', source: 'parent' })]);
    await putWeekList(db, list);
    const preview = readBackup(JSON.stringify(file));
    expect(preview.listsMissing).toBe(true);
    await restoreWithUndo(db, preview, NOW);
    expect(await allWeekLists(db)).toEqual([]);
    await undoRestore(db);
    expect((await allWeekLists(db)).map((l) => l.id)).toEqual(['wl:a']);
  });
  it('a backup from a newer database version says to update the app', async () => {
    const db = await freshDb();
    const file = JSON.parse(await exportBackup(db, { includeMedia: false, now: NOW.getTime() }));
    file.dbVersion = DB_VERSION + 1;
    expect(() => readBackup(JSON.stringify(file))).toThrow(/newer version/);
  });
});
