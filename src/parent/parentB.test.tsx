import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { exportBackup } from '../store/backup';
import { allCards, allWords, getSettings, putWords, updateSettings } from '../store/repo';
import { setSpeechRate } from '../audio/speech';
import { setSfxEnabled } from '../audio/sfx';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { BackupPanel } from './BackupPanel';
import { SettingsPanel } from './SettingsPanel';
import { WordsPanel } from './WordsPanel';

vi.mock('../content/strokes', () => ({ strokeAvailability: vi.fn(async () => 'yes') }));
vi.mock('../lib/files', () => ({ saveTextFile: vi.fn(async () => {}) }));
vi.mock('../audio/speech', async (real) => ({ ...(await real<typeof import('../audio/speech')>()), stopSpeaking: vi.fn(), speak: vi.fn(), setSpeechRate: vi.fn() }));
vi.mock('../audio/sfx', () => ({ setSfxEnabled: vi.fn() }));

import { saveTextFile } from '../lib/files';
import { ParentArea } from './ParentArea';
import { hashPin } from '../lib/hash';
import { DEFAULT_SETTINGS } from '../types';
import { clearErrorLog, logError } from '../app/errorLog';

describe('WordsPanel', () => {
  it('previews a pasted list, adds it, and pulls matching built-in words forward', async () => {
    const app = await makeAppData();
    await putWords(app.db, [makeWord('大', { rank: 3 })]);
    renderWithApp(<WordsPanel />, app);
    fireEvent.input(await screen.findByLabelText('List name'), { target: { value: '听写 7' } });
    fireEvent.input(screen.getByLabelText('Words'), { target: { value: '朋友\n大\nhello' } });
    fireEvent.click(screen.getByText('Preview'));
    expect(screen.getByText(/Skipped \(not 1–4 Chinese characters\): hello/)).toBeTruthy();
    fireEvent.click(screen.getByText('Add 2 words'));
    expect(await screen.findByText('Added 1 new word; moved 1 built-in to the front of the queue.')).toBeTruthy();
    const words = await allWords(app.db);
    expect(words.find((w) => w.text === '朋友')).toMatchObject({ source: 'parent', listName: '听写 7', writeable: true });
    expect(words.find((w) => w.text === '大')?.listName).toBe('听写 7');
  });
});

describe('SettingsPanel zodiac', () => {
  it("sets the child's zodiac", async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    fireEvent.change(screen.getByLabelText(/Zodiac/), { target: { value: 'tiger' } });
    await waitFor(async () => expect((await getSettings(app.db)).zodiac).toBe('tiger'));
  });
});

describe('SettingsPanel', () => {
  it('saves settings within sensible limits', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    fireEvent.change(screen.getByLabelText('New words per day: the most (the app finds his number, from 3 up to this)'), { target: { value: '15' } });
    await waitFor(async () => expect((await getSettings(app.db)).newPerDay).toBe(10));
    fireEvent.click(screen.getByLabelText('听写 writing'));
    await waitFor(async () => expect((await getSettings(app.db)).activities.writing).toBe(false));
    expect(screen.queryByLabelText('朗读 reading aloud')).toBeNull(); // parked: no switch (parent, 2026-10-05)
  });
});

describe('BackupPanel', () => {
  it('saves a backup file and records when it happened', async () => {
    const app = await makeAppData();
    renderWithApp(<BackupPanel />, app);
    fireEvent.click(screen.getByText('Save backup file'));
    expect(await screen.findByText('Backup saved.')).toBeTruthy();
    expect(saveTextFile).toHaveBeenCalledWith('ziji-backup-2026-10-02.json', expect.stringContaining('hanzi-buddy-backup'));
    expect((await getSettings(app.db)).lastBackupAt).not.toBeNull();
  });
});

