import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { getSettings, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type Settings } from '../types';
import { SettingsPanel } from './SettingsPanel';

const OCT_11 = () => new Date(2026, 9, 11, 9, 0);
/** The panel starts from the app's settings; saves go to the database. */
const appOn = async (over: Partial<Settings>, now = OCT_11) => {
  const app = await makeAppData({ now, settings: { ...DEFAULT_SETTINGS, placementDone: true, ...over } });
  await updateSettings(app.db, over);
  return app;
};
const shown = () => document.getElementById('st-class-now')!.textContent;

describe('Settings: where his class is (spec 2026-10-11 §8)', () => {
  it('shows the estimate; Set keeps the parent\'s lesson with the day it was set; "Use the estimate" goes back', async () => {
    const app = await appOn({ grade: 2, gradeYear: 2026 });
    renderWithApp(<SettingsPanel />, app);
    await waitFor(() => expect(shown()).toBe('Class is on: 二下 第十七课 (估计)'));
    const pickLesson = screen.getByLabelText('Class lesson') as HTMLSelectElement;
    expect([...pickLesson.options].map((o) => o.textContent)).toEqual([...Array.from({ length: 10 }, (_, i) => `二上·${i + 1}`), ...Array.from({ length: 9 }, (_, i) => `二下·${i + 11}`)]);
    expect(pickLesson.value).toBe('35');
    fireEvent.change(pickLesson, { target: { value: '33' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    await waitFor(async () => expect((await getSettings(app.db)).classLesson).toEqual({ term: '二下', lesson: 15, setAt: OCT_11().getTime() }));
    await waitFor(() => expect(shown()).toBe('Class is on: 二下 第十五课 (你在10月11日设定)'));
    fireEvent.click(screen.getByRole('button', { name: 'Use the estimate' }));
    await waitFor(async () => expect((await getSettings(app.db)).classLesson).toBeNull());
    await waitFor(() => expect(shown()).toBe('Class is on: 二下 第十七课 (估计)'));
  });
  it('choosing another school year drops the correction', async () => {
    const app = await appOn({ grade: 2, gradeYear: 2026, classLesson: { term: '二下', lesson: 15, setAt: OCT_11().getTime() } });
    renderWithApp(<SettingsPanel />, app);
    fireEvent.change(await screen.findByLabelText('School year'), { target: { value: '3' } });
    await waitFor(async () => expect(await getSettings(app.db)).toMatchObject({ grade: 3, classLesson: null }));
  });
  it('past the lists (P4) there is no lesson to pick', async () => {
    const app = await appOn({ grade: 4, gradeYear: 2026 });
    renderWithApp(<SettingsPanel />, app);
    await waitFor(() => expect(shown()).toMatch(/^No MOE list for his school year/));
    expect(screen.queryByLabelText('Class lesson')).toBeNull();
  });
  it('past the school calendar (2028) it says the dates are missing, not the list (review focus 1)', async () => {
    const app = await appOn({ grade: 2, gradeYear: 2028 }, () => new Date(2028, 2, 1, 9, 0));
    renderWithApp(<SettingsPanel />, app);
    await waitFor(() => expect(shown()).toMatch(/^No school calendar for 2028 yet/));
    expect(screen.queryByLabelText('Class lesson')).toBeNull();
  });
});
