import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { SCENES_KT, STORY_PARTS } from '../kantu/scenes';
import { getKid, listRecordings, saveKid, saveParentPassage, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../audio/recorder', () => ({
  recordingSupported: () => true,
  startRecording: vi.fn(async () => ({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 4 }), cancel: vi.fn() })),
}));

const speakingOnly = { newwords: false, practice: false, writing: false, speaking: true };

async function setup(kid: Partial<typeof DEFAULT_KID>, withPassage = true) {
  const app = await makeAppData({ now: () => new Date(2026, 9, 6, 17) });
  await updateSettings(app.db, { activities: speakingOnly, story: true }); // 看图说话 is parked by default; these tests switch it on
  if (withPassage) await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
  await saveKid(app.db, { ...DEFAULT_KID, ...kid });
  return app;
}

async function tellStory() {
  const vase = SCENES_KT[0]!;
  for (let i = 0; i < STORY_PARTS.length + 1 + vase.questions.length; i++) {
    fireEvent.click(await screen.findByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    await screen.findByText('听松露说');
    fireEvent.click(screen.getByText(i === STORY_PARTS.length + vase.questions.length ? '完成' : '继续'));
  }
}

/** Finishing saves every recording first: on a slow CI machine that takes over the default 1 s (it failed twice on 2026-10-05). */
const SAVED = { timeout: 5000 };

describe('speaking step alternation', () => {
  it('a fresh profile gets the vase story; finishing it counts the story and saves every recording', async () => {
    const app = await setup({});
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('图上画的是什么？')).toBeTruthy();
    await tellStory();
    expect(await screen.findByText('太棒了！', {}, SAVED)).toBeTruthy();
    const kid = (await getKid(app.db))!;
    expect(kid.story).toEqual({ next: 1, told: 1 });
    expect(kid.speakingLast).toBe('story');
    expect(kid.reading.days).toBe(0); // a story day is not a 朗读 day
    const recs = await listRecordings(app.db);
    expect(recs).toHaveLength(8);
    expect(recs.filter((r) => r.prompt.kind === 'story')).toHaveLength(6);
    expect(recs.filter((r) => r.prompt.kind === 'answer')).toHaveLength(2);
  });

  it('a full storage still finishes the story (the recordings are lost, the lesson is not)', async () => {
    const app = await setup({});
    const put = app.db.put.bind(app.db);
    app.db.put = ((store: string, ...rest: unknown[]) => (store === 'recordings' ? Promise.reject(new DOMException('full', 'QuotaExceededError')) : (put as (...a: unknown[]) => unknown)(store, ...rest))) as typeof app.db.put;
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('图上画的是什么？');
    await tellStory();
    expect(await screen.findByText('太棒了！', {}, SAVED)).toBeTruthy();
    expect((await getKid(app.db))!.story.told).toBe(1);
  });

  it('after a story day, the next lesson is 朗读', async () => {
    const app = await setup({ speakingLast: 'story' });
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('老师好！')).toBeTruthy();
  });

  it('with nothing to read, the story runs even after a story day', async () => {
    const app = await setup({ speakingLast: 'story', story: { next: 1, told: 1 } }, false);
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('图上画的是什么？')).toBeTruthy();
    expect(screen.getByRole('img', { name: '捡到钱包' })).toBeTruthy();
  });
});

describe('the dino egg hatches after a finished lesson', () => {
  it('a tapped egg hatches when today\'s lesson completes', async () => {
    const app = await setup({ finds: { ...DEFAULT_KID.finds, eggTapped: true } });
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('图上画的是什么？');
    await tellStory();
    await screen.findByText('太棒了！', {}, SAVED);
    await waitFor(async () => expect((await getKid(app.db))!.finds.dinoHatched).toBe(true));
  });
  it('free play does not hatch it', async () => {
    const app = await setup({ finds: { ...DEFAULT_KID.finds, eggTapped: true } });
    await saveKid(app.db, { ...(await getKid(app.db))!, finds: { ...DEFAULT_KID.finds, eggTapped: true } });
    renderWithApp(<SessionScreen free />, app);
    await new Promise((r) => setTimeout(r, 300));
    expect((await getKid(app.db))!.finds.dinoHatched).toBe(false);
  });
});

describe('看图说话 is parked by default', () => {
  it('a fresh profile gets 朗读, not a story', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 6, 17) });
    await updateSettings(app.db, { activities: speakingOnly });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveKid(app.db, { ...DEFAULT_KID });
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('老师好！')).toBeTruthy();
    expect(screen.queryByText('图上画的是什么？')).toBeNull();
  });
  it('with nothing to read, the speaking step is skipped', async () => {
    const app = await makeAppData({ now: () => new Date(2026, 9, 6, 17) });
    await updateSettings(app.db, { activities: speakingOnly });
    await saveKid(app.db, { ...DEFAULT_KID });
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('太棒了！', {}, SAVED)).toBeTruthy();
  });
});
