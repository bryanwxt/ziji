// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildSessionPlan } from '../session/plan';
import { recordRecognition, startOrResumeSession } from '../session/record';
import { getCard, putCards, putWeekList, putWords } from '../store/repo';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type WeekList } from '../types';
import { applyQuickChecks, pinDue, quickCheckDates } from './schedule';

const list: WeekList = { id: 'wl:1', name: 'L', createdAt: new Date(2026, 9, 19).getTime(), readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'b:a', text: 'a', from: 'grid', addedStatus: 'known' }, { wordId: 'b:b', text: 'b', from: 'grid', addedStatus: 'known' }], pairs: [], fits: [] };
const card = (kind: 'recognise' | 'write' | 'meaning', due: Date, wordId = 'b:a'): CardRecord => {
  const c = makeCard(wordId, kind, due, true);
  return { ...c, fsrs: { ...c.fsrs, stability: 9 } };
};

describe('pinDue (spec §6.2)', () => {
  const mon = new Date(2026, 9, 19, 18);
  it('a list reading card reviewed before ready-by is due at the start of the ready-by day, stability kept', () => {
    const c = pinDue(card('recognise', new Date(2026, 9, 28)), [list], mon);
    expect(c.fsrs.due).toEqual(new Date(2026, 9, 21));
    expect(c.fsrs.stability).toBe(9);
    expect(pinDue(card('meaning', new Date(2026, 9, 28)), [list], mon).fsrs.due).toEqual(new Date(2026, 9, 21));
  });
  it('never a write card, never earlier than its own due, never after ready-by, never a word off the list', () => {
    expect(pinDue(card('write', new Date(2026, 9, 28)), [list], mon).fsrs.due).toEqual(new Date(2026, 9, 28));
    expect(pinDue(card('recognise', new Date(2026, 9, 20)), [list], mon).fsrs.due).toEqual(new Date(2026, 9, 20));
    expect(pinDue(card('recognise', new Date(2026, 9, 28)), [list], new Date(2026, 9, 21, 18)).fsrs.due).toEqual(new Date(2026, 9, 28));
    expect(pinDue(card('recognise', new Date(2026, 9, 28), 'b:z'), [list], mon).fsrs.due).toEqual(new Date(2026, 9, 28));
  });
  it('the earliest ready-by of two lists; a closed list pins nothing', () => {
    const later = { ...list, id: 'wl:2', readyBy: '2026-10-28', homeworkDue: '2026-10-30' };
    expect(pinDue(card('recognise', new Date(2026, 10, 9)), [later, list], mon).fsrs.due).toEqual(new Date(2026, 9, 21));
    // after the first list's ready-by, the later list's day (spec §10)
    expect(pinDue(card('recognise', new Date(2026, 10, 9)), [later, list], new Date(2026, 9, 22, 18)).fsrs.due).toEqual(new Date(2026, 9, 28));
    expect(pinDue(card('recognise', new Date(2026, 9, 28)), [{ ...list, closedAt: 1 }], mon).fsrs.due).toEqual(new Date(2026, 9, 28));
  });
});

describe('quickCheckDates (spec §6.1)', () => {
  it('spreads known words over the front-load days; leaves one already due before ready-by', () => {
    const cards = new Map([makeCard('b:a', 'recognise', new Date(2026, 10, 9), true), makeCard('b:b', 'recognise', new Date(2026, 9, 20), true)].map((c) => [c.id, c]));
    const d = quickCheckDates(list, cards, new Date(2026, 9, 19, 9));
    expect([...d.keys()]).toEqual(['b:a']);
    expect(d.get('b:a')).toEqual(new Date(2026, 9, 19));
  });
  it('four known words: two on Monday, two on Tuesday; placed ones too; new and learning ones never', () => {
    const items = ['b:a', 'b:b', 'b:c', 'b:d', 'b:e', 'b:f'].map((wordId) => ({ wordId, text: wordId, from: 'grid' as const, addedStatus: 'known' as const }));
    const far = new Date(2026, 10, 30);
    const cards = new Map([
      card('recognise', far, 'b:a'), card('recognise', far, 'b:b'), card('recognise', far, 'b:c'),
      { ...card('recognise', far, 'b:d'), placed: true as const },
      makeCard('b:e', 'recognise', far), // learning
    ].map((c) => [c.id, c]));
    const d = quickCheckDates({ ...list, items }, cards, new Date(2026, 9, 19, 9));
    expect([...d.entries()].map(([id, at]) => [id, at.getDate()])).toEqual([['b:a', 19], ['b:b', 19], ['b:c', 20], ['b:d', 20]]);
  });
});

