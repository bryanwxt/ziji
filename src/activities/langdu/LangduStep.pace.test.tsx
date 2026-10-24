import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../../audio/speaking';
import { SENTENCE_GAP_MS } from '../../langdu/useModelReader';
import { DEFAULT_KID } from '../../types';
import { LangduStep } from './LangduStep';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { startRecording } from '../../audio/recorder';
import { speak } from '../../audio/speech';

const oral = { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' };
afterEach(() => { act(() => setSpeaking(false)); vi.useRealTimers(); });

describe('the first listen (spec 2026-10-24 §7: "slow down the reading speed on the first read")', () => {
  it('0.8×, with 700 ms between sentences', () => {
    vi.useFakeTimers();
    render(<LangduStep passage={{ id: 'pp:1', title: '我家', text: '我爱爸爸。我爱妈妈。' }} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸。', { rate: 0.8 });
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    act(() => { vi.advanceTimersByTime(SENTENCE_GAP_MS - 1); });
    expect(speak).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(1); });
    expect(speak).toHaveBeenLastCalledWith('我爱妈妈。', { rate: 0.8 });
  });
});

describe('听老师的 is a replay (stretch ruling 5)', () => {
  it('begun reading before the read-through ended, 听老师的 on Compare still reads at 0.9×, with no pause', async () => {
    vi.mocked(startRecording).mockImplementation(async () => ({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 5 }), cancel: vi.fn() }));
    render(<LangduStep passage={{ id: 'pp:1', title: '我家', text: '我爱爸爸。我爱妈妈。' }} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    act(() => setSpeaking(true)); // the first sentence: 开始朗读 comes alive
    act(() => setSpeaking(false));
    fireEvent.click(screen.getByText('开始朗读').closest('button')!); // before the second sentence
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    await screen.findByRole('button', { name: '听我的' });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); // Compare's effects have run (the model goes quiet)
    vi.mocked(speak).mockClear();
    vi.useFakeTimers();
    fireEvent.click(screen.getByText('听老师的').closest('button')!);
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸。', { rate: 0.9 });
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    expect(speak).toHaveBeenLastCalledWith('我爱妈妈。', { rate: 0.9 }); // straight on: no 700 ms pause
  });
});
