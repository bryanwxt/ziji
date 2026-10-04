import { describe, expect, it, vi } from 'vitest';
import { bootstrap } from './bootstrap';
import { CONTENT_VERSION } from './content';
import { getWord, putWords, updateSettings } from './store/repo';

vi.mock('./audio/speech', () => ({ loadChineseVoice: vi.fn(async () => null), setSpeechRate: vi.fn() }));

describe('launch (deferred minor, plan 11)', () => {
  it('rewrites the 3,000 built-in words only when the content changed, not on every launch', async () => {
    const name = `boot-${crypto.randomUUID()}`;
    const first = await bootstrap(name);
    expect((await first.db.get('settings', 'main'))?.contentVersion).toBe(CONTENT_VERSION);
    const yi = (await getWord(first.db, 'b:一'))!;
    await putWords(first.db, [{ ...yi, meaning: 'marker' }]); // stands in for an old copy of the content
    first.db.close();
    const second = await bootstrap(name);
    expect((await getWord(second.db, 'b:一'))!.meaning).toBe('marker'); // same content version: left alone
    await updateSettings(second.db, { contentVersion: 'old' });
    second.db.close();
    const third = await bootstrap(name);
    expect((await getWord(third.db, 'b:一'))!.meaning).not.toBe('marker'); // new content: refreshed
    third.db.close();
  });
});
