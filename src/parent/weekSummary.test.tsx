// Progress → Week summary (parent loop spec §5, 2026-10-18 update): this week's rows and focus line, 上周 for last week, Share.
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addTalk } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { WeekSummaryPanel } from './WeekSummaryPanel';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const NOW = new Date(2026, 9, 22, 20);

describe('Week summary', () => {
  it('this week: talk days and minutes, the focus line; 上周 shows last week', async () => {
    const app = await makeAppData({ now: () => NOW });
    await addTalk(app.db, { id: 'a', at: new Date(2026, 9, 20, 19).getTime(), minutes: 15 });
    await addTalk(app.db, { id: 'b', at: new Date(2026, 9, 14, 19).getTime(), minutes: 5 });
    renderWithApp(<WeekSummaryPanel onNavigate={vi.fn()} />, app);
    expect(await screen.findByText('19 Oct – 25 Oct')).toBeTruthy();
    expect(screen.getByText('1 day · 15 min')).toBeTruthy();
    expect(screen.getByText('多聊：这周聊了1天。试试每天聊五分钟，吃饭的时候就可以。')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /上周/ }));
    expect(await screen.findByText('12 Oct – 18 Oct')).toBeTruthy();
    expect(screen.getByText('1 day · 5 min')).toBeTruthy();
  });
  it('Share the week opens the sheet in the tap, with the week’s text', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, share });
    const app = await makeAppData({ now: () => NOW });
    renderWithApp(<WeekSummaryPanel onNavigate={vi.fn()} />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Share the week' }));
    expect(share).toHaveBeenCalledWith({ text: expect.stringMatching(/^ZiJi · week of 19 Oct – 25 Oct\n/) });
  });
  it('Share the week copies when there is no share sheet', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
    const app = await makeAppData({ now: () => NOW });
    renderWithApp(<WeekSummaryPanel onNavigate={vi.fn()} />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Share the week' }));
    expect((await screen.findByRole('status')).textContent).toBe('Copied. Paste it into a message.');
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^ZiJi · week of 19 Oct – 25 Oct\nTalk: 0 days · 0 min/)));
  });
  it('neither works: the week shows read-only and selected; another week clears it', async () => {
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: undefined });
    const app = await makeAppData({ now: () => NOW });
    renderWithApp(<WeekSummaryPanel onNavigate={vi.fn()} />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Share the week' }));
    expect((await screen.findByRole('status')).textContent).toBe('Could not share or copy here. The text is below: select it and copy.');
    const box = screen.getByRole('textbox', { name: 'The week, to copy' }) as HTMLTextAreaElement;
    expect(box.readOnly).toBe(true);
    expect(box.value).toMatch(/^ZiJi · week of 19 Oct – 25 Oct\n/);
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect([box.selectionStart, box.selectionEnd]).toEqual([0, box.value.length]);
    fireEvent.click(screen.getByRole('tab', { name: /上周/ }));
    await screen.findByText('12 Oct – 18 Oct');
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
