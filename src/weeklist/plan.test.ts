// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { pickNewWords } from '../session/lanes';
import { buildSessionPlan, LIST_WORD_PRACTICE_MS } from '../session/plan';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type WeekList } from '../types';
import { activeLists, frontLoadDays, frontLoadPreview, listBudget, listOwner, MAX_FRONT_LOAD, MAX_LIST_LESSON, schoolNeed } from './plan';

const mon = new Date(2026, 9, 19, 9);
const list = (over: Partial<WeekList> = {}): WeekList => ({
  id: 'wl:1', name: 'L', createdAt: mon.getTime(), readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: Array.from({ length: 14 }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const })), pairs: [], fits: [], ...over,
});
const words = (n: number) => Array.from({ length: n }, (_, i) => makeWord(`词${i}`, { id: `p:${i}`, source: 'parent', rank: null, level: null }));
const base = { cards: new Map<string, CardRecord>(), now: mon, pace: 5, ceiling: 8, ranOutYesterday: false, backlog: false, schoolNeed: 8 };

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const }));
const tue = new Date(2026, 9, 20, 9);

describe('listBudget (spec §5.2, parent rulings 2026-10-18: front-loaded and deadline-safe)', () => {
  it('front-loads from the first lesson: 14 new words on Monday are 12 today, not 7', () => {
    const b = listBudget({ ...base, lists: [list()] });
    expect([b.listQuota, b.total, b.frontLoad, b.schoolFirst]).toEqual([12, 12, true, 0]); // class words wait
  });
  it('24 new words: 12 a lesson', () => {
    expect(listBudget({ ...base, lists: [list({ items: items(24) })] }).listQuota).toBe(MAX_FRONT_LOAD);
    expect(MAX_FRONT_LOAD).toBe(12);
  });
  it('a small list comes all at once: 9 new words on Monday are 9', () => {
    expect(listBudget({ ...base, lists: [list({ items: items(9) })] }).listQuota).toBe(9);
  });
  it('never under the old pace + 2, never more than are left', () => {
    expect(listBudget({ ...base, ceiling: 14, pace: 12, lists: [list({ items: items(20) })] }).listQuota).toBe(14);
    expect(listBudget({ ...base, lists: [list({ items: items(3) })] }).listQuota).toBe(3);
  });
  it('above 12 only when the days left need it: 30 on Monday is 15, 50 is 20 at most', () => {
    expect(listBudget({ ...base, lists: [list({ items: items(30) })] }).listQuota).toBe(15);
    expect(listBudget({ ...base, lists: [list({ items: items(50) })] }).listQuota).toBe(MAX_LIST_LESSON);
    expect(MAX_LIST_LESSON).toBe(20);
  });
  it('the last front-load day takes what is left, up to 20', () => {
    expect(listBudget({ ...base, now: tue, lists: [list({ items: items(11) })] }).listQuota).toBe(11);
    expect(listBudget({ ...base, now: tue, lists: [list({ items: items(18) })] }).listQuota).toBe(18); // a day was skipped
    expect(listBudget({ ...base, now: tue, lists: [list({ items: items(40) })] }).listQuota).toBe(20); // the rest after the check
  });
  it('a run-out takes the headroom only: the list still front-loads', () => {
    expect(listBudget({ ...base, lists: [list({ items: items(9) })], ranOutYesterday: true }).total).toBe(9);
  });
  it('two run-outs never cut a front-load day: the list still comes before ready-by (parent report 2026-10-23: 3–4 a day)', () => {
    expect(listBudget({ ...base, lists: [list({ items: items(24) })], ranOutYesterday: true }).listQuota).toBe(12);
    expect(listBudget({ ...base, now: tue, lists: [list({ items: items(18) })], ranOutYesterday: true }).listQuota).toBe(18);
  });
  it('a backlog pause before ready-by: the list front-loads as usual, his other new words wait', () => {
    const b = listBudget({ ...base, lists: [list()], backlog: true });
    expect([b.listQuota, b.total, b.frontLoad, b.schoolFirst]).toEqual([12, 12, true, 0]);
  });
  it('a backlog pause with the list taught: nothing at all', () => {
    expect(listBudget({ ...base, now: new Date(2026, 9, 22, 9), lists: [list({ items: [] })], backlog: true }).total).toBe(0);
  });
  it('a backlog pause after ready-by is not a front-load day', () => {
    const b = listBudget({ ...base, now: new Date(2026, 9, 22, 9), lists: [list()], backlog: true });
    expect([b.listQuota, b.frontLoad]).toEqual([3, false]);
  });
  it('classShort: what his class lane will still lack on homework day at these numbers', () => {
    expect(listBudget({ ...base, lists: [list()] }).classShort).toBe(0);
    expect(listBudget({ ...base, now: new Date(2026, 9, 22, 9), lists: [list({ items: [] })], schoolNeed: 13 }).classShort).toBe(3); // Thu–Fri at 5
    // 20 class words, 15 by Wed–Fri at 5: 5 short; none Monday (12 list words), 1 Tuesday under the ceiling (2 list words)
    expect(listBudget({ ...base, lists: [list()], schoolNeed: 20 }).classShort).toBe(4);
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
  it('class words wait on a front-load day: the list never gives way to them', () => {
    const b = listBudget({ ...base, lists: [list()], schoolNeed: 24 });
    expect([b.listQuota, b.total, b.schoolFirst]).toEqual([12, 12, 0]);
  });
  it('a small front-load day leaves the room under the ceiling to a class lane too big for the days after the check', () => {
    const b = listBudget({ ...base, now: tue, lists: [list({ items: items(2) })], schoolNeed: 20 }); // 5 short of Wed–Fri at 5
    expect([b.listQuota, b.total, b.schoolFirst]).toEqual([2, 7, 1]);
  });
});

describe('frontLoadDays (parent rulings 2026-10-18)', () => {
  const run = (left: number, from: string, readyBy = '2026-10-21') => { const r = frontLoadDays({ rate: 7, left, from, readyBy }); return [r.days.map((d) => d.n), r.late]; };
  it('24 new words, ready by Wednesday: 12 and 12 from the first lesson, saved Sat, Sun or Mon', () => {
    expect(run(24, '2026-10-17')).toEqual([[12, 12], 0]);
    expect(run(24, '2026-10-18')).toEqual([[12, 12], 0]);
    expect(run(24, '2026-10-19')).toEqual([[12, 12], 0]);
  });
  it('more than the days take at 12: deadline-safe up to 20, the rest after the check', () => {
    expect(run(30, '2026-10-19')).toEqual([[15, 15], 0]);
    expect(run(40, '2026-10-20')).toEqual([[20], 20]);
    expect(run(40, '2026-10-19')).toEqual([[20, 20], 0]);
  });
});

describe('frontLoadPreview (the parent\'s plan line)', () => {
  const p = { pace: 5, ceiling: 8, sessionMinutes: 15, readyBy: '2026-10-21' };
  it('a big list: 12 a day from today, about 22-minute lessons (练一练 +2, 写一写 as usual, a minute a word over pace + 2)', () => {
    expect(frontLoadPreview({ ...p, newCount: 24, today: '2026-10-18', lessonDone: false })).toEqual({ days: [{ date: '2026-10-18', n: 12, minutes: 22 }, { date: '2026-10-19', n: 12, minutes: 22 }], late: 0 });
  });
  it('today\'s lesson done: from tomorrow', () => {
    expect(frontLoadPreview({ ...p, newCount: 24, today: '2026-10-18', lessonDone: true }).days.map((d) => d.date)).toEqual(['2026-10-19', '2026-10-20']);
  });
  it('a list that fits at pace + 2: the usual lesson and 练一练\'s 2 minutes', () => {
    expect(frontLoadPreview({ ...p, newCount: 6, today: '2026-10-19', lessonDone: false })).toEqual({ days: [{ date: '2026-10-19', n: 6, minutes: 17 }], late: 0 });
  });
  it('20 in a lesson: about 30 minutes; what the days can\'t take comes after the check', () => {
    expect(frontLoadPreview({ ...p, newCount: 40, today: '2026-10-20', lessonDone: false })).toEqual({ days: [{ date: '2026-10-20', n: 20, minutes: 30 }], late: 20 });
  });
  it('no days before ready-by: none', () => {
    expect(frontLoadPreview({ ...p, newCount: 24, today: '2026-10-20', lessonDone: true })).toEqual({ days: [], late: 24 });
  });
});

describe('two lists', () => {
  it('a shared word belongs to the earlier list', () => {
    const a = list({ id: 'wl:a', readyBy: '2026-10-21' });
    const b = list({ id: 'wl:b', readyBy: '2026-10-28', homeworkDue: '2026-10-30' });
    expect(listOwner(activeLists([b, a], mon), mon).get('p:0')?.id).toBe('wl:a');
  });
  it('a shared word is the earlier list\'s until its ready-by, then the later list\'s (spec §10)', () => {
    const a = list({ id: 'wl:a', items: list().items.slice(0, 3) });
    const b = list({ id: 'wl:b', createdAt: mon.getTime() + 1, readyBy: '2026-10-28', homeworkDue: '2026-10-30', items: list().items.slice(2, 5) });
    const open = activeLists([a, b], mon);
    expect(listOwner(open, new Date(2026, 9, 21, 20)).get('p:2')?.id).toBe('wl:a'); // a's check day: still a's
    expect(listOwner(open, new Date(2026, 9, 22, 9)).get('p:2')?.id).toBe('wl:b');
    expect(listOwner(open, new Date(2026, 9, 22, 9)).get('p:0')?.id).toBe('wl:a'); // on a only: a's, past its ready-by
    // still new on Thursday: taught for b, before b's ready-by
    const thu = listBudget({ ...base, now: new Date(2026, 9, 22, 9), lists: open });
    expect(thu.listIds).toContain('p:2');
    expect(thu.frontLoad).toBe(true);
    // on b's ready-by day its check grades the shared word: left out of 练一练
    const card = makeCard('p:2', 'recognise', new Date(2026, 9, 28, 6), true);
    const plan = buildSessionPlan({ cards: [card], words: words(5), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 28, 9), newPerDay: 5, lists: [a, b] });
    expect(plan.reviewWordIds).toEqual([]);
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
    expect(plan.listNewIds).toHaveLength(12);
    expect(plan.newWordIds.slice(0, 12).every((id) => id.startsWith('p:'))).toBe(true);
    expect(plan.newWordLanes?.['p:0']).toBe('list');
    expect(plan.frontLoad).toBe(true);
    expect(plan.practiceTimeBoxMs).toBe(Math.round(settings.sessionMinutes * 60_000 / 3) + 120_000 + 5 * LIST_WORD_PRACTICE_MS);
  });
  it('a big front-load day gives 练一练 more time for the words over pace + 2 (parent ruling 2026-10-17)', () => {
    const ws = [...words(24), ...Array.from({ length: 10 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }))];
    const big = list({ items: Array.from({ length: 24 }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const })) });
    const plan = buildSessionPlan({ cards: [], words: ws, settings, now: mon, newPerDay: 5, lists: [big] });
    expect(plan.listNewIds).toHaveLength(12);
    expect(plan.newWordIds).toHaveLength(12); // class and catch-up words wait
    expect(plan.practiceTimeBoxMs).toBe(Math.round(settings.sessionMinutes * 60_000 / 3) + 120_000 + 5 * LIST_WORD_PRACTICE_MS);
  });
  // final review 2026-10-17: list slots the planner can't fill never go to MOE words above the ceiling
  const big = () => list({ items: Array.from({ length: 20 }, (_, i) => ({ wordId: `p:${i}`, text: `词${i}`, from: 'grid' as const, addedStatus: 'new' as const })) });
  const moe = () => Array.from({ length: 12 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));
  it('hear-only list words are learning, not new: no list slots, MOE at his pace, never above the ceiling', () => {
    const cards = words(20).map((w) => makeCard(w.id, 'hear', new Date(2026, 9, 25), true));
    const plan = buildSessionPlan({ cards, words: [...words(20), ...moe()], settings, now: mon, newPerDay: 5, lists: [big()] });
    expect(plan.listNewIds ?? []).toHaveLength(0);
    expect(plan.newWordIds).toHaveLength(5);
    expect(plan.frontLoad).toBeFalsy();
  });
  it('paused list words take no slots: MOE at his pace, never above the ceiling', () => {
    const plan = buildSessionPlan({ cards: [], words: [...words(20).map((w) => ({ ...w, paused: true })), ...moe()], settings, now: mon, newPerDay: 5, lists: [big()] });
    expect(plan.listNewIds ?? []).toHaveLength(0);
    expect(plan.newWordIds.length).toBeLessThanOrEqual(settings.newPerDay);
    expect(plan.newWordIds).toHaveLength(5);
  });
  it('deleted list words take no slots either', () => {
    const plan = buildSessionPlan({ cards: [], words: [...words(4), ...moe()], settings, now: mon, newPerDay: 5, lists: [big()] }); // 16 of the 20 gone
    expect(plan.listNewIds).toHaveLength(4);
    expect(plan.newWordIds.length).toBeLessThanOrEqual(7); // the list's 4, then MOE up to pace + 2 at most
  });
  it('a backlog pause with hear-only list words: no MOE words either', () => {
    const due = Array.from({ length: 45 }, (_, i) => makeCard(`b:复${i}`, 'recognise', new Date(2026, 9, 18), true));
    const revision = Array.from({ length: 45 }, (_, i) => makeWord(`复${i}`, { id: `b:复${i}`, rank: 9000 + i }));
    const cards = [...due, ...words(20).map((w) => makeCard(w.id, 'hear', new Date(2026, 9, 25), true))];
    const practised = new Map(revision.map((w) => [w.id, 1]));
    const plan = buildSessionPlan({ cards, words: [...words(20), ...moe(), ...revision], settings, now: mon, newPerDay: 5, lists: [big()], practised });
    expect(plan.newWordIds).toHaveLength(0);
  });
  it('without a list, nothing changes', () => {
    const ws = Array.from({ length: 10 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));
    const a = buildSessionPlan({ cards: [], words: ws, settings, now: mon, newPerDay: 5 });
    const b = buildSessionPlan({ cards: [], words: ws, settings, now: mon, newPerDay: 5, lists: [] });
    expect(b).toEqual(a);
    expect(a.newWordIds).toHaveLength(5);
    expect(a.frontLoad).toBe(false);
  });
  it('a backlog pause before ready-by: the list front-loads 12, and nothing else', () => {
    const ws = [...words(14), ...Array.from({ length: 50 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }))];
    const due = ws.slice(14).map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 18), true));
    const practised = new Map(ws.slice(14).map((w) => [w.id, 0]));
    const plan = buildSessionPlan({ cards: due, words: ws, settings, now: mon, newPerDay: 5, practised, lists: [list()] });
    expect(plan.newWordIds).toEqual(Array.from({ length: 12 }, (_, i) => `p:${i}`));
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
  it('ready-by day leaves only what the check grades (reading, meaning): his hear and understand cards still come (final review 2026-10-17)', () => {
    const wed = new Date(2026, 9, 21, 9);
    const at = new Date(2026, 9, 21, 6);
    const book = makeWord('书', { id: 'b:书', rank: 1 });
    const l = list({ items: [{ wordId: 'b:书', text: '书', from: 'grid', addedStatus: 'known' }] });
    const cards = (['recognise', 'meaning', 'hear', 'understand'] as const).map((k) => makeCard('b:书', k, at, true));
    const plan = buildSessionPlan({ cards, words: [book], settings, now: wed, newPerDay: 5, lists: [l] });
    expect(plan.reviewWordIds).not.toContain('b:书');
    expect(plan.meaningReviewIds ?? []).not.toContain('b:书');
    expect(plan.hearReviewIds).toContain('b:书');
  });
  it('due list cards come first among due reviews between ready-by and homework', () => {
    const thu = new Date(2026, 9, 22, 9);
    const cards = [makeCard('b:x', 'recognise', new Date(2026, 9, 20), true), makeCard('p:0', 'recognise', new Date(2026, 9, 22, 6), true)];
    expect(buildSessionPlan({ cards, words: [...words(1), makeWord('x')], settings, now: thu, newPerDay: 5, lists: [list()] }).reviewWordIds[0]).toBe('p:0');
  });
  it('list cards in the homework window never squeeze revision: the cap is for the rest', () => {
    const thu = new Date(2026, 9, 22, 9);
    const rev = Array.from({ length: 70 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));
    const cards = [
      ...rev.map((w, i) => makeCard(w.id, 'recognise', new Date(2026, 9, 21, 6, i), true)),
      ...words(5).map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 22, 6), true)),
    ];
    const plan = buildSessionPlan({ cards, words: [...words(14), ...rev], settings, now: thu, newPerDay: 5, lists: [list()] });
    expect(plan.reviewWordIds.slice(0, 5)).toEqual(['p:0', 'p:1', 'p:2', 'p:3', 'p:4']);
    expect(plan.reviewWordIds.filter((id) => id.startsWith('b:'))).toHaveLength(60);
  });
  it('list cards are left out of the backlog count', () => {
    const thu = new Date(2026, 9, 22, 9);
    const rev = Array.from({ length: 35 }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));
    const extra = Array.from({ length: 10 }, (_, i) => makeWord(`新${i}`, { id: `b:n${i}`, rank: 100 + i }));
    const cards = [...rev, ...words(10)].map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 21, 6), true));
    const practised = new Map([...rev, ...words(10)].map((w) => [w.id, 0]));
    const plan = buildSessionPlan({ cards, words: [...words(14), ...rev, ...extra], settings, now: thu, newPerDay: 5, practised, lists: [list()] });
    expect(plan.newWordIds.some((id) => id.startsWith('b:n'))).toBe(true); // 35 practised due, not 45: no pause
  });
  it('a front-load day writes the usual count of characters: 写一写 is never halved (parent ruling 2026-10-18)', () => {
    const ws = [...words(14), ...Array.from('一二三四五六七八九十').map((t, i) => makeWord(t, { rank: i }))];
    const cards = ws.slice(14).map((w) => makeCard(w.id, 'write', new Date(2026, 9, 18), true));
    const on = buildSessionPlan({ cards, words: ws, settings, now: mon, newPerDay: 5, lists: [list()] });
    const off = buildSessionPlan({ cards, words: ws, settings, now: mon, newPerDay: 5 });
    expect(off.writeCount).toBeGreaterThan(2);
    expect(on.frontLoad).toBe(true);
    expect(on.writeCount).toBe(off.writeCount);
  });
});

describe('schoolNeed counts only his class window (spec §5.3)', () => {
  it('the class lesson and the one before, unstarted; never catch-up lessons, never ahead', () => {
    const at: Record<string, number> = { a: 3, b: 4, c: 5, d: 5, e: 6 };
    const ws = Object.keys(at).map((t) => ({ id: `b:${t}`, text: t }));
    expect(schoolNeed(ws, new Set(['b:d']), 5, (w) => at[w.text])).toBe(2); // b (4) and c (5); a is catch-up, e is ahead, d begun
  });
});
