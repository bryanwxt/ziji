import { afterEach, describe, expect, it, vi } from 'vitest';
import { onSpeaking, pickVoice, setSpeechRate, speak, stopSpeaking } from './speech';
import { settleIfSilent } from './speaking';

const v = (lang: string, localService = true, name = lang) => ({ lang, localService, name }) as SpeechSynthesisVoice;

describe('pickVoice', () => {
  it('prefers a local mainland Mandarin voice', () => {
    expect(pickVoice([v('en-US'), v('zh-TW'), v('zh-CN', false, 'net'), v('zh-CN', true, 'Tingting')])?.name).toBe('Tingting');
  });
  it('falls back to another zh voice that is not HK/TW, else null', () => {
    expect(pickVoice([v('zh')])?.lang).toBe('zh');
    expect(pickVoice([v('zh-HK'), v('en-GB')])).toBeNull();
  });
});

describe('speak', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('speaks Mandarin at the configured rate', () => {
    const spoken: SpeechSynthesisUtterance[] = [];
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: SpeechSynthesisUtterance) => spoken.push(u), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string; lang = ''; rate = 1; volume = 1; voice: SpeechSynthesisVoice | null = null;
      constructor(t: string) { this.text = t; }
    });
    setSpeechRate(0.7);
    speak('我爱妈妈。');
    expect(spoken[0]).toMatchObject({ text: '我爱妈妈。', lang: 'zh-CN', rate: 0.7 });
  });
  it('a word of one or two characters is said a quarter slower, so it is easy to catch (parent, 2026-10-05: placement)', () => {
    const spoken: SpeechSynthesisUtterance[] = [];
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: SpeechSynthesisUtterance) => spoken.push(u), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string; lang = ''; rate = 1; volume = 1; voice: SpeechSynthesisVoice | null = null;
      constructor(t: string) { this.text = t; }
    });
    setSpeechRate(0.8);
    speak('河');
    speak('河水！');
    speak('河水很清');
    expect(spoken.map((u) => u.rate)).toEqual([0.6, 0.6, 0.8]);
  });
  it('a queued line waits for the one before it instead of cutting it off (review: the new character was never heard)', () => {
    const cancel = vi.fn();
    const spoken: string[] = [];
    vi.stubGlobal('speechSynthesis', { cancel, speak: (u: SpeechSynthesisUtterance) => spoken.push(u.text), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; voice = null; constructor(t: string) { this.text = t; } });
    speak('他');
    speak('其他', { queue: true });
    expect(spoken).toEqual(['他', '其他']);
    expect(cancel).toHaveBeenCalledTimes(1); // only the first call clears what was playing before
  });
  it('does nothing where speech is unavailable', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(() => speak('河')).not.toThrow();
  });
});

describe('talking (spec 2026-10-04 §4.6): who is told when the iPad speaks', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = () => {
    const spoken: (SpeechSynthesisUtterance & { onstart?: () => void; onend?: () => void; onerror?: () => void })[] = [];
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: never) => spoken.push(u), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; volume = 1; voice = null; constructor(t: string) { this.text = t; } });
    return spoken;
  };
  it('on when an utterance starts, off when it ends or fails', () => {
    const spoken = stub();
    const seen: boolean[] = [];
    const off = onSpeaking((on) => seen.push(on));
    speak('你好');
    spoken[0]!.onstart!();
    spoken[0]!.onend!();
    speak('我们');
    spoken[1]!.onstart!();
    spoken[1]!.onerror!();
    off();
    expect(seen).toEqual([true, false, true, false]);
  });
  it('off when speech is stopped (nothing stays open)', () => {
    const spoken = stub();
    const seen: boolean[] = [];
    const off = onSpeaking((on) => seen.push(on));
    speak('你好');
    spoken[0]!.onstart!();
    stopSpeaking();
    off();
    expect(seen).toEqual([true, false]);
  });
});

describe('final review: the mouth never keeps going after speech has quietly stopped', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('a check finds the iPad silent (no end event came) and turns talking off', () => {
    const spoken: { onstart?: () => void }[] = [];
    const synth = { cancel: vi.fn(), speak: (u: never) => spoken.push(u), getVoices: () => [], speaking: true, pending: false };
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; volume = 1; voice = null; constructor(t: string) { this.text = t; } });
    const seen: boolean[] = [];
    const off = onSpeaking((on) => seen.push(on));
    speak('你好');
    spoken[0]!.onstart!();
    settleIfSilent();
    expect(seen).toEqual([true]); // still speaking
    synth.speaking = false; // backgrounded mid-utterance: no onend ever comes
    settleIfSilent();
    off();
    expect(seen).toEqual([true, false]);
  });
});

