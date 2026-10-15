import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../audio/speaking';
import { speak } from '../audio/speech';
import { addRecording, getKid, listRecordings, saveKid, saveParentPassage, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS, type PassageQuestion } from '../types';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../audio/recorder', () => ({
  recordingSupported: () => true,
  startRecording: vi.fn(async (_stop: () => void, onLevel?: (l: number) => void) => {
    onLevel?.(0.1);
    return { stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 5, ...(onLevel ? { level: 0.1 } : {}) }), cancel: vi.fn() };
  }),
}));

afterEach(() => {
  act(() => setSpeaking(false));
  vi.mocked(speak).mockClear();
});

const speakingOnly = { newwords: false, practice: false, writing: false, speaking: true };

async function setup(now: () => Date = () => new Date(2026, 9, 5, 17)) {
  const app = await makeAppData({ now });
  await updateSettings(app.db, { activities: speakingOnly, langdu: true, oral: { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' } });
  await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
  await saveKid(app.db, { ...DEFAULT_KID, speakingLast: 'story' }); // a 朗读 day (they alternate)
  return app;
}

const btn = (t: string) => screen.getByText(t).closest('button') as HTMLButtonElement;

async function warmUp() {
  await screen.findByText('老师好！');
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await waitFor(() => expect(btn('继续').disabled).toBe(false));
  fireEvent.click(btn('继续'));
}
/** The model reads the passage's one sentence, he reads it: on Compare. */
async function listenAndRead() {
  await screen.findByText('我爱爸爸，我爱妈妈。');
  await waitFor(() => expect(speak).toHaveBeenLastCalledWith('我爱爸爸，我爱妈妈。')); // the model has begun (with no warm-up the step mounts straight into listening)
  act(() => setSpeaking(true));
  act(() => setSpeaking(false));
  await waitFor(() => expect(btn('开始朗读').disabled).toBe(false));
  fireEvent.click(btn('开始朗读'));
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await screen.findByRole('button', { name: '听我的' });
}
async function readThrough() {
  await warmUp();
  await listenAndRead();
  fireEvent.click(btn('完成')); // a parent text with no question: Compare ends the step
}

describe('daily 朗读 step', () => {
  it('runs the warm-up and today\'s passage, saves both recordings, and counts the read and the warm-up', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await readThrough();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    const kid = (await getKid(app.db))!;
    expect(kid.reading).toEqual({ history: { 'pp:1': { reads: 1, lastRead: '2026-10-05', rest: 3, q: 1 } }, lastKind: 'new', lastWarmup: '2026-10-05', warmups: 1 });
    const recs = await listRecordings(app.db);
    expect(recs.map((r) => r.prompt.kind).sort()).toEqual(['intro', 'passage']);
    expect(recs.find((r) => r.prompt.kind === 'passage')!.level).toBe(0.1);
  });

  it('a full storage still finishes the 朗读 step and counts the read', async () => {
    const app = await setup();
    const put = app.db.put.bind(app.db);
    app.db.put = ((store: string, ...rest: unknown[]) => (store === 'recordings' ? Promise.reject(new DOMException('full', 'QuotaExceededError')) : (put as (...a: unknown[]) => unknown)(store, ...rest))) as typeof app.db.put;
    renderWithApp(<SessionScreen free={false} />, app);
    await readThrough();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await getKid(app.db))!.reading.history['pp:1']?.reads).toBe(1);
  });

  it('a louder read than last time earns a bonus star; the first read of a passage does not', async () => {
    const app = await setup();
    await addRecording(app.db, { id: 'old', createdAt: 1, prompt: { kind: 'passage', passageId: 'pp:1' }, blob: new Blob(['o']), mime: 'audio/mp4', durationSec: 5, level: 0.05 });
    renderWithApp(<SessionScreen free={false} />, app);
    await readThrough();
    await waitFor(async () => expect((await getKid(app.db))!.bonusStars).toBe(1));
  });
});

