// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCedictWords, resetCedictWords } from './cedictWords';

afterEach(() => { resetCedictWords(); vi.unstubAllGlobals(); });
describe('loadCedictWords: the headword list, fetched once on demand', () => {
  it('reads one word a line, skipping the # header, and fetches only once', async () => {
    const fetch = vi.fn(async () => new Response('# CC-CEDICT 2026-10-01, CC BY-SA 4.0\n蝴蝶\n秋千\n'));
    vi.stubGlobal('fetch', fetch);
    const a = await loadCedictWords();
    await loadCedictWords();
    expect(a && [...a]).toEqual(['蝴蝶', '秋千']);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toMatch(/data\/cedict-words\.txt$/);
  });
  it('null when offline or missing, and it tries again next time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await loadCedictWords()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    expect(await loadCedictWords()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('蝴蝶\n')));
    expect((await loadCedictWords())?.has('蝴蝶')).toBe(true);
  });
});
