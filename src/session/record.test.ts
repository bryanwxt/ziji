// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { addReviewLog, allCards, allWords, getCard, getSession, getSettings, getWord, logsSince, putCards, putWords, saveSession, updateSettings } from '../store/repo';
import { builtinWords } from '../content';
import { seededKnownCard } from '../srs/scheduler';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb, makeWord, markProduced } from '../test/fixtures';
import { bringForward, markTraced, markWriteSkipped, recordMeaning, recordRecall, recordRecognition, recordUse, recordWriting, recordWrittenMeaning, startExtraLesson, startOrResumeSession } from './record';
/** One character each (写一写 writes a character once a lesson, spec 2026-10-05 §5). */
const DISTINCT = Array.from('一二三四五六七八九十人大小山水火木日月田上下中天地子女手口目耳心土石云雨花草米竹虫鱼羊牛马鸟');

const now = new Date(2026, 9, 2, 9);

describe('recording answers', () => {
  it('creates a card on the first answer and reviews it afterwards', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大'); // written already: a right tap is Good
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
    expect(first.plan.newWordIds[0]).toBe('b:大'); // then its ladder 词语 (大大) may follow in the same lesson (spec 2026-10-06 §3.1)
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
    await markProduced(db, 'b:很');
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
  it('is a fresh real lesson with no new words (review only, learning rules 2026-10-17); today\'s lesson stays as it was', async () => {
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
    expect(today.plan.newWordIds.length).toBeGreaterThan(0);
    expect(extra.plan.newWordIds).toEqual([]);
    expect((await getSettings(db)).pace?.perDay).toBeDefined(); // the day's pace was the daily lesson's; the extra never moved it
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

describe('the 组词 written in 写一写 rates meaning (production practice spec §3)', () => {
  const day = (d: number, h = 17) => new Date(2026, 9, d, h);
  it('logged like the other meaning ratings, with no answer time; two right days pass the Use rung', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('计', { examples: [{ text: '计划', pinyin: 'jì huà' }] })]);
    await recordWrittenMeaning(db, 'b:计', true, day(5));
    const [log] = await logsSince(db, 0);
    expect(log).toMatchObject({ kind: 'meaning', cardId: 'b:计:meaning', correct: true, rating: Rating.Good, source: 'write' });
    expect(log!.responseMs).toBeUndefined();
    expect((await getCard(db, 'b:计:meaning'))!.passed).toBeUndefined();
    await recordWrittenMeaning(db, 'b:计', true, day(6));
    expect((await getCard(db, 'b:计:meaning'))!.passed).toBe(day(6).getTime());
  });
  it('wrong rates Again; a second rating the same day only brings a miss forward', async () => {
    const db = await freshDb();
    await recordUse(db, 'b:计', true, day(5, 9)); // 练一练 rated it this morning
    await recordWrittenMeaning(db, 'b:计', false, day(5));
    expect((await logsSince(db, 0)).filter((l) => l.source === 'write')).toEqual([]);
    expect((await getCard(db, 'b:计:meaning'))!.fsrs.due.getTime()).toBeLessThanOrEqual(new Date(2026, 9, 5, 23, 59, 59, 999).getTime());
    const db2 = await freshDb();
    await recordWrittenMeaning(db2, 'b:计', false, day(5));
    expect((await logsSince(db2, 0)).map((l) => [l.rating, l.correct])).toEqual([[Rating.Again, false]]);
  });
  it('markTraced notes a read-only character\'s first trace, once', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('澡', { writeable: false })]);
    await markTraced(db, 'b:澡', day(5));
    await markTraced(db, 'b:澡', day(6));
    expect((await getWord(db, 'b:澡'))!.tracedAt).toBe(day(5).getTime());
    await markTraced(db, 'b:不在', day(6)); // not stored (a ladder 词语): nothing happens
  });
});

