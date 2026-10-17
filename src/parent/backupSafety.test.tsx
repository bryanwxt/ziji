import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { exportBackup } from '../store/backup';
import { allWords, putWords, saveKid, updateSettings } from '../store/repo';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';
import { BackupPanel } from './BackupPanel';

vi.mock('../lib/files', () => ({ saveTextFile: vi.fn(async () => {}) }));
vi.mock('../audio/speech', async (real) => ({ ...(await real<typeof import('../audio/speech')>()), stopSpeaking: vi.fn(), speak: vi.fn(), setSpeechRate: vi.fn() }));
vi.mock('../audio/sfx', () => ({ setSfxEnabled: vi.fn() }));
import { saveTextFile } from '../lib/files';

const backupFile = (text: string) => Object.assign(new File([text], 'b.json', { type: 'application/json' }), { text: async () => text });

async function childApp(name: string, grade: number, words: string[]) {
  const app = await makeAppData();
  await updateSettings(app.db, { oral: { ...DEFAULT_SETTINGS.oral, name }, grade, gradeYear: 2026 });
  await saveKid(app.db, { ...DEFAULT_KID });
  await putWords(app.db, words.map((w) => makeWord(w)));
  return app;
}
const choose = (text: string) => {
  const input = document.getElementById('bk-file') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [backupFile(text)], configurable: true });
  fireEvent.change(input);
};

// review 2026-10-17: two children, one wrong file, progress overwritten for good
describe('Parent → Backup: whose backup, and a way back', () => {
  it("names the file after the child and his school year", async () => {
    const app = await childApp('小明', 2, []);
    renderWithApp(<BackupPanel />, app);
    fireEvent.click(screen.getByText('Save backup file'));
    await screen.findByText('Backup saved.');
    expect(vi.mocked(saveTextFile).mock.calls.at(-1)![0]).toMatch(/^ziji-backup-小明-P2-(\w+-)?2026-10-02\.json$/);
  });
  it("shows whose a backup is, and warns plainly when it is another child's", async () => {
    const other = await childApp('小红', 3, ['山']);
    const text = await exportBackup(other.db, { includeMedia: false, now: other.now().getTime(), device: 'iPhone' });
    renderWithApp(<BackupPanel />, await childApp('小明', 2, ['大']));
    choose(text);
    expect(await screen.findByText(/For 小红 · P3 · iPhone/)).toBeTruthy();
    expect((await screen.findByRole('alert')).textContent).toMatch(/This backup is 小红's \(P3\), not 小明's \(P2\)/);
  });
  it('no warning for his own backup', async () => {
    const app = await childApp('小明', 2, ['大']);
    const text = await exportBackup(app.db, { includeMedia: false, now: app.now().getTime() });
    renderWithApp(<BackupPanel />, app);
    choose(text);
    await screen.findByText(/For 小明 · P2/);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('a restore can be undone, also after leaving the page', async () => {
    const other = await childApp('小红', 3, ['山']);
    const text = await exportBackup(other.db, { includeMedia: false, now: 1 });
    const app = await childApp('小明', 2, ['大']);
    const first = renderWithApp(<BackupPanel />, app);
    expect(screen.queryByText('Undo the last restore')).toBeNull();
    choose(text);
    fireEvent.click(await screen.findByText('Replace with this backup'));
    expect(await screen.findByText('Backup restored.')).toBeTruthy();
    expect((await allWords(app.db)).map((w) => w.text)).toEqual(['山']);
    first.unmount();
    renderWithApp(<BackupPanel />, app);
    fireEvent.click(await screen.findByText('Undo the last restore'));
    expect(await screen.findByText('Restore undone: the progress from before it is back.')).toBeTruthy();
    expect((await allWords(app.db)).map((w) => w.text)).toEqual(['大']);
    await waitFor(() => expect(screen.queryByText('Undo the last restore')).toBeNull());
  });
  it('shows where the progress is kept: Home Screen app, storage kept, last backup', async () => {
    const app = await childApp('小明', 2, []);
    app.settings = { ...app.settings, lastBackupAt: new Date(2026, 8, 20).getTime() };
    renderWithApp(<BackupPanel />, app);
    const line = await screen.findByText(/^Installed on Home Screen:/);
    await waitFor(() => expect(line.textContent).toMatch(/^Installed on Home Screen: no · Storage kept: (no|unknown) · Last backup: .*2026/));
  });
});
