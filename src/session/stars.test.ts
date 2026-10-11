import { describe, expect, it } from 'vitest';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { addReviewLog, getKid, putCards, saveKid } from '../store/repo';
import { DEFAULT_KID, type SessionPlan } from '../types';
import { createSessionRecord } from './runner';
import { settleLessonStars } from './stars';

const plan: SessionPlan = { steps: ['practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const done = (extra = false) => ({ ...createSessionRecord(plan, '2026-10-02', 0), completed: true, completedSteps: ['practice' as const], ...(extra ? { extra: true } : {}) });
const at = (h: number, d = 2) => new Date(2026, 9, d, h);
const pass = (wordId: string, kind: 'write' | 'say', when: Date) => ({ ...makeCard(wordId, kind, at(9, 20)), passed: when.getTime() });
const words = new Map([makeWord('森'), makeWord('林')].map((w) => [w.id, w]));

describe('a finished lesson’s stars (spec 2026-10-11 §5)', () => {
  it('counts what newly can be produced since the morning, and remembers where it counted up to', async () => {
    const db = await freshDb();
    await saveKid(db, DEFAULT_KID);
    await putCards(db, [pass('b:森', 'write', at(9)), pass('b:林', 'say', at(8)), pass('b:木', 'write', at(20, 1))]); // 木: yesterday
    const rec = await settleLessonStars(db, done(), at(10), (id) => words.get(id));
    expect([rec.stars, rec.produced, rec.closest]).toEqual([2, { write: 1, say: 1 }, []]);
    expect((await getKid(db))!.starredUpTo).toBe(at(10).getTime());
  });
  it('one star at least, and the closest words when nothing passed', async () => {
    const db = await freshDb();
    await saveKid(db, DEFAULT_KID);
    await putCards(db, [makeCard('b:森', 'write', at(9, 20))]);
    await addReviewLog(db, { cardId: 'b:森:write', wordId: 'b:森', kind: 'write', at: at(9).getTime(), rating: 3, correct: true, misses: 0 });
    const rec = await settleLessonStars(db, done(), at(10), (id) => words.get(id));
    expect([rec.stars, rec.produced, rec.closest]).toEqual([1, { write: 0, say: 0 }, ['森']]);
  });
  it('a take the parent confirmed after last night’s lesson counts in today’s; nothing counts twice', async () => {
    const db = await freshDb();
    await saveKid(db, { ...DEFAULT_KID, starredUpTo: at(18, 1).getTime() });
    await putCards(db, [pass('b:林', 'say', at(21, 1)), pass('b:森', 'write', at(17, 1))]); // confirmed at 21:00, after yesterday's 18:00 lesson
    expect((await settleLessonStars(db, done(), at(10), (id) => words.get(id))).produced).toEqual({ write: 0, say: 1 });
  });
  it('an extra lesson’s stars go to bonusStars, counting only what passed since the day’s lesson', async () => {
    const db = await freshDb();
    await saveKid(db, { ...DEFAULT_KID, bonusStars: 3, starredUpTo: at(10).getTime() });
    await putCards(db, [pass('b:森', 'write', at(9)), pass('b:林', 'write', at(11))]);
    const rec = await settleLessonStars(db, done(true), at(12), (id) => words.get(id));
    expect(rec.stars).toBe(1);
    expect((await getKid(db))!.bonusStars).toBe(4);
  });
});
