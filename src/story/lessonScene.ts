// The painting behind today's lesson (parent 2026-10-07: the lesson still showed the old world after the painted story): the place
// the chapter left off — where its setup ended when its payoff is still owed, else where the last finished chapter ended.
import type { Chapter, Page } from './format';
import { NO_STORY, type StoryProgress } from './progress';

export function lessonScene(p: StoryProgress | undefined, chapters: Chapter[]): string | null {
  const s = p ?? NO_STORY;
  const owed = !!s.setupDone && !s.payoffDone;
  const c = chapters.find((x) => x.chapter === (owed ? s.chapter + 1 : s.chapter));
  if (!c) return null;
  const pages: Page[] = [...c.setup, ...(c.go ? [c.go] : []), ...(owed ? [] : c.payoff)];
  let scene: string | null = null;
  for (const page of pages) for (const l of page.lines) if (l.kind === 'scene') scene = l.id;
  return scene;
}
