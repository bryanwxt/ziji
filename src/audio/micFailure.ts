/** The last time the microphone didn't start, with the iPad's state then: kept on this device for the parent (mic fix 2026-10-14). */
import { MicDeniedError, MicStartError, type MicStage } from './micErrors';

export interface MicFailure {
  at: number;
  stage: MicStage;
  name: string;
  message: string;
  kind: 'denied' | 'transient';
  mime: string; // the format a recording would have used
  mp4: boolean; // MediaRecorder.isTypeSupported('audio/mp4')
  webm: boolean;
  standalone: boolean; // opened from the Home Screen
  permission: string; // navigator.permissions' answer for the microphone, or 'unknown'
  visibility: string; // document.visibilityState
}

const KEY = 'ziji-mic-failure';

function supports(type: string): boolean {
  try {
    return typeof MediaRecorder !== 'undefined' && !!MediaRecorder && MediaRecorder.isTypeSupported(type);
  } catch {
    return false;
  }
}

function standalone(): boolean {
  try {
    if ((navigator as { standalone?: boolean }).standalone) return true;
    return typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

async function permission(): Promise<string> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return 'unknown'; // older Safari has no microphone permission query
  }
}

/** Keeps this failure as the last one; never throws. */
export async function recordMicFailure(err: unknown, at: number = Date.now()): Promise<MicFailure> {
  const mp4 = supports('audio/mp4');
  const webm = supports('audio/webm');
  const failure: MicFailure = {
    at,
    stage: err instanceof MicStartError ? err.stage : 'start',
    name: (err as { name?: string } | null)?.name ?? 'Error',
    message: typeof (err as { message?: unknown } | null)?.message === 'string' ? (err as { message: string }).message : String(err),
    kind: err instanceof MicDeniedError ? 'denied' : 'transient',
    mime: mp4 ? 'audio/mp4' : webm ? 'audio/webm' : '',
    mp4,
    webm,
    standalone: standalone(),
    permission: await permission(),
    visibility: typeof document === 'undefined' ? 'unknown' : document.visibilityState,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(failure));
  } catch {
    /* nowhere to keep it */
  }
  return failure;
}

export function readMicFailure(): MicFailure | null {
  try {
    const f: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return f && typeof f === 'object' && typeof (f as MicFailure).at === 'number' ? (f as MicFailure) : null;
  } catch {
    return null;
  }
}

export function clearMicFailure(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Plain words for the parent: what happened, and what to do about it. */
export function describeMicFailure(f: MicFailure): { what: string; fix: string } {
  if (f.kind === 'denied') {
    return {
      what: `permission denied (${f.standalone ? 'Home-Screen app' : 'in Safari'})`,
      fix: f.standalone
        ? 'On the iPad: Settings › Apps › Safari › Microphone → Ask or Allow, then reopen ZiJi and tap Allow. (A Home-Screen app asks again each time it opens; one "Don\'t Allow" blocks the mic until ZiJi is closed and reopened.)'
        : 'On the iPad: Settings › Apps › Safari › Microphone → Ask or Allow (or tap ᴀA in the address bar › Website Settings › Microphone), then reload ZiJi and tap Allow.',
    };
  }
  if (f.stage === 'timeout') {
    return {
      what: 'no answer from the microphone within 10 seconds (the "Allow microphone" question may have been left open)',
      fix: 'Tap the mic again and answer Allow. If no question appears, close ZiJi fully (swipe it away) and reopen it.',
    };
  }
  return {
    what: `the microphone was busy or not ready (${f.name}${f.stage === 'getUserMedia' ? '' : ` at ${f.stage}`})`,
    fix: 'This usually passes: tapping the mic again works. If it keeps happening, end any call or other app using the mic, then close and reopen ZiJi.',
  };
}
