import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords, schoolTerm } from '../content';
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
async function walkThrough(pick: () => HTMLElement, each?: () => void): Promise<number> {
  for (let i = 0; i < 80; i++) {
    await waitFor(() => expect(document.querySelector(`[data-question="${i}"]`) ?? screen.queryByText('开始！')).toBeTruthy(), LONG);
    if (screen.queryByText('开始！')) return i;
    each?.();
    fireEvent.click(pick());
  }
  throw new Error('the placement check never ended');
}
const dontKnow = () => screen.getByText('不知道');

describe('PlacementScreen (spec §19 part 6)', () => {
  it('sweep: 不知道 is the quiet button', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={SEED} />, app);
    await walkThrough(dontKnow, () => {
      const btn = dontKnow().closest('button')!;
      expect(btn.className).not.toMatch(/btn--primary/);
      expect(btn.className).toMatch(/btn--ghost/);
    });
  }, 30_000);
  it('no warm-up, no 补一补 or 选一选: only 读一读 and 听一听; 不知道 always works; no right/wrong is shown', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} voice seed={SEED} />, app);
    const styles = new Set<string>();
    await walkThrough(dontKnow, () => {
      styles.add(document.querySelector('.placement')!.getAttribute('data-style')!);
      expect(document.querySelector('.is-wrong, .is-right, .is-answer, .sheet--oops')).toBeNull();
    });
    expect([...styles].sort()).toEqual(['hear', 'read']);
  });

  it('knows nothing: ends kindly with no cards, and 开始！ opens Home', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={SEED} />, app);
    await walkThrough(dontKnow);
    expect(screen.getByText('开始！')).toBeTruthy();
    expect(document.querySelector('.placement__levels')!.textContent).toContain('还没开始');
    expect(await allCards(app.db)).toEqual([]);
    expect((await getSettings(app.db)).placementDone).toBe(true);
    fireEvent.click(screen.getByText('开始！'));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'home' }));
  });

  it('a strong reader climbs off the top: reads up to 三下, in at most 15 questions', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} voice={false} seed={SEED} />, app);
    const n = await walkThrough(() => document.querySelector<HTMLElement>('[data-answer="true"]')!);
    expect(n).toBeLessThanOrEqual(15);
    expect(screen.getByText('开始！')).toBeTruthy();
    const r = (await getSettings(app.db)).placementResult!;
    expect(r).toMatchObject({ readsUpTo: '三下', tested: n });
    expect(document.querySelector('.placement__levels')!.textContent).toContain(`读到 三下 · 已测 ${n} 个字，推定`);
  }, 30_000);
  it('starts one term below his class term: a P2 child in 二下 is asked 二上 characters first', async () => {
    const app = await setup();
    app.settings = { ...app.settings, grade: 2, gradeYear: 2026 };
    app.now = () => new Date(2026, 9, 14, 16);
    renderWithApp(<PlacementScreen tapGuardMs={0} voice={false} seed={SEED} />, app);
    await waitFor(() => expect(document.querySelector('[data-question="0"]')).toBeTruthy(), LONG);
    expect(schoolTerm(screen.getByTestId('placement-char').textContent!)).toBe('二上');
  });
  it('always ends within 15 questions, whatever he answers', async () => {
    for (const seed of [1, 2, 3]) {
      const app = await setup();
      const { unmount } = renderWithApp(<PlacementScreen tapGuardMs={0} seed={seed} />, app);
      let i = 0;
      const n = await walkThrough(() => (i++ % 3 === 0 ? dontKnow() : document.querySelector<HTMLElement>('[data-answer="true"]')!));
      expect(n).toBeLessThanOrEqual(15);
      unmount();
    }
  }, 30_000);

  it('a fixed seed asks the same questions every time (so tests never depend on the clock)', async () => {
    const walk = async () => {
      const app = await setup();
      const { unmount } = renderWithApp(<PlacementScreen tapGuardMs={0} voice={false} seed={7} />, app);
      const seen: string[] = [];
      for (let i = 0; i < 5; i++) { // 不知道 six times would end it
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
    expect(await walkThrough(dontKnow)).toBe(9); // a P2 child in 二下: 3 at 二上, 3 at 一下, 3 at 一上, off the bottom
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
    expect(document.querySelector('.placement')!.classList.contains('placement--rerun')).toBe(true); // its card makes room for the ✕ (sweep)
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

describe('skipping placement (parent, 2026-10-05: an option to start at the start)', () => {
  it('跳过 ends the check with nothing placed: he starts from the first character', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={SEED} />, app);
    await waitFor(() => expect(document.querySelector('[data-question="0"]')).toBeTruthy(), LONG);
    fireEvent.click(screen.getByRole('button', { name: '跳过，从头开始' }));
    expect(await screen.findByText('开始！', {}, LONG)).toBeTruthy();
    expect(document.querySelector('h1')!.textContent).toContain('我们从第一个字开始！');
    expect((await getSettings(app.db)).placementDone).toBe(true);
    expect((await allCards(app.db)).filter((c) => c.kind === 'recognise')).toHaveLength(0);
  });
});

describe('听一听 in placement (spec 2026-10-14)', () => {
  it('with a voice each term asks one 听一听: he hears a word and picks its English meaning; a right one is a hear guess', async () => {
    const { speak } = await import('../audio/speech');
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} voice seed={SEED} />, app);
    let heardQs = 0;
    let readQs = 0;
    await walkThrough(() => document.querySelector<HTMLElement>('[data-answer="true"]')!, () => {
      if (document.querySelector('.placement[data-style="hear"]')) {
        heardQs++;
        expect(document.querySelectorAll('.placement__choices--meaning .choice')).toHaveLength(4);
        expect(bubble()).toBe('听一听，是什么意思？');
      } else readQs++;
    });
    expect(heardQs).toBeGreaterThan(0);
    expect(readQs).toBe(heardQs * 2);
    expect(vi.mocked(speak)).toHaveBeenCalled();
    expect((await allCards(app.db)).some((c) => c.kind === 'hear' && c.guess && c.passed)).toBe(true);
  }, 30_000);
  it('with no voice every question is a 读一读', async () => {
    const app = await setup();
    renderWithApp(<PlacementScreen tapGuardMs={0} voice={false} seed={SEED} />, app);
    await walkThrough(dontKnow, () => expect(document.querySelector('.placement[data-style="read"]')).toBeTruthy());
  });
});
