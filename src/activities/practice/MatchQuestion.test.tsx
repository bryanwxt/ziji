import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { MatchQuestion } from './MatchQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { speak } from '../../audio/speech';

const question = { verb: '穿', noun: '衣服', options: ['牙', '衣服', '饭', '歌'] };
const props = { question, kid: DEFAULT_KID };

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

describe('「都不对」 as a wrong option (production practice spec §5)', () => {
  it('the partner stays, 都不对 replaces a wrong one; picking it is wrong and the real pair shows', () => {
    const onDone = vi.fn();
    render(<MatchQuestion {...props} none="decoy" onDone={onDone} />);
    const labels = [...document.querySelectorAll('.choice')].map((b) => b.textContent);
    expect(labels).toHaveLength(4);
    expect(labels).toContain('衣服');
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    expect(document.querySelector('.sheet--oops')!.textContent).toContain('穿衣服');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
});

describe('「都不对」 in 搭配 (production practice spec §5)', () => {
  it('the partner is left out; 都不对 is right, and the sheet shows the real pair', () => {
    const onDone = vi.fn();
    render(<MatchQuestion {...props} none="answer" onDone={onDone} />);
    expect([...document.querySelectorAll('.choice')].map((b) => b.textContent)).toEqual(['牙', '饭', '歌', '都不对']);
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    expect(document.querySelector('.sheet--good')!.textContent).toContain('穿衣服');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('picking a partner there is wrong, and the real pair shows', () => {
    const onDone = vi.fn();
    render(<MatchQuestion {...props} none="answer" onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '牙' }));
    expect(document.querySelector('.sheet--oops')!.textContent).toContain('穿衣服');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
});
