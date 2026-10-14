import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickMime, recordingSupported, startRecording } from './recorder';
import { MicDeniedError, MicStartError, MicTimeoutError } from './micErrors';

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
    const opening = startRecording(() => {}, (l) => levels.push(l));
    await vi.advanceTimersByTimeAsync(150); // Truffle's voice is given a moment to let go of the audio first
    const rec = await opening;
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
  it('waits for speech to let go of the audio before asking for the microphone', async () => {
    vi.useFakeTimers();
    const gum = vi.fn(async () => ({ getTracks: () => [] }));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: gum } });
    vi.stubGlobal('MediaRecorder', recorderClass());
    const opening = startRecording(() => {});
    await vi.advanceTimersByTimeAsync(100);
    expect(gum).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(gum).toHaveBeenCalledTimes(1);
    (await opening).cancel();
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
