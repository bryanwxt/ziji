import { describe, expect, it, vi } from 'vitest';
import * as repo from '../store/repo';
import { getKid, saveKid } from '../store/repo';
import { waitingTakes } from '../session/say';
import { addRecording, getRecording, listRecordings, putWords } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { DEFAULT_KID, type Recording } from '../types';
import { addExtraDay } from './cycle';
import { finishPassageReview, passageTakesToDrop, tidyPassageTakes, waitingPassageTakes } from './review';

const day = (d: number, h = 17) => new Date(2026, 9, d, h).getTime();
const rec = (id: string, prompt: Recording['prompt'], at: number, review?: 'ok' | 'no'): Recording => ({ id, createdAt: at, prompt, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 20, ...(review ? { review } : {}) });
const passage = (id: string, passageId: string, at: number, review?: 'ok') => rec(id, { kind: 'passage', passageId }, at, review);

describe('passage takes in the queue (spec 2026-10-12 §6)', () => {
  it('the newest take of each passage waits, if unreviewed; older ones leave the queue but are not deleted', () => {
    const recs = [passage('a1', 'p01', day(1)), passage('a2', 'p01', day(2)), passage('a3', 'p01', day(2, 18)), passage('b1', 'pp:x', day(2)), passage('c1', 'p02', day(3), 'ok')];
    expect(waitingPassageTakes(recs).map((r) => r.id).sort()).toEqual(['a3', 'b1']);
    expect(passageTakesToDrop(recs, new Date(2026, 9, 3))).toEqual([]);
  });
  it('self-introductions never wait; Say takes and passage takes wait together, oldest first', () => {
    const recs = [rec('i', { kind: 'intro' }, day(1)), passage('p', 'p01', day(3)), rec('s', { kind: 'say', wordId: 'b:大' }, day(2))];
    expect(waitingTakes(recs).map((r) => r.id)).toEqual(['s', 'p']);
  });
  it('tidy: passage takes older than 14 days go, reviewed or not, each passage keeps its newest; other recordings stay', async () => {
    const now = new Date(2026, 9, 30);
    const recs = [
      passage('old', 'p01', day(1), 'ok'), passage('new', 'p01', day(28), 'ok'),
      passage('only', 'p02', day(1), 'ok'), // its passage's newest: kept whatever its age
      passage('unheard-newest', 'p04', day(1)), // its passage's newest, never listened to: kept, it still waits
      passage('superseded', 'p03', day(1)), passage('newer', 'p03', day(2), 'ok'), // superseded: it can never be reviewed (final review I5)
      passage('recent', 'p03', day(20)), // under 14 days: kept, though superseded
      rec('intro', { kind: 'intro' }, day(1)),
    ];
    expect(passageTakesToDrop(recs, now).sort()).toEqual(['newer', 'old', 'superseded']);
    const db = await freshDb();
    for (const r of recs) await addRecording(db, r);
    await tidyPassageTakes(db, now);
    expect((await listRecordings(db)).map((r) => r.id).sort()).toEqual(['intro', 'new', 'only', 'recent', 'unheard-newest']);
  });
  it('Done saves the marks as priority words and marks the take listened to', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('爱')]);
    const r = passage('a', 'pp:1', day(1));
    await addRecording(db, r);
    await finishPassageReview(db, r, ['爱'], new Date(2026, 9, 2));
    expect(await getRecording(db, 'a')).toMatchObject({ review: 'ok', misread: ['爱'] });
    expect(waitingPassageTakes(await listRecordings(db))).toEqual([]);
  });
  it('a retry after a failed save grants one extra day and finishes the take', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('爱')]);
    const r = passage('a', 'p01', day(1));
    await addRecording(db, r);
    const before = { passageId: 'p01', days: 3, extra: 0, lastDay: '2026-10-01', lastRead: {}, warmups: 0 };
    await saveKid(db, { ...DEFAULT_KID, reading: before });
    const real = repo.updateRecording;
    let calls = 0;
    const spy = vi.spyOn(repo, 'updateRecording').mockImplementation(async (d, x) => {
      if (++calls === 2) throw new Error('boom'); // applyMisreads' save is call 1; the review save fails
      return real(d, x);
    });
    await expect(finishPassageReview(db, r, ['爱'], new Date(2026, 9, 2))).rejects.toThrow('boom');
    await finishPassageReview(db, r, ['爱'], new Date(2026, 9, 2));
    spy.mockRestore();
    expect(await getRecording(db, 'a')).toMatchObject({ review: 'ok', misread: ['爱'] });
    const after = (await getKid(db))!.reading;
    expect(JSON.stringify(after)).toBe(JSON.stringify(addExtraDay(before, 'p01')));
  });
});

describe('多读一遍 takes (final review I6): listed, never the queue take, tidied after 14 days', () => {
  const extra = (id: string, passageId: string, at: number) => rec(id, { kind: 'passage', passageId, extra: true }, at);
  it("an extra round after the lesson leaves the lesson's take (with his answer) waiting", () => {
    const lesson = { ...passage('lesson', 'p01', day(2)), meaning: { correct: true, picked: '树上' } };
    expect(waitingPassageTakes([lesson, extra('x1', 'p01', day(2, 19)), extra('x2', 'p01', day(3))]).map((r) => r.id)).toEqual(['lesson']);
  });
  it('a passage read only in extra rounds has nothing waiting', () => {
    expect(waitingPassageTakes([extra('x1', 'p01', day(2))])).toEqual([]);
  });
  it("tidy keeps the passage's newest lesson take forever; extra takes go after 14 days like any other", () => {
    const now = new Date(2026, 9, 30);
    const recs = [passage('lesson', 'p01', day(1), 'ok'), extra('x-old', 'p01', day(2)), extra('x-new', 'p01', day(25))];
    expect(passageTakesToDrop(recs, now)).toEqual(['x-old']);
  });
});
