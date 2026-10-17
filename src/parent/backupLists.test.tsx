// Weekly lists in Parent → Backup (weekly list spec 2026-10-17 §11): a backup from before lists says so before and after the
// restore, which clears this device's lists; Undo brings them back; a backup from a newer app says to update. Invented fixtures.
import { fireEvent, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { exportBackup } from '../store/backup';
import { DB_VERSION } from '../store/db';
import { allWeekLists, putWeekList, putWords, saveKid } from '../store/repo';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type WeekList } from '../types';
import { BackupPanel } from './BackupPanel';

vi.mock('../lib/files', () => ({ saveTextFile: vi.fn(async () => {}) }));
vi.mock('../audio/speech', async (real) => ({ ...(await real<typeof import('../audio/speech')>()), stopSpeaking: vi.fn(), speak: vi.fn(), setSpeechRate: vi.fn() }));
vi.mock('../audio/sfx', () => ({ setSfxEnabled: vi.fn() }));

const backupFile = (text: string) => Object.assign(new File([text], 'b.json', { type: 'application/json' }), { text: async () => text });
const choose = (text: string) => {
  const input = document.getElementById('bk-file') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [backupFile(text)], configurable: true });
  fireEvent.change(input);
};
const list: WeekList = { id: 'wl:b', name: '第九课', createdAt: 1, readyBy: '2026-10-21', homeworkDue: '2026-10-23', items: [{ wordId: 'p:风筝', text: '风筝', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [] };

async function withList() {
  const app = await makeAppData();
  await saveKid(app.db, { ...DEFAULT_KID });
  await putWords(app.db, [makeWord('风筝', { id: 'p:风筝', source: 'parent' })]);
  await putWeekList(app.db, list);
  return app;
}
async function oldBackup() {
  const old = await makeAppData();
  await putWords(old.db, [makeWord('山')]);
  const file = JSON.parse(await exportBackup(old.db, { includeMedia: false, now: 1 }));
  delete file.stores.weekLists;
  file.dbVersion = 5;
  return JSON.stringify(file);
}

describe('Parent → Backup: weekly lists', () => {
  it('a backup from before weekly lists: said before the restore and after it; Undo brings the lists back', async () => {
    const app = await withList();
    renderWithApp(<BackupPanel />, app);
    choose(await oldBackup());
    expect(await screen.findByText(/has no weekly lists: restoring it removes this week’s lists/)).toBeTruthy();
    fireEvent.click(screen.getByText('Replace with this backup'));
    expect(await screen.findByText("Backup restored. Weekly lists weren't in this backup.")).toBeTruthy();
    expect(await allWeekLists(app.db)).toEqual([]);
    fireEvent.click(await screen.findByText('Undo the last restore'));
    await screen.findByText('Restore undone: the progress from before it is back.');
    expect((await allWeekLists(app.db)).map((l) => l.id)).toEqual(['wl:b']);
  });
  it('a backup with lists restores them and says nothing about lists', async () => {
    const app = await withList();
    const text = await exportBackup(app.db, { includeMedia: false, now: 1 });
    renderWithApp(<BackupPanel />, app);
    choose(text);
    fireEvent.click(await screen.findByText('Replace with this backup'));
    expect(await screen.findByText('Backup restored.')).toBeTruthy();
    expect(screen.queryByText(/weekly lists/i)).toBeNull();
    expect((await allWeekLists(app.db)).map((l) => l.id)).toEqual(['wl:b']);
  });
  it('a backup from a newer app says to update it', async () => {
    const app = await withList();
    const file = JSON.parse(await exportBackup(app.db, { includeMedia: false, now: 1 }));
    file.dbVersion = DB_VERSION + 1;
    renderWithApp(<BackupPanel />, app);
    choose(JSON.stringify(file));
    expect((await screen.findByRole('alert')).textContent).toMatch(/newer version of 字己 ZiJi\. Update the app/);
  });
});
