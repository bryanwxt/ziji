// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { pickNewWords } from '../session/lanes';
import { buildSessionPlan } from '../session/plan';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type WeekList } from '../types';
import { activeLists, listBudget, listOwner, schoolNeed } from './plan';

const mon = new Date(2026, 9, 19, 9);
const list = (over: Partial<WeekList> = {}): WeekList => ({
  id: 'wl:1', name: 'L', createdAt: mon.getTime(), readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: Array.from({ length: 14 }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const })), pairs: [], fits: [], ...over,
});
const words = (n: number) => Array.from({ length: n }, (_, i) => makeWord(`词${i}`, { id: `p:${i}`, source: 'parent', rank: null, level: null }));
const base = { cards: new Map<string, CardRecord>(), now: mon, pace: 5, ceiling: 8, ranOutYesterday: false, ranOutTwice: false, backlog: false, schoolNeed: 8 };

describe('listBudget (spec §5.2)', () => {
  it('front-loads at pace + 2: 14 new words in two days', () => {
    const b = listBudget({ ...base, lists: [list()] });
    expect([b.listQuota, b.total, b.frontLoad, b.schoolFirst]).toEqual([7, 7, true, 0]);
  });
  it('never above the ceiling', () => {
    expect(listBudget({ ...base, pace: 7, lists: [list()] }).listQuota).toBe(8);
  });
  it('no headroom after a run-out', () => {
    expect(listBudget({ ...base, lists: [list()], ranOutYesterday: true }).total).toBe(5);
  });
  it('two run-outs spill: no more than pace − 1 today', () => {
    expect(listBudget({ ...base, lists: [list()], ranOutYesterday: true, ranOutTwice: true }).listQuota).toBe(4);
  });
  it('a backlog pause: list at most 3, nothing else', () => {
    const b = listBudget({ ...base, lists: [list()], backlog: true });
    expect([b.listQuota, b.total]).toEqual([3, 3]);
  });
  it('a backlog pause with the list taught: nothing at all', () => {
    expect(listBudget({ ...base, now: new Date(2026, 9, 22, 9), lists: [list({ items: [] })], backlog: true }).total).toBe(0);
  });
  it('after the front-load days the school lane goes first until schoolNeed is met by homework day', () => {
    const wed = new Date(2026, 9, 21, 9);
    const b = listBudget({ ...base, now: wed, lists: [list({ items: [] })] });
    expect([b.listQuota, b.total, b.frontLoad, b.schoolFirst]).toEqual([0, 5, false, 3]);
  });
  it('the ready-by day takes no list words', () => {
    expect(listBudget({ ...base, now: new Date(2026, 9, 21, 9), lists: [list()] }).listQuota).toBe(0);
  });
  it('list words left after the check yield to his class lane until homework day', () => {
    const thu = new Date(2026, 9, 22, 9);
    const b = listBudget({ ...base, now: thu, lists: [list()] }); // 14 still new (two run-outs spilled them)
    expect([b.listQuota, b.total, b.frontLoad, b.schoolFirst]).toEqual([1, 5, false, 4]);
  });
  it('after homework day the list keeps its priority at the pace (decision 7)', () => {
    const sat = new Date(2026, 9, 24, 9);
    expect(listBudget({ ...base, now: sat, lists: [list()] }).listQuota).toBe(5);
  });
  it('a class lane too big for the days after the check takes the room under the ceiling first, not the list', () => {
    // 20 class words, 3 days from ready-by to homework at 5 = 15: 5 short over the 2 front days = 3 a day, 1 under the ceiling
    const b = listBudget({ ...base, lists: [list()], schoolNeed: 20 });
    expect([b.listQuota, b.total, b.schoolFirst]).toEqual([7, 8, 1]);
  });
  it('the list gives way only by what still lets it finish before ready-by', () => {
    const short = list({ items: list().items.slice(0, 10) }); // 10 new over 2 days needs 5 a day: 2 to spare at 7
    const b = listBudget({ ...base, lists: [short], schoolNeed: 24 }); // 9 short over 2 days: 5 a day; 1 from the ceiling, 2 from the list
    expect([b.listQuota, b.total, b.schoolFirst]).toEqual([5, 8, 3]);
  });
});

