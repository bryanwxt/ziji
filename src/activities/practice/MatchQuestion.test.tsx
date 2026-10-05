import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { MatchQuestion } from './MatchQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { speak } from '../../audio/speech';

const question = { verb: '穿', noun: '衣服', options: ['牙', '衣服', '饭', '歌'] };
const props = { question, kid: DEFAULT_KID, resting: 'sulk' as const };

describe('搭配 (spec 2026-10-05 §3.2 rung 2, final review C2)', () => {
  it('the right partner joins the word, said aloud', () => {
    const onDone = vi.fn();
    render(<MatchQuestion {...props} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '衣服' }));
    expect(document.querySelector('.match__slot')!.textContent).toBe('衣服');
    expect(speak).toHaveBeenLastCalledWith('穿衣服');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('a wrong partner: the right pair on the sheet, with English for both partners', () => {
    const onDone = vi.fn();
    render(<MatchQuestion {...props} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '牙' }));
    expect(document.querySelector('.sheet--oops')!.textContent).toContain('穿衣服');
    expect(document.querySelector('.sheet [lang="en"]')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
});
