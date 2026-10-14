import { useEffect, useRef, useState } from 'preact/hooks';
import { recordingSupported, startRecording, type ActiveRecording } from '../audio/recorder';
import { clearMicFailure, describeMicFailure, readMicFailure, recordMicFailure, type MicFailure } from '../audio/micFailure';
import { MicUnsupportedError } from '../audio/micErrors';
import { stopSpeaking } from '../audio/speech';
import { logError } from '../app/errorLog';

type TestState = { kind: 'idle' } | { kind: 'recording' } | { kind: 'ok' } | { kind: 'failed'; failure: MicFailure } | { kind: 'empty' };

/** One line about the last time the mic didn't start: "Mic didn't start …: what. fix" */
export function micFailureLine(f: MicFailure, when: string): string {
  const { what, fix } = describeMicFailure(f);
  return `Mic didn't start ${when}: ${what}. ${fix}`;
}

/** Settings › Test microphone (mic fix 2026-10-14): asks for the mic, records ~2 s, says whether it works; Play it back plays it. */
export function MicTest({ recordMs = 2000 }: { recordMs?: number }) {
  const [state, setState] = useState<TestState>({ kind: 'idle' });
  const active = useRef<ActiveRecording | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const mounted = useRef(true);
  const letGo = () => {
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  };
  useEffect(() => () => {
    mounted.current = false;
    active.current?.cancel(); // leaving Settings mid-test lets go of the mic
    letGo();
  }, []);

  const run = async () => {
    if (state.kind === 'recording') return;
    letGo();
    setState({ kind: 'recording' });
    stopSpeaking();
    try {
      if (!recordingSupported()) throw new MicUnsupportedError();
      const rec = await startRecording(() => {});
      if (!mounted.current) return rec.cancel();
      active.current = rec;
      await new Promise((ok) => setTimeout(ok, recordMs));
      active.current = null;
      const take = await rec.stop(); // stops the tracks: the mic is released
      if (!mounted.current) return;
      if (!take.blob.size) return setState({ kind: 'empty' });
      url.current = URL.createObjectURL(take.blob);
      audio.current = new Audio(url.current);
      clearMicFailure(); // the mic works: an old failure is no longer news
      setState({ kind: 'ok' });
    } catch (e) {
      active.current = null;
      logError(e);
      const failure = await recordMicFailure(e, 'test');
      if (mounted.current) setState({ kind: 'failed', failure });
    }
  };

  return (
    <div class="mic-test">
      <button type="button" class="small-btn" disabled={state.kind === 'recording'} onClick={() => void run()}>
        {state.kind === 'recording' ? 'Recording… say something' : 'Test microphone'}
      </button>
      {state.kind === 'ok' && (
        <>
          <p role="status" class="mic-test__ok">Mic works ✓ — it recorded 2 seconds. Tap Play it back to hear them.</p>
          <button type="button" class="small-btn" onClick={() => { if (audio.current) { audio.current.currentTime = 0; void audio.current.play().catch(() => {}); } }}>Play it back</button>
        </>
      )}
      {state.kind === 'empty' && <p role="alert" class="warning">The mic opened but recorded nothing. Close ZiJi fully (swipe it away), reopen it and test again.</p>}
      {state.kind === 'failed' && <p role="alert" class="warning">{micFailureLine(state.failure, 'just now')}</p>}
    </div>
  );
}

/** The last mic failure, for the Backup tab's error log (any day). */
export function LastMicFailure() {
  const [f] = useState(readMicFailure);
  if (!f) return null;
  const { what, fix } = describeMicFailure(f);
  return (
    <p class="mic-failure">
      <strong>Last microphone problem</strong> ({new Date(f.at).toLocaleString()}): {what}. {fix}
      <br />
      <small>
        Details: {f.origin === 'test' ? 'Test microphone' : 'a lesson'}; {f.stage}, {f.name}{f.message ? ` “${f.message}”` : ''}; permission {f.permission}; {f.standalone ? 'Home-Screen app' : 'Safari'}; page {f.visibility}; format {f.mime || 'none'} (mp4 {f.mp4 ? 'yes' : 'no'}, webm {f.webm ? 'yes' : 'no'}).
      </small>
    </p>
  );
}
