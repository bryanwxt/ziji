// src/weeklist/save.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ladderWords } from '../content/ladder';
import { allWeekLists, allWords, putWords } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { saveWeekList, type ApprovedDraft } from './save';

const now = new Date(2026, 9, 19, 9);
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
});
