import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { DEFAULT_KID } from '../../types';
import { BuildSentence } from './BuildSentence';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { speak } from '../../audio/speech';

const item = { full: '我和哥哥都喜欢打球。', tiles: ['我', '和', '哥哥', '都', '喜欢', '打球。'], orders: [['我', '和', '哥哥', '都', '喜欢', '打球。']] };
const props = { item, word: makeWord('和'), kid: DEFAULT_KID, resting: 'sulk' as const };
const tap = (text: string) => fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.build__bank .choice')].find((b) => b.textContent === text)!);

describe('组句 (spec 2026-10-05 §3.2 rung 4)', () => {
  it('the tiles come shuffled, never already in order', () => {
    render(<BuildSentence {...props} onDone={vi.fn()} />);
    expect([...document.querySelectorAll('.build__bank .choice')].map((b) => b.textContent).join('')).not.toBe(item.full);
  });
  it('tapping the tiles in order builds the sentence: right, read aloud, then 继续', () => {
    const onDone = vi.fn();
    render(<BuildSentence {...props} onDone={onDone} />);
    for (const t of item.tiles) tap(t);
    fireEvent.click(screen.getByText('好了！')); // he says when he is done (sweep)
    expect(document.querySelector('.sheet--good')).toBeTruthy();
    expect(speak).toHaveBeenLastCalledWith(item.full);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('a placed tile can be taken back (review focus 3)', () => {
    render(<BuildSentence {...props} onDone={vi.fn()} />);
    tap('我');
    fireEvent.click(document.querySelector<HTMLButtonElement>('.build__answer .build__placed')!);
    expect(document.querySelectorAll('.build__answer .build__placed')).toHaveLength(0);
    expect([...document.querySelectorAll('.build__bank .choice')].map((b) => b.textContent)).toContain('我');
  });
  it('a wrong order: the sheet shows the sentence built right, read aloud, with the word in English', () => {
    const onDone = vi.fn();
    render(<BuildSentence {...props} onDone={onDone} />);
    for (const t of ['和', '我', '哥哥', '都', '喜欢', '打球。']) tap(t);
    fireEvent.click(screen.getByText('好了！'));
    expect(document.querySelector('.sheet--oops')!.textContent).toContain(item.full);
    expect(document.querySelector('.sheet [lang="en"]')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('an accepted second order counts as right', () => {
    const two = { full: '今天我喝牛奶。', tiles: ['今天', '我', '喝', '牛奶。'], orders: [['今天', '我', '喝', '牛奶。'], ['我', '今天', '喝', '牛奶。']] };
    render(<BuildSentence {...props} item={two} word={makeWord('喝')} onDone={vi.fn()} />);
    for (const t of ['我', '今天', '喝', '牛奶。']) tap(t);
    fireEvent.click(screen.getByText('好了！'));
    expect(document.querySelector('.sheet--good')).toBeTruthy();
  });
  it('sweep: all placed, nothing is marked yet — he can still take a tile back before 好了！', () => {
    render(<BuildSentence {...props} onDone={vi.fn()} />);
    for (const t of ['和', '我', '哥哥', '都', '喜欢', '打球。']) tap(t);
    expect(document.querySelector('.sheet--oops, .sheet--good')).toBeNull();
    fireEvent.click(document.querySelector<HTMLButtonElement>('.build__answer .build__placed')!); // takes 和 back
    expect(document.querySelectorAll('.build__answer .build__placed')).toHaveLength(5);
    expect(screen.getByText('好了！').closest('button')!.disabled).toBe(true); // not all placed again
  });
});

describe('final review I3: he hears the sentence first', () => {
  it('the sentence is said when the tiles appear, and he can hear it again', () => {
    vi.mocked(speak).mockClear();
    render(<BuildSentence {...props} onDone={vi.fn()} />);
    expect(speak).toHaveBeenCalledWith(item.full);
    vi.mocked(speak).mockClear();
    fireEvent.click(document.querySelector<HTMLButtonElement>('.build__listen button, button.build__listen')!);
    expect(speak).toHaveBeenCalled();
  });
});
