import { describe, expect, it } from 'vitest';
import { chengyuOf } from '../content/chengyu';
import { allWords, putWords } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { addSchoolIdioms, parseIdiomLines } from './schoolIdioms';

describe('school 成语 typed by the parent (spec 2026-10-05 §4)', () => {
  it('reads one 成语 a line, with an optional = meaning', () => {
    expect(parseIdiomLines('一心一意 = with all your heart\n五颜六色\n\nabc\n心花怒放 ＝ wild with joy')).toEqual({
      idioms: [{ text: '一心一意', meaning: 'with all your heart' }, { text: '五颜六色' }, { text: '心花怒放', meaning: 'wild with joy' }],
      rejected: ['abc'],
    });
  });
  it('saves them as school words tagged 成语, first in line, not for writing', async () => {
    const db = await freshDb();
    const r = await addSchoolIdioms(db, '五颜六色\n心花怒放 = wild with joy', new Date(2026, 9, 6));
    expect(r.added).toEqual(['五颜六色', '心花怒放']);
    const ws = await allWords(db);
    const colours = ws.find((w) => w.text === '五颜六色')!;
    expect(colours).toMatchObject({ source: 'parent', tags: ['成语'], writeable: false, paused: false, listName: '成语', pinyin: 'wǔ yán liù sè' });
    expect(colours.meaning).toBe(chengyuOf('五颜六色')!.meaning);
    expect(colours.listedAt!).toBeLessThan(0); // ahead of older lists, as 听写 mistakes are
    expect(ws.find((w) => w.text === '心花怒放')!.meaning).toBe('wild with joy');
  });
  it('a word he already has gets the 成语 tag (and the meaning if it had none), not a copy', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('一心一意', { id: 'p:1', source: 'parent', listName: '听写 3' })]);
    const r = await addSchoolIdioms(db, '一心一意 = with one heart', new Date(2026, 9, 6));
    expect(r).toMatchObject({ added: [], tagged: ['一心一意'] });
    const ws = await allWords(db);
    expect(ws).toHaveLength(1);
    expect(ws[0]).toMatchObject({ tags: ['成语'], meaning: 'with one heart', listName: '听写 3' });
  });
});
