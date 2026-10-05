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
    const synth = { cancel: vi.fn(), speak: (u: never) => spoken.push(u), getVoices: () => [], speaking: false, pending: false };
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; volume = 1; voice = null; constructor(t: string) { this.text = t; } });
    const seen: boolean[] = [];
    const off = onSpeaking((on) => seen.push(on));
    speak('你好');
    synth.speaking = true;
    spoken[0]!.onstart!();
    settleIfSilent();
    expect(seen).toEqual([true]); // still speaking
    synth.speaking = false; // backgrounded mid-utterance: no onend ever comes
    settleIfSilent();
    off();
    expect(seen).toEqual([true, false]);
  });
});


describe('a lone 多音字 is said with the reading the card teaches (parent, 2026-10-05: 调 on its 空调 card was said diào)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const said = () => {
    const spoken: SpeechSynthesisUtterance[] = [];
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: SpeechSynthesisUtterance) => spoken.push(u), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string; lang = ''; rate = 1; volume = 1; voice: SpeechSynthesisVoice | null = null;
      constructor(t: string) { this.text = t; }
    });
    return spoken;
  };
  it('调 alone is said as 条 (tiáo, the only way 条 is read); 空调 and other text are said as written', () => {
    const spoken = said();
    speak('调');
    speak('空调');
    speak('猫');
    expect(spoken.map((u) => u.text)).toEqual(['条', '空调', '猫']);
  });
  it('a word that teaches the other reading is said that way', () => {
    const spoken = said();
    speak('长', { reading: 'zhǎng' });
    speak('长', { reading: 'cháng' });
    expect(spoken.map((u) => u.text)).toEqual(['掌', '常']);
  });
});

describe('a sound button tapped again while the iPad is still talking (parent, 2026-10-05: sometimes silent, sometimes cut short)', () => {
  afterEach(() => { stopSpeaking(); vi.unstubAllGlobals(); vi.useRealTimers(); });
  const stage = (speaking: boolean) => {
    const synth = { speaking, pending: false, cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] };
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; voice = null; constructor(t: string) { this.text = t; } });
    return synth;
  };
  const said = (synth: { speak: ReturnType<typeof vi.fn> }) => synth.speak.mock.calls.map(([u]) => (u as SpeechSynthesisUtterance).text);

  it('stops what is playing, then says it again a moment later (Safari drops or clips a voice started straight after cancel)', () => {
    vi.useFakeTimers();
    const synth = stage(true);
    speak('猫');
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(said(synth)).toEqual([]);
    vi.advanceTimersByTime(200);
    expect(said(synth)).toEqual(['猫']);
  });
  it('quick taps say it once, and a queued line still comes after it', () => {
    vi.useFakeTimers();
    const synth = stage(true);
    speak('猫');
    speak('猫');
    speak('小猫', { queue: true });
    vi.advanceTimersByTime(200);
    expect(said(synth)).toEqual(['猫', '小猫']);
  });
  it('says it at once when nothing is playing', () => {
    const synth = stage(false);
    speak('猫');
    expect(said(synth)).toEqual(['猫']);
  });
  it('stopSpeaking also drops a voice waiting for its moment', () => {
    vi.useFakeTimers();
    const synth = stage(true);
    speak('猫');
    stopSpeaking();
    vi.advanceTimersByTime(200);
    expect(said(synth)).toEqual([]);
  });
});

describe('a lone character between pauses is said as taught (写一写: 长，长城的，长)', () => {
  it('each one-character part goes through the say-as table; words are left alone', async () => {
    const { spokenAs } = await import('./speech');
    expect(spokenAs('调，空调的，调')).toBe('条，空调的，条');
  });
});
