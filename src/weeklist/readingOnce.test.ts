// @vitest-environment node
// A list word's reading card is rated once in a lesson (final review 2026-10-17): when 练一练's reserved read item comes before
// the word's own due-revision item (72 of 200 seeds), the second answer rates nothing.
import { describe, expect, it } from 'vitest';
import { recordRecognitionOnce } from '../session/record';
import { getCard, logsSince, putCards } from '../store/repo';
import { freshDb, makeCard } from '../test/fixtures';

const fri = new Date(2026, 10, 6, 9);
describe('recordRecognitionOnce', () => {
  it('the reserved item first, then the due item: one rating; a miss on the second brings the card forward', async () => {
    const db = await freshDb();
    await putCards(db, [makeCard('b:炒', 'recognise', new Date(2026, 10, 6), true)]);
    const first = await recordRecognitionOnce(db, 'b:炒', { correct: true, responseMs: 2000 }, fri); // the reserved item
    expect(first).toBeTruthy();
    const due = (await getCard(db, 'b:炒:recognise'))!.fsrs.due;
    const second = await recordRecognitionOnce(db, 'b:炒', { correct: false, responseMs: 2000 }, new Date(fri.getTime() + 60_000)); // its due item
    expect(second).toBeNull();
    expect((await logsSince(db, 0)).filter((l) => l.kind === 'recognise')).toHaveLength(1);
    expect((await getCard(db, 'b:炒:recognise'))!.fsrs.due.getTime()).toBeLessThanOrEqual(due.getTime());
  });
  it('the day\'s first answer rates it as recordRecognition does', async () => {
    const db = await freshDb();
    await putCards(db, [makeCard('b:炒', 'recognise', new Date(2026, 10, 6), true)]);
    expect(await recordRecognitionOnce(db, 'b:炒', { correct: true, responseMs: 2000 }, fri)).toBeTruthy();
    expect((await logsSince(db, 0)).filter((l) => l.kind === 'recognise')).toHaveLength(1);
  });
});
