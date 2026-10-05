import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { getKid, listRecordings, saveKid, saveParentPassage, saveSession } from '../store/repo';
import { createSessionRecord } from '../session/runner';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';
import { HomeScreen } from './HomeScreen';
import { LangduScreen } from './LangduScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../audio/recorder', () => ({
  recordingSupported: () => true,
  startRecording: vi.fn(async (_stop: () => void, onLevel?: (l: number) => void) => {
    onLevel?.(0.2);
    return { stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 3, ...(onLevel ? { level: 0.2 } : {}) }), cancel: vi.fn() };
  }),
}));

const kid = { ...DEFAULT_KID, reading: { passageId: 'pp:1', days: 1, extra: 0, lastDay: '2026-10-01', lastRead: { 'pp:1': '2026-10-01' }, warmups: 3 } };

/** 朗读 is parked by default (parent, 2026-10-05); these tests switch it on. */
const LANGDU = { ...DEFAULT_SETTINGS, placementDone: true, langdu: true };

describe('朗读 extra rounds', () => {
  it("Home's 多读一遍 button opens an extra round of today's passage; it saves the read but leaves the cycle and stars alone", async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveKid(app.db, kid);
    const home = renderWithApp(<HomeScreen />, app);
    fireEvent.click(await screen.findByRole('button', { name: '多读一遍' }));
    expect(app.go).toHaveBeenCalledWith({ name: 'langdu' });
    home.unmount();

    renderWithApp(<LangduScreen />, app);
    expect(await screen.findByText('我爱爸爸，')).toBeTruthy(); // straight to echo: no warm-up
    expect(screen.queryByText('老师好！')).toBeNull();
    fireEvent.click(screen.getByText('下一句'));
    fireEvent.click(screen.getByText('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    await screen.findByText('听听你自己');
    fireEvent.click(screen.getByText('完成'));
    await waitFor(() => expect(app.go).toHaveBeenLastCalledWith({ name: 'home' }));
    const recs = await listRecordings(app.db);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.prompt).toEqual({ kind: 'passage', passageId: 'pp:1' });
    const after = (await getKid(app.db))!;
    expect(after.reading.days).toBe(1);
    expect(after.bonusStars).toBe(0);
  });

  it('a full storage still lets 完成 go home (the recording is lost, not the child)', async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveKid(app.db, kid);
    const put = app.db.put.bind(app.db);
    app.db.put = ((store: string, ...rest: unknown[]) => (store === 'recordings' ? Promise.reject(new DOMException('full', 'QuotaExceededError')) : (put as (...a: unknown[]) => unknown)(store, ...rest))) as typeof app.db.put;
    renderWithApp(<LangduScreen />, app);
    await screen.findByText('我爱爸爸，');
    fireEvent.click(screen.getByText('下一句'));
    fireEvent.click(screen.getByText('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    await screen.findByText('听听你自己');
    fireEvent.click(screen.getByText('完成'));
    await waitFor(() => expect(app.go).toHaveBeenLastCalledWith({ name: 'home' }));
  });

  it('no 多读一遍 button when there is nothing to read', async () => {
    const app = await makeAppData({ settings: LANGDU });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(screen.queryByRole('button', { name: '多读一遍' })).toBeNull();
  });
});

describe('the lesson path names the speaking step by today\'s activity', () => {
  it('看图说话 on a story day, 朗读 on a reading day', async () => {
    const names = () => [...document.querySelectorAll('.path__name')].map((n) => n.querySelector('.sr-only')?.textContent ?? n.textContent);
    const story = await makeAppData({ settings: { ...LANGDU, story: true } }); // parked by default
    const a = renderWithApp(<HomeScreen />, story);
    await screen.findByText('今天的练习');
    expect(names()).toContain('看图说话');
    a.unmount();
    const reading = await makeAppData({ settings: LANGDU, kid: { ...DEFAULT_KID, speakingLast: 'story' } });
    await saveParentPassage(reading.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    renderWithApp(<HomeScreen />, reading);
    await screen.findByText('今天的练习');
    expect(names()).toContain('朗读');
  });
});

describe('看图说话 parked (the default)', () => {
  it('the path says 朗读 when there is something to read, and leaves the speaking stop out when there is not', async () => {
    const names = () => [...document.querySelectorAll('.path__name')].map((n) => n.querySelector('.sr-only')?.textContent ?? n.textContent);
    const reading = await makeAppData({ settings: LANGDU });
    await saveParentPassage(reading.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    const a = renderWithApp(<HomeScreen />, reading);
    await screen.findByText('今天的练习');
    expect(names()).toContain('朗读');
    expect(names()).not.toContain('看图说话');
    a.unmount();
    renderWithApp(<HomeScreen />, await makeAppData({ settings: LANGDU }));
    await screen.findByText('今天的练习');
    expect(names()).not.toContain('朗读');
    expect(names()).not.toContain('看图说话');
  });
});

describe('看图说话 parked: the path matches what the lesson does', () => {
  const names = () => [...document.querySelectorAll('.path__name')].map((n) => n.querySelector('.sr-only')?.textContent ?? n.textContent);
  const plan = { steps: ['flashcards' as const, 'speaking' as const], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
  it('a started lesson with nothing to read shows no speaking stop (the lesson skips it)', async () => {
    const app = await makeAppData({ settings: LANGDU, now: () => new Date(2026, 9, 6, 18) });
    await saveSession(app.db, { ...createSessionRecord(plan, '2026-10-06', 0) });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(names()).not.toContain('朗读');
    expect(names()).not.toContain('看图说话');
  });
  it('a skipped speaking step is never shown as a ticked 看图说话 (it is parked)', async () => {
    const app = await makeAppData({ settings: LANGDU, kid: { ...DEFAULT_KID, speakingLast: 'story' }, now: () => new Date(2026, 9, 6, 18) });
    await saveSession(app.db, { ...createSessionRecord(plan, '2026-10-06', 0), completed: true, completedSteps: ['flashcards', 'speaking'] });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(names()).not.toContain('看图说话');
  });
  it('a 朗读 he read today stays on the path, named 朗读', async () => {
    const app = await makeAppData({ settings: LANGDU, kid: { ...DEFAULT_KID, speakingLast: 'langdu', reading: { ...DEFAULT_KID.reading, lastDay: '2026-10-06' } }, now: () => new Date(2026, 9, 6, 18) });
    await saveSession(app.db, { ...createSessionRecord(plan, '2026-10-06', 0), completed: true, completedSteps: ['flashcards', 'speaking'] });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(names()).toContain('朗读');
  });
});

describe('the path after the day is done', () => {
  it('names the activity he actually did today, not tomorrow\'s (看图说话 switched on)', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, speakingLast: 'story' }, now: () => new Date(2026, 9, 6, 18), settings: { ...LANGDU, story: true } });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    const plan = { steps: ['speaking' as const], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
    await saveSession(app.db, { ...createSessionRecord(plan, '2026-10-06', 0), completed: true, completedSteps: ['speaking'] });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    const names = [...document.querySelectorAll('.path__name')].map((n) => n.querySelector('.sr-only')?.textContent ?? n.textContent);
    expect(names).toContain('看图说话');
  });
});
