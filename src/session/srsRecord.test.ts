// @vitest-environment node
// SRS tuning spec §3.1 (Hard until produced), §3.2 (his slow line at the rating sites) and §4 (what every log keeps).
import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import { getCard, getRecording, listRecordings, logsSince, putCards, putWords } from '../store/repo';
import { seededKnownCard } from '../srs/scheduler';
import { freshDb, makeWord, markProduced } from '../test/fixtures';
import { beginNewWord, isProduced, recordHear, recordMeaning, recordRecognition, recordUnderstand, recordUse, recordWriting, recordWrittenMeaning } from './record';
import { recordSayTake, recordSentenceTake, reviewTake } from './say';

type Db = Awaited<ReturnType<typeof freshDb>>;
const day1 = new Date(2026, 9, 13, 9);
const day4 = new Date(2026, 9, 16, 9);
const take = { blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 1 };
const lastLog = async (db: Db) => (await logsSince(db, 0)).sort((a, b) => a.at - b.at || (a.id ?? 0) - (b.id ?? 0)).at(-1)!;

describe('produced (spec §3.1)', () => {
  it('a passed write, Say or 说一句 card makes a word produced; an unpassed one does not', async () => {
    const db = await freshDb();
    expect(await isProduced(db, 'b:大')).toBe(false);
    await recordWriting(db, 'b:大', 0, day1); // written once: not yet passed
    expect(await isProduced(db, 'b:大')).toBe(false);
    for (const kind of ['write', 'say', 'sentence'] as const) {
      const db2 = await freshDb();
      await putCards(db2, [{ id: `b:大:${kind}`, wordId: 'b:大', kind, fsrs: seededKnownCard(day1), passed: day1.getTime() }]);
      expect(await isProduced(db2, 'b:大')).toBe(true);
    }
  });
});

describe('Hard until produced, at every tap rating site (spec §3.1)', () => {
  const sites = {
    recognise: (db: Db) => recordRecognition(db, 'b:大', { correct: true, responseMs: 1500 }, day1),
    meaning: (db: Db) => recordMeaning(db, 'b:大', { correct: true, responseMs: 1500 }, day1),
    hear: (db: Db) => recordHear(db, 'b:大', { correct: true, responseMs: 1500 }, day1),
    understand: (db: Db) => recordUnderstand(db, 'b:大', { correct: true, responseMs: 5500 }, day1),
    use: (db: Db) => recordUse(db, 'b:大', true, day1, 10_500),
    newWord: (db: Db) => beginNewWord(db, makeWord('大', { meaning: 'big' }), 'hear', { correct: true, responseMs: 1500 }, day1),
  };
  for (const [site, answer] of Object.entries(sites)) {
    it(`${site}: a right answer is Hard before a production pass`, async () => {
      const db = await freshDb();
      await answer(db);
      expect((await lastLog(db)).rating).toBe(Rating.Hard);
    });
    it(`${site}: Good once the word is produced`, async () => {
      const db = await freshDb();
      await markProduced(db, 'b:大');
      await answer(db);
      expect((await lastLog(db)).rating).toBe(Rating.Good);
    });
  }
  it('a write that passes mid-lesson makes his next tap on the word Good, the same lesson', async () => {
    const db = await freshDb();
    await recordWriting(db, 'b:大', 0, day1);
    await recordWriting(db, 'b:大', 0, day4); // two right days: the write card passes
    expect((await getCard(db, 'b:大:write'))!.passed).toBeDefined();
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 1500 }, new Date(day4.getTime() + 60_000));
    expect((await lastLog(db)).rating).toBe(Rating.Good);
  });
  it('a wrong answer is Again either way', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await recordRecognition(db, 'b:大', { correct: false, responseMs: 1500 }, day1);
    expect((await lastLog(db)).rating).toBe(Rating.Again);
  });
  it('the 组词 credit from 写一写 is production itself: Good with no prior pass', async () => {
    const db = await freshDb();
    await recordWrittenMeaning(db, 'b:大', true, day1);
    expect((await lastLog(db)).rating).toBe(Rating.Good);
  });
});

