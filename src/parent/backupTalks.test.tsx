// The talk log in Parent → Backup (parent loop spec §6): a backup from before it says the talks here are kept, and keeps them.
import { fireEvent, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { exportBackup } from '../store/backup';
import { addTalk, allTalks, putWords, saveKid } from '../store/repo';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID } from '../types';
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

describe('Parent → Backup: the talk log', () => {
  it('a backup from before the talk log says the talks here are kept, and keeps them', async () => {
    const app = await makeAppData();
    await saveKid(app.db, { ...DEFAULT_KID });
    await addTalk(app.db, { id: 't1', at: 1, minutes: 10 });
    const old = await makeAppData();
    await putWords(old.db, [makeWord('山')]);
    const file = JSON.parse(await exportBackup(old.db, { includeMedia: false, now: 1 }));
    delete file.stores.talks;
    file.dbVersion = 6;
    renderWithApp(<BackupPanel />, app);
    choose(JSON.stringify(file));
    expect(await screen.findByText(/from before the talk log \(聊一聊\): the talks logged on this device are kept/)).toBeTruthy();
    fireEvent.click(screen.getByText('Replace with this backup'));
    expect(await screen.findByText('Backup restored.')).toBeTruthy();
    expect((await allTalks(app.db)).map((t) => t.id)).toEqual(['t1']);
  });
  it('a backup with talks says nothing about them', async () => {
    const app = await makeAppData();
    await addTalk(app.db, { id: 't1', at: 1 });
    renderWithApp(<BackupPanel />, app);
    choose(await exportBackup(app.db, { includeMedia: false, now: 1 }));
    expect(await screen.findByText('Replace with this backup')).toBeTruthy();
    expect(screen.queryByText(/talk log/)).toBeNull();
  });
});
