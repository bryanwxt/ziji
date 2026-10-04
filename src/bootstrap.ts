import type { Route } from './app/AppContext';
import { setSfxEnabled } from './audio/sfx';
import { loadChineseVoice, setSpeechRate } from './audio/speech';
import { builtinWords, CONTENT_VERSION } from './content';
import { openAppDb, type AppDb } from './store/db';
import { getKid, getSettings, seedBuiltinWords, updateSettings } from './store/repo';
import { applySettingsMigration } from './store/settings';
import type { KidState, Settings } from './types';

export interface Booted {
  db: AppDb;
  settings: Settings;
  kid: KidState | null;
  voice: boolean;
}

export async function bootstrap(dbName: string): Promise<Booted> {
  const db = await openAppDb(dbName);
  // the 3,000 built-in words are rewritten only when the content changed (a launch used to rewrite them all)
  const stored = (await db.get('settings', 'main'))?.contentVersion;
  await seedBuiltinWords(db, builtinWords(Date.now()), stored !== CONTENT_VERSION);
  if (stored !== CONTENT_VERSION) await updateSettings(db, { contentVersion: CONTENT_VERSION });
  await applySettingsMigration(db);
  const [settings, kid, voice] = await Promise.all([getSettings(db), getKid(db), loadChineseVoice()]);
  setSpeechRate(settings.speechRate);
  setSfxEnabled(settings.soundEffects);
  // Ask Safari not to evict our data (home-screen apps are also exempt from its 7-day cleanup).
  void navigator.storage?.persist?.().catch(() => false);
  return { db, settings, kid, voice: voice !== null };
}

export function firstRoute(b: Pick<Booted, 'settings' | 'kid'>): Route {
  if (!b.settings.pinHash) return { name: 'setupPin' };
  if (!b.kid) return { name: 'petSetup' };
  if (!b.settings.placementDone) return { name: 'placement' };
  return { name: 'home' };
}
