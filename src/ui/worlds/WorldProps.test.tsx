import { act, fireEvent, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FINDS } from '../../fun/finds';
import { WORLDS } from '../../fun/worlds';
import { DEFAULT_KID, type KidState } from '../../types';
import { MOMENTS } from './moments';
import { WorldProps } from './WorldProps';
import { WorldScene } from './WorldScene';

vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
const still = { on: false };
vi.mock('../motion', () => ({ reducedMotion: () => still.on }));
import { speak } from '../../audio/speech';
import { playSfx } from '../../audio/sfx';

const kid = (over: Partial<KidState> = {}): KidState => ({ ...DEFAULT_KID, finds: { ...DEFAULT_FINDS }, ...over });
const tap = (label: string) => fireEvent.click(document.querySelector(`.world-props [aria-label="${label}"]`)!);
const props = (over: Record<string, unknown> = {}) => ({ kid: kid(), today: '2026-10-06', onKid: vi.fn(), onSay: vi.fn(), onReact: vi.fn(), autoEvery: 10_000_000, ...over });

beforeEach(() => { vi.useFakeTimers(); still.on = false; });
afterEach(() => vi.useRealTimers());

describe('WorldProps (spec 2026-10-04 §4.5)', () => {
  it("every world's props are buttons, labelled in Chinese", () => {
    for (const w of WORLDS) {
      const { unmount } = render(<WorldProps world={w.id} {...props()} />);
      for (const m of MOMENTS[w.id]) expect(!!document.querySelector(`.world-props[data-world="${w.id}"] [role="button"][aria-label="${m.label}"]`), `${w.id}:${m.label}`).toBe(m.tap);
      unmount();
    }
  });
  it("the box in the tall grass shows the next animal once a day", () => {
    const onKid = vi.fn();
    const onSay = vi.fn();
    const { rerender } = render(<WorldProps world="grass" {...props({ onKid, onSay })} />);
    tap('纸箱');
    expect(onKid).toHaveBeenCalledWith(expect.objectContaining({ finds: expect.objectContaining({ animals: ['rat'] }) }));
    expect(document.querySelector('.tap-pop[data-animal="rat"]')).toBeTruthy();
    expect(onSay).toHaveBeenCalledWith('找到了！');
    act(() => { vi.advanceTimersByTime(2500); });
    const after = onKid.mock.calls[0]![0] as KidState;
    onKid.mockClear();
    rerender(<WorldProps world="grass" {...props({ kid: after, onKid, onSay })} />);
    tap('纸箱');
    expect(onKid).not.toHaveBeenCalled();
    expect(document.querySelector('.tap-pop[data-animal="rat"]')).toBeTruthy();
  });
  it('a tap during a moment is ignored (review focus 1)', () => {
    const onKid = vi.fn();
    render(<WorldProps world="pirate" {...props({ onKid })} />);
    tap('宝藏');
    tap('宝藏');
    expect(onKid).toHaveBeenCalledTimes(1);
  });
  it("the gem block cracks three times, then pops the day's gem; yesterday's taps don't count today (review focus 3)", () => {
    const onKid = vi.fn();
    const { rerender } = render(<WorldProps world="blocks" {...props({ onKid })} />);
    for (let i = 1; i <= 2; i++) { tap('宝石'); act(() => { vi.advanceTimersByTime(600); }); }
    expect(document.querySelectorAll('.tap-crack')).toHaveLength(2);
    rerender(<WorldProps world="blocks" {...props({ onKid, today: '2026-10-07' })} />);
    for (let i = 1; i <= 3; i++) { tap('宝石'); act(() => { vi.advanceTimersByTime(600); }); }
    expect(onKid).not.toHaveBeenCalled();
    tap('宝石');
    expect(onKid).toHaveBeenCalledWith(expect.objectContaining({ finds: expect.objectContaining({ gems: 1 }) }));
  });
  it('hides the prop while it moves and shows it again (review focus 2)', () => {
    render(<><WorldScene world="yard" time="afternoon" /><WorldProps world="yard" {...props()} /></>);
    const ball = () => document.querySelector<SVGElement>('.world-scene [data-prop="ball"]')!;
    tap('红球');
    expect(ball().style.visibility).toBe('hidden');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(ball().style.visibility).toBe('');
  });
  it('a prop hidden mid-moment comes back when Home goes away', () => {
    const { rerender } = render(<><WorldScene world="yard" time="afternoon" /><WorldProps world="yard" {...props()} /></>);
    tap('红球');
    rerender(<><WorldScene world="yard" time="afternoon" /></>);
    expect(document.querySelector<SVGElement>('.world-scene [data-prop="ball"]')!.style.visibility).toBe('');
  });
  it('some moments start by themselves on Home, and never give finds', () => {
    const onKid = vi.fn();
    const onReact = vi.fn();
    render(<WorldProps world="yard" {...props({ onKid, onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(1600); });
    expect(onReact).toHaveBeenCalled();
    expect(onKid).not.toHaveBeenCalled();
  });
  it('reduced motion: taps still find things, nothing starts by itself (review focus 5)', () => {
    still.on = true;
    const onKid = vi.fn();
    const onReact = vi.fn();
    render(<WorldProps world="pirate" {...props({ onKid, onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onReact).not.toHaveBeenCalled();
    tap('宝藏');
    expect(onKid).toHaveBeenCalledTimes(1);
  });
  it('the rocket counts down in Chinese', () => {
    render(<WorldProps world="space" {...props()} />);
    tap('火箭');
    expect(speak).toHaveBeenLastCalledWith('三，二，一！');
  });
  it('a moment that starts by itself never speaks out loud (the parrot only shows its hello)', () => {
    vi.mocked(speak).mockClear();
    const onReact = vi.fn();
    render(<WorldProps world="pirate" {...props({ onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(1600); });
    expect(onReact).toHaveBeenCalledWith('watch', -1);
    expect(speak).not.toHaveBeenCalled();
  });
  it('the sprinkler: Truffle flinches toward it, says 哇！, then laughs', () => {
    const onSay = vi.fn();
    const onReact = vi.fn();
    render(<WorldProps world="yard" {...props({ onSay, onReact })} />);
    tap('洒水器');
    expect(onReact).toHaveBeenCalledWith('flinch', -1);
    expect(onSay).toHaveBeenLastCalledWith('哇！');
    act(() => { vi.advanceTimersByTime(700); });
    expect(onSay).toHaveBeenLastCalledWith('哈哈哈！');
  });
  it("final review I1: a child's tap during a moment that started by itself plays the tapped one (no tap is lost)", () => {
    const onKid = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<WorldProps world="grass" {...props({ onKid, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(1100); }); // the butterfly starts by itself
    expect(document.querySelector('.world-props__fx')).toBeTruthy();
    tap('纸箱');
    expect(onKid).toHaveBeenCalledWith(expect.objectContaining({ finds: expect.objectContaining({ animals: ['rat'] }) }));
    vi.mocked(Math.random).mockRestore();
  });
  it('final review I1: moments start by themselves only when he has left the screen alone for a while', () => {
    const onReact = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<WorldProps world="yard" {...props({ onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(900); });
    fireEvent.pointerDown(document.body); // he is busy with Home
    act(() => { vi.advanceTimersByTime(300); }); // the timer comes round, but he touched the screen 300 ms ago
    expect(onReact).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onReact).toHaveBeenCalled();
    vi.mocked(Math.random).mockRestore();
  });
  it('sweep: a crack stays with its world — switching worlds clears it and brings back a hidden prop', () => {
    const { rerender } = render(<><WorldScene world="blocks" /><WorldProps world="blocks" {...props()} /></>);
    tap('宝石');
    expect(document.querySelector('.world-props__fx')).toBeTruthy();
    rerender(<><WorldScene world="yard" /><WorldProps world="yard" {...props()} /></>);
    expect(document.querySelector('.world-props__fx')).toBeNull();
    expect([...document.querySelectorAll<SVGElement>('.world-scene [style*="visibility"]')].filter((e) => e.style.visibility === 'hidden')).toHaveLength(0);
  });
  it('sweep: reduced motion switched on while Home is open stops moments starting by themselves', () => {
    const onReact = vi.fn();
    render(<WorldProps world="yard" {...props({ onReact, autoEvery: 1000 })} />);
    still.on = true;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onReact).not.toHaveBeenCalled();
  });
  it("sweep: the parrot's hello is Truffle's bubble line", () => {
    const onSay = vi.fn();
    render(<WorldProps world="pirate" {...props({ onSay, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(1600); });
    expect(onSay).toHaveBeenCalledWith('你好！');
  });
  it('sweep: a moment that starts by itself makes no sound', () => {
    vi.mocked(playSfx).mockClear();
    const onReact = vi.fn();
    vi.spyOn(Math, 'random').mockReturnValue(0); // the bowl
    render(<WorldProps world="yard" {...props({ onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(1100); });
    expect(onReact).toHaveBeenCalledWith('munch', expect.any(Number));
    expect(playSfx).not.toHaveBeenCalled();
    vi.mocked(Math.random).mockRestore();
  });
  it('sweep: nothing starts by itself while the page is hidden', () => {
    const onReact = vi.fn();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    render(<WorldProps world="yard" {...props({ onReact, autoEvery: 1000 })} />);
    act(() => { vi.advanceTimersByTime(5000); });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(onReact).not.toHaveBeenCalled();
  });
});
