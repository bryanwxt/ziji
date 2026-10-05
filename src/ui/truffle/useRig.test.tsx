// src/ui/truffle/useRig.test.tsx
import { act, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Truffle } from './Truffle';

let reduced = false;
vi.mock('../motion', () => ({ reducedMotion: () => reduced }));
let talk: ((on: boolean) => void) | null = null;
vi.mock('../../audio/speaking', () => ({ onSpeaking: (fn: (on: boolean) => void) => { talk = fn; return () => { talk = null; }; }, settleIfSilent: () => {} }));

let frames: FrameRequestCallback[] = [];
let clock = 0; // frame time keeps counting across run() calls, so idle timing can be sampled frame by frame
beforeEach(() => {
  frames = [];
  clock = performance.now();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
const run = (n: number) => { for (let i = 0; i < n; i++) { const f = frames; frames = []; clock += 16; f.forEach((cb) => cb(clock)); } };

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
  it('calm: no ear flicks while a question is up', () => {
    const { container } = render(<Truffle alive calm expression="neutral" />);
    const ear = () => (container.querySelector('[data-part="ear-l"]') as SVGGElement).style.transform;
    act(() => run(1));
    const before = ear();
    act(() => run(60 * 9)); // nine seconds of frames
    expect(ear()).toBe(before);
  });
  it('free: he flicks an ear and blinks within a few seconds', () => {
    const { container } = render(<Truffle alive expression="neutral" />);
    const ears = new Set<string>();
    const lids = new Set<string>();
    for (let i = 0; i < 60 * 9; i++) {
      act(() => run(1));
      ears.add((container.querySelector('[data-part="ear-l"]') as SVGGElement).style.transform + (container.querySelector('[data-part="ear-r"]') as SVGGElement).style.transform);
      lids.add(container.querySelector('[data-part="lid-top-l"]')!.getAttribute('d') ?? '');
    }
    expect(ears.size).toBeGreaterThan(1);
    expect(lids.size).toBeGreaterThan(1);
  });
  it('final review I2: a new word: the lingering curious face clears when the question comes up (calm)', () => {
    const { container, rerender } = render(<Truffle alive expression="neutral" react={{ kind: 'newWord', key: 1 }} />);
    act(() => run(60)); // past the surprise: now 'curious' (its then)
    expect(container.querySelector('svg')!.getAttribute('data-expression')).toBe('curious');
    rerender(<Truffle alive calm expression="neutral" react={{ kind: 'newWord', key: 1 }} />);
    act(() => run(120));
    expect(container.querySelector('svg')!.getAttribute('data-expression')).toBe('neutral');
    expect(Number(container.querySelector('[data-part="extra-curious"]')!.getAttribute('opacity'))).toBeLessThan(0.05);
  });
  it('final review I2: a hop still running when the next question comes up settles to rest quickly', () => {
    const { container, rerender } = render(<Truffle alive expression="neutral" react={{ kind: 'right', key: 1 }} />);
    act(() => run(12)); // ~190 ms: mid-hop
    rerender(<Truffle alive calm expression="neutral" react={{ kind: 'right', key: 1 }} />);
    act(() => run(16)); // ~250 ms later (the hop alone would still be in the air)
    expect(container.querySelector('[data-part="rig"]')!.getAttribute('transform')).toMatch(/^translate\(0\.00 0\.00\) translate\(160 276\) scale\(1\.0000 1\.0000\)/);
    expect(container.querySelector('svg')!.getAttribute('data-expression')).toBe('neutral');
  });
  it('final review I2: a nod sent during calm still plays (写一写)', () => {
    const { container, rerender } = render(<Truffle alive calm expression="neutral" />);
    act(() => run(5));
    rerender(<Truffle alive calm expression="neutral" react={{ kind: 'nod', key: 1 }} />);
    act(() => run(3));
    expect(container.querySelector('svg')!.getAttribute('data-expression')).toBe('happy');
  });
  it('final review I3: ears that come back when a onesie comes off are animated again', () => {
    const { container, rerender } = render(<Truffle alive expression="neutral" outfit="rabbit" />);
    act(() => run(5));
    rerender(<Truffle alive expression="grumpy" outfit={null} />);
    act(() => run(120));
    const ear = (container.querySelector('[data-part="ear-l"]') as SVGGElement).style.transform;
    expect(ear).not.toMatch(/rotate\(-?0(\.0+)?deg\)/);
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

describe('paws (spec 2026-10-04 §4.6, phase E)', () => {
  const paw = (c: Element, side: 'l' | 'r') => c.querySelector(`[data-part="paw-${side}"]`)!.getAttribute('transform') ?? '';
  it('hello: the right paw waves while he greets, then is back at his feet', () => {
    reduced = false;
    const { container } = render(<Truffle alive expression="neutral" react={{ kind: 'hello', key: 1 }} />);
    act(() => run(25)); // ~400 ms: mid-wave
    expect(paw(container, 'r')).toMatch(/translate\([^)]*-\d/);
    expect(paw(container, 'l')).toBe('');
    act(() => run(120));
    expect(paw(container, 'r')).toBe('');
  });
  it('a paw move cut short by another reaction still ends with the paws at rest (review focus 2)', () => {
    reduced = false;
    const { container, rerender } = render(<Truffle alive expression="neutral" react={{ kind: 'peek', key: 1 }} />);
    act(() => run(15));
    expect(paw(container, 'l')).not.toBe('');
    rerender(<Truffle alive expression="neutral" react={{ kind: 'wrong', key: 2 }} />);
    act(() => run(200));
    expect(paw(container, 'l')).toBe('');
    expect(paw(container, 'r')).toBe('');
  });
  it('reduced motion: the paws never move', () => {
    reduced = true;
    const { container } = render(<Truffle alive expression="neutral" react={{ kind: 'hello', key: 1 }} />);
    act(() => run(25));
    expect(paw(container, 'r')).toBe('');
    reduced = false;
  });
});

describe('talking (spec 2026-10-04 §4.6)', () => {
  const mouth = (c: Element) => c.querySelector('[data-part="mouth"]')!.getAttribute('d');
  it('his mouth moves while the iPad speaks, and settles when it stops', () => {
    reduced = false;
    const { container } = render(<Truffle alive expression="neutral" />);
    act(() => run(40));
    const still = mouth(container);
    act(() => talk!(true));
    const seen = new Set<string | null>();
    for (let i = 0; i < 12; i++) { act(() => run(2)); seen.add(mouth(container)); }
    expect(seen.size).toBeGreaterThan(3); // opening and closing
    act(() => talk!(false));
    act(() => run(80));
    expect(mouth(container)).toBe(still);
  });
  it('reduced motion: the mouth does not flap', () => {
    reduced = true;
    const { container } = render(<Truffle alive expression="neutral" />);
    act(() => run(40));
    const still = mouth(container);
    act(() => talk!(true));
    act(() => run(20));
    expect(mouth(container)).toBe(still);
    act(() => talk!(false));
    reduced = false;
  });
});

describe('his idle life follows his mood (spec 2026-10-04 §4.6)', () => {
  const kneads = (c: Element, frames: number) => { let seen = false; for (let i = 0; i < frames; i++) { act(() => run(1)); if ((c.querySelector('[data-part="paw-l"]')!.getAttribute('transform') ?? '') !== '' || (c.querySelector('[data-part="paw-r"]')!.getAttribute('transform') ?? '') !== '') { seen = true; break; } } return seen; };
  it('content, he kneads now and then', () => {
    reduced = false;
    const { container } = render(<Truffle alive expression="content" />);
    expect(kneads(container, 1400)).toBe(true); // within about 22 s
  });
  it('grumpy, he does not; nor while a question is up, nor with reduced motion', () => {
    reduced = false;
    expect(kneads(render(<Truffle alive expression="grumpy" />).container, 1400)).toBe(false);
    expect(kneads(render(<Truffle alive expression="content" calm />).container, 1400)).toBe(false);
    reduced = true;
    expect(kneads(render(<Truffle alive expression="content" />).container, 1400)).toBe(false);
    reduced = false;
  });
});

describe('sweep: a smooth rig', () => {
  const rigY = (c: Element) => Number((c.querySelector('[data-part="rig"]')!.getAttribute('transform') ?? '').match(/translate\([^ ]+ ([^)]+)\)/)?.[1] ?? 0);
  const pawY = (c: Element, side: 'l' | 'r') => Number((c.querySelector(`[data-part="paw-${side}"]`)!.getAttribute('transform') ?? '').match(/translate\([^ ]+ ([^)]+)\)/)?.[1] ?? 0);
  it('a new reaction mid-hop carries on from where he is, never snapping to the ground for a frame', () => {
    reduced = false;
    const { container, rerender } = render(<Truffle alive expression="neutral" react={{ kind: 'right', key: 1 }} />);
    act(() => run(20)); // up in the air
    const up = rigY(container);
    expect(up).toBeLessThan(-20);
    rerender(<Truffle alive expression="neutral" react={{ kind: 'right', key: 2 }} />);
    act(() => run(1));
    expect(rigY(container)).toBeLessThan(up / 2);
  });
  it('a new paw move takes over from where the paw is', () => {
    reduced = false;
    const { container, rerender } = render(<Truffle alive expression="neutral" react={{ kind: 'hello', key: 1 }} />);
    act(() => run(25)); // waving, paw up
    const up = pawY(container, 'r');
    expect(up).toBeLessThan(-40);
    rerender(<Truffle alive expression="neutral" react={{ kind: 'right', key: 2 }} />);
    act(() => run(1));
    expect(pawY(container, 'r')).toBeLessThan(up / 2);
  });
  it('a reaction with no paw move lowers a raised paw, never further up first', () => {
    reduced = false;
    const { container, rerender } = render(<Truffle alive expression="neutral" react={{ kind: 'hello', key: 1 }} />);
    act(() => run(25));
    const up = pawY(container, 'r');
    rerender(<Truffle alive expression="neutral" react={{ kind: 'wrong', key: 2 }} />);
    act(() => run(1));
    expect(pawY(container, 'r')).toBeGreaterThanOrEqual(up);
  });
  it('his eyes let go of a finger that has stopped moving', () => {
    reduced = false;
    const { container } = render(<Truffle alive expression="neutral" />);
    container.querySelector('svg')!.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 5000, clientY: 0 }));
    act(() => run(40));
    const iris = () => Number((container.querySelector('[data-part="iris-l"]')!.getAttribute('transform') ?? '').match(/translate\(([^ ]+)/)?.[1] ?? 0);
    expect(Math.abs(iris())).toBeGreaterThan(1);
    act(() => run(260)); // ~4 s with no movement
    expect(Math.abs(iris())).toBeLessThan(0.5);
  });
  it('nothing is rewritten on a frame where nothing changed', () => {
    reduced = true; // no breathing: once settled, every frame is the same
    const { container } = render(<Truffle alive expression="neutral" />);
    act(() => run(60));
    const spy = vi.spyOn(Element.prototype, 'setAttribute');
    act(() => run(3));
    const writes = spy.mock.calls.filter(([n]) => n !== 'data-expression').length;
    spy.mockRestore();
    reduced = false;
    expect(writes).toBe(0);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

