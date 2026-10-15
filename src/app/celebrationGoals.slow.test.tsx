import { fireEvent, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BUILTIN, builtinWords } from '../content';
import { powerFamilies } from '../fun/powers';
import { createSessionRecord } from '../session/runner';
import { addReviewLog, putCards, putWords, saveKid } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type SessionPlan } from '../types';
import { Celebration } from './Celebration';

vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => true }));
// a goal read that never finishes (a stuck IndexedDB read): toggled per test
const stuck = { on: false };
vi.mock('./celebrationData', async (orig) => {
  const real = await orig<typeof import('./celebrationData')>();
  return { ...real, loadGoalFacts: (...a: Parameters<typeof real.loadGoalFacts>) => (stuck.on ? new Promise<never>(() => {}) : real.loadGoalFacts(...a)) };
});

const plan: SessionPlan = { steps: ['newwords'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const finished = (free = false) => ({ ...createSessionRecord(plan, '2026-10-02', 10, free), completed: true, completedSteps: ['newwords' as const] });
async function continueTo(text: string) {
  for (let i = 0; i < 6 && !screen.queryByText(text); i++) {
    fireEvent.click(screen.getByText('继续'));
    await new Promise((r) => setTimeout(r, 320)); // past the double-tap guard
  }
  return screen.findByText(text);
}
const lines = () => [...document.querySelectorAll('.goals .goal-line [data-zh]')].map((l) => l.getAttribute('data-zh'));

describe('almost there on the Celebration (rewards spec §4)', () => {
  it('after the river, up to three goals, nearest first, each with its icon and pinyin', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, powerFamilies(BUILTIN).water.slice(0, 2).map((c) => makeCard(`b:${c}`, 'recognise', new Date(2026, 8, 1), true)));
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' }); // today's chest was opened: a river phase, no chest
    renderWithApp(<Celebration rec={finished()} />, app);
    await screen.findByText('太棒了！');
    await continueTo('快到了！');
    expect(lines().length).toBeGreaterThan(0);
    expect(lines().length).toBeLessThanOrEqual(3);
    expect(lines()[0]).toBe('再认识 1 个『水』字，解锁新能力');
    expect(document.querySelector('.goal-line--power svg.inkicon')?.getAttribute('data-icon')).toBe('drop');
    expect(document.querySelector('.goal-line .label__py')).toBeTruthy();
  });
  it('the 还差一天 line moves from under the stars to a goal', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, [makeCard('b:鱼', 'write', new Date(2026, 9, 10))]);
    await addReviewLog(app.db, { cardId: 'b:鱼:write', wordId: 'b:鱼', kind: 'write', at: new Date(2026, 9, 2, 8).getTime(), rating: 3, correct: true, misses: 0 });
    await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' });
    renderWithApp(<Celebration rec={{ ...finished(), stars: 1, produced: { write: 0, say: 0 }, closest: ['鱼'] }} />, app);
    await screen.findByText('太棒了！');
    expect(document.querySelector('.celebrate__line')).toBeNull();
    await continueTo('快到了！');
    expect(lines()[0]).toBe('明天再写对『鱼』，就会写了！');
  });
  it('free play: no goals', async () => {
    const app = await makeAppData();
    renderWithApp(<Celebration rec={finished(true)} />, app);
    await screen.findByText('练习得很好！');
    expect(screen.queryByText('快到了！')).toBeNull();
    expect(screen.getByText('回家')).toBeTruthy();
  });
  it('a goal read that never finishes never holds back the stars: no goals, and on he goes (rewards fix round)', async () => {
    stuck.on = true;
    try {
      const app = await makeAppData();
      await saveKid(app.db, { ...DEFAULT_KID, lastChestDate: '2026-10-02' });
      renderWithApp(<Celebration rec={finished()} />, app);
      await screen.findByText('太棒了！', {}, { timeout: 3000 });
      fireEvent.click(screen.getByText('继续'));
      await new Promise((r) => setTimeout(r, 350));
      expect(screen.queryByText('快到了！')).toBeNull();
    } finally {
      stuck.on = false;
    }
  });
});