describe('applyQuickChecks', () => {
  it('brings known list words forward (never later), only before ready-by, and the plan reviews them', async () => {
    const db = await freshDb();
    await putWeekList(db, list);
    await putCards(db, [card('recognise', new Date(2026, 10, 30), 'b:a'), card('recognise', new Date(2026, 9, 20, 6), 'b:b')]);
    await applyQuickChecks(db, new Date(2026, 9, 21, 9)); // ready-by day: nothing
    expect((await getCard(db, 'b:a:recognise'))!.fsrs.due).toEqual(new Date(2026, 10, 30));
    await applyQuickChecks(db, new Date(2026, 9, 19, 9));
    expect((await getCard(db, 'b:a:recognise'))!.fsrs.due).toEqual(new Date(2026, 9, 19));
    expect((await getCard(db, 'b:b:recognise'))!.fsrs.due).toEqual(new Date(2026, 9, 20, 6));
  });
  it('a lesson made before ready-by asks the quick check', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('a'), makeWord('b')]);
    await putWeekList(db, list);
    await putCards(db, [card('recognise', new Date(2026, 10, 30), 'b:a'), card('recognise', new Date(2026, 10, 30), 'b:b')]);
    const rec = await startOrResumeSession(db, new Date(2026, 9, 19, 9));
    expect(rec.plan.reviewWordIds).toContain('b:a');
  });
});

describe('placed list words (spec §5.2)', () => {
  it("a list word's placement recheck doesn't count toward the lesson's 10", () => {
    const now = new Date(2026, 9, 19, 9);
    const ws = Array.from({ length: 14 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));
    const placed = ws.map((w) => ({ ...makeCard(w.id, 'recognise', new Date(2026, 9, 19, 6), true), placed: true as const }));
    const onList = { ...list, items: ['b:12', 'b:13'].map((wordId) => ({ wordId, text: wordId, from: 'grid' as const, addedStatus: 'placed' as const })) };
    const plan = buildSessionPlan({ cards: placed, words: ws, settings: DEFAULT_SETTINGS, now, newPerDay: 5, lists: [onList] });
    expect(plan.reviewWordIds).toHaveLength(12);
    expect(plan.reviewWordIds).toEqual(expect.arrayContaining(['b:12', 'b:13']));
  });
});

describe('the pin in a review', () => {
  // a sturdy card: FSRS alone would put it well past the ready-by day
  const sturdy = () => { const c = makeCard('b:a', 'recognise', new Date(2026, 9, 19, 6), true); return { ...c, fsrs: { ...c.fsrs, stability: 30, difficulty: 5, last_review: new Date(2026, 8, 19) } }; };
  it('a reading answer on a list word before ready-by is pinned', async () => {
    const db = await freshDb();
    await putWeekList(db, list);
    await putCards(db, [sturdy()]);
    await recordRecognition(db, 'b:a', { correct: true, responseMs: 1500 }, new Date(2026, 9, 19, 18));
    expect((await getCard(db, 'b:a:recognise'))!.fsrs.due.getTime()).toBe(new Date(2026, 9, 21).getTime());
  });
  it('a word on no list keeps its FSRS due', async () => {
    const db = await freshDb();
    await putCards(db, [sturdy()]);
    await recordRecognition(db, 'b:a', { correct: true, responseMs: 1500 }, new Date(2026, 9, 19, 18));
    expect((await getCard(db, 'b:a:recognise'))!.fsrs.due.getTime()).toBeGreaterThan(new Date(2026, 9, 21).getTime());
  });
});
