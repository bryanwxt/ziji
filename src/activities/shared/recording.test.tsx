import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BLOCKED_NOTE, MicButton, useRecorder } from './recording';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn() }));
import { stopSpeaking } from '../../audio/speech';
import { recordingNow } from '../../audio/speaking';
import { recordingSupported, startRecording } from '../../audio/recorder';
import { MicDeniedError, MicTimeoutError } from '../../audio/micErrors';
import { clearMicFailure, readMicFailure } from '../../audio/micFailure';
import { clearErrorLog, readErrorLog } from '../../app/errorLog';

function Harness() {
  const rec = useRecorder();
  return (
    <div>
      <MicButton rec={rec} withLevel={false} />
      <span data-testid="state">{rec.state}</span>
    </div>
  );
}

beforeEach(() => {
  clearErrorLog();
  clearMicFailure();
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockResolvedValue({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 }), cancel: vi.fn() });
});

describe('shared recorder', () => {
  it('one tap records; 停止 finishes', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    await screen.findByText('done');
    expect(startRecording).toHaveBeenCalledTimes(1);
  });
  it('a double tap while the mic opens starts one recording', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(screen.queryByText('开始录音') ?? document.body);
    await screen.findByText('停止');
    expect(startRecording).toHaveBeenCalledTimes(1);
  });
  it('no microphone: the blocked note', () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    render(<Harness />);
    expect(screen.getByText(BLOCKED_NOTE)).toBeTruthy();
  });
  it("starting a recording silences Truffle first, so his voice isn't recorded into the answer", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(stopSpeaking).toHaveBeenCalled();
  });
});

describe('the recording flag (final review C1): speech is silent only while he is recorded', () => {
  it('set while recording, cleared on stop', async () => {
    render(<Harness />);
    expect(recordingNow()).toBe(false);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(recordingNow()).toBe(true);
    fireEvent.click(screen.getByText('停止'));
    await screen.findByText('done');
    expect(recordingNow()).toBe(false);
  });
  it('cleared when he leaves mid-recording', async () => {
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(recordingNow()).toBe(true);
    unmount();
    expect(recordingNow()).toBe(false);
  });
  it('cleared when stopping fails', async () => {
    vi.mocked(startRecording).mockResolvedValue({ stop: async () => { throw new Error('no data'); }, cancel: vi.fn() });
    render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    fireEvent.click(screen.getByText('停止'));
    await waitFor(() => expect(recordingNow()).toBe(false));
  });
});

describe('a microphone that fails to start (mic fix 2026-10-14)', () => {
  const ok = { stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 }), cancel: vi.fn() };
  const busy = () => new DOMException('busy', 'NotReadableError');
  it('only a refusal blocks it: no second ask', async () => {
    vi.mocked(startRecording).mockRejectedValue(new MicDeniedError(new DOMException('no', 'NotAllowedError')));
    render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText(BLOCKED_NOTE);
    expect(startRecording).toHaveBeenCalledTimes(1);
  });
  it('a passing failure is tried again once, by itself', async () => {
    vi.mocked(startRecording).mockRejectedValueOnce(busy()).mockResolvedValueOnce(ok);
    render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止', {}, { timeout: 2000 });
    expect(startRecording).toHaveBeenCalledTimes(2);
    expect(readMicFailure()).toBeNull(); // fixed by the retry: not news for the parent
    expect(readErrorLog()).toEqual([]);
  });
  it('failing twice: back to ready with 再试一次, and the next tap asks again', async () => {
    vi.mocked(startRecording).mockRejectedValueOnce(busy()).mockRejectedValueOnce(busy()).mockResolvedValueOnce(ok);
    render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('再试一次', {}, { timeout: 2000 }));
    expect(screen.getByTestId('state').textContent).not.toBe('blocked');
    await screen.findByText('停止');
    expect(startRecording).toHaveBeenCalledTimes(3);
  });
  it('a timeout (the prompt still open) is not retried by itself: straight to 再试一次, and the next tap asks again', async () => {
    vi.mocked(startRecording).mockRejectedValueOnce(new MicTimeoutError()).mockResolvedValueOnce(ok);
    render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('再试一次');
    expect(startRecording).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(readMicFailure()).toMatchObject({ kind: 'transient', stage: 'timeout' }));
    fireEvent.click(screen.getByText('再试一次'));
    await screen.findByText('停止');
    expect(startRecording).toHaveBeenCalledTimes(2);
  });
  it('a failure is logged and kept for the parent: what, where and the iPad\'s state', async () => {
    vi.mocked(startRecording).mockRejectedValue(new MicDeniedError(new DOMException('no', 'NotAllowedError')));
    render(<Harness />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText(BLOCKED_NOTE);
    expect(readErrorLog()[0]!.message).toContain('NotAllowedError');
    await waitFor(() => expect(readMicFailure()).toMatchObject({ kind: 'denied', stage: 'getUserMedia', name: 'NotAllowedError', message: 'no', visibility: 'visible' }));
  });
});
