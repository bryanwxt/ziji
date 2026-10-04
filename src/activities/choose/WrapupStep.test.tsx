import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { WrapupStep } from './WrapupStep';

vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
afterEach(cleanup);

const a = { kind: 'usage' as const, wordId: 'a', word: '很', right: '这个书包很大。', wrong: '我很一个书包。' };
const b = { ...a, wordId: 'b' };

describe('WrapupStep (spec §20 part 7)', () => {
  it('opens with 用一用！', () => {
    render(<WrapupStep items={[a]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onGiveUp={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText('用一用！')).toBeTruthy();
  });
  it('three misses: a missed item returns after the others; the third miss closes the word kindly, and the round still ends', () => {
    const onGiveUp = vi.fn();
    const onDone = vi.fn();
    const onAnswer = vi.fn();
    render(<WrapupStep items={[a, b]} kid={DEFAULT_KID} resting="sulk" onAnswer={onAnswer} onGiveUp={onGiveUp} onDone={onDone} />);
    const pick = (s: string) => { fireEvent.click(screen.getByRole('button', { name: s })); };
    pick('我很一个书包。'); fireEvent.click(screen.getByText('继续')); // a, try 1
    pick('这个书包很大。'); fireEvent.click(screen.getByText('继续')); // b
    pick('我很一个书包。'); fireEvent.click(screen.getByText('继续')); // a, try 2
    pick('我很一个书包。'); // a, try 3
    expect(screen.getAllByText('明天再来！').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('继续'));
    expect(onGiveUp).toHaveBeenCalledWith(a);
    expect(onDone).toHaveBeenCalled();
    expect(onAnswer).toHaveBeenCalledTimes(4);
    expect(onAnswer.mock.calls.map((c) => c[1])).toEqual([false, true, false, false]);
  });
  it('a closed word is not asked again, even if it had another item queued', () => {
    const a2 = { ...a, right: '这只狗很大。' };
    const onGiveUp = vi.fn();
    const onDone = vi.fn();
    render(<WrapupStep items={[a, b, a2]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onGiveUp={onGiveUp} onDone={onDone} />);
    const wrong = () => { fireEvent.click(screen.getByRole('button', { name: '我很一个书包。' })); fireEvent.click(screen.getByText('继续')); };
    wrong(); // a, try 1
    fireEvent.click(screen.getByRole('button', { name: '这个书包很大。' })); fireEvent.click(screen.getByText('继续')); // b
    wrong(); // a2, try 2
    wrong(); // a again, try 3: closed
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalled();
  });
  it('a retry asks the word another way when one is given, not the same question again', () => {
    const other = { ...a, right: '这只狗很大。' };
    render(<WrapupStep items={[a]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onGiveUp={vi.fn()} onDone={vi.fn()} makeRetry={() => other} />);
    fireEvent.click(screen.getByRole('button', { name: '我很一个书包。' }));
    fireEvent.click(screen.getByText('继续'));
    expect(screen.getByRole('button', { name: '这只狗很大。' })).toBeTruthy();
  });
});
