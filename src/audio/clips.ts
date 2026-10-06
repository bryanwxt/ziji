// The neural voice's clips (spec 2026-10-06 §4): which line has a clip, and how a line built from pieces is said.
import { clipKey } from './clipKey';

export interface ClipIndex { v: 1; voice: string; clips: Record<string, string> }
/** One step of saying a line: a clip, or a pause in seconds. */
export type ClipStep = { id: string } | { pause: number };
export const COMMA_PAUSE = 0.3;
/** A meaning question's gap (before，，after): long enough to hear that something is missing. */
export const GAP_PAUSE = 0.7;

let index: ClipIndex | null = null;
const BASE = (import.meta.env?.BASE_URL as string | undefined) ?? '/';

export function setClipIndex(i: ClipIndex | null): void {
  index = i;
}

/** Loads the clip index; false (and the iPad voice speaks) when there is none yet, it's broken, or he's offline. */
export async function loadClipIndex(base: string = BASE, get: typeof fetch = fetch): Promise<boolean> {
  try {
    const r = await get(`${base}audio/index.json`);
    if (!r.ok) return false;
    const i = (await r.json()) as ClipIndex;
    if (i?.v !== 1 || typeof i.clips !== 'object' || i.clips === null) return false;
    index = i;
    return true;
  } catch {
    return false;
  }
}

export const clipUrl = (id: string, base: string = BASE): string => `${base}audio/clips/${id}.m4a`;

/**
 * How to say a line with clips: the whole line, or (for a line built from pieces, 长，长城的，长) each piece with a pause.
 * Null when any piece has no clip: the whole line then goes to the iPad voice, never half and half.
 */
export function clipPlan(text: string, reading?: string): ClipStep[] | null {
  if (!index) return null;
  const whole = index.clips[clipKey(text, reading)];
  if (whole) return [{ id: whole }];
  if (!text.includes('，')) return null;
  const steps: ClipStep[] = [];
  let gap = false;
  for (const part of text.split('，')) {
    const p = part.trim();
    if (!p) { gap = steps.length > 0; continue; }
    const id = index.clips[clipKey(p, Array.from(p).length === 1 ? reading : undefined)];
    if (!id) return null;
    if (steps.length) steps.push({ pause: gap ? GAP_PAUSE : COMMA_PAUSE });
    steps.push({ id });
    gap = false;
  }
  return steps.length ? steps : null;
}
