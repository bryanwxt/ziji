import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allCards, getSettings, putWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { PlacementScreen } from './PlacementScreen';

vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn(), primeSpeech: vi.fn() }));

async function setup() {
  const app = await makeAppData();
  await putWords(app.db, builtinWords(0));
  return app;
}
const bubble = () => document.querySelector('.pet__bubble .sr-only')?.textContent ?? '';

describe('PlacementScreen (spec §19 part 6)', () => {
  it('opens with reading questions, then mixes styles; 不知道 always works; no right/wrong is shown', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} />, app);
    const bubbles = new Set<string>();
    for (let i = 0; i < 12; i++) {
      await screen.findByText('不知道');
      bubbles.add(bubble());
      expect(document.querySelector('.is-wrong, .is-right, .is-answer, .bottombar--oops')).toBeNull();
      fireEvent.click(screen.getByText('不知道'));
    }
    expect(bubbles.size).toBeGreaterThanOrEqual(3);
  });

  it('knows nothing: ends kindly with no cards, and 开始！ opens Home', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} />, app);
    for (let i = 0; i < 60 && !screen.queryByText('开始！'); i++) fireEvent.click(await screen.findByText(/不知道|开始！/));
    expect(await screen.findByText('开始！')).toBeTruthy();
    expect(screen.getByText(/读：还没开始/)).toBeTruthy();
    expect(await allCards(app.db)).toEqual([]);
    expect((await getSettings(app.db)).placementDone).toBe(true);
    fireEvent.click(screen.getByText('开始！'));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'home' }));
  });

  it('a strong reader gets both levels on the result screen', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} voice={false} />, app);
    for (let i = 0; i < 60 && !screen.queryByText('开始！'); i++) {
      await waitFor(() => expect(document.querySelector('[data-answer="true"]') ?? screen.queryByText('开始！')).toBeTruthy());
      const right = document.querySelector<HTMLElement>('[data-answer="true"]');
      if (right) fireEvent.click(right);
    }
    expect(await screen.findByText('开始！')).toBeTruthy();
    expect(screen.getByText(/读：(五级|六级|七—九级)/)).toBeTruthy();
    expect((await getSettings(app.db)).placementResult!.reading).toBeGreaterThan(10);
  });

  it('a double tap answers once, not the next question too', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={120} />, app);
    const ready = () => waitFor(() => expect(document.querySelector('[data-ready="true"]')).toBeTruthy());
    await ready();
    fireEvent.click(screen.getByText('不知道'));
    fireEvent.click(screen.getByText('不知道')); // lands on the next question straight away: ignored
    await ready();
    expect(document.querySelector('[data-asked]')?.getAttribute('data-asked')).toBe('1');
  });
  it('a child who knows no characters yet gets a kind start, not "0" (deferred minor, plan 5)', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} />, app);
    for (let i = 0; i < 60 && !screen.queryByText('开始！'); i++) {
      fireEvent.click(await screen.findByText('不知道'));
      await new Promise((r) => setTimeout(r, 0)); // let the next question arrive
    }
    expect(await screen.findByText('开始！')).toBeTruthy();
    expect(document.querySelector('h1')!.textContent).toContain('我们从第一个字开始！');
    expect(screen.queryByText(/认识 0 个字/)).toBeNull();
  });
  it('a re-run started from Settings can go back home (deferred minor, plan 5)', async () => {
    const app = await setup();
    app.settings = { ...app.settings, placementDone: true };
    renderWithApp(<PlacementScreen tapGuardMs={0} />, app);
    fireEvent.click(await screen.findByRole('button', { name: '回家' }));
    expect(app.go).toHaveBeenCalledWith({ name: 'home' });
  });
});
