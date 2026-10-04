import type { Route } from './app/AppContext';
import { setSfxEnabled } from './audio/sfx';
import { loadChineseVoice, setSpeechRate } from './audio/speech';
import { builtinWords } from './content';
import { openAppDb, type AppDb } from './store/db';
import { getKid, getSettings, seedBuiltinWords } from './store/repo';
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
  await seedBuiltinWords(db, builtinWords(Date.now()));
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
