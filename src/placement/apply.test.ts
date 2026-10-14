// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { ladderWords } from '../content/ladder';
import { isKnown } from '../srs/scheduler';
import { addReviewLog, allCards, getSettings, putCards, putWords } from '../store/repo';
import { openMissingRungs } from '../session/record';
import { buildSessionPlan } from '../session/plan';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS } from '../types';
import { applyPlacement, placementIds, type PlacementOutcome } from './apply';
import { termWords } from './questions';
import type { WalkAnswer } from './walk';

const now = new Date(2026, 9, 5, 9);
const placed = (readingIds: string[], over: Partial<PlacementOutcome> = {}): PlacementOutcome => ({ readingIds, askedIds: [], missed: [], readsUpTo: '一上', ...over });

describe('placementIds (spec 2026-10-14)', () => {
  const terms = [[makeWord('一', { id: 'b:1' }), makeWord('人', { id: 'b:2' })], [makeWord('三', { id: 'b:3' }), makeWord('门', { id: 'b:4' })], [makeWord('天', { id: 'b:5' })]];
  const a = (term: number, wordId: string, correct: boolean, style: 'read' | 'hear' = 'read'): WalkAnswer => ({ term, style, wordId, correct });
  it('every character of the passed terms, plus characters read right in a higher term', () => {
    const ids = placementIds(terms, [a(0, 'b:1', true), a(1, 'b:3', false), a(2, 'b:5', true)], 0);
    expect(ids.readingIds.sort()).toEqual(['b:1', 'b:2', 'b:5']);
    expect(ids.missed).toEqual(['b:3']);
    expect(ids.askedIds).toEqual(['b:1', 'b:3', 'b:5']);
  });
  it('none passed: only the characters read right', () => {
    expect(placementIds(terms, [a(0, 'b:1', false), a(0, 'b:2', true)], null).readingIds).toEqual(['b:2']);
  });
  it('a character he just missed reading in a passed term is not placed', () => {
    expect(placementIds(terms, [a(0, 'b:1', false)], 0).readingIds).toEqual(['b:2']);
  });
  it('words heard right are heard guesses, not reading', () => {
    const ids = placementIds(terms, [a(1, 'w:三门', true, 'hear'), a(2, 'b:5', true, 'hear'), a(0, 'b:1', false, 'hear')], null);
    expect(ids.heardIds.sort()).toEqual(['b:5', 'w:三门']);
    expect(ids.readingIds).toEqual([]);
  });
});

describe('applyPlacement (spec 2026-10-14)', () => {
  it('placed recognise cards are passed, marked placed and known; placement is done', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 10);
    await putWords(db, words);
    await putCards(db, [makeCard(words[0]!.id, 'recognise', now)]);
    await addReviewLog(db, { cardId: `${words[0]!.id}:recognise`, wordId: words[0]!.id, kind: 'recognise', at: now.getTime() - 1000, rating: 3, correct: true });
    expect(await applyPlacement(db, placed(words.slice(0, 5).map((w) => w.id)), now)).toBe(4);
    const cards = (await allCards(db)).filter((c) => c.kind === 'recognise');
    const first = cards.find((c) => c.wordId === words[0]!.id)!;
    expect(isKnown(first.fsrs)).toBe(false); // practised before: untouched
    expect(first.placed).toBeUndefined();
    for (const c of cards.filter((x) => x.wordId !== words[0]!.id)) expect([c.placed, c.passed, isKnown(c.fsrs)]).toEqual([true, now.getTime(), true]);
    expect((await getSettings(db)).placementDone).toBe(true);
  });
  it('no meaning card is placed as known: placed characters get meaning cards due soon, 12 a day, easiest first', async () => {
    const db = await freshDb();
    const ws = builtinWords(0).slice(0, 30);
    await putWords(db, ws);
    await applyPlacement(db, placed(ws.map((w) => w.id)), now);
    const meaning = (await allCards(db)).filter((c) => c.kind === 'meaning');
    expect(meaning.length).toBeGreaterThan(0);
    expect(meaning.every((c) => !isKnown(c.fsrs) && !c.passed)).toBe(true);
    const day = (c: { fsrs: { due: Date } }) => Math.round((c.fsrs.due.getTime() - now.getTime()) / 86_400_000);
    expect(meaning.filter((c) => day(c) === 0)).toHaveLength(12);
    expect(Math.max(...meaning.map(day))).toBeGreaterThan(0);
  });
  it('a word with no meaning cue gets no meaning card', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('欺', { id: 'b:q', rank: 1 })]);
    await applyPlacement(db, placed(['b:q']), now);
    expect((await allCards(db)).map((c) => c.id).sort()).toEqual(['b:q:hear', 'b:q:recognise']); // its listening check, and no meaning card
  });
  it('saves { at, readsUpTo, tested, assumed, missed }', async () => {
    const db = await freshDb();
    const ws = builtinWords(0).slice(0, 10);
    await putWords(db, ws);
    await applyPlacement(db, placed(ws.map((w) => w.id), { askedIds: [ws[0]!.id, ws[1]!.id, 'b:x'], missed: ['b:x'], readsUpTo: '一下' }), now);
    expect((await getSettings(db)).placementResult).toMatchObject({ at: now.getTime(), readsUpTo: '一下', tested: 3, assumed: 8, missed: ['b:x'] });
  });
  it('a re-run clears unpractised placement cards the new result no longer supports; practised words stay', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 10);
    await putWords(db, words);
    await applyPlacement(db, placed(words.map((w) => w.id)), now);
    await addReviewLog(db, { cardId: `${words[7]!.id}:recognise`, wordId: words[7]!.id, kind: 'recognise', at: now.getTime() + 1000, rating: 3, correct: true });
    await applyPlacement(db, placed(words.slice(0, 2).map((w) => w.id)), new Date(2026, 9, 7, 9));
    expect((await allCards(db)).filter((c) => c.kind === 'recognise').map((c) => c.wordId).sort()).toEqual([words[0]!.id, words[1]!.id, words[7]!.id].sort());
  });
  it('a re-run never places again a character a recheck sent back to learn', async () => {
    const db = await freshDb();
    const words = builtinWords(0).slice(0, 3);
    await putWords(db, words);
    await addReviewLog(db, { cardId: `${words[0]!.id}:recognise`, wordId: words[0]!.id, kind: 'recognise', at: now.getTime(), rating: 1, correct: false }); // its card was deleted
    await applyPlacement(db, placed(words.map((w) => w.id)), now);
    expect((await allCards(db)).filter((c) => c.kind === 'recognise').map((c) => c.wordId).sort()).toEqual([words[1]!.id, words[2]!.id].sort());
  });
  it('a character he learned in the app keeps its reading and still has a meaning check', async () => {
    const db = await freshDb();
    const w = makeWord('很', { id: 'b:a', rank: 1 });
    await putWords(db, [w]);
    await putCards(db, [makeCard('b:a', 'recognise', now, true)]);
    await addReviewLog(db, { cardId: 'b:a:recognise', wordId: 'b:a', kind: 'recognise', at: now.getTime() - 1000, rating: 3, correct: true });
    await applyPlacement(db, placed(['b:a']), now);
    const ids = (await allCards(db)).map((c) => c.id).sort();
    expect(ids).toContain('b:a:meaning');
    expect((await allCards(db)).find((c) => c.id === 'b:a:recognise')!.placed).toBeUndefined();
  });
  it('an empty result seeds nothing and still finishes placement', async () => {
    const db = await freshDb();
    await applyPlacement(db, placed([], { readsUpTo: null }), now);
    expect(await allCards(db)).toEqual([]);
    expect((await getSettings(db)).placementResult).toMatchObject({ readsUpTo: null, tested: 0, assumed: 0 });
  });
});

