import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../audio/speaking';
import { START_WAIT_MS, useModelReader } from './useModelReader';

vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
import { speak, stopSpeaking } from '../audio/speech';

function Probe({ sentences }: { sentences: string[] }) {
  const m = useModelReader(sentences);
  return (
    <div>
      <span data-testid="cur">{m.current ?? '-'}</span>
      <span data-testid="all">{String(m.heardAll)}</span>
      <button type="button" onClick={() => m.read(0)}>all</button>
      <button type="button" onClick={() => m.read(1, true)}>one</button>
      <button type="button" onClick={() => m.stop()}>stop</button>
    </div>
  );
}
const cur = () => screen.getByTestId('cur').textContent;
const all = () => screen.getByTestId('all').textContent;
const S = ['甲。', '乙。', '丙。'];

beforeEach(() => vi.mocked(speak).mockClear());
afterEach(() => {
  act(() => setSpeaking(false));
  vi.useRealTimers();
});

describe('useModelReader (spec 2026-10-12 §3)', () => {
  it('speaks one sentence at a time, lit from its start to its end', () => {
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('all'));
    expect(speak).toHaveBeenLastCalledWith('甲。');
    expect(cur()).toBe('-'); // not before its voice starts
    act(() => setSpeaking(true));
    expect(cur()).toBe('0');
    act(() => setSpeaking(false));
    expect(cur()).toBe('-');
    expect(speak).toHaveBeenLastCalledWith('乙。');
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    act(() => setSpeaking(true));
    expect(cur()).toBe('2');
    expect(all()).toBe('false');
    act(() => setSpeaking(false));
    expect(all()).toBe('true');
    expect(speak).toHaveBeenCalledTimes(3);
  });
  it('one sentence only: no more after it, and the passage is not counted as heard', () => {
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('one'));
    expect(speak).toHaveBeenLastCalledWith('乙。');
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(all()).toBe('false');
  });
  it('a sentence whose voice never starts is passed over, so the read-through still ends', () => {
    vi.useFakeTimers();
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('all'));
    act(() => { vi.advanceTimersByTime(START_WAIT_MS); });
    expect(speak).toHaveBeenLastCalledWith('乙。');
    act(() => { vi.advanceTimersByTime(START_WAIT_MS * 2); });
    expect(all()).toBe('true');
  });
  it('stop: quiet at once, and the end of the cut-off sentence starts nothing', () => {
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('all'));
    act(() => setSpeaking(true));
    fireEvent.click(screen.getByText('stop'));
    expect(stopSpeaking).toHaveBeenCalled();
    expect(cur()).toBe('-');
    act(() => setSpeaking(false));
    expect(speak).toHaveBeenCalledTimes(1);
  });
  it('leaving mid-sentence stops the voice and reads no further', () => {
    vi.mocked(stopSpeaking).mockClear();
    const { unmount } = render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('all'));
    act(() => setSpeaking(true));
    unmount();
    expect(stopSpeaking).toHaveBeenCalled();
    act(() => setSpeaking(false));
    expect(speak).toHaveBeenCalledTimes(1);
  });
});
