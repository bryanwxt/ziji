// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { applyPlacement } from '../placement/apply';
import { termWords } from '../placement/questions';
import { addReviewLog, allCards, getCard, logsSince, practisedWords, putWords } from '../store/repo';
import { freshDb } from '../test/fixtures';
import { DEFAULT_SETTINGS } from '../types';
import { buildSessionPlan } from './plan';
import { recordRecognition } from './record';

// Un-place on a miss (spec 2026-10-14): a placed character's first recheck rated Again sends it back to learn.
const now = new Date(2026, 9, 5, 9);
const later = new Date(2026, 9, 13, 9); // day 8: its first recheck
const miss = { correct: false, responseMs: 2000 };
const right = { correct: true, responseMs: 1500 };

async function placedDb() {
  const db = await freshDb();
  const words = builtinWords(0);
  await putWords(db, words);
  const terms = termWords(words);
  const placed = terms[0]!.slice(0, 20);
  await applyPlacement(db, { readingIds: placed.map((w) => w.id), askedIds: [], missed: [], readsUpTo: '一上' }, now);
  return { db, words, char: placed[0]! };
}

describe('un-place on a missed first recheck (spec 2026-10-14)', () => {
  it('deletes the placed recognise card and its untouched placement cards; the log is kept', async () => {
    const { db, char } = await placedDb();
    expect((await allCards(db)).filter((c) => c.wordId === char.id).map((c) => c.kind).sort()).toEqual(['hear', 'meaning', 'recognise']);
    await recordRecognition(db, char.id, miss, later);
    expect((await allCards(db)).filter((c) => c.wordId === char.id)).toEqual([]);
    const logs = (await logsSince(db, 0)).filter((l) => l.wordId === char.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ kind: 'recognise', correct: false, placedCheck: true });
  });
  it('the catch-up lane picks the character up next, with a proper 认新字 introduction', async () => {
    const { db, words, char } = await placedDb();
    await recordRecognition(db, char.id, miss, later);
    const settings = { ...DEFAULT_SETTINGS, newPerDay: 4, grade: 2, gradeYear: 2026 };
    const plan = buildSessionPlan({ cards: await allCards(db), words, settings, now: later, practised: await practisedWords(db), newPerDay: 4 });
    expect(plan.newWordIds).toContain(char.id);
    expect(plan.newWordLanes![char.id]).toBe('catchup');
  });
  it('a right first recheck keeps the card and ends its placement: a later miss is an ordinary lapse', async () => {
    const { db, char } = await placedDb();
    await recordRecognition(db, char.id, right, later);
    const card = (await getCard(db, `${char.id}:recognise`))!;
    expect(card.placed).toBeUndefined();
    await recordRecognition(db, char.id, miss, new Date(2026, 9, 20, 9));
    expect(await getCard(db, `${char.id}:recognise`)).toBeTruthy();
    expect((await logsSince(db, 0)).filter((l) => l.placedCheck)).toHaveLength(1);
  });
  it('never un-places a card he has practised (not placed)', async () => {
    const db = await freshDb();
    const w = builtinWords(0)[0]!;
    await putWords(db, [w]);
    await recordRecognition(db, w.id, right, now); // learned in a lesson
    await recordRecognition(db, w.id, miss, later);
    expect(await getCard(db, `${w.id}:recognise`)).toBeTruthy();
  });
  it('keeps a hear card he has practised', async () => {
    const { db, char } = await placedDb();
    await addReviewLog(db, { cardId: `${char.id}:hear`, wordId: char.id, kind: 'hear', at: later.getTime() - 1000, rating: 3, correct: true });
    await recordRecognition(db, char.id, miss, later);
    expect((await allCards(db)).filter((c) => c.wordId === char.id).map((c) => c.kind)).toEqual(['hear']);
  });
});
