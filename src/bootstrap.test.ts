import { describe, expect, it, vi } from 'vitest';
import { bootstrap } from './bootstrap';
import { builtinWords, CONTENT_VERSION } from './content';
import { getSettings, getWord, putWords, seedBuiltinWords, updateSettings } from './store/repo';


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

  it('an iPad on 华文 from before both tracks moves to them once, its words rewritten that launch; a later single track sticks (review focus 2)', async () => {
    const name = `boot-${crypto.randomUUID()}`;
    const first = await bootstrap(name);
    await seedBuiltinWords(first.db, builtinWords(0, 'cl'), true);
    await updateSettings(first.db, { course: 'cl', contentCourse: 'cl', lessonVersion: 4 });
    expect((await getWord(first.db, 'b:井'))!.writeable).toBe(false); // 华文 only reads 井
    first.db.close();
    const second = await bootstrap(name);
    expect(await getSettings(second.db)).toMatchObject({ course: 'both', contentCourse: 'both', lessonVersion: 8 });
    expect((await getWord(second.db, 'b:井'))!.writeable).toBe(true); // 高级华文 writes it
    await updateSettings(second.db, { course: 'cl' }); // the parent picks 华文 again
    second.db.close();
    const third = await bootstrap(name);
    expect(await getSettings(third.db)).toMatchObject({ course: 'cl', contentCourse: 'cl' });
    expect((await getWord(third.db, 'b:井'))!.writeable).toBe(false);
    third.db.close();
  });
});
