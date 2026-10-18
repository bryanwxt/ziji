// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCedictGlosses, resetCedictGlosses } from './cedictGlosses';

afterEach(() => { resetCedictGlosses(); vi.unstubAllGlobals(); });
describe('loadCedictGlosses: CC-CEDICT English for list words, fetched once on demand', () => {
  it('reads word<TAB>gloss a line, skipping the # header, and fetches only once', async () => {
    const fetch = vi.fn(async () => new Response('# CC-CEDICT 2026-10-16, CC BY-SA 4.0\n共用\tshare the use of\n扁豆\thyacinth bean\n'));
    vi.stubGlobal('fetch', fetch);
    const a = await loadCedictGlosses();
    await loadCedictGlosses();
    expect(a && [...a]).toEqual([['共用', 'share the use of'], ['扁豆', 'hyacinth bean']]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toMatch(/data\/cedict-glosses\.txt$/);
  });
  it('null when offline or missing, and it tries again next time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await loadCedictGlosses()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    expect(await loadCedictGlosses()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('共用\tshare\n')));
    expect((await loadCedictGlosses())?.get('共用')).toBe('share');
  });
});
