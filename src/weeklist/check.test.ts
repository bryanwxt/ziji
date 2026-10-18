// @vitest-environment node
// 考考自己 (weekly list spec 2026-10-17 §8.1–8.2, §9). Invented fixtures: 拔萝卜, 摘苹果, 浇花朵, 雨伞, 跳绳, 开心, 小河, 钓鱼.
import { describe, expect, it } from 'vitest';
import { localDateKey, startOfLocalDay } from '../lib/date';
import { mulberry32 } from '../lib/random';
import { allWeekLists, getCard, getKid, putCards, putWeekList, saveKid } from '../store/repo';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_KID, type WeekItem, type WeekList, type Word } from '../types';
import { checkQueue, finishCheck, recordCheckAnswer } from './check';
import { reteachIds, listPracticeItems } from './plan';
import { CLASS_BEHIND_AT, checkTable, countdownLine, notSolid, readinessLine } from './readiness';

const item = (wordId: string, text: string, over: Partial<WeekItem> = {}): WeekItem => ({ wordId, text, from: 'grid', addedStatus: 'new', ...over });
const sheet = (over: Partial<WeekList> = {}): WeekList => ({
  id: 'wl:t', name: '第九课', createdAt: 5, readyBy: '2026-11-04', homeworkDue: '2026-11-06',
  items: [item('p:a', '拔', { from: 'pair' }), item('p:b', '萝卜', { from: 'pair' }), item('p:c', '跳绳'), item('p:d', '雨伞'), item('p:e', '开心'), item('p:f', '小河'), item('p:g', '钓鱼')],
  pairs: [{ left: '拔', right: '萝卜', wrong: ['雨伞', '小河', '钓鱼'] }],
  fits: [{ wordId: 'p:d', sentence: '下雨了，我打着＿上学。', source: 'parent', wrong: ['萝卜', '小河', '钓鱼'] }],
  ...over,
});
const wordsOf = (l: WeekList, meanings: Record<string, string> = { 跳绳: 'skip rope', 开心: 'happy' }): Map<string, Word> =>
  new Map(l.items.map((i) => [i.wordId, makeWord(i.text, { id: i.wordId, source: 'parent', meaning: meanings[i.text] })]));
const WED = new Date(2026, 10, 4, 17); // the ready-by day

describe('checkQueue (spec §8.1)', () => {
  it('one question per item: a pair once for both halves, a confirmed 选词填空, then meaning and read mixed', () => {
    const l = sheet();
    const q = checkQueue(l, wordsOf(l), mulberry32(3));
    expect(q).toHaveLength(6);
    expect(q.flatMap((x) => x.covers).sort()).toEqual(['p:a', 'p:b', 'p:c', 'p:d', 'p:e', 'p:f', 'p:g']);
    expect(q.find((x) => x.form === 'dapei')!.covers.sort()).toEqual(['p:a', 'p:b']);
    expect(q.find((x) => x.form === 'fit')!.wordId).toBe('p:d');
    // the two items with English: one is asked its meaning, the other read (mixed, not all one form)
    expect(new Set(q.filter((x) => x.wordId === 'p:c' || x.wordId === 'p:e').map((x) => x.form))).toEqual(new Set(['meaning', 'read']));
    expect(q.filter((x) => x.wordId === 'p:f' || x.wordId === 'p:g').every((x) => x.form === 'read')).toBe(true);
  });
  it('the same order every time for one list (so stopping and coming back resumes it)', () => {
    const l = sheet();
    expect(checkQueue(l, wordsOf(l), mulberry32(l.createdAt)).map((x) => x.key)).toEqual(checkQueue(l, wordsOf(l), mulberry32(l.createdAt)).map((x) => x.key));
  });
  it('a row no longer guess-proof is not asked: the word is asked another way', () => {
    const l = sheet({ fits: [{ wordId: 'p:d', sentence: '下雨了，我打着＿上学。', source: 'parent', wrong: ['萝卜', '小河', '书包'] }] }); // 书包 is off the list
    expect(checkQueue(l, wordsOf(l), mulberry32(1)).find((x) => x.wordId === 'p:d')!.form).toBe('read');
  });
  it('three pairs that make a board are one 连一连 question for all their halves', () => {
    const l = sheet({
      items: ['拔', '摘', '浇', '萝卜', '苹果', '花朵', '书包'].map((t, i) => item(`p:${i}`, t, { from: 'pair' })),
      pairs: [
        { left: '拔', right: '萝卜', wrong: ['苹果', '花朵', '书包'] },
        { left: '摘', right: '苹果', wrong: ['萝卜', '花朵', '书包'] },
        { left: '浇', right: '花朵', wrong: ['萝卜', '苹果', '书包'] },
      ],
      fits: [],
    });
    const q = checkQueue(l, wordsOf(l, {}), mulberry32(2));
    const board = q.find((x) => x.pairs)!;
    expect(board.pairs).toHaveLength(3);
    expect(board.covers.sort()).toEqual(['p:0', 'p:1', 'p:2', 'p:3', 'p:4', 'p:5']);
    expect(q).toHaveLength(2); // the board and 书包
  });
  it('the weakest first: items not ready come before ready ones', () => {
    const l = sheet();
    const ready = { read: { at: 1, correct: true }, meaning: { at: 1, correct: true } };
    const l2 = { ...l, items: l.items.map((i) => (i.wordId === 'p:f' ? { ...i, last: ready } : i)) };
    const q = checkQueue(l2, wordsOf(l2), mulberry32(9));
    expect(q.at(-1)!.wordId).toBe('p:f');
    expect(q.at(-1)!.ready).toEqual(['p:f']);
  });
});

