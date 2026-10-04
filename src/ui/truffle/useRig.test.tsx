// src/ui/truffle/useRig.test.tsx
import { act, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Truffle } from './Truffle';

let frames: FrameRequestCallback[] = [];
beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
const run = (n: number) => { for (let i = 0; i < n; i++) { const f = frames; frames = []; f.forEach((cb) => cb(performance.now() + i * 16)); } };

describe('the animation loop (spec §4.1, review focus 1)', () => {
  it('a static Truffle never starts a loop', () => {
    render(<Truffle mood="neutral" />);
    expect(frames).toHaveLength(0);
  });
  it('a live Truffle blends from one expression to the next instead of jumping', () => {
    const { container, rerender } = render(<Truffle alive expression="neutral" />);
    rerender(<Truffle alive expression="joy" />);
    act(() => run(3));
    const mid = Number(container.querySelector('[data-part="lid-closed-l"]')!.getAttribute('opacity'));
    act(() => run(80));
    const end = Number(container.querySelector('[data-part="lid-closed-l"]')!.getAttribute('opacity'));
    expect(mid).toBeLessThan(1); // on the way
    expect(end).toBeCloseTo(1, 1); // arrived
  });
  it('pauses while the page is hidden', () => {
    render(<Truffle alive expression="neutral" />);
    act(() => run(2));
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    act(() => run(2));
    expect(frames).toHaveLength(0);
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.length).toBeGreaterThan(0);
  });
});
