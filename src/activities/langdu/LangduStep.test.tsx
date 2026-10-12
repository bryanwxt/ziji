import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../../audio/speaking';
import { DEFAULT_KID } from '../../types';
import { LangduStep } from './LangduStep';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

import { recordingSupported, startRecording } from '../../audio/recorder';
import { speak, stopSpeaking } from '../../audio/speech';

const question = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'] as [string, string, string], answer: 1 as const };
const passage = { id: 'pp:1', title: '我家', text: '我爱爸爸。我爱妈妈。', source: 'parent' as const, question };
const oral = { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' };
let takes: { level: number; durationSec: number }[] = [];

beforeEach(() => {
  vi.mocked(speak).mockClear();
  vi.mocked(recordingSupported).mockReturnValue(true);
  takes = [];
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockImplementation(async (_stop, onLevel) => {
    onLevel?.(0.1);
    const t = takes.shift() ?? { level: 0.1, durationSec: 10 };
    return { stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: t.durationSec, ...(onLevel ? { level: t.level } : {}) }), cancel: vi.fn() };
  });
});
afterEach(() => act(() => setSpeaking(false)));

const button = (text: string) => screen.getByText(text).closest('button') as HTMLButtonElement;
const lit = () => [...document.querySelectorAll('.langdu__sentence')].findIndex((e) => e.classList.contains('is-reading'));
/** The model reads `n` sentences: each voice starts, then ends. */
const modelReads = (n: number) => {
  for (let i = 0; i < n; i++) {
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
  }
};
async function record() {
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
}
/** Listen through, then read once: on Compare. */
async function toCompare() {
  modelReads(2);
  fireEvent.click(button('开始朗读'));
  await record();
  await screen.findByRole('button', { name: '听我的' });
}

