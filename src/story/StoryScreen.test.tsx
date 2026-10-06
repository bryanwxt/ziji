import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { getSettings, putCards } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { makeCard } from '../test/fixtures';
import { StoryScreen } from './StoryScreen';
import { DEFAULT_SETTINGS } from '../types';

const owed = { ...DEFAULT_SETTINGS, placementDone: true, storyProgress: { chapter: 0, readOn: '2026-10-02', setupDone: true, payoffDone: false } };

vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn(), primeSpeech: vi.fn() }));

const next = () => screen.getByRole('button', { name: '下一页' });
const beat = () => Number(document.querySelector('.story')!.getAttribute('data-beat'));

describe('the story reader (spec 3c §4)', () => {
  it('setup: pages forward and back; the last beat is Granny; finishing marks the setup and goes on', async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'session', free: false }} />, app);
    await screen.findByText(/Saturday/);
    fireEvent.click(next());
    await waitFor(() => expect(beat()).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: '上一页' }));
    await waitFor(() => expect(beat()).toBe(0));
    for (let i = 0; i < 4; i++) fireEvent.click(next()); // 4 setup pages → Granny
    await waitFor(() => expect(document.querySelector('.story__granny')).toBeTruthy());
    fireEvent.click(next());
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false }));
    expect((await getSettings(app.db)).storyProgress).toMatchObject({ setupDone: true, payoffDone: false, chapter: 0 });
  });
  it("a slot shows English until he's heard the word, then Chinese with English", async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'home' }} />, app);
    await screen.findByText(/morning/);
    expect(document.querySelector('.story__slot--learning')).toBeNull();
    const app2 = await makeAppData({ voice: false });
    await putCards(app2.db, [{ ...makeCard('w:早上', 'hear', new Date(), true), passed: Date.now() }]);
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'home' }} />, app2);
    await waitFor(() => expect(document.querySelector('.story__slot--learning [lang="zh"]')?.textContent).toBe('早上'));
  });
  it("no voice: Granny's English shows at once and 听一听 is skipped", async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'home' }} />, app);
    await screen.findByText(/Saturday/);
    for (let i = 0; i < 4; i++) fireEvent.click(next());
    await screen.findByText('Little cat! Where are you?');
    expect(next().hasAttribute('disabled')).toBe(false); // no voice: nothing to wait for (stage cases showed it stuck)
    const pay = await makeAppData({ voice: false, settings: owed });
    renderWithApp(<StoryScreen part="payoff" chapter={1} then={{ name: 'home' }} />, pay);
    await screen.findByText(/said what they were/); // straight to the payoff pages
    expect(document.querySelector('.story__listen')).toBeNull();
  });
  it("with a voice, Granny's English needs a tap after hearing; 听一听 asks and shows the answer after a miss", async () => {
    const app = await makeAppData({ voice: true });
    renderWithApp(<StoryScreen part="payoff" chapter={1} then={{ name: 'home' }} />, app);
    await waitFor(() => expect(document.querySelector('.story__listen')).toBeTruthy());
    const { setSpeaking } = await import('../audio/speaking');
    for (let i = 0; i < 6; i++) { setSpeaking(true); setSpeaking(false); await new Promise((r) => setTimeout(r, 30)); }
    const wrong = await screen.findByRole('button', { name: /小狗/ });
    fireEvent.click(wrong);
    await waitFor(() => expect(document.querySelector('.is-answer')?.textContent).toContain('小猫'));
  });
  it('no words today: the rescued line alone; finishing the payoff marks the chapter', async () => {
    const app = await makeAppData({ voice: false, settings: owed });
    renderWithApp(<StoryScreen part="payoff" chapter={1} then={{ name: 'home' }} />, app);
    await screen.findByText(/Words burst out/);
    expect(document.querySelectorAll('.story__chip')).toHaveLength(0);
    fireEvent.click(next());
    fireEvent.click(next());
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'home' }));
    expect((await getSettings(app.db)).storyProgress).toMatchObject({ chapter: 1, payoffDone: true });
  });
  it('*emphasis* in the text is drawn as emphasis, never raw asterisks', async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'home' }} />, app);
    await screen.findByText(/Saturday/);
    expect(document.querySelector('.story__words')!.textContent).not.toContain('*');
    expect(document.querySelector('.story__words em')?.textContent).toBe('SHHHHHHHH.');
  });
});
