import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';
import { SentenceCard } from './SentenceCard';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
import { recordingSupported, startRecording } from '../../audio/recorder';
import { speak } from '../../audio/speech';

const hen = makeWord('很', { pinyin: 'hěn' }); // the bank's example: 今天很热。
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
/** The Chinese a line shows (its Label's text, without the pinyin over it). */
const text = (sel: string) => document.querySelector(`${sel} .label`)?.getAttribute('data-zh') ?? null;

describe('说一句 (production practice spec §4)', () => {
  it('asks for a sentence with the word over its pattern; no model and no 继续 before a take', () => {
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(text('.say-sentence__prompt')).toBe('用『很』说一句话');
    expect(text('.say-sentence__pattern')).toBe('今天很…');
    expect(document.querySelector('.say-sentence__model')).toBeNull();
    expect(screen.getByText('继续').closest('button')!.disabled).toBe(true);
  });
  it('he records; then the model sentence shows and plays; 继续 hands over the take once', async () => {
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    expect(text('.say-sentence__model')).toBe('今天很热。');
    await waitFor(() => expect(speak).toHaveBeenCalledWith('今天很热。'));
    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(1);
  });
  it('the model never plays before or while he records', async () => {
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('停止'));
    await screen.findByText('听一听！');
    await waitFor(() => expect(speak).toHaveBeenCalledWith('今天很热。'));
  });
  it('one re-record, and the last take is the one kept', async () => {
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('再录一次'));
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(speak).toHaveBeenCalledTimes(1); // not again while the second take is recording
    fireEvent.click(screen.getByText('停止'));
    await screen.findByText('听一听！');
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(2)); // the model plays again after the second take
    expect(speak).toHaveBeenLastCalledWith('今天很热。');
    expect(screen.queryByText('再录一次')).toBeNull();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(2);
  });
  it('a refused microphone skips the card at once, with no note', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    fireEvent.click(screen.getByText('开始录音'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain('麦克风没有打开');
  });
  it('no microphone at all skips it straight away', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
  });
});
