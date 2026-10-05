import { describe, expect, it } from 'vitest';
import { playSfx, setSfxEnabled } from './sfx';

describe('sfx', () => {
  it('is silent and safe without Web Audio or when switched off', () => {
    setSfxEnabled(true);
    expect(() => playSfx('correct')).not.toThrow();
    setSfxEnabled(false);
    expect(() => playSfx('levelUp')).not.toThrow();
  });
});

describe('waking the sound on his first touch (sweep: the first stroke purred silently on the iPad)', () => {
  it('the first touch anywhere makes and resumes the audio context, then stops listening', async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
    const made: { state: string; resume: ReturnType<typeof vi.fn> }[] = [];
    class FakeCtx {
      state = 'suspended';
      resume = vi.fn(() => { this.state = 'running'; return Promise.resolve(); });
      constructor() { made.push(this); }
    }
    vi.stubGlobal('AudioContext', FakeCtx);
    const sfx = await import('./sfx');
    sfx.setSfxEnabled(true);
    sfx.armAudioWake();
    expect(made).toHaveLength(0); // nothing until he touches
    document.dispatchEvent(new Event('touchend'));
    expect(made).toHaveLength(1);
    expect(made[0]!.resume).toHaveBeenCalled();
    document.dispatchEvent(new Event('pointerup'));
    expect(made[0]!.resume).toHaveBeenCalledTimes(1); // woken once: the listeners are gone
    vi.unstubAllGlobals();
  });
});