describe('BackupPanel error log', () => {
  it('shows the recent errors and saves them to a file', async () => {
    clearErrorLog();
    logError(new Error('IDB write failed'), new Date(2026, 9, 2, 9, 30).getTime());
    const app = await makeAppData();
    renderWithApp(<BackupPanel />, app);
    expect(screen.getByText('Error log')).toBeTruthy();
    expect(screen.getByText(/Error: IDB write failed/)).toBeTruthy();
    fireEvent.click(screen.getByText('Save error log'));
    await waitFor(() => expect(saveTextFile).toHaveBeenCalledWith('ziji-error-log.json', expect.stringContaining('IDB write failed')));
    clearErrorLog();
  });
  it('says so when there are none', async () => {
    clearErrorLog();
    renderWithApp(<BackupPanel />, await makeAppData());
    expect(screen.getByText('No errors recorded.')).toBeTruthy();
  });
});

// jsdom's File has no text(); Safari's does.
const backupFile = (text: string) => Object.assign(new File([text], 'b.json', { type: 'application/json' }), { text: async () => text });

describe('BackupPanel restore', () => {
  it('re-applies the restored sound settings straight away', async () => {
    const source = await makeAppData();
    await updateSettings(source.db, { soundEffects: false, speechRate: 0.6 });
    const text = await exportBackup(source.db, { includeMedia: false, now: 1 });
    const app = await makeAppData();
    renderWithApp(<BackupPanel />, app);
    const input = document.getElementById('bk-file') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [backupFile(text)] });
    fireEvent.change(input);
    fireEvent.click(await screen.findByText('Replace with this backup'));
    expect(await screen.findByText('Backup restored.')).toBeTruthy();
    expect(setSfxEnabled).toHaveBeenLastCalledWith(false);
    expect(setSpeechRate).toHaveBeenLastCalledWith(0.6);
  });

  it('tells the parent when a restore fails instead of failing silently', async () => {
    const source = await makeAppData();
    const text = await exportBackup(source.db, { includeMedia: false, now: 1 });
    const app = await makeAppData();
    renderWithApp(<BackupPanel />, app);
    const input = document.getElementById('bk-file') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [backupFile(text)] });
    fireEvent.change(input);
    const button = await screen.findByText('Replace with this backup');
    app.db.close();
    fireEvent.click(button);
    expect(await screen.findByText(/Restore failed/)).toBeTruthy();
  });
});

describe('ParentArea tabs', () => {
  it('shows icon tabs as a segmented control', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, pinHash: await hashPin('1111') } });
    renderWithApp(<ParentArea />, app);
    for (const d of '1111') fireEvent.click(screen.getByRole('button', { name: d }));
    await screen.findByText('Overview');
    expect(document.querySelectorAll('.tabs .tab svg').length).toBe(12); // + From a worksheet, Skills
  });
});

describe('school 听写 mistakes (spec §19 part 3)', () => {
  it('marks words he wrote wrong: they come back first in 写一写', async () => {
    const app = await makeAppData();
    renderWithApp(<WordsPanel />, app);
    fireEvent.input(await screen.findByLabelText('The right words, one per line'), { target: { value: '新加坡\nxyz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bring back' }));
    expect(await screen.findByText(/新加坡 comes back first in 写一写/)).toBeTruthy();
    expect(screen.getByText(/新加坡 is new to the app/)).toBeTruthy(); // so a misspelling typed by mistake is noticed
    expect(screen.getByText(/Skipped: xyz/)).toBeTruthy();
    expect((await allCards(app.db)).some((c) => c.kind === 'write')).toBe(true);
  });
  it('several words come back; a double tap brings them back once', async () => {
    const app = await makeAppData();
    renderWithApp(<WordsPanel />, app);
    fireEvent.input(await screen.findByLabelText('The right words, one per line'), { target: { value: '新加坡\n市区' } });
    const btn = screen.getByRole('button', { name: 'Bring back' });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(await screen.findByText(/新加坡、市区 come back first in 写一写/)).toBeTruthy();
    await waitFor(async () => expect((await allWords(app.db)).filter((w) => w.text === '新加坡')).toHaveLength(1));
  });
  it('a double tap on Add adds a list once', async () => {
    const app = await makeAppData();
    renderWithApp(<WordsPanel />, app);
    fireEvent.input(await screen.findByLabelText('Words'), { target: { value: '新加坡' } });
    fireEvent.click(screen.getByText('Preview'));
    const add = await screen.findByRole('button', { name: /Add 1 new|Add 1 words/ });
    fireEvent.click(add);
    fireEvent.click(add);
    await waitFor(async () => expect((await allWords(app.db)).filter((w) => w.text === '新加坡')).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 50));
    expect((await allWords(app.db)).filter((w) => w.text === '新加坡')).toHaveLength(1);
  });
});

