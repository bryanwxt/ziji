import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { LangduStep } from './LangduStep';

vi.mock('../../audio/recorder', () => ({
  recordingSupported: vi.fn(() => true),
  startRecording: vi.fn(),
}));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

import { recordingSupported, startRecording } from '../../audio/recorder';
import { speak } from '../../audio/speech';

const passage = { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', source: 'parent' as const };
const oral = { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' };

beforeEach(() => {
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockImplementation(async (_stop, onLevel) => {
    onLevel?.(0.1);
    return { stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 5, ...(onLevel ? { level: 0.1 } : {}) }), cancel: vi.fn() };
  });
});

async function recordOnce() {
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await screen.findByText(/重录|继续/);
}

describe('LangduStep', () => {
  it('runs warm-up, echo by phrase, read and listen back, then reports both recordings', async () => {
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} warmups={0} knownChars={new Set()} kid={DEFAULT_KID} withWarmup onDone={onDone} />);
    expect(screen.getByText('老师好！')).toBeTruthy();
    expect(screen.getByText('我叫小明。我今年8岁。我在光明小学读二年级。')).toBeTruthy();
    expect(speak).toHaveBeenCalledWith('你好！');
    await recordOnce();
    fireEvent.click(screen.getByText('继续'));
    expect(screen.getByText('我爱爸爸，')).toBeTruthy();
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸，');
    fireEvent.click(screen.getByText('再听'));
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸，');
    fireEvent.click(screen.getByText('下一句'));
    expect(screen.getByText('我爱妈妈。')).toBeTruthy();
    fireEvent.click(screen.getByText('开始朗读'));
    expect(screen.getByText('我爱爸爸，我爱妈妈。')).toBeTruthy();
    fireEvent.click(screen.getByText('开始录音'));
    expect(await screen.findByRole('meter')).toBeTruthy();
    fireEvent.click(screen.getByText('停止'));
    expect(await screen.findByText('谢谢老师！')).toBeTruthy();
    fireEvent.click(screen.getByText('完成'));
    expect(onDone).toHaveBeenCalledWith({
      intro: expect.objectContaining({ durationSec: 5 }),
      read: expect.objectContaining({ level: 0.1 }),
    });
  });

  it('fades pinyin: unknown-only after 5 warm-ups, none after 10', () => {
    const py = () => [...document.querySelectorAll('.langdu__script .label__cell--zh')].map((c) => [c.querySelector('.label__ch')!.textContent, c.querySelector('.label__py')!.textContent]);
    const { unmount } = render(<LangduStep passage={passage} oral={oral} warmups={5} knownChars={new Set(['老', '师'])} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    const five = Object.fromEntries(py());
    expect(five['老']).toBe('');
    expect(five['师']).toBe('');
    expect(five['好']).toBe('hǎo');
    unmount();
    render(<LangduStep passage={passage} oral={oral} warmups={10} knownChars={new Set()} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    expect(py().every(([, p]) => p === '')).toBe(true);
  });

  it('without a microphone, explains and lets him finish', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} warmups={0} knownChars={new Set()} kid={DEFAULT_KID} withWarmup onDone={onDone} />);
    expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    fireEvent.click(screen.getByText('下一句'));
    fireEvent.click(screen.getByText('开始朗读'));
    expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy();
    fireEvent.click(screen.getByText('完成'));
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: null });
  });

  it('a refused microphone mid-step also falls back to the note', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    render(<LangduStep passage={passage} oral={oral} warmups={0} knownChars={new Set()} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByText('开始录音')); });
    await waitFor(() => expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy());
    expect((screen.getByText('继续').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('extra rounds skip the warm-up and the thanks', async () => {
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} warmups={0} knownChars={new Set()} kid={DEFAULT_KID} withWarmup={false} onDone={onDone} />);
    expect(screen.queryByText('老师好！')).toBeNull();
    expect(screen.getByText('我爱爸爸，')).toBeTruthy();
    fireEvent.click(screen.getByText('下一句'));
    fireEvent.click(screen.getByText('开始朗读'));
    await recordOnce();
    expect(screen.queryByText('谢谢老师！')).toBeNull();
    fireEvent.click(screen.getByText('完成'));
    fireEvent.click(screen.getByText('完成')); // a double tap saves the reading once (deferred minor, plan 8)
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: expect.objectContaining({ durationSec: 5 }) });
  });

  it('listen back is an app play button, not the grey browser player: plays, pauses, resets at the end, stops on leave', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { unmount } = render(<LangduStep passage={passage} oral={oral} warmups={0} knownChars={new Set()} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('下一句'));
    fireEvent.click(screen.getByText('开始朗读'));
    await recordOnce();
    expect(document.querySelector('audio[controls]')).toBeNull();
    const audio = document.querySelector('audio')!;
    expect(audio.getAttribute('src')).toMatch(/^blob:/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '听录音' })); });
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    expect(pause).toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '听录音' })); });
    act(() => { audio.dispatchEvent(new Event('ended')); });
    expect(screen.getByRole('button', { name: '听录音' })).toBeTruthy(); // back to play when it finishes
    pause.mockClear();
    unmount();
    expect(pause).toHaveBeenCalled();
    play.mockRestore();
    pause.mockRestore();
  });

  it('missing self-introduction details: just 老师好！ and 谢谢老师！', () => {
    render(<LangduStep passage={passage} oral={{ ...oral, school: '' }} warmups={0} knownChars={new Set()} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    expect(screen.getByText('老师好！')).toBeTruthy();
    expect(screen.queryByText(/我叫/)).toBeNull();
  });
  it('shows no meter and no 大声一点 until a real level arrives (a silent or blocked meter never nags)', async () => {
    vi.mocked(startRecording).mockImplementation(async () => ({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 5 }), cancel: vi.fn() }));
    render(<LangduStep passage={passage} oral={oral} warmups={0} knownChars={new Set()} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('下一句'));
    fireEvent.click(screen.getByText('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.queryByText('大声一点！')).toBeNull();
  });
  it('a double tap on 开始录音 starts one recording; leaving while the mic is starting releases it', async () => {
    let release!: () => void;
    const cancel = vi.fn();
    vi.mocked(startRecording).mockClear();
    vi.mocked(startRecording).mockImplementation(() => new Promise((res) => { release = () => res({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 5 }), cancel }); }));
    const { unmount } = render(<LangduStep passage={passage} oral={oral} warmups={0} knownChars={new Set()} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(screen.queryByText('开始录音') ?? document.body);
    expect(startRecording).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => release());
    expect(cancel).toHaveBeenCalled();
  });
});
