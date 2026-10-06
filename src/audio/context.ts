// The one Web Audio context: sound effects and spoken clips share it (spec 2026-10-06 §4), so one tap wakes both.
let ctx: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    // Safari 16.4+: play like media, so the iPad's silent setting doesn't mute his words
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) try { session.type = 'playback'; } catch { /* older Safari */ }
  }
  if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') void ctx.resume().catch(() => {}); // iPad Safari interrupts it in the background
  return ctx;
}

export const audioAsleep = (): boolean => !ctx || ctx.state === 'suspended' || (ctx.state as string) === 'interrupted';

export function resetAudioContextForTests(): void {
  ctx = null;
}
