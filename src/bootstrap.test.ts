import { describe, expect, it, vi } from 'vitest';
import { default_w } from 'ts-fsrs';
import { bootstrap, firstRoute } from './bootstrap';
import { DEFAULT_KID, DEFAULT_SETTINGS } from './types';
import { builtinWords, CONTENT_VERSION } from './content';
import { schedulerParams, setSchedulerParams } from './srs/scheduler';
import { allCards, getSettings, getWord, putCards, putWords, seedBuiltinWords, updateSettings } from './store/repo';
import { seededKnownCard } from './srs/scheduler';


vi.mock('./audio/speech', () => ({ loadChineseVoice: vi.fn(async () => null), setSpeechRate: vi.fn() }));

describe('launch (deferred minor, plan 11)', () => {
  it('an older band placement is marked for the new recheck rules on the next launch, once (spec 2026-10-14)', async () => {
    const name = `boot-${crypto.randomUUID()}`;
    const first = await bootstrap(name);
    const at = Date.now() - 8 * 86_400_000;
    await updateSettings(first.db, { placementMarked: undefined, placementResult: { at, reading: 2, understanding: 0, missed: [] } });
    await putCards(first.db, [{ id: 'b:人:recognise', wordId: 'b:人', kind: 'recognise', fsrs: seededKnownCard(new Date(at), 10), passed: at }]);
    first.db.close();
    const second = await bootstrap(name);
    expect((await allCards(second.db)).find((c) => c.id === 'b:人:recognise')!.placed).toBe(true);
    expect((await getSettings(second.db)).placementMarked).toBe(true);
    second.db.close();
  });

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

  it('builds the scheduler from his fitted parameters, and from the defaults when they are invalid (SRS tuning spec §6.2)', async () => {
    const name = `boot-${crypto.randomUUID()}`;
    const first = await bootstrap(name);
    const w = default_w.map((x, i) => (i === 0 ? x * 2 : x));
    await updateSettings(first.db, { fsrs: { w, fittedAt: 1, reviews: 1000 } });
    first.db.close();
    const second = await bootstrap(name);
    expect(schedulerParams()[0]).toBeCloseTo(w[0]!, 3);
    await updateSettings(second.db, { fsrs: { w: [1, 2, 3], fittedAt: 1, reviews: 1000 } });
    second.db.close();
    (await bootstrap(name)).db.close();
    expect([...schedulerParams()]).toEqual([...default_w]);
    setSchedulerParams(null);
  });
});

describe('firstRoute', () => {
  it('a new install: PIN, then meeting Truffle (where he picks his school year), then placement, then home', () => {
    const s = { ...DEFAULT_SETTINGS };
    expect(firstRoute({ settings: s, kid: null })).toEqual({ name: 'setupPin' });
    expect(firstRoute({ settings: { ...s, pinHash: 'h' }, kid: null })).toEqual({ name: 'petSetup' });
    expect(firstRoute({ settings: { ...s, pinHash: 'h', grade: 1, gradeYear: 2026 }, kid: { ...DEFAULT_KID } })).toEqual({ name: 'placement' });
    expect(firstRoute({ settings: { ...s, pinHash: 'h', placementDone: true }, kid: { ...DEFAULT_KID } })).toEqual({ name: 'home' });
  });
  it('an existing install never sees the setup again, with or without a school year set', () => {
    expect(firstRoute({ settings: { ...DEFAULT_SETTINGS, pinHash: 'h', placementDone: true, grade: undefined }, kid: { ...DEFAULT_KID } })).toEqual({ name: 'home' });
  });
});
