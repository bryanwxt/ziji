import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { getSettings, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { SettingsPanel } from './SettingsPanel';

describe('「朗读 Read aloud」 switch (spec 2026-10-12 §7)', () => {
  it('is on for a new install; off and on again saves, and the Activities 朗读 box shows only while it is on', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    const box = screen.getByLabelText('朗读 Read aloud') as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(screen.getByLabelText('朗读 reading aloud')).toBeTruthy();
    fireEvent.click(box);
    await waitFor(async () => expect((await getSettings(app.db)).langdu).toBe(false));
    expect(screen.queryByLabelText('朗读 reading aloud')).toBeNull();
    fireEvent.click(screen.getByLabelText('朗读 Read aloud'));
    await waitFor(async () => expect((await getSettings(app.db)).langdu).toBe(true));
  });
  it('turning it on also turns on the lesson step it runs in; turning it off leaves that switch alone (final review M2)', async () => {
    const off = { ...DEFAULT_SETTINGS, placementDone: true, langdu: false, activities: { ...DEFAULT_SETTINGS.activities, speaking: false } };
    const app = await makeAppData({ settings: off });
    await updateSettings(app.db, off);
    renderWithApp(<SettingsPanel />, app);
    fireEvent.click(screen.getByLabelText('朗读 Read aloud'));
    await waitFor(async () => expect(await getSettings(app.db)).toMatchObject({ langdu: true, activities: { speaking: true } }));
    fireEvent.click(screen.getByLabelText('朗读 Read aloud'));
    await waitFor(async () => expect(await getSettings(app.db)).toMatchObject({ langdu: false, activities: { speaking: true } }));
  });
});
