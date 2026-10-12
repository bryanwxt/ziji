import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../audio/speaking';
import { SENTENCE_MAX_MS, START_WAIT_MS, useModelReader } from './useModelReader';

vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
import { speak, stopSpeaking } from '../audio/speech';

function Probe({ sentences, name = '' }: { sentences: string[]; name?: string }) {
  const m = useModelReader(sentences);
  return (
    <div>
      <span data-testid={`cur${name}`}>{m.current ?? '-'}</span>
      <span data-testid={`all${name}`}>{String(m.heardAll)}</span>
      <button type="button" onClick={() => m.read(0)}>{`all${name}`}</button>
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
  it('a voice that starts and never says it ended: the next sentence after SENTENCE_MAX_MS (final review M4)', () => {
    vi.useFakeTimers();
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('all'));
    act(() => setSpeaking(true));
    expect(cur()).toBe('0');
    act(() => { vi.advanceTimersByTime(SENTENCE_MAX_MS - 1); });
    expect(speak).toHaveBeenCalledTimes(1); // still waiting: a long sentence is not cut short
    act(() => { vi.advanceTimersByTime(1); });
    expect(speak).toHaveBeenLastCalledWith('乙。');
    expect(cur()).toBe('-');
  });
  it('one reader at a time (final review I7): starting B stops A, and A never speaks again', () => {
    render(<div><Probe sentences={S} name="A" /><Probe sentences={['子。', '丑。']} name="B" /></div>);
    fireEvent.click(screen.getByText('allA'));
    act(() => setSpeaking(true));
    expect(screen.getByTestId('curA').textContent).toBe('0');
    fireEvent.click(screen.getByText('allB'));
    expect(speak).toHaveBeenLastCalledWith('子。');
    expect(screen.getByTestId('curA').textContent).toBe('-');
    act(() => setSpeaking(false)); // A's cut-off voice says it ended
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    expect(vi.mocked(speak).mock.calls.map((c) => c[0])).toEqual(['甲。', '子。', '丑。']);
    expect(screen.getByTestId('allB').textContent).toBe('true');
    expect(screen.getByTestId('allA').textContent).toBe('false');
  });
});
