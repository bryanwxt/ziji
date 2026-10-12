import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { getSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SettingsPanel } from './SettingsPanel';

describe('拼音渐隐 Fade pinyin (spec 2026-10-12 §4)', () => {
  it('is on when never set, and saves off and on again', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    const box = screen.getByLabelText('拼音渐隐 Fade pinyin') as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    await waitFor(async () => expect((await getSettings(app.db)).fadePinyin).toBe(false));
    fireEvent.click(screen.getByLabelText('拼音渐隐 Fade pinyin'));
    await waitFor(async () => expect((await getSettings(app.db)).fadePinyin).toBe(true));
  });
});
