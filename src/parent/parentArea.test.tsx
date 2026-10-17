// The parent area in five tabs (parent, 2026-10-15): every old tab has a home, and the shortcuts go there.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPin } from '../lib/hash';
import { addRecording } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type Recording } from '../types';
import { HOME, ParentArea, placeId, type ParentPlace } from './ParentArea';

vi.mock('../content/strokes', () => ({ strokeAvailability: vi.fn(async () => 'yes') }));
vi.mock('../lib/files', () => ({ saveTextFile: vi.fn(async () => {}) }));
vi.mock('../audio/speech', async (real) => ({ ...(await real<typeof import('../audio/speech')>()), stopSpeaking: vi.fn(), speak: vi.fn() }));

const scrolled: string[] = [];
beforeEach(() => {
  scrolled.length = 0;
  Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this.id); };
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => { cleanup(); });

async function open(over: Partial<typeof DEFAULT_SETTINGS> = {}) {
  const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, placementDone: true, pinHash: await hashPin('1111'), ...over } });
  return app;
}
function enter(app: Awaited<ReturnType<typeof open>>) {
  const r = renderWithApp(<ParentArea />, app);
  for (const d of '1111') fireEvent.click(screen.getByRole('button', { name: d }));
  return r;
}
const tab = (name: RegExp) => screen.getByRole('tab', { name });
const heading = (name: string | RegExp) => screen.findByRole('heading', { name });

