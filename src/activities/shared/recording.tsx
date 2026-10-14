import { Mic } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { recordingSupported, startRecording, type ActiveRecording, type FinishedRecording } from '../../audio/recorder';
import { quietFor } from '../../langdu/loudness';
import { setRecordingNow } from '../../audio/speaking';
import { stopSpeaking } from '../../audio/speech';
import { MicDeniedError } from '../../audio/micErrors';
import { recordMicFailure } from '../../audio/micFailure';
import { logError } from '../../app/errorLog';
import { Label } from '../../ui/Label';
import { LoudnessMeter } from '../langdu/LoudnessMeter';

export type MicState = 'ready' | 'recording' | 'done' | 'blocked';

export const BLOCKED_NOTE = '麦克风没有打开。我们下次再录！';
export const RETRY_LABEL = '再试一次';
const RETRY_AFTER_MS = 300; // a passing failure (NotReadableError, AbortError, a timeout) is tried once more, by itself
const HEARD = 0.002; // above a working microphone's noise floor; a suspended meter reads exactly 0

/** One recording at a time, with an optional live level. Only a refused or missing mic becomes 'blocked'; any other failure is
 *  tried again once, then the button says 再试一次 (`failed`) so his next tap asks again (mic fix 2026-10-14). */
/** startBlocked: the microphone was already refused on an earlier screen, so don't ask again. */
export function useRecorder(startBlocked = false) {
  const [state, setState] = useState<MicState>(recordingSupported() && !startBlocked ? 'ready' : 'blocked');
  const [result, setResult] = useState<FinishedRecording | null>(null);
  const [level, setLevel] = useState(0);
  const [quietMs, setQuietMs] = useState(0);
  const [failed, setFailed] = useState(false); // the mic didn't start, twice, for a passing reason: the button says 再试一次
  const [heard, setHeard] = useState(false); // a real level has arrived: until then no meter, so a silent meter never nags
  const active = useRef<ActiveRecording | null>(null);
  const starting = useRef(false); // the mic is opening: a second tap must not start a second recording
  const mounted = useRef(true);
  const series = useRef<{ at: number; level: number }[]>([]);
  useEffect(() => () => {
    mounted.current = false;
    if (active.current) setRecordingNow(false);
    active.current?.cancel();
  }, []);

  const stop = async () => {
    const rec = active.current;
    if (!rec) return;
    active.current = null;
    setRecordingNow(false); // the app may speak again
    try {
      const done = await rec.stop();
      if (!mounted.current) return;
      setResult(done);
      setState('done');
    } catch {
      if (mounted.current) setState('ready'); // nothing was kept: he can record again
    }
  };
  const open = (withLevel: boolean) =>
    startRecording(
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
  const start = async (withLevel: boolean) => {
    if (starting.current || active.current) return;
    starting.current = true;
    stopSpeaking(); // don't record Truffle's voice into his answer (startRecording gives it a moment to let go)
    series.current = [];
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const rec = await open(withLevel);
          if (!mounted.current) return rec.cancel(); // he left while the mic was opening: never leave it on
          active.current = rec;
          setFailed(false);
          setRecordingNow(true); // speak() is silent until it stops (final review C1)
          setState('recording');
          return;
        } catch (e) {
          const final = e instanceof MicDeniedError || attempt > 0; // a failure the retry fixed isn't news for the parent
          if (final) {
            logError(e);
            void recordMicFailure(e);
          }
          if (!mounted.current) return;
          if (e instanceof MicDeniedError) return setState('blocked'); // a real refusal: don't ask again
          if (attempt > 0) {
            setFailed(true);
            setState('ready');
            return;
          }
          await new Promise((ok) => setTimeout(ok, RETRY_AFTER_MS));
          if (!mounted.current) return;
        }
      }
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
  return { state, result, level, quietMs, heard, failed, start, stop, reset };
}

/** The microphone is refused or missing: said once, kindly; the step goes on without recording (its 继续 is open). */
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
      <button type="button" class={`mic-btn${rec.failed ? ' mic-btn--retry' : ''}`} onClick={() => void rec.start(withLevel)}>
        <Mic size={52} strokeWidth={2.5} />
        <Label zh={rec.failed ? RETRY_LABEL : '开始录音'} />
      </button>
    );
  }
  return null;
}

