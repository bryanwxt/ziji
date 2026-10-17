// 本周词语 in the parent area (weekly list spec 2026-10-17 §8.3): the readiness line at the top for each running list, and after
// the check a table of each item, its check answer and where it is now. Invented fixtures: 风筝, 小河, 钓鱼.
import { screen, waitFor, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { putWeekList, putWords } from '../store/repo';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { WeekList } from '../types';
import { WeekPanel } from './WeekPanel';

const base: WeekList = { id: 'wl:p', name: '第九课', createdAt: 0, readyBy: '2026-11-04', homeworkDue: '2026-11-06',
  items: ['风筝', '小河', '钓鱼'].map((t) => ({ wordId: `p:${t}`, text: t, from: 'grid' as const, addedStatus: 'new' as const })), pairs: [], fits: [] };
async function show(l: WeekList, now: Date) {
  const app = await makeAppData({ now: () => now });
  await putWords(app.db, ['风筝', '小河', '钓鱼'].map((t) => makeWord(t, { id: `p:${t}`, source: 'parent' })));
  await putWeekList(app.db, l);
  renderWithApp(<WeekPanel />, app);
  return app;
}

describe('WeekPanel: readiness and the check table', () => {
  it('the readiness line at the top, before the paste box', async () => {
    await show(base, new Date(2026, 10, 2, 9));
    const line = await waitFor(() => { const el = document.querySelector('.week .dash__week'); expect(el).toBeTruthy(); return el!; });
    expect(line.textContent).toContain('第九课 · ready by Wed 4 Nov · homework Fri 6 Nov');
    expect(line.textContent).toMatch(/List 0\/3 ready/);
    expect(line.compareDocumentPosition(document.getElementById('week-paste')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector('.week__results')).toBeNull(); // no check yet
  });
  it("after the check: each item's ✓/✗ and its status now, the ones needing help first", async () => {
    const l: WeekList = { ...base, check: { at: 1, day: '2026-11-04', done: true, results: { 'p:风筝': { form: 'read', correct: true }, 'p:小河': { form: 'read', correct: false } } } };
    await show(l, new Date(2026, 10, 5, 9));
    const table = await screen.findByRole('table', { name: /Check results for 第九课/ });
    const rows = within(table).getAllByRole('row').slice(1).map((r) => [...r.querySelectorAll('td, th')].map((c) => c.textContent));
    expect(rows).toEqual([['小河', '✗ read', 'not yet'], ['钓鱼', 'not asked', 'not yet'], ['风筝', '✓ read', 'solid']]);
    expect(document.querySelector('.week__results summary')!.textContent).toBe('Check: 1 of 2 right · 2 need help');
  });
});
