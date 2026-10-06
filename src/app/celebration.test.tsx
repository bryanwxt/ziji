import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { BUILTIN, builtinWords } from '../content';
import { powerFamilies } from '../fun/powers';
import { getKid, putCards, putWords, saveKid, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type SessionPlan, type StepKind } from '../types';
import { Celebration } from './Celebration';

vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => true }));

const plan = (steps: StepKind[]): SessionPlan => ({ steps, reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 });
const finished = (date: string, steps: StepKind[]) => ({ ...createSessionRecord(plan(steps), date, 0), completed: true, completedSteps: steps });

const hold = () => new Promise((r) => setTimeout(r, 1300));

async function setup(date: string, steps: StepKind[]) {
  const app = await makeAppData();
  await saveKid(app.db, { ...DEFAULT_KID, petName: '小龙' }); // a dragon-era install
  renderWithApp(<Celebration rec={finished(date, steps)} />, app);
  await screen.findByText('太棒了！');
  return app;
}

describe('Celebration chest', () => {
  it('gives one prize however fast the chest is tapped', async () => {
    const app = await setup('2026-10-02', ['flashcards']);
    fireEvent.click(screen.getByText('继续'));
    const chest = await screen.findByRole('button', { name: '按住打开宝箱' });
    for (let i = 0; i < 3; i++) fireEvent(chest, new Event('pointerdown', { bubbles: true }));
    await hold();
    await screen.findByText('松露有新衣服了！'); // first chest: the zodiac onesie (龙 by default)
    expect(screen.getByText('龙')).toBeTruthy();
    expect(document.querySelector('.prize svg.truffle')?.getAttribute('data-outfit')).toBe('dragon');
    await waitFor(async () => expect((await getKid(app.db))?.lastChestDate).toBe('2026-10-02'));
    const kid = await getKid(app.db);
    expect(kid?.ownedCostumes).toEqual(['dragon']);
    expect(kid?.ownedAccessories).toHaveLength(0);
    expect(kid?.bonusStars).toBe(0);
  });

  it("dates the chest by the session's own day when it finishes after midnight", async () => {
    const app = await setup('2026-10-01', ['flashcards']);
    fireEvent.click(screen.getByText('继续'));
    fireEvent(await screen.findByRole('button', { name: '按住打开宝箱' }), new Event('pointerdown', { bubbles: true }));
    await hold();
    await waitFor(async () => expect((await getKid(app.db))?.lastChestDate).toBe('2026-10-01'));
  });

  it('Truffle cheers 喵！ at the stars', async () => {
    await setup('2026-10-02', ['flashcards']);
    expect(document.querySelector('.pet__bubble')?.textContent).toContain('喵');
  });
  it('a tap on the chest (not a hold) wiggles it as a hint to hold', async () => {
    await setup('2026-10-02', ['flashcards']);
    fireEvent.click(screen.getByText('继续'));
    const chest = await screen.findByRole('button', { name: '按住打开宝箱' });
    fireEvent(chest, new Event('pointerdown', { bubbles: true }));
    fireEvent(chest, new Event('pointerup', { bubbles: true }));
    expect(document.querySelector('.chest-hint')).toBeTruthy();
    fireEvent.click(document.querySelector('.chest-art')!); // the picture of the chest says the same
    expect(document.querySelector('.chest-hint')).toBeTruthy();
  });
  it('sweep: the hint keeps keyboard focus on the hold button (no remount)', async () => {
    await setup('2026-10-02', ['flashcards']);
    fireEvent.click(screen.getByText('继续'));
    const chest = await screen.findByRole('button', { name: '按住打开宝箱' });
    chest.focus();
    fireEvent(chest, new Event('pointerdown', { bubbles: true }));
    fireEvent(chest, new Event('pointerup', { bubbles: true }));
    expect(document.querySelector('.chest-hint')).toBeTruthy();
    expect(document.activeElement).toBe(chest);
    expect(chest.isConnected).toBe(true);
  });
  it('gives no chest for a session with no activities in it', async () => {
    await setup('2026-10-02', []);
    expect(screen.getByText('回家')).toBeTruthy();
  });
});

describe('Celebration power-up', () => {
  it('powers Truffle up when a tier is newly reached, and remembers it', async () => {
    const app = await makeAppData();
    const water = powerFamilies(BUILTIN).water.slice(0, 3);
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, water.map((c) => makeCard(`b:${c}`, 'recognise', new Date(2026, 9, 20), true)));
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' });
    renderWithApp(<Celebration rec={finished('2026-10-02', ['flashcards'])} />, app);
    await screen.findByText('太棒了！');
    fireEvent.click(screen.getByText('继续'));
    expect(await screen.findByText('新能力！')).toBeTruthy();
    expect(screen.getByText('按住，变身！')).toBeTruthy();
    expect(document.querySelector('svg.truffle')?.getAttribute('data-tier')).toBe('0');
    fireEvent(screen.getByRole('button', { name: '按住，变身！' }), new Event('pointerdown', { bubbles: true }));
    await hold();
    await waitFor(async () => expect((await getKid(app.db))?.powerTiersSeen.water).toBe(1));
    expect((await getKid(app.db))?.activePower).toBe('water');
    await waitFor(() => expect(document.querySelector('svg.truffle')?.getAttribute('data-power')).toBe('water'));
  });
});

