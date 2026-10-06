// @vitest-environment node
import { nextRung, RUNG_CARD } from '../ladder/rungs';
import { describe, expect, it } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import { allCards, getCard, putWords } from '../store/repo';
import { recordHear, recordMeaning, recordRecognition } from './record';
import { ladderWords } from '../content/ladder';
import { startOfLocalDay } from '../lib/date';

const day = (d: string, h = 9) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`);
const right = { correct: true, responseMs: 2500 };
const mén = () => makeWord('门', { pinyin: 'mén', examples: [{ text: '门口', pinyin: 'mén kǒu' }] });

describe('the start of a local day', () => {
  it('midnight of the same day', () => {
    expect(startOfLocalDay(day('2026-10-02', 15)).getTime()).toBe(new Date('2026-10-02T00:00:00').getTime());
  });
});

describe('recording a rung answer (spec 2026-10-06 §3.2)', () => {
  it('a hear card passes on its second right day and opens the reading card, due the next morning', async () => {
    const db = await freshDb();
    await putWords(db, [mén()]);
    await recordHear(db, 'b:门', right, day('2026-10-01'));
    expect((await getCard(db, 'b:门:hear'))?.passed).toBeUndefined();
    await recordHear(db, 'b:门', right, day('2026-10-02'));
    expect((await getCard(db, 'b:门:hear'))?.passed).toBe(day('2026-10-02').getTime());
    const next = await getCard(db, `b:门:${RUNG_CARD[nextRung(mén(), 'hear')!]}`); // Understand when 门 has sentences (plan 2b), else Read
    expect(next?.fsrs.due.getTime()).toBe(new Date('2026-10-03T00:00:00').getTime());
  });
  it('reading passed opens Use only for a word that can be used in a question', async () => {
    const db = await freshDb();
    await putWords(db, [mén(), makeWord('口', { pinyin: 'kǒu', examples: [] })]);
    for (const id of ['b:门', 'b:口']) {
      await recordRecognition(db, id, right, day('2026-10-01'));
      await recordRecognition(db, id, right, day('2026-10-02'));
    }
    const ids = (await allCards(db)).map((c) => c.id).sort();
    expect(ids).toContain('b:门:meaning');
    expect(ids).not.toContain('b:口:meaning');
  });
  it('an opened card never replaces one he already has', async () => {
    const db = await freshDb();
    await putWords(db, [mén()]);
    await recordRecognition(db, 'b:门', right, day('2026-09-20')); // a reading card from before the ladder
    const before = (await getCard(db, 'b:门:recognise'))!.fsrs;
    await recordHear(db, 'b:门', right, day('2026-10-01'));
    await recordHear(db, 'b:门', right, day('2026-10-02'));
    expect((await getCard(db, 'b:门:recognise'))!.fsrs).toEqual(before);
  });
  it('ladder words (not stored) open their rungs too', async () => {
    const db = await freshDb();
    const w = ladderWords()[0]!;
    await recordHear(db, w.id, right, day('2026-10-01'));
    await recordHear(db, w.id, right, day('2026-10-02'));
    expect(await getCard(db, `${w.id}:${RUNG_CARD[nextRung(w, 'hear')!]}`)).toBeDefined();
  });
  it('a meaning answer passes the Use rung', async () => {
    const db = await freshDb();
    await putWords(db, [mén()]);
    await recordMeaning(db, 'b:门', right, day('2026-10-01'));
    await recordMeaning(db, 'b:门', right, day('2026-10-02'));
    expect((await getCard(db, 'b:门:meaning'))?.passed).toBe(day('2026-10-02').getTime());
  });
});
