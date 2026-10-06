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
const WAKE_MS = 300;

export function createClipPlayer(backend: ClipBackend): ClipPlayer {
  const buffers = new Map<string, Promise<AudioBuffer>>();
  let sources: AudioBufferSourceNode[] = [];
  let finish: ((r: PlayResult) => void) | null = null;
  let token = 0;

  const decoded = (ac: AudioContext, id: string): Promise<AudioBuffer> => {
    let p = buffers.get(id);
    if (p) buffers.delete(id); // most recently used goes last
    else {
      p = backend.load(id).then((b) => ac.decodeAudioData(b));
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
    for (const id of ids) void backend.load(id).catch(() => {}); // the service worker keeps the file
  }

  return { play, stop, prefetch };
}
