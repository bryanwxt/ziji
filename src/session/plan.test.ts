import { builtinWords } from '../content';
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type Settings } from '../types';
import { buildSessionPlan } from './plan';
import { PACE_START } from './pace';
/** One character each (写一写 writes a character once a lesson, spec 2026-10-05 §5). */
const DISTINCT = Array.from('一二三四五六七八九十人大小山水火木日月田上下中天地子女手口目耳心土石云雨花草米竹虫鱼羊牛马鸟');

const now = new Date(2026, 9, 2, 8, 0);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over });
const words = (n: number) => Array.from({ length: n }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));
/** Writing tests need a different character per word (写一写 writes a character once a lesson, spec 2026-10-05 §5). */
const chars = (n: number) => Array.from({ length: n }, (_, i) => makeWord(DISTINCT[i]!, { id: `b:${i}`, rank: i }));

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
    expect(buildSessionPlan({ cards: due(40), words: ws, settings: settings(), now, practised }).newWordIds).toHaveLength(PACE_START); // without a pace, a lesson starts at the pace's start (spec 2026-10-05 §2.2)
  });

  it('写一写 (spec 2026-10-05 §5): due writing first, then characters he reads, at his level going down', () => {
    const ws = chars(6).map((w, i) => ({ ...w, writeable: i !== 4 }));
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
      { wordId: 'b:1', isNew: true },
    ]);
  });

  it("sizes 写一写 (9 characters at 30 minutes, 6 at 20) and 练一练's time box from session minutes", () => {
    const ws = chars(12);
    const cards = ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
    const count = (min: number) => new Set(buildSessionPlan({ cards, words: ws, settings: settings({ sessionMinutes: min }), now }).writeItems!.map((i) => `${i.wordId}#${i.at}`)).size;
    expect([count(30), count(20)]).toEqual([9, 6]);
    const p20 = buildSessionPlan({ cards, words: ws, settings: settings({ sessionMinutes: 20 }), now });
    expect(p20.writeCount).toBe(p20.writeItems!.length); // each never-written character is traced, then written from memory
    expect(p20.writeCount).toBe(12);
    expect(p20.practiceTimeBoxMs).toBe(Math.round((20 * 60_000 * 12) / 30));
  });
  it("writes today's new words after due writing, and nothing above his level", () => {
    const ws = [makeWord('甲', { id: 'b:a', rank: 1, level: 1 }), makeWord('乙', { id: 'b:b', rank: 2, level: 3 }), makeWord('丙', { id: 'b:c', rank: 3, level: 2 })];
    const cards = [makeCard('b:a', 'recognise', new Date(2026, 9, 20), true), makeCard('b:b', 'recognise', new Date(2026, 9, 20), true)];
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now, newPerDay: 1 });
    expect(plan.newWordIds).toEqual(['b:c']);
    expect(plan.writeCandidates.map((c) => c.wordId)).toEqual(['b:c', 'b:a']); // 乙 is HSK 3; his level is 2 (丙, his next new word)
  });

  it('only includes switched-on activities, in the fixed order', () => {
    const s = settings({ activities: { newwords: false, practice: true, writing: false, speaking: true }, langdu: true });
    expect(buildSessionPlan({ cards: [], words: [], settings: s, now }).steps).toEqual(['practice', 'speaking']);
  });
});

describe('new writing words', () => {
  it('puts a word whose strokes failed to load behind the others instead of holding a slot every day', () => {
    const ws = [makeWord('甲', { id: 'b:a', rank: 1, writeable: true, writeSkippedAt: now.getTime() }), makeWord('乙', { id: 'b:b', rank: 2, writeable: true }), makeWord('丙', { id: 'b:c', rank: 3, writeable: true })];
    const cards = ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now });
    expect(plan.writeCandidates.map((c) => c.wordId)).toEqual(['b:c', 'b:b', 'b:a']);
  });
});

