// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createEmptyCard } from 'ts-fsrs';
import { freshDb, makeWord } from '../test/fixtures';
import { allCards, getSettings, putCards, putWords } from '../store/repo';
import { seededKnownCard } from '../srs/scheduler';
import { HEAR_CHECKS_PER_DAY, migrateToLadder } from './migrate';
import type { CardRecord } from '../types';

const now = new Date('2026-10-06T09:00:00');
// cards as an install from before the ladder has them: earned, never marked passed
const earned = (wordId: string, kind: CardRecord['kind']): CardRecord => ({ id: `${wordId}:${kind}`, wordId, kind, fsrs: seededKnownCard(now, 20) });
const learning = (wordId: string, kind: CardRecord['kind']): CardRecord => ({ id: `${wordId}:${kind}`, wordId, kind, fsrs: { ...createEmptyCard(now), reps: 1, state: 1 } });

async function setup(n = 20) {
  const db = await freshDb();
  const words = Array.from({ length: n }, (_, i) => makeWord(`字${i}`, { rank: i, meaning: `meaning ${i}` }));
  await putWords(db, words);
  await putCards(db, [...words.map((w) => earned(w.id, 'recognise')), earned('b:字0', 'meaning'), learning('b:字1', 'write')]);
  return db;
}

describe('moving his progress onto the ladder (spec 2026-10-06 §3.6)', () => {
  it('earned reading and meaning cards are passed; nothing about their memory changes', async () => {
    const db = await setup();
    const before = new Map((await allCards(db)).map((c) => [c.id, c.fsrs]));
    expect(await migrateToLadder(db, now)).toBe(true);
    const after = await allCards(db);
    for (const c of after) if (before.has(c.id)) expect(c.fsrs, c.id).toEqual(before.get(c.id));
    expect(after.find((c) => c.id === 'b:字0:recognise')?.passed).toBe(now.getTime());
    expect(after.find((c) => c.id === 'b:字0:meaning')?.passed).toBe(now.getTime());
    expect(after.find((c) => c.id === 'b:字1:write')?.passed).toBeUndefined(); // learning, not earned: never passed
  });
  it('words he reads get a listening check, at most 15 a day, from tomorrow, in his order', async () => {
    const db = await setup(20);
    await migrateToLadder(db, now);
    const hear = (await allCards(db)).filter((c) => c.kind === 'hear').sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());
    expect(hear).toHaveLength(20);
    const days = new Map<string, number>();
    for (const c of hear) days.set(c.fsrs.due.toDateString(), (days.get(c.fsrs.due.toDateString()) ?? 0) + 1);
    expect(Math.max(...days.values())).toBeLessThanOrEqual(HEAR_CHECKS_PER_DAY);
    expect(hear[0]!.wordId).toBe('b:字0');
    expect(hear[0]!.fsrs.due.getTime()).toBeGreaterThan(now.getTime());
  });
  it('runs once; a second run changes nothing', async () => {
    const db = await setup();
    await migrateToLadder(db, now);
    const once = await allCards(db);
    expect(await migrateToLadder(db, now)).toBe(false);
    expect(await allCards(db)).toEqual(once);
    expect((await getSettings(db)).ladderMigrated).toBe(true);
  });
  it('a hear card he already has is never replaced', async () => {
    const db = await setup(2);
    const mine: CardRecord = { ...learning('b:字0', 'hear'), fsrs: { ...createEmptyCard(new Date('2026-10-30')), due: new Date('2026-10-30') } };
    await putCards(db, [mine]);
    await migrateToLadder(db, now);
    expect((await allCards(db)).find((c) => c.id === 'b:字0:hear')!.fsrs.due.toISOString()).toBe(new Date('2026-10-30').toISOString());
  });
});
