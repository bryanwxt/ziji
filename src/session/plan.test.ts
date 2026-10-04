import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type Settings } from '../types';
import { buildFreePlayQueue, buildSessionPlan } from './plan';
import { createFreePlayRecord } from './runner';

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
    const practised = new Map(ws.map((w) => [w.id, 1]));
    expect(buildSessionPlan({ cards: due(41), words: ws, settings: settings(), now, practised }).newWordIds).toEqual([]);
    expect(buildSessionPlan({ cards: due(40), words: ws, settings: settings(), now, practised }).newWordIds).toHaveLength(DEFAULT_SETTINGS.newPerDay);
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
    expect([p20.writeCount, p20.flashTimeBoxMs]).toEqual([3, Math.round((20 * 60_000 * 9) / 30)]);
    expect(buildSessionPlan({ cards: [], words: [], settings: settings({ sessionMinutes: 25 }), now }).writeCount).toBe(4); // spec §20 part 3: 4 words at 30 minutes, 3 under 25
  });

  it('only includes switched-on activities, in the fixed order', () => {
    const s = settings({ activities: { flashcards: true, choose: false, writing: false, components: true, speaking: false } });
    expect(buildSessionPlan({ cards: [], words: [], settings: s, now }).steps).toEqual(['flashcards', 'components', 'wrapup']);
    expect(buildSessionPlan({ cards: [], words: [], settings: settings(), now }).steps).toEqual(['flashcards', 'choose', 'components', 'writing', 'speaking', 'wrapup']); // spec §20 part 5
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
  const withCue = (i: number) => makeWord(`字${i}`, { id: `b:${i}`, rank: i, pinyin: 'zì líng', examples: [{ text: `字${i}书`, pinyin: 'zì líng shū' }] });
  it('adds due meaning reviews, and starts meaning practice for words he has begun, never for words without a cue', () => {
    const ws = [withCue(0), withCue(1), makeWord('欺负', { id: 'p:1', rank: null, examples: [] }), withCue(3)];
    const cards = [
      makeCard('b:0', 'recognise', later), makeCard('b:0', 'meaning', hoursAgo(2)), // due meaning review
      makeCard('b:1', 'recognise', later), // begun, no meaning card yet → new meaning
      makeCard('p:1', 'recognise', later), // begun, but no cue → nothing
    ];
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now });
    expect(plan.meaningReviewIds).toEqual(['b:0']);
    expect(plan.newMeaningIds).toEqual(['b:1']);
  });
  it('the 认一认 time box is 9 of 30 minutes (more meaning checks, 2026-10-04)', () => {
    expect(buildSessionPlan({ cards: [], words: [], settings: settings({ sessionMinutes: 30 }), now }).flashTimeBoxMs).toBe(9 * 60_000);
  });
});

describe('new words meet their meaning in the same lesson (spec §20 part 2)', () => {
  it('new words that have a cue get their meaning question in the same lesson (newWordMeaningIds)', () => {
    const plan = buildSessionPlan({ cards: [], words: [makeWord('很', { rank: 1 }), makeWord('欺负', { id: 'p:1', source: 'parent', level: null, rank: null, listedAt: 1 })], settings: settings({ newPerDay: 4 }), now: new Date('2026-10-05T09:00') });
    expect(plan.newWordIds).toEqual(['p:1', 'b:很']);
    expect(plan.newWordMeaningIds).toEqual(['b:很']); // 欺负 has no sentence, bank item or 组词
  });
  it('4 new words a day by default', () => expect(DEFAULT_SETTINGS.newPerDay).toBe(4));
});

describe('用一用 closes the lesson (spec §20 part 7)', () => {
  it('when 认一认 or 选一选 is on', () => {
    expect(buildSessionPlan({ cards: [], words: [], settings: settings(), now }).steps.at(-1)).toBe('wrapup');
    const off = settings({ activities: { ...DEFAULT_SETTINGS.activities, flashcards: false, choose: false } });
    expect(buildSessionPlan({ cards: [], words: [], settings: off, now }).steps).not.toContain('wrapup');
    const nothing = settings({ activities: { flashcards: false, choose: false, writing: false, components: false, speaking: false } });
    expect(buildSessionPlan({ cards: [], words: [], settings: nothing, now }).steps).toEqual([]);
  });
  it('free play has no wrap-up', () => {
    expect(createFreePlayRecord([], 'd', 0).plan.steps).toEqual(['flashcards']);
  });
});

describe('meaning checks for words he already knows (parent: more volume, 2026-10-04)', () => {
  it('starts meaning practice for up to 12 begun words a day', () => {
    const ws = Array.from({ length: 20 }, (_, i) => makeWord(String.fromCodePoint(0x4e00 + i), { id: `b:${i}`, rank: i, examples: [{ text: `${String.fromCodePoint(0x4e00 + i)}书`, pinyin: 'x shū' }] }));
    const cards = ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now });
    expect(plan.newMeaningIds).toHaveLength(12);
  });
});

describe('the new-word pause (deferred minor, plan 5)', () => {
  it('first rechecks of placement guesses never pause new words; a real backlog of practised words does', () => {
    const ws = words(80);
    const dueSoon = (n: number) => ws.slice(0, n).map((w) => makeCard(w.id, 'recognise', hoursAgo(1)));
    expect(buildSessionPlan({ cards: dueSoon(60), words: ws, settings: settings(), now }).newWordIds.length).toBeGreaterThan(0); // unpractised: placement rechecks
    const practised = new Map(ws.slice(0, 60).map((w) => [w.id, 1]));
    expect(buildSessionPlan({ cards: dueSoon(60), words: ws, settings: settings(), now, practised }).newWordIds).toEqual([]);
  });
});
