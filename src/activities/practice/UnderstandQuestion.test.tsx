import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { UnderstandQuestion } from './UnderstandQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
const listeners: ((on: boolean) => void)[] = [];
vi.mock('../../audio/speaking', () => ({ onSpeaking: (fn: (on: boolean) => void) => { listeners.push(fn); return () => {}; }, settleIfSilent: () => {} }));
import { speak } from '../../audio/speech';

const item = { zh: '我家有一只猫。', en: 'We have a cat at home.', choices: ['The puppy runs fast.', 'We have a cat at home.', 'The cat sleeps by the door.'] };
const props = { item, kid: DEFAULT_KID, resting: 'sulk' as const };
const choice = (en: string) => screen.getByRole('button', { name: en }) as HTMLButtonElement;
const finish = () => { vi.useFakeTimers(); act(() => { for (const l of listeners) l(false); }); act(() => { vi.advanceTimersByTime(300); }); vi.useRealTimers(); };

describe('the Understand question (plan 2b)', () => {
  it('plays the sentence and shows no Chinese before the answer', () => {
    render(<UnderstandQuestion {...props} onDone={vi.fn()} />);
    expect(speak).toHaveBeenCalledWith(item.zh);
    expect(document.body.textContent).not.toContain('猫');
  });
  it('choices wait for the sentence (Review Focus 5)', () => {
    render(<UnderstandQuestion {...props} onDone={vi.fn()} />);
    expect(choice(item.en).disabled).toBe(true);
    finish();
    expect(choice(item.en).disabled).toBe(false);
  });
  it('choices open after 5 s when no end is reported', () => {
    vi.useFakeTimers();
    render(<UnderstandQuestion {...props} onDone={vi.fn()} />);
    expect(choice(item.en).disabled).toBe(true);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(choice(item.en).disabled).toBe(false);
    vi.useRealTimers();
  });
  it('a right pick: the good sheet', () => {
    const onDone = vi.fn();
    render(<UnderstandQuestion {...props} onDone={onDone} />);
    finish();
    fireEvent.click(choice(item.en));
    expect(document.querySelector('.sheet--good')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('a wrong pick: the sentence with its English', () => {
    const onDone = vi.fn();
    render(<UnderstandQuestion {...props} onDone={onDone} />);
    finish();
    fireEvent.click(choice('The puppy runs fast.'));
    expect(document.querySelector('.sheet--oops')).toBeTruthy();
    expect(document.querySelector('.sheet')!.textContent).toContain('猫');
    expect(document.querySelector('.sheet')!.textContent).toContain(item.en);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('final review: a replay mid-sentence (speech cancelled, then started again) does not open the choices', () => {
    vi.useFakeTimers();
    render(<UnderstandQuestion {...props} onDone={vi.fn()} />);
    act(() => { for (const l of listeners) { l(true); l(false); l(true); } });
    act(() => { vi.advanceTimersByTime(300); });
    expect(choice(item.en).disabled).toBe(true);
    act(() => { for (const l of listeners) l(false); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(choice(item.en).disabled).toBe(false);
    vi.useRealTimers();
  });
  it('final review I4: the time counts from when the question appears (listening included)', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<UnderstandQuestion {...props} onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(3000); });
    act(() => { for (const l of listeners) l(false); });
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.click(choice(item.en));
    fireEvent.click(screen.getByText('继续'));
    vi.useRealTimers();
    expect(onDone.mock.calls[0]![0].responseMs).toBeGreaterThanOrEqual(3000);
  });
});