describe('recordCheckAnswer and finishCheck (spec §8.1–8.2)', () => {
  async function setUp(l: WeekList) {
    const db = await freshDb();
    await putWeekList(db, l);
    await saveKid(db, { ...DEFAULT_KID, bonusStars: 2 });
    return db;
  }
  it('saves as he goes; a star only for each item right and newly ready; the river meter never moves', async () => {
    const before = { read: { at: 1, correct: true } };
    const l = sheet();
    const l2 = { ...l, items: l.items.map((i) => (i.wordId === 'p:g' ? { ...i, last: before } : i)) }; // 钓鱼 ready already
    const db = await setUp(l2);
    const q = checkQueue(l2, wordsOf(l2), mulberry32(1));
    for (const x of q) await recordCheckAnswer(db, 'wl:t', x, x.wordId !== 'p:f', WED);
    expect(Object.keys((await allWeekLists(db))[0]!.check!.results).sort()).toEqual(['p:a', 'p:b', 'p:c', 'p:d', 'p:e', 'p:f', 'p:g']);
    const r = await finishCheck(db, 'wl:t');
    // 7 items: 小河 missed, 钓鱼 right but ready before; the pair's two halves both count
    expect(r).toEqual({ right: 6, total: 7, stars: 5 });
    const kid = (await getKid(db))!;
    expect(kid.bonusStars).toBe(2 + 5);
    expect(kid.meter).toEqual(DEFAULT_KID.meter);
    expect((await allWeekLists(db))[0]!.check!.done).toBe(true);
  });
  it('a second answer to the same question (a double tap, or resuming) changes nothing and earns nothing', async () => {
    const l = sheet();
    const db = await setUp(l);
    const q = checkQueue(l, wordsOf(l), mulberry32(1)).find((x) => x.wordId === 'p:c')!;
    await recordCheckAnswer(db, 'wl:t', q, true, WED);
    await recordCheckAnswer(db, 'wl:t', q, false, WED);
    expect((await allWeekLists(db))[0]!.check!.results['p:c']!.correct).toBe(true);
    expect((await getKid(db))!.bonusStars).toBe(3);
  });
  it('the first answer of the day grades the reading card; a miss is due by the start of tomorrow', async () => {
    const l = sheet();
    const db = await setUp(l);
    const due = new Date(2026, 10, 4, 0);
    await putCards(db, [makeCard('p:f', 'recognise', due, true), makeCard('p:g', 'recognise', due, true)]);
    const q = checkQueue(l, wordsOf(l), mulberry32(1));
    await recordCheckAnswer(db, 'wl:t', q.find((x) => x.wordId === 'p:f')!, false, WED);
    await recordCheckAnswer(db, 'wl:t', q.find((x) => x.wordId === 'p:g')!, true, WED);
    const missed = (await getCard(db, 'p:f:recognise'))!;
    expect(localDateKey(missed.fsrs.last_review!)).toBe('2026-11-04');
    expect(missed.fsrs.due.getTime()).toBeLessThanOrEqual(startOfLocalDay(new Date(2026, 10, 5)).getTime());
    expect(localDateKey((await getCard(db, 'p:g:recognise'))!.fsrs.last_review!)).toBe('2026-11-04');
  });
  it('a missed 搭配 rates the meaning card of each half he has, due by tomorrow', async () => {
    const l = sheet();
    const db = await setUp(l);
    await putCards(db, [makeCard('p:b', 'meaning', new Date(2026, 10, 20), true)]);
    const q = checkQueue(l, wordsOf(l), mulberry32(1)).find((x) => x.form === 'dapei')!;
    await recordCheckAnswer(db, 'wl:t', q, false, WED);
    const meaning = (await getCard(db, 'p:b:meaning'))!; // rated Again (relearning, due today), never later than tomorrow
    expect(localDateKey(meaning.fsrs.last_review!)).toBe('2026-11-04');
    expect(meaning.fsrs.due.getTime()).toBeLessThanOrEqual(new Date(2026, 10, 5).getTime());
    const stored = (await allWeekLists(db))[0]!;
    expect(stored.pairs[0]!.last?.correct).toBe(false);
    expect(stored.items.find((i) => i.wordId === 'p:a')!.missedOn).toBe('2026-11-04');
  });
  it('a board: each pair right or not, each half by its own pair', async () => {
    const l = sheet({
      items: ['拔', '摘', '浇', '萝卜', '苹果', '花朵'].map((t, i) => item(`p:${i}`, t, { from: 'pair' })),
      pairs: [
        { left: '拔', right: '萝卜', wrong: ['苹果', '花朵', '书包'] },
        { left: '摘', right: '苹果', wrong: ['萝卜', '花朵', '书包'] },
        { left: '浇', right: '花朵', wrong: ['萝卜', '苹果', '书包'] },
      ],
      fits: [],
    });
    const db = await setUp(l);
    const board = checkQueue(l, wordsOf(l, {}), mulberry32(2)).find((x) => x.pairs)!;
    await recordCheckAnswer(db, 'wl:t', board, false, WED, { pairs: [{ left: '拔', right: '萝卜', correct: true }, { left: '摘', right: '苹果', correct: false }, { left: '浇', right: '花朵', correct: true }] });
    const res = (await allWeekLists(db))[0]!.check!.results;
    expect(Object.entries(res).filter(([, r]) => !r.correct).map(([k]) => k).sort()).toEqual(['p:1', 'p:4']);
  });
  it('misses come back: a re-teaching card the next lesson, and a reserved 练一练 item every lesson after', async () => {
    const l = sheet();
    const db = await setUp(l);
    const words = wordsOf(l);
    for (const x of checkQueue(l, words, mulberry32(1))) await recordCheckAnswer(db, 'wl:t', x, x.wordId !== 'p:f', WED);
    await finishCheck(db, 'wl:t');
    const stored = await allWeekLists(db);
    const thu = new Date(2026, 10, 5, 17);
    expect(reteachIds(stored, thu)).toEqual(['p:f']);
    expect(notSolid(stored[0]!, thu).map((i) => i.wordId)).toContain('p:f');
    const sat = new Date(2026, 10, 7, 17); // homework day is behind: still practised (decision 7)
    expect(listPracticeItems(stored, words, sat, new Set(words.keys())).some((x) => x.wordId === 'p:f' && x.list?.reserved)).toBe(true);
  });
  it('finishing an empty check earns nothing', async () => {
    const db = await setUp(sheet());
    expect(await finishCheck(db, 'wl:t')).toEqual({ right: 0, total: 0, stars: 0 });
    expect((await getKid(db))!.bonusStars).toBe(2);
  });
});

