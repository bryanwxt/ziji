// @vitest-environment node
// List items in 练一练 (weekly list spec 2026-10-17 §6.4, §7.6, §2.1).
import { describe, expect, it } from 'vitest';
import type { PracticeItem } from '../session/round';
import { makeWord } from '../test/fixtures';
import type { WeekItem, WeekList, Word } from '../types';
import { listPracticeItems, MAX_BOOST, MAX_RESERVED } from './plan';
import { withList } from './practice';

const it_ = (wordId: string, text: string, over: Partial<WeekItem> = {}): WeekItem => ({ wordId, text, from: 'grid', addedStatus: 'new', ...over });
const base: WeekList = {
  id: 'wl:p', name: 'P', createdAt: 0, readyBy: '2026-11-11', homeworkDue: '2026-11-13',
  items: [it_('b:干净', '干净'), it_('b:整齐', '整齐'), it_('b:安静', '安静'), it_('b:热闹', '热闹'), it_('b:踢', '踢', { from: 'both' }), it_('b:炒', '炒', { from: 'both' }), it_('b:放', '放', { from: 'both' })],
  pairs: [
    { left: '踢', right: '毽子', wrong: ['青菜', '风筝', '书包'], reading: 'tī jiàn zi' },
    { left: '炒', right: '青菜', wrong: ['毽子', '风筝', '书包'], reading: 'chǎo qīng cài' },
    { left: '放', right: '风筝', wrong: ['毽子', '青菜', '书包'], reading: 'fàng fēng zheng' },
  ],
  fits: [{ wordId: 'b:干净', sentence: '洗过的小手真＿。', source: 'parent', wrong: ['热闹', '整齐', '安静'] }],
};
const ws = new Map<string, Word>(base.items.map((i) => [i.wordId, makeWord(i.text)]));
const mon = new Date(2026, 10, 9, 9); // before ready-by
const begunAll = new Set(base.items.map((i) => i.wordId));
const right = { at: 1, correct: true };
const readAndMeaning = { read: right, meaning: right }; // these words have English, so meaning is a form too

describe('boost items before the check (spec §6.4)', () => {
  it('one per begun word that is not ready, in its weakest form: read first', () => {
    const xs = listPracticeItems([base], ws, mon, new Set(['b:干净', 'b:整齐']));
    expect(xs.map((x) => [x.wordId, x.ask, x.list?.form])).toEqual([['b:干净', 'read', 'read'], ['b:整齐', 'read', 'read']]);
    expect(xs.every((x) => x.grades === null && !x.list?.reserved && x.list?.listId === 'wl:p')).toBe(true);
  });
  it('read right: its next form, the English meaning; then the confirmed fill-in, asked with its row', () => {
    const l0 = { ...base, items: base.items.map((i) => (i.wordId === 'b:干净' ? { ...i, last: { read: right } } : i)) };
    expect(listPracticeItems([l0], ws, mon, new Set(['b:干净']))[0]).toMatchObject({ ask: 'meaningRead', list: { form: 'meaning' } });
    const l = { ...base, items: base.items.map((i) => (i.wordId === 'b:干净' ? { ...i, last: readAndMeaning } : i)) };
    const [x] = listPracticeItems([l], ws, mon, new Set(['b:干净']));
    expect(x).toMatchObject({ wordId: 'b:干净', ask: 'fit', rung: 2, list: { form: 'fit', fit: base.fits[0] } });
  });
  it('a ready word gets none; nothing on the ready-by day before the check (the check asks them)', () => {
    const l = { ...base, items: base.items.map((i) => (i.wordId === 'b:整齐' ? { ...i, last: readAndMeaning } : i)) };
    expect(listPracticeItems([l], ws, mon, new Set(['b:整齐']))).toEqual([]);
    expect(listPracticeItems([base], ws, new Date(2026, 10, 11, 9), begunAll)).toEqual([]);
  });
  it('a pair half asked 搭配 with its confirmed wrongs; three such pairs share one 连一连 board with a decoy', () => {
    const l = { ...base, items: base.items.map((i) => ({ ...i, last: readAndMeaning })) };
    const one = listPracticeItems([l], ws, mon, new Set(['b:踢']));
    expect(one).toEqual([expect.objectContaining({ wordId: 'b:踢', ask: 'match', list: expect.objectContaining({ form: 'dapei', pair: base.pairs[0] }) })]);
    const board = listPracticeItems([l], ws, mon, new Set(['b:踢', 'b:炒', 'b:放'])).filter((x) => x.list?.form === 'dapei');
    expect(board).toHaveLength(1); // a board counts as one item (spec §7.6)
    expect(board[0]!.list?.pairs?.map((p) => p.left).sort()).toEqual(['放', '炒', '踢']);
  });
  it('a fill-in row whose decoy is no longer on the list is never asked: the word is asked another way', () => {
    const l = { ...base, items: base.items.filter((i) => i.text !== '热闹').map((i) => (i.wordId === 'b:干净' ? { ...i, last: { ...readAndMeaning, read: { at: 2, correct: false } } } : i)) };
    expect(listPracticeItems([l], ws, mon, new Set(['b:干净']))[0]?.ask).toBe('read'); // its weakest form left: read, last wrong
    const kept = { ...l, items: [...l.items, it_('b:热闹', '热闹')] };
    expect(listPracticeItems([{ ...kept, items: kept.items.map((i) => (i.wordId === 'b:干净' ? { ...i, last: readAndMeaning } : i)) }], ws, mon, new Set(['b:干净']))[0]?.ask).toBe('fit');
  });
});

