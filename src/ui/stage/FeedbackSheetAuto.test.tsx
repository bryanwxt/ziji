import { fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTO_NEXT_MS, FeedbackSheet } from './FeedbackSheet';

// After a right answer the lesson moves on by itself (parent, 2026-10-05: fewer taps): 真厉害 shows, then a short pause.
describe('a right answer moves on by itself', () => {
  afterEach(() => vi.useRealTimers());
  it('goes on after a short pause, once', () => {
    vi.useFakeTimers();
    const go = vi.fn();
    render(<FeedbackSheet tone="good" title="真厉害！" actionLabel="继续" onAction={go} />);
    vi.advanceTimersByTime(AUTO_NEXT_MS - 1);
    expect(go).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(AUTO_NEXT_MS * 3);
    expect(go).toHaveBeenCalledTimes(1);
  });
  it('a tap on 继续 goes at once, and the pause then does nothing', () => {
    vi.useFakeTimers();
    const go = vi.fn();
    render(<FeedbackSheet tone="good" title="真厉害！" actionLabel="继续" onAction={go} />);
    fireEvent.click(screen.getByRole('button'));
    vi.advanceTimersByTime(AUTO_NEXT_MS * 2);
    expect(go).toHaveBeenCalledTimes(1);
  });
  it('a miss waits for him: he reads the answer first', () => {
    vi.useFakeTimers();
    const go = vi.fn();
    render(<FeedbackSheet tone="oops" title="慢慢来！" actionLabel="继续" onAction={go} />);
    vi.advanceTimersByTime(AUTO_NEXT_MS * 3);
    expect(go).not.toHaveBeenCalled();
  });
  it('a disabled or neutral sheet never goes by itself', () => {
    vi.useFakeTimers();
    const go = vi.fn();
    render(<><FeedbackSheet actionLabel="继续" onAction={go} /><FeedbackSheet tone="good" actionLabel="继续" disabled onAction={go} /></>);
    vi.advanceTimersByTime(AUTO_NEXT_MS * 3);
    expect(go).not.toHaveBeenCalled();
  });
});
