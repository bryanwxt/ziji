/** The loudness meter's audio context. Made during the tap, before the microphone prompt: iPad Safari only lets audio start
 *  inside a user gesture. Its own module, so tests that stub the recorder still get a real one. */
export function openMeterContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    void ctx.resume?.()?.catch(() => {});
    return ctx;
  } catch {
    return null; // never block a recording on the meter
  }
}
