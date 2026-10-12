import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { afterEach } from 'vitest';

// jsdom's window may hide Node's Web Crypto; the app needs subtle.digest and randomUUID.
if (!globalThis.crypto?.subtle || !globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

if (typeof document !== 'undefined') {
  // jsdom has no object URLs.
  URL.createObjectURL ??= () => 'blob:test';
  URL.revokeObjectURL ??= () => {};
  // jsdom has no media playback: play/pause/load print "Not implemented" errors; quiet stand-ins (tests may still spy on them)
  for (const [name, value] of [['play', () => Promise.resolve()], ['pause', () => {}], ['load', () => {}]] as const) {
    Object.defineProperty(HTMLMediaElement.prototype, name, { value, writable: true, configurable: true });
  }
  // jsdom lacks on* pointer handlers, so Preact would listen for "PointerDown" instead of the
  // real lowercase event; browsers (incl. iPad Safari) have them.
  for (const name of ['onpointerdown', 'onpointerup', 'onpointercancel', 'onpointerleave', 'onpointermove']) {
    for (const proto of [HTMLElement.prototype, SVGElement.prototype]) {
      if (!(name in proto)) Object.defineProperty(proto, name, { value: null, writable: true, configurable: true });
    }
  }
  // jsdom has no PointerEvent either, so fired pointer events would lose clientX/clientY (strokes on Truffle measure them).
  if (typeof PointerEvent === 'undefined') {
    class TestPointerEvent extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
        this.pointerType = init.pointerType ?? 'touch';
      }
    }
    Object.defineProperty(globalThis, 'PointerEvent', { value: TestPointerEvent, configurable: true, writable: true });
  }
  const { cleanup, configure } = await import('@testing-library/preact');
  // waitFor polls until it passes, so a high ceiling costs a passing test nothing; the default 1 s fails under a loaded full run (8 workers, fake-indexeddb)
  configure({ asyncUtilTimeout: 10_000 });
  afterEach(() => cleanup());
}