describe('countdownLine (spec §9)', () => {
  const l = sheet();
  const words = wordsOf(l);
  it('counts down to the ready-by weekday, with the items not yet ready', () => {
    expect(countdownLine([l], words, new Date(2026, 10, 2, 9))).toBe('星期三前：还有 7 个词');
  });
  it('unopened check on the ready-by day: 今天考考自己！ (and the cards stay due)', () => {
    expect(countdownLine([l], words, new Date(2026, 10, 4, 9))).toBe('今天考考自己！');
  });
  it('after the check: praise when all are ready, else how many to look at again; nothing after homework day', () => {
    const all = { ...l, check: { at: 1, day: '2026-11-04', done: true, results: Object.fromEntries(l.items.map((i) => [i.wordId, { form: 'read' as const, correct: true }])) } };
    expect(countdownLine([all], words, new Date(2026, 10, 5, 9))).toBe('本周词语：7 个都会了！');
    const some = { ...all, check: { ...all.check, results: { ...all.check.results, 'p:f': { form: 'read' as const, correct: false } } } };
    expect(countdownLine([some], words, new Date(2026, 10, 5, 9))).toBe('还要再看 1 个词');
    expect(countdownLine([all], words, new Date(2026, 10, 7, 9))).toBeNull();
  });
  it('two lists: the nearest ready-by, one line', () => {
    const later = { ...sheet(), id: 'wl:u', readyBy: '2026-11-11', homeworkDue: '2026-11-13', items: [item('p:z', '风筝')] };
    expect(countdownLine([later, l], new Map([...words, ['p:z', makeWord('风筝', { id: 'p:z', source: 'parent' })]]), new Date(2026, 10, 2, 9))).toBe('星期三前：还有 7 个词');
  });
});

