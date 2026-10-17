// @vitest-environment node
import { openDB } from 'idb';
import { describe, expect, it, vi } from 'vitest';
import { Rating } from 'ts-fsrs';
import { DB_VERSION, openAppDb } from './db';
import { addReviewLog, logsForCard, practisedByKind, practisedWords } from './repo';
import type { ReviewLog } from '../types';

const log = (wordId: string, kind: ReviewLog['kind'], at: number, correct = true): ReviewLog => ({ cardId: `${wordId}:${kind}`, wordId, kind, at, rating: Rating.Good, correct });
let n = 0;
const name = () => `health-${Date.now()}-${n++}`;

describe('DB v5 (review 2026-10-17): reviewLogs indexed by card and word', () => {
  it('a version-4 database upgrades with byCard and byWord, keeping every log', async () => {
    const dbName = name();
    const old = await openDB(dbName, 4, {
      upgrade(db) {
        db.createObjectStore('words', { keyPath: 'id' });
        db.createObjectStore('cards', { keyPath: 'id' }).createIndex('byWord', 'wordId');
        db.createObjectStore('reviewLogs', { keyPath: 'id', autoIncrement: true }).createIndex('byAt', 'at');
        for (const s of ['sessions', 'prompts', 'rewards', 'passages']) db.createObjectStore(s, { keyPath: s === 'sessions' ? 'date' : 'id' });
        db.createObjectStore('recordings', { keyPath: 'id' }).createIndex('byCreatedAt', 'createdAt');
        db.createObjectStore('settings');
        db.createObjectStore('kid');
        db.createObjectStore('answers', { keyPath: 'id', autoIncrement: true }).createIndex('byAt', 'at');
        db.createObjectStore('ladder', { keyPath: 'wordId' });
      },
    });
    await old.add('reviewLogs', log('b:河', 'recognise', 1));
    await old.add('reviewLogs', log('b:河', 'hear', 2));
    old.close();
    const db = await openAppDb(dbName);
    expect(DB_VERSION).toBeGreaterThanOrEqual(5);
    expect(db.transaction('reviewLogs').store.indexNames.contains('byCard')).toBe(true);
    expect(db.transaction('reviewLogs').store.indexNames.contains('byWord')).toBe(true);
    expect((await db.getAllFromIndex('reviewLogs', 'byWord', 'b:河')).length).toBe(2);
    expect((await db.getAllFromIndex('reviewLogs', 'byCard', 'b:河:hear')).length).toBe(1);
    db.close();
  });

  it('logsForCard and practisedByKind read the indexes, never every log', async () => {
    const db = await openAppDb(name());
    await addReviewLog(db, log('b:河', 'recognise', 30));
    await addReviewLog(db, log('b:大', 'recognise', 10));
    await addReviewLog(db, log('b:河', 'recognise', 20));
    await addReviewLog(db, log('b:河', 'hear', 40));
    const getAll = vi.spyOn(db, 'getAll');
    expect((await logsForCard(db, 'b:河:recognise')).map((l) => l.at)).toEqual([20, 30]);
    const byKind = await practisedByKind(db);
    expect([...byKind.get('recognise')!].sort()).toEqual(['b:大', 'b:河']);
    expect([...byKind.get('hear')!]).toEqual(['b:河']);
    expect(getAll.mock.calls.filter(([s]) => s === 'reviewLogs')).toHaveLength(0);
    expect((await practisedWords(db)).get('b:河')).toBe(40);
    db.close();
  });
});

describe('an old tab never blocks the upgrade (review 2026-10-17)', () => {
  it('an open connection closes itself when a newer version asks, and says so', async () => {
    const dbName = name();
    const onBlocking = vi.fn();
    const a = await openAppDb(dbName, { onBlocking });
    const newer = await openDB(dbName, DB_VERSION + 1); // a new build in another tab
    expect(onBlocking).toHaveBeenCalledTimes(1);
    expect(newer.version).toBe(DB_VERSION + 1);
    newer.close();
    void a;
  });
});
