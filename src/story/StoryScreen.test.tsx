import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { getSettings, putCards } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { makeCard } from '../test/fixtures';
import { splitToFit, StoryScreen } from './StoryScreen';
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
    expect(document.querySelector('.story__face--voice')).toBeTruthy(); // chapter 1: she's a voice from the void deck, not in the picture
    expect(document.querySelectorAll('.story__cast svg.granny')).toHaveLength(0);
    fireEvent.click(next());
    await screen.findByText(/Words first/); // the Go page hands over to the lesson
    expect(screen.getByText('出发！')).toBeTruthy();
    fireEvent.click(next());
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false }));
    expect((await getSettings(app.db)).storyProgress).toMatchObject({ setupDone: true, payoffDone: false, chapter: 0 });
  });
  it('a sideways swipe turns the page (a short or mostly-down drag doesn\'t); a tap on the picture turns it too', async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'home' }} />, app);
    await screen.findByText(/Saturday/);
    const story = document.querySelector('.story')!;
    const drag = (x0: number, y0: number, x1: number, y1: number) => {
      fireEvent.pointerDown(story, { clientX: x0, clientY: y0 });
      fireEvent.pointerUp(story, { clientX: x1, clientY: y1 });
    };
    drag(300, 400, 260, 400); // too short
    drag(300, 400, 200, 600); // mostly down: he's scrolling the words
    expect(beat()).toBe(0);
    drag(300, 400, 120, 410);
    await waitFor(() => expect(beat()).toBe(1));
    drag(120, 400, 300, 400);
    await waitFor(() => expect(beat()).toBe(0));
    fireEvent.pointerDown(story, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(story, { clientX: 100, clientY: 100 });
    fireEvent.click(document.querySelector('.story__pic')!);
    await waitFor(() => expect(beat()).toBe(1));
  });
  it('a sound in capitals is lettered big; a speaker gets a face and quotes', async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'home' }} />, app);
    await screen.findByText(/Saturday/);
    expect(document.querySelector('.story__sfx')?.textContent).toBe('SHHHHHHHH.');
    expect(document.querySelector('.story__face--truffle svg')).toBeTruthy();
    expect(document.querySelector('.story__said')!.textContent).toMatch(/^Truffle“Perfect\..*”$/);
  });
  it('splitToFit: a page too tall for the screen splits between lines; a line taller than the room gets a screen of its own', () => {
    const at = (top: number, h: number) => ({ top, bottom: top + h });
    expect(splitToFit([at(0, 40), at(40, 40), at(80, 40)], 200)).toEqual([[0, 1, 2]]);
    expect(splitToFit([at(0, 40), at(40, 40), at(80, 40)], 85)).toEqual([[0, 1], [2]]);
    expect(splitToFit([at(0, 300), at(300, 40), at(340, 40)], 100)).toEqual([[0], [1, 2]]);
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
  it("tapping 听 on another line while Granny talks never leaves → stuck (final review I1)", async () => {
    const app = await makeAppData({ voice: true });
    renderWithApp(<StoryScreen part="setup" chapter={3} then={{ name: 'home' }} />, app);
    await screen.findByText(/stairs/);
    for (let i = 0; i < 3; i++) fireEvent.click(next());
    await waitFor(() => expect(document.querySelector('.story__granny')).toBeTruthy());
    const { setSpeaking } = await import('../audio/speaking');
    await new Promise((r) => setTimeout(r, 30));
    setSpeaking(true); // line 0 starts…
    fireEvent.click(screen.getAllByRole('button', { name: '听' })[1]!); // …and he taps line 1's 听 mid-line
    await new Promise((r) => setTimeout(r, 30));
    setSpeaking(false); setSpeaking(true); setSpeaking(false); // line 1 plays to its end
    await waitFor(() => expect(next().hasAttribute('disabled')).toBe(false));
  });
});
