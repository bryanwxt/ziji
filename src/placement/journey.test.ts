// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { addReviewLog, allCards, getSettings, putCards, putWords, updateSettings } from '../store/repo';
import { summarize } from '../stats/stats';
import { freshDb, makeCard } from '../test/fixtures';
import { DEFAULT_KID } from '../types';
import { applyPlacement } from './apply';
import { journeyCount, settleJourney } from './journey';

// Worlds come from characters learned in the app, not ones placement found he knew (parent, 2026-10-05: a P2 placement
// of ~500 unlocked all eight worlds on day one).
const readOnly = (readingIds: string[]) => ({ readingIds, understandingIds: [], missed: [], reading: 0, understanding: -1 });
const known = async (db: Awaited<ReturnType<typeof freshDb>>) => summarize(builtinWords(0), await allCards(db)).known;

describe('the journey counts what he learns after placement', () => {
  it('placement sets the starting point: nothing counts yet, so only the backyard', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 5, 9);
    const words = builtinWords(0).slice(0, 200);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.map((w) => w.id)), now);
    expect(await known(db)).toBe(200);
    expect(await journeyCount(db, 200)).toBe(0);
  });
  it('a word learned after placement counts', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 5, 9);
    const words = builtinWords(0).slice(0, 50);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.slice(0, 40).map((w) => w.id)), now);
    expect(await journeyCount(db, 40 + 7)).toBe(7);
  });
  it('a re-run keeps what he learned since the first placement', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 60);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.slice(0, 20).map((w) => w.id)), new Date(2026, 9, 5, 9));
    // learned 5 more in lessons
    await putCards(db, words.slice(40, 45).map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 5), true)));
    for (const w of words.slice(40, 45)) await addReviewLog(db, { cardId: `${w.id}:recognise`, wordId: w.id, kind: 'recognise', at: Date.now(), rating: 3, correct: true });
    expect(await journeyCount(db, await known(db))).toBe(5);
    await applyPlacement(db, readOnly(words.slice(0, 30).map((w) => w.id)), new Date(2026, 9, 6, 9)); // re-run finds 10 more
    expect(await journeyCount(db, await known(db))).toBe(5);
  });
  it('without a placement, everything he knows counts', async () => {
    const db = await freshDb();
    expect(await journeyCount(db, 12)).toBe(12);
  });
});

describe('an install placed before this change (no starting point saved)', () => {
  it('takes the words he knows but never practised as placed, and redoes his worlds once', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 5, 9);
    const words = builtinWords(0).slice(0, 500);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.map((w) => w.id)), now);
    const s = await getSettings(db);
    await updateSettings(db, { placementResult: { ...s.placementResult!, worldBase: undefined } }); // as saved before the change
    const kid = { ...DEFAULT_KID, worldsSeen: ['yard', 'grass', 'race', 'blocks', 'dino', 'sea', 'space', 'pirate'], world: 'pirate' };
    const first = await settleJourney(db, kid, 500);
    expect(first.count).toBe(0);
    expect(first.kid.worldsSeen).toEqual(['yard']);
    expect(first.kid.world).toBeNull();
    expect((await getSettings(db)).placementResult!.worldBase).toBe(500);
    const again = await settleJourney(db, first.kid, 500);
    expect(again.kid).toBe(first.kid); // only once
  });
});