describe('listening placement (spec 2026-10-14: as now)', () => {
  it('placed characters get listening checks (queueHearChecks)', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, placed(ws.map((w) => w.id)), now);
    expect((await allCards(db)).filter((c) => c.kind === 'hear').map((c) => c.wordId).sort()).toEqual(['b:大', 'b:门']);
  });
  it('a word heard right gets a passed hear card marked as a guess; a ladder word too', async () => {
    const db = await freshDb();
    const lw = ladderWords()[0]!;
    await putWords(db, [makeWord('门', { rank: 0 })]);
    await applyPlacement(db, placed([], { heardIds: ['b:门', lw.id], readsUpTo: null }), now);
    const hear = new Map((await allCards(db)).filter((c) => c.kind === 'hear').map((c) => [c.wordId, c]));
    for (const id of ['b:门', lw.id]) expect([hear.get(id)?.passed, hear.get(id)?.guess]).toEqual([now.getTime(), true]);
  });
  it('a re-run keeps practised hear cards and upgrades queued checks', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, placed(ws.map((w) => w.id)), now);
    const base = makeCard('b:大', 'hear', now);
    await putCards(db, [{ ...base, fsrs: { ...base.fsrs, reps: 3 } }]);
    await addReviewLog(db, { cardId: 'b:大:hear', wordId: 'b:大', kind: 'hear', at: now.getTime(), rating: 3, correct: true, responseMs: 1500 });
    await applyPlacement(db, placed(ws.map((w) => w.id), { heardIds: ws.map((w) => w.id) }), now);
    const byId = new Map((await allCards(db)).map((c) => [c.id, c]));
    expect(byId.get('b:门:hear')!.guess).toBe(true);
    expect(byId.get('b:大:hear')!.fsrs.reps).toBe(3);
  });
  it('a heard-only character is begun, and its guess opens no rung until a real answer confirms it', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, placed([], { heardIds: ['b:门'], readsUpTo: null }), now);
    const plan = buildSessionPlan({ cards: await allCards(db), words: ws, settings: { ...DEFAULT_SETTINGS, newPerDay: 5 }, now });
    expect(plan.newWordIds).toEqual(['b:大']);
    expect(await openMissingRungs(db, new Date(now.getTime() + 86_400_000))).toBe(0);
  });
});

describe('placement over the real terms', () => {
  it('a child reading up to 一下 has 一上 and 一下 placed', () => {
    const terms = termWords(builtinWords(0));
    const ids = placementIds(terms, [], 1);
    expect(ids.readingIds).toHaveLength(terms[0]!.length + terms[1]!.length);
  });
});
