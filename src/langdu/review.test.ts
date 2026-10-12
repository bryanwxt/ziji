import { describe, expect, it } from 'vitest';
import { waitingTakes } from '../session/say';
import { addRecording, getRecording, listRecordings, putWords } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import type { Recording } from '../types';
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
  it('tidy: reviewed passage takes older than 14 days go, each passage keeps its newest; unreviewed ones and other recordings stay', async () => {
    const now = new Date(2026, 9, 30);
    const recs = [
      passage('old', 'p01', day(1), 'ok'), passage('new', 'p01', day(28), 'ok'),
      passage('only', 'p02', day(1), 'ok'), // its passage's newest: kept whatever its age
      passage('waiting', 'p03', day(1)), passage('newer', 'p03', day(2), 'ok'), // an older unreviewed take stays
      rec('intro', { kind: 'intro' }, day(1)),
    ];
    expect(passageTakesToDrop(recs, now)).toEqual(['old']);
    const db = await freshDb();
    for (const r of recs) await addRecording(db, r);
    await tidyPassageTakes(db, now);
    expect((await listRecordings(db)).map((r) => r.id).sort()).toEqual(['intro', 'new', 'newer', 'only', 'waiting']);
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
});
