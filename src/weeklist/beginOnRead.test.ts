// @vitest-environment node
// A list word begins on Read (weekly list spec §6.4): reading is the list's first goal; Hear opens as it does now.
import { describe, expect, it } from 'vitest';
import { beginNewWord } from '../session/record';
import { getCard } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';

const wed = new Date(2026, 10, 4, 9);
describe('beginNewWord for a list word', () => {
  it('grades its reading card, and its hearing card opens tomorrow', async () => {
    const db = await freshDb();
    const w = makeWord('干净', { pinyin: 'gān jìng', meaning: 'clean' });
    const card = await beginNewWord(db, w, 'read', { correct: true, responseMs: 1800 }, wed, { list: true });
    expect(card.id).toBe('b:干净:recognise');
    expect((await getCard(db, 'b:干净:recognise'))!.fsrs.reps).toBe(1);
    expect((await getCard(db, 'b:干净:hear'))!.fsrs.due).toEqual(new Date(2026, 10, 5));
  });
  it('a word not on a list, read with no voice, still grades nothing (as before)', async () => {
    const db = await freshDb();
    const w = makeWord('干净', { pinyin: 'gān jìng', meaning: 'clean' });
    await beginNewWord(db, w, 'read', { correct: true, responseMs: 1800 }, wed);
    expect(await getCard(db, 'b:干净:recognise')).toBeUndefined();
  });
});
