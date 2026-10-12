import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb } from '../test/fixtures';
import { getSettings } from './repo';
import { applySettingsMigration, migrateSettings } from './settings';

const SPEAKING_ON = { ...DEFAULT_SETTINGS.activities, speaking: true };

describe('migrateSettings', () => {
  // each version's moves still happen on the way to v8 (spec 2026-10-05 §7 the switches and the ceiling; 2026-10-11 §6 both tracks, §4 the 15-minute lesson; 2026-10-12 §7 朗读 on; production practice §6 the 20-minute lesson)
  it("lesson version 3: 5 new words a day became 4 (and 4 is now the ceiling 8); a parent's other choice stays", () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 5 })).toMatchObject({ newPerDay: 8, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 6 })).toMatchObject({ newPerDay: 6, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 8 })).toBeNull();
  });
  it('an install on the old 20-minute default moved to 30, then to 15, and now to 20', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 20, lessonVersion: 8 });
  });
  it('keeps a shorter lesson the parent chose', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 10, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 10, lessonVersion: 8 });
  });
  it('keeps a longer lesson the parent chose, and never runs again', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 40, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 40, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: 8 })).toBeNull();
  });
  it('a fresh install starts at 20 minutes', () => {
    expect(DEFAULT_SETTINGS.sessionMinutes).toBe(20);
  });
});

describe('applySettingsMigration (an existing install on the iPad)', () => {
  it('moves stored 20-minute settings on to 30, 15 and 20, even though the defaults already say the current lessonVersion', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(20);
    await db.put('settings', { ...(await getSettings(db)), sessionMinutes: 30 }, 'main'); // the parent chooses 30 later
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(30);
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
    expect(migrateSettings(old({ flashcards: true, choose: true, components: true, writing: true, speaking: false }))!.activities).toEqual({ newwords: true, practice: true, writing: true, speaking: true }); // v7 then turns the speaking step on with 朗读
    expect(migrateSettings(old({ flashcards: false, choose: false, components: true, writing: false, speaking: true }))!.activities).toEqual({ newwords: false, practice: true, writing: false, speaking: true });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: false, writing: true, speaking: true }))!.activities).toEqual({ newwords: false, practice: false, writing: true, speaking: true });
  });
  it('the old default 4 new words a day becomes the ceiling 8; a parent’s own number stays', () => {
    expect(migrateSettings(old({}, 4))!.newPerDay).toBe(8);
    expect(migrateSettings(old({}, 6))!.newPerDay).toBe(6);
    expect(migrateSettings(old({}, 4))!.lessonVersion).toBe(8);
  });
  it('a settings object already on the current version is left alone', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS })).toBeNull();
  });
});

describe('lessonVersion 5: both tracks (spec 2026-10-11 §6)', () => {
  it('moves every install on 4 to 华文 + 高级华文 once', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'hcl' })).toEqual({ course: 'both', langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'cl' })).toEqual({ course: 'both', langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4 })).toEqual({ course: 'both', langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
  it('a parent who picked one track since keeps it', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, course: 'cl' })).toEqual({ langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
});

describe('lessonVersion 6: the 15-minute lesson (spec 2026-10-11 §4)', () => {
  it('moves 30 minutes, the old default, to 15 — and v8 on to 20 — touching nothing else', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, sessionMinutes: 30, course: 'cl' })).toEqual({ sessionMinutes: 20, langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
  it('only exactly 30: any other length the parent chose stays', () => {
    for (const m of [10, 20, 25, 35, 40]) expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, sessionMinutes: m })).toEqual({ langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
});

describe('lessonVersion 7: 朗读 back as a daily step (spec 2026-10-12 §7)', () => {
  it('turns 朗读 on once for an install on 6, and nothing else (a 30-minute lesson chosen since stays)', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 6, langdu: false, sessionMinutes: 30 })).toEqual({ langdu: true, activities: SPEAKING_ON, lessonVersion: 8 });
  });
  it("turns the lesson's speaking step on with it, so 朗读 actually runs; the other activity switches stay (final review M2)", () => {
    const activities = { newwords: true, practice: false, writing: false, speaking: false };
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 6, langdu: false, activities })).toEqual({ langdu: true, activities: { ...activities, speaking: true }, lessonVersion: 8 });
  });
  it('a new install starts with 朗读 on and 看图说话 off', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ langdu: true, story: false, lessonVersion: 8 });
  });
  it('runs once: a parent who turns 朗读 off afterwards keeps it off', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, langdu: false, lessonVersion: 6 }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).langdu).toBe(true);
    await db.put('settings', { ...(await getSettings(db)), langdu: false }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).langdu).toBe(false);
  });
});

describe('lessonVersion 8: the 20-minute lesson (production practice spec §6)', () => {
  it('moves exactly 15 minutes to 20, and nothing else', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 7, sessionMinutes: 15 })).toEqual({ sessionMinutes: 20, lessonVersion: 8 });
  });
  it('any other length the parent chose stays', () => {
    for (const m of [10, 20, 25, 30, 40]) expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 7, sessionMinutes: m })).toEqual({ lessonVersion: 8 });
  });
  it('runs once: a parent who picks 15 afterwards keeps it', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: 7 }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(20);
    await db.put('settings', { ...(await getSettings(db)), sessionMinutes: 15 }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(15);
  });
});
