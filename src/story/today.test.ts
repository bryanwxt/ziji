// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { freshDb } from '../test/fixtures';
import { addReviewLog } from '../store/repo';
import { wordsPractisedToday } from './today';
import type { Grade } from 'ts-fsrs';

const now = new Date('2026-10-07T18:00:00');
const log = (wordId: string, at: Date) => ({ cardId: `${wordId}:hear`, wordId, kind: 'hear' as const, at: at.getTime(), rating: 3 as Grade, correct: true, responseMs: 1500 });

describe("today's practised words (spec 3c §4 [rescued])", () => {
  it('distinct, first practised first, today only, at most 12', async () => {
    const db = await freshDb();
    await addReviewLog(db, log('b:门', new Date('2026-10-06T18:00:00'))); // yesterday
    await addReviewLog(db, log('b:大', new Date('2026-10-07T09:00:00')));
    await addReviewLog(db, log('w:电梯', new Date('2026-10-07T09:01:00')));
    await addReviewLog(db, log('b:大', new Date('2026-10-07T09:02:00')));
    expect(await wordsPractisedToday(db, now)).toEqual(['b:大', 'w:电梯']);
    for (let i = 0; i < 20; i++) await addReviewLog(db, log(`b:${i}`, new Date(`2026-10-07T10:${String(i).padStart(2, '0')}:00`)));
    expect(await wordsPractisedToday(db, now)).toHaveLength(12);
  });
});
