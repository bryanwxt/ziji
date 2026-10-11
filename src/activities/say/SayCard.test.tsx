import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';
import { SayCard } from './SayCard';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
import { recordingSupported, startRecording } from '../../audio/recorder';
import { speak } from '../../audio/speech';

const sen = makeWord('森林', { id: 'w:森林', pinyin: 'sēn lín' });
let n = 0;
beforeEach(() => {
  n = 0;
  vi.mocked(speak).mockClear();
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockImplementation(async () => {
    const take = ++n;
    return { stop: async () => ({ blob: new Blob([`take ${take}`]), mime: 'audio/mp4', durationSec: take }), cancel: vi.fn() };
  });
});

async function record() {
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await screen.findByText('听一听！');
}

describe('a Say card (spec 2026-10-11 §3)', () => {
  it('shows the word with no pinyin and no options', () => {
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(document.querySelector('[data-q]')!.textContent).toBe('森林');
    expect(document.querySelector('.choice')).toBeNull();
    expect(document.body.textContent).not.toContain('sēn');
    expect(screen.getByText('继续').closest('button')!.disabled).toBe(true); // nothing to go on with before a take
  });
  it('he records; the model plays right after; 继续 hands over the take', async () => {
    const onDone = vi.fn();
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    await waitFor(() => expect(speak).toHaveBeenCalledWith('森林', { reading: 'sēn lín' }));
    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(1);
  });
  it('one re-record, and the last take is the one kept', async () => {
    const onDone = vi.fn();
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    fireEvent.click(screen.getByText('再录一次'));
    await record();
    expect(screen.queryByText('再录一次')).toBeNull();
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(2)); // the model after each take
    fireEvent.click(screen.getByText('继续'));
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(2);
  });
  it('a microphone that is refused skips the card', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    const onDone = vi.fn();
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={onDone} />);
    fireEvent.click(screen.getByText('开始录音'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('no microphone at all skips it straight away', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const onDone = vi.fn();
    render(<SayCard word={sen} kid={DEFAULT_KID} onDone={onDone} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
  });
});
