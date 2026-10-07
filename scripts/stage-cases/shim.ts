import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// src/story/chapters.ts bundles the chapters with Vite's import.meta.glob, which esbuild doesn't know: give it the same module from disk
export const chaptersShim = {
  name: 'story-chapters',
  setup(b: { onLoad: (o: { filter: RegExp }, f: () => { contents: string; loader: 'ts'; resolveDir: string }) => void }) {
    b.onLoad({ filter: /src[\\/]story[\\/]chapters\.ts$/ }, () => {
      const root = 'src/content/story';
      const md = readdirSync(root).filter((d) => d.startsWith('season-')).flatMap((d) => readdirSync(`${root}/${d}`).filter((f) => /^ch\d+\.md$/.test(f)).map((f) => readFileSync(`${root}/${d}/${f}`, 'utf8')));
      return { loader: 'ts', resolveDir: join(process.cwd(), 'src/story'), contents: `import { parseChapter } from './format';
export const CHAPTERS = ${JSON.stringify(md)}.map(parseChapter).sort((a, b) => a.chapter - b.chapter);
export const chapterNumbered = (n: number) => CHAPTERS.find((c) => c.chapter === n);` };
    });
  },
};
