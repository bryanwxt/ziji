// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import { getCard, logsSince, putCards, putWords } from '../store/repo';
import { newCard } from '../srs/scheduler';
import { SLOW_ANSWER_MS } from '../srs/scheduler';
import { LISTEN_MS, openMissingRungs, recordUnderstand } from './record';

const has = { v: true };
vi.mock('../content/understand', () => ({ sentencesFor: (t: string) => (t === '猫' && has.v ? [{ zh: '我家有一只猫。', en: 'We have a cat.' }, { zh: '猫在睡觉。', en: 'The cat is sleeping.' }] : []) }));

const cat = makeWord('猫', { meaning: 'cat' });
const day1 = new Date('2026-10-06T09:00:00');
const day2 = new Date('2026-10-07T09:00:00');
const seed = async () => {
  const db = await freshDb();
  await putWords(db, [cat]);
  await putCards(db, [
    { id: `${cat.id}:hear`, wordId: cat.id, kind: 'hear', fsrs: newCard(day1), passed: day1.getTime() - 86_400_000 },
    { id: `${cat.id}:understand`, wordId: cat.id, kind: 'understand', fsrs: newCard(day1) },
  ]);
  return db;
};

describe('the Understand rung (plan 2b)', () => {
  it("two days' right first Understand answers pass it and open Read", async () => {
    has.v = true;
    const db = await seed();
    await recordUnderstand(db, cat.id, { correct: true, responseMs: 3000 }, day1);
    await recordUnderstand(db, cat.id, { correct: true, responseMs: 3000 }, day2);
    expect((await getCard(db, `${cat.id}:understand`))!.passed).toBeTruthy();
    expect(await getCard(db, `${cat.id}:recognise`)).toBeDefined();
  });
  it('an Understand card that can no longer be asked lets Read open (Review Focus 1)', async () => {
    has.v = false;
    const db = await seed();
    await openMissingRungs(db, day1);
    expect(await getCard(db, `${cat.id}:recognise`)).toBeDefined();
    has.v = true;
  });
  it('the rating allows for listening time; the log keeps the real time', async () => {
    has.v = true;
    const db = await seed();
    const ms = SLOW_ANSWER_MS + LISTEN_MS - 500;
    await recordUnderstand(db, cat.id, { correct: true, responseMs: ms }, day1);
    const [l] = (await logsSince(db, 0)).filter((x) => x.kind === 'understand');
    expect(l!.rating).toBe(3); // Good, not Hard
    expect(l!.responseMs).toBe(ms);
  });
});
