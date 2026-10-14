import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';
import { SentenceCard } from './SentenceCard';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
import { recordingSupported, startRecording } from '../../audio/recorder';
import { MicDeniedError } from '../../audio/micErrors';
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
  it('he records; the model waits for 听一听例句; 继续 hands over the take once', async () => {
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    expect(document.querySelector('.say-sentence__model')).toBeNull();
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('听一听例句'));
    expect(text('.say-sentence__model')).toBe('今天很热。');
    await waitFor(() => expect(speak).toHaveBeenCalledWith('今天很热。'));
    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(1);
  });
  it('the model is neither shown nor spoken before 听一听例句 or the re-record; 继续 works without it', async () => {
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('停止'));
    await screen.findByText('听一听！');
    expect(speak).not.toHaveBeenCalled();
    expect(document.querySelector('.say-sentence__model')).toBeNull();
    expect(screen.getByText('再录一次')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('there is no 再录一次 once the model is shown', async () => {
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={vi.fn()} />);
    await record();
    fireEvent.click(screen.getByText('听一听例句'));
    expect(screen.queryByText('再录一次')).toBeNull();
    expect(screen.queryByText('听一听例句')).toBeNull();
  });
  it('one re-record, the last take is kept, and after it the model appears and plays', async () => {
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    await record();
    fireEvent.click(screen.getByText('再录一次'));
    expect(document.querySelector('.say-sentence__model')).toBeNull();
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('停止'));
    await screen.findByText('听一听！');
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
    expect(speak).toHaveBeenLastCalledWith('今天很热。');
    expect(text('.say-sentence__model')).toBe('今天很热。');
    expect(screen.queryByText('再录一次')).toBeNull();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone.mock.calls[0]![0].take.durationSec).toBe(2);
  });
  it('a refused microphone shows the note once; 继续 goes on without a take (mic fix 2026-10-14)', async () => {
    vi.mocked(startRecording).mockRejectedValue(new MicDeniedError());
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('麦克风没有打开。我们下次再录！');
    expect(onDone).not.toHaveBeenCalled(); // never skipped silently
    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(null);
  });
  it('a passing failure is never a skip: 再试一次 and the card stays', async () => {
    vi.mocked(startRecording).mockRejectedValue(new DOMException('busy', 'NotReadableError'));
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('再试一次', {}, { timeout: 2000 });
    expect(onDone).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('麦克风没有打开');
    fireEvent.click(screen.getByText('继续')); // still failing: he may go on — this card only, never a refusal
    expect(onDone).toHaveBeenCalledWith('skip');
  });
  it('no microphone at all: the note, and 继续 goes on', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const onDone = vi.fn();
    render(<SentenceCard word={hen} kid={DEFAULT_KID} onDone={onDone} />);
    expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
  });
});
