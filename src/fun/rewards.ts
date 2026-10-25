import type { RewardGoal } from '../types';

export interface GoalProgress {
  value: number;
  fraction: number;
  reached: boolean;
}

export function goalProgress(goal: RewardGoal, stats: { stars: number; known: number }): GoalProgress {
  const value = goal.metric === 'stars' ? stats.stars : stats.known;
  return { value, fraction: Math.min(1, value / goal.target), reached: value >= goal.target };
}

/**
 * The count a "know N" goal uses (parent decision 2026-10-25): confirmed characters. A goal set before the switch counts at
 * least what known was then, so it never goes back (review I3); until the switch is kept on the kid, known itself.
 */
export function goalKnown(goal: Pick<RewardGoal, 'createdAt'>, know: { confirmed: number; known: number }, atSwitch: { count: number; at: number } | undefined): number {
  if (!atSwitch) return Math.max(know.confirmed, know.known);
  return goal.createdAt < atSwitch.at ? Math.max(know.confirmed, atSwitch.count) : know.confirmed;
}

export function nextGoal(goals: RewardGoal[]): RewardGoal | null {
  return goals.filter((g) => g.claimedAt === null).sort((a, b) => a.createdAt - b.createdAt)[0] ?? null;
}
