// which chapter part is owed (spec 2026-10-07 3c §3): one new chapter a day; an owed payoff first, any day.
export interface StoryProgress { chapter: number; readOn?: string; setupDone?: boolean; payoffDone?: boolean }
export const NO_STORY: StoryProgress = { chapter: 0 };

export function storyStep(p: StoryProgress | undefined, chapterCount: number, today: string): { part: 'setup' | 'payoff'; chapter: number } | null {
  const s = p ?? NO_STORY;
  const next = s.chapter + 1;
  if (s.setupDone && !s.payoffDone) return next <= chapterCount ? { part: 'payoff', chapter: next } : null;
  if (s.readOn === today) return null;
  return next <= chapterCount ? { part: 'setup', chapter: next } : null;
}
export const markSetup = (p: StoryProgress | undefined, chapter: number, today: string): StoryProgress =>
  ({ chapter: chapter - 1, readOn: today, setupDone: true, payoffDone: false });
export const markPayoff = (p: StoryProgress | undefined, chapter: number): StoryProgress =>
  ({ ...(p ?? NO_STORY), chapter, payoffDone: true });
