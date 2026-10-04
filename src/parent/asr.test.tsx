import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsrTest, diffChars, SAMPLE } from './AsrTest';

afterEach(() => vi.unstubAllGlobals());

describe('diffChars', () => {
  it('marks the characters it heard that differ from the sentence', () => {
    expect(diffChars('老师好', '老狮好')).toEqual([{ ch: '老', ok: true }, { ch: '狮', ok: false }, { ch: '好', ok: true }]);
    expect(diffChars('我们', '我')).toEqual([{ ch: '我', ok: true }]);
    expect(diffChars('我', '我们')).toEqual([{ ch: '我', ok: true }, { ch: '们', ok: false }]);
  });
});

describe('AsrTest', () => {
  it('says so when this browser has no speech recognition', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
    render(<AsrTest />);
    expect(screen.getByText("Speech recognition isn't available in this browser.")).toBeTruthy();
    expect(screen.queryByText('Start test')).toBeNull();
  });

  it('warns about Apple first, then shows what it heard with differences marked', () => {
    let instance: { onresult?: (e: unknown) => void; lang?: string; start: () => void } | null = null;
    class FakeRec {
      lang = ''; interimResults = true; continuous = false;
      onresult?: (e: unknown) => void; onerror?: () => void; onend?: () => void;
      constructor() { instance = this as never; }
      start() {}
      stop() {}
    }
    vi.stubGlobal('webkitSpeechRecognition', FakeRec);
    render(<AsrTest />);
    expect(screen.getByText(/your child's voice may be sent to Apple/)).toBeTruthy();
    expect(screen.getByText(SAMPLE)).toBeTruthy();
    fireEvent.click(screen.getByText('Start test'));
    expect(instance!.lang).toBe('zh-CN');
    act(() => instance!.onresult!({ results: [[{ transcript: '我家有五个人。爸爸是医生，妈妈是老狮。' }]] }));
    const marks = [...document.querySelectorAll('.asr__heard mark')].map((m) => m.textContent);
    expect(marks).toEqual(['狮']);
  });
});

describe('leaving the speech test (deferred minor, plan 8)', () => {
  it('stops listening when the parent leaves Settings mid-test', () => {
    const stop = vi.fn();
    class FakeRec { lang = ''; interimResults = true; continuous = false; start() {} stop = stop; }
    vi.stubGlobal('webkitSpeechRecognition', FakeRec);
    const { unmount } = render(<AsrTest />);
    fireEvent.click(screen.getByText('Start test'));
    unmount();
    expect(stop).toHaveBeenCalled();
  });
});
