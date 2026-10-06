import { afterEach, describe, expect, it, vi } from 'vitest';
import { audioAsleep, audioContext, resetAudioContextForTests } from './context';

class FakeAC { state = 'suspended'; resume = vi.fn(async () => { this.state = 'running'; }); }

describe('the shared audio context', () => {
  afterEach(() => { vi.unstubAllGlobals(); resetAudioContextForTests(); });
  it('one context for sound effects and clips, woken when asked for', () => {
    vi.stubGlobal('AudioContext', FakeAC);
    const a = audioContext();
    expect(a).toBe(audioContext());
    expect((a as unknown as FakeAC).resume).toHaveBeenCalled();
  });
  it('plays even with the iPad on silent: the audio session is playback', () => {
    vi.stubGlobal('AudioContext', FakeAC);
    const session = { type: 'auto' };
    vi.stubGlobal('navigator', { ...navigator, audioSession: session });
    audioContext();
    expect(session.type).toBe('playback');
  });
  it('no Web Audio: null, and counted asleep', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(audioContext()).toBeNull();
    expect(audioAsleep()).toBe(true);
  });
});
