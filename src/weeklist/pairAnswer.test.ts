// @vitest-environment node
// A 搭配 or board answer notes the pair and both its halves on that list (weekly list spec §7.5, §8.3).
import { describe, expect, it } from 'vitest';
import { allWeekLists, putWeekList } from '../store/repo';
import { freshDb } from '../test/fixtures';
import type { WeekList } from '../types';
import { noteListPairAnswer } from './answers';

const list: WeekList = { id: 'wl:d', name: 'D', createdAt: 0, readyBy: '2026-11-11', homeworkDue: '2026-11-13',
  items: [{ wordId: 'b:放', text: '放', from: 'both', addedStatus: 'new' }, { wordId: 'p:风筝', text: '风筝', from: 'pair', addedStatus: 'new' }, { wordId: 'b:踢', text: '踢', from: 'both', addedStatus: 'new' }],
  pairs: [{ left: '放', right: '风筝', wrong: ['毽子', '青菜', '书包'] }, { left: '踢', right: '毽子', wrong: ['青菜', '风筝', '书包'] }], fits: [] };

describe('noteListPairAnswer', () => {
  it('marks the pair and each half that is an item, as 搭配; returns the left half\'s word', async () => {
    const db = await freshDb();
    await putWeekList(db, list);
    const at = new Date(2026, 10, 9, 9);
    expect(await noteListPairAnswer(db, 'wl:d', { left: '放', right: '风筝' }, false, at)).toBe('b:放');
    const l = (await allWeekLists(db))[0]!;
    expect(l.pairs[0]!.last).toEqual({ at: at.getTime(), correct: false });
    expect(l.items.map((i) => i.last?.dapei?.correct)).toEqual([false, false, undefined]);
    expect(l.pairs[1]!.last).toBeUndefined();
  });
});
