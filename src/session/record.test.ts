// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { addReviewLog, allCards, allWords, getSession, getSettings, logsSince, putCards, putWords, saveSession, updateSettings } from '../store/repo';
import { builtinWords } from '../content';
import { seededKnownCard } from '../srs/scheduler';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb, makeWord } from '../test/fixtures';
import { bringForward, markWriteSkipped, recordMeaning, recordRecognition, recordUse, recordWriting, startExtraLesson, startOrResumeSession } from './record';
/** One character each (写一写 writes a character once a lesson, spec 2026-10-05 §5). */
const DISTINCT = Array.from('一二三四五六七八九十人大小山水火木日月田上下中天地子女手口目耳心土石云雨花草米竹虫鱼羊牛马鸟');

const now = new Date(2026, 9, 2, 9);

describe('recording answers', () => {
  it('creates a card on the first answer and reviews it afterwards', async () => {
    const db = await freshDb();
    const first = await recordRecognition(db, 'b:大', { correct: true, responseMs: 1000 }, now);
    expect(first.id).toBe('b:大:recognise');
    const second = await recordRecognition(db, 'b:大', { correct: true, responseMs: 1000 }, new Date(first.fsrs.due.getTime() + 1000));
    expect(second.fsrs.reps).toBe(2);
    expect((await logsSince(db, 0)).map((l) => l.rating)).toEqual([Rating.Good, Rating.Good]);
  });

  it('records writing with its miss count', async () => {
    const db = await freshDb();
    await recordWriting(db, 'b:大', 2, now);
    const [log] = await logsSince(db, 0);
    expect(log).toMatchObject({ kind: 'write', misses: 2, rating: Rating.Hard, correct: true });
    expect((await allCards(db))[0]!.id).toBe('b:大:write');
  });
});

describe('startOrResumeSession', () => {
  it('resumes on the same day and starts fresh on a new day, keeping yesterday in history', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('大', { id: 'b:大' })]);
    const first = await startOrResumeSession(db, now);
    expect(first.plan.newWordIds).toEqual(['b:大']);
    await saveSession(db, { ...first, flashIndex: 1 });
    expect((await startOrResumeSession(db, new Date(2026, 9, 2, 18))).flashIndex).toBe(1);
    const tomorrow = await startOrResumeSession(db, new Date(2026, 9, 3, 9));
    expect(tomorrow.date).toBe('2026-10-03');
    expect(tomorrow.flashIndex).toBe(0);
    expect((await getSession(db, '2026-10-02'))?.flashIndex).toBe(1);
  });
});

describe('startOrResumeSession after a settings change', () => {
  it("rebuilds today's untouched plan so a parent's change applies today", async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 2, 8);
    expect((await startOrResumeSession(db, now)).plan.steps).toContain('writing');
    await updateSettings(db, { activities: { ...DEFAULT_SETTINGS.activities, writing: false } });
    expect((await startOrResumeSession(db, now)).plan.steps).not.toContain('writing');
  });
  it('keeps a plan the child has already started', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 2, 8);
    const rec = await startOrResumeSession(db, now);
    await saveSession(db, { ...rec, activeMs: 5000 });
    await updateSettings(db, { activities: { ...DEFAULT_SETTINGS.activities, writing: false } });
    expect((await startOrResumeSession(db, now)).plan.steps).toContain('writing');
  });
});

describe('markWriteSkipped', () => {
  it('stamps the word so tomorrow offers other new words to write first', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('龘')]);
    await markWriteSkipped(db, 'b:龘', now);
    expect((await allWords(db))[0]?.writeSkippedAt).toBe(now.getTime());
  });
  it('final review I1: once he writes it, the stamp goes, so it is never kept at the back for good', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('鸟')]);
    await markWriteSkipped(db, 'b:鸟', now);
    await recordWriting(db, 'b:鸟', 0, now);
    expect((await allWords(db))[0]?.writeSkippedAt).toBeUndefined();
  });
});

describe("today's plan knows what he has practised", () => {
  it('写一写 starts with a word from his lessons, not the hardest placed character', async () => {
    const db = await freshDb();
    const ws = Array.from({ length: 6 }, (_, i) => makeWord(DISTINCT[i]!, { id: `b:${i}`, rank: i, writeable: true }));
    await putWords(db, ws);
    await putCards(db, ws.map((w) => ({ id: `${w.id}:recognise`, wordId: w.id, kind: 'recognise' as const, fsrs: seededKnownCard(now, 20) })));
    await addReviewLog(db, { cardId: 'b:1:recognise', wordId: 'b:1', kind: 'recognise', at: now.getTime() - 3_600_000, rating: Rating.Good, correct: true });
    const rec = await startOrResumeSession(db, now);
    expect(rec.plan.writeCandidates.map((c) => c.wordId).slice(0, 2)).toEqual(['b:1', 'b:5']); // then the rest he reads, going down (spec 2026-10-05 §5)
  });
});

describe('meaning memory', () => {
it('a meaning answer reviews the meaning card, not the reading one', async () => {
  const db = await freshDb();
  await putWords(db, [makeWord('他', { id: 'b:他' })]);
  await recordRecognition(db, 'b:他', { correct: true, responseMs: 900 }, now);
  await recordMeaning(db, 'b:他', { correct: false, responseMs: 900 }, now);
  const cards = await allCards(db);
  expect(cards.map((c) => c.kind).sort()).toEqual(['meaning', 'recognise']);
  expect((await logsSince(db, 0)).map((l) => l.kind)).toEqual(['recognise', 'meaning']);
});
});

