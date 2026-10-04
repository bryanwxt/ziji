import { fireEvent, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { putWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { PlacementScreen } from './PlacementScreen';

vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../placement/apply', async (orig) => ({ ...(await orig<typeof import('../placement/apply')>()), applyPlacement: vi.fn().mockRejectedValue(new Error('storage full')) }));

describe('placement when saving fails (review of plan 14)', () => {
  it('still reaches the result screen, never a frozen question', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithApp(<PlacementScreen tapGuardMs={0} />, app);
    for (let i = 0; i < 60 && !screen.queryByText('开始！'); i++) fireEvent.click(await screen.findByText(/不知道|开始！/));
    expect(await screen.findByText('开始！')).toBeTruthy();
  });
});
