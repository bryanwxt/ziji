// Fitting FSRS to his memory (SRS tuning spec §6.2). fsrs-browser (WebAssembly) is loaded only here, only when the parent taps
// Fit: never in a lesson, never in the service-worker precache (vite.config.ts). Any failure is "couldn't fit", and the defaults
// stay. fsrs-browser 6.6.0 returns its default parameters when it has too little to learn from, and panics (a RuntimeError) on
// malformed input; the module still works after a panic.
import { validParams } from './scheduler';
import type { FitData } from './fitData';

export type FitResult = { ok: true; w: number[] } | { ok: false; reason: 'offline' | 'failed' };
export type Optimizer = (data: FitData) => Promise<FitResult>;

type FsrsBrowser = typeof import('fsrs-browser');
let loading: Promise<FsrsBrowser> | null = null;

async function load(): Promise<FsrsBrowser> {
  loading ??= import('fsrs-browser').then(async (mod) => {
    await mod.default(); // fetches and instantiates the .wasm, once
    return mod;
  });
  try {
    return await loading;
  } catch (err) {
    loading = null; // offline now: the next tap tries again
    throw err;
  }
}

const same = (a: ArrayLike<number>, b: ArrayLike<number>) => a.length === b.length && Array.from(a).every((x, i) => Math.abs(x - b[i]!) < 1e-6);

export const fitParameters: Optimizer = async (data) => {
  let mod: FsrsBrowser;
  try {
    mod = await load();
  } catch {
    return { ok: false, reason: 'offline' };
  }
  try {
    const f = new mod.Fsrs();
    try {
      // enable_short_term: true, as the scheduler (ts-fsrs's default)
      const w = Array.from(f.computeParameters(Uint32Array.from(data.ratings), Uint32Array.from(data.deltaTs), Uint32Array.from(data.lengths), null, true));
      if (!validParams(w) || same(w, mod.DEFAULT_PARAMETERS())) return { ok: false, reason: 'failed' }; // the defaults back: nothing was fitted
      return { ok: true, w };
    } finally {
      f.free();
    }
  } catch {
    return { ok: false, reason: 'failed' }; // a panic
  }
};