describe('two lists', () => {
  it('a shared word belongs to the earlier list', () => {
    const a = list({ id: 'wl:a', readyBy: '2026-10-21' });
    const b = list({ id: 'wl:b', readyBy: '2026-10-28', homeworkDue: '2026-10-30' });
    expect(listOwner(activeLists([b, a], mon)).get('p:0')?.id).toBe('wl:a');
  });
  it('a list closes 7 days after homework, or when the parent closes it', () => {
    expect(activeLists([list()], new Date(2026, 9, 30, 9))).toHaveLength(1);
    expect(activeLists([list()], new Date(2026, 9, 31, 9))).toEqual([]);
    expect(activeLists([list({ closedAt: 1 })], mon)).toEqual([]);
  });
  it('a word counts once, for the earlier list', () => {
    const a = list({ id: 'wl:a', items: list().items.slice(0, 4) });
    const b = list({ id: 'wl:b', readyBy: '2026-10-28', homeworkDue: '2026-10-30', items: list().items.slice(2, 6) });
    expect(listBudget({ ...base, lists: activeLists([a, b], mon) }).listIds).toEqual(['p:0', 'p:1', 'p:2', 'p:3', 'p:4', 'p:5']);
  });
});

describe('schoolNeed (spec §5.3)', () => {
  it("his class lesson and the one before it, unstarted", () => {
    const ws = Array.from('逛夜市持静馆衣').map((t) => makeWord(t)); // 35, 35, 35, 34, 34, 36, 0
    expect(schoolNeed(ws, new Set(['b:逛']), 35)).toBe(4);
    expect(schoolNeed(ws, new Set(), null)).toBe(0);
  });
});

describe('pickNewWords with a list', () => {
  const ch = (t: string, rank: number) => makeWord(t, { id: `b:${t}`, rank });
  it('list words first; a ladder 词语 without the begun gate; one in his class window is tagged school', () => {
    const cands = [ch('衣', 0), ch('逛', 35), makeWord('街道', { id: 'w:街道', rank: 40 }), makeWord('闪闪亮', { id: 'p:a', source: 'parent', rank: null })];
    const r = pickNewWords({ candidates: cands, n: 3, classAt: 35, begunChars: new Set(), listIds: ['w:街道', 'p:a'], listQuota: 2 });
    expect(r.listTaken).toEqual(['w:街道', 'p:a']);
    expect(r.lanes).toMatchObject({ 'w:街道': 'list', 'p:a': 'list' });
    expect(r.words.map((w) => w.id)).toContain('b:逛'); // the one slot left: his class first
    const s = pickNewWords({ candidates: cands, n: 1, classAt: 35, begunChars: new Set(), listIds: ['b:逛'], listQuota: 1 });
    expect(s.lanes['b:逛']).toBe('school');
  });
  it('schoolFirst: the class lane before catch-up', () => {
    const cands = [ch('衣', 0), ch('鱼', 0), ch('雨', 0), ch('逛', 35), ch('夜', 35), ch('市', 35)];
    const r = pickNewWords({ candidates: cands, n: 4, classAt: 35, begunChars: new Set(), schoolFirst: 3 });
    expect(Object.values(r.lanes).filter((l) => l === 'school')).toHaveLength(3);
  });
});