describe('reserved items after the check (spec §2.1, §8.2)', () => {
  const thu = new Date(2026, 10, 12, 9);
  const after = (patch: (i: WeekItem) => WeekItem): WeekList => ({
    ...base,
    check: { at: 5, day: '2026-11-11', done: true, results: { 'b:干净': { form: 'fit', correct: false }, 'b:整齐': { form: 'read', correct: true } } },
    items: base.items.map(patch),
  });
  it('every not-solid item gets one, the day after a miss in the form it missed', () => {
    const l = after((i) => (i.wordId === 'b:干净' ? { ...i, missedOn: '2026-11-11', last: { fit: { at: 6, correct: false } } } : i.wordId === 'b:整齐' ? i : { ...i, last: { read: { at: 2, correct: true } } }));
    const xs = listPracticeItems([l], ws, thu, begunAll);
    expect(xs.find((x) => x.wordId === 'b:干净')).toMatchObject({ ask: 'fit', list: { form: 'fit', reserved: true } });
    expect(xs.some((x) => x.wordId === 'b:整齐')).toBe(false); // passed the check: solid
    expect(xs.every((x) => x.list?.reserved)).toBe(true);
    // the others were never asked in the check: each has its slot
    expect(xs.map((x) => x.wordId).filter((id) => id !== 'b:干净').sort()).toEqual(['b:安静', 'b:放', 'b:炒', 'b:热闹', 'b:踢']);
  });
  it('at most 8, the oldest last answer first', () => {
    const many: WeekList = { ...base, pairs: [], fits: [], check: { at: 5, day: '2026-11-11', done: true, results: {} },
      items: Array.from({ length: 11 }, (_, k) => it_(`p:${k}`, `词${k}`, { last: { read: { at: 100 - k, correct: false } } })) };
    const mw = new Map(many.items.map((i) => [i.wordId, makeWord(i.text, { id: i.wordId })]));
    const xs = listPracticeItems([many], mw, thu, new Set(many.items.map((i) => i.wordId)));
    expect(xs).toHaveLength(MAX_RESERVED);
    expect(xs[0]!.wordId).toBe('p:10');
  });
});

describe('withList (spec §7.6)', () => {
  const item = (wordId: string, due = false): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: due ? 'recognise' : null, retry: false, ...(due ? { due: true } : {}) });
  const reserved = (id: string): PracticeItem => ({ ...item(id), list: { listId: 'wl:p', form: 'read', reserved: true } });
  const boost = (id: string): PracticeItem => ({ ...item(id), list: { listId: 'wl:p', form: 'read' } });
  it('reserved items always come; boost only as far as the box holds; never ahead of the first due items', () => {
    const round = [item('x1', true), item('x2', true), item('x3'), item('x4'), item('x5'), item('x6')];
    const out = withList(round, [reserved('b:干净'), boost('b:整齐')], 6);
    expect(out.map((x) => x.wordId)).toContain('b:干净');
    expect(out.map((x) => x.wordId)).not.toContain('b:整齐');
    expect(out.findIndex((x) => x.wordId === 'b:干净')).toBeGreaterThan(1);
  });
  it('boost: at most 6 and a third of the round, spread out, inside the box, never beside the same word', () => {
    const round = Array.from({ length: 30 }, (_, k) => item(k % 2 ? 'b:整齐' : `x${k}`, k < 4));
    const boosts = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((t) => boost(`b:${t}`));
    const out = withList(round, [...boosts, boost('b:整齐')], 60);
    const at = out.map((x, i) => (x.list ? i : -1)).filter((i) => i >= 0);
    expect(at).toHaveLength(MAX_BOOST);
    expect(Math.min(...at)).toBeGreaterThanOrEqual(4);
    for (const i of at) expect([out[i - 1]?.wordId, out[i + 1]?.wordId]).not.toContain(out[i]!.wordId);
  });
  it('a round longer than the box: reserved items still land inside the box', () => {
    const round = Array.from({ length: 80 }, (_, k) => item(`x${k}`, k < 10));
    const out = withList(round, [reserved('b:干净'), reserved('b:整齐')], 30);
    for (const id of ['b:干净', 'b:整齐']) expect(out.findIndex((x) => x.wordId === id)).toBeLessThan(30);
  });
  it('no list items: the round unchanged', () => {
    const round = [item('x1', true), item('x2')];
    expect(withList(round, [], 40)).toEqual(round);
  });
});
