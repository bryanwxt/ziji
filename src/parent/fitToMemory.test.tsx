import { cleanup, fireEvent, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { default_w, Rating } from 'ts-fsrs';
import { getSettings, updateSettings } from '../store/repo';
import { schedulerParams, setSchedulerParams } from '../srs/scheduler';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type ReviewLog, type Settings } from '../types';
import { FitToMemory } from './FitToMemory';

const fit = vi.hoisted(() => vi.fn());
vi.mock('../srs/optimizer', () => ({ fitParameters: fit })); // the real optimizer runs in WebKit: scripts/optimizer-check.ts

const FITTED = default_w.map((x, i) => (i === 2 ? x * 4 : x)); // remembers a first right answer longer
/** n training items: n cards answered on two days each. */
const history = (n: number): ReviewLog[] =>
  Array.from({ length: n }, (_, i) => [1, 3].map((d): ReviewLog => ({ cardId: `b:w${i}:recognise`, wordId: `b:w${i}`, kind: 'recognise', at: new Date(2026, 8, d, 16).getTime(), rating: Rating.Good, correct: true }))).flat();

async function show(n: number, settings: Partial<Settings> = {}) {
  const app = await makeAppData({ now: () => new Date(2026, 9, 13, 9) });
  await updateSettings(app.db, settings);
  const onChange = vi.fn(async () => {});
  renderWithApp(<FitToMemory logs={history(n)} cards={[]} settings={{ ...DEFAULT_SETTINGS, ...settings }} onChange={onChange} />, app);
  return { app, onChange };
}

afterEach(() => {
  setSchedulerParams(null);
  fit.mockReset();
});

describe('Fit to his memory (SRS tuning spec §6.2)', () => {
  it('under 1,000 reviews: the count, and the button disabled', async () => {
    await show(412);
    expect(screen.getByText(/Fit to his memory: 412 \/ 1,000 reviews/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Fit to his memory' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('fit → before/after → Use these: saved, and the scheduler uses them', async () => {
    fit.mockResolvedValue({ ok: true, w: FITTED });
    const { app, onChange } = await show(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to his memory' }));
    expect(await screen.findByText('Right 3 times')).toBeTruthy();
    expect(fit.mock.calls[0]![0].count).toBe(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Use these' }));
    await waitFor(async () => expect((await getSettings(app.db)).fsrs).toEqual({ w: FITTED, fittedAt: new Date(2026, 9, 13, 9).getTime(), reviews: 1000 }));
    expect(schedulerParams()[2]).toBeCloseTo(FITTED[2]!, 3);
    expect(onChange).toHaveBeenCalled();
  });
  it('a double tap on Fit runs the optimizer once', async () => {
    let finish: (r: unknown) => void = () => {};
    fit.mockReturnValue(new Promise((r) => (finish = r)));
    await show(1000);
    const button = screen.getByRole('button', { name: 'Fit to his memory' });
    fireEvent.click(button);
    fireEvent.click(button); // both before any re-render: only the busy guard can stop the second
    expect(await screen.findByText('Fitting…')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 80));
    finish({ ok: true, w: FITTED });
    expect(await screen.findByText('Right 3 times')).toBeTruthy();
    expect(fit).toHaveBeenCalledTimes(1);
  });
  it('unmounting during a pending fit: nothing is set or saved afterwards', async () => {
    let finish: (r: unknown) => void = () => {};
    fit.mockReturnValue(new Promise((r) => (finish = r)));
    const { app, onChange } = await show(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to his memory' }));
    expect(await screen.findByText('Fitting…')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 80)); // the optimizer is running
    cleanup();
    finish({ ok: true, w: FITTED });
    await new Promise((r) => setTimeout(r, 30));
    expect((await getSettings(app.db)).fsrs).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });
  it('Keep default: nothing is saved', async () => {
    fit.mockResolvedValue({ ok: true, w: FITTED });
    const { app } = await show(1200);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to his memory' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep default' }));
    expect(screen.queryByText('Right 3 times')).toBeNull();
    expect((await getSettings(app.db)).fsrs).toBeUndefined();
    expect([...schedulerParams()]).toEqual([...default_w]);
  });
  it('a failed fit keeps the default and says so; offline says it needs the internet', async () => {
    fit.mockResolvedValueOnce({ ok: false, reason: 'failed' }).mockResolvedValueOnce({ ok: false, reason: 'offline' });
    const { app } = await show(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to his memory' }));
    expect(await screen.findByText("Couldn't fit — keeping the default")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fit to his memory' }));
    expect(await screen.findByText(/needs the internet the first time\. Try again when online\. If it still fails, close and reopen the app\./)).toBeTruthy();
    expect((await getSettings(app.db)).fsrs).toBeUndefined();
  });
  it('fitted: when and on how many; Back to default; Fit again only after 500 more reviews', async () => {
    const fsrs = { w: FITTED, fittedAt: new Date(2026, 9, 13, 9).getTime(), reviews: 1032 };
    setSchedulerParams(FITTED);
    const { app } = await show(1500, { fsrs });
    expect(screen.getByText(/Fitted on 1,032 reviews, 13 Oct$/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Fit again' }) as HTMLButtonElement).disabled).toBe(true); // 1,500 < 1,532
    fireEvent.click(screen.getByRole('button', { name: 'Back to default' }));
    await waitFor(async () => expect((await getSettings(app.db)).fsrs).toBeUndefined());
    expect([...schedulerParams()]).toEqual([...default_w]);
  });
  it('a stored fit that is not valid shows as not fitted', async () => {
    await show(1000, { fsrs: { w: [1, 2, 3], fittedAt: 0, reviews: 900 } });
    expect(screen.queryByText(/Fitted on/)).toBeNull();
    expect(screen.getByText(/1,000 reviews to fit on\./)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Fit to his memory' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('Fit again is enabled at 500 more reviews', async () => {
    await show(1532, { fsrs: { w: FITTED, fittedAt: 0, reviews: 1032 } });
    expect((screen.getByRole('button', { name: 'Fit again' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
