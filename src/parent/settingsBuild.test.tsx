import { screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SettingsPanel } from './SettingsPanel';

describe('Settings names the build (review 2026-10-17)', () => {
  it("shows the app's git hash and build date, so a parent can say which version is on the iPad", async () => {
    renderWithApp(<SettingsPanel />, await makeAppData());
    const line = await screen.findByText(/^App version /);
    expect(line.textContent).toMatch(/^App version ([0-9a-f]{7,}|dev) · \d{4}-\d{2}-\d{2}$/);
  });
});