describe('LangduStep (spec 2026-10-12 §3)', () => {
  it('day 1: warm-up, the sentence lit while it is read, read, compare, one re-read keeping the better take, the question', async () => {
    takes = [{ level: 0, durationSec: 4 }, { level: 0.05, durationSec: 20 }, { level: 0.1, durationSec: 17 }]; // the warm-up, then two reads: the second louder
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup onDone={onDone} />);
    expect(screen.getByText('老师好！')).toBeTruthy();
    expect(speak).toHaveBeenCalledWith('你好！');
    await record();
    await waitFor(() => expect(button('继续').disabled).toBe(false));
    fireEvent.click(button('继续'));
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸。');
    expect(lit()).toBe(-1); // not before its voice starts
    act(() => setSpeaking(true));
    expect(lit()).toBe(0);
    expect(button('开始朗读').disabled).toBe(true);
    act(() => setSpeaking(false));
    expect(lit()).toBe(-1);
    expect(speak).toHaveBeenLastCalledWith('我爱妈妈。');
    act(() => setSpeaking(true));
    expect(lit()).toBe(1);
    act(() => setSpeaking(false));
    expect(button('开始朗读').disabled).toBe(false);
    fireEvent.click(button('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    expect(await screen.findByRole('meter')).toBeTruthy();
    fireEvent.click(screen.getByText('停止'));
    await screen.findByRole('button', { name: '听我的' });
    expect(screen.getByText('听老师的')).toBeTruthy();
    fireEvent.click(button('再读一遍'));
    await record();
    await screen.findByRole('button', { name: '听我的' });
    expect(screen.queryByText('再读一遍')).toBeNull(); // one re-read
    fireEvent.click(button('下一步'));
    expect(screen.getByText('我爱谁？')).toBeTruthy();
    fireEvent.click(button('妈妈'));
    expect(await screen.findByText('对了！')).toBeTruthy();
    expect(screen.getByText('谢谢老师！')).toBeTruthy();
    fireEvent.click(button('完成'));
    expect(onDone).toHaveBeenCalledWith({
      intro: expect.objectContaining({ durationSec: 4 }),
      read: expect.objectContaining({ level: 0.1, durationSec: 17 }),
      meaning: { correct: true, picked: '妈妈' },
    });
  });

  it('after day 1: no warm-up, straight to listening', () => {
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    expect(screen.queryByText('老师好！')).toBeNull();
    expect(screen.getByText('我爱爸爸。')).toBeTruthy();
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸。');
  });

  it('a worse re-read keeps the first take', async () => {
    takes = [{ level: 0.1, durationSec: 20 }, { level: 0.05, durationSec: 21 }];
    const onDone = vi.fn();
    render(<LangduStep passage={{ ...passage, question: undefined }} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={onDone} />);
    await toCompare();
    fireEvent.click(button('再读一遍'));
    await record();
    await screen.findByRole('button', { name: '听我的' });
    fireEvent.click(button('完成')); // no question: Compare ends the step
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: expect.objectContaining({ level: 0.1, durationSec: 20 }), meaning: null });
  });

  it('a miss shows the right choice and reads the sentence that answers it again', async () => {
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} startAt="meaning" onDone={onDone} />);
    fireEvent.click(button('老师'));
    expect(await screen.findByText('答案是：妈妈')).toBeTruthy();
    expect(button('妈妈').className).toContain('is-answer');
    expect(button('老师').className).toContain('is-wrong');
    expect(speak).toHaveBeenLastCalledWith('我爱妈妈。'); // a parent question names no sentence: found by its right choice
    fireEvent.click(button('完成'));
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: null, meaning: { correct: false, picked: '老师' } });
  });

  it('a right choice found in no sentence: the answer shows, nothing is read again', async () => {
    render(<LangduStep passage={{ ...passage, question: { ...question, choices: ['老师', '外婆', '小马'] } }} oral={oral} kid={DEFAULT_KID} withWarmup={false} startAt="meaning" onDone={vi.fn()} />);
    vi.mocked(speak).mockClear();
    fireEvent.click(button('老师'));
    expect(await screen.findByText('答案是：外婆')).toBeTruthy();
    expect(speak).not.toHaveBeenCalled();
  });

  it('no microphone: listen, read aloud unrecorded with 读完了, then the question; no compare', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={onDone} />);
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy();
    expect(screen.getByText('我爱妈妈。')).toBeTruthy(); // the passage is still there to read
    fireEvent.click(button('读完了'));
    expect(screen.queryByText('听我的')).toBeNull();
    fireEvent.click(button('妈妈'));
    fireEvent.click(await screen.findByText('完成'));
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: null, meaning: { correct: true, picked: '妈妈' } });
  });

  it('a microphone refused earlier in the lesson is not asked for again', async () => {
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup micBlocked onDone={vi.fn()} />);
    expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy();
    expect(screen.queryByText('开始录音')).toBeNull();
    fireEvent.click(button('继续'));
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    expect(screen.queryByText('开始录音')).toBeNull();
    expect(button('读完了').disabled).toBe(false);
    expect(startRecording).not.toHaveBeenCalled();
  });

  it('a microphone refused in the warm-up is not asked for again to read', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByText('开始录音')); });
    await waitFor(() => expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy());
    fireEvent.click(button('继续'));
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    expect(screen.queryByText('开始录音')).toBeNull();
    expect(startRecording).toHaveBeenCalledTimes(1);
  });

  it('extra round: no warm-up, no question; Compare ends it with 完成', async () => {
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} extra onDone={onDone} />);
    await toCompare();
    fireEvent.click(button('完成'));
    fireEvent.click(button('完成')); // a double tap saves the reading once
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: expect.objectContaining({ durationSec: 10 }), meaning: null });
  });

  it('谢谢老师！ is said once per step, even after a re-read brings Compare back (final review M1)', async () => {
    const { question: _q, ...plain } = passage;
    render(<LangduStep passage={plain} oral={oral} kid={DEFAULT_KID} withWarmup startAt="listen" onDone={vi.fn()} />);
    await toCompare();
    expect(screen.getByText('谢谢老师！')).toBeTruthy();
    fireEvent.click(button('再读一遍'));
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); // Re-read's screen settles
    await record();
    await screen.findByRole('button', { name: '听我的' });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); // Compare's effects have run
    expect(screen.getByText('谢谢老师！')).toBeTruthy();
    expect(vi.mocked(speak).mock.calls.filter((c) => c[0] === '谢谢老师！')).toHaveLength(1);
  });

  it('a tap during the first read-through reads on from there; after it, a tap reads that sentence only', () => {
    render(<LangduStep passage={{ ...passage, text: '甲甲。乙乙。丙丙。' }} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    fireEvent.click(button('乙乙。'));
    expect(speak).toHaveBeenLastCalledWith('乙乙。');
    modelReads(1);
    expect(speak).toHaveBeenLastCalledWith('丙丙。');
    modelReads(1);
    expect(button('开始朗读').disabled).toBe(false);
    vi.mocked(speak).mockClear();
    fireEvent.click(button('甲甲。'));
    modelReads(1);
    expect(vi.mocked(speak).mock.calls).toEqual([['甲甲。']]);
  });

  it('the model goes quiet when he starts reading', async () => {
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    modelReads(2);
    fireEvent.click(button('我爱爸爸。')); // he replays a sentence…
    act(() => setSpeaking(true));
    vi.mocked(stopSpeaking).mockClear();
    vi.mocked(speak).mockClear();
    fireEvent.click(button('开始朗读')); // …and starts reading while it plays
    expect(stopSpeaking).toHaveBeenCalled();
    act(() => setSpeaking(false)); // the cut-off sentence's end
    expect(speak).not.toHaveBeenCalled();
    expect(lit()).toBe(-1);
  });

  it('听我的 is an app play button, not the grey browser player: plays, pauses, resets at the end, stops on leave', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { unmount } = render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    await toCompare();
    expect(document.querySelector('audio[controls]')).toBeNull();
    const audio = document.querySelector('audio')!;
    expect(audio.getAttribute('src')).toMatch(/^blob:/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '听我的' })); });
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    expect(pause).toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '听我的' })); });
    act(() => { audio.dispatchEvent(new Event('ended')); });
    expect(screen.getByRole('button', { name: '听我的' })).toBeTruthy();
    fireEvent.click(button('听老师的')); // the model pauses his take and reads
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸。');
    pause.mockClear();
    unmount();
    expect(pause).toHaveBeenCalled();
    play.mockRestore();
    pause.mockRestore();
  });

  it('shows no meter and no 大声一点 until a real level arrives', async () => {
    vi.mocked(startRecording).mockImplementation(async () => ({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 5 }), cancel: vi.fn() }));
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.queryByText('大声一点！')).toBeNull();
  });

  it('missing self-introduction details: just 老师好！', () => {
    render(<LangduStep passage={passage} oral={{ ...oral, school: '' }} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    expect(screen.getByText('老师好！')).toBeTruthy();
    expect(screen.queryByText(/我叫/)).toBeNull();
  });
});

describe('朗读 on the stage (spec 2026-10-04 §3)', () => {
  const onStage = () => {
    expect(document.querySelector('.stage[data-stage="langdu"] .stage__truffle .pet')).toBeTruthy();
    expect(document.querySelector('.stage__card .langdu')).toBeTruthy();
    expect(document.querySelector('.stage__sheet .sheet')).toBeTruthy();
  };
  it('every part happens on the stage, and Truffle is calm while he records', async () => {
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    onStage(); // warm-up
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-calm')).toBe('true');
    fireEvent.click(screen.getByText('停止'));
    await waitFor(() => expect(button('继续').disabled).toBe(false));
    fireEvent.click(button('继续'));
    onStage(); // listen
    await toCompare();
    onStage(); // compare
    fireEvent.click(button('下一步'));
    onStage(); // meaning
  });
});
