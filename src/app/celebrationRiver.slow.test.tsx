import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_METER } from '../fun/meter';
import { createSessionRecord } from '../session/runner';
import { BUILTIN, builtinWords } from '../content';
import { powerFamilies } from '../fun/powers';
import { getKid, putCards, putWords, saveKid } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type KidState, type SessionPlan, type SessionRecord } from '../types';
import { Celebration } from './Celebration';

vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => true }));

const DAY = '2026-10-02';
const plan: SessionPlan = { steps: ['newwords'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const lesson = (startedAt: number, extra = false): SessionRecord => ({ ...createSessionRecord(plan, DAY, startedAt), completed: true, completedSteps: ['newwords'], ...(extra ? { extra: true } : {}) });
const hold = () => new Promise((r) => setTimeout(r, 1300));
const river = () => document.querySelector('svg.river');

async function show(kid: Partial<KidState>, rec: SessionRecord) {
  const app = await makeAppData();
  await saveKid(app.db, { ...DEFAULT_KID, ...kid });
  const view = renderWithApp(<Celebration rec={rec} />, app);
  await screen.findByText('太棒了！');
  return { app, view };
}
const next = () => fireEvent.click(screen.getByText('继续'));
async function openTheChest() {
  const btn = (await screen.findByRole('button', { name: '按住打开宝箱' })) as HTMLButtonElement;
  await waitFor(() => expect(btn.disabled).toBe(false));
  fireEvent(btn, new Event('pointerdown', { bubbles: true }));
  await hold();
  await waitFor(() => expect(document.querySelector('.chest.is-open')).toBeTruthy());
}

describe('the river meter on the Celebration (rewards spec §3)', () => {
  it("after the day's first lesson the boat sails to the end and the chest opens", async () => {
    const { app } = await show({}, lesson(10));
    next();
    await waitFor(() => expect(river()?.getAttribute('data-halves')).toBe('2'));
    await openTheChest();
    const kid = (await getKid(app.db))!;
    expect(kid.meter).toMatchObject({ owed: 0, chestsToday: 1, halves: 0, day: DAY });
    expect(kid.lastChestDate).toBe(DAY);
  });
  it('after one extra lesson: the boat half way and 再学一课就能开宝箱！, no chest', async () => {
    await show({ lastChestDate: DAY, meter: { ...EMPTY_METER, chestsToday: 1, day: DAY, lesson: 10 } }, lesson(20, true));
    next();
    await waitFor(() => expect(river()?.getAttribute('data-halves')).toBe('1'));
    expect(screen.getByText('再学一课就能开宝箱！')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '按住打开宝箱' })).toBeNull();
  });
  it('after two extra lessons: the second chest, then 明天再开宝箱！', async () => {
    const { app } = await show({ lastChestDate: DAY, meter: { ...EMPTY_METER, halves: 1, chestsToday: 1, day: DAY, lesson: 20 } }, lesson(30, true));
    next();
    await openTheChest();
    expect(screen.getByText('明天再开宝箱！')).toBeTruthy();
    expect((await getKid(app.db))!.meter.chestsToday).toBe(2);
  });
  it('capped: no chest, 明天再开宝箱！, and the half goes to the bank', async () => {
    const { app } = await show({ lastChestDate: DAY, meter: { ...EMPTY_METER, chestsToday: 2, day: DAY, lesson: 30 } }, lesson(40, true));
    next();
    expect(await screen.findByText('明天再开宝箱！')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '按住打开宝箱' })).toBeNull();
    expect((await getKid(app.db))!.bank).toBe(1);
  });
  it('the bank and the first lesson: two chests, one after the other', async () => {
    const { app } = await show({ meter: { ...EMPTY_METER, chestsToday: 2, day: '2026-10-01', lesson: 5 }, bank: 2 }, lesson(10));
    next();
    await openTheChest();
    next();
    await openTheChest();
    expect((await getKid(app.db))!.meter).toMatchObject({ owed: 0, chestsToday: 2 });
  });
  it('a finished lesson celebrated again counts once; its unopened chest is still there (review focus 1)', async () => {
    const { app, view } = await show({}, lesson(10));
    view.unmount(); // he left before opening it
    renderWithApp(<Celebration rec={lesson(10)} />, app);
    await screen.findByText('太棒了！');
    expect((await getKid(app.db))!.meter).toMatchObject({ owed: 1, chestsToday: 1 });
    next();
    await openTheChest();
    expect((await getKid(app.db))!.meter).toMatchObject({ owed: 0, chestsToday: 1 });
  });
  it("an extra lesson's chest left unopened opens at the next Celebration (review focus 3)", async () => {
    const { app, view } = await show({ lastChestDate: DAY, meter: { ...EMPTY_METER, halves: 1, chestsToday: 1, day: DAY, lesson: 20 } }, lesson(30, true));
    view.unmount(); // an extra lesson is never saved: he cannot come back to it
    renderWithApp(<Celebration rec={lesson(40, true)} />, app);
    await screen.findByText('太棒了！');
    next();
    await openTheChest(); // the chest he left
    expect(await getKid(app.db)).toMatchObject({ bank: 1, meter: { owed: 0, chestsToday: 2 } });
  });
  it('free play: no river and no chest', async () => {
    const app = await makeAppData();
    renderWithApp(<Celebration rec={{ ...lesson(10), free: true }} />, app);
    await screen.findByText('练习得很好！');
    expect(river()).toBeNull();
    expect((await getKid(app.db))?.meter.lesson ?? null).toBeNull(); // nothing counted
    expect(screen.queryByRole('button', { name: '按住打开宝箱' })).toBeNull();
  });

  it('the hold button takes focus once the boat reaches the chest (a11y, rewards fix round)', async () => {
    await show({}, lesson(10));
    next();
    const btn = await screen.findByRole('button', { name: '按住打开宝箱' });
    await waitFor(() => expect(document.activeElement).toBe(btn));
  });
  it('a double tap on 继续 moves one phase, never two (rewards fix round)', async () => {
    await show({ lastChestDate: DAY, meter: { ...EMPTY_METER, chestsToday: 1, day: DAY, lesson: 10 } }, lesson(20, true));
    next();
    fireEvent.click(screen.getByText('继续')); // the second tap of a double tap lands on the next phase's 继续
    await new Promise((r) => setTimeout(r, 50));
    expect(river()?.getAttribute('data-halves')).toBe('1'); // still on the river
  });
  it('a chest already opened elsewhere: the prize shows, but the power-up saved after it never carries it (rewards fix round)', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, powerFamilies(BUILTIN).water.slice(0, 3).map((c) => makeCard(`b:${c}`, 'recognise', new Date(2026, 9, 1), true)));
    await saveKid(app.db, DEFAULT_KID);
    renderWithApp(<Celebration rec={lesson(10)} />, app);
    await screen.findByText('太棒了！');
    next();
    const btn = (await screen.findByRole('button', { name: '按住打开宝箱' })) as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(false));
    const k = (await getKid(app.db))!;
    await saveKid(app.db, { ...k, meter: { ...k.meter, owed: 0 } }); // opened in another tab meanwhile
    fireEvent(btn, new Event('pointerdown', { bubbles: true }));
    await hold();
    await waitFor(() => expect(document.querySelector('.chest.is-open')).toBeTruthy());
    for (let i = 0; i < 6 && !screen.queryByText('新能力！'); i++) {
      await new Promise((r) => setTimeout(r, 350));
      fireEvent.click(screen.getByText('继续'));
    }
    fireEvent(await screen.findByRole('button', { name: '按住，变身！' }), new Event('pointerdown', { bubbles: true }));
    await hold();
    await waitFor(async () => expect((await getKid(app.db))!.powerTiersSeen.water).toBe(1));
    const after = (await getKid(app.db))!;
    expect(after.ownedCostumes).toEqual(DEFAULT_KID.ownedCostumes);
    expect(after.ownedAccessories).toEqual(DEFAULT_KID.ownedAccessories);
    expect(after.meter.owed).toBe(0);
  });
});
