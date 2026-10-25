// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { addReviewLog, allCards, deleteCards, getSettings, putCards, putWords, saveKid, updateSettings } from '../store/repo';
import { summarize } from '../stats/stats';
import { freshDb, makeCard } from '../test/fixtures';
import { DEFAULT_KID, type Word } from '../types';
import { applyPlacement } from './apply';
import { journeyCount, settleJourney } from './journey';

// Worlds come from characters learned in the app, not ones placement found he knew (parent, 2026-10-05: a P2 placement
// of ~500 unlocked all eight worlds on day one) — and since 2026-10-25 from confirmed words only, so a missed recheck never
// takes a character off his journey.
type Db = Awaited<ReturnType<typeof freshDb>>;
const readOnly = (readingIds: string[]) => ({ readingIds, askedIds: [], missed: [], readsUpTo: '一上' });
const know = async (db: Db) => summarize(builtinWords(0), await allCards(db));
/** Words learned in lessons: a passed reading card, its pass made by his answer (logged at that moment). */
async function learn(db: Db, words: Word[], at: Date) {
  await putCards(db, words.map((w) => makeCard(w.id, 'recognise', at, true)));
  for (const w of words) await addReviewLog(db, { cardId: `${w.id}:recognise`, wordId: w.id, kind: 'recognise', at: at.getTime(), rating: 3, correct: true });
}
/** A placed card's first recheck answered right: `placed` goes, its pass stays placement's. */
async function recheckRight(db: Db, w: Word, at: Date) {
  const c = (await allCards(db)).find((x) => x.id === `${w.id}:recognise`)!;
  const { placed: _done, ...rest } = c;
  await putCards(db, [rest]);
  await addReviewLog(db, { cardId: c.id, wordId: w.id, kind: 'recognise', at: at.getTime(), rating: 3, correct: true, placedCheck: true });
}

describe('the journey counts what he learns in the app', () => {
  it('placement sets the starting point: nothing counts yet, so only the backyard', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 200);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.map((w) => w.id)), new Date(2026, 9, 5, 9));
    const k = await know(db);
    expect([k.known, k.confirmed]).toEqual([200, 0]);
    expect(await journeyCount(db, k)).toBe(0);
  });
  it('a word learned after placement counts; a placement guess rechecked right is confirmed but not learned here', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 50);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.slice(0, 40).map((w) => w.id)), new Date(2026, 9, 5, 9));
    await learn(db, words.slice(40, 47), new Date(2026, 9, 8, 9));
    await recheckRight(db, words[0]!, new Date(2026, 9, 8, 9));
    const k = await know(db);
    expect(k.confirmed).toBe(8);
    expect(await journeyCount(db, k)).toBe(7);
  });
  it('a missed first recheck (its cards go) never lowers the count', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 50);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.slice(0, 40).map((w) => w.id)), new Date(2026, 9, 5, 9));
    await learn(db, words.slice(40, 47), new Date(2026, 9, 8, 9));
    await saveKid(db, DEFAULT_KID);
    const before = await settleJourney(db, DEFAULT_KID, await know(db));
    await deleteCards(db, words.slice(0, 10).map((w) => `${w.id}:recognise`));
    const k = await know(db);
    expect(k.known).toBe(37);
    expect(await journeyCount(db, k, before.kid)).toBe(7);
    expect(before.count).toBe(7);
  });
  it('a re-run keeps what he learned since the first placement', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 60);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.slice(0, 20).map((w) => w.id)), new Date(2026, 9, 5, 9));
    await learn(db, words.slice(40, 45), new Date(2026, 9, 5, 18));
    expect(await journeyCount(db, await know(db))).toBe(5);
    await applyPlacement(db, readOnly(words.slice(0, 30).map((w) => w.id)), new Date(2026, 9, 6, 9)); // re-run finds 10 more
    expect(await journeyCount(db, await know(db))).toBe(5);
  });
  it('without a placement, every confirmed character counts', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 12);
    await putWords(db, words);
    await putCards(db, words.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 5), true)));
    expect(await journeyCount(db, await know(db))).toBe(12);
  });
});

describe('the switch to counting confirmed words never lowers his journey', () => {
  /** 100 placed, 40 learned since; the starting point saved lower than placement left it, so the old count (80) is above 40. */
  async function placedAndLearned() {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 150);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.slice(0, 100).map((w) => w.id)), new Date(2026, 9, 5, 9));
    await learn(db, words.slice(100, 140), new Date(2026, 9, 9, 9));
    const s = await getSettings(db);
    return { db, words, s };
  }
  it('keeps the count he has seen, once, and his reached worlds; what he learns next adds to it', async () => {
    const { db, words, s } = await placedAndLearned();
    await updateSettings(db, { placementResult: { ...s.placementResult!, worldBase: 60 } });
    const kid = { ...DEFAULT_KID, worldsSeen: ['home', 'rainforest', 'bamboo'], world: 'bamboo' };
    await saveKid(db, kid);
    const first = await settleJourney(db, kid, await know(db));
    expect(first.count).toBe(80); // what known − worldBase showed him (140 − 60)
    expect(first.kid.journeyCarry).toBe(40);
    expect(first.kid.worldsSeen).toEqual(['home', 'rainforest', 'bamboo']);
    expect(first.kid.world).toBe('bamboo');
    await learn(db, words.slice(140, 145), new Date(2026, 9, 10, 9));
    const again = await settleJourney(db, first.kid, await know(db));
    expect(again.kid).toBe(first.kid); // the carry is kept once, not worked out again
    expect(again.count).toBe(85);
    expect(await journeyCount(db, await know(db), first.kid)).toBe(85); // the room and the celebration count the same
  });
  it('carries nothing when the new count is already at or above the old one', async () => {
    const { db } = await placedAndLearned();
    const first = await settleJourney(db, DEFAULT_KID, await know(db));
    expect(first).toMatchObject({ count: 40, kid: { journeyCarry: 0 } });
  });
  it('an install placed before the starting point was saved: its worlds are never redone', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 500);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.map((w) => w.id)), new Date(2026, 9, 5, 9));
    const s = await getSettings(db);
    await updateSettings(db, { placementResult: { ...s.placementResult!, worldBase: undefined } }); // as saved before 2026-10-05
    const kid = { ...DEFAULT_KID, worldsSeen: ['home', 'rainforest', 'bamboo', 'terraces', 'dino', 'lantern', 'cove', 'milkyway'], world: 'milkyway' };
    const first = await settleJourney(db, kid, await know(db));
    expect(first.count).toBe(0);
    expect(first.kid.worldsSeen).toEqual(kid.worldsSeen);
    expect(first.kid.world).toBe('milkyway');
  });
});