describe('Celebration power-up, several powers at once', () => {
  it('saves every new tier, shows the highest, and only then offers 继续', async () => {
    const app = await makeAppData();
    const fam = powerFamilies(BUILTIN);
    const known = [...fam.water.slice(0, 3), ...fam.fire.slice(0, 3)];
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, known.map((c) => makeCard(`b:${c}`, 'recognise', new Date(2026, 9, 20), true)));
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' });
    renderWithApp(<Celebration rec={finished('2026-10-02', ['flashcards'])} />, app);
    await screen.findByText('太棒了！');
    fireEvent.click(screen.getByText('继续'));
    await screen.findByText('新能力！');
    expect(document.querySelector('.power-intro')?.textContent).toContain('火');
    expect(screen.queryByText('继续')).toBeNull();
    fireEvent(screen.getByRole('button', { name: '按住，变身！' }), new Event('pointerdown', { bubbles: true }));
    await hold();
    await waitFor(async () => expect((await getKid(app.db))?.powerTiersSeen).toEqual({ water: 1, fire: 2 }));
    expect((await getKid(app.db))?.activePower).toBe('fire');
    await waitFor(() => expect(document.querySelector('.celebrate svg.truffle')?.getAttribute('data-tier')).toBe('2'));
  });
  it('never strands the child if saving fails', async () => {
    const app = await makeAppData();
    const water = powerFamilies(BUILTIN).water.slice(0, 3);
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, water.map((c) => makeCard(`b:${c}`, 'recognise', new Date(2026, 9, 20), true)));
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' });
    renderWithApp(<Celebration rec={finished('2026-10-02', ['flashcards'])} />, app);
    await screen.findByText('太棒了！');
    fireEvent.click(screen.getByText('继续'));
    await screen.findByText('新能力！');
    app.db.close();
    fireEvent(screen.getByRole('button', { name: '按住，变身！' }), new Event('pointerdown', { bubbles: true }));
    await hold();
    expect(await screen.findByText('回家')).toBeTruthy();
  });
});

describe('Celebration chest save failure', () => {
  it('still lets the child continue if the chest cannot be saved', async () => {
    const app = await setup('2026-10-02', ['flashcards']);
    fireEvent.click(screen.getByText('继续'));
    const chest = await screen.findByRole('button', { name: '按住打开宝箱' });
    app.db.close();
    fireEvent(chest, new Event('pointerdown', { bubbles: true }));
    await hold();
    expect(await screen.findByText('回家')).toBeTruthy();
  });
});

describe('Celebration power-up in costume', () => {
  it('keeps the onesie and the accessory on', async () => {
    const app = await makeAppData();
    const water = powerFamilies(BUILTIN).water.slice(0, 3);
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, water.map((c) => makeCard(`b:${c}`, 'recognise', new Date(2026, 9, 20), true)));
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02', ownedCostumes: ['tiger'], outfit: 'tiger', ownedAccessories: ['scarf'], wearing: 'scarf' });
    renderWithApp(<Celebration rec={finished('2026-10-02', ['flashcards'])} />, app);
    await screen.findByText('太棒了！');
    fireEvent.click(screen.getByText('继续'));
    await screen.findByText('新能力！');
    expect(document.querySelector('.celebrate svg.truffle')?.getAttribute('data-outfit')).toBe('tiger');
    expect(document.querySelector('.celebrate .truffle__accessory')).toBeTruthy();
  });
});

describe('Celebration accessory prize', () => {
  it('shows Truffle wearing the new accessory with its name', async () => {
    const { COSTUMES } = await import('../fun/costumes');
    const app = await makeAppData();
    await saveKid(app.db, { ...DEFAULT_KID, ownedCostumes: COSTUMES.map((c) => c.id) });
    renderWithApp(<Celebration rec={finished('2026-10-02', ['flashcards'])} />, app);
    await screen.findByText('太棒了！');
    fireEvent.click(screen.getByText('继续'));
    fireEvent(await screen.findByRole('button', { name: '按住打开宝箱' }), new Event('pointerdown', { bubbles: true }));
    await hold();
    await screen.findByText('松露有新东西了！');
    expect(document.querySelector('.prize svg.truffle')?.getAttribute('data-accessory')).toBeTruthy();
  });
});

describe('Truffle in the celebration (spec 2026-10-04 §4.4)', () => {
  it('joy at the stars', async () => {
    await setup('2026-10-02', ['flashcards']);
    expect(document.querySelector('.celebrate svg.truffle')!.getAttribute('data-expression')).toBe('joy');
  });
  it('the Truffle the chest gives him is alive and pounces as it opens', async () => {
    await setup('2026-10-02', ['flashcards']);
    fireEvent.click(screen.getByText('继续'));
    fireEvent(await screen.findByRole('button', { name: '按住打开宝箱' }), new Event('pointerdown', { bubbles: true }));
    await hold();
    await screen.findByText('松露有新衣服了！');
    const prize = document.querySelector('.prize svg.truffle')!;
    expect(prize.getAttribute('data-alive')).toBe('true');
    expect(prize.getAttribute('data-expression')).toBe('joy');
  });
});

describe('the story after the celebration (spec 3c §5)', () => {
  const toEnd = async () => {
    for (let i = 0; i < 6; i++) {
      const b = screen.queryByText('回家') ?? screen.queryByText('继续');
      if (!b) break;
      const home = b.textContent === '回家';
      fireEvent.click(b);
      if (home) return;
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  it('an owed payoff plays after the celebration, then home', async () => {
    const app = await makeAppData();
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' });
    await updateSettings(app.db, { storyProgress: { chapter: 0, readOn: '2026-10-02', setupDone: true, payoffDone: false } });
    renderWithApp(<Celebration rec={finished('2026-10-02', ['flashcards'])} />, app);
    await screen.findByText('太棒了！');
    await toEnd();
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'story', part: 'payoff', chapter: 1, then: { name: 'home' } }));
  });
  it('nothing owed: home as before', async () => {
    const app = await makeAppData();
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' });
    renderWithApp(<Celebration rec={finished('2026-10-02', ['flashcards'])} />, app);
    await screen.findByText('太棒了！');
    await toEnd();
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'home' }));
  });
});
