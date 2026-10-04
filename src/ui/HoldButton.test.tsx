import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoldButton } from './HoldButton';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const btn = () => screen.getByRole('button', { name: '按住打开' });
const down = (el: Element) => fireEvent(el, new Event('pointerdown', { bubbles: true }));

describe('HoldButton', () => {
  it('fires once after a full hold', () => {
    const done = vi.fn();
    render(<HoldButton label="按住打开" onComplete={done} />);
    down(btn());
    expect(btn().className).toContain('is-holding');
    act(() => { vi.advanceTimersByTime(1199); });
    expect(done).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(done).toHaveBeenCalledTimes(1);
    expect(btn().className).toContain('is-done');
    down(btn());
    act(() => { vi.advanceTimersByTime(2000); });
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('cancels when released, cancelled or left early', () => {
    const done = vi.fn();
    render(<HoldButton label="按住打开" onComplete={done} />);
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
      down(btn());
      act(() => { vi.advanceTimersByTime(600); });
      fireEvent(btn(), new Event(ev, { bubbles: true }));
      expect(btn().className).not.toContain('is-holding');
    }
    act(() => { vi.advanceTimersByTime(5000); });
    expect(done).not.toHaveBeenCalled();
  });
  it('a second pointerdown mid-hold does not restart or double-fire', () => {
    const done = vi.fn();
    render(<HoldButton label="按住打开" onComplete={done} />);
    down(btn());
    act(() => { vi.advanceTimersByTime(700); });
    down(btn());
    act(() => { vi.advanceTimersByTime(500); });
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('works by holding Space or Enter', () => {
    const done = vi.fn();
    render(<HoldButton label="按住打开" onComplete={done} />);
    fireEvent.keyDown(btn(), { key: ' ' });
    fireEvent.keyDown(btn(), { key: ' ', repeat: true });
    act(() => { vi.advanceTimersByTime(1200); });
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('does nothing when disabled', () => {
    const done = vi.fn();
    render(<HoldButton label="按住打开" onComplete={done} disabled />);
    down(btn());
    act(() => { vi.advanceTimersByTime(2000); });
    expect(done).not.toHaveBeenCalled();
  });
  it('losing focus mid-hold cancels (a keyboard hold that tabs away)', () => {
    const done = vi.fn();
    render(<HoldButton label="按住打开" onComplete={done} />);
    fireEvent.keyDown(btn(), { key: 'Enter' });
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.blur(btn());
    expect(btn().className).not.toContain('is-holding');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(done).not.toHaveBeenCalled();
  });
  it("a second finger lifting does not cancel the first finger's hold", () => {
    const done = vi.fn();
    render(<HoldButton label="按住打开" onComplete={done} />);
    const ev = (type: string, pointerId: number) => fireEvent(btn(), Object.assign(new Event(type, { bubbles: true }), { pointerId }));
    ev('pointerdown', 1);
    act(() => { vi.advanceTimersByTime(400); });
    ev('pointerdown', 2);
    ev('pointerup', 2);
    act(() => { vi.advanceTimersByTime(800); });
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('the ring fills over the hold time it was given', () => {
    render(<HoldButton label="按住打开" onComplete={vi.fn()} holdMs={2000} />);
    expect(btn().style.getPropertyValue('--hold-ms')).toBe('2000ms');
  });
  it('a quick tap tells the caller (so the chest can wiggle a hint)', () => {
    const tapped = vi.fn();
    render(<HoldButton label="按住打开" onComplete={vi.fn()} onTooShort={tapped} />);
    down(btn());
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent(btn(), new Event('pointerup', { bubbles: true }));
    expect(tapped).toHaveBeenCalledTimes(1);
  });
  it('letting go at 1199 ms is still too early', () => {
    const done = vi.fn();
    render(<HoldButton label="按住打开" onComplete={done} />);
    down(btn());
    act(() => { vi.advanceTimersByTime(1199); });
    fireEvent(btn(), new Event('pointerup', { bubbles: true }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(done).not.toHaveBeenCalled();
  });
});
