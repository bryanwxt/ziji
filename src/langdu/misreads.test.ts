import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { addRecording, getCard, getKid, getWord, listRecordings, putCards, putWords, saveKid } from '../store/repo';
import { freshDb, makeCard } from '../test/fixtures';
import { DEFAULT_KID } from '../types';
import { applyMisreads } from './misreads';
import { buildSessionPlan } from '../session/plan';
import { DEFAULT_SETTINGS } from '../types';
import { allCards, allWords } from '../store/repo';

describe('applyMisreads', () => {
  it('turns misread characters into priority words and gives the passage an extra day', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 5, 17);
    await putWords(db, builtinWords(0));
    await putCards(db, [makeCard('b:大', 'recognise', new Date(2026, 10, 1), true)]);
    await saveKid(db, { ...DEFAULT_KID, reading: { passageId: 'pp:1', days: 3, extra: 0, lastDay: '2026-10-05', lastRead: {}, warmups: 0 } });
    const rec = { id: 'r1', createdAt: now.getTime(), prompt: { kind: 'passage' as const, passageId: 'pp:1' }, blob: new Blob(), mime: 'audio/mp4', durationSec: 12 };
    await addRecording(db, rec);
    await applyMisreads(db, rec, ['大', '天'], now);
    expect((await getCard(db, 'b:大:recognise'))!.fsrs.due.getTime()).toBe(now.getTime());
    expect((await getWord(db, 'b:天'))!.listedAt).toBe(-now.getTime()); // ahead of every school list
    expect((await getKid(db))!.reading.extra).toBe(1);
    expect((await listRecordings(db))[0]!.misread).toEqual(['大', '天']);
  });

  it('a passage that has moved on gets no extra day, and no marks changes nothing', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 5, 17);
    await putWords(db, builtinWords(0));
    await saveKid(db, { ...DEFAULT_KID, reading: { passageId: 'pp:2', days: 1, extra: 0, lastDay: '2026-10-05', lastRead: {}, warmups: 0 } });
    const rec = { id: 'r1', createdAt: now.getTime(), prompt: { kind: 'passage' as const, passageId: 'pp:1' }, blob: new Blob(), mime: 'audio/mp4', durationSec: 12 };
    await addRecording(db, rec);
    await applyMisreads(db, rec, ['大'], now);
    expect((await getKid(db))!.reading.extra).toBe(0);
    await applyMisreads(db, rec, [], now);
    expect((await listRecordings(db))[0]!.misread).toEqual([]);
  });
  it('a misread character with no card jumps ahead of words from school lists he has not started', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 5, 17);
    const words = builtinWords(0);
    await putWords(db, words.map((w) => (w.text === '山' ? { ...w, listedAt: 1000, listName: '听写 7' } : w)));
    const rec = { id: 'r1', createdAt: now.getTime(), prompt: { kind: 'passage' as const, passageId: 'pp:1' }, blob: new Blob(), mime: 'audio/mp4', durationSec: 12 };
    await addRecording(db, rec);
    await applyMisreads(db, rec, ['天'], now);
    const plan = buildSessionPlan({ cards: await allCards(db), words: await allWords(db), settings: DEFAULT_SETTINGS, now });
    expect(plan.newWordIds.slice(0, 2)).toEqual(['b:天', 'b:山']);
  });
});

describe('saving misreads again (deferred minors, plan 8)', () => {
  const setup = async () => {
    const db = await freshDb();
    await putWords(db, builtinWords(0));
    await saveKid(db, { ...DEFAULT_KID, reading: { passageId: 'pp:1', days: 3, extra: 0, lastDay: '2026-10-05', lastRead: {}, warmups: 0 } });
    const rec = { id: 'r1', createdAt: 0, prompt: { kind: 'passage' as const, passageId: 'pp:1' }, blob: new Blob(), mime: 'audio/mp4', durationSec: 12 };
    await addRecording(db, rec);
    return { db, rec };
  };
  const now = new Date(2026, 9, 5, 17);
  it('counts only the characters it could bring back', async () => {
    const { db, rec } = await setup();
    expect(await applyMisreads(db, rec, ['天', '𠀀'], now)).toEqual({ updated: 1, notInApp: ['𠀀'] });
  });
  it('a second save of the same recording adds no second extra day', async () => {
    const { db, rec } = await setup();
    await applyMisreads(db, rec, ['天'], now);
    await applyMisreads(db, { ...rec, misread: ['天'] }, ['天', '地'], now);
    expect((await getKid(db))!.reading.extra).toBe(1);
  });
  it('sweep: unmarking every character and marking again adds no second extra day', async () => {
    const { db, rec } = await setup();
    await applyMisreads(db, rec, ['天'], now);
    await applyMisreads(db, (await listRecordings(db))[0]!, [], now);
    await applyMisreads(db, (await listRecordings(db))[0]!, ['天'], now);
    expect((await getKid(db))!.reading.extra).toBe(1);
  });
  it('unmarking a character takes away the priority it was given', async () => {
    const { db, rec } = await setup();
    await applyMisreads(db, rec, ['天'], now);
    await applyMisreads(db, { ...rec, misread: ['天'] }, [], now);
    expect((await getWord(db, 'b:天'))!.listedAt).toBeUndefined();
  });
  it('unmarking gives a class-list word its place back, and leaves a later 听写 priority alone (review I2)', async () => {
    const db = await freshDb();
    await putWords(db, builtinWords(0).map((w) => (w.text === '天' ? { ...w, listedAt: 500, listName: '第三课' } : w)));
    const rec = { id: 'r1', createdAt: 0, prompt: { kind: 'passage' as const, passageId: 'pp:1' }, blob: new Blob(), mime: 'audio/mp4', durationSec: 12 };
    await addRecording(db, rec);
    const t1 = new Date(2026, 9, 5, 17), t2 = new Date(2026, 9, 6, 17), t3 = new Date(2026, 9, 7, 17);
    await applyMisreads(db, rec, ['天', '地'], t1);
    await putWords(db, [{ ...(await getWord(db, 'b:地'))!, listedAt: -t2.getTime() }]); // then the parent enters 地 as a 听写 mistake
    await applyMisreads(db, { ...rec, misread: ['天', '地'] }, [], t3);
    expect((await getWord(db, 'b:天'))!.listedAt).toBe(500); // back to its class-list place
    expect((await getWord(db, 'b:地'))!.listedAt).toBe(-t2.getTime()); // the 听写 priority stays
  });
});
