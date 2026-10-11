import { fireEvent, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { putCards, putWords, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
import { playSfx } from '../audio/sfx';

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));

describe('a calm lesson (spec 2026-10-11 §5)', () => {
  it('Truffle is neutral with no reaction while each question is open, and there is no combo counter or combo sound', async () => {
    const app = await makeAppData();
    await putWords(app.db, words);
    await putCards(app.db, ['大', '人', '口', '山', '水', '火'].map((t) => makeCard(`b:${t}`, 'recognise', new Date(2026, 9, 2, 7), true)));
    await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: false, speaking: false } });
    renderWithApp(<SessionScreen free={false} />, app);
    for (let i = 0; i < 8; i++) {
      await waitFor(() => expect(document.querySelector('.choice:not([disabled])')).toBeTruthy(), { timeout: 4000 });
      const truffle = document.querySelector('.stage__truffle svg.truffle')!;
      expect(truffle.getAttribute('data-mood')).toBe('neutral');
      expect(truffle.getAttribute('data-react')).toBeNull();
      const q = document.querySelector('[data-q]')?.textContent ?? '';
      const right = byText.get(q)?.pinyin;
      const pick = [...document.querySelectorAll<HTMLElement>('.choice:not([disabled])')].find((b) => b.textContent === right) ?? document.querySelector<HTMLElement>('.choice:not([disabled])')!;
      const before = document.body.innerHTML;
      fireEvent.click(pick);
      const next = document.querySelector<HTMLElement>('.sheet .btn:not([disabled])'); // a board or 组句 needs more taps: the next round of the loop
      if (next) fireEvent.click(next);
      await waitFor(() => expect(document.body.innerHTML).not.toBe(before), { timeout: 4000 });
      expect(document.querySelector('.combo')).toBeNull();
    }
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0] as string)).not.toContain('combo');
  });
});
