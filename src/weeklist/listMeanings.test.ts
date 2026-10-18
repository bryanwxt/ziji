// @vitest-environment node
// A weekly list saved without English (parent 2026-10-18: "共用 meaning is not showing"): the list words still missing one,
// filled once from the kid glosses on the next open, and from the dictionary when the parent taps Fill.
import { describe, expect, it } from 'vitest';
import { kidGloss } from '../content/kidGloss';
import { openAppDb } from '../store/db';
import { allWords, getSettings, putWeekList, putWords } from '../store/repo';
import { makeWord } from '../test/fixtures';
import type { WeekList, Word } from '../types';
import { fillListMeaningsOnce, fillMeanings, missingEnglish } from './listMeanings';

const NOW = new Date(2026, 9, 18, 9);
const parent = (text: string, meaning?: string): Word => ({ ...makeWord(text, { id: `p:${text}`, source: 'parent', level: null, rank: null, writeable: false }), ...(meaning ? { meaning } : {}) });
const list = (id: string, words: Word[], over: Partial<WeekList> = {}): WeekList => ({
  id, name: 'L', createdAt: 1, readyBy: '2026-10-20', homeworkDue: '2026-10-22',
  items: words.map((w) => ({ wordId: w.id, text: w.text, from: 'grid' as const, addedStatus: 'new' as const })), pairs: [], fits: [], ...over,
});

describe('missingEnglish: an active list’s parent words with no English', () => {
  it('only parent words without a meaning, on lists still open, once each', () => {
    const words = [parent('共用'), parent('双方', 'both sides'), makeWord('以后'), parent('扁豆'), parent('旧词')];
    const lists = [list('a', words.slice(0, 4)), list('b', [words[0]!]), list('old', [words[4]!], { closedAt: 5 })];
    expect(missingEnglish(lists, words, NOW).map((w) => w.text)).toEqual(['共用', '扁豆']);
  });
});

describe('fillListMeaningsOnce: on the next open, from the kid glosses (bundled)', () => {
  it('fills a missing meaning from its kid gloss, leaves the rest, and runs once', async () => {
    const db = await openAppDb(`test-${crypto.randomUUID()}`);
    const words = [parent('共用'), parent('双方', 'both sides'), parent('嗯嗯嗯')];
    await putWords(db, words);
    await putWeekList(db, list('a', words));
    expect(await fillListMeaningsOnce(db, NOW)).toBe(1);
    const by = new Map((await allWords(db)).map((w) => [w.text, w]));
    expect(by.get('共用')!.meaning).toBe(kidGloss('共用'));
    expect(by.get('双方')!.meaning).toBe('both sides');
    expect(by.get('嗯嗯嗯')!.meaning).toBeUndefined();
    expect((await getSettings(db)).listMeaningsFilled).toBeTruthy();
    await putWords(db, [parent('共用')]); // cleared again by the parent: never refilled
    expect(await fillListMeaningsOnce(db, NOW)).toBe(0);
    expect((await allWords(db)).find((w) => w.text === '共用')!.meaning).toBeUndefined();
  });
});

describe('fillMeanings: the parent’s one tap, from the dictionary', () => {
  it('writes each word’s English that the map has, and says how many', async () => {
    const db = await openAppDb(`test-${crypto.randomUUID()}`);
    const words = [parent('扁豆'), parent('嗯嗯嗯')];
    await putWords(db, words);
    expect(await fillMeanings(db, words, new Map([['扁豆', 'hyacinth bean']]))).toBe(1);
    const by = new Map((await allWords(db)).map((w) => [w.text, w]));
    expect(by.get('扁豆')!.meaning).toBe('hyacinth bean');
    expect(by.get('嗯嗯嗯')!.meaning).toBeUndefined();
  });
});
