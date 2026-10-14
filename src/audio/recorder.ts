import { average, rmsLevel } from '../langdu/loudness';
import { MIC_TIMEOUT_MS, micPermission, MicDeniedError, MicStartError, MicTimeoutError, MicUnsupportedError } from './micErrors';
import { openMeterContext } from './meter';

export const MAX_RECORDING_MS = 60_000;
export { MicDeniedError } from './micErrors';

const SPEECH_SETTLE_MS = 150; // Truffle was speaking at the tap: iPad's audio session needs a moment before the mic can open
const SPEECH_SETTLE_MAX_MS = 300;
const wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));
const speakingNow = () => { try { return typeof speechSynthesis !== 'undefined' && !!speechSynthesis?.speaking; } catch { return false; } };

/** Truffle's voice was just cancelled: ~150 ms, and up to ~300 ms while speechSynthesis still says it is speaking. */
async function speechSettled(): Promise<void> {
  await wait(SPEECH_SETTLE_MS);
  for (let t = SPEECH_SETTLE_MS; t < SPEECH_SETTLE_MAX_MS && speakingNow(); t += 50) await wait(50);
}

/** getUserMedia with a time limit: a stuck iPad must not hang the button. No limit while the permission question is on screen
 *  (he is deciding). A stream that comes after the limit is let go at once. Called synchronously, so a first try stays in the tap. */
function openMic(): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(
      (stream) => {
        if (settled) return stream.getTracks().forEach((t) => t.stop());
        settled = true;
        clearTimeout(timer);
        resolve(stream);
      },
      (e: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const name = (e as { name?: string } | null)?.name;
        reject(name === 'NotAllowedError' || name === 'SecurityError' ? new MicDeniedError(e) : new MicStartError('getUserMedia', e));
      },
    );
    void micPermission().then((state) => {
      if (settled || state === 'prompt') return;
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new MicTimeoutError());
      }, MIC_TIMEOUT_MS);
    });
  });
}

export interface StartOptions {
  /** the meter's context, made by the caller in the tap and reused by a retry; the caller closes it if every try fails */
  meterCtx?: AudioContext | null;
  /** Truffle was speaking when he tapped: wait for the audio to let go before asking for the mic */
  wasSpeaking?: boolean;
}

export interface FinishedRecording {
  blob: Blob;
  mime: string;
  durationSec: number;
  level?: number; // average loudness while recording, when levels were measured
}

export interface ActiveRecording {
  stop(): Promise<FinishedRecording>;
  cancel(): void;
}

export function pickMime(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder) return '';
  return ['audio/mp4', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}

export function recordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
}

/** Reads the microphone level (RMS) every 100 ms from the recording's stream. */
function startLevels(ctx: AudioContext, stream: MediaStream, onLevel: (level: number) => void): { stop(close: boolean): void; levels: number[] } | null {
  void ctx.resume?.()?.catch(() => {}); // a context made in the tap may have been suspended while the prompt was up
  try {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const levels: number[] = [];
    const tick = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      const l = rmsLevel(buf);
      levels.push(l);
      onLevel(l);
    }, 100);
    return {
      levels,
      stop: (close) => {
        clearInterval(tick);
        if (close) void ctx.close().catch(() => {});
      },
    };
  } catch {
    return null; // no meter: the recording goes on; the context closes with the recording
  }
}

export async function startRecording(onAutoStop: () => void, onLevel?: (level: number) => void, opts: StartOptions = {}): Promise<ActiveRecording> {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder || !navigator.mediaDevices?.getUserMedia) throw new MicUnsupportedError();
  const own = opts.meterCtx === undefined; // no context given: make one now (still in the tap) and close it on a failure
  const meterCtx = !onLevel ? null : own ? openMeterContext() : opts.meterCtx!;
  const letGoMeter = () => { if (own) void meterCtx?.close().catch(() => {}); };
  let stream: MediaStream;
  try {
    // nothing was speaking: ask at once, inside the tap (iPad Safari); otherwise give the audio a moment first
    stream = await (opts.wasSpeaking ? speechSettled().then(openMic) : openMic());
  } catch (e) {
    letGoMeter();
    throw e instanceof MicStartError ? e : new MicStartError('getUserMedia', e);
  }
  const mime = pickMime();
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  } catch (e) {
    // couldn't record after all: let go of the microphone and the meter
    stream.getTracks().forEach((t) => t.stop());
    letGoMeter();
    throw new MicStartError('MediaRecorder', e);
  }
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const started = Date.now();
  const timer = setTimeout(onAutoStop, MAX_RECORDING_MS);
  const meter = onLevel && meterCtx ? startLevels(meterCtx, stream, onLevel) : null;
  const release = (closeMeter = true) => {
    clearTimeout(timer);
    meter?.stop(false);
    if (closeMeter) void meterCtx?.close().catch(() => {}); // a recording that started owns the context
    stream.getTracks().forEach((t) => t.stop());
  };
  try {
    recorder.start();
  } catch (e) {
    release(false);
    letGoMeter();
    throw new MicStartError('start', e);
  }
  return {
    stop: () =>
      new Promise((resolve) => {
        const finish = () => {
          release();
          const type = recorder.mimeType || mime || 'audio/mp4';
          const level = meter?.levels.length ? average(meter.levels) : undefined;
          resolve({ blob: new Blob(chunks, { type }), mime: type, durationSec: Math.round((Date.now() - started) / 1000), ...(level === undefined ? {} : { level }) });
        };
        // iOS may already have ended it (app switched, Siri): finish with what was captured rather than wait forever
        if (recorder.state === 'inactive') return finish();
        recorder.onstop = finish;
        try {
          recorder.stop();
        } catch {
          finish();
        }
      }),
    cancel: () => {
      recorder.onstop = () => release();
      if (recorder.state !== 'inactive') recorder.stop();
      else release();
    },
  };
}
