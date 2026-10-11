import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { newCard, review } from '../srs/scheduler';
import { freshDb, makeCard } from '../test/fixtures';
import { builtinWords } from '../content';
import { DEFAULT_SETTINGS } from '../types';
import { buildSessionPlan } from './plan';
import { addRecording, allCards, getCard, getRecording, listRecordings, logsSince, putCards } from '../store/repo';
import { endOfLocalDay } from '../lib/date';
import type { Recording } from '../types';
import { recordSayTake, reviewTake, takesToDrop, waitingTakes } from './say';

const take = { blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 };
const day = (d: number, h = 18) => new Date(2026, 9, d, h);
const rec = (id: string, wordId: string, at: Date, review?: 'ok' | 'no'): Recording => ({ id, createdAt: at.getTime(), prompt: { kind: 'say', wordId }, ...take, ...(review ? { review } : {}) });

describe('a take (spec 2026-10-11 §3)', () => {
  it('is kept for the parent, and makes his Say card the first time, scheduled like a right answer', async () => {
    const db = await freshDb();
    const card = await recordSayTake(db, 'b:森', take, day(1));
    expect(card.id).toBe('b:森:say');
    expect(card.fsrs.state).toEqual(review(newCard(day(1)), Rating.Good, day(1)).state);
    expect(card.fsrs.due).toEqual(new Date(2026, 9, 2)); // not again today: the start of tomorrow (FSRS would say +10 min)
    expect(card.passed).toBeUndefined();
    const [saved] = await listRecordings(db);
    expect(saved!.prompt).toEqual({ kind: 'say', wordId: 'b:森' });
    expect(saved!.review).toBeUndefined();
    expect(await logsSince(db, 0)).toEqual([]); // an unreviewed take never counts toward the pass
  });
  it('a take is never due again the same day, so a second lesson today does not ask the same Say words (final review I4)', async () => {
    const db = await freshDb();
    const words = builtinWords(0);
    const big = words.find((w) => w.text === '大')!;
    await putCards(db, [{ ...makeCard(big.id, 'recognise', new Date(2026, 10, 1), true), passed: day(1, 8).getTime() }]);
    const plan = async (at: Date) => buildSessionPlan({ cards: await allCards(db), words, settings: { ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026 }, now: at });
    expect((await plan(day(2, 9))).sayIds).toContain(big.id);
    await recordSayTake(db, big.id, take, day(2, 9));
    expect((await plan(day(2, 19))).sayIds).not.toContain(big.id); // 再学一课 the same evening
    expect((await plan(day(3, 9))).sayIds).toContain(big.id); // due again tomorrow
  });
  it('a later take keeps a due further out than tomorrow', async () => {
    const db = await freshDb();
    const far = review(review(newCard(day(1)), Rating.Good, day(1)), Rating.Good, day(3));
    await putCards(db, [{ ...makeCard('b:森', 'say', day(1)), fsrs: far }]);
    const card = await recordSayTake(db, 'b:森', take, day(4));
    expect(card.fsrs.due.getTime()).toBeGreaterThan(new Date(2026, 9, 5).getTime());
  });
  it('a take on a card that has passed keeps the pass', async () => {
    const db = await freshDb();
    await putCards(db, [{ ...makeCard('b:森', 'say', day(1)), passed: 5 }]);
    expect((await recordSayTake(db, 'b:森', take, day(3))).passed).toBe(5);
  });
});

