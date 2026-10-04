import { useEffect, useRef, useState } from 'preact/hooks';

export const SAMPLE = '我家有五个人。爸爸是医生，妈妈是老师。';

/** Each character it heard, marked ok when it lines up with the expected sentence (longest common subsequence). */
export function diffChars(expected: string, heard: string): { ch: string; ok: boolean }[] {
  const a = [...expected];
  const b = [...heard];
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  }
  const out: { ch: string; ok: boolean }[] = [];
  let i = 0;
  let j = 0;
  while (j < b.length) {
    if (i < a.length && a[i] === b[j]) {
      out.push({ ch: b[j]!, ok: true });
      i++;
      j++;
    } else if (i < a.length && dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else {
      out.push({ ch: b[j]!, ok: false });
      j++;
    }
  }
  return out;
}

type Recognizer = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult?: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror?: (e: { error?: string }) => void; onend?: () => void };

const recognizerClass = () => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/** A parent-only check of the iPad's speech recognition before any auto-hints are built. Nothing is saved. */
export function AsrTest() {
  const Rec = recognizerClass();
  const [state, setState] = useState<'idle' | 'listening' | 'done' | 'error'>('idle');
  const [heard, setHeard] = useState('');
  const [err, setErr] = useState('');
  const rec = useRef<Recognizer | null>(null);
  useEffect(() => () => rec.current?.stop(), []); // leaving Settings mid-test stops listening

  if (!Rec) return <p>Speech recognition isn't available in this browser.</p>;

  const start = () => {
    const r = new Rec();
    r.lang = 'zh-CN';
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      setHeard(Array.from(e.results).map((res) => res[0]?.transcript ?? '').join(''));
      setState('done');
    };
    r.onerror = (e) => {
      setErr(e.error ?? 'error');
      setState('error');
    };
    r.onend = () => setState((s) => (s === 'listening' ? 'done' : s));
    rec.current = r;
    setHeard('');
    setState('listening');
    r.start();
  };

  return (
    <div class="asr">
      <p class="warning">This test uses Apple's speech service — your child's voice may be sent to Apple to be transcribed. Nothing is saved.</p>
      <p>Ask your child to read this aloud after pressing Start test:</p>
      <p class="asr__sample">{SAMPLE}</p>
      {state === 'listening' ? (
        <button type="button" class="small-btn" onClick={() => rec.current?.stop()}>Stop</button>
      ) : (
        <button type="button" class="small-btn" onClick={start}>Start test</button>
      )}
      {state === 'done' && (
        <>
          <p>It heard:</p>
          <p class="asr__heard">{heard ? diffChars(SAMPLE, heard).map((c, i) => (c.ok ? <span key={i}>{c.ch}</span> : <mark key={i}>{c.ch}</mark>)) : '(nothing)'}</p>
          <p>Highlighted characters differ from the sentence. If this is mostly right, tell Claude and auto-hints can be added.</p>
        </>
      )}
      {state === 'error' && <p class="warning">Speech recognition stopped: {err}. (On iPad it needs Siri &amp; Dictation turned on.)</p>}
    </div>
  );
}
