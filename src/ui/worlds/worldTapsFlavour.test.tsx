import { act, fireEvent, render } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FINDS } from '../../fun/finds';
import { DEFAULT_KID, type KidState } from '../../types';
import { WorldTaps } from './WorldTaps';

vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../motion', async (orig) => ({ ...(await orig<typeof import('../motion')>()), reducedMotion: vi.fn(() => false) }));
import { reducedMotion } from '../motion';

const kid = (over: Partial<KidState> = {}): KidState => ({ ...DEFAULT_KID, finds: { ...DEFAULT_FINDS }, ...over });
const tap = (label: string) => fireEvent.click(document.querySelector(`.world-taps [aria-label="${label}"]`)!);
beforeEach(() => vi.useFakeTimers());

describe('world tap details (deferred minors, plan 7)', () => {
  it('with reduced motion the sea fish fades in where it can be seen, not off the left edge', () => {
    vi.mocked(reducedMotion).mockReturnValue(true);
    render(<WorldTaps world="sea" kid={kid()} today="2026-10-06" onKid={vi.fn()} onSay={vi.fn()} />);
    tap('潜水艇');
    const fish = [...document.querySelectorAll('.world-taps__fx g')].find((g) => g.innerHTML.includes('#9fcf90'))!;
    const x = Number(/translate\((-?\d+)/.exec(fish.getAttribute('transform')!)![1]);
    expect(x).toBeGreaterThanOrEqual(0);
  });
  it('the yard sprinkler: Truffle flinches, then laughs', () => {
    vi.mocked(reducedMotion).mockReturnValue(false);
    const onSay = vi.fn();
    render(<WorldTaps world="yard" kid={kid()} today="2026-10-06" onKid={vi.fn()} onSay={onSay} />);
    tap('洒水器');
    expect(onSay).toHaveBeenLastCalledWith('哇！');
    act(() => vi.advanceTimersByTime(800));
    expect(onSay).toHaveBeenLastCalledWith('哈哈哈！');
  });
  it('the pirate X: Truffle digs too', () => {
    const onSay = vi.fn();
    render(<WorldTaps world="pirate" kid={kid({ finds: { ...DEFAULT_FINDS, lastDigDate: '2026-10-06' } })} today="2026-10-06" onKid={vi.fn()} onSay={onSay} />);
    tap('宝藏');
    expect(onSay).toHaveBeenCalledWith('挖呀挖！');
  });
});