describe('buildSessionPlan with a list (spec §5)', () => {
  const settings = { ...DEFAULT_SETTINGS };
  it('takes list words first, tagged list, and marks a front-load day', () => {
    const ws = [...words(14), ...Array.from({ length: 10 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }))];
    const plan = buildSessionPlan({ cards: [], words: ws, settings, now: mon, newPerDay: 5, lists: [list()] });
    expect(plan.listNewIds).toHaveLength(7);
    expect(plan.newWordIds.slice(0, 7).every((id) => id.startsWith('p:'))).toBe(true);
    expect(plan.newWordLanes?.['p:0']).toBe('list');
    expect(plan.frontLoad).toBe(true);
    expect(plan.practiceTimeBoxMs).toBe(Math.round(settings.sessionMinutes * 60_000 / 3) + 120_000);
  });
  it('without a list, nothing changes', () => {
    const ws = Array.from({ length: 10 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));
    const a = buildSessionPlan({ cards: [], words: ws, settings, now: mon, newPerDay: 5 });
    const b = buildSessionPlan({ cards: [], words: ws, settings, now: mon, newPerDay: 5, lists: [] });
    expect(b).toEqual(a);
    expect(a.newWordIds).toHaveLength(5);
    expect(a.frontLoad).toBe(false);
  });
  it('a backlog pause still takes 3 list words, and nothing else', () => {
    const ws = [...words(14), ...Array.from({ length: 50 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }))];
    const due = ws.slice(14).map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 18), true));
    const practised = new Map(ws.slice(14).map((w) => [w.id, 0]));
    const plan = buildSessionPlan({ cards: due, words: ws, settings, now: mon, newPerDay: 5, practised, lists: [list()] });
    expect(plan.newWordIds).toEqual(['p:0', 'p:1', 'p:2']);
  });
  it('an extra lesson takes no list words', () => {
    const plan = buildSessionPlan({ cards: [], words: words(14), settings, now: mon, newPerDay: 5, extra: true, lists: [list()] });
    expect(plan.newWordIds).toEqual([]);
  });
  it('an extra lesson the day before ready-by leaves the list cards due on ready-by alone', () => {
    const tue = new Date(2026, 9, 20, 17);
    const cards = [makeCard('p:0', 'recognise', new Date(2026, 9, 21, 9), true), makeCard('b:x', 'recognise', new Date(2026, 9, 21, 9), true)];
    const plan = buildSessionPlan({ cards, words: [...words(1), makeWord('x')], settings, now: tue, extra: true, lists: [list()] });
    expect(plan.reviewWordIds).toEqual(['b:x']);
  });
  it('ready-by day leaves list due cards for the check', () => {
    const wed = new Date(2026, 9, 21, 9);
    const cards = [makeCard('p:0', 'recognise', new Date(2026, 9, 21, 6), true), makeCard('b:x', 'recognise', new Date(2026, 9, 21, 6), true)];
    const plan = buildSessionPlan({ cards, words: [...words(1), makeWord('x')], settings, now: wed, newPerDay: 5, lists: [list()] });
    expect(plan.reviewWordIds).toEqual(['b:x']);
  });
  it('due list cards come first among due reviews between ready-by and homework', () => {
    const thu = new Date(2026, 9, 22, 9);
    const cards = [makeCard('b:x', 'recognise', new Date(2026, 9, 20), true), makeCard('p:0', 'recognise', new Date(2026, 9, 22, 6), true)];
    expect(buildSessionPlan({ cards, words: [...words(1), makeWord('x')], settings, now: thu, newPerDay: 5, lists: [list()] }).reviewWordIds[0]).toBe('p:0');
  });
  it('a front-load day writes half the characters', () => {
    const ws = [...words(14), ...Array.from('一二三四五六七八九十').map((t, i) => makeWord(t, { rank: i }))];
    const cards = ws.slice(14).map((w) => makeCard(w.id, 'write', new Date(2026, 9, 18), true));
    const on = buildSessionPlan({ cards, words: ws, settings, now: mon, newPerDay: 5, lists: [list()] });
    const off = buildSessionPlan({ cards, words: ws, settings, now: mon, newPerDay: 5 });
    expect(off.writeCount).toBeGreaterThan(2);
    expect(on.writeCount).toBe(Math.max(1, Math.floor(off.writeCount / 2)));
  });
});
