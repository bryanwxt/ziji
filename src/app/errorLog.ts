/** A small on-device log of errors after boot, for the parent to send on; each is also reported (src/report/outbox.ts) when sharing is on. */
import { queuedReports, report } from '../report/outbox';

export interface ErrorEntry {
  at: number;
  message: string;
  stack: string; // the first stack line only: where it happened
}

const KEY = 'ziji-error-log';
const MAX = 20;

const describe = (err: unknown): string => (err instanceof Error ? `${err.name}: ${err.message}` : String(err));

/** The first line of the stack that names a place (V8 "at f (…)", WebKit "f@…"), not the message. */
function firstFrame(err: unknown): string {
  const stack = err instanceof Error ? err.stack ?? '' : '';
  return stack.split('\n').map((l) => l.trim()).find((l) => l.startsWith('at ') || l.includes('@')) ?? '';
}

export function readErrorLog(): ErrorEntry[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? (list as ErrorEntry[]) : [];
  } catch {
    return [];
  }
}

/** Newest first; never throws (private mode or a full disk just means no log). */
export function logError(err: unknown, at: number = Date.now()): void {
  try {
    const entry: ErrorEntry = { at, message: describe(err), stack: firstFrame(err) };
    localStorage.setItem(KEY, JSON.stringify([entry, ...readErrorLog()].slice(0, MAX)));
  } catch {
    /* nowhere to keep it */
  }
  sendOn(err);
}

/** Interrupted sounds and a refused mic happen every day: not worth a report. */
const routine = (err: unknown) => err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError');

/** Report it, once while the same one is still waiting to go (a loop of the same error is one line). */
function sendOn(err: unknown): void {
  if (routine(err)) return;
  const message = describe(err);
  if (queuedReports().some((r) => r.kind === 'error' && r.body.message === message)) return;
  report('error', { message, stack: firstFrame(err), screen: typeof location === 'undefined' ? '' : location.hash });
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
