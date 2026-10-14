import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickMime, recordingSupported, startRecording } from './recorder';
import { MicDeniedError, MicStartError, MicTimeoutError, MicUnsupportedError } from './micErrors';

describe('recorder support', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('prefers mp4 audio, falling back to webm', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (m: string) => m === 'audio/webm' });
    expect(pickMime()).toBe('audio/webm');
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
    expect(pickMime()).toBe('audio/mp4');
  });
  it('reports no support without MediaRecorder', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(pickMime()).toBe('');
    expect(recordingSupported()).toBe(false);
  });
});

describe('recording levels', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('reports the microphone level while recording and averages it on stop', async () => {
    vi.useFakeTimers();
    const track = { stop: vi.fn() };
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) } });
    class FakeRecorder {
      static isTypeSupported = () => true;
      mimeType = 'audio/mp4'; state = 'recording';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {}
      stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['x']) }); this.onstop?.(); }
    }
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    const close = vi.fn(async () => {});
    class FakeCtx {
      createMediaStreamSource() { return { connect: () => {} }; }
      createAnalyser() { return { fftSize: 4, getFloatTimeDomainData: (b: Float32Array) => b.forEach((_, i) => (b[i] = i % 2 ? -0.5 : 0.5)) }; }
      close = close;
    }
    vi.stubGlobal('AudioContext', FakeCtx);
    const levels: number[] = [];
    const rec = await startRecording(() => {}, (l) => levels.push(l)); // not speaking: the mic opens at once
    vi.advanceTimersByTime(350);
    expect(levels.length).toBe(3);
    expect(levels[0]).toBeCloseTo(0.5);
    const done = await rec.stop();
    expect(done.level).toBeCloseTo(0.5);
    expect(close).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
  });
  it('creates the audio context during the tap, before waiting for the microphone (iPad Safari only starts audio in a gesture)', async () => {
    const order: string[] = [];
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => { order.push('mic'); return { getTracks: () => [] }; }) } });
    vi.stubGlobal('MediaRecorder', class { static isTypeSupported = () => true; mimeType = ''; state = 'inactive'; start() {} stop() {} });
    vi.stubGlobal('AudioContext', class {
      constructor() { order.push('ctx'); }
      resume = vi.fn(async () => {});
      createMediaStreamSource() { return { connect: () => {} }; }
      createAnalyser() { return { fftSize: 4, getFloatTimeDomainData: () => {} }; }
      close = vi.fn(async () => {});
    });
    const rec = await startRecording(() => {}, () => {});
    expect(order).toEqual(['ctx', 'mic']);
    rec.cancel();
  });
  it('if iOS already ended the recording (app switched, Siri), stop() still finishes with what was captured', async () => {
    const track = { stop: vi.fn() };
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) } });
    let inst: { ondataavailable?: (e: { data: Blob }) => void; onstop?: () => void; state: string } | null = null;
    vi.stubGlobal('MediaRecorder', class {
      static isTypeSupported = () => true;
      mimeType = 'audio/mp4'; state = 'recording';
      ondataavailable?: (e: { data: Blob }) => void; onstop?: () => void;
      constructor() { inst = this as never; }
      start() {}
      stop() { throw new Error('InvalidStateError'); }
    });
    const rec = await startRecording(() => {});
    inst!.ondataavailable?.({ data: new Blob(['abc']) });
    inst!.state = 'inactive';
    inst!.onstop?.(); // the system stopped it
    const done = await Promise.race([rec.stop(), new Promise((r) => setTimeout(() => r('hung'), 200))]);
    expect(done).not.toBe('hung');
    expect((done as { blob: Blob }).blob.size).toBe(3);
    expect(track.stop).toHaveBeenCalled();
  });
});

describe('a recorder that fails to start (deferred minor, plan 8)', () => {
  it('lets go of the microphone and the meter', async () => {
    const track = { stop: vi.fn() };
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) } });
    vi.stubGlobal('MediaRecorder', class { static isTypeSupported = () => true; constructor() { throw new Error('NotSupported'); } });
    const close = vi.fn(async () => {});
    vi.stubGlobal('AudioContext', class {
      resume = vi.fn(async () => {});
      createMediaStreamSource() { return { connect: () => {} }; }
      createAnalyser() { return { fftSize: 4, getFloatTimeDomainData: () => {} }; }
      close = close;
    });
    await expect(startRecording(() => {}, () => {})).rejects.toThrow();
    expect(track.stop).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});

