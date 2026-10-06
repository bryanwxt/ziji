import { audioAsleep, audioContext } from './context';

export type Sfx = 'correct' | 'wrong' | 'combo' | 'star' | 'chest' | 'levelUp' | 'munch';

type Note = [freq: number, offset: number, duration: number, type?: OscillatorType];

// Short synthesized sounds; 'wrong' is deliberately soft and low, never a buzzer.
const NOTES: Record<Sfx, Note[]> = {
  correct: [[660, 0, 0.12], [880, 0.1, 0.18]],
  wrong: [[330, 0, 0.2, 'triangle']],
  combo: [[523, 0, 0.1], [659, 0.08, 0.1], [784, 0.16, 0.1], [1047, 0.24, 0.2]],
  star: [[1319, 0, 0.08], [1760, 0.06, 0.12]],
  chest: [[392, 0, 0.15], [523, 0.12, 0.15], [659, 0.24, 0.15], [784, 0.36, 0.3]],
  levelUp: [[523, 0, 0.15], [523, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.4]],
  munch: [[180, 0, 0.06, 'square'], [150, 0.09, 0.06, 'square']],
};

let enabled = true;
export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  return enabled ? audioContext() : null;
}

/**
 * iPad Safari only lets sound start inside a tap. Stroking Truffle is a drag, never a tap, so a purr before any sound had
 * played stayed silent: the first touch anywhere wakes the sound, then the listeners go (sweep).
 */
export function armAudioWake(): void {
  if (typeof document === 'undefined') return;
  const events = ['touchend', 'pointerup', 'keydown'] as const;
  let armed = false;
  const asleep = audioAsleep;
  const wake = () => {
    if (asleep()) audioContext(); // clips need waking even with sound effects off (resume is async: still asleep, the next touch tries again)
    if (!asleep()) disarm();
  };
  const arm = () => { if (!armed) { armed = true; events.forEach((e) => document.addEventListener(e, wake, true)); } };
  const disarm = () => { armed = false; events.forEach((e) => document.removeEventListener(e, wake, true)); };
  arm();
  // back from the background the sound may be asleep again: the next touch wakes it (final review)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) arm(); });
}

export function playSfx(name: Sfx): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  for (const [freq, offset, duration, type = 'sine'] of NOTES[name]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t + offset);
    osc.stop(t + offset + duration);
  }
}

let purr: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;

/** A synthesised purr while he is stroked: a low sawtooth through a low-pass, its loudness wobbling like breath. */
export function startPurr(): void {
  if (purr) return;
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 27;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 170;
  const gain = ac.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(0.16, ac.currentTime, 0.08);
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.9;
  const depth = ac.createGain();
  depth.gain.value = 0.07;
  lfo.connect(depth).connect(gain.gain);
  osc.connect(filter).connect(gain).connect(ac.destination);
  osc.start();
  lfo.start();
  purr = { osc, lfo, gain };
}

export function stopPurr(): void {
  if (!purr) return;
  const { osc, lfo, gain } = purr;
  purr = null;
  const t = gain.context.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setTargetAtTime(0, t, 0.08);
  osc.stop(t + 0.5);
  lfo.stop(t + 0.5);
}
