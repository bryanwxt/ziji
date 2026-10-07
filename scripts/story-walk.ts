// Every page of every chapter at the phone and iPad sizes: no page's words may need scrolling (2026-10-07: the parent saw pages scroll).
// Runs on its own (npx tsx scripts/story-walk.ts) and from stage-cases.ts. Exits 1 on any problem.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webkit, type Browser } from 'playwright-core';

export const STORY_SIZES = [
  ['iphone-se', 375, 553], // Safari with its bars on the smallest phone
  ['iphone', 390, 664],
  ['ipad-portrait', 768, 1024],
  ['ipad-landscape', 1024, 768],
  ['ipad-air-landscape', 1180, 820],
] as const;

const chapterNumbers = (): number[] => readdirSync('src/content/story').filter((d) => d.startsWith('season-'))
  .flatMap((d) => readdirSync(`src/content/story/${d}`).map((f) => /^ch(\d+)\.md$/.exec(f)?.[1]).filter((x): x is string => !!x).map(Number))
  .sort((a, b) => a - b);

/** Walks each chapter's setup and payoff page by page (no voice: Granny's lines show at once; 听一听 is skipped). */
export async function storyWalk(browser: Browser, dir: string): Promise<string[]> {
  const problems: string[] = [];
  const page = await browser.newPage();
  for (const [name, width, height] of STORY_SIZES) {
    await page.setViewportSize({ width, height });
    for (const chapter of chapterNumbers()) {
      for (const c of ['story-setup', 'story-rescued']) {
        await page.goto(`file://${dir}/index.html?case=${c}&chapter=${chapter}`);
        await page.waitForSelector('.story', { timeout: 10_000 });
        for (let beat = 0; beat < 30; beat++) {
          await page.waitForTimeout(700); // the lines fade in; the fit settles
          const r = await page.evaluate(() => {
            const w = document.querySelector('.story__words')!;
            const nav = document.querySelector('.story__nav')!.getBoundingClientRect();
            const fs = parseFloat(getComputedStyle(w).fontSize);
            return { over: w.scrollHeight - w.clientHeight, navOff: nav.bottom > innerHeight + 2, fs, beat: document.querySelector('.story')!.getAttribute('data-beat') };
          });
          const at = `story-walk ${name} ch${chapter} ${c === 'story-setup' ? 'setup' : 'payoff'} beat ${r.beat}`;
          if (r.over > 2) problems.push(`${at}: the words scroll ${r.over}px`);
          if (r.navOff) problems.push(`${at}: the page buttons are off the screen`);
          if (r.fs < 17) problems.push(`${at}: text ${r.fs}px is under 17px`);
          const next = await page.$('.story__nav-btn--next:not([disabled]):not(.story__nav-btn--go)'); // 出发/完成 leaves the story
          if (!next) break;
          await next.click();
          await page.waitForTimeout(80);
        }
      }
    }
  }
  await page.close();
  return problems;
}

if (process.argv[1]?.endsWith('story-walk.ts')) {
  const dir = join(tmpdir(), `ziji-story-walk-${process.pid}`);
  mkdirSync(join(dir, 'story/bg'), { recursive: true });
  const { chaptersShim } = await import('./stage-cases/shim');
  await build({ entryPoints: ['scripts/stage-cases/page.tsx'], bundle: true, outdir: dir, plugins: [chaptersShim], jsx: 'automatic', jsxImportSource: 'preact', loader: { '.json': 'json', '.woff2': 'file', '.woff': 'file', '.png': 'file', '.md': 'text' }, external: ['/fonts/*'], define: { 'import.meta.env.BASE_URL': '"./"' }, logLevel: 'error' });
  writeFileSync(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="page.css"><div id="app"></div><script src="page.js"></script>`);
  for (const f of readdirSync('public/story/bg').filter((x) => x.endsWith('.webp'))) copyFileSync(`public/story/bg/${f}`, join(dir, 'story/bg', f));
  const browser = await webkit.launch();
  const problems = await storyWalk(browser, dir);
  await browser.close();
  for (const p of problems) console.log(`FAIL ${p}`);
  console.log(problems.length ? `story walk: ${problems.length} problems` : 'story walk: ok');
  process.exit(problems.length ? 1 : 0);
}