describe("the parent's verdict (spec 2026-10-11 §3)", () => {
  it('passes on two separate days that each have a confirmed take, dated when the parent confirmed it', async () => {
    const db = await freshDb();
    await recordSayTake(db, 'b:森', take, day(1));
    await recordSayTake(db, 'b:森', take, day(2));
    const [second, first] = await listRecordings(db); // newest first
    await reviewTake(db, first!.id, 'ok', day(2, 20));
    expect((await getCard(db, 'b:森:say'))!.passed).toBeUndefined(); // one day is not enough
    await reviewTake(db, second!.id, 'ok', day(3, 8));
    expect((await getCard(db, 'b:森:say'))!.passed).toBe(day(3, 8).getTime());
    expect((await logsSince(db, 0)).map((l) => [l.kind, l.correct, l.at])).toEqual([['say', true, day(1).getTime()], ['say', true, day(2).getTime()]]);
  });
  it('two confirmed takes on one day do not pass', async () => {
    const db = await freshDb();
    await recordSayTake(db, 'b:森', take, day(1, 9));
    await recordSayTake(db, 'b:森', take, day(1, 19));
    for (const r of await listRecordings(db)) await reviewTake(db, r.id, 'ok', day(2));
    expect((await getCard(db, 'b:森:say'))!.passed).toBeUndefined();
  });
  it('✗ brings the card forward to be due today, and does not count', async () => {
    const db = await freshDb();
    await putCards(db, [makeCard('b:森', 'say', day(9))]);
    await addRecording(db, rec('t1', 'b:森', day(1)));
    await reviewTake(db, 't1', 'no', day(2, 7));
    expect((await getCard(db, 'b:森:say'))!.fsrs.due).toEqual(endOfLocalDay(day(2, 7)));
    expect((await getRecording(db, 't1'))!.review).toBe('no');
    expect((await logsSince(db, 0)).map((l) => [l.correct, l.rating])).toEqual([[false, Rating.Again]]);
  });
  it('a take of a word since deleted (no Say card) is still reviewed, and nothing breaks', async () => {
    const db = await freshDb();
    await addRecording(db, rec('t1', 'p:gone', day(1)));
    await reviewTake(db, 't1', 'ok', day(2));
    await addRecording(db, rec('t2', 'p:gone', day(2)));
    await reviewTake(db, 't2', 'no', day(3));
    expect((await listRecordings(db)).map((r) => r.review)).toEqual(['no', 'ok']);
    expect(await getCard(db, 'p:gone:say')).toBeUndefined();
  });
  it('two taps at once review once', async () => {
    const db = await freshDb();
    await addRecording(db, rec('t1', 'b:森', day(1)));
    await Promise.all([reviewTake(db, 't1', 'ok', day(2)), reviewTake(db, 't1', 'ok', day(2))]);
    expect((await getRecording(db, 't1'))!.review).toBe('ok');
    expect(await logsSince(db, 0)).toHaveLength(1);
  });
  it('a second tap on a reviewed take changes nothing', async () => {
    const db = await freshDb();
    await addRecording(db, rec('t1', 'b:森', day(1)));
    await reviewTake(db, 't1', 'ok', day(2));
    await reviewTake(db, 't1', 'no', day(2));
    expect((await getRecording(db, 't1'))!.review).toBe('ok');
    expect(await logsSince(db, 0)).toHaveLength(1);
  });
});

describe('keeping takes tidy (spec 2026-10-11 §6, §7)', () => {
  it('the queue is the waiting takes, oldest first, and no other recordings', () => {
    const recs = [rec('b', 'b:林', day(2)), rec('a', 'b:森', day(1)), rec('c', 'b:森', day(3), 'ok'), { ...rec('p', 'x', day(1)), prompt: { kind: 'intro' as const } }];
    expect(waitingTakes(recs).map((r) => r.id)).toEqual(['a', 'b']);
  });
  it('reviewed takes older than 14 days go, but each word keeps its newest take', () => {
    const recs = [rec('old', 'b:森', day(1), 'ok'), rec('newest', 'b:森', day(2), 'no'), rec('only', 'b:林', day(1), 'ok'), rec('waiting', 'b:木', day(1))];
    expect(takesToDrop(recs, day(20))).toEqual(['old']);
    expect(takesToDrop(recs, day(14))).toEqual([]); // not yet 14 days
  });
  it('past 60 waiting, only each word’s newest waiting take stays', () => {
    const recs = Array.from({ length: 61 }, (_, i) => rec(`t${i}`, i < 31 ? 'b:森' : `b:${i}`, new Date(day(1).getTime() + i * 60_000)));
    const drop = takesToDrop(recs, day(2));
    expect(drop).toHaveLength(30);
    expect(drop).not.toContain('t30'); // 森's newest
    expect(takesToDrop(recs.slice(0, 60), day(2))).toEqual([]); // 60 waiting: all kept
  });
  it('once a word’s Say has passed, its reviewed takes older than 14 days all go, the newest too (final review I5)', () => {
    const recs = [rec('old', 'b:森', day(1), 'ok'), rec('newest', 'b:森', day(2), 'ok'), rec('lin', 'b:林', day(1), 'ok'), rec('waiting', 'b:森', day(1))];
    expect(takesToDrop(recs, day(20), new Set(['b:森'])).sort()).toEqual(['newest', 'old']); // 林 has not passed: it keeps its newest
    expect(takesToDrop(recs, day(14), new Set(['b:森']))).toEqual([]); // not yet 14 days
  });
  it('a new take drops a passed word’s old reviewed takes from the store', async () => {
    const db = await freshDb();
    await putCards(db, [{ ...makeCard('b:森', 'say', day(1)), passed: day(3).getTime() }]);
    await addRecording(db, rec('sen', 'b:森', day(1), 'ok'));
    await addRecording(db, rec('lin', 'b:林', day(1), 'ok'));
    await recordSayTake(db, 'b:木', take, day(20));
    expect((await listRecordings(db)).map((r) => r.prompt.kind === 'say' && r.prompt.wordId).sort()).toEqual(['b:木', 'b:林']);
  });
  it('a new take tidies the store', async () => {
    const db = await freshDb();
    await addRecording(db, rec('old', 'b:森', day(1), 'ok'));
    await recordSayTake(db, 'b:森', take, day(20));
    expect((await listRecordings(db)).map((r) => r.id)).not.toContain('old');
  });
});
