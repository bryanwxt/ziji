// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';
import { backupFileName, currentWho, exportBackup, LIST_STORES_IN_BACKUP, readBackup, restorePoint, restoreWithUndo, undoRestore, whoDiffers } from './backup';
import { allWords, putWords, saveKid, updateSettings } from './repo';

const NOW = new Date(2026, 9, 2, 10, 0);

async function child(name: string, grade: number, words: string[]) {
  const db = await freshDb();
  await updateSettings(db, { oral: { ...DEFAULT_SETTINGS.oral, name }, grade, gradeYear: 2026 });
  await saveKid(db, { ...DEFAULT_KID, petName: '松露' });
  await putWords(db, words.map((w) => makeWord(w)));
  return db;
}

// review 2026-10-17: with two children, one wrong file overwrote the other's progress for good
describe('a backup says whose it is', () => {
  it("carries the child's name, school year and the device it came from", async () => {
    const db = await child('小明', 2, ['大']);
    const file = JSON.parse(await exportBackup(db, { includeMedia: false, now: NOW.getTime(), device: 'iPad' }));
    expect(file.who).toEqual({ name: '小明', grade: 2, device: 'iPad' });
    expect(readBackup(JSON.stringify(file)).who).toEqual({ name: '小明', grade: 2, device: 'iPad' });
  });
  it("without a child's name, the pet's name stands in", async () => {
    const db = await child('', 3, []);
    await saveKid(db, { ...DEFAULT_KID, petName: '豆豆' });
    expect((await currentWho(db, NOW, 'iPhone')).name).toBe('豆豆');
  });
  it("an older backup (no who) is read from its own settings and pet; its device isn't known", async () => {
    const db = await child('小红', 3, []);
    const file = JSON.parse(await exportBackup(db, { includeMedia: false, now: NOW.getTime() }));
    delete file.who;
    expect(readBackup(JSON.stringify(file)).who).toEqual({ name: '小红', grade: 3, device: null });
  });
  it('the file name has the name, school year, device and date, safe for Files', () => {
    expect(backupFileName({ name: '小明', grade: 2, device: 'iPad' }, '2026-10-02')).toBe('ziji-backup-小明-P2-iPad-2026-10-02.json');
    expect(backupFileName({ name: 'Tom / Lee', grade: null, device: null }, '2026-10-02')).toBe('ziji-backup-Tom-Lee-2026-10-02.json');
  });
  it("differences from this device's child are named: another name or another school year", () => {
    const here = { name: '小明', grade: 2, device: 'iPad' };
    expect(whoDiffers({ name: '小明', grade: 2, device: 'iPhone' }, here)).toEqual([]); // another device is fine
    expect(whoDiffers({ name: '小红', grade: 3, device: 'iPad' }, here)).toEqual(['name', 'grade']);
    expect(whoDiffers({ name: ' 小明 ', grade: null, device: null }, here)).toEqual([]);
  });
});

describe('a restore can be undone', () => {
  it('keeps what was here before the restore, and undo puts it back', async () => {
    const mine = await child('小明', 2, ['大', '小']);
    const theirs = await child('小红', 3, ['山']);
    const preview = readBackup(await exportBackup(theirs, { includeMedia: false, now: NOW.getTime() }));
    expect(await restorePoint(mine)).toBeNull();
    await restoreWithUndo(mine, preview, NOW);
    expect((await allWords(mine)).map((w) => w.text)).toEqual(['山']);
    expect((await restorePoint(mine))?.at).toBe(NOW.getTime());
    expect((await restorePoint(mine))?.who.name).toBe('小明');
    await undoRestore(mine);
    expect((await allWords(mine)).map((w) => w.text).sort()).toEqual(['大', '小'].sort());
    expect((await currentWho(mine, NOW, null)).name).toBe('小明');
    expect(await restorePoint(mine)).toBeNull(); // used once
  });
  it('the restore point is never itself backed up', () => {
    expect(LIST_STORES_IN_BACKUP).not.toContain('restorePoints');
  });
});
