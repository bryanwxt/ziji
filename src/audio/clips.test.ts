import { afterEach, describe, expect, it, vi } from 'vitest';
import { clipPlan, clipUrl, COMMA_PAUSE, GAP_PAUSE, loadClipIndex, setClipIndex } from './clips';

const index = { v: 1 as const, voice: 't', clips: { '长|cháng': 'c1', 长: 'c1', 长城的: 'c2', 门口: 'c3', 我在: 'c4', 等你: 'c5' } };

describe('clipPlan', () => {
  afterEach(() => setClipIndex(null));
  it('no index: no plan (the iPad voice speaks)', () => {
    expect(clipPlan('门口')).toBeNull();
  });
  it('a whole line, a lone character by its reading, or by its plain text', () => {
    setClipIndex(index);
    expect(clipPlan('门口')).toEqual([{ id: 'c3' }]);
    expect(clipPlan('长', 'cháng')).toEqual([{ id: 'c1' }]);
    expect(clipPlan('长')).toEqual([{ id: 'c1' }]);
  });
  it('a 听写 cue is its pieces with short pauses', () => {
    setClipIndex(index);
    expect(clipPlan('长，长城的，长')).toEqual([{ id: 'c1' }, { pause: COMMA_PAUSE }, { id: 'c2' }, { pause: COMMA_PAUSE }, { id: 'c1' }]);
  });
  it("a meaning question's gap (，，) is a longer pause", () => {
    setClipIndex(index);
    expect(clipPlan('我在，，等你')).toEqual([{ id: 'c4' }, { pause: GAP_PAUSE }, { id: 'c5' }]);
  });
  it('any missing piece: no plan, so the whole line goes to the iPad voice', () => {
    setClipIndex(index);
    expect(clipPlan('长，长江的，长')).toBeNull();
    expect(clipPlan('大门')).toBeNull();
  });
});

describe('loadClipIndex', () => {
  afterEach(() => setClipIndex(null));
  it('loads a good index from the site', async () => {
    const get = vi.fn(async () => new Response(JSON.stringify(index)));
    expect(await loadClipIndex('/ziji/', get as unknown as typeof fetch)).toBe(true);
    expect(get).toHaveBeenCalledWith('/ziji/audio/index.json');
    expect(clipPlan('门口')).toEqual([{ id: 'c3' }]);
  });
  it('a 404, a bad file or no network: false, and no plans', async () => {
    for (const get of [async () => new Response('', { status: 404 }), async () => new Response('{"v":2}'), async () => { throw new TypeError('offline'); }]) {
      expect(await loadClipIndex('/', get as unknown as typeof fetch)).toBe(false);
      expect(clipPlan('门口')).toBeNull();
    }
  });
  it('clip urls sit under the site base', () => {
    expect(clipUrl('ab12', '/ziji/')).toBe('/ziji/audio/clips/ab12.m4a');
  });
});
