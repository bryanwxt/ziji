// @vitest-environment node
import { State } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { READINGS_CHANGED_1_12 } from '../content';
import { addReviewLog, allCards, getSettings, logsForCard, putCards } from './repo';
import { freshDb, makeCard } from '../test/fixtures';
import { reopenChangedReadings } from './readingMigration';

const now = new Date(2026, 9, 16, 9);
const earlier = new Date(2026, 9, 1, 9);

describe('cards whose reading changed with content 1.12 (review 2026-10-15)', () => {
  it("reopens the Say and Hear cards of 卜 应 炸 种 钻 抹 仔 觉 勒 — earned at the old reading — keeping their logs and every other card", async () => {
    const db = await freshDb();
    const passed = (id: string, kind: Parameters<typeof makeCard>[1]) => ({ ...makeCard(id, kind, earlier, true), passed: earlier.getTime() });
    await putCards(db, [passed('b:种', 'say'), passed('b:种', 'hear'), passed('b:种', 'recognise'), passed('b:觉', 'hear'), passed('b:大', 'say')]);
    await addReviewLog(db, { cardId: 'b:种:say', wordId: 'b:种', kind: 'say', at: earlier.getTime(), rating: 3, correct: true });
    expect(READINGS_CHANGED_1_12).toEqual([...'卜应炸种钻抹仔觉勒']);
    expect(await reopenChangedReadings(db, now)).toBe(3);
    const byId = new Map((await allCards(db)).map((c) => [c.id, c]));
    for (const id of ['b:种:say', 'b:种:hear', 'b:觉:hear']) {
      expect(byId.get(id)!.fsrs.state, id).toBe(State.New);
      expect(byId.get(id)!.passed, id).toBeUndefined();
      expect(byId.get(id)!.fsrs.due.getTime(), id).toBeLessThanOrEqual(now.getTime());
    }
    expect(byId.get('b:种:recognise')!.passed).toBe(earlier.getTime()); // he still reads it
    expect(byId.get('b:大:say')!.passed).toBe(earlier.getTime());
    expect(await logsForCard(db, 'b:种:say')).toHaveLength(1);
    expect((await getSettings(db)).readingsReopened).toBe('1.12');
  });
  it('runs once: a card he earns again after it is never reopened a second time', async () => {
    const db = await freshDb();
    await putCards(db, [{ ...makeCard('b:种', 'say', earlier, true), passed: earlier.getTime() }]);
    expect(await reopenChangedReadings(db, now)).toBe(1);
    await putCards(db, [{ ...makeCard('b:种', 'say', now, true), passed: now.getTime() }]); // earned again at zhòng
    expect(await reopenChangedReadings(db, new Date(now.getTime() + 86_400_000))).toBe(0);
    expect((await allCards(db))[0]!.passed).toBe(now.getTime());
  });
});
