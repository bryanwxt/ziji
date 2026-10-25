import { screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { addReviewLog, getKid, putCards, putWords, saveKid, saveReward } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID } from '../types';
import { CONFIRM_NEWS, HomeScreen } from './HomeScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

// His numbers count confirmed characters only (parent decision 2026-10-25): a placement guess not yet rechecked is left out,
// so a missed recheck never makes 认识 N 个字 go down.
const at = new Date(2026, 9, 1);
/** 大 小 learned in lessons; 人 山 人们 placement guesses not yet rechecked. */
async function seed(app: Awaited<ReturnType<typeof makeAppData>>) {
  await putWords(app.db, ['大', '小', '人', '山'].map((t) => makeWord(t)));
  await putCards(app.db, [
    makeCard('b:大', 'recognise', at, true), makeCard('b:小', 'recognise', at, true),
    { ...makeCard('b:人', 'recognise', at, true), placed: true }, { ...makeCard('b:山', 'recognise', at, true), placed: true },
  ]);
  for (const id of ['b:大', 'b:小']) await addReviewLog(app.db, { cardId: `${id}:recognise`, wordId: id, kind: 'recognise', at: at.getTime(), rating: 3, correct: true });
}
const bubble = () => document.querySelector('.pet__bubble .sr-only')?.textContent;

describe('Home counts confirmed characters', () => {
  it('认识 N 个字 leaves out placement guesses not yet rechecked', async () => {
    const app = await makeAppData();
    await seed(app);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.home__who')?.textContent).toContain('认识 2 个字');
  });
  it('a "know N characters" goal set after the switch moves with confirmed characters', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, journeyCarry: 0, knownAtSwitch: { count: 4, at: 1000 } } });
    await saveKid(app.db, app.kid!);
    await seed(app);
    await saveReward(app.db, { id: 'g', title: 'Lego', emoji: '', zh: '乐高', icon: 'gift', metric: 'known', target: 3, createdAt: 2000, claimedAt: null });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.goal .goal__count')?.textContent?.trim()).toBe('2 / 3 字');
  });
  it('a goal set before the switch never goes back: reached under the old count, it stays reached (review I3)', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, journeyCarry: 0, knownAtSwitch: { count: 4, at: 1000 } } });
    await saveKid(app.db, app.kid!);
    await seed(app);
    await saveReward(app.db, { id: 'g', title: 'Lego', emoji: '', zh: '乐高', icon: 'gift', metric: 'known', target: 3, createdAt: 500, claimedAt: null });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.goal--reached')?.textContent).toContain('你做到了！');
  });
  it('before the switch is kept, every goal counts what he knew', async () => {
    const app = await makeAppData();
    await seed(app);
    await saveReward(app.db, { id: 'g', title: 'Lego', emoji: '', zh: '乐高', icon: 'gift', metric: 'known', target: 10, createdAt: 0, claimedAt: null });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.goal .goal__count')?.textContent?.trim()).toBe('4 / 10 字');
  });
});

describe('Truffle says once that the guesses get confirmed', () => {
  it('says it the first time there are guesses to confirm, then never again', async () => {
    const app = await makeAppData();
    await saveKid(app.db, DEFAULT_KID);
    await seed(app);
    const first = renderWithApp(<HomeScreen />, { ...app, kid: await getKid(app.db) });
    await screen.findByText('今天的练习');
    await waitFor(() => expect(bubble()).toBe(CONFIRM_NEWS));
    await waitFor(async () => expect((await getKid(app.db))?.confirmNewsSaid).toBe(true));
    first.unmount();
    renderWithApp(<HomeScreen />, { ...app, kid: await getKid(app.db) });
    await screen.findByText('今天的练习');
    await new Promise((r) => setTimeout(r, 200));
    expect(bubble()).not.toBe(CONFIRM_NEWS);
  });
  it('says nothing when every character he knows is confirmed', async () => {
    const app = await makeAppData();
    await saveKid(app.db, DEFAULT_KID);
    await putWords(app.db, [makeWord('大')]);
    await putCards(app.db, [makeCard('b:大', 'recognise', at, true)]);
    await addReviewLog(app.db, { cardId: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', at: at.getTime(), rating: 3, correct: true });
    renderWithApp(<HomeScreen />, { ...app, kid: await getKid(app.db) });
    await screen.findByText('今天的练习');
    await new Promise((r) => setTimeout(r, 200));
    expect(bubble()).not.toBe(CONFIRM_NEWS);
    expect((await getKid(app.db))?.confirmNewsSaid).toBeUndefined();
  });
  it('is a kid line: Chinese only, no 儿化, no emoji', () => {
    expect(CONFIRM_NEWS).toBe('我们来一个一个确认你认识的字！');
    expect(CONFIRM_NEWS).not.toMatch(/儿|\p{Extended_Pictographic}|[A-Za-z]/u);
  });
});

describe('Home journey after the switch', () => {
  it('keeps reached worlds and saves the carry once', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, worldsSeen: ['home', 'rainforest', 'bamboo'], world: 'bamboo' } });
    await saveKid(app.db, app.kid!);
    await seed(app);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    // no placement: the old count was every known character (4); 竹林 (60) is reached, so the carry keeps him at 60 (review I1)
    await waitFor(async () => expect((await getKid(app.db))?.journeyCarry).toBe(58));
    expect((await getKid(app.db))?.knownAtSwitch).toEqual({ count: 4, at: app.now().getTime() });
    expect((await getKid(app.db))?.worldsSeen).toEqual(['home', 'rainforest', 'bamboo']);
    expect(document.querySelector('.world-scene')?.getAttribute('data-world')).toBe('bamboo');
  });
});
