import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AnswerLog, CardRecord, KidState, LadderEntry, ParentPassage, PicturePrompt, Recording, ReviewLog, RewardGoal, SessionRecord, Settings, TalkLog, WeekList, Word } from '../types';

export interface HanziDB extends DBSchema {
  words: { key: string; value: Word };
  cards: { key: string; value: CardRecord; indexes: { byWord: string } };
  reviewLogs: { key: number; value: ReviewLog; indexes: { byAt: number; byCard: string; byWord: string } };
  sessions: { key: string; value: SessionRecord };
  recordings: { key: string; value: Recording; indexes: { byCreatedAt: number } };
  prompts: { key: string; value: PicturePrompt };
  rewards: { key: string; value: RewardGoal };
  settings: { key: string; value: Settings };
  kid: { key: string; value: KidState };
  passages: { key: string; value: ParentPassage };
  answers: { key: number; value: AnswerLog; indexes: { byAt: number } };
  ladder: { key: string; value: LadderEntry };
  weekLists: { key: string; value: WeekList };
  talks: { key: string; value: TalkLog; indexes: { byAt: number } };
  /** what was here before the last restore (review 2026-10-17): a backup's text, so the restore can be undone; never backed up */
  restorePoints: { key: string; value: RestorePoint };
}

export interface RestorePoint {
  id: string;
  at: number; // when the restore ran
  who: { name: string; grade: number | null; device: string | null };
  text: string; // exportBackup's JSON of what it replaced
}

export type AppDb = IDBPDatabase<HanziDB>;

export const DB_NAME = 'hanzi-buddy'; // pre-rename name; kept so existing progress survives
export const DB_VERSION = 7;

/** Stores holding one record per item (everything except the 'main' singletons). */
export const LIST_STORES = ['words', 'cards', 'reviewLogs', 'sessions', 'rewards', 'recordings', 'prompts', 'passages', 'answers', 'ladder', 'weekLists', 'talks'] as const;
export type ListStore = (typeof LIST_STORES)[number];

export interface OpenHandlers {
  /** an older connection (another tab) holds the database open, so this upgrade waits */
  onBlocked?: () => void;
  /** a newer build asks to upgrade: this connection has closed itself, so it must not be used again (reload) */
  onBlocking?: () => void;
}

export function openAppDb(name: string = DB_NAME, handlers: OpenHandlers = {}): Promise<AppDb> {
  let opened: AppDb | null = null;
  const open = openDB<HanziDB>(name, DB_VERSION, {
    // an old tab never blocks a new build's upgrade (review 2026-10-17): on versionchange it closes and tells the app
    blocking() {
      opened?.close();
      handlers.onBlocking?.();
    },
    blocked() {
      handlers.onBlocked?.();
    },
    upgrade(db, oldVersion, _newVersion, tx) {
      // Each version step is applied in order; a thrown error aborts the upgrade and leaves the old data untouched.
      if (oldVersion < 1) {
        db.createObjectStore('words', { keyPath: 'id' });
        db.createObjectStore('cards', { keyPath: 'id' }).createIndex('byWord', 'wordId');
        db.createObjectStore('reviewLogs', { keyPath: 'id', autoIncrement: true }).createIndex('byAt', 'at');
        db.createObjectStore('sessions', { keyPath: 'date' });
        db.createObjectStore('recordings', { keyPath: 'id' }).createIndex('byCreatedAt', 'createdAt');
        db.createObjectStore('prompts', { keyPath: 'id' });
        db.createObjectStore('rewards', { keyPath: 'id' });
        db.createObjectStore('settings');
        db.createObjectStore('kid');
      }
      if (oldVersion < 2) db.createObjectStore('passages', { keyPath: 'id' }); // parent 朗读 texts
      if (oldVersion < 3) db.createObjectStore('answers', { keyPath: 'id', autoIncrement: true }).createIndex('byAt', 'at'); // every 选一选 and 字辨 answer
      if (oldVersion < 4) db.createObjectStore('ladder', { keyPath: 'wordId' }); // each word's rung on the context ladder
      if (oldVersion < 5) {
        // every Say answer read every log to find its card's (review 2026-10-17); the indexes fill from the logs already there
        const logs = tx.objectStore('reviewLogs');
        logs.createIndex('byCard', 'cardId');
        logs.createIndex('byWord', 'wordId');
        db.createObjectStore('restorePoints', { keyPath: 'id' });
      }
      if (oldVersion < 6) db.createObjectStore('weekLists', { keyPath: 'id' }); // weekly lists (weekly list spec 2026-10-17 §4)
      if (oldVersion < 7) db.createObjectStore('talks', { keyPath: 'id' }).createIndex('byAt', 'at'); // the parent's 「✓ 聊了」 (parent loop spec §6)
    },
  });
  return open.then((db) => (opened = db));
}