describe('too fast to count (real test spec 2026-10-23 §6)', () => {
  const yesterday = new Date(2026, 9, 1, 9);
  const rightYesterday = async (db: Awaited<ReturnType<typeof freshDb>>) => {
    await putCards(db, [{ id: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', fsrs: { ...seededKnownCard(yesterday, 1) } }]);
    await addReviewLog(db, { cardId: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', at: yesterday.getTime(), rating: Rating.Good, correct: true, responseMs: 2000 });
  };
  it('a guess (899 ms) rates Hard even when produced, is logged as a guess, and settles no rung', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await rightYesterday(db);
    const card = await recordRecognition(db, 'b:大', { correct: true, responseMs: 899, guess: true }, now);
    const log = (await logsSince(db, now.getTime()))[0]!;
    expect(log).toMatchObject({ rating: Rating.Hard, correct: true, guess: true });
    expect(card.passed).toBeUndefined(); // two right days, but today's was a guess
  });
  it('a right tap at 901 ms is as before: Good when produced, and the second right day passes the rung', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await rightYesterday(db);
    const card = await recordRecognition(db, 'b:大', { correct: true, responseMs: 901 }, now);
    expect((await logsSince(db, now.getTime()))[0]!).toMatchObject({ rating: Rating.Good });
    expect(card.passed).toBe(now.getTime());
  });
  it('a 选一选 guess through recordUse rates the meaning card Hard', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:很');
    await recordUse(db, 'b:很', true, now, 500, undefined, true);
    expect((await logsSince(db, 0)).find((l) => l.kind === 'meaning')).toMatchObject({ rating: Rating.Hard, guess: true });
  });
});

describe('默写 in 练一练: what it grades (real test spec 2026-10-23 §4)', () => {
  const g = { wordId: 'b:草', writeId: 'b:草', reading: true, meaning: false };
  const setup = async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('草')]);
    await putCards(db, [{ id: 'b:草:recognise', wordId: 'b:草', kind: 'recognise', fsrs: seededKnownCard(new Date(2026, 8, 20), 12) }, { id: 'b:草:write', wordId: 'b:草', kind: 'write', fsrs: seededKnownCard(new Date(2026, 8, 20), 30) }]);
    return db;
  };
  const writeLog = async (db: Awaited<ReturnType<typeof freshDb>>) => (await logsSince(db, now.getTime())).find((l) => l.kind === 'write');
  it('the write card by its misses: 0 Good, 1–3 Hard, more Again; logged as a recall, right only with at most 1 miss and no hint', async () => {
    for (const [misses, hinted, rating, correct] of [[0, false, Rating.Good, true], [1, false, Rating.Hard, true], [2, true, Rating.Hard, false], [4, true, Rating.Again, false]] as const) {
      const db = await setup();
      await recordRecall(db, g, { totalMisses: misses, hinted }, now);
      expect(await writeLog(db), `${misses}`).toMatchObject({ rating, correct, misses, source: 'recall' });
    }
  });
  it('the due reading card: Good when right (produced), Again when not', async () => {
    for (const [misses, rating] of [[0, Rating.Good], [3, Rating.Again]] as const) {
      const db = await setup();
      await recordRecall(db, g, { totalMisses: misses, hinted: misses > 1 }, now);
      expect((await logsSince(db, now.getTime())).find((l) => l.kind === 'recognise')).toMatchObject({ rating, source: 'recall' });
    }
  });
  it('the due meaning card with a 组词 cue: credited as 写一写’s written 组词', async () => {
    const db = await setup();
    await recordRecall(db, { ...g, meaning: true }, { totalMisses: 0, hinted: false }, now);
    expect((await logsSince(db, now.getTime())).find((l) => l.kind === 'meaning')).toMatchObject({ rating: Rating.Good, source: 'write' });
  });
  it('its write pass makes later right taps Good: two days right and the word is produced', async () => {
    const db = await setup();
    await recordRecall(db, { ...g, reading: false }, { totalMisses: 0, hinted: false }, new Date(2026, 9, 1, 9));
    await recordRecall(db, { ...g, reading: false }, { totalMisses: 0, hinted: false }, now);
    expect((await getCard(db, 'b:草:write'))!.passed).toBe(now.getTime());
    await recordRecognition(db, 'b:草', { correct: true, responseMs: 2000 }, now);
    expect((await logsSince(db, now.getTime())).find((l) => l.kind === 'recognise')!.rating).toBe(Rating.Good);
  });
  it('a write card already rated today: a miss only brings it forward', async () => {
    const db = await setup();
    await recordWriting(db, 'b:草', 0, new Date(2026, 9, 2, 8));
    await recordRecall(db, { ...g, reading: false }, { totalMisses: 4, hinted: true }, now);
    expect((await logsSince(db, 0)).filter((l) => l.kind === 'write')).toHaveLength(1);
    expect((await getCard(db, 'b:草:write'))!.fsrs.due.getTime()).toBeLessThanOrEqual(new Date(2026, 9, 2, 23, 59, 59, 999).getTime());
  });
});

describe('a 默写 reading on a placed card is its recheck (review M5)', () => {
  const g = { wordId: 'b:草', writeId: 'b:草', reading: true, meaning: false };
  const setup = async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('草')]);
    await putCards(db, [{ id: 'b:草:recognise', wordId: 'b:草', kind: 'recognise', fsrs: seededKnownCard(new Date(2026, 8, 20), 12), passed: new Date(2026, 8, 20).getTime(), placed: true }]);
    return db;
  };
  it('right: the guess is confirmed (placed cleared), its log marked as the placed check', async () => {
    const db = await setup();
    await recordRecall(db, g, { totalMisses: 0, hinted: false }, now);
    const card = await getCard(db, 'b:草:recognise');
    expect(card?.placed).toBeUndefined();
    expect(card?.passed).toBeDefined();
    expect((await logsSince(db, now.getTime())).find((l) => l.kind === 'recognise')).toMatchObject({ placedCheck: true, source: 'recall' });
  });
  it('wrong: it goes back to learn, as a missed recheck does — its reading card goes, his answered write card stays', async () => {
    const db = await setup();
    await recordRecall(db, g, { totalMisses: 4, hinted: true }, now);
    expect(await getCard(db, 'b:草:recognise')).toBeUndefined();
    expect(await getCard(db, 'b:草:write')).toBeDefined();
  });
  it('wrong, with a 组词 cue: no lone meaning card is made for a word sent back to learn', async () => {
    const db = await setup();
    await recordRecall(db, { ...g, meaning: true }, { totalMisses: 4, hinted: true }, now);
    expect(await getCard(db, 'b:草:meaning')).toBeUndefined();
  });
});
