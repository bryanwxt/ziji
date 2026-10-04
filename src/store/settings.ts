import type { Settings } from '../types';
import type { AppDb } from './db';
import { getSettings, updateSettings } from './repo';

/** One-off moves for existing installs. Plan 11: the lesson grows to 30 minutes (a longer choice is kept). */
export function migrateSettings(s: Settings): Partial<Settings> | null {
  if ((s.lessonVersion ?? 1) >= 2) return null;
  return { sessionMinutes: Math.max(30, s.sessionMinutes), lessonVersion: 2 };
}

/** Runs the one-off moves against what's actually stored (getSettings fills in today's defaults, which already say lessonVersion 2). */
export async function applySettingsMigration(db: AppDb): Promise<void> {
  const raw = await db.get('settings', 'main');
  if (!raw) return; // a fresh install starts on today's defaults
  const patch = migrateSettings({ ...(await getSettings(db)), lessonVersion: raw.lessonVersion });
  if (patch) await updateSettings(db, patch);
}
