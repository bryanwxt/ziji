/** A small on-device log of errors after boot, for the parent to send on (no network: it stays on this iPad). */
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
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
