import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type Settings } from '../types';
import { buildFreePlayQueue, buildSessionPlan } from './plan';

const now = new Date(2026, 9, 2, 8, 0);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over });
const words = (n: number) => Array.from({ length: n }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));

describe('buildSessionPlan', () => {
  it('puts the most overdue reviews first and caps them at 60', () => {
    const ws = words(70);
    const cards = ws.map((w, i) => makeCard(w.id, 'recognise', hoursAgo(i + 1)));
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now });
    expect(plan.reviewWordIds).toHaveLength(60);
    expect(plan.reviewWordIds[0]).toBe('b:69');
  });

  it('includes cards due later today but not tomorrow', () => {
    const cards = [makeCard('b:0', 'recognise', new Date(2026, 9, 2, 22)), makeCard('b:1', 'recognise', new Date(2026, 9, 3, 1))];
    expect(buildSessionPlan({ cards, words: words(2), settings: settings(), now }).reviewWordIds).toEqual(['b:0']);
  });

  it('introduces listed words first (oldest list first), then by rank, skipping paused and started words', () => {
    const ws = [
      makeWord('a', { id: 'b:a', rank: 0 }),
      makeWord('b', { id: 'b:b', rank: 1, paused: true }),
      makeWord('c', { id: 'b:c', rank: 2 }),
      makeWord('d', { id: 'b:d', rank: 3 }),
      makeWord('朋友', { id: 'p:1', source: 'parent', rank: null, level: null, listedAt: 50, createdAt: 50 }),
      makeWord('大', { id: 'b:大', rank: 400, listedAt: 10 }),
    ];
    const cards = [makeCard('b:c', 'recognise', new Date(2026, 9, 9))];
    const plan = buildSessionPlan({ cards, words: ws, settings: settings({ newPerDay: 3 }), now });
    expect(plan.newWordIds).toEqual(['b:大', 'p:1', 'b:a']);
  });

  it('pauses new words when more than 40 cards are due', () => {
    const ws = words(50);
    const due = (n: number) => ws.slice(0, n).map((w) => makeCard(w.id, 'recognise', hoursAgo(1)));
    expect(buildSessionPlan({ cards: due(41), words: ws, settings: settings(), now }).newWordIds).toEqual([]);
    expect(buildSessionPlan({ cards: due(40), words: ws, settings: settings(), now }).newWordIds).toHaveLength(5);
  });

  it('offers due write cards first, then at most 2 new ones for known writeable words', () => {
    const ws = words(6).map((w, i) => ({ ...w, writeable: i !== 4 }));
    const future = new Date(2026, 9, 20);
    const cards = [
      makeCard('b:0', 'write', hoursAgo(2)),
      ...[1, 2, 3, 4].map((i) => makeCard(`b:${i}`, 'recognise', future, true)),
      makeCard('b:5', 'recognise', future, false),
    ];
    expect(buildSessionPlan({ cards, words: ws, settings: settings(), now }).writeCandidates).toEqual([
      { wordId: 'b:0', isNew: false },
      { wordId: 'b:3', isNew: true }, // placed characters near his level first, going down
      { wordId: 'b:2', isNew: true },
    ]);
  });

  it('sizes the writing step and the flashcard time box from session minutes', () => {
    const p20 = buildSessionPlan({ cards: [], words: [], settings: settings({ sessionMinutes: 20 }), now });
    expect([p20.writeCount, p20.flashTimeBoxMs]).toEqual([3, Math.round((20 * 60_000 * 7) / 30)]);
    expect(buildSessionPlan({ cards: [], words: [], settings: settings({ sessionMinutes: 25 }), now }).writeCount).toBe(5);
  });

  it('only includes switched-on activities, in the fixed order', () => {
    const s = settings({ activities: { flashcards: true, writing: false, components: true, speaking: false } });
    expect(buildSessionPlan({ cards: [], words: [], settings: s, now }).steps).toEqual(['flashcards', 'components']);
  });
});

describe('buildFreePlayQueue', () => {
  it('uses started, active words only, as retries (no scheduler reviews)', () => {
    const ws = [makeWord('a', { id: 'b:a' }), makeWord('b', { id: 'b:b', paused: true }), makeWord('c', { id: 'b:c' })];
    const cards = [makeCard('b:a', 'recognise', now), makeCard('b:b', 'recognise', now)];
    expect(buildFreePlayQueue(cards, ws, mulberry32(1))).toEqual([{ wordId: 'b:a', isNew: false, retry: true }]);
  });
});

describe('new writing words', () => {
  it('puts a word whose strokes failed to load behind the others instead of holding a slot every day', () => {
    const ws = [makeWord('甲', { id: 'b:a', rank: 1, writeable: true, writeSkippedAt: now.getTime() }), makeWord('乙', { id: 'b:b', rank: 2, writeable: true }), makeWord('丙', { id: 'b:c', rank: 3, writeable: true })];
    const cards = ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now });
    expect(plan.writeCandidates.map((c) => c.wordId)).toEqual(['b:c', 'b:b']);
  });
});

describe('写一写 after placement', () => {
  const known = (ws: ReturnType<typeof words>) => ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
  it('with no lesson words yet, starts near his level (the hardest character he recognises), not at the first characters', () => {
    const ws = words(10);
    expect(buildSessionPlan({ cards: known(ws), words: ws, settings: settings(), now }).writeCandidates.map((c) => c.wordId)).toEqual(['b:9', 'b:8']);
  });
  it('practises words from his lessons first, newest first, before placed characters', () => {
    const ws = words(10);
    const practised = new Map([['b:1', now.getTime() - 86_400_000], ['b:2', now.getTime() - 3_600_000]]);
    expect(buildSessionPlan({ cards: known(ws), words: ws, settings: settings(), now, practised }).writeCandidates.map((c) => c.wordId)).toEqual(['b:2', 'b:1']);
  });
});

describe('meaning practice', () => {
  const later = new Date(2026, 9, 20);
  const withCue = (i: number) => makeWord(`字${i}`, { id: `b:${i}`, rank: i, examples: [{ text: `字${i}好`, pinyin: 'x' }] });
  it('adds due meaning reviews, and starts meaning practice for words he has begun, never for words without a cue', () => {
    const ws = [withCue(0), withCue(1), makeWord('保持', { id: 'p:1', rank: null, examples: [] }), withCue(3)];
    const cards = [
      makeCard('b:0', 'recognise', later), makeCard('b:0', 'meaning', hoursAgo(2)), // due meaning review
      makeCard('b:1', 'recognise', later), // begun, no meaning card yet → new meaning
      makeCard('p:1', 'recognise', later), // begun, but no cue → nothing
    ];
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now });
    expect(plan.meaningReviewIds).toEqual(['b:0']);
    expect(plan.newMeaningIds).toEqual(['b:1']);
  });
  it('the 认一认 time box is 7 of 30 minutes', () => {
    expect(buildSessionPlan({ cards: [], words: [], settings: settings({ sessionMinutes: 30 }), now }).flashTimeBoxMs).toBe(7 * 60_000);
  });
});
