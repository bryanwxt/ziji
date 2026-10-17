// @vitest-environment node
// The weekly list's hooks in record.ts: yesterday's run-outs, and a right answer on an early (pinned or quick-checked) review.
import { Rating, State } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { recordRecognition, startOrResumeSession } from '../session/record';
import { buildSessionPlan } from '../session/plan';
import { createSessionRecord } from '../session/runner';
import { logsForCard, putCards, putWeekList, putWords, saveSession, updateSettings } from '../store/repo';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type WeekList } from '../types';

const list = (n: number): WeekList => ({ id: 'wl:r', name: 'R', createdAt: new Date(2026, 9, 19).getTime(), readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: Array.from({ length: n }, (_, i) => ({ wordId: `p:r${i}`, text: `练${i}`, from: 'grid' as const, addedStatus: 'new' as const })), pairs: [], fits: [] });
const listWords = (n: number) => Array.from({ length: n }, (_, i) => makeWord(`练${i}`, { id: `p:r${i}`, source: 'parent', rank: null, level: null, writeable: false }));

describe('run-outs for the list headroom are yesterday and the day before (spec §5.1)', () => {
  const ranOutOn = async (db: Awaited<ReturnType<typeof freshDb>>, date: string) => {
    const plan = buildSessionPlan({ cards: [], words: [], settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 1) });
    await saveSession(db, { ...createSessionRecord(plan, date, 0), completed: true, completedSteps: ['practice'], practiceLeft: 4 });
  };
  const today = new Date(2026, 9, 19, 9);
  const setup = async () => {
    const db = await freshDb();
    await putWords(db, listWords(14));
    await putWeekList(db, list(14));
    await updateSettings(db, { pace: { day: '2026-10-19', perDay: 5, reason: 'test' } });
    return db;
  };
  it('rounds that ran out last week leave the headroom: 7', async () => {
    const db = await setup();
    await ranOutOn(db, '2026-10-14');
    await ranOutOn(db, '2026-10-15');
    expect((await startOrResumeSession(db, today)).plan.listNewIds).toHaveLength(7);
  });
  it('yesterday ran out: no headroom, 5', async () => {
    const db = await setup();
    await ranOutOn(db, '2026-10-18');
    expect((await startOrResumeSession(db, today)).plan.listNewIds).toHaveLength(5);
  });
  it('yesterday and the day before ran out: spill, 4', async () => {
    const db = await setup();
    await ranOutOn(db, '2026-10-17');
    await ranOutOn(db, '2026-10-18');
    expect((await startOrResumeSession(db, today)).plan.listNewIds).toHaveLength(4);
  });
});

describe('a right answer on an early review of a list word rates Good, not Hard', () => {
  // in Review, last seen 10 Oct, scheduled for 30 days, but due now: brought forward for the list
  const early = (wordId: string): CardRecord => {
    const c = makeCard(wordId, 'recognise', new Date(2026, 9, 19, 6), true);
    return { ...c, fsrs: { ...c.fsrs, state: State.Review, stability: 30, difficulty: 5, scheduled_days: 30, last_review: new Date(2026, 9, 10, 9) } };
  };
  it('on a list: Good', async () => {
    const db = await freshDb();
    await putWeekList(db, { ...list(1), items: [{ wordId: 'b:早', text: '早', from: 'grid', addedStatus: 'known' }] });
    await putCards(db, [early('b:早')]);
    await recordRecognition(db, 'b:早', { correct: true, responseMs: 1500 }, new Date(2026, 9, 19, 18));
    expect((await logsForCard(db, 'b:早:recognise'))[0]!.rating).toBe(Rating.Good);
  });
  it('on no list: Hard as before (not produced)', async () => {
    const db = await freshDb();
    await putCards(db, [early('b:早')]);
    await recordRecognition(db, 'b:早', { correct: true, responseMs: 1500 }, new Date(2026, 9, 19, 18));
    expect((await logsForCard(db, 'b:早:recognise'))[0]!.rating).toBe(Rating.Hard);
  });
  it('on time (not early): Hard as before', async () => {
    const db = await freshDb();
    await putWeekList(db, { ...list(1), items: [{ wordId: 'b:早', text: '早', from: 'grid', addedStatus: 'known' }] });
    await putCards(db, [{ ...early('b:早'), fsrs: { ...early('b:早').fsrs, last_review: new Date(2026, 8, 19, 9) } }]);
    await recordRecognition(db, 'b:早', { correct: true, responseMs: 1500 }, new Date(2026, 9, 19, 18));
    expect((await logsForCard(db, 'b:早:recognise'))[0]!.rating).toBe(Rating.Hard);
  });
});
