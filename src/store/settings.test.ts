import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb } from '../test/fixtures';
import { getSettings } from './repo';
import { applySettingsMigration, migrateSettings } from './settings';

describe('migrateSettings', () => {
  // each version's moves still happen on the way to v5 (spec 2026-10-05 §7 adds the switches and the ceiling; 2026-10-11 §6 both tracks)
  it("lesson version 3: 5 new words a day became 4 (and 4 is now the ceiling 8); a parent's other choice stays", () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 5 })).toMatchObject({ newPerDay: 8, lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 6 })).toMatchObject({ newPerDay: 6, lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5 })).toBeNull();
  });
  it('moves an install on the old 20-minute default to 30 minutes, once', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 30, lessonVersion: 5 });
  });
  it('keeps a shorter lesson the parent chose (only the old 20-minute default moves)', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 15, lessonVersion: 5 });
  });
  it('keeps a longer lesson the parent chose, and never runs again', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 40, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 40, lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: 5 })).toBeNull();
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

describe('lessonVersion 4 (spec 2026-10-05 §7)', () => {
  const old = (activities: Record<string, boolean>, newPerDay = 4) => ({ ...DEFAULT_SETTINGS, lessonVersion: 3, newPerDay, activities: activities as never });
  it('maps the old switches: 认一认 → 新字 and 练一练; 选一选 or 钓鱼 → 练一练', () => {
    expect(migrateSettings(old({ flashcards: true, choose: true, components: true, writing: true, speaking: false }))!.activities).toEqual({ newwords: true, practice: true, writing: true, speaking: false });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: true, writing: false, speaking: true }))!.activities).toEqual({ newwords: false, practice: true, writing: false, speaking: true });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: false, writing: true, speaking: true }))!.activities).toEqual({ newwords: false, practice: false, writing: true, speaking: true });
  });
  it('the old default 4 new words a day becomes the ceiling 8; a parent’s own number stays', () => {
    expect(migrateSettings(old({}, 4))!.newPerDay).toBe(8);
    expect(migrateSettings(old({}, 6))!.newPerDay).toBe(6);
    expect(migrateSettings(old({}, 4))!.lessonVersion).toBe(5);
  });
  it('a settings object already on the current version is left alone', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS })).toBeNull();
  });
});

describe('lessonVersion 5: both tracks (spec 2026-10-11 §6)', () => {
  it('moves every install on 4 to 华文 + 高级华文 once, and touches nothing else', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'hcl' })).toEqual({ course: 'both', lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'cl' })).toEqual({ course: 'both', lessonVersion: 5 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4 })).toEqual({ course: 'both', lessonVersion: 5 });
  });
  it('a parent who picks one track afterwards keeps it', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, course: 'cl' })).toBeNull();
  });
});
