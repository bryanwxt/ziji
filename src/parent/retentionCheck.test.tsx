import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import { addReviewLog } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { CardKind, ReviewLog } from '../types';
import { RetentionCheck } from './RetentionCheck';
import { SkillsPanel } from './SkillsPanel';

const now = new Date(2026, 9, 13, 18);
let n = 0;
const logs = (k: number, over: Partial<ReviewLog> = {}): ReviewLog[] =>
  Array.from({ length: k }, () => ({ cardId: `b:${++n}:recognise`, wordId: 'b:x', kind: 'recognise' as CardKind, at: now.getTime() - 86_400_000, rating: Rating.Good, correct: true, state: State.Review, ...over }));

describe('Remembered after a gap (SRS tuning spec §5)', () => {
  it('measuring until 30 reviews', () => {
    render(<RetentionCheck logs={logs(12)} now={now} />);
    expect(screen.getByText(/Taps \(reading, meaning, listening\): Measuring — 12 of 30 reviews/)).toBeTruthy();
    expect(screen.getByText(/Writing \(写一写\): Measuring — 0 of 30 reviews/)).toBeTruthy();
  });
  it('shown against the 90% target, with no note in range', () => {
    render(<RetentionCheck logs={[...logs(27), ...logs(3, { rating: Rating.Again })]} now={now} />);
    expect(screen.getByText(/target 90%/)).toBeTruthy();
    expect(screen.getByText(/Taps .*: 90% of 30 reviews/)).toBeTruthy();
    expect(screen.queryByText(/forgetting more/)).toBeNull();
  });
  it('a note under 85%', () => {
    render(<RetentionCheck logs={[...logs(24, { kind: 'write' }), ...logs(6, { kind: 'write', rating: Rating.Again })]} now={now} />);
    expect(screen.getByText(/Writing \(写一写\): 80% of 30 reviews/)).toBeTruthy();
    expect(screen.getByText("They're forgetting more than planned — reviews may be too far apart.")).toBeTruthy();
  });
  it('a note over 95%', () => {
    render(<RetentionCheck logs={logs(30)} now={now} />);
    expect(screen.getByText('Reviews come sooner than they need.')).toBeTruthy();
  });
  it('the Skills panel shows it, and the fit, from his stored logs', async () => {
    const app = await makeAppData({ now: () => now });
    for (const l of logs(3)) await addReviewLog(app.db, l);
    renderWithApp(<SkillsPanel />, app);
    expect(await screen.findByText(/Measuring — 3 of 30 reviews/)).toBeTruthy();
    expect(screen.getByText(/Fit to your child's memory: 0 \/ 1,000 reviews/)).toBeTruthy();
  });
});
