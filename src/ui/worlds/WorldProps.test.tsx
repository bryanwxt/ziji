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

describe('WorldProps on One River (spec 2026-10-13 §6; 2026-10-04 §4.5)', () => {
  it("every world's props are buttons in the 1000 box, labelled in Chinese", () => {
    for (const w of WORLDS) {
      const { unmount } = render(<WorldProps world={w.id} {...props()} />);
      expect(document.querySelector('.world-props')!.getAttribute('viewBox')).toBe('0 0 1000 1000');
      for (const m of MOMENTS[w.id]) expect(!!document.querySelector(`.world-props[data-world="${w.id}"] [role="button"][aria-label="${m.label}"]`), `${w.id}:${m.label}`).toBe(m.tap);
      unmount();
    }
  });
  it('the paper boat gives the next zodiac animal once a day; after that it only bobs', () => {
    const onKid = vi.fn();
    const onSay = vi.fn();
    const { rerender } = render(<WorldProps world="bamboo" {...props({ onKid, onSay })} />);
    tap('纸船');
    expect(onKid).toHaveBeenCalledWith(expect.objectContaining({ finds: expect.objectContaining({ animals: ['rat'] }) }));
    expect(document.querySelector('.tap-pop[data-animal="rat"]')).toBeTruthy();
    expect(onSay).toHaveBeenCalledWith('找到了！');
    act(() => { vi.advanceTimersByTime(2500); });
    const after = onKid.mock.calls[0]![0] as KidState;
    onKid.mockClear();
    rerender(<WorldProps world="bamboo" {...props({ kid: after, onKid, onSay })} />);
    tap('纸船');
    expect(onKid).not.toHaveBeenCalled();
    expect(document.querySelector('.tap-boat')).toBeTruthy();
    expect(document.querySelector('.tap-pop')).toBeNull();
  });
  it('a tap during a moment is ignored (review focus 1)', () => {
    const onKid = vi.fn();
    render(<WorldProps world="home" {...props({ onKid })} />);
    tap('纸船');
    tap('纸船');
    expect(onKid).toHaveBeenCalledTimes(1);
  });
  it('hides the boat while it bobs and shows it again (review focus 2)', () => {
    render(<><WorldScene world="home" time="afternoon" /><WorldProps world="home" {...props()} /></>);
    const boat = () => document.querySelector<SVGElement>('.world-scene [data-prop="boat"]')!;
    tap('纸船');
    expect(boat().style.visibility).toBe('hidden');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(boat().style.visibility).toBe('');
  });
  it('a prop hidden mid-moment comes back when Home goes away', () => {
    const { rerender } = render(<><WorldScene world="home" time="afternoon" /><WorldProps world="home" {...props()} /></>);
    tap('纸船');
    rerender(<><WorldScene world="home" time="afternoon" /></>);
    expect(document.querySelector<SVGElement>('.world-scene [data-prop="boat"]')!.style.visibility).toBe('');
  });
  it('reduced motion: a tap still finds the animal (review focus 5)', () => {
    still.on = true;
    const onKid = vi.fn();
    render(<WorldProps world="cove" {...props({ onKid })} />);
    tap('纸船');
    expect(onKid).toHaveBeenCalledTimes(1);
  });
  it('sweep: a moment stays with its world — switching worlds clears it and brings back a hidden prop', () => {
    const { rerender } = render(<><WorldScene world="lantern" time="morning" /><WorldProps world="lantern" {...props()} /></>);
    tap('纸船');
    expect(document.querySelector('.world-props__fx')).toBeTruthy();
    rerender(<><WorldScene world="home" time="morning" /><WorldProps world="home" {...props()} /></>);
    expect(document.querySelector('.world-props__fx')).toBeNull();
    expect([...document.querySelectorAll<SVGElement>('.world-scene [style*="visibility"]')].filter((e) => e.style.visibility === 'hidden')).toHaveLength(0);
  });
});
