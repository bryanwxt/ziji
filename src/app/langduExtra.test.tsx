import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../audio/speaking';
import { getKid, listRecordings, putCards, putWords, saveKid, saveParentPassage, saveSession } from '../store/repo';
import { builtinWords } from '../content';
import { makeCard } from '../test/fixtures';
import { createSessionRecord } from '../session/runner';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS, EMPTY_READING } from '../types';
import { HomeScreen } from './HomeScreen';
import { LangduScreen } from './LangduScreen';
import { speak } from '../audio/speech';

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

beforeEach(() => vi.mocked(speak).mockClear());
afterEach(() => act(() => setSpeaking(false)));

const btn = (t: string) => screen.getByText(t).closest('button') as HTMLButtonElement;
/** The model reads today's passage through, however many sentences it has: 开始朗读 and 下一篇 come alive. */
async function heardAll() {
  await waitFor(() => expect(document.querySelector('.langdu__listen')).toBeTruthy());
  for (let i = 0; i < 40 && document.querySelector('.langdu__listen[data-heard="false"]'); i++) {
    await act(() => new Promise((r) => setTimeout(r, 5))); // the step's effects have run: the model's next sentence has begun
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
  }
  await waitFor(() => expect(document.querySelector('.langdu__listen[data-heard="true"]')).toBeTruthy());
}

const kid = { ...DEFAULT_KID, reading: { history: { 'pp:1': { reads: 1, lastRead: '2026-09-25', rest: 3, q: 1 } }, lastKind: 'new' as const, lastWarmup: '2026-09-25', warmups: 3 } };

/** 朗读 is parked by default (parent, 2026-10-05); these tests switch it on. */
const LANGDU = { ...DEFAULT_SETTINGS, placementDone: true, langdu: true };
/** A day outside the school calendar: no class lesson adds to what he reads, so only what he knows counts (spec 2026-10-15 §3). */
const NOTHING_READABLE = () => new Date(2025, 11, 20, 18);

/** A lesson plan with the speaking step (朗读): today's session says whether it is done. */
const SPEAKING_PLAN = { steps: ['flashcards' as const, 'speaking' as const], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };

describe('朗读 extra rounds', () => {
  it("Home's 多读一遍 button opens an extra round; it saves the read and counts it for the gap, leaving rest, turn and stars alone", async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveKid(app.db, kid);
    await saveSession(app.db, { ...createSessionRecord(SPEAKING_PLAN, '2026-10-02', 0), completed: true, completedSteps: ['flashcards', 'speaking'] }); // today's 朗读 done
    const home = renderWithApp(<HomeScreen />, app);
    fireEvent.click(await screen.findByRole('button', { name: '多读一遍' }));
    expect(app.go).toHaveBeenCalledWith({ name: 'langdu' });
    home.unmount();

    renderWithApp(<LangduScreen />, app);
    expect(await screen.findByText('我爱爸爸，我爱妈妈。')).toBeTruthy(); // straight to listening: no warm-up
    expect(screen.queryByText('老师好！')).toBeNull();
    await waitFor(() => expect(speak).toHaveBeenLastCalledWith('我爱爸爸，我爱妈妈。')); // the model has begun (the step mounts after a load)
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    await waitFor(() => expect(btn('开始朗读').disabled).toBe(false));
    fireEvent.click(btn('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    await screen.findByRole('button', { name: '听我的' });
    fireEvent.click(btn('完成'));
    await waitFor(() => expect(app.go).toHaveBeenLastCalledWith({ name: 'home' }));
    const recs = await listRecordings(app.db);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.prompt).toEqual({ kind: 'passage', passageId: 'pp:1', extra: true }); // tagged: never the queue's take (final review I6)
    const after = (await getKid(app.db))!;
    expect(after.reading.history['pp:1']).toEqual({ reads: 2, lastRead: '2026-10-02', rest: 3, q: 1 });
    expect(after.bonusStars).toBe(0);
  });

  it('a full storage still lets 完成 go home (the recording is lost, not the child)', async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveKid(app.db, kid);
    const put = app.db.put.bind(app.db);
    app.db.put = ((store: string, ...rest: unknown[]) => (store === 'recordings' ? Promise.reject(new DOMException('full', 'QuotaExceededError')) : (put as (...a: unknown[]) => unknown)(store, ...rest))) as typeof app.db.put;
    renderWithApp(<LangduScreen />, app);
    expect(await screen.findByText('我爱爸爸，我爱妈妈。')).toBeTruthy(); // straight to listening: no warm-up
    expect(screen.queryByText('老师好！')).toBeNull();
    await waitFor(() => expect(speak).toHaveBeenLastCalledWith('我爱爸爸，我爱妈妈。')); // the model has begun (the step mounts after a load)
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    await waitFor(() => expect(btn('开始朗读').disabled).toBe(false));
    fireEvent.click(btn('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    await screen.findByRole('button', { name: '听我的' });
    fireEvent.click(btn('完成'));
    await waitFor(() => expect(app.go).toHaveBeenLastCalledWith({ name: 'home' }));
  });

  it('多读一遍 reads another passage than the one read today (D7)', async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveParentPassage(app.db, { id: 'pp:2', title: '我的猫', text: '我爱我的猫。', createdAt: 2 });
    await saveKid(app.db, { ...kid, reading: { ...kid.reading, history: { 'pp:1': { reads: 1, lastRead: '2026-10-02', rest: 3, q: 1 } } } });
    renderWithApp(<LangduScreen />, app);
    expect(await screen.findByText('我爱我的猫。')).toBeTruthy();
  });

  it('下一篇 works in 多读一遍 as in the lesson: the next passage comes in and the skip is saved (spec 2026-10-15 §5)', async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveKid(app.db, kid);
    renderWithApp(<LangduScreen />, app);
    const title = () => document.querySelector('.langdu__title')?.textContent;
    await waitFor(() => expect(title()).toBeTruthy());
    const first = title();
    await heardAll();
    fireEvent.click(btn('下一篇'));
    await waitFor(() => expect(title()).not.toBe(first));
    await waitFor(async () => expect(Object.values((await getKid(app.db))!.reading.history).filter((e) => e.lastSkipped === '2026-10-02' && e.skips === 1)).toHaveLength(1));
  });

  it("no 多读一遍 before today's 朗读: an extra round must not use up the lesson's passage (final review)", async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveKid(app.db, kid);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(screen.queryByRole('button', { name: '多读一遍' })).toBeNull();
    await saveSession(app.db, { ...createSessionRecord(SPEAKING_PLAN, '2026-10-02', 0), completedSteps: ['flashcards'] }); // begun, 朗读 not yet
    renderWithApp(<HomeScreen />, app);
    await screen.findAllByText('今天的练习');
    expect(screen.queryByRole('button', { name: '多读一遍' })).toBeNull();
  });

  it('no 多读一遍 button when there is nothing to read', async () => {
    const app = await makeAppData({ settings: LANGDU, now: NOTHING_READABLE });
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
    renderWithApp(<HomeScreen />, await makeAppData({ settings: LANGDU, now: NOTHING_READABLE }));
    await screen.findByText('今天的练习');
    expect(names()).not.toContain('朗读');
    expect(names()).not.toContain('看图说话');
  });
});

