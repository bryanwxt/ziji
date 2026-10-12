import { Mic } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { recordingSupported, startRecording, type ActiveRecording, type FinishedRecording } from '../../audio/recorder';
import { quietFor } from '../../langdu/loudness';
import { stopSpeaking } from '../../audio/speech';
import { Label } from '../../ui/Label';
import { LoudnessMeter } from '../langdu/LoudnessMeter';

export type MicState = 'ready' | 'recording' | 'done' | 'blocked';

export const BLOCKED_NOTE = '麦克风没有打开。我们下次再录！';
const HEARD = 0.002; // above a working microphone's noise floor; a suspended meter reads exactly 0

/** One recording at a time, with an optional live level; a refused or missing mic becomes 'blocked', never an error. */
/** startBlocked: the microphone was already refused on an earlier screen, so don't ask again. */
export function useRecorder(startBlocked = false) {
  const [state, setState] = useState<MicState>(recordingSupported() && !startBlocked ? 'ready' : 'blocked');
  const [result, setResult] = useState<FinishedRecording | null>(null);
  const [level, setLevel] = useState(0);
  const [quietMs, setQuietMs] = useState(0);
  const [heard, setHeard] = useState(false); // a real level has arrived: until then no meter, so a silent meter never nags
  const active = useRef<ActiveRecording | null>(null);
  const starting = useRef(false); // the mic is opening: a second tap must not start a second recording
  const mounted = useRef(true);
  const series = useRef<{ at: number; level: number }[]>([]);
  useEffect(() => () => {
    mounted.current = false;
    active.current?.cancel();
  }, []);

  const stop = async () => {
    const rec = active.current;
    if (!rec) return;
    active.current = null;
    setResult(await rec.stop());
    setState('done');
  };
  const start = async (withLevel: boolean) => {
    if (starting.current || active.current) return;
    starting.current = true;
    stopSpeaking(); // don't record Truffle's voice into his answer
    series.current = [];
    try {
      const rec = await startRecording(
        () => void stop(),
        withLevel
          ? (l) => {
              const now = performance.now();
              series.current.push({ at: now, level: l });
              setLevel(l);
              setQuietMs(quietFor(series.current, now));
              if (l > HEARD) setHeard(true);
            }
          : undefined,
      );
      if (!mounted.current) return rec.cancel(); // he left while the mic was opening: never leave it on
      active.current = rec;
      setState('recording');
    } catch {
      if (mounted.current) setState('blocked');
    } finally {
      starting.current = false;
    }
  };
  const reset = () => {
    setResult(null);
    setLevel(0);
    setQuietMs(0);
    setHeard(false);
    setState((s) => (s === 'blocked' ? s : 'ready'));
  };
  return { state, result, level, quietMs, heard, start, stop, reset };
}

/** The microphone is refused or missing: said once, kindly; the step goes on without recording. */
export function BlockedNote() {
  return (
    <p class="warning">
      <Label zh={BLOCKED_NOTE} />
      <br />
      <small>Ask a parent to allow the microphone for this app.</small>
    </p>
  );
}

export function MicButton({ rec, withLevel }: { rec: ReturnType<typeof useRecorder>; withLevel: boolean }) {
  if (rec.state === 'blocked') return <BlockedNote />;
  if (rec.state === 'recording') {
    return (
      <>
        {withLevel && rec.heard && <LoudnessMeter level={rec.level} quietMs={rec.quietMs} />}
        <button type="button" class="mic-btn is-recording" onClick={() => void rec.stop()}>
          <span class="rec-dot" />
          <Label zh="停止" />
        </button>
      </>
    );
  }
  if (rec.state === 'ready') {
    return (
      <button type="button" class="mic-btn" onClick={() => void rec.start(withLevel)}>
        <Mic size={52} strokeWidth={2.5} />
        <Label zh="开始录音" />
      </button>
    );
  }
  return null;
}

