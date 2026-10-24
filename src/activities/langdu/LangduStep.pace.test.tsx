import { act, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../../audio/speaking';
import { SENTENCE_GAP_MS } from '../../langdu/useModelReader';
import { DEFAULT_KID } from '../../types';
import { LangduStep } from './LangduStep';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
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
