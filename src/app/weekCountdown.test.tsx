// The weekly list on Home (weekly list spec 2026-10-17 §9, §8.1): one gentle line with pinyin; on the ready-by day the check's own
// card with its start; nothing after homework day. Invented fixtures: 风筝, 小河.
import { fireEvent, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { putWeekList, putWords } from '../store/repo';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { WeekList } from '../types';
import { WeekCountdown } from './WeekCountdown';

const list: WeekList = { id: 'wl:h', name: 'L', createdAt: 0, readyBy: '2026-11-04', homeworkDue: '2026-11-06',
  items: [{ wordId: 'p:风筝', text: '风筝', from: 'grid', addedStatus: 'new' }, { wordId: 'p:小河', text: '小河', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [] };
async function show(day: Date, l: WeekList = list) {
  const app = await makeAppData({ now: () => day });
  await putWords(app.db, [makeWord('风筝', { id: 'p:风筝', source: 'parent' }), makeWord('小河', { id: 'p:小河', source: 'parent' })]);
  await putWeekList(app.db, l);
  return { app, ...renderWithApp(<WeekCountdown />, app) };
}

describe('WeekCountdown', () => {
  it('before ready-by: the line with pinyin, and no check card', async () => {
    const { container } = await show(new Date(2026, 10, 2, 9));
    await waitFor(() => expect(container.querySelector('.week-countdown')).toBeTruthy());
    const label = container.querySelector('.week-countdown .label')!;
    expect(label.getAttribute('data-zh')).toBe('星期三前：还有 2 个词');
    expect(label.getAttribute('data-py')).toContain('xīng qī sān');
    expect(container.querySelector('.week-check')).toBeNull();
  });
  it('on the ready-by day: the 考考自己 card, whose start opens the check', async () => {
    const { app, container } = await show(new Date(2026, 10, 4, 9));
    await waitFor(() => expect(container.querySelector('.week-check')).toBeTruthy());
    expect(container.querySelector('.week-check .label')!.getAttribute('data-zh')).toBe('本周词语'); // 「本周词语 · 考考自己」: never a second 开始 beside the path's
    expect(container.querySelector('.week-check button .label')!.getAttribute('data-zh')).toBe('考考自己');
    fireEvent.click(container.querySelector('.week-check button')!);
    expect(app.go).toHaveBeenCalledWith({ name: 'check', listId: 'wl:h' });
  });
  it('after the check on its day: the line, no card', async () => {
    const done = { ...list, check: { at: 1, day: '2026-11-04', done: true, results: { 'p:风筝': { form: 'read' as const, correct: true }, 'p:小河': { form: 'read' as const, correct: false } } } };
    const { container } = await show(new Date(2026, 10, 4, 19), done);
    await waitFor(() => expect(container.querySelector('.week-countdown')).toBeTruthy());
    expect(container.querySelector('.week-countdown .label')!.getAttribute('data-zh')).toBe('还要再看 1 个词');
    expect(container.querySelector('.week-check')).toBeNull();
  });
  it('after homework day: nothing', async () => {
    const { container } = await show(new Date(2026, 10, 7, 9));
    await new Promise((r) => setTimeout(r, 50));
    expect(container.innerHTML).toBe('');
  });
});

describe('Home with a weekly list', () => {
  it('shows the countdown under the reward card, inside the cards', async () => {
    const { HomeScreen } = await import('./HomeScreen');
    const app = await makeAppData({ now: () => new Date(2026, 10, 2, 9) });
    await putWords(app.db, [makeWord('风筝', { id: 'p:风筝', source: 'parent' }), makeWord('小河', { id: 'p:小河', source: 'parent' })]);
    await putWeekList(app.db, list);
    const { container } = renderWithApp(<HomeScreen />, app);
    await waitFor(() => expect(container.querySelector('.home__cards .reward-card + .week-countdown')).toBeTruthy());
    expect(container.querySelector('.wotd')).toBeNull(); // the word of the day makes room for it
  });
  it('the week strip shows yesterday\'s 考考自己 as an active day, not 休 (parent ruling 2026-10-17)', async () => {
    const { HomeScreen } = await import('./HomeScreen');
    const app = await makeAppData({ now: () => new Date(2026, 10, 5, 9) }); // Thursday; the check was Wednesday 4 Nov
    await putWords(app.db, [makeWord('风筝', { id: 'p:风筝', source: 'parent' }), makeWord('小河', { id: 'p:小河', source: 'parent' })]);
    await putWeekList(app.db, { ...list, check: { at: 0, day: '2026-11-04', done: true, results: { 'p:风筝': { form: 'read', correct: true } } } });
    const { container } = renderWithApp(<HomeScreen />, app);
    await waitFor(() => expect(container.querySelectorAll('.week__day').length).toBe(7));
    const wed = container.querySelectorAll('.week__day')[2]!;
    expect(wed.classList.contains('is-done')).toBe(true);
    expect(wed.classList.contains('is-rest')).toBe(false);
  });
});
