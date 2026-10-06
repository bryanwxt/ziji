import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { StoryScreen } from './StoryScreen';

vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../store/repo', async (orig) => ({ ...(await orig<typeof import('../store/repo')>()), updateSettings: vi.fn(async () => { throw new Error('IndexedDB is unavailable'); }) }));

describe('the story never strands him (final review, re-graded Important)', () => {
  it('a failed save still moves on to the lesson', async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'session', free: false }} />, app);
    await screen.findByText(/Saturday/);
    fireEvent.click(screen.getByText('跳过').closest('button')!);
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false }));
  });
});
