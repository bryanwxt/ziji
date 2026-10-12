import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadChineseVoice } from './speech';
import { noteVoice, tierOf, voiceTier } from './voiceTier';

const v = (name: string, voiceURI: string) => ({ name, voiceURI, lang: 'zh-CN', localService: true, default: false }) as SpeechSynthesisVoice;
afterEach(() => {
  noteVoice(null);
  vi.unstubAllGlobals();
});

describe('voiceTier (spec 2026-10-12 §5)', () => {
  it('reads the tier from the name and voiceURI, as iPadOS names them', () => {
    expect(tierOf(v('Tingting', 'com.apple.voice.compact.zh-CN.Tingting'))).toBe('default');
    expect(tierOf(v('Tingting', 'com.apple.voice.enhanced.zh-CN.Tingting'))).toBe('enhanced');
    expect(tierOf(v('Lili', 'com.apple.voice.premium.zh-CN.Lili'))).toBe('premium');
    expect(tierOf(v('婷婷（增强）', ''))).toBe('enhanced');
    expect(tierOf(null)).toBe('none');
  });
  it('is the tier of the voice speech.ts picked; none before any', async () => {
    expect(voiceTier()).toBe('none');
    vi.stubGlobal('speechSynthesis', { getVoices: () => [v('Tingting', 'com.apple.voice.compact.zh-CN.Tingting'), v('Lili', 'com.apple.voice.premium.zh-CN.Lili')], addEventListener: vi.fn(), removeEventListener: vi.fn() });
    await loadChineseVoice(0);
    expect(voiceTier()).toBe('premium');
  });
});
