// src/ui/truffle/useRig.test.tsx
import { act, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Truffle } from './Truffle';

let reduced = false;
vi.mock('../motion', () => ({ reducedMotion: () => reduced }));

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
  it('a new reaction replaces a running one and he ends at rest (review focus 2)', () => {
    const { container, rerender } = render(<Truffle alive expression="neutral" react={{ kind: 'right', key: 1 }} />);
    act(() => run(5));
    rerender(<Truffle alive expression="neutral" react={{ kind: 'right', key: 2 }} />);
    act(() => run(5));
    rerender(<Truffle alive expression="neutral" react={{ kind: 'wrong', key: 3 }} />);
    act(() => run(3));
    expect(container.querySelector('svg')!.getAttribute('data-expression')).toBe('curious'); // the newest reaction shows
    act(() => run(400));
    expect(container.querySelector('[data-part="rig"]')!.getAttribute('transform') ?? '').toMatch(/translate\(0(\.0+)? 0(\.0+)?\)|^$/); // back at rest
    expect(container.querySelector('svg')!.getAttribute('data-expression')).toBe('neutral'); // back to his own expression after the hold
  });
  it('a reaction shows its expression and moves his body while it plays', () => {
    const { container } = render(<Truffle alive expression="neutral" react={{ kind: 'right', key: 1 }} />);
    act(() => run(20)); // ~300ms in: the top of the hop
    const m = /translate\((-?[\d.]+) (-?[\d.]+)\)/.exec(container.querySelector('[data-part="rig"]')!.getAttribute('transform') ?? '');
    expect(container.querySelector('svg')!.getAttribute('data-expression')).toBe('happy');
    expect(Math.abs(Number(m?.[2] ?? 0))).toBeGreaterThan(2); // he hops
  });
  it('reduced motion: the expression still changes, the body never moves', () => {
    reduced = true;
    const { container } = render(<Truffle alive expression="neutral" react={{ kind: 'right', key: 1 }} />);
    act(() => run(10));
    reduced = false;
    expect(container.querySelector('svg')!.getAttribute('data-expression')).toBe('happy');
    expect(container.querySelector('[data-part="rig"]')!.getAttribute('transform') ?? '').not.toMatch(/scale\(1\.0[1-9]/);
  });
});
