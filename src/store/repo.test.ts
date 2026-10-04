// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, DEFAULT_KID } from '../types';
import {
  addAnswer, answersSince,
  addRecording, addReviewLog, allCards, allWords, deleteWord, getKid, getSettings, listRecordings,
  deleteParentPassage, listParentPassages, logsSince, normalizeKid, putCards, putWords, saveKid, saveParentPassage, seedBuiltinWords, updateSettings,
} from './repo';

describe('repo', () => {
  it('returns default settings and merges updates', async () => {
    const db = await freshDb();
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
    await updateSettings(db, { newPerDay: 7 });
    expect((await getSettings(db)).newPerDay).toBe(7);
    expect((await getSettings(db)).sessionMinutes).toBe(30); // the 30-minute lesson (spec §19)
  });

  it('seeds only missing built-in words and keeps existing flags', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('大', { paused: true })]);
    const added = await seedBuiltinWords(db, [makeWord('大'), makeWord('人')]);
    expect(added).toBe(1);
    const words = await allWords(db);
    expect(words.find((w) => w.text === '大')?.paused).toBe(true);
    expect(words).toHaveLength(2);
  });

  it('deleting a word removes its cards', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 2);
    await putWords(db, [makeWord('大')]);
    await putCards(db, [makeCard('b:大', 'recognise', now), makeCard('b:大', 'write', now)]);
    await deleteWord(db, 'b:大');
    expect(await allCards(db)).toEqual([]);
  });

  it('keeps Date objects in cards', async () => {
    const db = await freshDb();
    const due = new Date(2026, 9, 5);
    await putCards(db, [makeCard('b:大', 'recognise', due)]);
    expect((await allCards(db))[0]!.fsrs.due).toBeInstanceOf(Date);
  });

  it('filters review logs by time', async () => {
    const db = await freshDb();
    await addReviewLog(db, { cardId: 'a', wordId: 'a', kind: 'recognise', at: 100, rating: Rating.Good, correct: true });
    await addReviewLog(db, { cardId: 'a', wordId: 'a', kind: 'recognise', at: 200, rating: Rating.Again, correct: false });
    expect((await logsSince(db, 150)).map((l) => l.at)).toEqual([200]);
  });

  it('lists recordings newest first with their audio intact', async () => {
    const db = await freshDb();
    const blob = (t: string) => new Blob([t], { type: 'audio/mp4' });
    await addRecording(db, { id: 'old', createdAt: 1, prompt: { kind: 'passage', passageId: 'p01' }, blob: blob('a'), mime: 'audio/mp4', durationSec: 3 });
    await addRecording(db, { id: 'new', createdAt: 2, prompt: { kind: 'passage', passageId: 'p02' }, blob: blob('bb'), mime: 'audio/mp4', durationSec: 4 });
    const list = await listRecordings(db);
    expect(list.map((r) => r.id)).toEqual(['new', 'old']);
    expect(await list[0]!.blob.text()).toBe('bb');
  });

  it('stores the kid state', async () => {
    const db = await freshDb();
    expect(await getKid(db)).toBeNull();
    await saveKid(db, { ...DEFAULT_KID, petName: '豆豆' });
    expect((await getKid(db))?.petName).toBe('豆豆');
  });
});

describe('seedBuiltinWords content updates', () => {
  it('refreshes built-in content on existing installs but keeps the parent and child state', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('兴', { pinyin: 'old', meaning: 'old', paused: true, listedAt: 5, listName: 'Week 1', createdAt: 1 })]);
    await seedBuiltinWords(db, [makeWord('兴', { pinyin: 'xìng', meaning: 'mood, interest', createdAt: 99 })]);
    const w = (await allWords(db))[0]!;
    expect([w.pinyin, w.meaning, w.paused, w.listedAt, w.listName, w.createdAt]).toEqual(['xìng', 'mood, interest', true, 5, 'Week 1', 1]);
  });
  it('keeps what a worksheet import attached (pairs, sentences, tags) and a parent list\'s 写 choice', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('很', { listName: 'Week 1', listedAt: 5, writeable: true, pairs: ['安静'], sentences: [{ text: '教室里很安静。', pinyin: '' }], tags: ['x'] })]);
    await seedBuiltinWords(db, [makeWord('很', { writeable: false })]);
    const w = (await allWords(db))[0]!;
    expect([w.pairs, w.sentences, w.tags, w.writeable]).toEqual([['安静'], [{ text: '教室里很安静。', pinyin: '' }], ['x'], true]);
  });
});

describe('normalizeKid', () => {
  it('fills new kid fields with defaults for dragon-era records', async () => {
    const db = await freshDb();
    await db.put('kid', { petName: '小龙', petColor: 'green', ownedAccessories: ['👑'], wearing: '👑', bonusStars: 2, lastChestDate: null, lastStageSeen: 3, badgesSeen: [] } as never, 'main');
    expect(await getKid(db)).toMatchObject({ wearing: 'medal', bonusStars: 2, activePower: null, powerTiersSeen: {} });
  });
});

describe('normalizeKid accessories v2', () => {
  it('maps old emoji accessories to the new ones and drops unknown values', async () => {
    const db = await freshDb();
    await db.put('kid', { ...DEFAULT_KID, ownedAccessories: ['👑', '🎓', 'x'], wearing: '🎓' } as never, 'main');
    expect(await getKid(db)).toMatchObject({ ownedAccessories: ['medal', 'brush'], wearing: 'brush' });
  });
});

