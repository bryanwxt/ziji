import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./audio/speech', () => ({
  loadChineseVoice: vi.fn(async () => null),
  setSpeechRate: vi.fn(),
  speak: vi.fn(),
  primeSpeech: vi.fn(),
}));
vi.mock('./audio/sfx', () => ({ setSfxEnabled: vi.fn(), playSfx: vi.fn() }));
vi.mock('./ui/confetti', () => ({ celebrate: vi.fn() }));

const type = (pin: string) => [...pin].forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));

describe('App', () => {
  it('walks a first launch from PIN to pet to placement to home', async () => {
    render(<App dbName={`test-${crypto.randomUUID()}`} now={() => new Date(2026, 9, 2, 9)} />);
    await screen.findByText('For parents: choose a 4-digit PIN', {}, { timeout: 5000 }); // first boot seeds 3,000 words
    type('1234');
    await screen.findByText('Enter the same PIN again');
    type('1234');
    fireEvent.click(await screen.findByRole('button', { name: '叫醒松露' }));
    fireEvent.click(await screen.findByText('好！'));
    // the adaptive check walks down band by band before it gives up (spec §19 part 6)
    for (let i = 0; i < 60 && !screen.queryByText('开始！'); i++) {
      await waitFor(() => expect(document.querySelector('[data-ready="true"]') ?? screen.queryByText('开始！')).toBeTruthy()); // taps are ignored for a moment after each question
      if (!screen.queryByText('开始！')) fireEvent.click(screen.getByText('不知道'));
    }
    fireEvent.click(await screen.findByText('开始！'));
    expect(await screen.findByText('今天的练习')).toBeTruthy();
    expect(screen.getByText('认识 0 个字')).toBeTruthy();
  }, 30_000); // about 31 questions, each behind the 350 ms tap guard
  it('draws the phone-sideways overlay beside the screen, never instead of it', async () => {
    render(<App dbName={`test-${crypto.randomUUID()}`} now={() => new Date(2026, 9, 2, 9)} />);
    await screen.findByText('For parents: choose a 4-digit PIN', {}, { timeout: 5000 }); // first boot seeds 3,000 words
    const hint = document.querySelector('.rotate-hint');
    expect(hint?.textContent).toContain('竖');
    expect(hint?.getAttribute('aria-label')).toBe('请把手机竖过来');
    expect(document.querySelector('.screen')).toBeTruthy(); // the routed screen stays mounted under it, so a lesson keeps its state
  });
});
