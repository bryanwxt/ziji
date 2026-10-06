import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { speak } from '../../audio/speech';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';
import { FlashcardStep } from './FlashcardStep';

const words = ['门:door', '大:big', '小:small', '水:water', '火:fire'].map((s) => { const [t, m] = s.split(':'); return makeWord(t!, { meaning: m!, source: 'parent' }); });
const base = { item: { wordId: 'b:门', isNew: false, retry: false }, word: words[0]!, pool: words, kid: DEFAULT_KID, resting: 'neutral' as const, combo: 0, closeupReady: false };

describe('the Hear question (spec 2026-10-06 §3.2)', () => {
  it('says the word, shows no characters, and he picks its meaning in English', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} voice onDone={onDone} ask="hear" />);
    expect(speak).toHaveBeenCalledWith('门', expect.anything());
    expect(document.querySelector('.hanzi--q')).toBeNull();
    expect(screen.getByText('听一听，是什么意思？')).toBeTruthy();
    fireEvent.click(screen.getByText('door'));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'hear' }));
  });
  it('with no voice it reads for meaning instead, and says so', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} voice={false} onDone={onDone} ask="hear" />);
    expect(screen.getByText('这个词是什么意思？')).toBeTruthy();
    fireEvent.click(screen.getByText('door'));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'read' }));
  });
});