describe('his slow line at the rating sites (spec §3.2)', () => {
  it('a right answer over his line is Hard even when produced; under it, Good', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 3600, slow: { recognise: 3500 } }, day1);
    expect((await lastLog(db)).rating).toBe(Rating.Hard);
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 7000, slow: { recognise: 8000 } }, day4);
    expect((await lastLog(db)).rating).toBe(Rating.Good); // over the old 6 s, under his line
  });
  it('each kind uses its own line, after listening or reading time comes off', async () => {
    const db = await freshDb();
    await markProduced(db, 'b:大');
    await recordUnderstand(db, 'b:大', { correct: true, responseMs: 4000 + 3000, slow: { understand: 2900, recognise: 9000 } }, day1);
    expect((await lastLog(db)).rating).toBe(Rating.Hard);
    await recordUse(db, 'b:大', true, day1, 9000 + 2000, { meaning: 2500 });
    expect((await lastLog(db)).rating).toBe(Rating.Good);
  });
  it('the log keeps the real time, never the slow lines', async () => {
    const db = await freshDb();
    await recordHear(db, 'b:大', { correct: true, responseMs: 2100, slow: { hear: 5000 } }, day1);
    const l = await lastLog(db);
    expect(l.responseMs).toBe(2100);
    expect(l).not.toHaveProperty('slow');
  });
});

describe('every rating path logs the card before the review (spec §4)', () => {
  const second = async (db: Db, at: Date) => {
    const l = await lastLog(db);
    expect(l.at).toBe(at.getTime());
    return l;
  };
  it('a first answer: New, 0 days, interval 0', async () => {
    const db = await freshDb();
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 1500 }, day1);
    expect(await lastLog(db)).toMatchObject({ state: State.New, elapsedDays: 0, scheduledDays: 0 });
  });
  it('a known card three days on: Review, 3 days, the interval it was on', async () => {
    const db = await freshDb();
    await putCards(db, [{ id: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', fsrs: seededKnownCard(day1, 3) }]);
    await recordRecognition(db, 'b:大', { correct: true, responseMs: 1500 }, day4);
    expect(await second(db, day4)).toMatchObject({ state: State.Review, elapsedDays: 3, scheduledDays: 3 });
  });
  for (const [path, run] of Object.entries({
    meaning: (db: Db, at: Date) => recordMeaning(db, 'b:大', { correct: true, responseMs: 1500 }, at),
    use: (db: Db, at: Date) => recordUse(db, 'b:大', true, at, 9000),
    writtenMeaning: (db: Db, at: Date) => recordWrittenMeaning(db, 'b:大', true, at),
    hear: (db: Db, at: Date) => recordHear(db, 'b:大', { correct: true, responseMs: 1500 }, at),
    understand: (db: Db, at: Date) => recordUnderstand(db, 'b:大', { correct: true, responseMs: 5000 }, at),
    write: (db: Db, at: Date) => recordWriting(db, 'b:大', 0, at),
  })) {
    it(`${path}: the second review three days later logs the gap and the state`, async () => {
      const db = await freshDb();
      await run(db, day1);
      const card = (await getCard(db, `b:大:${path === 'write' ? 'write' : path === 'hear' || path === 'understand' ? path : 'meaning'}`))!;
      await run(db, day4);
      expect(await second(db, day4)).toMatchObject({ state: card.fsrs.state, elapsedDays: 3, scheduledDays: card.fsrs.scheduled_days });
    });
  }
  it('Say and 说一句: the verdict logs the card as it was when he recorded (settleTake)', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('大')]);
    await putCards(db, [{ id: 'b:大:say', wordId: 'b:大', kind: 'say', fsrs: seededKnownCard(day1, 3) }]);
    await recordSayTake(db, 'b:大', take, day4);
    await recordSentenceTake(db, 'b:大', take, day4);
    const recs = await listRecordings(db);
    const say = recs.find((r) => r.prompt.kind === 'say');
    const sentence = recs.find((r) => r.prompt.kind === 'sentence');
    expect((await getRecording(db, say!.id))!.cardBefore).toEqual({ state: State.Review, elapsedDays: 3, scheduledDays: 3 });
    await reviewTake(db, say!.id, 'ok', new Date(2026, 9, 20, 9)); // the parent listens days later
    expect(await lastLog(db)).toMatchObject({ kind: 'say', state: State.Review, elapsedDays: 3, scheduledDays: 3 });
    await reviewTake(db, sentence!.id, 'no', new Date(2026, 9, 20, 9));
    expect(await lastLog(db)).toMatchObject({ kind: 'sentence', state: State.New, elapsedDays: 0, scheduledDays: 0 });
  });
});
