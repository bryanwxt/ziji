import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { FamilyBoard } from '../../practice/family';
import { DEFAULT_KID } from '../../types';
import { FamilyQuestion } from './FamilyQuestion';
import { speak, stopSpeaking } from '../../audio/speech';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

const board: FamilyBoard = {
  ch: '生',
  reading: 'shēng',
  family: [{ text: '先生', pinyin: 'xiān shēng', en: 'teacher; gentleman; sir; mister' }, { text: '女生', pinyin: 'nǚ shēng', en: 'schoolgirl; female student' }],
  distractors: [
    { text: '星星', pinyin: 'xīng xīng', en: 'a star; the stars in the sky', swap: '星' },
    { text: '出去', pinyin: 'chū qù', en: 'to go out', swap: '去' },
    { text: '在家', pinyin: 'zài jiā', en: 'to be at home', swap: '在' },
    { text: '坏人', pinyin: 'huài rén', en: 'bad person', swap: '坏' },
  ],
  tiles: ['先生', '星星', '出去', '女生', '在家', '坏人'],
};
const tap = (t: string) => fireEvent.click(screen.getByRole('button', { name: t }));

describe('找一家人 (spec 2026-10-12 §5)', () => {
  it('asks for the two words with the character, on six tiles', () => {
    render(<FamilyQuestion board={board} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(document.querySelector('[data-q]')!.textContent).toBe('生');
    expect(document.querySelector('.family-q__ask .label')!.getAttribute('data-zh')).toBe('哪两个词有『生』？');
    expect(document.querySelectorAll('.family-q__tiles .choice')).toHaveLength(6);
  });
  it("says the question, then the character on its own at the card's reading; stops speaking when it goes (final review M2)", () => {
    vi.mocked(speak).mockClear();
    vi.mocked(stopSpeaking).mockClear();
    const { unmount } = render(<FamilyQuestion board={{ ...board, ch: '切', reading: 'qiē' }} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(vi.mocked(speak).mock.calls).toEqual([['哪两个词有'], ['切', { reading: 'qiē', queue: true, avoid: board.tiles }]]); // never said as a tile (切 → 切菜 would give the answer)
    unmount();
    expect(stopSpeaking).toHaveBeenCalled();
  });
  it('both family words: right, with the two words, their pinyin and English', () => {
    const onDone = vi.fn();
    render(<FamilyQuestion board={board} kid={DEFAULT_KID} onDone={onDone} />);
    tap('先生'); tap('女生');
    expect(document.querySelector('.sheet--good')).toBeTruthy();
    expect([...document.querySelectorAll('.family-sum__row .label')].map((l) => l.getAttribute('data-py'))).toEqual(['xiān shēng', 'nǚ shēng']);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith({ correct: true, responseMs: expect.any(Number) });
  });
  it('a distractor: wrong; its look-alike is marked and the part that differs shown', () => {
    const onDone = vi.fn();
    render(<FamilyQuestion board={board} kid={DEFAULT_KID} onDone={onDone} />);
    tap('先生'); tap('星星');
    expect(document.querySelector('.sheet--oops')).toBeTruthy();
    const missed = document.querySelector('.family-sum__row.is-missed')!;
    expect(missed.querySelector('.label__cell--mark .label__ch')!.textContent).toBe('星');
    expect(document.querySelector('.sheet .why--look')!.getAttribute('data-text')).toBe('生 · 星 日 sun');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith({ correct: false, responseMs: expect.any(Number) });
  });
  it('a second tap on a picked tile lets it go; nothing is graded until two are picked', () => {
    render(<FamilyQuestion board={board} kid={DEFAULT_KID} onDone={vi.fn()} />);
    tap('先生'); tap('先生');
    expect(document.querySelector('.sheet--good, .sheet--oops')).toBeNull();
    expect(screen.getByRole('button', { name: '先生' }).classList.contains('is-picked')).toBe(false);
    tap('女生'); tap('先生');
    expect(document.querySelector('.sheet--good')).toBeTruthy();
  });
});