describe('opening the microphone (mic fix 2026-10-14)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  const recorderClass = () => class { static isTypeSupported = () => true; mimeType = ''; state = 'inactive'; start() {} stop() {} };
  it('asks for the microphone inside the tap when nothing was speaking (iPad Safari gesture)', () => {
    const gum = vi.fn(async () => ({ getTracks: () => [] }));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: gum } });
    vi.stubGlobal('MediaRecorder', recorderClass());
    void startRecording(() => {}).then((r) => r.cancel());
    expect(gum).toHaveBeenCalledTimes(1); // synchronously, before any await
  });
  it('Truffle was speaking at the tap: waits for the audio to let go, at most ~300 ms', async () => {
    vi.useFakeTimers();
    const gum = vi.fn(async () => ({ getTracks: () => [] }));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: gum } });
    vi.stubGlobal('MediaRecorder', recorderClass());
    vi.stubGlobal('speechSynthesis', { speaking: true }); // never stops
    const opening = startRecording(() => {}, undefined, { wasSpeaking: true });
    await vi.advanceTimersByTimeAsync(100);
    expect(gum).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);
    expect(gum).toHaveBeenCalledTimes(1);
    (await opening).cancel();
  });
  it("uses the caller's meter context (made in the tap), wakes it once the mic is open, and leaves it open on a failure", async () => {
    const order: string[] = [];
    const ctx = { resume: vi.fn(async () => { order.push('resume'); }), close: vi.fn(async () => {}), createMediaStreamSource: () => ({ connect: () => {} }), createAnalyser: () => ({ fftSize: 4, getFloatTimeDomainData: () => {} }) };
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('a second context'); } });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => { order.push('mic'); return { getTracks: () => [] }; }) } });
    vi.stubGlobal('MediaRecorder', recorderClass());
    const rec = await startRecording(() => {}, () => {}, { meterCtx: ctx as unknown as AudioContext });
    expect(order).toEqual(['mic', 'resume']);
    rec.cancel();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => { throw new DOMException('busy', 'NotReadableError'); }) } });
    ctx.close.mockClear();
    await startRecording(() => {}, () => {}, { meterCtx: ctx as unknown as AudioContext }).catch(() => {});
    expect(ctx.close).not.toHaveBeenCalled(); // the retry will use it
  });
  it('the permission question still on screen: a long wait while he decides, but never stuck for good', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(() => new Promise(() => {})) }, permissions: { query: async () => ({ state: 'prompt' }) } });
    vi.stubGlobal('MediaRecorder', recorderClass());
    let failed: unknown = null;
    startRecording(() => {}).catch((e) => { failed = e; });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(failed).toBe(null);
    await vi.advanceTimersByTimeAsync(16_000);
    expect(failed).toBeInstanceOf(MicTimeoutError);
  });
  it('no way to record at all is its own error', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('MediaRecorder', recorderClass());
    await expect(startRecording(() => {})).rejects.toBeInstanceOf(MicUnsupportedError);
  });
  it('permission already granted, or no permission query at all: the 10 s limit still applies', async () => {
    vi.useFakeTimers();
    for (const permissions of [{ query: async () => ({ state: 'granted' }) }, { query: async () => { throw new TypeError('microphone'); } }]) {
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(() => new Promise(() => {})) }, permissions });
      vi.stubGlobal('MediaRecorder', recorderClass());
      const failed = expect(startRecording(() => {})).rejects.toBeInstanceOf(MicTimeoutError);
      await vi.advanceTimersByTimeAsync(10_200);
      await failed;
    }
  });
  it('a prompt nobody answers times out after 10 s; a stream that comes later is let go at once', async () => {
    vi.useFakeTimers();
    let answer: (s: unknown) => void = () => {};
    const track = { stop: vi.fn() };
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(() => new Promise((ok) => { answer = ok; })) } });
    vi.stubGlobal('MediaRecorder', recorderClass());
    const opening = startRecording(() => {});
    const failed = expect(opening).rejects.toBeInstanceOf(MicTimeoutError);
    await vi.advanceTimersByTimeAsync(10_200);
    await failed;
    await opening.catch((e: MicStartError) => expect(e.stage).toBe('timeout'));
    answer({ getTracks: () => [track] });
    await vi.advanceTimersByTimeAsync(0);
    expect(track.stop).toHaveBeenCalled();
  });
  it('a refusal is MicDeniedError, keeping the browser\'s name; anything else keeps its stage', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => { throw new DOMException('denied by user', 'NotAllowedError'); }) } });
    vi.stubGlobal('MediaRecorder', recorderClass());
    const denied = await startRecording(() => {}).catch((e: unknown) => e);
    expect(denied).toBeInstanceOf(MicDeniedError);
    expect(denied).toMatchObject({ name: 'NotAllowedError', message: 'denied by user', stage: 'getUserMedia' });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => { throw new DOMException('busy', 'NotReadableError'); }) } });
    const busy = await startRecording(() => {}).catch((e: unknown) => e);
    expect(busy).not.toBeInstanceOf(MicDeniedError);
    expect(busy).toMatchObject({ name: 'NotReadableError', stage: 'getUserMedia' });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [] })) } });
    vi.stubGlobal('MediaRecorder', class { static isTypeSupported = () => true; constructor() { throw new DOMException('no', 'NotSupportedError'); } });
    expect(await startRecording(() => {}).catch((e: unknown) => e)).toMatchObject({ name: 'NotSupportedError', stage: 'MediaRecorder' });
  });
});
