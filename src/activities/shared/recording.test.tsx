import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BLOCKED_NOTE, MicButton, useRecorder } from './recording';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn() }));
import { stopSpeaking } from '../../audio/speech';
import { recordingNow } from '../../audio/speaking';
import { recordingSupported, startRecording } from '../../audio/recorder';

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