describe('readinessLine (spec §8.3)', () => {
  const l = sheet();
  const words = wordsOf(l);
  it('List x/y ready · class shortfall only when there is one · reviews due — weak, worst first', () => {
    const missed = { ...l, pairs: [{ ...l.pairs[0]!, last: { at: 3, correct: false } }],
      items: l.items.map((i) => (i.wordId === 'p:c' ? { ...i, last: { read: { at: 2, correct: false } } } : i.wordId === 'p:f' ? { ...i, last: { read: { at: 2, correct: true } } } : i)) };
    const r = readinessLine(missed, words, { classLeft: 2, classKnown: true, catchupSlower: false, reviewsDue: 14 });
    expect(r.head).toBe('第九课 · ready by Wed 4 Nov · homework Fri 6 Nov');
    expect(r.line).toBe('List 1/7 ready · class: 2 left by Fri · 14 reviews due');
    expect(r.weak[0]).toBe('跳绳'); // answered wrong comes before never answered
    expect(r.weak).toContain('拔—萝卜');
    expect(r.weak).toHaveLength(5);
    expect(readinessLine(l, words, { classLeft: 0, classKnown: true, catchupSlower: true, reviewsDue: 3 }).line).toBe('List 0/7 ready · class on track · catch-up slower this week · 3 reviews due');
    expect(readinessLine(l, words, { classLeft: 0, classKnown: false, catchupSlower: false, reviewsDue: 0 }).line).toBe('List 0/7 ready · 0 reviews due');
  });
  it('new words even 20 a lesson can\'t teach before the check: how many come after it (parent ruling 2026-10-18)', () => {
    expect(readinessLine(l, words, { classLeft: 0, classKnown: false, catchupSlower: false, reviewsDue: 0, afterCheck: 4 }).line).toBe('List 0/7 ready · 4 new words after the check · 0 reviews due');
    expect(readinessLine(l, words, { classLeft: 0, classKnown: false, catchupSlower: false, reviewsDue: 0, afterCheck: 1 }).line).toContain('1 new word after the check');
  });
  it("the class shortfall's weekday is the homework day the parent set", () => {
    expect(readinessLine({ ...l, homeworkDue: '2026-11-05' }, words, { classLeft: 3, classKnown: true, catchupSlower: false, reviewsDue: 0 }).line).toContain('class: 3 left by Thu');
  });
  it('far behind his class (more than CLASS_BEHIND_AT short): no big number, a pointer to Progress', () => {
    expect(readinessLine(l, words, { classLeft: CLASS_BEHIND_AT, classKnown: true, catchupSlower: false, reviewsDue: 0 }).line).toContain(`class: ${CLASS_BEHIND_AT} left by Fri`);
    expect(readinessLine(l, words, { classLeft: CLASS_BEHIND_AT + 1, classKnown: true, catchupSlower: false, reviewsDue: 0 }).line).toBe('List 0/7 ready · behind class — see Progress · 0 reviews due');
  });
});

describe('checkTable (spec §8.3): each item, its check result and where it is now', () => {
  it('not yet first, then ready, then solid, each in list order; never asked shows as such', () => {
    const l = sheet();
    const words = wordsOf(l);
    const checked: WeekList = { ...l,
      check: { at: 10, day: '2026-11-04', done: true, results: { 'p:a': { form: 'dapei', correct: true }, 'p:b': { form: 'dapei', correct: true }, 'p:f': { form: 'read', correct: false }, 'p:c': { form: 'meaning', correct: true } } },
      items: l.items.map((i) => (i.wordId === 'p:c' ? { ...i, rightDays: ['2026-11-05', '2026-11-06'] } : i.wordId === 'p:b' ? { ...i, missedOn: '2026-11-05', last: { read: { at: 20, correct: false } } } : i)) };
    const rows = checkTable(checked, words);
    expect(rows.map((r) => [r.text, r.check, r.now])).toEqual([
      ['萝卜', '✓ 搭配', 'not yet'], // right in the check, wrong since
      ['雨伞', 'not asked', 'not yet'],
      ['开心', 'not asked', 'not yet'],
      ['小河', '✗ read', 'not yet'],
      ['钓鱼', 'not asked', 'not yet'],
      ['拔', '✓ 搭配', 'solid'],
      ['跳绳', '✓ meaning', 'solid'],
    ]);
  });
});
