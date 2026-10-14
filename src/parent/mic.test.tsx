import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { BackupPanel } from './BackupPanel';
import { ListenPanel } from './ListenPanel';
import { MicTest } from './MicTest';

vi.mock('../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
import { startRecording } from '../audio/recorder';
import { MicDeniedError } from '../audio/micErrors';
import { clearMicFailure, type MicFailure } from '../audio/micFailure';

const failure = (at: number, over: Partial<MicFailure> = {}): MicFailure => ({
  at, stage: 'getUserMedia', name: 'NotAllowedError', message: '', kind: 'denied', mime: 'audio/mp4', mp4: true, webm: false, standalone: true, permission: 'denied', visibility: 'visible', ...over,
});
const keep = (f: MicFailure) => localStorage.setItem('ziji-mic-failure', JSON.stringify(f));

beforeEach(() => {
  clearMicFailure();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.mocked(startRecording).mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('the microphone, for the parent (mic fix 2026-10-14)', () => {
  it('Listen & confirm says when the mic did not start today, and how to fix it', async () => {
    keep(failure(new Date(2026, 9, 2, 8, 15).getTime()));
    renderWithApp(<ListenPanel />, await makeAppData());
    const line = await screen.findByText(/Mic didn't start today/);
    expect(line.textContent).toContain('permission denied (Home-Screen app)');
    expect(line.textContent).toContain('Settings › Apps › Safari › Microphone');
  });
  it('an old failure is not news on Listen & confirm, but Backup keeps the last one by the error log', async () => {
    keep(failure(new Date(2026, 9, 1, 18).getTime(), { kind: 'transient', stage: 'timeout', name: 'TimeoutError' }));
    const app = await makeAppData();
    const { unmount } = renderWithApp(<ListenPanel />, app);
    await screen.findByText('Listen & confirm');
    expect(screen.queryByText(/Mic didn't start today/)).toBeNull();
    unmount();
    renderWithApp(<BackupPanel />, app);
    expect(screen.getByText(/Last microphone problem/).closest('p')!.textContent).toContain('no answer');
  });
  it('Test microphone records, plays it back and says it works, letting go of the mic', async () => {
    const cancel = vi.fn();
    const stop = vi.fn(async () => ({ blob: new Blob(['abc']), mime: 'audio/mp4', durationSec: 2 }));
    vi.mocked(startRecording).mockResolvedValue({ stop, cancel });
    render(<MicTest recordMs={20} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test microphone' }));
    await screen.findByText(/Mic works ✓/);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
  it('Test microphone shows why it failed, with the fix', async () => {
    vi.mocked(startRecording).mockRejectedValue(new MicDeniedError(new DOMException('no', 'NotAllowedError')));
    render(<MicTest recordMs={20} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test microphone' }));
    const msg = await screen.findByRole('alert');
    expect(msg.textContent).toContain('permission denied');
    expect(msg.textContent).toContain('Microphone → Ask or Allow');
    await waitFor(() => expect(localStorage.getItem('ziji-mic-failure')).toContain('NotAllowedError'));
  });
});
