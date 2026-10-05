import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AnswerLog, CardRecord, KidState, LadderEntry, ParentPassage, PicturePrompt, Recording, ReviewLog, RewardGoal, SessionRecord, Settings, Word } from '../types';

export interface HanziDB extends DBSchema {
  words: { key: string; value: Word };
  cards: { key: string; value: CardRecord; indexes: { byWord: string } };
  reviewLogs: { key: number; value: ReviewLog; indexes: { byAt: number } };
  sessions: { key: string; value: SessionRecord };
  recordings: { key: string; value: Recording; indexes: { byCreatedAt: number } };
  prompts: { key: string; value: PicturePrompt };
  rewards: { key: string; value: RewardGoal };
  settings: { key: string; value: Settings };
  kid: { key: string; value: KidState };
  passages: { key: string; value: ParentPassage };
  answers: { key: number; value: AnswerLog; indexes: { byAt: number } };
  ladder: { key: string; value: LadderEntry };
}

export type AppDb = IDBPDatabase<HanziDB>;

export const DB_NAME = 'hanzi-buddy'; // pre-rename name; kept so existing progress survives
export const DB_VERSION = 4;

/** Stores holding one record per item (everything except the 'main' singletons). */
export const LIST_STORES = ['words', 'cards', 'reviewLogs', 'sessions', 'rewards', 'recordings', 'prompts', 'passages', 'answers', 'ladder'] as const;
export type ListStore = (typeof LIST_STORES)[number];

export function openAppDb(name: string = DB_NAME): Promise<AppDb> {
  return openDB<HanziDB>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
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
    },
  });
}
