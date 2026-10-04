// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_KID } from '../types';
import { applyBackup, BACKUP_FORMAT, BackupError, exportBackup, exportRawBackup, readBackup } from './backup';
import { addAnswer, addRecording, allCards, answersSince, getKid, getSettings, listParentPassages, listRecordings, putCards, putWords, saveKid, saveParentPassage, saveSession, updateSettings } from './repo';

async function seeded() {
  const db = await freshDb();
  await putWords(db, [makeWord('大')]);
  await putCards(db, [makeCard('b:大', 'recognise', new Date(2026, 9, 5))]);
  await addRecording(db, {
    id: 'r1', createdAt: 1, prompt: { kind: 'passage', passageId: 'p01' },
    blob: new Blob(['hello'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 2,
  });
  await updateSettings(db, { newPerDay: 8 });
  await saveKid(db, { ...DEFAULT_KID, petName: '豆豆' });
  await saveSession(db, createSessionRecord({ steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, '2026-10-02', 0));
  return db;
}

describe('backup', () => {
  it('round-trips everything, including recordings and dates', async () => {
    const text = await exportBackup(await seeded(), { includeMedia: true, now: 1 });
    const preview = readBackup(text);
    expect(preview.counts).toEqual({ words: 1, cards: 1, sessions: 1, recordings: 1 });
    const target = await freshDb();
    await applyBackup(target, preview);
    expect((await allCards(target))[0]!.fsrs.due).toBeInstanceOf(Date);
    const [rec] = await listRecordings(target);
    expect(await rec!.blob.text()).toBe('hello');
    expect(rec!.blob.type).toBe('audio/mp4');
    expect((await getSettings(target)).newPerDay).toBe(8);
    expect((await getKid(target))?.petName).toBe('豆豆');
  });

  it('leaves existing recordings alone when the backup has no media', async () => {
    const text = await exportBackup(await seeded(), { includeMedia: false, now: 1 });
    expect(readBackup(text).hasMedia).toBe(false);
    const target = await seeded();
    await applyBackup(target, readBackup(text));
    expect(await listRecordings(target)).toHaveLength(1);
  });

  it('rejects files that are not backups, changing nothing', () => {
    expect(() => readBackup('not json')).toThrow('This file is not a 字己 ZiJi backup.');
    expect(() => readBackup('{"hello":1}')).toThrow(BackupError);
    expect(() => readBackup(JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 1, stores: { words: 'x' } }))).toThrow(BackupError);
    expect(() => readBackup(JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 1, stores: { secrets: [] } }))).toThrow(BackupError);
  });

  it('refuses backups from a newer app version', () => {
    expect(() => readBackup(JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 99, stores: {} }))).toThrow(/newer version/);
  });

  it('makes an emergency raw dump of any database', async () => {
    const db = await seeded();
    const name = db.name;
    db.close();
    const dump = JSON.parse(await exportRawBackup(name));
    expect(dump.stores.words).toHaveLength(1);
    expect(dump.stores.settings[0].key).toBe('main');
  });
});

describe('old backups and new kid fields', () => {
  it('restores a dragon-era kid and reads it with the new defaults', async () => {
    const src = await freshDb();
    await src.put('kid', { petName: '小龙', petColor: 'blue', ownedAccessories: [], wearing: null, bonusStars: 0, lastChestDate: null, lastStageSeen: 1, badgesSeen: [] } as never, 'main');
    const text = await exportBackup(src, { includeMedia: false, now: 1 });
    const db = await freshDb();
    await applyBackup(db, readBackup(text));
    expect(await getKid(db)).toMatchObject({ petName: '小龙', activePower: null, powerTiersSeen: {} });
  });
});

describe('backup of 朗读 texts', () => {
  it('round-trips parent passages, and restores a backup made before they existed', async () => {
    const src = await freshDb();
    await saveParentPassage(src, { id: 'pp:1', title: '甲', text: '我爱我家。', createdAt: 1 });
    const text = await exportBackup(src, { includeMedia: false, now: 1 });
    const target = await freshDb();
    await applyBackup(target, readBackup(text));
    expect((await listParentPassages(target)).map((p) => p.title)).toEqual(['甲']);
    const file = JSON.parse(text);
    delete file.stores.passages;
    const old = await freshDb();
    await applyBackup(old, readBackup(JSON.stringify(file)));
    expect(await listParentPassages(old)).toEqual([]);
  });
});

describe('backups across the plan 14 update', () => {
  it('a backup with answers brings them back; an old backup made before plan 14 (no answers store) restores', async () => {
    const db = await freshDb();
    await addAnswer(db, { at: 5, wordId: 'b:大', skill: 'zibian', correct: true });
    const json = await exportBackup(db, { includeMedia: false, now: 0 });
    const fresh = await freshDb();
    await applyBackup(fresh, readBackup(json));
    expect(await answersSince(fresh, 0)).toHaveLength(1);
    const old = JSON.parse(json);
    delete old.stores.answers; // shaped like a backup from DB version 2
    const other = await freshDb();
    await applyBackup(other, readBackup(JSON.stringify(old)));
    expect(await answersSince(other, 0)).toEqual([]);
  });
});

describe('imported class data in backups (deferred minor, plan 12)', () => {
  it('sentences, pairings and tags come back from a backup', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('保持', { id: 'p:1', source: 'parent', sentences: [{ text: '要保持安静。', pinyin: '' }], pairs: ['安静'], tags: ['成语'] })]);
    const json = await exportBackup(db, { includeMedia: false, now: 0 });
    const fresh = await freshDb();
    await applyBackup(fresh, readBackup(json));
    const w = (await fresh.get('words', 'p:1'))!;
    expect([w.sentences, w.pairs, w.tags]).toEqual([[{ text: '要保持安静。', pinyin: '' }], ['安静'], ['成语']]);
  });
});
