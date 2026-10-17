import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { speak } from '../../audio/speech';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';
import { builtinWords } from '../../content';
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
  it('她 heard (parent 2026-10-17): never "he, him" or "it" to pick, and the character is shown beside the speaker', () => {
    const all = builtinWords(0);
    const she = all.find((w) => w.text === '她')!;
    for (let i = 0; i < 15; i++) {
      const onDone = vi.fn();
      const { unmount } = render(<FlashcardStep {...base} item={{ wordId: she.id, isNew: false, retry: false }} word={she} pool={all} voice onDone={onDone} ask="hear" />);
      expect(speak).toHaveBeenCalledWith('她', expect.anything());
      const choices = [...document.querySelectorAll('.choices .choice')].map((b) => b.textContent ?? '');
      expect(choices).toContain('she, her');
      expect(choices.filter((c) => /\b(he|him|it)\b/.test(c))).toEqual([]);
      expect(document.querySelector('.flash__heard .hanzi--q')?.textContent).toBe('她');
      expect(screen.getByText('听一听，看一看，是什么意思？')).toBeTruthy();
      fireEvent.click(screen.getByText('she, her'));
      fireEvent.click(screen.getByText('继续'));
      expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'hear' })); // still the Hear rung
      unmount();
    }
  });
});
