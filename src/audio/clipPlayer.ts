// Plays a line's clips through Web Audio (spec 2026-10-06 §4): everything is fetched and decoded before the first sound, so
// a line is either said whole or reported failed (and the iPad voice says it), never cut off half way by a missing clip.
import type { ClipStep } from './clips';

export type PlayResult = 'ended' | 'stopped' | 'failed';
export interface ClipBackend { context(): AudioContext | null; load(id: string): Promise<ArrayBuffer> }
export interface ClipPlayer {
  play(steps: ClipStep[], onStart?: () => void): Promise<PlayResult>;
  stop(): void;
  prefetch(ids: string[]): void;
}

/** Decoded clips kept in memory: a lesson's words and their 组词. */
const KEEP = 150;
/** How long the audio engine is given to wake (iOS suspends it when the screen sleeps or another app plays sound). */
const WAKE_MS = 1500;
/**
 * A clip slower than this to arrive (no connection at all): the iPad voice says the line instead of a long silence. Generous on
 * purpose (parent 2026-10-07): the iPad voice sounds different and the silent switch mutes it, so a clip a few seconds late on
 * mobile data is better than a switch of voice or no sound.
 */
export const LOAD_MS = 6000;
/** The lesson's prefetch fetches this many clips at a time, so a line he asks for isn't stuck behind a hundred downloads. */
export const PREFETCH_AT_ONCE = 4;

const inTime = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('clip too slow')), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });

export function createClipPlayer(backend: ClipBackend): ClipPlayer {
  const buffers = new Map<string, Promise<AudioBuffer>>();
  // one download per clip at a time, shared by the prefetch and a line he asks for
  const inFlight = new Map<string, Promise<ArrayBuffer>>();
  const fetchOnce = (id: string): Promise<ArrayBuffer> => {
    let p = inFlight.get(id);
    if (!p) {
      p = backend.load(id);
      inFlight.set(id, p);
      const done = () => { inFlight.delete(id); };
      p.then(done, done);
    }
    return p;
  };
  const queued: string[] = [];
  let prefetching = 0;
  const pump = (): void => {
    while (prefetching < PREFETCH_AT_ONCE && queued.length) {
      prefetching++;
      const settle = () => { prefetching--; pump(); };
      fetchOnce(queued.shift()!).then(settle, settle); // the service worker keeps the file
    }
  };
  let sources: AudioBufferSourceNode[] = [];
  let finish: ((r: PlayResult) => void) | null = null;
  let token = 0;

  const decoded = (ac: AudioContext, id: string): Promise<AudioBuffer> => {
    let p = buffers.get(id);
    if (p) buffers.delete(id); // most recently used goes last
    else {
      const i = queued.indexOf(id);
      if (i >= 0) queued.splice(i, 1); // asked for now: out of the prefetch queue, straight to the network
      p = inTime(fetchOnce(id), LOAD_MS).then((b) => ac.decodeAudioData(b.slice(0))); // decoding detaches the bytes: keep the shared copy whole
      p.catch(() => buffers.delete(id));
    }
    buffers.set(id, p);
    if (buffers.size > KEEP) buffers.delete(buffers.keys().next().value!);
    return p;
  };

  function stop(): void {
    token++;
    for (const s of sources) {
      s.onended = null;
      try { s.stop(); } catch { /* not started yet */ }
    }
    sources = [];
    const f = finish;
    finish = null;
    f?.('stopped');
  }

  async function play(steps: ClipStep[], onStart?: () => void): Promise<PlayResult> {
    stop();
    const mine = token;
    const ac = backend.context();
    if (!ac) return 'failed';
    let bufs: AudioBuffer[];
    try {
      bufs = await Promise.all(steps.flatMap((s) => ('id' in s ? [decoded(ac, s.id)] : [])));
    } catch {
      return mine === token ? 'failed' : 'stopped';
    }
    if (mine !== token) return 'stopped';
    if (ac.state !== 'running') {
      await Promise.race([ac.resume().catch(() => {}), new Promise((r) => setTimeout(r, WAKE_MS))]);
      if (mine !== token) return 'stopped';
      if ((ac.state as AudioContextState) !== 'running') return 'failed'; // asleep outside a tap: the iPad voice says it
    }
    return new Promise<PlayResult>((resolve) => {
      let t = ac.currentTime + 0.02;
      let b = 0;
      const mineSources: AudioBufferSourceNode[] = [];
      for (const s of steps) {
        if ('pause' in s) { t += s.pause; continue; }
        const src = ac.createBufferSource();
        src.buffer = bufs[b++]!;
        src.connect(ac.destination);
        src.start(t);
        t += src.buffer.duration;
        mineSources.push(src);
      }
      sources = mineSources;
      const last = mineSources[mineSources.length - 1];
      if (!last) { resolve('ended'); return; }
      finish = resolve;
      last.onended = () => {
        if (finish !== resolve) return;
        finish = null;
        sources = [];
        resolve('ended');
      };
      onStart?.();
    });
  }

  function prefetch(ids: string[]): void {
    for (const id of ids) if (!queued.includes(id) && !buffers.has(id)) queued.push(id);
    pump();
  }

  return { play, stop, prefetch };
}
