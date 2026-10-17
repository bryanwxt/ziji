// @vitest-environment node
// A lesson reads its weekly lists once (final review 2026-10-17): while SessionScreen holds them, rating a card reads no lists.
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as repo from '../store/repo';
import { recordRecognition, setLessonLists } from '../session/record';
import { freshDb, makeCard } from '../test/fixtures';
import type { WeekList } from '../types';

const mon = new Date(2026, 9, 19, 9);
const list: WeekList = { id: 'wl:l', name: 'L', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23', items: [{ wordId: 'b:炒', text: '炒', from: 'grid', addedStatus: 'known' }], pairs: [], fits: [] };

describe('the lesson\'s lists', () => {
  afterEach(() => { setLessonLists(null); vi.restoreAllMocks(); });
  it('rating uses the lesson\'s lists, read once, and still pins the card to ready-by', async () => {
    const db = await freshDb();
    await repo.putCards(db, [makeCard('b:炒', 'recognise', mon, true)]);
    setLessonLists([list]);
    const read = vi.spyOn(repo, 'allWeekLists');
    const card = await recordRecognition(db, 'b:炒', { correct: true, responseMs: 2000 }, mon);
    expect(read).not.toHaveBeenCalled();
    expect(card.fsrs.due.getTime()).toBeLessThanOrEqual(new Date(2026, 9, 21).getTime()); // pinned by the lesson's list
  });
  it('outside a lesson, it reads them as before', async () => {
    const db = await freshDb();
    await repo.putCards(db, [makeCard('b:炒', 'recognise', mon, true)]);
    const read = vi.spyOn(repo, 'allWeekLists');
    await recordRecognition(db, 'b:炒', { correct: true, responseMs: 2000 }, mon);
    expect(read).toHaveBeenCalled();
  });
});
