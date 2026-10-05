import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { addRecording, getKid, listRecordings, saveKid, saveParentPassage, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../audio/recorder', () => ({
  recordingSupported: () => true,
  startRecording: vi.fn(async (_stop: () => void, onLevel?: (l: number) => void) => {
    onLevel?.(0.1);
    return { stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 5, ...(onLevel ? { level: 0.1 } : {}) }), cancel: vi.fn() };
  }),
}));

const speakingOnly = { newwords: false, practice: false, writing: false, speaking: true };

async function setup() {
  const app = await makeAppData({ now: () => new Date(2026, 9, 5, 17) });
  await updateSettings(app.db, { activities: speakingOnly, oral: { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' } });
  await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
  await saveKid(app.db, { ...DEFAULT_KID, speakingLast: 'story' }); // a 朗读 day (they alternate)
  return app;
}

async function readThrough() {
  await screen.findByText('老师好！');
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await waitFor(() => expect((screen.getByText('继续').closest('button') as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByText('继续'));
  fireEvent.click(screen.getByText('下一句'));
  fireEvent.click(screen.getByText('开始朗读'));
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await screen.findByText('听听你自己');
  fireEvent.click(screen.getByText('完成'));
}

describe('daily 朗读 step', () => {
  it('runs the warm-up and today\'s passage, saves both recordings, and counts one cycle day', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await readThrough();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    const kid = (await getKid(app.db))!;
    expect(kid.reading).toMatchObject({ passageId: 'pp:1', days: 1, lastDay: '2026-10-05', warmups: 1 });
    const recs = await listRecordings(app.db);
    expect(recs.map((r) => r.prompt.kind).sort()).toEqual(['intro', 'passage']);
    expect(recs.find((r) => r.prompt.kind === 'passage')!.level).toBe(0.1);
  });

  it('a full storage still finishes the 朗读 step and counts the day', async () => {
    const app = await setup();
    const put = app.db.put.bind(app.db);
    app.db.put = ((store: string, ...rest: unknown[]) => (store === 'recordings' ? Promise.reject(new DOMException('full', 'QuotaExceededError')) : (put as (...a: unknown[]) => unknown)(store, ...rest))) as typeof app.db.put;
    renderWithApp(<SessionScreen free={false} />, app);
    await readThrough();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await getKid(app.db))!.reading.days).toBe(1);
  });

  it('a louder read than last time earns a bonus star; the first read of a passage does not', async () => {
    const app = await setup();
    await addRecording(app.db, { id: 'old', createdAt: 1, prompt: { kind: 'passage', passageId: 'pp:1' }, blob: new Blob(['o']), mime: 'audio/mp4', durationSec: 5, level: 0.05 });
    renderWithApp(<SessionScreen free={false} />, app);
    await readThrough();
    await waitFor(async () => expect((await getKid(app.db))!.bonusStars).toBe(1));
  });
});
