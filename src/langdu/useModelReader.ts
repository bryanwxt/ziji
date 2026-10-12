// 朗读's model (spec 2026-10-12 §3): the iPad voice reads the passage one sentence per utterance, and the sentence being read is
// lit from the moment its voice starts until it ends — the speaking signal that moves Truffle's mouth (src/audio/speaking.ts).
import { useEffect, useRef, useState } from 'preact/hooks';
import { onSpeaking } from '../audio/speaking';
import { speak, stopSpeaking } from '../audio/speech';

/** A sentence whose voice hasn't started by then is passed over (no Chinese voice, a dropped utterance): reading never hangs. */
export const START_WAIT_MS = 2500;
/** A started sentence that never says it ended counts as ended after this long. */
export const SENTENCE_MAX_MS = 20_000;

export interface ModelReader {
  /** the sentence being read now (lit), or null */
  current: number | null;
  /** a read has reached the last sentence */
  heardAll: boolean;
  /** read from `from` to the end, or only that sentence */
  read: (from: number, only?: boolean) => void;
  /** quiet now (he is about to read, or plays his own take) */
  stop: () => void;
}

export function useModelReader(sentences: string[]): ModelReader {
  const [current, setCurrent] = useState<number | null>(null);
  const [heardAll, setHeardAll] = useState(false);
  const run = useRef(0); // bumped by each new read and by stop: an older read's events are ignored
  const live = useRef<(() => void) | null>(null); // the sentence in progress: stops listening for it
  const list = useRef(sentences);
  list.current = sentences;

  const halt = () => {
    run.current++;
    live.current?.();
    live.current = null;
  };

  const say = (i: number, last: number, mine: number) => {
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
      say(i + 1, last, mine);
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
    speak(list.current[i]!);
  };

  const read = (from: number, only = false) => {
    halt();
    say(from, only ? from : list.current.length - 1, run.current);
  };
  const stop = () => {
    if (!live.current) return;
    halt();
    setCurrent(null);
    stopSpeaking();
  };
  useEffect(() => () => {
    if (!live.current) return;
    halt();
    stopSpeaking();
  }, []);
  return { current, heardAll, read, stop };
}
