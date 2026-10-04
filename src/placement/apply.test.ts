// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { isKnown } from '../srs/scheduler';
import { addReviewLog, allCards, getSettings, putCards, putWords } from '../store/repo';
import { freshDb, makeCard } from '../test/fixtures';
import { applyPlacement, placementIds } from './apply';
import { makeWord } from '../test/fixtures';

const readOnly = (readingIds: string[]) => ({ readingIds, understandingIds: [], missed: [], reading: 0, understanding: -1 });

describe('applyPlacement', () => {
  it('seeds missing cards, keeps existing ones, and marks placement done', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 2, 9);
    const words = builtinWords(0).slice(0, 10);
    await putWords(db, words);
    await putCards(db, [makeCard(words[0]!.id, 'recognise', now)]);
    expect(await applyPlacement(db, readOnly(words.slice(0, 5).map((w) => w.id)), now)).toBe(4);
    const first = (await allCards(db)).find((c) => c.wordId === words[0]!.id)!;
    expect(isKnown(first.fsrs)).toBe(false);
    expect((await getSettings(db)).placementDone).toBe(true);
  });
  it('a re-run replaces the earlier placement: guesses it no longer supports are cleared, words he has practised stay known', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 2, 9);
    const words = builtinWords(0).slice(0, 10);
    await putWords(db, words);
    await applyPlacement(db, readOnly(words.map((w) => w.id)), now); // first check: all 10 known
    await addReviewLog(db, { cardId: `${words[7]!.id}:recognise`, wordId: words[7]!.id, kind: 'recognise', at: now.getTime() + 1000, rating: 3, correct: true });
    await applyPlacement(db, readOnly(words.slice(0, 2).map((w) => w.id)), new Date(2026, 9, 4, 9)); // re-run fails early: 2 known
    expect((await allCards(db)).filter((c) => c.kind === 'recognise').map((c) => c.wordId).sort()).toEqual([words[0]!.id, words[1]!.id, words[7]!.id].sort());
  });
});

describe('two levels (spec §19 part 6)', () => {
  it('read and understood: known reading and meaning; read only: known reading, meaning due now; above: new', async () => {
    const db = await freshDb();
    const ws = [makeWord('很', { id: 'b:a', rank: 1 }), makeWord('跟', { id: 'b:b', rank: 2, examples: [{ text: '跟着', pinyin: 'x zhe' }] }), makeWord('根', { id: 'b:c', rank: 3 })];
    await putWords(db, ws);
    const now = new Date(2026, 9, 5, 9);
    await applyPlacement(db, { readingIds: ['b:a', 'b:b'], understandingIds: ['b:a'], missed: ['b:c'], reading: 0, understanding: 0 }, now);
    const cards = new Map((await allCards(db)).map((c) => [c.id, c]));
    expect(cards.get('b:a:meaning')!.fsrs.due.getTime()).toBeGreaterThan(now.getTime());
    expect(cards.get('b:b:recognise')).toBeTruthy();
    expect(cards.get('b:b:meaning')!.fsrs.due.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(cards.has('b:c:recognise')).toBe(false);
    expect((await getSettings(db)).placementResult).toMatchObject({ reading: 0, understanding: 0, missed: ['b:c'] });
  });
  it('a word with no meaning cue gets no meaning card (it would only fall back to a reading question)', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('欺', { id: 'b:q', rank: 1 })]);
    await applyPlacement(db, { readingIds: ['b:q'], understandingIds: [], missed: [], reading: 0, understanding: -1 }, new Date(2026, 9, 5, 9));
    expect((await allCards(db)).map((c) => c.id)).toEqual(['b:q:recognise']);
  });
  it('a re-run clears placement-only meaning cards the new result does not support; practised words stay', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('很', { id: 'b:a', rank: 1 }), makeWord('在', { id: 'b:b', rank: 2 })]);
    const now = new Date(2026, 9, 5, 9);
    await applyPlacement(db, { readingIds: ['b:a', 'b:b'], understandingIds: ['b:a', 'b:b'], missed: [], reading: 0, understanding: 0 }, now);
    await addReviewLog(db, { cardId: 'b:a:meaning', wordId: 'b:a', kind: 'meaning', at: now.getTime(), rating: 3, correct: true });
    await applyPlacement(db, { readingIds: [], understandingIds: [], missed: [], reading: -1, understanding: -1 }, now);
    expect((await allCards(db)).map((c) => c.id).sort()).toEqual(['b:a:meaning']); // its practised meaning stays; the unpractised reading guess goes
  });
  it('an empty result (knows nothing) seeds nothing and still finishes placement', async () => {
    const db = await freshDb();
    await applyPlacement(db, { readingIds: [], understandingIds: [], missed: [], reading: -1, understanding: -1 }, new Date());
    expect(await allCards(db)).toEqual([]);
    expect((await getSettings(db)).placementDone).toBe(true);
  });
});

