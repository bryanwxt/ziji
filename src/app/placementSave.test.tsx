import { fireEvent, screen, waitFor } from '@testing-library/preact';
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
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={20261002} />, app);
    for (let i = 0; i < 80 && !screen.queryByText('开始！'); i++) {
      // each question once it is on screen, never a stale one twice
      await waitFor(() => expect(document.querySelector(`[data-question="${i}"]`) ?? screen.queryByText('开始！')).toBeTruthy(), { timeout: 10_000 });
      if (!screen.queryByText('开始！')) fireEvent.click(screen.getByText('不知道'));
    }
    expect(screen.getByText('开始！')).toBeTruthy();
  });
});
