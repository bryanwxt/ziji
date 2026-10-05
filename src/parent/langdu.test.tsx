import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { getSettings, listParentPassages } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { PassagesPanel } from './PassagesPanel';
import { SettingsPanel } from './SettingsPanel';

vi.mock('../audio/speech', async (real) => ({ ...(await real<typeof import('../audio/speech')>()), stopSpeaking: vi.fn(), speak: vi.fn(), setSpeechRate: vi.fn() }));
vi.mock('../audio/sfx', () => ({ setSfxEnabled: vi.fn() }));

describe('PassagesPanel', () => {
  it('adds a school text, previews its phrases, edits and deletes it', async () => {
    const app = await makeAppData();
    renderWithApp(<PassagesPanel />, app);
    fireEvent.input(await screen.findByLabelText('Title'), { target: { value: '我的学校' } });
    fireEvent.input(screen.getByLabelText('Text'), { target: { value: '我的学校很大 / 有很多树。' } });
    expect(screen.getByText('我的学校很大')).toBeTruthy();
    expect(screen.getByText('有很多树。')).toBeTruthy();
    fireEvent.click(screen.getByText('Save text'));
    await waitFor(async () => expect((await listParentPassages(app.db)).map((p) => p.text)).toEqual(['我的学校很大 / 有很多树。']));
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.input(screen.getByLabelText('Title'), { target: { value: '学校' } });
    fireEvent.click(screen.getByText('Save text'));
    await waitFor(async () => expect((await listParentPassages(app.db)).map((p) => p.title)).toEqual(['学校']));
    vi.stubGlobal('confirm', () => true);
    fireEvent.click(await screen.findByText('Delete'));
    await waitFor(async () => expect(await listParentPassages(app.db)).toEqual([]));
    vi.unstubAllGlobals();
  });
  it('will not save a text with no Chinese characters', async () => {
    const app = await makeAppData();
    renderWithApp(<PassagesPanel />, app);
    fireEvent.input(await screen.findByLabelText('Title'), { target: { value: 'x' } });
    fireEvent.input(screen.getByLabelText('Text'), { target: { value: 'hello' } });
    expect((screen.getByText('Save text') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Settings oral exam', () => {
  it('saves the oral-exam details and previews the self-introduction', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    fireEvent.input(await screen.findByLabelText('Chinese name'), { target: { value: '小明' } });
    fireEvent.input(screen.getByLabelText('Age'), { target: { value: '8' } });
    fireEvent.input(screen.getByLabelText('School'), { target: { value: '光明小学' } });
    fireEvent.input(screen.getByLabelText('Class'), { target: { value: '二年级' } });
    expect(await screen.findByText('老师好！我叫小明。我今年8岁。我在光明小学读二年级。…… 谢谢老师！')).toBeTruthy();
    await waitFor(async () => expect((await getSettings(app.db)).oral).toMatchObject({ name: '小明', age: '8', school: '光明小学', className: '二年级' }));
  });
});
