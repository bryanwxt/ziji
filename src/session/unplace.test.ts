// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { applyPlacement } from '../placement/apply';
import { termWords } from '../placement/questions';
import { allCards, getCard, logsSince, practisedWords, putCards, putWords } from '../store/repo';
import { freshDb, makeCard } from '../test/fixtures';
import { DEFAULT_SETTINGS } from '../types';
import { buildSessionPlan } from './plan';
import { beginNewWord, openMissingRungs, recordHear, recordRecognition, recordWriting, sentBackIds } from './record';

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
  it('next lesson knows it as sent back (认新字 says 再认一次！); a right recheck or a never-placed word is not (parent 2026-10-29)', async () => {
    const { db, words, char } = await placedDb();
    const kept = words.find((w) => w.id !== char.id && w.text.length === 1)!;
    await recordRecognition(db, char.id, miss, later);
    expect([...(await sentBackIds(db, [char.id, kept.id, 'b:none']))]).toEqual([char.id]);
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
  it('even after his hear rung passed, the word is unstarted: the catch-up lane picks it up and no rung reopens (review I1)', async () => {
    const { db, words, char } = await placedDb();
    await recordHear(db, char.id, right, new Date(2026, 9, 6, 9));
    await recordHear(db, char.id, right, new Date(2026, 9, 7, 9)); // two days right: the hear rung passed
    await recordRecognition(db, char.id, miss, later);
    expect((await allCards(db)).filter((c) => c.wordId === char.id)).toEqual([]);
    expect((await logsSince(db, 0)).filter((l) => l.wordId === char.id)).toHaveLength(3); // every log kept
    const settings = { ...DEFAULT_SETTINGS, newPerDay: 4, grade: 2, gradeYear: 2026 };
    const plan = buildSessionPlan({ cards: await allCards(db), words, settings, now: later, practised: await practisedWords(db), newPerDay: 4 });
    expect(plan.newWordIds).toContain(char.id);
    expect(await openMissingRungs(db, later)).toBe(0);
    expect((await allCards(db)).filter((c) => c.wordId === char.id)).toEqual([]);
  });
  it('every card of the word goes except a write card he has answered', async () => {
    const { db, char } = await placedDb();
    const extra = (['understand', 'say', 'sentence', 'write'] as const).map((kind) => makeCard(char.id, kind, later));
    await putCards(db, extra);
    await recordWriting(db, char.id, 0, new Date(2026, 9, 12, 9)); // written: kept
    await recordRecognition(db, char.id, miss, later);
    expect((await allCards(db)).filter((c) => c.wordId === char.id).map((c) => c.kind)).toEqual(['write']);
  });
  it('an unanswered write card goes too', async () => {
    const { db, char } = await placedDb();
    await putCards(db, [makeCard(char.id, 'write', later)]);
    await recordRecognition(db, char.id, miss, later);
    expect((await allCards(db)).filter((c) => c.wordId === char.id)).toEqual([]);
  });
  it('认新字 teaching it again gives it its hear card back', async () => {
    const { db, char } = await placedDb();
    await recordRecognition(db, char.id, miss, later);
    await beginNewWord(db, char, 'read', right, new Date(2026, 9, 14, 9));
    expect((await allCards(db)).filter((c) => c.wordId === char.id).map((c) => c.kind)).toEqual(['hear']);
  });
});
