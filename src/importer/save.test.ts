import { describe, expect, it } from 'vitest';
import { allWords, listParentPassages, putWords } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { applyImport } from './save';

const draft = {
  title: '第三十课',
  words: [{ text: '保持', known: true }, { text: '安静', known: true }],
  idioms: [{ text: '一模一样', known: true }],
  pairs: [['保持', '安静']] as [string, string][],
  sentences: ['图书馆里要保持安静。', '我们一起去公园。'],
  passages: ['小明和妹妹在公园里玩。他们看见一只小猫。妹妹说：“真可爱！”'],
};

describe('applyImport', () => {
  it('adds the words as a school list, tags 成语, attaches pairings and sentences, and saves the passage', async () => {
    const db = await freshDb();
    const s = await applyImport(db, draft, { listName: '第三十课', writeable: true, now: 1000 });
    const words = await allWords(db);
    const by = (t: string) => words.find((w) => w.text === t)!;
    expect(s).toMatchObject({ added: 3, sentences: 1, passages: 1, pairs: 1 });
    expect(by('保持')).toMatchObject({ listName: '第三十课', pairs: ['安静'], sentences: [{ text: '图书馆里要保持安静。' }] });
    expect(by('安静').pairs).toEqual(['保持']);
    expect(by('一模一样').tags).toEqual(['成语']);
    expect((await listParentPassages(db)).map((p) => p.title)).toEqual(['第三十课 朗读']);
  });
  it('attaches sentences to existing built-in words too, and a second import of the same page adds nothing twice', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('安', { id: 'b:安' })]);
    await applyImport(db, draft, { listName: '第三十课', writeable: true, now: 1000 });
    await applyImport(db, draft, { listName: '第三十课', writeable: true, now: 2000 });
    const words = await allWords(db);
    expect(words.filter((w) => w.text === '保持')).toHaveLength(1);
    expect(words.find((w) => w.text === '保持')!.sentences).toHaveLength(1);
    expect(words.find((w) => w.text === '保持')!.pairs).toEqual(['安静']);
    expect(await listParentPassages(db)).toHaveLength(1);
  });
});
