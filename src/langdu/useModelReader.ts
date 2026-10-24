// 朗读's model (spec 2026-10-12 §3): the iPad voice reads the passage one sentence per utterance, and the sentence being read is
// lit from the moment its voice starts until it ends — the speaking signal that moves Truffle's mouth (src/audio/speaking.ts).
import { useEffect, useRef, useState } from 'preact/hooks';
import { onSpeaking } from '../audio/speaking';
import { speak, stopSpeaking } from '../audio/speech';

/** A sentence whose voice hasn't started by then is passed over (no Chinese voice, a dropped utterance): reading never hangs. */
export const START_WAIT_MS = 2500;
/** A started sentence that never says it ended counts as ended after this long. */
export const SENTENCE_MAX_MS = 20_000;

/** How the model reads: its voice's rate (a factor on the usual) and the pause between sentences. */
export interface Pace { rate: number; gapMs: number }
/** The first read-through, before he reads (spec 2026-10-24 §7): slower, with a pause after each sentence. */
export const MODEL_RATE = 0.8;
export const SENTENCE_GAP_MS = 700;
export const FIRST_LISTEN: Pace = { rate: MODEL_RATE, gapMs: SENTENCE_GAP_MS };
/** A tapped sentence, 听老师的 on Compare, and the read-back after a missed question: a little slower, no pause. */
export const REPLAY_RATE = 0.9;
export const REPLAY: Pace = { rate: REPLAY_RATE, gapMs: 0 };
/** As the voice usually speaks (the parent's Listen & confirm). */
export const AS_SPOKEN: Pace = { rate: 1, gapMs: 0 };

export interface ModelReader {
  /** the sentence being read now (lit), or null */
  current: number | null;
  /** a read has reached the last sentence */
  heardAll: boolean;
  /** read from `from` to the end, or only that sentence, at `pace` (as the voice usually speaks unless given) */
  read: (from: number, only?: boolean, pace?: Pace) => void;
  /** quiet now (he is about to read, or plays his own take) */
  stop: () => void;
}

/**
 * One model reads at a time across the screen (final review I7: two passage rows in Listen & confirm). A new read() takes the
 * token and stops whoever had it; a reader whose token isn't current stops at its sentence's end instead of reading on.
 */
let token = 0;
let release: (() => void) | null = null;

export function useModelReader(sentences: string[]): ModelReader {
  const [current, setCurrent] = useState<number | null>(null);
  const [heardAll, setHeardAll] = useState(false);
  const run = useRef(0); // bumped by each new read and by stop: an older read's events are ignored
  const live = useRef<(() => void) | null>(null); // the sentence in progress: stops listening for it
  const list = useRef(sentences);
  list.current = sentences;
  const own = useRef(0); // the token this reader's read took

  const halt = () => {
    run.current++;
    live.current?.();
    live.current = null;
  };

  const say = (i: number, last: number, mine: number, pace: Pace) => {
    if (run.current !== mine) return;
    if (i > last) {
      live.current = null;
      setCurrent(null);
      if (last >= list.current.length - 1) setHeardAll(true);
      return;
    }
    let started = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      off();
      clearTimeout(timer);
      if (run.current !== mine) return;
      setCurrent(null);
      if (token !== own.current) { halt(); return; } // another reader has started: this one is done
      if (i >= last || pace.gapMs <= 0) { say(i + 1, last, mine, pace); return; }
      // the pause between sentences (spec 2026-10-24 §7): stop() and leaving cancel it like a sentence
      const gap = setTimeout(() => say(i + 1, last, mine, pace), pace.gapMs);
      live.current = () => clearTimeout(gap);
    };
    const off = onSpeaking((on) => {
      if (on && !started) {
        started = true;
        setCurrent(i);
        clearTimeout(timer);
        timer = setTimeout(next, SENTENCE_MAX_MS);
      } else if (!on && started) next();
    });
    timer = setTimeout(next, START_WAIT_MS);
    live.current = () => {
      off();
      clearTimeout(timer);
    };
    const line = list.current[i]!;
    if (pace.rate === 1) speak(line);
    else speak(line, { rate: pace.rate });
  };

  // one function for this reader's whole life (it uses only refs and a state setter), so the token's holder can be compared
  const quiet = useRef(() => {
    halt();
    setCurrent(null);
  }).current;
  const read = (from: number, only = false, pace: Pace = AS_SPOKEN) => {
    const before = release;
    own.current = ++token;
    release = quiet;
    if (before && before !== quiet) before(); // the other reader stops (its voice is cut off by this read's own)
    halt();
    say(from, only ? from : list.current.length - 1, run.current, pace);
  };
  const stop = () => {
    if (!live.current) return;
    halt();
    setCurrent(null);
    stopSpeaking();
  };
  useEffect(() => () => {
    if (release === quiet) release = null;
    if (!live.current) return;
    halt();
    stopSpeaking();
  }, []);
  return { current, heardAll, read, stop };
}
