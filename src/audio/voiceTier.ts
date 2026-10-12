// How good the Chinese voice in use is (spec 2026-10-12 §5): 朗读's model needs the iPad's Premium or Enhanced voice. Kept apart
// from speech.ts (which notes each voice it picks) so screens that mock speech still know the tier.
export type VoiceTier = 'premium' | 'enhanced' | 'default' | 'none';
type Named = Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>;

/**
 * How clear a voice is: an iPad's downloaded Premium or Enhanced voices are much clearer than the compact default (parent,
 * 2026-10-05). iPadOS often names them all "Tingting"; the quality is in the voiceURI (com.apple.voice.enhanced.zh-CN.…).
 */
export const voiceQuality = (v: Named): number => {
  const id = `${v.name} ${v.voiceURI ?? ''}`;
  return /premium/i.test(id) ? 2 : /enhanced|增强|高品质|优化/i.test(id) ? 1 : 0;
};

export function tierOf(v: Named | null): VoiceTier {
  if (!v) return 'none';
  return (['default', 'enhanced', 'premium'] as const)[voiceQuality(v)]!;
}

let current: VoiceTier = 'none';
/** speech.ts tells it each voice it picks (null: none). */
export function noteVoice(v: Named | null): void {
  current = tierOf(v);
}
export const voiceTier = (): VoiceTier => current;

export const TIER_LABEL: Record<VoiceTier, string> = { premium: 'Premium', enhanced: 'Enhanced', default: 'Standard', none: 'none' };
