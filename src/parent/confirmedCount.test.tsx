import { render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { addReviewLog, putCards, putWords } from '../store/repo';
import { summarize } from '../stats/stats';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { Dashboard } from './Dashboard';
import { ProgressPanel } from './ProgressPanel';
import { RewardsPanel } from './RewardsPanel';

// The parent sees the confirmed count too, with placement's guesses still to recheck on a line of their own (2026-10-25).
const at = new Date(2026, 9, 1);
const words = ['大', '小', '门'].map((t) => makeWord(t));
const cards = [makeCard('b:大', 'recognise', at, true), { ...makeCard('b:小', 'recognise', at, true), placed: true as const }, { ...makeCard('b:门', 'recognise', at, true), placed: true as const }];
async function seeded() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await putCards(app.db, cards);
  await addReviewLog(app.db, { cardId: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', at: at.getTime(), rating: 3, correct: true });
  return app;
}

describe('the confirmed count in the parent area', () => {
  it('Dashboard: confirmed against the target, and the guesses still to confirm', async () => {
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, await seeded());
    expect(await screen.findByText('1 / 500')).toBeTruthy();
    expect(screen.getByText('+2 from placement, still to confirm')).toBeTruthy();
  });
  it('Dashboard: no line when nothing waits to be confirmed', async () => {
    const app = await makeAppData();
    await putWords(app.db, words);
    await putCards(app.db, [makeCard('b:大', 'recognise', at, true)]);
    await addReviewLog(app.db, { cardId: 'b:大:recognise', wordId: 'b:大', kind: 'recognise', at: at.getTime(), rating: 3, correct: true });
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, app);
    expect(await screen.findByText('1 / 500')).toBeTruthy();
    expect(screen.queryByText(/from placement, still to confirm/)).toBeNull();
  });
  it('Progress: confirmed against the book, the guesses in the book on their own line', () => {
    render(<ProgressPanel know={summarize(words, cards)} settings={{ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026 }} now={new Date('2026-10-11T09:00:00')} />);
    expect(screen.getByText('1 of 746 by the end of 二下')).toBeTruthy(); // 大; 小 and 门 are guesses still to recheck
    expect(screen.getByText('+2 from placement, still to confirm')).toBeTruthy();
  });
  it('Rewards: "Characters known" is the confirmed count', async () => {
    renderWithApp(<RewardsPanel />, await seeded());
    expect(await screen.findByText('Characters known (now 1)')).toBeTruthy();
    expect(screen.getByText('+2 from placement, still to confirm')).toBeTruthy();
  });
});
