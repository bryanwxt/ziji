// The parent's readiness line on Today (weekly list spec 2026-10-17 §8.3), with a way to Content → This week. Invented fixtures:
// 风筝, 蝌蚪, 螳螂.
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { previewPlan } from '../session/record';
import { getSettings, putCards, putWeekList, putWords } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { WeekList } from '../types';
import { Dashboard } from './Dashboard';

const list: WeekList = { id: 'wl:d', name: '第九课', createdAt: 0, readyBy: '2026-11-04', homeworkDue: '2026-11-06',
  items: [{ wordId: 'p:风筝', text: '风筝', from: 'grid', addedStatus: 'new' }, { wordId: 'p:蝌蚪', text: '蝌蚪', from: 'grid', addedStatus: 'new', last: { read: { at: 1, correct: false } } }, { wordId: 'p:螳螂', text: '螳螂', from: 'grid', addedStatus: 'known', last: { read: { at: 1, correct: true } } }],
  pairs: [], fits: [] };
const MON = new Date(2026, 10, 2, 20);

async function app(withList = true) {
  const a = await makeAppData({ now: () => MON });
  await putWords(a.db, ['风筝', '蝌蚪', '螳螂'].map((t) => makeWord(t, { id: `p:${t}`, source: 'parent' })));
  await putCards(a.db, [makeCard('p:螳螂', 'recognise', new Date(2026, 10, 2, 6), true), makeCard('p:蝌蚪', 'recognise', new Date(2026, 10, 20), true)]);
  if (withList) await putWeekList(a.db, list);
  return a;
}

describe('Dashboard: the weekly list readiness line', () => {
  it('names the list and its days, how many are ready, reviews due today and the weak ones, worst first; opens This week', async () => {
    const a = await app();
    const onNavigate = vi.fn();
    renderWithApp(<Dashboard onNavigate={onNavigate} />, a);
    const box = await waitFor(() => { const el = document.querySelector('.dash__week'); expect(el).toBeTruthy(); return el!; });
    expect(box.textContent).toContain('第九课 · ready by Wed 4 Nov · homework Fri 6 Nov');
    expect(box.textContent).toMatch(/List 1\/3 ready · (class on track · |class: \d+ left by Fri · |behind class — see Progress · )?catch-up slower this week · 1 reviews due — weak: 蝌蚪, 风筝/);
    fireEvent.click(screen.getByText('Open 本周词语'));
    expect(onNavigate).toHaveBeenCalledWith('week');
  });
  it("when Try this already names the list's weak words, the line leaves them out (the other lists keep theirs)", async () => {
    const a = await app();
    await putWeekList(a.db, { ...list, id: 'wl:e', name: '第十课' });
    renderWithApp(<Dashboard onNavigate={vi.fn()} quietWeak="第九课" />, a);
    await waitFor(() => expect(document.querySelectorAll('.dash__week')).toHaveLength(2));
    const boxes = [...document.querySelectorAll('.dash__week')];
    const nine = boxes.find((b) => b.textContent!.startsWith('第九课'));
    const ten = boxes.find((b) => b.textContent!.startsWith('第十课'));
    expect(nine!.textContent).toContain('reviews due');
    expect(nine!.textContent).not.toContain('weak:');
    expect(ten!.textContent).toContain('— weak: 蝌蚪, 风筝');
  });
  it('no list, no line', async () => {
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, await app(false));
    await screen.findByText('Day streak');
    expect(document.querySelector('.dash__week')).toBeNull();
  });
  it("the class shortfall comes from today's plan, worked out without writing anything", async () => {
    const a = await app();
    const before = await getSettings(a.db);
    const plan = await previewPlan(a.db, MON);
    expect(typeof plan.classShort).toBe('number');
    expect((await getSettings(a.db)).pace).toEqual(before.pace);
  });
});
