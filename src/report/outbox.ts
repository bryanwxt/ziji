// Reports for the beta (2026-10-29): errors, "this question is wrong" flags, a line per finished lesson and a parent's note.
// They wait in a small on-device queue and go to one insert-only table (Supabase) when the build has its address and
// the parent hasn't turned sharing off. Nothing in them names the child: a random device id, the app version, the device type.
import { BUILD } from '../build';
import { deviceLabel } from '../lib/device';

export type ReportKind = 'error' | 'mistake' | 'lesson' | 'note';

export interface Report {
  kind: ReportKind;
  at: string; // ISO time it happened
  device: string; // random, made on this device
  version: string;
  platform: string | null;
  body: Record<string, unknown>;
}

const QUEUE = 'ziji-outbox';
const DEVICE = 'ziji-device-id';
const OFF = 'ziji-reports-off';
/** The queue never grows past this: offline for weeks, the oldest go first. */
export const MAX_QUEUED = 100;
/** A report's text fields are cut to this, so a long stack or card can't bloat a row. */
export const MAX_TEXT = 600;
const FLUSH_DELAY_MS = 2000;

interface Target { url: string; key: string }

/** Where reports go: the build's VITE_REPORT_URL and VITE_REPORT_KEY (the public insert key); null until both are set. */
export function reportTarget(env: Record<string, unknown> = import.meta.env): Target | null {
  const url = typeof env.VITE_REPORT_URL === 'string' ? env.VITE_REPORT_URL.replace(/\/+$/, '') : '';
  const key = typeof env.VITE_REPORT_KEY === 'string' ? env.VITE_REPORT_KEY : '';
  return url && key ? { url, key } : null;
}

export function reportsOn(): boolean {
  try {
    return localStorage.getItem(OFF) !== '1';
  } catch {
    return true;
  }
}

export function setReportsOn(on: boolean): void {
  try {
    if (on) localStorage.removeItem(OFF);
    else {
      localStorage.setItem(OFF, '1');
      localStorage.removeItem(QUEUE); // off means nothing waiting goes either
    }
  } catch {
    /* nowhere to keep it */
  }
}

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(DEVICE, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

export function queuedReports(): Report[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(QUEUE) ?? '[]');
    return Array.isArray(list) ? (list as Report[]) : [];
  } catch {
    return [];
  }
}

function keep(list: Report[]): void {
  try {
    localStorage.setItem(QUEUE, JSON.stringify(list.slice(-MAX_QUEUED)));
  } catch {
    /* a full disk: these are lost, the app goes on */
  }
}

const clip = (v: unknown): unknown => (typeof v === 'string' && v.length > MAX_TEXT ? `${v.slice(0, MAX_TEXT)}…` : v);

let timer: ReturnType<typeof setTimeout> | undefined;

/** Queue a report (never throws); it goes on its way a moment later. Sharing off: nothing is kept. */
export function report(kind: ReportKind, body: Record<string, unknown>, at: Date = new Date()): void {
  if (!reportsOn()) return;
  const entry: Report = {
    kind,
    at: at.toISOString(),
    device: deviceId(),
    version: BUILD.hash,
    platform: deviceLabel(),
    body: Object.fromEntries(Object.entries(body).map(([k, v]) => [k, clip(v)])),
  };
  keep([...queuedReports(), entry]);
  if (reportTarget()) {
    clearTimeout(timer);
    timer = setTimeout(() => void flushReports(), FLUSH_DELAY_MS);
  }
}

let sending = false;

/** Send what's waiting, all in one insert. Offline, unconfigured or refused: it waits for the next try. */
export async function flushReports(target: Target | null = reportTarget(), send: typeof fetch = globalThis.fetch): Promise<number> {
  if (!target || sending || !reportsOn() || typeof send !== 'function') return 0;
  const batch = queuedReports();
  if (batch.length === 0) return 0;
  sending = true;
  try {
    const res = await send(`${target.url}/rest/v1/reports`, {
      method: 'POST',
      headers: { apikey: target.key, Authorization: `Bearer ${target.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) return 0;
    // reports queued while this one was on its way stay for the next
    keep(queuedReports().slice(batch.length));
    return batch.length;
  } catch {
    return 0;
  } finally {
    sending = false;
  }
}

/** Boot: send anything left from last time, and again whenever the iPad comes back online. */
export function startReports(): void {
  if (!reportTarget()) return;
  void flushReports();
  window.addEventListener('online', () => void flushReports());
}
