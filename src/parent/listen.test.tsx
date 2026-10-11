import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPin } from '../lib/hash';
import { addRecording, getCard, getSettings, listRecordings, putCards, putWords } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type Recording } from '../types';
import { Dashboard } from './Dashboard';
import { ListenPanel } from './ListenPanel';
import { ParentArea } from './ParentArea';
import { SettingsPanel } from './SettingsPanel';

vi.mock('../audio/speech', async (orig) => ({ ...(await orig<typeof import('../audio/speech')>()), speak: vi.fn() }));
import { speak } from '../audio/speech';
import * as say from '../session/say';

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

const at = (d: number) => new Date(2026, 9, d, 18).getTime();
const take = (id: string, wordId: string, d: number, review?: 'ok' | 'no'): Recording => ({ id, createdAt: at(d), prompt: { kind: 'say', wordId }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2, ...(review ? { review } : {}) });

async function withTakes() {
  const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, placementDone: true, pinHash: await hashPin('1111') } });
  await putWords(app.db, [makeWord('森', { pinyin: 'sēn' }), makeWord('林', { pinyin: 'lín' })]);
  await putCards(app.db, [makeCard('b:森', 'say', new Date(2026, 9, 9)), makeCard('b:林', 'say', new Date(2026, 9, 9))]);
  for (const t of [take('t2', 'b:林', 2), take('t1', 'b:森', 1), take('t0', 'b:森', 1, 'ok')]) await addRecording(app.db, t);
  return app;
}

describe('Listen & confirm (spec 2026-10-11 §6)', () => {
  it('the waiting takes, oldest first: the word with pinyin, his take, the model, ✓ and ✗', async () => {
    const app = await withTakes();
    renderWithApp(<ListenPanel />, app);
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(2));
    const rows = [...document.querySelectorAll('.listen__row')];
    expect(rows.map((r) => r.querySelector('.listen__word')!.textContent)).toEqual(['森', '林']);
    expect(rows[0]!.querySelector('.listen__py')!.textContent).toBe('sēn');
    expect(rows[0]!.querySelector('audio')).toBeTruthy();
    fireEvent.click(rows[0]!.querySelector('button[aria-label="听"]')!);
    expect(speak).toHaveBeenCalledWith('森', { reading: 'sēn' });
  });
  it('✓ confirms the take and ✗ brings the word back; both leave the queue', async () => {
    const app = await withTakes();
    const onReviewed = vi.fn();
    renderWithApp(<ListenPanel onReviewed={onReviewed} />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Said right: 森' }));
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Not right: 林' }));
    await screen.findByText(/Nothing to listen to/);
    const reviews = Object.fromEntries((await listRecordings(app.db)).map((r) => [r.id, r.review]));
    expect(reviews).toEqual({ t0: 'ok', t1: 'ok', t2: 'no' });
    expect((await getCard(app.db, 'b:林:say'))!.fsrs.due.getTime()).toBeLessThan(new Date(2026, 9, 9).getTime());
    expect(onReviewed).toHaveBeenCalledTimes(2);
  });
  it('a failed review can be tapped again', async () => {
    const app = await withTakes();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(say, 'reviewTake').mockRejectedValueOnce(new Error('idb'));
    renderWithApp(<ListenPanel />, app);
    const ok = await screen.findByRole('button', { name: 'Said right: 森' });
    fireEvent.click(ok);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Said right: 森' }));
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(1));
  });
  it('judging one row leaves the other row\'s audio source alone', async () => {
    const app = await withTakes();
    let n = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:t${n++}`);
    renderWithApp(<ListenPanel />, app);
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(2));
    const before = document.querySelectorAll('.listen__row')[1]!.querySelector('audio')!.getAttribute('src');
    fireEvent.click(screen.getByRole('button', { name: 'Said right: 森' }));
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(1));
    expect(document.querySelector('.listen__row audio')!.getAttribute('src')).toBe(before);
  });
  it('the tab shows a badge with the number waiting, and it goes down as he is heard', async () => {
    const app = await withTakes();
    renderWithApp(<ParentArea />, app);
    for (const d of '1111') fireEvent.click(screen.getByRole('button', { name: d }));
    expect(await screen.findByLabelText('2 waiting')).toBeTruthy();
    fireEvent.click(screen.getByText('Listen & confirm', { selector: '.tab' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Said right: 森' }));
    expect(await screen.findByLabelText('1 waiting')).toBeTruthy();
  });
  it('Overview has a takes-to-review tile that opens the queue', async () => {
    const app = await withTakes();
    const onNavigate = vi.fn();
    renderWithApp(<Dashboard onNavigate={onNavigate} />, app);
    const tile = (await screen.findByText('Takes to review')).closest('.tile')!;
    expect(tile.querySelector('.tile__value')!.textContent).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Listen & confirm' }));
    expect(onNavigate).toHaveBeenCalledWith('listen');
  });
  it('Say takes don’t count toward the Overview’s too-many-recordings warning (final review I5)', async () => {
    const app = await withTakes();
    for (let i = 0; i < 101; i++) await addRecording(app.db, take(`s${i}`, 'b:森', 3, 'ok'));
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, app);
    await screen.findByText('Takes to review');
    expect(screen.queryByText('Tidy up')).toBeNull();
    for (let i = 0; i < 101; i++) await addRecording(app.db, { ...take(`r${i}`, 'b:森', 3), prompt: { kind: 'intro' } });
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, app);
    expect(await screen.findByText('Tidy up')).toBeTruthy();
    expect(screen.getByText(/There are 101 recordings/)).toBeTruthy();
  });
  it('Settings has a Say cards switch, on by default', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    const box = (await screen.findByText('Say cards')).closest('label')!.querySelector('input')!;
    expect(box.checked).toBe(true);
    fireEvent.change(box, { target: { checked: false } });
    await waitFor(async () => expect((await getSettings(app.db)).sayCards).toBe(false));
  });
});
