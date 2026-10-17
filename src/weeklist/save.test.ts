// src/weeklist/save.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { glossFor } from '../content/glossary';
import { kidGlossTexts } from '../content/kidGloss';
import { ladderWords } from '../content/ladder';
import { allWeekLists, allWords, putWords } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { saveWeekList, type ApprovedDraft } from './save';

const now = new Date(2026, 9, 19, 9);
// glossed words that are no ladder 词语, so they are saved as new parent words
const [G1, G2] = kidGlossTexts().filter((t) => [...t].length === 2 && !ladderWords().some((w) => w.text === t));
const draft = (over: Partial<ApprovedDraft> = {}): ApprovedDraft => ({
  name: '复习一', readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ text: '跑', from: 'grid' }, { text: '闪闪亮', from: 'grid', meaning: 'sparkly' }], pairs: [], fits: [], ...over,
});
describe('saveWeekList', () => {
  it('references stored words unchanged and adds new parent words with the list name', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('跑', { listName: '听写 mistakes', listedAt: -5 })]);
    const l = await saveWeekList(db, draft(), now);
    const words = await allWords(db);
    expect(words.find((x) => x.text === '跑')).toMatchObject({ listName: '听写 mistakes', listedAt: -5 });
    expect(words.find((x) => x.text === '闪闪亮')).toMatchObject({ listName: '复习一', meaning: 'sparkly', writeable: false });
    expect(l.items.map((i) => i.wordId)).toEqual(['b:跑', expect.stringMatching(/^p:/)]);
    expect(await allWeekLists(db)).toHaveLength(1);
  });
  it('unpauses only when ticked', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('跑', { paused: true })]);
    await saveWeekList(db, draft({ items: [{ text: '跑', from: 'grid', unpause: true }] }), now);
    expect((await allWords(db))[0]!.paused).toBe(false);
  });
  it('a re-paste updates the list and adds nothing twice', async () => {
    const db = await freshDb();
    const l = await saveWeekList(db, draft(), now);
    await saveWeekList(db, draft({ items: [{ text: '跑', from: 'grid' }, { text: '闪闪亮', from: 'grid' }, { text: '书包', from: 'pair' }] }), now, l.id);
    expect((await allWords(db)).filter((x) => x.text === '闪闪亮')).toHaveLength(1);
    expect((await allWeekLists(db))[0]!.items.map((i) => i.text)).toEqual(['跑', '闪闪亮', '书包']);
  });
  it('a re-paste merges pairs by left|right and fill-ins by word: old ones and their answers kept (final review 2026-10-17)', async () => {
    const db = await freshDb();
    const pair = (left: string, right: string) => ({ left, right, wrong: ['皮球', '风筝', '书包'] as [string, string, string] });
    const fit = (wordId: string, sentence: string) => ({ wordId, sentence, source: 'parent' as const, wrong: ['甲', '乙', '丙'] as [string, string, string] });
    const l = await saveWeekList(db, draft({ pairs: [pair('煎', '鸡蛋'), pair('喝', '牛奶')], fits: [fit('跑', '他在＿＿。')] }), now);
    // he answers a pair in between
    const stored = (await allWeekLists(db))[0]!;
    await db.put('weekLists', { ...stored, pairs: stored.pairs.map((p) => (p.left === '煎' ? { ...p, last: { at: 1, correct: true } } : p)) });
    await saveWeekList(db, draft({ pairs: [pair('煎', '鸡蛋'), pair('踢', '足球')], fits: [fit('闪闪亮', '星星＿＿。')] }), now, l.id);
    const after = (await allWeekLists(db))[0]!;
    expect(after.pairs.map((p) => `${p.left}|${p.right}`)).toEqual(['煎|鸡蛋', '喝|牛奶', '踢|足球']);
    expect(after.pairs.find((p) => p.left === '煎')!.last).toEqual({ at: 1, correct: true });
    expect(after.fits.map((f) => f.sentence)).toEqual(['他在＿＿。', '星星＿＿。']);
  });
  it('re-pasting a saved sheet merges in the new sentence rows and loses no answer (parent ruling 2026-10-17)', async () => {
    const db = await freshDb();
    const l = await saveWeekList(db, draft(), now); // saved before the list bank: no fill-ins
    const stored = (await allWeekLists(db))[0]!;
    const answered = { last: { fit: { at: 1, correct: true } }, rightDays: ['2026-10-19'] };
    await db.put('weekLists', { ...stored, items: stored.items.map((i) => (i.text === '跑' ? { ...i, ...answered } : i)), check: { at: 2, day: '2026-10-21', results: { [stored.items[0]!.wordId]: { form: 'read', correct: true } }, done: false } } as typeof stored);
    const rows = [
      { wordId: '跑', sentence: '他＿得很快。', source: 'list' as const, wrong: ['书包', '老师', '电视'] as [string, string, string], outside: ['书包', '老师', '电视'] },
      { wordId: '闪闪亮', sentence: '星星＿的。', source: 'tatoeba' as const, ref: 42, wrong: ['红通通', '绿油油', '白花花'] as [string, string, string] },
    ];
    await saveWeekList(db, draft({ fits: rows }), now); // the same name and days: the same list
    const after = await allWeekLists(db);
    expect(after).toHaveLength(1);
    expect(after[0]!.id).toBe(l.id);
    expect(after[0]!.items.find((i) => i.text === '跑')).toMatchObject(answered);
    expect(after[0]!.check?.results[stored.items[0]!.wordId]).toEqual({ form: 'read', correct: true });
    expect(after[0]!.fits.map((f) => [f.source, f.ref, f.outside?.length])).toEqual([['list', undefined, 3], ['tatoeba', 42, undefined]]);
  });
  it('a fit row keyed by text gets the word id', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('跑')]);
    const l = await saveWeekList(db, draft({ fits: [{ wordId: '跑', sentence: '他＿得很快。', source: 'parent', wrong: ['a', 'b', 'c'] }] }), now);
    expect(l.fits[0]!.wordId).toBe('b:跑');
  });
  it('a ladder word is referenced by its w: id and adds no parent word', async () => {
    const db = await freshDb();
    const lw = ladderWords()[0]!;
    const l = await saveWeekList(db, draft({ items: [{ text: lw.text, from: 'grid' }] }), now);
    expect(l.items[0]!.wordId).toBe(`w:${lw.text}`);
    expect(await allWords(db)).toEqual([]);
  });
  it('two saves at once (a double tap) make one list and each new word once', async () => {
    const db = await freshDb();
    await Promise.all([saveWeekList(db, draft(), now), saveWeekList(db, draft(), now)]);
    expect((await allWords(db)).filter((x) => x.text === '闪闪亮')).toHaveLength(1);
    expect(await allWeekLists(db)).toHaveLength(1);
  });
  it('the same text twice in one draft is one word and one item', async () => {
    const db = await freshDb();
    const l = await saveWeekList(db, draft({ items: [{ text: '闪闪亮', from: 'grid' }, { text: '闪闪亮', from: 'pair' }] }), now);
    expect(await allWords(db)).toHaveLength(1);
    expect(l.items).toHaveLength(1);
  });
  it('a meaning the parent cleared is dropped, not refilled from the glossary', async () => {
    const db = await freshDb();
    await saveWeekList(db, draft({ items: [{ text: G1!, from: 'grid', meaning: '' }, { text: G2!, from: 'grid', meaning: ' greens ' }] }), now);
    const words = await allWords(db);
    expect('meaning' in words.find((x) => x.text === G1)!).toBe(false);
    expect(words.find((x) => x.text === G2)!.meaning).toBe('greens');
  });
  it('a new word with no meaning given keeps the glossary one', async () => {
    const db = await freshDb();
    await saveWeekList(db, draft({ items: [{ text: G1!, from: 'grid' }] }), now);
    expect((await allWords(db))[0]!.meaning).toBe(glossFor(G1!));
  });
  it('the same pair twice is saved once', async () => {
    const db = await freshDb();
    const pair = { left: '吃', right: '面包', wrong: ['帽子', '风筝', '皮球'] as [string, string, string] };
    expect((await saveWeekList(db, draft({ pairs: [pair, { ...pair }] }), now)).pairs).toHaveLength(1);
  });
});
