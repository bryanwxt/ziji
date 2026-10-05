import { DEFAULT_SETTINGS, type Settings } from '../types';
import type { AppDb } from './db';
import { getSettings, updateSettings } from './repo';

/**
 * One-off moves for existing installs; only an old default moves, a parent's own choice stays.
 * Plan 11 (v2): a 20-minute lesson grows to 30. Plan 13 (v3): 5 new words a day becomes 4 (spec §20 part 2).
 * Lesson redesign (v4, spec 2026-10-05 §7): the activity switches become 新字 / 练一练 / 写一写 / 朗读, and the old default
 * number of new words becomes the ceiling 8 the app paces under (§2.2).
 */
export function migrateSettings(s: Settings): Partial<Settings> | null {
  const v = s.lessonVersion ?? 1;
  if (v >= 4) return null;
  const patch: Partial<Settings> = {};
  if (v < 2) patch.sessionMinutes = s.sessionMinutes === 20 ? 30 : s.sessionMinutes;
  const perDay = v < 3 && s.newPerDay === 5 ? 4 : s.newPerDay;
  patch.newPerDay = perDay === 4 ? 8 : perDay;
  const was = s.activities as unknown as Partial<Record<'flashcards' | 'choose' | 'components' | 'writing' | 'speaking', boolean>>;
  const on = (k: keyof typeof was) => was[k] ?? true;
  patch.activities = { newwords: on('flashcards'), practice: on('flashcards') || on('choose') || on('components'), writing: on('writing'), speaking: on('speaking') };
  patch.lessonVersion = 4;
  return patch;
}

/** Runs the one-off moves against what's actually stored (getSettings fills in today's defaults, which already say the current lessonVersion). */
export async function applySettingsMigration(db: AppDb): Promise<void> {
  const raw = await db.get('settings', 'main');
  if (!raw) return; // a fresh install starts on today's defaults
  const patch = migrateSettings({ ...(await getSettings(db)), lessonVersion: raw.lessonVersion, activities: raw.activities ?? DEFAULT_SETTINGS.activities });
  if (patch) await updateSettings(db, patch);
}