describe('the parent area in five tabs', () => {
  it('shows 今天 Today, 进度 Progress, 内容 Content, 奖励 Rewards and 设置 Settings; Today is open', async () => {
    enter(await open());
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['今天 Today', '进度 Progress', '内容 Content', '奖励 Rewards', '设置 Settings']);
    expect(tab(/Today/).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tab(/Today/).id);
    expect(screen.getByRole('button', { name: /Done/ })).toBeTruthy();
  });

  it('every old tab is reachable', async () => {
    enter(await open());
    // Today: the overview, Listen & confirm, and all recordings behind a toggle
    expect(await screen.findByText('Day streak')).toBeTruthy();
    expect(await screen.findByText('This week, try this')).toBeTruthy();
    expect(await heading(/聊一聊 Talk/)).toBeTruthy();
    expect(document.getElementById(placeId('talk'))).toBeTruthy();
    expect(await heading('Listen & confirm')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Recordings' })).toBeNull();
    const more = screen.getByRole('button', { name: /All recordings/ });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(await heading('Recordings')).toBeTruthy();
    // Progress: School (his book's lists and the placement), Skills, Memory
    fireEvent.click(tab(/Progress/));
    for (const h of ['School', 'MOE progress', 'Placement', 'Skills', 'Memory', 'Fit to his memory', /Remembered after a gap/, /Missed most/]) expect(await heading(h)).toBeTruthy();
    expect(await heading('Week summary')).toBeTruthy();
    const order = [...document.querySelectorAll('.parent__section-title')].map((h) => h.textContent);
    expect(order).toEqual(['Week summary', 'School', 'Skills', 'Memory']);
    for (const p of ['summary', 'school', 'skills', 'memory'] as const) expect(document.getElementById(placeId(p))).toBeTruthy(); // where a shortcut would scroll
    // Content: five parts, 本周词语 first (weekly list spec 2026-10-17 §3.1)
    fireEvent.click(tab(/Content/));
    const parts = within(screen.getByRole('tablist', { name: 'Content' }));
    expect(parts.getAllByRole('tab').map((t) => t.textContent)).toEqual(['This week', 'Words', 'From a worksheet', 'Reading texts', 'Pictures']);
    fireEvent.click(parts.getByRole('tab', { name: 'This week' })); // an earlier test may have left another part
    expect(await heading('This week’s words (本周词语)')).toBeTruthy();
    fireEvent.click(parts.getByRole('tab', { name: 'Words' }));
    expect(await heading('Add a school word list (听写)')).toBeTruthy();
    fireEvent.click(parts.getByRole('tab', { name: 'From a worksheet' }));
    expect(await heading('From a worksheet')).toBeTruthy();
    fireEvent.click(parts.getByRole('tab', { name: 'Reading texts' }));
    expect(await heading('Reading texts (朗读)')).toBeTruthy();
    fireEvent.click(parts.getByRole('tab', { name: 'Pictures' }));
    expect(await heading('Pictures for 看图说话')).toBeTruthy();
    // Rewards
    fireEvent.click(tab(/Rewards/));
    expect(await heading('Add a reward goal')).toBeTruthy();
    // Settings: Settings with the mic test, Backup & restore with the error log, Credits
    fireEvent.click(tab(/Settings/));
    expect(await heading('Settings')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Test microphone' })).toBeTruthy();
    for (const h of ['Backup & restore', 'Back up', 'Restore', 'Error log', 'Credits']) expect(await heading(h)).toBeTruthy();
  });

  it("Content's segmented control switches parts, and opens on the last one for the session", async () => {
    const app = await open();
    const { unmount } = enter(app);
    fireEvent.click(await screen.findByRole('tab', { name: /Content/ }));
    const words = screen.getByRole('tab', { name: 'Words' });
    const pics = screen.getByRole('tab', { name: 'Pictures' });
    fireEvent.click(words); // an earlier test may have left another part
    expect(words.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(pics);
    expect(pics.getAttribute('aria-selected')).toBe('true');
    expect(words.getAttribute('aria-selected')).toBe('false');
    expect(await heading('Pictures for 看图说话')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Add a school word list (听写)' })).toBeNull();
    unmount(); // Done, then back in
    enter(app);
    fireEvent.click(await screen.findByRole('tab', { name: /Content/ }));
    expect(screen.getByRole('tab', { name: 'Pictures' }).getAttribute('aria-selected')).toBe('true');
  });

  it('every old tab has a home, and its section is there', () => {
    expect(new Set(Object.values(HOME))).toEqual(new Set(['today', 'progress', 'content', 'rewards', 'settings']));
    expect(Object.keys(HOME).sort()).toEqual(['backup', 'credits', 'dashboard', 'import', 'listen', 'memory', 'passages', 'pictures', 'recordings', 'rewards', 'school', 'settings', 'skills', 'summary', 'talk', 'week', 'words'].sort());
  });
});

describe("the overview's shortcuts land on the right tab and section", () => {
  const take = (id: string): Recording => ({ id, createdAt: Date.now(), prompt: { kind: 'say', wordId: 'b:森' }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 });
  const lands = async (place: ParentPlace) => {
    await waitFor(() => expect(scrolled).toContain(placeId(place)));
    expect(document.getElementById(placeId(place))).toBeTruthy();
  };

  it('Back up now opens Settings at Backup & restore', async () => {
    enter(await open({ lastBackupAt: null }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back up now' }));
    expect(tab(/Settings/).getAttribute('aria-selected')).toBe('true');
    await lands('backup');
    expect(await heading('Back up')).toBeTruthy();
  });
  it('Tidy up opens all recordings on Today', async () => {
    const app = await open();
    for (let i = 0; i < 101; i++) await addRecording(app.db, { ...take(`r${i}`), prompt: { kind: 'intro' } });
    enter(app);
    fireEvent.click(await screen.findByRole('button', { name: 'Tidy up' }));
    expect(tab(/Today/).getAttribute('aria-selected')).toBe('true');
    await lands('recordings');
    expect(screen.getByRole('button', { name: /All recordings/ }).getAttribute('aria-expanded')).toBe('true');
    expect(await heading('Recordings')).toBeTruthy();
  });
  it('Listen & confirm scrolls Today to the queue', async () => {
    const app = await open();
    await addRecording(app.db, take('t1'));
    enter(app);
    fireEvent.click(await screen.findByRole('button', { name: 'Listen & confirm' }));
    expect(tab(/Today/).getAttribute('aria-selected')).toBe('true');
    await lands('listen');
  });
  it('Week summary opens Progress at the summary', async () => {
    enter(await open());
    fireEvent.click(await screen.findByRole('button', { name: 'Week summary' }));
    expect(tab(/Progress/).getAttribute('aria-selected')).toBe('true');
    await lands('summary');
  });
  it('the top line opens Today on 聊一聊 when no talk is logged yet', async () => {
    enter(await open({ lastBackupAt: Date.now() }));
    fireEvent.click(await screen.findByRole('button', { name: 'Go to 聊一聊' }));
    expect(tab(/Today/).getAttribute('aria-selected')).toBe('true');
    await lands('talk');
  });
});
