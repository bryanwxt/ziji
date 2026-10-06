// The story's chapters, bundled with the app (spec 2026-10-07 3c §2): src/content/story/season-*/chNN.md, parsed by the 3a format.
import { parseChapter, type Chapter } from './format';

const files = import.meta.glob('../content/story/season-*/ch*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const CHAPTERS: Chapter[] = Object.values(files).map(parseChapter).sort((a, b) => a.chapter - b.chapter);
export const chapterNumbered = (n: number): Chapter | undefined => CHAPTERS.find((c) => c.chapter === n);
