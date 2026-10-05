// Whether the iPad is speaking, for anyone who wants to know (Truffle's mouth moves with it, spec 2026-10-04 §4.6). Kept apart
// from speech.ts so screens that mock speech still give Truffle a working signal.
const listeners = new Set<(on: boolean) => void>();
let speakingNow = false;

export function setSpeaking(on: boolean): void {
  if (on === speakingNow) return;
  speakingNow = on;
  for (const fn of listeners) fn(on);
}

/** Told true when speech starts and false when it ends, fails or is stopped; returns a function to stop listening. */
export function onSpeaking(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * A check while talking: if the iPad has quietly stopped (backgrounded mid-sentence, an utterance that never says it ended),
 * talking turns off, so his mouth never keeps going (final review).
 */
export function settleIfSilent(): void {
  if (!speakingNow || typeof speechSynthesis === 'undefined' || !speechSynthesis) return;
  if (!speechSynthesis.speaking && !speechSynthesis.pending) setSpeaking(false);
}