describe('写一写 after placement', () => {
  const known = (ws: ReturnType<typeof words>) => ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
  it('with no lesson words yet, starts near his level (the hardest character he recognises), not at the first characters', () => {
    const ws = chars(10);
    expect(buildSessionPlan({ cards: known(ws), words: ws, settings: settings(), now }).writeCandidates.map((c) => c.wordId).slice(0, 2)).toEqual(['b:9', 'b:8']);
  });
  it('practises words from his lessons first, newest first, before placed characters', () => {
    const ws = chars(10);
    const practised = new Map([['b:1', now.getTime() - 86_400_000], ['b:2', now.getTime() - 3_600_000]]);
    expect(buildSessionPlan({ cards: known(ws), words: ws, settings: settings(), now, practised }).writeCandidates.map((c) => c.wordId).slice(0, 2)).toEqual(['b:2', 'b:1']);
  });
});

describe('meaning practice', () => {
  const later = new Date(2026, 9, 20);
  const withCue = (i: number) => makeWord(`字${i}`, { id: `b:${i}`, rank: i, pinyin: 'zì líng', examples: [{ text: `字${i}书`, pinyin: 'zì líng shū' }] });
  it('adds due meaning reviews, and starts meaning practice for words whose reading has passed, never for words without a cue', () => {
    const ws = [withCue(0), withCue(1), makeWord('欺负', { id: 'p:1', rank: null, examples: [] }), withCue(3)];
    const cards = [
      makeCard('b:0', 'recognise', later), makeCard('b:0', 'meaning', hoursAgo(2)), // due meaning review
      { ...makeCard('b:1', 'recognise', later), passed: 1 }, // reading passed, no meaning card yet → new meaning (spec 2026-10-06 §3.2)
      { ...makeCard('p:1', 'recognise', later), passed: 1 }, // reading passed, but no cue → nothing
    ];
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now });
    expect(plan.meaningReviewIds).toEqual(['b:0']);
    expect(plan.newMeaningIds).toEqual(['b:1']);
  });
});

describe('new words meet their meaning in the same lesson (spec §20 part 2)', () => {
  it('new words per day: 8 at most by default; a lesson starts at 4 (spec 2026-10-05 §2.2)', () => {
    expect(DEFAULT_SETTINGS.newPerDay).toBe(8);
    expect(PACE_START).toBe(4);
  });
});

describe('meaning checks for words he already knows (parent: more volume, 2026-10-04)', () => {
  it('starts meaning practice for up to 12 words a day whose reading has passed', () => {
    const ws = Array.from({ length: 20 }, (_, i) => makeWord(String.fromCodePoint(0x4e00 + i), { id: `b:${i}`, rank: i, examples: [{ text: `${String.fromCodePoint(0x4e00 + i)}书`, pinyin: 'x shū' }] }));
    const cards = ws.map((w) => ({ ...makeCard(w.id, 'recognise', new Date(2026, 9, 20), true), passed: 1 }));
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

describe('the lesson (spec 2026-10-05 §2)', () => {
  it('认新字 → 练一练 → 写一写 → 朗读, with no separate 用一用', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: { ...DEFAULT_SETTINGS, langdu: true }, now: new Date(2026, 9, 6) }).steps).toEqual(['newwords', 'practice', 'writing', 'speaking']);
  });
  it('朗读 parked (the default, parent 2026-10-05): no speaking step', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).steps).toEqual(['newwords', 'practice', 'writing']);
  });
  it('练一练 has about 12 of 30 minutes', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).practiceTimeBoxMs).toBe(12 * 60_000);
  });
  it('with 新字 switched off there are no new words', () => {
    const settings = { ...DEFAULT_SETTINGS, activities: { ...DEFAULT_SETTINGS.activities, newwords: false } };
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings, now: new Date(2026, 9, 6) }).newWordIds).toEqual([]);
  });
});

describe('sweep: plan details', () => {
  it('a day with no new words has no 认新字 stop (and no star for it)', () => {
    const ws = words(3);
    const cards = ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
    expect(buildSessionPlan({ cards, words: ws, settings: settings(), now }).steps).not.toContain('newwords');
  });
  it('a meaning card for a word with no cue any more is not taken as due (it would hold a slot it can never use)', () => {
    const ws = [makeWord('欺负', { id: 'p:1', rank: null, examples: [] })];
    const cards = [makeCard('p:1', 'recognise', new Date(2026, 9, 20), true), makeCard('p:1', 'meaning', hoursAgo(2))];
    expect(buildSessionPlan({ cards, words: ws, settings: settings(), now }).meaningReviewIds).toEqual([]);
  });
});

