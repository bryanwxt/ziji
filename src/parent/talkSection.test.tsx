// 聊一聊 on Today (parent loop spec §5, 2026-10-18 update): the cards open, 换一个 swaps one, Share uses the sheet or copies, and
// 「✓ 聊了」 logs once with its minutes, with Undo for a short while.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { allTalks, getSettings, saveKid } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { wordStarter } from '../talk/pick';
import { DEFAULT_KID, EMPTY_READING } from '../types';
import { TalkCards, TalkSection } from './TalkSection';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const NOW = new Date(2026, 9, 19, 20);

async function open(undoMs?: number) {
  const app = await makeAppData({ now: () => NOW });
  await saveKid(app.db, { ...DEFAULT_KID, reading: { ...EMPTY_READING, history: { p17: { reads: 1, lastRead: '2026-10-19', rest: 3, q: 1 } } } });
  const onNavigate = vi.fn();
  const onLogged = vi.fn();
  renderWithApp(<TalkSection onNavigate={onNavigate} onLogged={onLogged} undoMs={undoMs} />, app);
  await screen.findByRole('heading', { name: /聊一聊 Talk/ });
  return { app, onNavigate, onLogged };
}
const cards = () => screen.getAllByRole('listitem').filter((li) => li.classList.contains('talk__card'));

describe('聊一聊 on Today', () => {
  it('three cards, each labelled; shared reading of today’s passage; a tap shows the follow-ups and the passage’s answers', async () => {
    await open();
    expect(cards()).toHaveLength(3);
    expect(cards().map((c) => c.querySelector('.talk__kind')!.textContent)).toEqual(['话题 · Topic', '一起读 · Shared reading', '话题 · Topic']);
    const reading = within(cards()[1]!);
    const q = reading.getByRole('button', { name: /牛爷爷做了什么？/ });
    expect(q.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(q);
    expect(q.getAttribute('aria-expanded')).toBe('true');
    expect(reading.getByText(/小马为什么找不到家了？/).textContent).toContain('(书上：跑得很远)');
    expect(reading.getByText('试试用：我觉得…因为…')).toBeTruthy();
  });
  it('a topic card opens to its follow-ups, pattern and sample, and keeps its English line', async () => {
    await open();
    const topic = within(cards()[0]!);
    expect(topic.getByText(/./, { selector: '.talk__en' })).toBeTruthy();
    fireEvent.click(topic.getByRole('button', { expanded: false }));
    expect(topic.getByText(/^试试用：/)).toBeTruthy();
    expect(topic.getByText(/^比如：/)).toBeTruthy();
  });
  it('换一个 swaps that card only, and it stays swapped', async () => {
    const { app } = await open();
    const before = cards().map((c) => c.querySelector('.talk__q')!.textContent);
    fireEvent.click(within(cards()[2]!).getByRole('button', { name: /换一个/ }));
    await waitFor(() => expect(cards()[2]!.querySelector('.talk__q')!.textContent).not.toBe(before[2]));
    expect(cards().slice(0, 2).map((c) => c.querySelector('.talk__q')!.textContent)).toEqual(before.slice(0, 2));
    expect((await getSettings(app.db)).talkDay!.cards[2]!.open).toBe(cards()[2]!.querySelector('.talk__q')!.textContent);
  });
  it('an empty slot is a hidden card, and the others keep their slot for 换一个', () => {
    const onSwap = vi.fn();
    const card = wordStarter({ text: '借', zuci: [], from: 'list' });
    render(<TalkCards cards={[null, card, null]} onSwap={onSwap} />);
    expect(cards()).toHaveLength(1);
    expect(document.querySelectorAll('.talk__card[hidden]')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /换一个/ }));
    expect(onSwap).toHaveBeenCalledWith(1);
  });
  it('Share uses the share sheet with today’s text, in the tap', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, share });
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Share today’s' }));
    expect(share).toHaveBeenCalled(); // at once: iOS opens the sheet only inside the tap
    expect((share.mock.calls[0] as unknown as [{ text: string }])[0].text).toMatch(/^聊一聊 · 19 Oct\n\n1\. 话题 Topic/);
    await Promise.resolve();
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('no share sheet: copied, and says so', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Share today’s' }));
    expect((await screen.findByRole('status')).textContent).toBe('Copied. Paste it into a message.');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('聊一聊 · 19 Oct'));
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('neither the sheet nor the clipboard: the text shows read-only and selected, to copy by hand', async () => {
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: undefined });
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Share today’s' }));
    expect((await screen.findByRole('status')).textContent).toBe('Could not share or copy here. The text is below: select it and copy.');
    const box = screen.getByRole('textbox', { name: 'Today’s talk, to copy' }) as HTMLTextAreaElement;
    expect(box.readOnly).toBe(true);
    expect(box.value).toMatch(/^聊一聊 · 19 Oct\n\n1\. 话题 Topic/);
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect([box.selectionStart, box.selectionEnd]).toEqual([0, box.value.length]);
  });
  it('✓ 聊了 with 10 min logs one talk (a double tap too); the week line adds up; Undo removes it', async () => {
    const { app, onLogged } = await open();
    fireEvent.click(screen.getByRole('button', { name: '10 min' }));
    const done = screen.getByRole('button', { name: /聊了 We talked/ });
    fireEvent.click(done);
    fireEvent.click(done);
    await waitFor(async () => expect(await allTalks(app.db)).toHaveLength(1));
    expect((await allTalks(app.db))[0]).toMatchObject({ at: NOW.getTime(), minutes: 10 });
    expect(await screen.findByText('This week: 1 day · 10 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: '10 min' }).getAttribute('aria-pressed')).toBe('false'); // the chip resets
    expect(onLogged).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await allTalks(app.db)).toEqual([]));
    expect(await screen.findByText('This week: 0 days · 0 min')).toBeTruthy();
  });
  it('Undo goes after its time', async () => {
    await open(300);
    fireEvent.click(screen.getByRole('button', { name: /聊了 We talked/ }));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull(), { timeout: 1000 });
  });
  it('the 2-day note, and Week summary goes to Progress', async () => {
    const { onNavigate } = await open();
    expect(screen.getByText('No talk logged yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Week summary' }));
    expect(onNavigate).toHaveBeenCalledWith('summary');
  });
});
