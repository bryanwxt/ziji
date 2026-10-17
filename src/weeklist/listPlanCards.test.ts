// @vitest-environment node
// The planner fills the list word cards and the re-teaching cards; 认新字 shows re-teaching cards first (weekly list spec §2.1, §7.1).
import { describe, expect, it } from 'vitest';
import { buildSessionPlan } from '../session/plan';
import { createSessionRecord } from '../session/runner';
import { planPractice } from '../session/practice';
import { mulberry32 } from '../lib/random';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type WeekList } from '../types';

const settings = { ...DEFAULT_SETTINGS };
const tue = new Date(2026, 10, 3, 9); // 3 Nov
const words = [
  makeWord('炒', { rank: 1 }), makeWord('亮晶晶', { id: 'p:亮晶晶', source: 'parent', rank: null, level: null, pinyin: 'liàng jīng jīng' }),
  makeWord('低下头', { id: 'p:低下头', source: 'parent', rank: null, level: null, pinyin: 'dī xià tóu' }),
  ...Array.from({ length: 6 }, (_, i) => makeWord(`字${i}`, { id: `b:字${i}`, rank: 10 + i })),
];
const list: WeekList = {
  id: 'wl:a', name: 'A', createdAt: tue.getTime(), readyBy: '2026-11-05', homeworkDue: '2026-11-06',
  items: [{ wordId: 'b:炒', text: '炒', from: 'both', addedStatus: 'new' }, { wordId: 'p:亮晶晶', text: '亮晶晶', from: 'grid', addedStatus: 'new' }, { wordId: 'p:低下头', text: '低下头', from: 'grid', addedStatus: 'new' }],
  pairs: [{ left: '炒', right: '青菜', wrong: ['皮球', '毽子', '书包'], reading: 'chǎo qīng cài' }], fits: [],
};

describe('list cards in the plan (spec §7.1–7.2)', () => {
  it("today's list words get their card; a verb its pair, a word its mark", () => {
    const plan = buildSessionPlan({ cards: [], words, settings, now: tue, newPerDay: 5, lists: [list] });
    expect(plan.listNewIds).toEqual(['b:炒', 'p:亮晶晶', 'p:低下头']);
    expect(plan.listCards?.['b:炒']).toMatchObject({ lead: '炒青菜', leadReading: 'chǎo qīng cài' });
    expect(plan.listCards?.['p:亮晶晶']?.mark).toEqual([0, 1]);
    expect(plan.listCards?.['b:字0']).toBeUndefined(); // his class words keep their own card
    expect(plan.reteachIds ?? []).toEqual([]);
  });
});

describe('re-teaching cards (spec §2.1)', () => {
  const fri = new Date(2026, 10, 6, 9);
  const after: WeekList = {
    ...list,
    check: { at: 1, day: '2026-11-05', done: true, results: { 'b:炒': { form: 'dapei', correct: false }, 'p:亮晶晶': { form: 'read', correct: true }, 'p:低下头': { form: 'read', correct: false } } },
    items: list.items.map((i) => (i.wordId === 'p:亮晶晶' ? i : { ...i, missedOn: '2026-11-05' })),
  };
  const begun = ['b:炒', 'p:亮晶晶', 'p:低下头'].map((id) => makeCard(id, 'recognise', new Date(2026, 10, 9), true));
  it('the day after the check: its misses, first in 认新字, with no new-word slot', () => {
    const plan = buildSessionPlan({ cards: begun, words, settings, now: fri, newPerDay: 5, lists: [after] });
    expect(plan.reteachIds).toEqual(['b:炒', 'p:低下头']);
    expect(plan.listCards?.['b:炒']?.lead).toBe('炒青菜');
    expect(plan.newWordIds).not.toContain('b:炒');
    expect(plan.newWordIds.length).toBeGreaterThan(0); // the day's new words are untouched
    const rec = createSessionRecord(plan, '2026-11-06', fri.getTime());
    expect(rec.flashQueue.slice(0, 2)).toEqual([
      { wordId: 'b:炒', isNew: false, retry: true, reteach: true },
      { wordId: 'p:低下头', isNew: false, retry: true, reteach: true },
    ]);
    expect(rec.flashQueue[2]).toEqual({ wordId: plan.newWordIds[0], isNew: true, retry: false });
  });
  it('认新字 runs for re-teaching cards alone, on a day with no new words', () => {
    const plan = buildSessionPlan({ cards: begun, words: words.slice(0, 3), settings, now: fri, newPerDay: 5, lists: [after] });
    expect(plan.newWordIds).toEqual([]);
    expect(plan.steps[0]).toBe('newwords');
  });
  it('never in an extra lesson', () => {
    const plan = buildSessionPlan({ cards: begun, words, settings, now: fri, newPerDay: 5, lists: [after], extra: true });
    expect(plan.reteachIds ?? []).toEqual([]);
  });
});

describe('list items reach 练一练 (spec §2.1, §7.6)', () => {
  it('the day after the check: the missed items have their reserved slots in the round, with their cards for the pair audio', () => {
    const fri = new Date(2026, 10, 6, 9);
    const after: WeekList = {
      ...list,
      check: { at: 1, day: '2026-11-05', done: true, results: { 'b:炒': { form: 'read', correct: false }, 'p:亮晶晶': { form: 'read', correct: true }, 'p:低下头': { form: 'read', correct: false } } },
      items: list.items.map((i) => (i.wordId === 'p:亮晶晶' ? i : { ...i, missedOn: '2026-11-05' })),
    };
    const cards = [
      ...['b:炒', 'p:亮晶晶', 'p:低下头'].map((id) => makeCard(id, 'recognise', new Date(2026, 10, 9), true)),
      ...Array.from({ length: 6 }, (_, i) => makeCard(`b:字${i}`, 'recognise', new Date(2026, 10, 5), true)), // due revision
    ];
    const plan = buildSessionPlan({ cards, words, settings, now: fri, newPerDay: 0, lists: [after] });
    expect(plan.listItems?.map((x) => [x.wordId, x.list?.form, x.list?.reserved])).toEqual([['b:炒', 'read', true], ['p:低下头', 'read', true]]);
    expect(plan.listCards?.['b:炒']?.lead).toBe('炒青菜');
    const rec = { ...createSessionRecord(plan, '2026-11-06', fri.getTime()), stepIndex: plan.steps.indexOf('practice') };
    const byId = new Map(words.map((w) => [w.id, w]));
    const round = planPractice(rec, new Map(), byId, words, false, mulberry32(3));
    const listed = round.map((x, i) => (x.list ? i : -1)).filter((i) => i >= 0);
    expect(listed).toHaveLength(2);
    expect(Math.min(...listed)).toBeGreaterThan(round.findIndex((x) => !x.due) - 1); // never ahead of the first due items
  });
});
