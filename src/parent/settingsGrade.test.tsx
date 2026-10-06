import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { getSettings, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SettingsPanel } from './SettingsPanel';

describe('the school year in Settings follows the calendar', () => {
  it('shows this year\'s class, and choosing one remembers the year it was chosen', async () => {
    const app = await makeAppData({ now: () => new Date(2027, 1, 1) });
    await updateSettings(app.db, { grade: 2, gradeYear: 2026 });
    renderWithApp(<SettingsPanel />, app);
    const select = (await screen.findByLabelText('School year')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('3'));
    fireEvent.change(select, { target: { value: '4' } });
    await waitFor(async () => expect(await getSettings(app.db)).toMatchObject({ grade: 4, gradeYear: 2027 }));
  });
});
