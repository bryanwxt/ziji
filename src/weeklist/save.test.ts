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
