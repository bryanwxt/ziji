import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { saveKid } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type SessionPlan, type StepKind } from '../types';
import { COSTUMES } from '../fun/costumes';
import { ACCESSORIES } from '../fun/pet';
import { Celebration } from './Celebration';

vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
const motion = { reduced: false };
vi.mock('../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => motion.reduced }));

const plan = (steps: StepKind[]): SessionPlan => ({ steps, reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 });
const finished = (date: string, steps: StepKind[], free = false) => ({ ...createSessionRecord(plan(steps), date, 0, free), completed: true, completedSteps: steps });

async function setup(free = false, everything = false) {
  const app = await makeAppData();
  // with every costume and accessory owned, the chest gives stars, and the watching Truffle stays to pounce
  const owned = everything ? { ownedCostumes: COSTUMES.map((c) => c.id), ownedAccessories: [...ACCESSORIES] } : {};
  await saveKid(app.db, { ...DEFAULT_KID, worldsSeen: ['yard', 'grass'], ...owned });
  renderWithApp(<Celebration rec={finished('2026-10-02', ['flashcards'], free)} />, app);
  await screen.findByText(free ? '练习得很好！' : '太棒了！');
  return app;
}

describe('the celebration on the stage (spec 2026-10-04 §3, §4.4, phase D)', () => {
  it("a sunburst in the current world's colours, not the red night", async () => {
    motion.reduced = false;
    await setup();
    const burst = document.querySelector('.burst')!;
    expect(burst.getAttribute('data-world')).toBe('grass');
    expect(burst.getAttribute('style')).toMatch(/--burst-a:\s*#[0-9a-f]{6}/i);
    expect(burst.classList.contains('burst--turning')).toBe(true);
    expect(document.querySelector('.scene--night')).toBeNull();
  });
  it('Truffle watches the chest, wiggling, then pounces when it opens', async () => {
    motion.reduced = false;
    await setup();
    fireEvent.click(screen.getByText('继续'));
    await screen.findByRole('button', { name: '按住打开宝箱' });
    expect(document.querySelector('.celebrate__watch svg.truffle')?.getAttribute('data-react')).toBe('excited');
    const chest = screen.getByRole('button', { name: '按住打开宝箱' });
    fireEvent(chest, new Event('pointerdown', { bubbles: true }));
    await waitFor(() => expect(document.querySelector('.prize')).toBeTruthy(), { timeout: 3000 });
    const pounce = document.querySelector('.prize svg.truffle, .celebrate__watch svg.truffle');
    expect(pounce?.getAttribute('data-react')).toBe('pounce');
  });
  it('final review I1: opened within the first wiggle, the pounce still plays (a new reaction key)', async () => {
    motion.reduced = false;
    await setup(false, true);
    fireEvent.click(screen.getByText('继续'));
    await screen.findByRole('button', { name: '按住打开宝箱' });
    const before = document.querySelector('.celebrate__watch svg.truffle')!.getAttribute('data-react-key');
    fireEvent(screen.getByRole('button', { name: '按住打开宝箱' }), new Event('pointerdown', { bubbles: true }));
    await waitFor(() => expect(document.querySelector('.prize')).toBeTruthy(), { timeout: 3000 });
    const watcher = document.querySelector('.celebrate__watch svg.truffle')!;
    expect(watcher.getAttribute('data-react')).toBe('pounce');
    expect(before).toBeTruthy();
    expect(watcher.getAttribute('data-react-key')).not.toBe(before); // useRig replays only on a new key
  });
  it('reduced motion: the rays stand still and Truffle watches without wiggling', async () => {
    motion.reduced = true;
    await setup();
    expect(document.querySelector('.burst')!.classList.contains('burst--turning')).toBe(false);
    fireEvent.click(screen.getByText('继续'));
    await screen.findByRole('button', { name: '按住打开宝箱' });
    expect(document.querySelector('.celebrate__watch svg.truffle')).toBeTruthy();
    expect(document.querySelector('.celebrate__watch svg.truffle')?.hasAttribute('data-react')).toBe(false);
  });
  it('free play: no chest and no counter, Truffle still there', async () => {
    motion.reduced = false;
    await setup(true);
    expect(document.querySelector('.celebrate svg.truffle')).toBeTruthy();
    expect(document.querySelector('.burst')).toBeTruthy();
    expect(document.querySelector('.chip')).toBeNull();
    expect(screen.queryByRole('button', { name: '按住打开宝箱' })).toBeNull();
  });
});
