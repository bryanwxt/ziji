let voice: SpeechSynthesisVoice | null = null;
let rate = 0.8;

const available = () => typeof speechSynthesis !== 'undefined' && !!speechSynthesis;

export function setSpeechRate(r: number): void {
  rate = r;
}

export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const mainland = voices.filter((v) => /^zh[-_]CN/i.test(v.lang));
  return (
    mainland.find((v) => v.localService) ??
    mainland[0] ??
    voices.find((v) => /^zh/i.test(v.lang) && !/HK|TW/i.test(v.lang)) ??
    null
  );
}

/** Voices load asynchronously on iPad Safari; wait briefly for them. */
export async function loadChineseVoice(timeoutMs = 1500): Promise<SpeechSynthesisVoice | null> {
  if (!available()) return (voice = null);
  voice = pickVoice(speechSynthesis.getVoices());
  if (!voice) {
    voice = await new Promise<SpeechSynthesisVoice | null>((resolve) => {
      const done = () => resolve(pickVoice(speechSynthesis.getVoices()));
      speechSynthesis.addEventListener?.('voiceschanged', done, { once: true });
      setTimeout(done, timeoutMs);
    });
  }
  return voice;
}

/** One or two characters on their own go by in a blink: they are said a quarter slower (parent, 2026-10-05: placement's listening questions). */
export const SHORT_WORD_PACE = 0.75;
const isShortWord = (text: string) => {
  const han = Array.from(text).filter((ch) => /\p{Script=Han}/u.test(ch)).length;
  return han > 0 && han <= 2;
};

/** Say Chinese text. It cuts off whatever is playing, unless `queue` (then it waits its turn: the character, then its usage line). */
export function speak(text: string, { queue = false }: { queue?: boolean } = {}): void {
  if (!available()) return;
  if (!queue) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = isShortWord(text) ? Math.round(rate * SHORT_WORD_PACE * 100) / 100 : rate;
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

/** Silence any speech in progress (before recording him, and when leaving a screen). */
export function stopSpeaking(): void {
  if (available()) speechSynthesis.cancel();
}

/** iOS only allows speech after a user gesture; call this from the first tap. */
export function primeSpeech(): void {
  if (!available()) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}
