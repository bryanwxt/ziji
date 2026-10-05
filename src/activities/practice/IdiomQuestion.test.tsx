import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinIdiom, chengyuOf } from '../../content/chengyu';
import { mulberry32 } from '../../lib/random';
import { idiomGap } from '../../practice/idioms';
import { DEFAULT_KID } from '../../types';
import { IdiomQuestion } from './IdiomQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { speak } from '../../audio/speech';

const gap = idiomGap(builtinIdiom('五颜六色')!, '颜', mulberry32(1))!;
const props = { gap, kid: DEFAULT_KID, resting: 'sulk' as const };

describe('complete the 成语 (spec 2026-10-05 §3.2 rung 5)', () => {
  it('shows the 成语 with a gap and four characters, all Chinese', () => {
    render(<IdiomQuestion {...props} onDone={vi.fn()} />);
    expect(document.querySelector('.idiom')!.textContent).toBe('五？六色');
    expect(document.querySelectorAll('.choice')).toHaveLength(4);
    expect(document.querySelector('[lang="en"]')).toBeNull();
  });
  it('the right character fills the gap, and the 成语 is said aloud', () => {
    const onDone = vi.fn();
    render(<IdiomQuestion {...props} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '颜' }));
    expect(document.querySelector('.idiom')!.textContent).toBe('五颜六色');
    expect(speak).toHaveBeenLastCalledWith('五颜六色');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, picked: '颜' }));
  });
  it('a miss explains the 成语 in English on the sheet (spec §3.6)', () => {
    const onDone = vi.fn();
    render(<IdiomQuestion {...props} onDone={onDone} />);
    const wrong = gap.options.find((o) => o !== '颜')!;
    fireEvent.click(screen.getByRole('button', { name: wrong }));
    expect(document.querySelector('.sheet--oops')!.textContent).toContain('五颜六色');
    expect(document.querySelector('.sheet__en')!.textContent).toContain(chengyuOf('五颜六色')!.meaning);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false, picked: wrong }));
  });
});
