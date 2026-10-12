import { screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as speech from '../audio/speech';
import { noteVoice } from '../audio/voiceTier';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { Dashboard } from './Dashboard';
import { SettingsPanel } from './SettingsPanel';

const voice = (name: string, kind: 'compact' | 'enhanced' | 'premium') => ({ name, voiceURI: `com.apple.voice.${kind}.zh-CN.${name}`, lang: 'zh-CN', localService: true, default: false }) as SpeechSynthesisVoice;
const WARN = /朗读 uses the iPad's voice as the model\./;
const on = { ...DEFAULT_SETTINGS, placementDone: true, langdu: true };
afterEach(() => {
  noteVoice(null);
  vi.restoreAllMocks();
});

describe('the 朗读 voice warning on the Overview (spec 2026-10-12 §5)', () => {
  it('shows with the standard voice, with where to download a better one', async () => {
    noteVoice(voice('Tingting', 'compact'));
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, await makeAppData({ settings: on, voice: true }));
    expect(await screen.findByText(WARN)).toBeTruthy();
    expect(screen.getByText(/download a better Chinese voice: Settings → Accessibility → Spoken Content → Voices → Chinese \(China mainland\) → 婷婷 \(Enhanced\) or Lili \(Premium\), then reopen the app\./)).toBeTruthy();
  });
  it('shows with no voice at all', async () => {
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, await makeAppData({ settings: on }));
    expect(await screen.findByText(WARN)).toBeTruthy();
  });
  it('not with an Enhanced or Premium voice, nor with 朗读 off', async () => {
    noteVoice(voice('Tingting', 'enhanced'));
    const a = renderWithApp(<Dashboard onNavigate={vi.fn()} />, await makeAppData({ settings: on, voice: true }));
    await screen.findByText('Takes to review');
    expect(screen.queryByText(WARN)).toBeNull();
    a.unmount();
    noteVoice(voice('Tingting', 'compact'));
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, await makeAppData({ settings: { ...on, langdu: false }, voice: true }));
    await screen.findByText('Takes to review');
    expect(screen.queryByText(WARN)).toBeNull();
  });
});

describe('Settings shows the voice in use and its tier (spec 2026-10-12 §5)', () => {
  it('names the voice and its tier', async () => {
    const lili = voice('Lili', 'premium');
    noteVoice(lili);
    vi.spyOn(speech, 'currentVoice').mockReturnValue(lili);
    renderWithApp(<SettingsPanel />, await makeAppData());
    expect(screen.getByText(/Now speaking: Lili · Premium\./)).toBeTruthy();
  });
});