describe('看图说话 parked: the path matches what the lesson does', () => {
  const names = () => [...document.querySelectorAll('.path__name')].map((n) => n.querySelector('.sr-only')?.textContent ?? n.textContent);
  const plan = { steps: ['flashcards' as const, 'speaking' as const], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
  it('a started lesson with nothing to read shows no speaking stop (the lesson skips it)', async () => {
    const app = await makeAppData({ settings: LANGDU, now: NOTHING_READABLE });
    await saveSession(app.db, { ...createSessionRecord(plan, '2025-12-20', 0) });
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
  it('a 多读一遍 today leaves no 朗读 stop the lesson would skip (nothing else to read)', async () => {
    const app = await makeAppData({ settings: LANGDU, kid: { ...DEFAULT_KID, speakingLast: 'story', reading: { ...EMPTY_READING, history: { 'pp:1': { reads: 1, lastRead: '2025-12-20', rest: 3, q: 0 } } } }, now: NOTHING_READABLE });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(names()).not.toContain('朗读');
  });
  it('with everything readable read in the last 3 days there is no 多读一遍 and no 朗读 stop', async () => {
    const app = await makeAppData({ settings: LANGDU, now: NOTHING_READABLE, kid: { ...kid, reading: { ...kid.reading, history: { 'pp:1': { reads: 1, lastRead: '2025-12-18', rest: 3, q: 1 } } } } });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(screen.queryByRole('button', { name: '多读一遍' })).toBeNull();
    expect(names()).not.toContain('朗读');
  });
  it('a 朗读 he read today stays on the path, named 朗读', async () => {
    const app = await makeAppData({ settings: LANGDU, kid: { ...DEFAULT_KID, speakingLast: 'langdu', reading: { ...EMPTY_READING, history: { 'pp:1': { reads: 1, lastRead: '2026-10-06', rest: 3, q: 1 } } } }, now: () => new Date(2026, 9, 6, 18) });
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

describe('多读一遍 (spec 2026-10-12 §3)', () => {
  it('pinyin fades over the characters he reads, as in the lesson', async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveKid(app.db, kid);
    await putWords(app.db, [builtinWords(0).find((w) => w.text === '我')!]);
    await putCards(app.db, [makeCard('b:我', 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<LangduScreen />, app);
    await screen.findByText('我爱爸爸，我爱妈妈。');
    const cells = [...document.querySelectorAll('.langdu__sentence .label__cell--zh')];
    expect(cells.find((c) => c.querySelector('.label__ch')!.textContent === '我')!.classList.contains('label__cell--hidden')).toBe(true);
    expect(cells.find((c) => c.querySelector('.label__ch')!.textContent === '爱')!.classList.contains('label__cell--hidden')).toBe(false);
  });
});

describe('朗读 on by default (spec 2026-10-12 §7)', () => {
  it('with no setting touched, a text to read puts 朗读 on the path', async () => {
    const names = () => [...document.querySelectorAll('.path__name')].map((n) => n.querySelector('.sr-only')?.textContent ?? n.textContent);
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, placementDone: true } });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(names()).toContain('朗读');
  });
});
