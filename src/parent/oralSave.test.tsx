import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SettingsPanel } from './SettingsPanel';

let release: (() => void) | null = null;
vi.mock('../store/repo', async (orig) => {
  const real = await orig<typeof import('../store/repo')>();
  let calls = 0;
  return {
    ...real,
    updateSettings: vi.fn(async (...args: Parameters<typeof real.updateSettings>) => {
      const result = await real.updateSettings(...args);
      if (calls++ === 0) await new Promise<void>((r) => (release = r)); // the first save comes back late
      return result;
    }),
  };
});

describe('typing the self-introduction (deferred minor, plan 8)', () => {
  it('a save that comes back late never puts back an older value', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    const name = (await screen.findByLabelText('Chinese name')) as HTMLInputElement;
    fireEvent.input(name, { target: { value: '小' } });
    fireEvent.input(name, { target: { value: '小明' } });
    await waitFor(() => expect(release).not.toBeNull());
    await act(async () => { release!(); await new Promise((r) => setTimeout(r, 20)); });
    expect(name.value).toBe('小明');
  });
});
