import type { Route } from './app/AppContext';
import { setSfxEnabled } from './audio/sfx';
import { loadClipIndex } from './audio/clips';
import { migrateToLadder } from './ladder/migrate';
import { markOldPlacement } from './placement/migrate';
import { loadChineseVoice, setSpeechRate } from './audio/speech';
import { builtinWords, CONTENT_VERSION } from './content';
import { courseOf } from './content/curriculum';
import { openAppDb, type AppDb } from './store/db';
import { getKid, getSettings, seedBuiltinWords, updateSettings } from './store/repo';
import { keepStorage } from './store/persist';
import { setSchedulerParams } from './srs/scheduler';
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
  await applySettingsMigration(db); // first: a move (v5: both tracks) can change the course the words are written for
  // the 3,000 built-in words are rewritten only when the content changed (a launch used to rewrite them all)
  const stored = (await db.get('settings', 'main'))?.contentVersion;
  const pre = await getSettings(db);
  const course = courseOf(pre);
  const stale = stored !== CONTENT_VERSION || (pre.contentCourse ?? 'cl') !== course; // new content, or words written for another course
  await seedBuiltinWords(db, builtinWords(Date.now(), course), stale);
  if (stale) await updateSettings(db, { contentVersion: CONTENT_VERSION, contentCourse: course });
  await migrateToLadder(db, new Date()); // once: earned cards pass, words he reads get listening checks (spec 2026-10-06 §3.6)
  await markOldPlacement(db, new Date()); // once: an older placement's unrechecked cards follow the new recheck rules (spec 2026-10-14)
  const [settings, kid] = await Promise.all([getSettings(db), getKid(db)]);
  // the recorded clips only when the parent switches them on (2026-10-08: the iPhone voice sounded better than Kokoro's); else the iPad voice
  if (settings.recordedVoice) void loadClipIndex();
  const voice = await loadChineseVoice(1500, settings.voiceURI ?? null);
  setSpeechRate(settings.speechRate);
  setSfxEnabled(settings.soundEffects);
  setSchedulerParams(settings.fsrs?.w ?? null); // his fitted memory, if the parent chose it (SRS tuning spec §6.2)
  // Ask Safari not to evict our data (home-screen apps are also exempt from its 7-day cleanup).
  void keepStorage();
  return { db, settings, kid, voice: voice !== null };
}

export function firstRoute(b: Pick<Booted, 'settings' | 'kid'>): Route {
  if (!b.settings.pinHash) return { name: 'setupPin' };
  if (!b.kid) return { name: 'petSetup' };
  if (!b.settings.placementDone) return { name: 'placement' };
  return { name: 'home' };
}
