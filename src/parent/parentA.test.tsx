import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { hashPin } from '../lib/hash';
import { createSessionRecord } from '../session/runner';
import { addReviewLog, getSettings, listRewards, putCards, putWords, saveReward, saveSession } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type SessionPlan } from '../types';
import { Dashboard } from './Dashboard';
import { ErrorScreen } from '../app/ErrorScreen';
import { PinGate } from './PinGate';
import { RewardsPanel } from './RewardsPanel';

const emptyPlan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const type = (pin: string) => [...pin].forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));

describe('PinGate', () => {
  it('unlocks with the right PIN only', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, pinHash: await hashPin('2468') } });
    renderWithApp(<PinGate><p>secret</p></PinGate>, app);
    type('1111');
    expect(await screen.findByText('That PIN is not right. Try again.')).toBeTruthy();
    type('2468');
    expect(await screen.findByText('secret')).toBeTruthy();
  });

  it('lets a grown-up reset a forgotten PIN', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, pinHash: await hashPin('2468') } });
    renderWithApp(<PinGate><p>secret</p></PinGate>, app);
    fireEvent.click(screen.getByText('Forgot PIN?'));
    const [, a, b] = document.body.textContent!.match(/(\d+) × (\d+)/)!;
    fireEvent.input(screen.getByLabelText('Answer'), { target: { value: String(Number(a) * Number(b)) } });
    fireEvent.click(screen.getByText('Check'));
    await screen.findByText('For parents: choose a 4-digit PIN');
    type('1357');
    await screen.findByText('Enter the same PIN again');
    type('1357');
    expect(await screen.findByText('secret')).toBeTruthy();
    expect((await getSettings(app.db)).pinHash).toBe(await hashPin('1357'));
  });

  it('scrolls instead of clipping on a short screen (a phone turned sideways has no upright overlay here)', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, pinHash: await hashPin('2468') } });
    renderWithApp(<PinGate><p>secret</p></PinGate>, app);
    expect(document.querySelector('.screen')!.classList.contains('screen--scroll')).toBe(true);
    fireEvent.click(screen.getByText('Forgot PIN?'));
    expect(document.querySelector('.screen')!.classList.contains('screen--scroll')).toBe(true);
    const [, a, b] = document.body.textContent!.match(/(\d+) × (\d+)/)!;
    fireEvent.input(screen.getByLabelText('Answer'), { target: { value: String(Number(a) * Number(b)) } });
    fireEvent.click(screen.getByText('Check'));
    await screen.findByText('For parents: choose a 4-digit PIN');
    expect(document.querySelector('.screen')!.classList.contains('screen--scroll')).toBe(true);
  });
  it('the error screen scrolls too', () => {
    renderWithApp(<ErrorScreen message="boom" dbName="x" />, { } as never);
    expect(document.querySelector('.screen')!.classList.contains('screen--scroll')).toBe(true);
  });
});

describe('Dashboard', () => {
  it('summarises progress and flags a missing voice and backup', async () => {
    const app = await makeAppData();
    await putWords(app.db, [makeWord('大')]);
    await putCards(app.db, [makeCard('b:大', 'recognise', new Date(2026, 9, 20), true)]);
    await saveSession(app.db, { ...createSessionRecord(emptyPlan, '2026-10-01', 0), completed: true, activeMs: 15 * 60_000 });
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, app);
    expect(await screen.findByText('1 / 500')).toBeTruthy();
    expect(screen.getByText('No Chinese voice found.')).toBeTruthy();
    expect(screen.getByText(/Last backup: never/)).toBeTruthy();
    expect(screen.getByRole('img', { name: '2026-10-01: 15 minutes' })).toBeTruthy();
  });
});

describe('Dashboard reading figures (deferred minor, plan 11)', () => {
  it('weekly accuracy and trouble words are about reading; meaning lives in Skills', async () => {
    const app = await makeAppData();
    await putWords(app.db, [makeWord('大'), makeWord('小')]);
    const at = app.now().getTime() - 3_600_000;
    await addReviewLog(app.db, { cardId: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', at, rating: 3, correct: true });
    await addReviewLog(app.db, { cardId: 'b:小:meaning', wordId: 'b:小', kind: 'meaning', at, rating: 1, correct: false });
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, app);
    expect(await screen.findByText('Reading accuracy by week')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy(); // the meaning miss is not mixed in
    expect(screen.getByText('Hard to read (last 30 days)')).toBeTruthy();
    expect(screen.queryByText('小')).toBeNull();
  });
});

describe('RewardsPanel', () => {
  it('adds a goal and marks it given once reached', async () => {
    const app = await makeAppData();
    await saveSession(app.db, { ...createSessionRecord(emptyPlan, '2026-10-01', 0), completed: true, completedSteps: ['flashcards'] });
    renderWithApp(<RewardsPanel />, app);
    fireEvent.input(await screen.findByLabelText('Reward'), { target: { value: 'Ice cream' } });
    fireEvent.input(screen.getByLabelText(/Shown to him/), { target: { value: '冰淇淋' } });
    fireEvent.input(screen.getByLabelText('Target'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Add goal'));
    fireEvent.click(await screen.findByText('Mark as given'));
    await waitFor(async () => expect((await listRewards(app.db))[0]!.claimedAt).not.toBeNull());
  });
});

describe('RewardsPanel: what he sees (spec 2026-10-04 §3, phase D)', () => {
  it('a goal needs a Chinese title; its ink icon is picked', async () => {
    const app = await makeAppData();
    renderWithApp(<RewardsPanel />, app);
    fireEvent.input(await screen.findByLabelText('Reward'), { target: { value: 'Lego set' } });
    fireEvent.click(screen.getByText('Add goal'));
    expect(await listRewards(app.db)).toHaveLength(0); // no Chinese title yet
    fireEvent.input(screen.getByLabelText(/Shown to him/), { target: { value: '乐高' } });
    fireEvent.click(screen.getByRole('button', { name: 'car' }));
    expect(screen.getByRole('button', { name: 'car' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByText('Add goal'));
    await waitFor(async () => expect((await listRewards(app.db))[0]).toMatchObject({ title: 'Lego set', zh: '乐高', icon: 'car' }));
  });
  it('an older goal without a Chinese title can get one', async () => {
    const app = await makeAppData();
    await saveReward(app.db, { id: 'g', title: 'Lego set', emoji: '🧱', metric: 'stars', target: 40, createdAt: 0, claimedAt: null });
    renderWithApp(<RewardsPanel />, app);
    fireEvent.input(await screen.findByLabelText('Chinese title for Lego set'), { target: { value: '乐高' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Chinese title for Lego set' }));
    await waitFor(async () => expect((await listRewards(app.db))[0]).toMatchObject({ zh: '乐高', icon: 'gift' }));
  });
});
