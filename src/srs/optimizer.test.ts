// @vitest-environment node
// The wrapper's failure handling, with fsrs-browser stood in for; the real optimizer runs in WebKit (scripts/optimizer-check.ts).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { default_w } from 'ts-fsrs';

const wasm = vi.hoisted(() => ({ init: vi.fn(), compute: vi.fn(), free: vi.fn() }));
vi.mock('fsrs-browser', () => ({
  default: wasm.init,
  DEFAULT_PARAMETERS: () => Float32Array.from(default_w),
  Fsrs: class { computeParameters = wasm.compute; free = wasm.free; },
}));

const data = { ratings: [3, 3], deltaTs: [0, 1], lengths: [2], count: 1 };
const FITTED = default_w.map((x, i) => (i === 2 ? x * 4 : x));

beforeEach(() => {
  vi.resetModules(); // a fresh wrapper each test: its loaded module is cached inside
  wasm.init.mockReset().mockResolvedValue(undefined);
  wasm.compute.mockReset();
  wasm.free.mockReset();
});
const load = async () => (await import('./optimizer')).fitParameters;

describe('fitParameters (spec §6.2)', () => {
  it('returns his 21 parameters, fitted with short-term on, and frees the optimizer', async () => {
    wasm.compute.mockReturnValue(Float32Array.from(FITTED));
    const r = await (await load())(data);
    expect(r.ok && r.w.map((x) => Math.round(x * 1000))).toEqual(FITTED.map((x) => Math.round(x * 1000)));
    expect(wasm.compute.mock.calls[0]![4]).toBe(true);
    expect(wasm.free).toHaveBeenCalled();
  });
  it('a panic is "failed"', async () => {
    wasm.compute.mockImplementation(() => { throw new Error('RuntimeError: unreachable'); });
    expect(await (await load())(data)).toEqual({ ok: false, reason: 'failed' });
  });
  it('the defaults handed back (too little to learn from) are "failed": nothing was fitted', async () => {
    wasm.compute.mockReturnValue(Float32Array.from(default_w));
    expect(await (await load())(data)).toEqual({ ok: false, reason: 'failed' });
  });
  it('invalid parameters are "failed"', async () => {
    wasm.compute.mockReturnValue(Float32Array.from([...FITTED.slice(0, 20), Number.NaN]));
    expect(await (await load())(data)).toEqual({ ok: false, reason: 'failed' });
  });
  it('offline the first time: "offline", and the next tap tries again', async () => {
    wasm.init.mockRejectedValueOnce(new TypeError('Load failed'));
    wasm.compute.mockReturnValue(Float32Array.from(FITTED));
    const fit = await load();
    expect(await fit(data)).toEqual({ ok: false, reason: 'offline' });
    expect((await fit(data)).ok).toBe(true);
    expect(wasm.init).toHaveBeenCalledTimes(2);
  });
});