describe('朗读 in the lesson (spec 2026-10-12 §3, §6)', () => {
  it('a warm-up 1 day ago: no warm-up, straight to listening; only the read is saved, and a revisit read well rests 7 days', async () => {
    const app = await setup();
    await saveKid(app.db, { ...DEFAULT_KID, speakingLast: 'story', reading: { history: { 'pp:1': { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1 } }, lastKind: 'new', lastWarmup: '2026-10-04', warmups: 1 } });
    renderWithApp(<SessionScreen free={false} />, app);
    await listenAndRead();
    expect(screen.queryByText('老师好！')).toBeNull();
    fireEvent.click(btn('完成'));
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await listRecordings(app.db)).map((r) => r.prompt.kind)).toEqual(['passage']);
    expect((await getKid(app.db))!.reading).toMatchObject({ history: { 'pp:1': { reads: 2, lastRead: '2026-10-05', rest: 7, q: 2 } }, lastKind: 'revisit', lastWarmup: '2026-10-04', warmups: 1 });
  });

  it('no take (the mic refused): the read still counts, so the passage moves on (spec 2026-10-15 §1 cause 4)', async () => {
    const { startRecording } = await import('../audio/recorder');
    const { MicDeniedError } = await import('../audio/micErrors');
    vi.mocked(startRecording).mockRejectedValueOnce(new MicDeniedError());
    const app = await setup();
    await saveKid(app.db, { ...DEFAULT_KID, speakingLast: 'story', reading: { history: { 'pp:1': { reads: 1, lastRead: '2026-10-01', rest: 3, q: 1 } }, lastKind: 'new', lastWarmup: '2026-10-04', warmups: 1 } });
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我爱爸爸，我爱妈妈。');
    await waitFor(() => expect(speak).toHaveBeenLastCalledWith('我爱爸爸，我爱妈妈。'));
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    await waitFor(() => expect(btn('开始朗读').disabled).toBe(false));
    fireEvent.click(btn('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('麦克风没有打开。我们下次再录！');
    fireEvent.click(btn('读完了'));
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    await waitFor(async () => expect((await getKid(app.db))!.speakingLast).toBe('langdu'));
    expect((await getKid(app.db))!.reading.history['pp:1']).toMatchObject({ reads: 2, lastRead: '2026-10-05' });
  });

  it('a second lesson the same day reads a different passage (D7)', async () => {
    const app = await setup();
    await saveParentPassage(app.db, { id: 'pp:2', title: '我的猫', text: '我爱我的猫。', createdAt: 2 });
    await saveKid(app.db, { ...DEFAULT_KID, speakingLast: 'story', reading: { history: { 'pp:1': { reads: 1, lastRead: '2026-10-05', rest: 3, q: 1 } }, lastKind: 'new', lastWarmup: '2026-10-05', warmups: 1 } });
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('我爱我的猫。')).toBeTruthy();
    expect(screen.queryByText('我爱爸爸，我爱妈妈。')).toBeNull();
  });

  it('his answer to the meaning question is kept with his take, for the parent', async () => {
    const app = await setup();
    const question: PassageQuestion = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'], answer: 1 };
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1, question });
    renderWithApp(<SessionScreen free={false} />, app);
    await warmUp();
    await listenAndRead();
    fireEvent.click(btn('下一步'));
    fireEvent.click(btn('小马'));
    fireEvent.click(await screen.findByText('完成'));
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await listRecordings(app.db)).find((r) => r.prompt.kind === 'passage')!.meaning).toEqual({ correct: false, picked: '小马' });
  });

  it("saving a take tidies the passage's takes older than 14 days, reviewed or not, keeping the newest", async () => {
    const app = await setup();
    const old = (id: string, d: Date, review?: 'ok') => ({ id, createdAt: d.getTime(), prompt: { kind: 'passage' as const, passageId: 'pp:1' }, blob: new Blob(['o']), mime: 'audio/mp4', durationSec: 5, ...(review ? { review } : {}) });
    await addRecording(app.db, old('reviewed', new Date(2026, 8, 1), 'ok'));
    await addRecording(app.db, old('unheard', new Date(2026, 8, 2)));
    renderWithApp(<SessionScreen free={false} />, app);
    await readThrough();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    await waitFor(async () => expect((await listRecordings(app.db)).map((r) => r.id)).not.toContain('reviewed'));
    expect((await listRecordings(app.db)).map((r) => r.id)).not.toContain('unheard'); // superseded by today's: never reviewable (final review I5)
    expect((await listRecordings(app.db)).filter((r) => r.prompt.kind === 'passage')).toHaveLength(1);
  });
});

