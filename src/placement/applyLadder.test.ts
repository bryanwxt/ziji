// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import { allCards, putWords } from '../store/repo';
import { applyPlacement } from './apply';

const now = new Date('2026-10-06T09:00:00');

describe('placement on the ladder (spec 2026-10-06 §3.5–3.6)', () => {
  it('words placed as read are passed for reading and get listening checks', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], missed: [], reading: 0, understanding: -1 }, now);
    const cards = await allCards(db);
    expect(cards.filter((c) => c.kind === 'recognise').every((c) => c.passed === now.getTime())).toBe(true);
    expect(cards.filter((c) => c.kind === 'hear').map((c) => c.wordId).sort()).toEqual(['b:大', 'b:门']);
  });
  it('a re-run that no longer places a word drops its untouched listening check too', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], missed: [], reading: 0, understanding: -1 }, now);
    await applyPlacement(db, { readingIds: ['b:门'], understandingIds: [], missed: [], reading: 0, understanding: -1 }, now);
    expect((await allCards(db)).filter((c) => c.kind === 'hear').map((c) => c.wordId)).toEqual(['b:门']);
  });
});
