// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ladderWords } from '../content/ladder';
import { buildSessionPlan } from '../session/plan';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { addReviewLog, allCards, getSettings, putCards, putWords } from '../store/repo';
import { DEFAULT_SETTINGS } from '../types';
import { openMissingRungs } from '../session/record';
import { applyPlacement, placementIds } from './apply';

const now = new Date('2026-10-06T09:00:00');

describe('placement on the ladder (spec 2026-10-06 §3.5–3.6)', () => {
  it('words placed as read are passed for reading and get listening checks', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], missed: [], reading: 0, understanding: -1 }, now);
    const cards = await allCards(db);
    expect(cards.filter((c) => c.kind === 'recognise').every((c) => c.passed === now.getTime())).toBe(true);
    expect(cards.filter((c) => c.kind === 'hear').map((c) => c.wordId).sort()).toEqual(['b:大', 'b:门']);
  });
  it('a re-run that no longer places a word drops its untouched listening check too', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], missed: [], reading: 0, understanding: -1 }, now);
    await applyPlacement(db, { readingIds: ['b:门'], understandingIds: [], missed: [], reading: 0, understanding: -1 }, now);
    expect((await allCards(db)).filter((c) => c.kind === 'hear').map((c) => c.wordId)).toEqual(['b:门']);
  });
});

describe('placing the Hear rung (spec 2026-10-06 §3.5)', () => {
  it('words placed as heard get a passed hear guess, first rechecked from day 7', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: [], understandingIds: [], heardIds: ws.map((w) => w.id), missed: [], reading: -1, understanding: -1, listening: 0 }, now);
    const hear = (await allCards(db)).filter((c) => c.kind === 'hear');
    expect(hear.map((c) => c.wordId).sort()).toEqual(['b:大', 'b:门']);
    for (const c of hear) {
      expect(c.passed).toBe(now.getTime());
      expect(c.fsrs.due.getTime() - now.getTime()).toBeGreaterThanOrEqual(7 * 86_400_000 - 3_600_000);
    }
    expect((await getSettings(db)).placementResult!.listening).toBe(0);
  });
  it('a ladder word heard right above the level gets a hear guess', async () => {
    const db = await freshDb();
    const lw = ladderWords()[0]!;
    await applyPlacement(db, { readingIds: [], understandingIds: [], heardIds: [lw.id], missed: [], reading: -1, understanding: -1, listening: -1 }, now);
    expect((await allCards(db)).find((c) => c.id === `${lw.id}:hear`)?.passed).toBe(now.getTime());
  });
  it('a re-run keeps practised hear cards and upgrades queued checks', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], missed: [], reading: 0, understanding: -1 }, now); // queued, unpractised checks
    const base = makeCard('b:大', 'hear', now);
    await putCards(db, [{ ...base, fsrs: { ...base.fsrs, reps: 3 } }]);
    await addReviewLog(db, { cardId: 'b:大:hear', wordId: 'b:大', kind: 'hear', at: now.getTime(), rating: 3, correct: true, responseMs: 1500 });
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], heardIds: ws.map((w) => w.id), missed: [], reading: 0, understanding: -1, listening: 0 }, now);
    const byId = new Map((await allCards(db)).map((c) => [c.id, c]));
    expect(byId.get('b:门:hear')!.passed).toBe(now.getTime()); // the queued check became a placement guess
    expect(byId.get('b:大:hear')!.fsrs.reps).toBe(3); // practised: untouched
  });
  it('placementIds: hearable characters up to the listening level, plus words heard right above it', () => {
    const bands = [[makeWord('门', { rank: 0 })], [makeWord('大', { rank: 1 })], [makeWord('小', { rank: 2 })]];
    const ids = placementIds(bands, [
      { band: 0, style: 'hear', wordId: 'b:门', correct: true }, { band: 1, style: 'hear', wordId: 'w:大门', correct: false },
      { band: 2, style: 'hear', wordId: 'w:小门', correct: true }, { band: 2, style: 'hear', wordId: 'b:小', correct: false }, { band: 2, style: 'hear', wordId: 'b:x', correct: false },
    ]);
    expect(ids.heardIds.sort()).toEqual(['b:门', 'w:小门']);
  });
  it("a heard-only character is begun: lessons don't introduce it again", async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: [], understandingIds: [], heardIds: ['b:门'], missed: [], reading: -1, understanding: -1, listening: 0 }, now);
    const plan = buildSessionPlan({ cards: await allCards(db), words: ws, settings: { ...DEFAULT_SETTINGS, newPerDay: 5 }, now });
    expect(plan.newWordIds).toEqual(['b:大']);
  });
});

describe('a Hear guess opens its next rung only once a real answer confirms it (final review I1)', () => {
  it('a big hear placement opens nothing the next day; a real 听 answer opens that word\'s next rung', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: [], understandingIds: [], heardIds: ws.map((w) => w.id), missed: [], reading: -1, understanding: -1, listening: 0 }, now);
    expect(await openMissingRungs(db, new Date(now.getTime() + 86_400_000))).toBe(0); // no flood of Understand / never-taught Read cards
    await addReviewLog(db, { cardId: 'b:门:hear', wordId: 'b:门', kind: 'hear', at: now.getTime() + 7 * 86_400_000, rating: 3, correct: true, responseMs: 1500 });
    expect(await openMissingRungs(db, new Date(now.getTime() + 7 * 86_400_000))).toBe(1);
    expect((await allCards(db)).filter((c) => c.wordId === 'b:门').map((c) => c.kind).sort()).toEqual(['hear', 'understand']);
  });
  it('a wrong answer does not confirm the guess: its next rung still waits', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('门', { rank: 0 })]);
    await applyPlacement(db, { readingIds: [], understandingIds: [], heardIds: ['b:门'], missed: [], reading: -1, understanding: -1, listening: 0 }, now);
    await addReviewLog(db, { cardId: 'b:门:hear', wordId: 'b:门', kind: 'hear', at: now.getTime() + 7 * 86_400_000, rating: 1, correct: false, responseMs: 1500 });
    expect(await openMissingRungs(db, new Date(now.getTime() + 7 * 86_400_000))).toBe(0);
  });
});