describe('finishing 朗读 always ends the lesson (final review I4, I6)', () => {
  it("his recordings can't be read for the bonus check: no bonus, the read still counts and the lesson is celebrated", async () => {
    const app = await setup();
    await addRecording(app.db, { id: 'old', createdAt: 1, prompt: { kind: 'passage', passageId: 'pp:1' }, blob: new Blob(['o']), mime: 'audio/mp4', durationSec: 5, level: 0.05 });
    renderWithApp(<SessionScreen free={false} />, app);
    await warmUp();
    await listenAndRead();
    const all = app.db.getAllFromIndex.bind(app.db);
    app.db.getAllFromIndex = ((store: string, ...rest: unknown[]) => (store === 'recordings' ? Promise.reject(new Error('read failed')) : (all as (...a: unknown[]) => unknown)(store, ...rest))) as typeof app.db.getAllFromIndex;
    fireEvent.click(btn('完成'));
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    const kid = (await getKid(app.db))!;
    expect(kid.bonusStars).toBe(0);
    expect(kid.reading.history['pp:1']?.reads).toBe(1);
  });
  it("his state can't be read when 朗读 ends: the lesson still reaches its celebration", async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await warmUp();
    await listenAndRead();
    const get = app.db.get.bind(app.db);
    let failed = false;
    app.db.get = ((store: string, ...rest: unknown[]) => {
      if (store === 'kid' && !failed) { failed = true; return Promise.reject(new Error('read failed')); } // once: the 朗读 save
      return (get as (...a: unknown[]) => unknown)(store, ...rest);
    }) as typeof app.db.get;
    fireEvent.click(btn('完成'));
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect(failed).toBe(true);
  });
  it('a lesson begun before midnight and finished after counts its read on the lesson\'s date (one date key)', async () => {
    let t = new Date(2026, 9, 5, 23, 58);
    const app = await setup(() => t);
    renderWithApp(<SessionScreen free={false} />, app);
    await warmUp();
    await listenAndRead();
    t = new Date(2026, 9, 6, 0, 1);
    fireEvent.click(btn('完成'));
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await getKid(app.db))!.reading).toMatchObject({ history: { 'pp:1': { reads: 1, lastRead: '2026-10-05' } }, lastWarmup: '2026-10-05' });
  });
  it("the bonus compares with the passage's last lesson take, not a 多读一遍 take after it", async () => {
    const app = await setup();
    const take = (id: string, createdAt: number, level: number, extra = false) => ({ id, createdAt, prompt: { kind: 'passage' as const, passageId: 'pp:1', ...(extra ? { extra: true as const } : {}) }, blob: new Blob(['o']), mime: 'audio/mp4', durationSec: 5, level });
    await addRecording(app.db, take('lesson', 1, 0.05));
    await addRecording(app.db, take('extra', 2, 0.5, true)); // a loud extra round: not the baseline
    renderWithApp(<SessionScreen free={false} />, app);
    await readThrough();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    await waitFor(async () => expect((await getKid(app.db))!.bonusStars).toBe(1));
    const saved = (await listRecordings(app.db)).find((r) => r.id !== 'lesson' && r.id !== 'extra' && r.prompt.kind === 'passage')!;
    expect(saved.prompt).toEqual({ kind: 'passage', passageId: 'pp:1' }); // a lesson take carries no extra tag
  });
});
