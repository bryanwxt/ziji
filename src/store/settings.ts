import type { Settings } from '../types';
import type { AppDb } from './db';
import { getSettings, updateSettings } from './repo';

/**
 * One-off moves for existing installs; only an old default moves, a parent's own choice stays.
 * Plan 11 (v2): a 20-minute lesson grows to 30. Plan 13 (v3): 5 new words a day becomes 4 (spec §20 part 2).
 */
export function migrateSettings(s: Settings): Partial<Settings> | null {
  const v = s.lessonVersion ?? 1;
  if (v >= 3) return null;
  const patch: Partial<Settings> = {};
  if (v < 2) patch.sessionMinutes = s.sessionMinutes === 20 ? 30 : s.sessionMinutes;
  patch.newPerDay = s.newPerDay === 5 ? 4 : s.newPerDay;
  patch.lessonVersion = 3;
  return patch;
}

/** Runs the one-off moves against what's actually stored (getSettings fills in today's defaults, which already say the current lessonVersion). */
export async function applySettingsMigration(db: AppDb): Promise<void> {
  const raw = await db.get('settings', 'main');
  if (!raw) return; // a fresh install starts on today's defaults
  const patch = migrateSettings({ ...(await getSettings(db)), lessonVersion: raw.lessonVersion });
  if (patch) await updateSettings(db, patch);
}
