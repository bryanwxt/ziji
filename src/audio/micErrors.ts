/** Why the microphone didn't start, and where: only a refusal (MicDeniedError) means "don't ask again this lesson". */
export type MicStage = 'getUserMedia' | 'MediaRecorder' | 'start' | 'timeout';

export const MIC_TIMEOUT_MS = 10_000;

/** An Error or a DOMException (not always an Error subclass): its name and message. */
function errorLike(e: unknown): { name: string; message: string } | null {
  if (!e || typeof e !== 'object') return null;
  const { name, message } = e as { name?: unknown; message?: unknown };
  return typeof name === 'string' && typeof message === 'string' ? { name, message } : null;
}

/** A failure to start recording, keeping the browser's own error name and message (NotReadableError, AbortError…). */
export class MicStartError extends Error {
  constructor(readonly stage: MicStage, original?: unknown) {
    const e = errorLike(original);
    super(e ? e.message : original === undefined ? '' : String(original));
    this.name = e?.name || 'Error';
  }
}

/** The microphone is refused (NotAllowedError or SecurityError): the only failure that blocks it. */
export class MicDeniedError extends MicStartError {
  constructor(original?: unknown) {
    super('getUserMedia', original);
    if (!errorLike(original)) this.name = 'NotAllowedError';
  }
}

/** getUserMedia never answered (often a permission prompt left open): transient, the next tap asks again. */
export class MicTimeoutError extends MicStartError {
  constructor() {
    super('timeout', new Error(`no answer from the microphone in ${MIC_TIMEOUT_MS / 1000} s`));
    this.name = 'TimeoutError';
  }
}
