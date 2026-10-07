import { describe, expect, it, vi } from 'vitest';
import { createClipPlayer, LOAD_MS, PREFETCH_AT_ONCE } from './clipPlayer';

class FakeSource { buffer: { duration: number } | null = null; onended: (() => void) | null = null; started: number[] = []; stopped = false; connect() {} start(t: number) { this.started.push(t); } stop() { this.stopped = true; } }
class FakeContext {
  state = 'running'; currentTime = 10; destination = {}; sources: FakeSource[] = [];
  decodeAudioData = vi.fn(async (b: ArrayBuffer) => ({ duration: b.byteLength / 10 }));
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  resume = vi.fn(async () => {});
}
const setup = (load: (id: string) => Promise<ArrayBuffer> = vi.fn(async () => new ArrayBuffer(10))) => {
  const ac = new FakeContext();
  const player = createClipPlayer({ context: () => ac as unknown as AudioContext, load });
  return { ac, load, player };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('clip player', () => {
  it('plays the clips back to back with their pauses, then says it ended', async () => {
    const { ac, player } = setup();
    const onStart = vi.fn();
    const done = player.play([{ id: 'a' }, { pause: 0.3 }, { id: 'b' }], onStart);
    await tick();
    expect(ac.sources.map((s) => s.started[0])).toEqual([expect.closeTo(10.02, 5), expect.closeTo(11.32, 5)]);
    expect(onStart).toHaveBeenCalledOnce();
    ac.sources[1]!.onended!();
    expect(await done).toBe('ended');
  });
  it('a clip that will not load: failed, and nothing was played', async () => {
    const { ac, player } = setup(vi.fn(async () => { throw new Error('404'); }));
    expect(await player.play([{ id: 'a' }, { id: 'b' }])).toBe('failed');
    expect(ac.sources).toHaveLength(0);
  });
  it('stop() cuts it off: stopped', async () => {
    const { ac, player } = setup();
    const done = player.play([{ id: 'a' }]);
    await tick();
    player.stop();
    expect(await done).toBe('stopped');
    expect(ac.sources[0]!.stopped).toBe(true);
  });
  it('a new line stops the one playing', async () => {
    const { player } = setup();
    const first = player.play([{ id: 'a' }]);
    await tick();
    void player.play([{ id: 'b' }]);
    expect(await first).toBe('stopped');
  });
  it('no audio context, or one that will not wake: failed', async () => {
    expect(await createClipPlayer({ context: () => null, load: async () => new ArrayBuffer(1) }).play([{ id: 'a' }])).toBe('failed');
    const { ac, player } = setup();
    ac.state = 'suspended';
    expect(await player.play([{ id: 'a' }])).toBe('failed');
  });
  it('a clip heard before is not fetched again', async () => {
    const { ac, load, player } = setup();
    void player.play([{ id: 'a' }]); await tick(); ac.sources[0]!.onended!();
    void player.play([{ id: 'a' }]); await tick();
    expect(load).toHaveBeenCalledOnce();
  });
  it('prefetch fetches without playing', async () => {
    const { ac, load, player } = setup();
    player.prefetch(['x', 'y']);
    await tick();
    expect(load).toHaveBeenCalledTimes(2);
    expect(ac.sources).toHaveLength(0);
  });
});

describe('clip player, slow network (final review I2)', () => {
  it('a clip that never arrives: failed, so the iPad voice says it', async () => {
    vi.useFakeTimers();
    try {
      const { player } = setup(vi.fn(() => new Promise<ArrayBuffer>(() => {})));
      const done = player.play([{ id: 'a' }]);
      await vi.advanceTimersByTimeAsync(LOAD_MS + 100);
      expect(await done).toBe('failed');
    } finally {
      vi.useRealTimers();
    }
  });
});

// parent 2026-10-07 (iPhone, mobile data): the sound button was sometimes silent and the voice sometimes changed — a clip that missed
// its slot went to the iPad voice, which sounds different and is muted by the silent switch
describe('clip player keeps to the clip voice', () => {
  it('a clip that takes 2.5 s on mobile data still plays as the clip', async () => {
    vi.useFakeTimers();
    try {
      const { ac, player } = setup(vi.fn(() => new Promise<ArrayBuffer>((r) => setTimeout(() => r(new ArrayBuffer(10)), 2500))));
      const done = player.play([{ id: 'a' }]);
      await vi.advanceTimersByTimeAsync(2600);
      expect(ac.sources).toHaveLength(1);
      ac.sources[0]!.onended!();
      expect(await done).toBe('ended');
    } finally {
      vi.useRealTimers();
    }
  });
  it('a clip already on its way (the lesson prefetch) is not fetched again', async () => {
    let arrive!: (b: ArrayBuffer) => void;
    const load = vi.fn(() => new Promise<ArrayBuffer>((r) => { arrive = r; }));
    const { ac, player } = setup(load);
    player.prefetch(['a']);
    const done = player.play([{ id: 'a' }]);
    arrive(new ArrayBuffer(10));
    await tick(); await tick();
    expect(load).toHaveBeenCalledOnce();
    ac.sources[0]!.onended!();
    expect(await done).toBe('ended');
  });
  it('the prefetch fetches a few at a time, and a line he asks for goes ahead of the queue', async () => {
    const waits: (() => void)[] = [];
    const load = vi.fn((id: string) => new Promise<ArrayBuffer>((r) => waits.push(() => r(new ArrayBuffer(id.length)))));
    const { player } = setup(load);
    player.prefetch(Array.from({ length: 20 }, (_, i) => `p${i}`));
    expect(load).toHaveBeenCalledTimes(PREFETCH_AT_ONCE);
    void player.play([{ id: 'now' }]);
    expect(load).toHaveBeenLastCalledWith('now');
    waits[0]!(); await tick(); await tick();
    expect(load).toHaveBeenCalledTimes(PREFETCH_AT_ONCE + 2); // the next prefetch starts as one finishes
  });
  it('an audio engine slow to wake (the phone just unlocked) still plays the clip', async () => {
    vi.useFakeTimers();
    try {
      const { ac, player } = setup();
      ac.state = 'suspended';
      ac.resume = vi.fn(() => new Promise<void>((r) => setTimeout(() => { ac.state = 'running'; r(); }, 700)));
      const done = player.play([{ id: 'a' }]);
      await vi.advanceTimersByTimeAsync(800);
      expect(ac.sources).toHaveLength(1);
      ac.sources[0]!.onended!();
      expect(await done).toBe('ended');
    } finally {
      vi.useRealTimers();
    }
  });
});
