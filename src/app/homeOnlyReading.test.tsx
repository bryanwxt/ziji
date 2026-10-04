import { screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { HomeScreen } from './HomeScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));

describe('Home with only 朗读 switched on and nothing he can read yet (plan 10 minor)', () => {
  it('never shows a lone chest: Truffle says there is nothing to practise, and the path is hidden', async () => {
    const app = await makeAppData();
    app.settings = { ...DEFAULT_SETTINGS, placementDone: true, activities: { flashcards: false, choose: false, writing: false, components: false, speaking: true } };
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelectorAll('.path__row')).toHaveLength(0);
    expect(document.querySelector('.home__path')!.textContent).toContain('今天休息一下');
  });
});