describe('words used in context (spec §20 part 4, §19 part 3)', () => {
  it('recordUse rates the meaning card once a day; a later miss the same day brings it forward instead', async () => {
    const db = await freshDb();
    const at = new Date(2026, 9, 5, 10);
    const first = await recordUse(db, 'b:很', true, at);
    const later = await recordUse(db, 'b:很', false, new Date(2026, 9, 5, 10, 5));
    expect(later.fsrs.reps).toBe(first.fsrs.reps); // no second rating today
    expect(later.fsrs.due.getTime()).toBeLessThanOrEqual(new Date(2026, 9, 6).getTime());
    expect((await logsSince(db, 0)).filter((l) => l.kind === 'meaning')).toHaveLength(1);
  });
  it('bringForward never pushes a card later', async () => {
    const db = await freshDb();
    await putCards(db, [{ id: 'b:很:write', wordId: 'b:很', kind: 'write', fsrs: { ...seededKnownCard(now), due: new Date(2026, 9, 3) } }]);
    await bringForward(db, 'b:很', 'write', new Date(2026, 9, 9));
    expect((await allCards(db))[0]!.fsrs.due).toEqual(new Date(2026, 9, 3));
    await bringForward(db, 'b:很', 'write', new Date(2026, 9, 2, 12));
    expect((await allCards(db))[0]!.fsrs.due).toEqual(new Date(2026, 9, 2, 12));
  });
});

describe('response time in words-in-use answers (deferred minor, plan 13)', () => {
  it('recordUse keeps the response time, so a slow right answer can rate Hard', async () => {
    const db = await freshDb();
    await recordUse(db, 'b:很', true, new Date(2026, 9, 5, 10), 25_000);
    const logs = await logsSince(db, 0);
    expect(logs[0]!.responseMs).toBe(25_000);
    expect(logs[0]!.source).toBe('use');
  });
  it('reading the sentence takes time: a right answer at 8 s is still Good, not Hard (review I4)', async () => {
    const db = await freshDb();
    await recordUse(db, 'b:很', true, new Date(2026, 9, 5, 10), 8_000);
    expect((await logsSince(db, 0))[0]!.rating).toBe(Rating.Good);
  });
});

describe('pacing in the lesson plan (spec 2026-10-05 §2.2)', () => {
  it('a new install starts at 4 new words a day, under a ceiling of 8, and saves why', async () => {
    const db = await freshDb();
    await putWords(db, builtinWords(0));
    const rec = await startOrResumeSession(db, new Date(2026, 9, 6, 16));
    expect(rec.plan.newWordIds).toHaveLength(4);
    const s = await getSettings(db);
    expect(s.newPerDay).toBe(8);
    expect(s.pace).toMatchObject({ day: '2026-10-06', perDay: 4 });
  });
  it('the pace is worked out once a day', async () => {
    const db = await freshDb();
    await putWords(db, builtinWords(0));
    await updateSettings(db, { pace: { day: '2026-10-06', perDay: 6, reason: 'kept 9 of 10 recent new words' } });
    expect((await startOrResumeSession(db, new Date(2026, 9, 6, 16))).plan.newWordIds).toHaveLength(6);
  });
});

describe('final review I2: a lowered ceiling applies today', () => {
  it('the cached pace never goes over the ceiling the parent just set', async () => {
    const db = await freshDb();
    await putWords(db, builtinWords(0));
    await updateSettings(db, { newPerDay: 3, pace: { day: '2026-10-06', perDay: 6, reason: 'kept 9 of 10 recent new words' } });
    expect((await startOrResumeSession(db, new Date(2026, 9, 6, 16))).plan.newWordIds).toHaveLength(3);
  });
});

describe('an extra lesson (parent, 2026-10-05: more than one lesson a day; the baseline stays one)', () => {
  it('is a fresh real lesson with the next new words; today\'s lesson stays as it was', async () => {
    const db = await freshDb();
    await putWords(db, builtinWords(0).slice(0, 20));
    const today = await startOrResumeSession(db, now);
    const done = { ...today, completed: true, completedSteps: today.plan.steps, flashIndex: today.flashQueue.length };
    await saveSession(db, done);
    // he met today's new words: their cards exist now
    for (const id of today.plan.newWordIds) await recordRecognition(db, id, { correct: true, responseMs: 900 }, now);
    const extra = await startExtraLesson(db, new Date(2026, 9, 2, 17));
    expect(extra.extra).toBe(true);
    expect(extra.free).toBe(false);
    expect(extra.completed).toBe(false);
    expect(extra.plan.newWordIds.length).toBeGreaterThan(0);
    expect(extra.plan.newWordIds.some((id) => today.plan.newWordIds.includes(id))).toBe(false);
    expect(await getSession(db, '2026-10-02')).toEqual(done); // never saved over the day's lesson
  });
});

describe('sweep: a day with new words switched off keeps his pace', () => {
  it('switching new words off for a day and back on picks up where he was, not at 3', async () => {
    const db = await freshDb();
    await putWords(db, builtinWords(0));
    await updateSettings(db, { pace: { day: '2026-10-05', perDay: 6, reason: 'kept 9 of 10 recent new words' }, newPerDay: 0 });
    expect((await startOrResumeSession(db, new Date(2026, 9, 6, 16))).plan.newWordIds).toHaveLength(0);
    await updateSettings(db, { newPerDay: 8 });
    expect((await startOrResumeSession(db, new Date(2026, 9, 7, 16))).plan.newWordIds).toHaveLength(6);
  });
});

