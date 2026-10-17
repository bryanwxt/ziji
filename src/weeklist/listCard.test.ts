// @vitest-environment node
// The 认新词 card for a list word (weekly list spec 2026-10-17 §7.1–7.2) and re-teaching cards (§2.1).
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { WeekItem, WeekList } from '../types';
import { leadPair, listCardFor, MAX_RETEACH, reteachIds } from './plan';

const item = (wordId: string, text: string, over: Partial<WeekItem> = {}): WeekItem => ({ wordId, text, from: 'grid', addedStatus: 'new', ...over });
const list: WeekList = {
  id: 'wl:a', name: 'A', createdAt: 0, readyBy: '2026-11-04', homeworkDue: '2026-11-06',
  items: [item('b:炒', '炒', { from: 'both' }), item('p:亮晶晶', '亮晶晶'), item('p:低下头', '低下头'), item('w:干净', '干净'), item('b:踢', '踢')],
  pairs: [{ left: '炒', right: '青菜', wrong: ['皮球', '毽子', '书包'], reading: 'chǎo qīng cài' }],
  fits: [],
};

describe('the list word card (spec §7.1–7.2)', () => {
  it('a verb that leads a pair on its list is taught through the pair, at the pair reading, the verb marked', () => {
    expect(leadPair(makeWord('炒'), [list])?.right).toBe('青菜');
    const c = listCardFor(makeWord('炒'), [list], new Set());
    expect(c).toMatchObject({ lead: '炒青菜', leadReading: 'chǎo qīng cài', mark: [0, 1] });
    expect(c.leadGloss).toContain('stir-fry');
    expect(c.example).toBeUndefined(); // the pair carries the use
  });
  it('a verb with no pair on the list keeps its character card, its example carrying the use', () => {
    expect(leadPair(makeWord('踢'), [list])).toBeNull();
    const c = listCardFor(makeWord('踢'), [list], new Set());
    expect(c.lead).toBeUndefined();
    expect(c.example?.text).toContain('踢');
    expect(c.mark).toBeUndefined(); // one character: the card is the character itself
  });
  it('a pair word on no active list leads nothing', () => {
    expect(leadPair(makeWord('炒'), [])).toBeNull();
    expect(leadPair(makeWord('青菜'), [list])).toBeNull(); // only a single character leads with its pair
  });
  it('a word marks its first unbegun character, none when all are begun', () => {
    const w = makeWord('亮晶晶', { id: 'p:亮晶晶', source: 'parent', pinyin: 'liàng jīng jīng' });
    expect(listCardFor(w, [list], new Set(['亮'])).mark).toEqual([1, 1]);
    expect(listCardFor(w, [list], new Set()).mark).toEqual([0, 1]);
    expect(listCardFor(w, [list], new Set(['亮', '晶'])).mark).toBeUndefined();
  });
  it('the example: his class sentence first, then the school file, at most 30 characters, with its pinyin', () => {
    const own = makeWord('干净', { id: 'w:干净', sentences: [{ text: '洗过的小手真干净。', pinyin: 'xǐ guò de xiǎo shǒu zhēn gān jìng' }] });
    expect(listCardFor(own, [list], new Set(['干', '净'])).example).toEqual({ text: '洗过的小手真干净。', pinyin: 'xǐ guò de xiǎo shǒu zhēn gān jìng' });
    const school = listCardFor(makeWord('亮晶晶', { id: 'p:亮晶晶' }), [list], new Set()).example!;
    expect(school.text).toContain('亮晶晶');
    expect(school.pinyin.split(' ')).toHaveLength(Array.from(school.text).filter((c) => /\p{Script=Han}/u.test(c)).length);
    const long = makeWord('干净', { id: 'w:干净', sentences: [{ text: '我们每天放学以前都要把教室打扫得干干净净的，这样才干净。', pinyin: '' }] });
    expect(Array.from(listCardFor(long, [list], new Set()).example?.text ?? '').length).toBeLessThanOrEqual(30);
  });
  it('a phrase with no sentence anywhere: no example row', () => {
    expect(listCardFor(makeWord('低下头', { id: 'p:低下头', source: 'parent' }), [list], new Set(['低', '下', '头'])).example).toBeUndefined();
  });
});

describe('re-teaching cards (spec §2.1)', () => {
  const after = (missedOn: string[]): WeekList => ({
    ...list,
    check: { at: 1, day: '2026-11-04', done: true, results: Object.fromEntries(list.items.map((i, k) => [i.wordId, { form: 'read' as const, correct: !missedOn[k] }])) },
    items: list.items.map((i, k) => (missedOn[k] ? { ...i, missedOn: missedOn[k] } : i)),
  });
  it('the next lesson after a miss; never again once re-taught, until a new miss', () => {
    const l = after(['2026-11-04', '', '2026-11-04']);
    expect(reteachIds([l], new Date(2026, 10, 5, 8))).toEqual(['b:炒', 'p:低下头']);
    const taught = { ...l, items: l.items.map((i) => (i.missedOn ? { ...i, reteachedOn: '2026-11-05' } : i)) };
    expect(reteachIds([taught], new Date(2026, 10, 6, 8))).toEqual([]);
    expect(reteachIds([after(['2026-11-05'])], new Date(2026, 10, 6, 8))).toEqual(['b:炒']); // missed again in Thursday's lesson
  });
  it('nothing before the check, nothing for a solid item, at most 6', () => {
    expect(reteachIds([{ ...list, items: list.items.map((i) => ({ ...i, missedOn: '2026-11-02' })) }], new Date(2026, 10, 3, 8))).toEqual([]);
    const solid = after(['2026-11-04']);
    solid.items[0] = { ...solid.items[0]!, rightDays: ['2026-11-05', '2026-11-06'] };
    expect(reteachIds([solid], new Date(2026, 10, 5, 8))).toEqual([]);
    const many: WeekList = { ...list, check: { at: 1, day: '2026-11-04', done: true, results: {} },
      items: Array.from({ length: 9 }, (_, k) => item(`p:${k}`, `字${k}`, { missedOn: '2026-11-04' })) };
    expect(reteachIds([many], new Date(2026, 10, 5, 8))).toHaveLength(MAX_RETEACH);
  });
  it('missed in the check first, then later misses', () => {
    const l = after(['2026-11-04', '2026-11-04']);
    // 炒 was right in the check, missed later the same day in a lesson; 亮晶晶 missed in the check
    l.check!.results['b:炒'] = { form: 'read', correct: true };
    const ids = reteachIds([l], new Date(2026, 10, 5, 8));
    expect(ids).toEqual(['p:亮晶晶', 'b:炒']);
  });
});
