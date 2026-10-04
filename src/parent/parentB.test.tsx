import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { exportBackup } from '../store/backup';
import { allWords, getSettings, putWords, updateSettings } from '../store/repo';
import { setSpeechRate } from '../audio/speech';
import { setSfxEnabled } from '../audio/sfx';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { BackupPanel } from './BackupPanel';
import { SettingsPanel } from './SettingsPanel';
import { WordsPanel } from './WordsPanel';

vi.mock('../content/strokes', () => ({ strokeAvailability: vi.fn(async () => 'yes') }));
vi.mock('../lib/files', () => ({ saveTextFile: vi.fn(async () => {}) }));
vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), setSpeechRate: vi.fn() }));
vi.mock('../audio/sfx', () => ({ setSfxEnabled: vi.fn() }));

import { saveTextFile } from '../lib/files';
import { ParentArea } from './ParentArea';
import { hashPin } from '../lib/hash';
import { DEFAULT_SETTINGS } from '../types';

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
    fireEvent.change(screen.getByLabelText('New words per day (0–10)'), { target: { value: '15' } });
    await waitFor(async () => expect((await getSettings(app.db)).newPerDay).toBe(10));
    fireEvent.click(screen.getByLabelText('朗读 reading aloud'));
    await waitFor(async () => expect((await getSettings(app.db)).activities.speaking).toBe(false));
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
    expect(document.querySelectorAll('.tabs .tab svg').length).toBe(10); // + From a worksheet
  });
});