describe('WordsPanel school 成语 (spec 2026-10-05 §4)', () => {
  it('adds typed 成语 as school words tagged 成语', async () => {
    const app = await makeAppData();
    renderWithApp(<WordsPanel />, app);
    fireEvent.input(await screen.findByLabelText(/School 成语, one a line/), { target: { value: '五颜六色\n一心一意 = with one heart' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add 成语' }));
    expect(await screen.findByText('Added 2 成语.')).toBeTruthy();
    const ws = await allWords(app.db);
    expect(ws.filter((w) => w.tags?.includes('成语')).map((w) => w.text).sort()).toEqual(['一心一意', '五颜六色']);
  });
});

describe('Voice setting (parent, 2026-10-05)', () => {
  it('lists the Mandarin voices the app can use, saves a pick, and can test it', async () => {
    const voices = [
      { lang: 'zh-CN', localService: true, name: 'Tingting', voiceURI: 'com.apple.voice.compact.zh-CN.Tingting' },
      { lang: 'zh-CN', localService: true, name: 'Tingting', voiceURI: 'com.apple.voice.enhanced.zh-CN.Tingting' },
      { lang: 'zh-HK', localService: true, name: 'Sinji', voiceURI: 'x' },
    ];
    vi.stubGlobal('speechSynthesis', { getVoices: () => voices, cancel: vi.fn(), speak: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    const select = screen.getByLabelText('Voice') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(['The clearest on this iPad (automatic)', 'Tingting · Enhanced · zh-CN', 'Tingting · Standard · zh-CN']);
    fireEvent.change(select, { target: { value: 'com.apple.voice.enhanced.zh-CN.Tingting' } });
    await waitFor(async () => expect((await getSettings(app.db)).voiceURI).toBe('com.apple.voice.enhanced.zh-CN.Tingting'));
    vi.unstubAllGlobals();
  });
});

describe('Course: 华文 or 高级华文 (parent, 2026-10-06)', () => {
  it('高级华文 writes more of his school characters; reading stays the same', async () => {
    const { builtinWords } = await import('../content');
    const cl = new Map(builtinWords(0, 'cl').map((w) => [w.text, w]));
    const hcl = new Map(builtinWords(0, 'hcl').map((w) => [w.text, w]));
    expect(cl.get('井')!.writeable).toBe(false); // CL only reads it; HCL writes it
    expect(hcl.get('井')!.writeable).toBe(true);
    expect(hcl.get('井')!.rank).toBe(cl.get('井')!.rank); // same order either way
  });
  it('switching rewrites the stored words for that course and remembers it', async () => {
    const { allWords } = await import('../store/repo');
    const { builtinWords } = await import('../content');
    const { seedBuiltinWords } = await import('../store/repo');
    const app = await makeAppData();
    await seedBuiltinWords(app.db, builtinWords(0, 'cl'), true);
    renderWithApp(<SettingsPanel />, app);
    fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'hcl' } });
    await waitFor(async () => expect((await getSettings(app.db)).course).toBe('hcl'));
    await waitFor(async () => expect((await allWords(app.db)).find((w) => w.text === '井')?.writeable).toBe(true));
    expect((await getSettings(app.db)).contentCourse).toBe('hcl');
  });
});

describe('Recorded voice switch (parent, 2026-10-08: the clips sounded worse than the iPhone voice)', () => {
  it('is off unless the parent turns it on; on, the clips are used again; off, they are dropped at once', async () => {
    const clips = await import('../audio/clips');
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    const box = screen.getByLabelText(/Recorded voice/) as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    await waitFor(async () => expect((await getSettings(app.db)).recordedVoice).toBe(true));
    clips.setClipIndex({ v: 1, voice: 'k', clips: { 你: 'x' } });
    fireEvent.click(box);
    await waitFor(async () => expect((await getSettings(app.db)).recordedVoice).toBe(false));
    expect(clips.clipPlan('你')).toBeNull(); // the iPad voice speaks
  });
});
