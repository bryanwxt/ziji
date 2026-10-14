import { afterEach, describe, expect, it, vi } from 'vitest';
import { MicDeniedError, MicStartError, MicTimeoutError, MicUnsupportedError } from './micErrors';
import { clearMicFailure, describeMicFailure, readMicFailure, recordMicFailure } from './micFailure';

afterEach(() => { vi.unstubAllGlobals(); clearMicFailure(); });

describe('the last microphone failure (mic fix 2026-10-14)', () => {
  it('keeps what failed, where, and the state of the iPad at the time', async () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (m: string) => m === 'audio/mp4' });
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('standalone') }));
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: vi.fn(async () => ({ state: 'denied' })) } });
    await recordMicFailure(new MicDeniedError(new DOMException('no', 'NotAllowedError')), 'lesson', 1234);
    expect(readMicFailure()).toEqual({
      at: 1234, stage: 'getUserMedia', name: 'NotAllowedError', message: 'no', kind: 'denied', mime: 'audio/mp4',
      mp4: true, webm: false, standalone: true, permission: 'denied', visibility: 'visible', origin: 'lesson',
    });
  });
  it('never throws: no permissions API, no MediaRecorder', async () => {
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined });
    vi.stubGlobal('MediaRecorder', undefined);
    await recordMicFailure(new Error('odd'), 'test', 5);
    expect(readMicFailure()).toMatchObject({ kind: 'transient', stage: 'start', permission: 'unknown', mime: '', origin: 'test' });
  });
  it('says what happened and what to do, for each kind', () => {
    const base = { at: 0, message: '', mime: '', mp4: true, webm: false, permission: 'prompt', visibility: 'visible', origin: 'lesson' } as const;
    const denied = describeMicFailure({ ...base, kind: 'denied', stage: 'getUserMedia', name: 'NotAllowedError', standalone: true });
    expect(denied.what).toContain('permission denied (Home-Screen app)');
    expect(denied.fix).toContain('Settings › Apps › Safari › Microphone'); // iPadOS 18
    expect(denied.fix).toContain('Settings › Safari › Microphone'); // iPadOS 17
    const safari = describeMicFailure({ ...base, kind: 'denied', stage: 'getUserMedia', name: 'NotAllowedError', standalone: false });
    expect(safari.fix).toContain('the page menu at the left of the address bar');
    expect(describeMicFailure({ ...base, kind: 'unsupported', stage: 'getUserMedia', name: 'NotSupportedError', standalone: false }).what).toContain("This iPad/browser can't record");
    expect(describeMicFailure({ ...base, kind: 'transient', stage: 'timeout', name: 'TimeoutError', standalone: true }).what).toContain('no answer');
    expect(describeMicFailure({ ...base, kind: 'transient', stage: 'getUserMedia', name: 'NotReadableError', standalone: false }).what).toContain('busy');
    expect(new MicTimeoutError()).toBeInstanceOf(MicStartError);
  });
  it('no way to record is its own kind', async () => {
    await recordMicFailure(new MicUnsupportedError(), 'test', 1);
    expect(readMicFailure()!.kind).toBe('unsupported');
  });
});