describe('normalizeKid hardening', () => {
  it('normalizes world fields from old or malformed data', () => {
    expect(normalizeKid({ petName: '松露' } as never)).toMatchObject({ worldsSeen: [], world: null });
    expect(normalizeKid({ worldsSeen: 'race', world: 7 } as never)).toMatchObject({ worldsSeen: [], world: null });
    expect(normalizeKid({ worldsSeen: ['race', 'bogus', 'yard', 'race'], world: 'bogus' } as never)).toMatchObject({ worldsSeen: ['yard', 'race'], world: null });
    expect(normalizeKid({ worldsSeen: ['yard', 'grass'], world: 'grass' } as never)?.world).toBe('grass');
  });

  it('does not crash on a malformed accessory list', async () => {
    const db = await freshDb();
    await db.put('kid', { ...DEFAULT_KID, ownedAccessories: null, wearing: 42 } as never, 'main');
    expect(await getKid(db)).toMatchObject({ ownedAccessories: [], wearing: null });
  });
});

describe('plan 8 data', () => {
  it('stores parent passages in the order added', async () => {
    const db = await freshDb();
    await saveParentPassage(db, { id: 'pp:2', title: '乙', text: '我们去公园。', createdAt: 2 });
    await saveParentPassage(db, { id: 'pp:1', title: '甲', text: '我爱我家。', createdAt: 1 });
    expect((await listParentPassages(db)).map((p) => p.id)).toEqual(['pp:1', 'pp:2']);
    await deleteParentPassage(db, 'pp:1');
    expect((await listParentPassages(db)).map((p) => p.id)).toEqual(['pp:2']);
  });
  it('fills oral-exam fields and reading progress for old records', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, oral: undefined } as never, 'main');
    expect((await getSettings(db)).oral).toEqual({ name: '', age: '', school: '', className: '', customIntro: '' });
    expect(normalizeKid({ petName: '松露' } as never)?.reading).toEqual({ passageId: null, days: 0, extra: 0, lastDay: null, lastRead: {}, warmups: 0 });
    expect(normalizeKid({ reading: 'x' } as never)?.reading.warmups).toBe(0);
  });
});

describe('plan 9 data', () => {
  it('fills story progress and the speaking rotation for old or malformed records', () => {
    expect(normalizeKid({ petName: '松露' } as never)).toMatchObject({ speakingLast: null, story: { next: 0, told: 0 } });
    expect(normalizeKid({ speakingLast: 'x', story: 'y' } as never)).toMatchObject({ speakingLast: null, story: { next: 0, told: 0 } });
    expect(normalizeKid({ speakingLast: 'story', story: { next: 3, told: -1 } } as never)).toMatchObject({ speakingLast: 'story', story: { next: 3, told: 0 } });
  });
});

describe('plan 7 data', () => {
  it('fills and cleans world finds', () => {
    const empty = { animals: [], gems: 0, eggTapped: false, dinoHatched: false, lastAnimalDate: null, lastGemDate: null, lastDigDate: null };
    expect(normalizeKid({ petName: '松露' } as never)?.finds).toEqual(empty);
    expect(normalizeKid({ finds: 'x' } as never)?.finds).toEqual(empty);
    expect(normalizeKid({ finds: { animals: ['rat', 'unicorn', 'rat', 'ox'], gems: -2, eggTapped: 'yes', lastGemDate: '2026-10-06' } } as never)?.finds).toEqual({ ...empty, animals: ['rat', 'ox'], lastGemDate: '2026-10-06' });
  });
});

describe('built-in content updates', () => {
it('re-seeding new built-in content keeps the parent\'s and child\'s state on existing words and their cards', async () => {
  const db = await freshDb();
  const now = new Date(2026, 9, 4);
  await seedBuiltinWords(db, [makeWord('他', { id: 'b:他', level: 1, rank: 5 })]);
  const old = (await allWords(db))[0]!;
  await putWords(db, [{ ...old, paused: true, listName: '听写 3', listedAt: 7, writeSkippedAt: 9 }]);
  await putCards(db, [makeCard('b:他', 'recognise', now)]);
  await seedBuiltinWords(db, [makeWord('他', { id: 'b:他', level: 1, rank: 40 })]);
  const w = (await allWords(db))[0]!;
  expect([w.rank, w.paused, w.listName, w.listedAt, w.writeSkippedAt]).toEqual([40, true, '听写 3', 7, 9]);
  expect((await allCards(db)).map((c) => c.id)).toEqual(['b:他:recognise']);
});
});

describe('answer log (spec §19 part 7)', () => {
  it('keeps every 选一选 and 字辨 answer, by time', async () => {
    const db = await freshDb();
    await addAnswer(db, { at: 10, wordId: 'b:很', skill: 'use', correct: true });
    await addAnswer(db, { at: 20, wordId: 'b:根', skill: 'zibian', correct: false });
    expect((await answersSince(db, 15)).map((a) => [a.wordId, a.skill, a.correct])).toEqual([['b:根', 'zibian', false]]);
  });
});

describe('deleting a word (deferred minor, plan 11)', () => {
  it('removes its meaning card too', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('欺负', { id: 'p:1', source: 'parent' })]);
    await putCards(db, [makeCard('p:1', 'recognise', new Date()), makeCard('p:1', 'meaning', new Date()), makeCard('p:1', 'write', new Date())]);
    await deleteWord(db, 'p:1');
    expect(await allCards(db)).toEqual([]);
  });
});
