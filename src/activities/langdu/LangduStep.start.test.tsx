import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../../audio/speaking';
import { DEFAULT_KID } from '../../types';
import { LangduStep } from './LangduStep';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

const passage = { id: 'pp:2', title: '我家', text: '我爱爸爸。我爱妈妈。我爱妹妹。我爱松露。', source: 'parent' as const };
const oral = { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' };
const start = () => screen.getByText('开始朗读').closest('button') as HTMLButtonElement;
const show = () => render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);

afterEach(() => { act(() => setSpeaking(false)); vi.useRealTimers(); });

// review 2026-10-17: 开始朗读 waited for the whole model, and a long passage was cut off mid-line with no sign it went on
describe('朗读 Listen: he can start reading early, and the passage follows the voice', () => {
  it('开始朗读 comes alive once the first sentence has been read, not only after the last', () => {
    show();
    expect(start().disabled).toBe(true);
    act(() => setSpeaking(true));
    expect(start().disabled).toBe(true); // the first sentence is still being read
    act(() => setSpeaking(false));
    expect(start().disabled).toBe(false); // three sentences still to come
  });
  it('…or after 10 s, when no voice ever starts', () => {
    vi.useFakeTimers();
    show();
    expect(start().disabled).toBe(true);
    act(() => { vi.advanceTimersByTime(9_000); });
    expect(start().disabled).toBe(true);
    act(() => { vi.advanceTimersByTime(1_100); });
    expect(start().disabled).toBe(false);
  });
  it('the lit sentence is scrolled into the passage box, which never scrolls the screen', () => {
    const scrolls: number[] = [];
    const proto = HTMLElement.prototype as unknown as { scrollTo?: unknown };
    const had = proto.scrollTo;
    proto.scrollTo = function (this: HTMLElement, o: ScrollToOptions) { if (this.classList.contains('langdu__passage')) scrolls.push(o.top ?? 0); };
    try {
      show();
      const box = document.querySelector('.langdu__passage') as HTMLElement;
      Object.defineProperty(box, 'clientHeight', { configurable: true, value: 100 });
      const third = document.querySelectorAll('.langdu__sentence')[2] as HTMLElement;
      Object.defineProperty(third, 'offsetTop', { configurable: true, value: 240 });
      for (let i = 0; i < 2; i++) { act(() => setSpeaking(true)); act(() => setSpeaking(false)); }
      act(() => setSpeaking(true)); // the third sentence lights
      expect(scrolls.at(-1)).toBe(240 - 100 / 3);
    } finally {
      proto.scrollTo = had;
    }
  });
  it('a passage with more below it fades at the bottom; scrolled to its end, no fade', () => {
    show();
    const box = document.querySelector('.langdu__passage') as HTMLElement;
    Object.defineProperty(box, 'clientHeight', { configurable: true, value: 100 });
    Object.defineProperty(box, 'scrollHeight', { configurable: true, value: 300 });
    fireEvent.scroll(box);
    expect(box.classList.contains('has-more')).toBe(true);
    box.scrollTop = 200;
    fireEvent.scroll(box);
    expect(box.classList.contains('has-more')).toBe(false);
  });
});
