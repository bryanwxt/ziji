// The one Web Audio context: sound effects and spoken clips share it (spec 2026-10-06 §4), so one tap wakes both.
let ctx: AudioContext | null = null;
let playing = false; // the context set the session to playback
let capturing = false; // a recording holds the session at play-and-record

function setSession(type: string): void {
  const session = typeof navigator === 'undefined' ? undefined : (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (session) try { session.type = type; } catch { /* older Safari */ }
}

/** Safari refuses the microphone while the audio session is 'playback' (InvalidStateError, parent 2026-10-15: the mic never
 *  asked): a recording switches it to play-and-record first, in the tap, and back to playback when it lets go. */
export function captureAudio(on: boolean): void {
  if (on === capturing) return;
  capturing = on;
  setSession(on ? 'play-and-record' : playing ? 'playback' : 'auto');
}

export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    // Safari 16.4+: play like media, so the iPad's silent setting doesn't mute his words
    playing = true;
    if (!capturing) setSession('playback');
  }
  if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') void ctx.resume().catch(() => {}); // iPad Safari interrupts it in the background
  return ctx;
}

export const audioAsleep = (): boolean => !ctx || ctx.state === 'suspended' || (ctx.state as string) === 'interrupted';

export function resetAudioContextForTests(): void {
  ctx = null;
  playing = false;
  capturing = false;
}
