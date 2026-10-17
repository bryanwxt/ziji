// @vitest-environment node
// A list 选词填空 or 搭配 and a round's own meaning question never rate one meaning card twice in a lesson (fix round 2026-10-17).
import { describe, expect, it } from 'vitest';
import { recordMeaningOnce, recordUse } from '../session/record';
import { getCard, logsSince, putCards } from '../store/repo';
import { freshDb, makeCard } from '../test/fixtures';

const fri = new Date(2026, 10, 6, 9);
describe('recordMeaningOnce', () => {
  it('after a list fill-in rated the card today, the round\'s meaning question rates nothing; a miss brings it forward', async () => {
    const db = await freshDb();
    await putCards(db, [makeCard('b:炒', 'meaning', new Date(2026, 10, 6), true)]);
    await recordUse(db, 'b:炒', true, fri, 4000);
    const due = (await getCard(db, 'b:炒:meaning'))!.fsrs.due;
    await recordMeaningOnce(db, 'b:炒', { correct: false, responseMs: 2000 }, new Date(fri.getTime() + 60_000));
    expect((await logsSince(db, 0)).filter((l) => l.kind === 'meaning')).toHaveLength(1);
    expect((await getCard(db, 'b:炒:meaning'))!.fsrs.due.getTime()).toBeLessThanOrEqual(due.getTime());
  });
  it('the day\'s first answer rates it as recordMeaning does', async () => {
    const db = await freshDb();
    await putCards(db, [makeCard('b:炒', 'meaning', new Date(2026, 10, 6), true)]);
    await recordMeaningOnce(db, 'b:炒', { correct: true, responseMs: 2000 }, fri);
    expect((await logsSince(db, 0)).filter((l) => l.kind === 'meaning')).toHaveLength(1);
  });
});