describe('placementIds', () => {
  it('everything up to each level, plus right answers above it', () => {
    const bands = [[makeWord('一', { id: 'b:1' })], [makeWord('二', { id: 'b:2' })], [makeWord('三', { id: 'b:3' })]];
    const answers = [
      { band: 1, style: 'read' as const, wordId: 'b:2', correct: true }, { band: 1, style: 'real' as const, wordId: 'b:2', correct: true },
      { band: 1, style: 'fill' as const, wordId: 'b:2', correct: true }, { band: 1, style: 'fit' as const, wordId: 'b:2', correct: false },
      { band: 2, style: 'read' as const, wordId: 'b:3', correct: true }, { band: 2, style: 'real' as const, wordId: 'b:3', correct: false }, { band: 2, style: 'fill' as const, wordId: 'b:3x', correct: false },
    ];
    expect(placementIds(bands, answers)).toEqual({ readingIds: ['b:1', 'b:2', 'b:3'], understandingIds: ['b:1'], missed: ['b:2', 'b:3', 'b:3x'] });
  });
  it('a lucky 是假的 above the level is not counted as a word he reads', () => {
    const bands = [[makeWord('一', { id: 'b:1' })], [makeWord('二', { id: 'b:2' })]];
    const answers = [{ band: 0, style: 'read' as const, wordId: 'b:1', correct: true }, { band: 0, style: 'read' as const, wordId: 'b:1', correct: true }, { band: 1, style: 'real' as const, wordId: 'b:2', correct: true }, { band: 1, style: 'read' as const, wordId: 'b:2x', correct: false }];
    expect(placementIds(bands, answers).readingIds).toEqual(['b:1']);
  });
  it('meaning checks for words he only reads are spread out, easiest first, 12 a day — never all due at once', async () => {
    const db = await freshDb();
    const ws = builtinWords(0).slice(0, 30);
    await putWords(db, ws);
    const now = new Date(2026, 9, 5, 9);
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], missed: [], reading: 0, understanding: -1 }, now);
    const meaning = (await allCards(db)).filter((c) => c.kind === 'meaning');
    const day = (c: { fsrs: { due: Date } }) => Math.round((c.fsrs.due.getTime() - now.getTime()) / 86_400_000);
    const perDay = new Map<number, number>();
    for (const c of meaning) perDay.set(day(c), (perDay.get(day(c)) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(12);
    expect(perDay.get(0)).toBe(12);
    const rankOf = new Map(ws.map((w) => [w.id, w.rank!]));
    const firstDay = meaning.filter((c) => day(c) === 0).map((c) => rankOf.get(c.wordId)!);
    const later = meaning.filter((c) => day(c) > 0).map((c) => rankOf.get(c.wordId)!);
    expect(Math.max(...firstDay)).toBeLessThan(Math.min(...later)); // easiest first
  });
});

describe('re-runs (deferred minors, plans 11 and 14)', () => {
  it('practising only its meaning does not keep a guessed reading card the new result drops', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('很', { id: 'b:a', rank: 1 })]);
    const now = new Date(2026, 9, 5, 9);
    await applyPlacement(db, { readingIds: ['b:a'], understandingIds: ['b:a'], missed: [], reading: 0, understanding: 0 }, now);
    await addReviewLog(db, { cardId: 'b:a:meaning', wordId: 'b:a', kind: 'meaning', at: now.getTime(), rating: 3, correct: true });
    await applyPlacement(db, { readingIds: [], understandingIds: [], missed: [], reading: -1, understanding: -1 }, now);
    expect((await allCards(db)).map((c) => c.id)).toEqual(['b:a:meaning']);
  });
  it('a word understood before and only read now gets a meaning check again (its old known card is replaced)', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('很', { id: 'b:a', rank: 1 })]);
    const now = new Date(2026, 9, 5, 9);
    await applyPlacement(db, { readingIds: ['b:a'], understandingIds: ['b:a'], missed: [], reading: 0, understanding: 0 }, now);
    await applyPlacement(db, { readingIds: ['b:a'], understandingIds: [], missed: [], reading: 0, understanding: -1 }, now);
    const meaning = (await allCards(db)).find((c) => c.id === 'b:a:meaning')!;
    expect(meaning.fsrs.due.getTime()).toBeLessThanOrEqual(now.getTime());
  });
});
