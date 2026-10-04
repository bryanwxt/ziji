import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb } from '../test/fixtures';
import { getSettings } from './repo';
import { applySettingsMigration, migrateSettings } from './settings';

describe('migrateSettings', () => {
  it("lesson version 3: 5 new words a day becomes 4; a parent's other choice stays", () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 5 })).toEqual({ newPerDay: 4, lessonVersion: 3 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 8 })).toEqual({ newPerDay: 8, lessonVersion: 3 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 3 })).toBeNull();
  });
  it('moves an install on the old 20-minute default to 30 minutes, once', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined })).toEqual({ sessionMinutes: 30, newPerDay: 4, lessonVersion: 3 });
  });
  it('keeps a shorter lesson the parent chose (only the old 20-minute default moves)', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: undefined })).toEqual({ sessionMinutes: 15, newPerDay: 4, lessonVersion: 3 });
  });
  it('keeps a longer lesson the parent chose, and never runs again', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 40, lessonVersion: undefined })).toEqual({ sessionMinutes: 40, newPerDay: 4, lessonVersion: 3 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: 3 })).toBeNull();
  });
  it('a fresh install starts at 30 minutes', () => {
    expect(DEFAULT_SETTINGS.sessionMinutes).toBe(30);
  });
});

describe('applySettingsMigration (an existing install on the iPad)', () => {
  it('moves stored 20-minute settings to 30, even though the defaults already say lessonVersion 2', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(30);
    await db.put('settings', { ...(await getSettings(db)), sessionMinutes: 15 }, 'main'); // the parent chooses 15 later
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(15);
  });
  it('leaves a fresh install alone', async () => {
    const db = await freshDb();
    await applySettingsMigration(db);
    expect(await db.get('settings', 'main')).toBeUndefined();
  });
});
