import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setClipPlayer } from '../../audio/speech';
import { DEFAULT_KID } from '../../types';
import { PinyinFade } from '../../ui/pinyinFade';
import { LangduStep } from './LangduStep';

// speech is real here: the rule is speak()'s own (final review C1), so it is tested where the app's taps meet it
vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { startRecording } from '../../audio/recorder';

const passage = { id: 'pp:1', title: '我家', text: '我爱爸爸。我爱妈妈。', source: 'parent' as const };
const oral = { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' };
const said = vi.fn();
const played = vi.fn();

beforeEach(() => {
  said.mockClear();
  played.mockClear();
  vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: said, getVoices: () => [], speaking: false, pending: false });
  vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; voice = null; constructor(t: string) { this.text = t; } });
  setClipPlayer({ play: async (...a: unknown[]) => { played(...a); return 'ended'; }, stop: vi.fn(), prefetch: vi.fn() } as never);
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockImplementation(async () => ({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 5, level: 0.1 }), cancel: vi.fn() }));
});
afterEach(() => vi.unstubAllGlobals());

const known = new Set(['我', '爱', '爸', '妈']);
const hidden = () => document.querySelector('.label__cell--hidden') as HTMLElement;

describe('nothing the app says is recorded into his take (final review C1)', () => {
  it('a pinyin peek while he reads aloud shows the syllable silently', async () => {
    render(<PinyinFade known={known} on><LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} startAt="read" onDone={vi.fn()} /></PinyinFade>);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    said.mockClear();
    played.mockClear();
    const cell = hidden();
    act(() => { fireEvent.click(cell); });
    expect(cell.classList.contains('label__cell--peek')).toBe(true);
    expect(cell.querySelector('.label__py')!.textContent).toBe('wǒ');
    expect(said).not.toHaveBeenCalled();
    expect(played).not.toHaveBeenCalled();
  });
  it('a peek in the warm-up while it records is silent too; before recording it is said', async () => {
    render(<PinyinFade known={new Set(['老', '师', '好'])} on><LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} /></PinyinFade>);
    said.mockClear();
    played.mockClear();
    fireEvent.click(hidden());
    expect(said.mock.calls.length + played.mock.calls.length).toBe(1); // not recording: a peek is said
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    said.mockClear();
    played.mockClear();
    fireEvent.click(hidden());
    expect(said).not.toHaveBeenCalled();
    expect(played).not.toHaveBeenCalled();
  });
});
