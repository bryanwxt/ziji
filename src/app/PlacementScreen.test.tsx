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
const SEED = 20261002; // a fixed walk: the screen's own seed comes from the clock
const LONG = { timeout: 10_000 }; // saving a strong reader's result writes hundreds of cards; a loaded machine is slow

/** Answers one question at a time, each only once it is on screen (never a stale one twice), until the result shows. */
async function walkThrough(pick: () => HTMLElement, each?: () => void) {
  for (let i = 0; i < 80; i++) {
    await waitFor(() => expect(document.querySelector(`[data-question="${i}"]`) ?? screen.queryByText('开始！')).toBeTruthy(), LONG);
    if (screen.queryByText('开始！')) return;
    each?.();
    fireEvent.click(pick());
  }
  throw new Error('the placement check never ended');
}
const dontKnow = () => screen.getByText('不知道');

describe('PlacementScreen (spec §19 part 6)', () => {
  it('opens with reading questions, then mixes styles; 不知道 always works; no right/wrong is shown', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={SEED} />, app);
    const bubbles = new Set<string>();
    await walkThrough(dontKnow, () => {
      bubbles.add(bubble());
      expect(document.querySelector('.is-wrong, .is-right, .is-answer, .sheet--oops')).toBeNull();
    });
    expect(bubbles.size).toBeGreaterThanOrEqual(3);
  });

  it('knows nothing: ends kindly with no cards, and 开始！ opens Home', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={SEED} />, app);
    await walkThrough(dontKnow);
    expect(screen.getByText('开始！')).toBeTruthy();
    expect(screen.getByText(/读：还没开始/)).toBeTruthy();
    expect(await allCards(app.db)).toEqual([]);
    expect((await getSettings(app.db)).placementDone).toBe(true);
    fireEvent.click(screen.getByText('开始！'));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'home' }));
  });

  it('a strong reader gets both levels on the result screen', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} voice={false} seed={SEED} />, app);
    await walkThrough(() => document.querySelector<HTMLElement>('[data-answer="true"]')!);
    expect(screen.getByText('开始！')).toBeTruthy();
    expect(screen.getByText(/读：(五级|六级|七—九级)/)).toBeTruthy();
    expect((await getSettings(app.db)).placementResult!.reading).toBeGreaterThan(10);
  });

  it('a fixed seed asks the same questions every time (so tests never depend on the clock)', async () => {
    const walk = async () => {
      const app = await setup();
      const { unmount } = renderWithApp(<PlacementScreen tapGuardMs={0} voice={false} seed={7} />, app);
      const seen: string[] = [];
      for (let i = 0; i < 8; i++) {
        await waitFor(() => expect(document.querySelector('[data-asked]')?.getAttribute('data-asked')).toBe(String(i)));
        await waitFor(() => expect(document.querySelector(`[data-question="${i}"]`)).toBeTruthy());
        seen.push(`${bubble()}|${document.querySelector('.placement__prompt')!.textContent}`);
        fireEvent.click(screen.getByText('不知道'));
      }
      unmount();
      return seen;
    };
    expect(await walk()).toEqual(await walk());
  });

  it('a double tap answers once, not the next question too', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={120} seed={SEED} />, app);
    const ready = () => waitFor(() => expect(document.querySelector('[data-ready="true"]')).toBeTruthy());
    await ready();
    fireEvent.click(screen.getByText('不知道'));
    fireEvent.click(screen.getByText('不知道')); // lands on the next question straight away: ignored
    await ready();
    expect(document.querySelector('[data-asked]')?.getAttribute('data-asked')).toBe('1');
  });
  it('a child who knows no characters yet gets a kind start, not "0" (deferred minor, plan 5)', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={SEED} />, app);
    await walkThrough(dontKnow);
    expect(screen.getByText('开始！')).toBeTruthy();
    expect(document.querySelector('h1')!.textContent).toContain('我们从第一个字开始！');
    expect(screen.queryByText(/认识 0 个字/)).toBeNull();
  });
  it('a re-run started from Settings can go back home (deferred minor, plan 5)', async () => {
    const app = await setup();
    app.settings = { ...app.settings, placementDone: true };
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={SEED} />, app);
    fireEvent.click(await screen.findByRole('button', { name: '回家' }));
    expect(app.go).toHaveBeenCalledWith({ name: 'home' });
  });
});

describe('placement on the stage (spec 2026-10-04 §3)', () => {
  it('Truffle in his spot, the question on the card, 不知道 in the sheet', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={SEED} />, app);
    await waitFor(() => expect(document.querySelector('[data-question="0"]')).toBeTruthy(), LONG);
    const stage = document.querySelector('.stage[data-stage="placement"]')!;
    expect(stage.querySelector('.stage__truffle .pet')).toBeTruthy();
    expect(stage.querySelector('.stage__card .placement__prompt')).toBeTruthy();
    expect(stage.querySelector('.stage__sheet .sheet button')!.textContent).toContain('不知道');
  });
});

describe('Truffle in placement (spec 2026-10-04 §4.4, spec §14: no right or wrong)', () => {
  it('is calm on every question', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={SEED} />, app);
    await walkThrough(dontKnow, () => {
      expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-calm')).toBe('true');
    });
  });
});
