// Runs the stage cases (stage-cases/page.tsx) in WebKit at a phone and an iPad size; exits 1 on any problem.
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const dir = join(tmpdir(), `ziji-stage-cases-${process.pid}`);
mkdirSync(dir, { recursive: true });
await build({ entryPoints: ['scripts/stage-cases/page.tsx'], bundle: true, outdir: dir, jsx: 'automatic', jsxImportSource: 'preact', loader: { '.json': 'json', '.woff2': 'file', '.png': 'file' }, external: ['/fonts/*'], define: { 'import.meta.env.BASE_URL': '"/"' }, logLevel: 'error' });
writeFileSync(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="page.css"><div id="app"></div><script src="page.js"></script>`);

const SIZES = [{ name: 'iphone-se', width: 375, height: 667 }, { name: 'ipad-landscape', width: 1024, height: 768 }, { name: 'ipad-portrait', width: 768, height: 1024 }];
const problems: string[] = [];
const browser = await webkit.launch();
for (const size of SIZES) {
  const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
  // a wrong answer on a bank item with a long clue: nothing in the card is cut off, the prompt never slides under the tiles
  await page.goto(`file://${dir}/index.html?case=clue`);
  if (!(await page.$('.stage__card')) || (await page.evaluate(() => getComputedStyle(document.querySelector('.stage')!).display)) !== 'grid') { problems.push(`${size.name}: the stage did not render with the app's styles`); await page.close(); continue; }
  await page.click('.choice:has-text("从来")');
  await page.waitForTimeout(500);
  if (process.env.DEBUG_CASES) {
    console.log(size.name, JSON.stringify(await page.evaluate(() => Object.fromEntries(['.lessonbar', '.stage__card', '.flash__prompt', '.choices', '.stage__truffle', '.stage__sheet', '.sheet__detail'].map((q) => { const r = document.querySelector(q)?.getBoundingClientRect(); return [q, r ? [Math.round(r.top), Math.round(r.height)] : null]; })))));
    await page.screenshot({ path: `${process.env.DEBUG_CASES}/clue-${size.name}.png` });
  }
  problems.push(...(await page.evaluate((name) => {
    const out: string[] = [];
    const card = document.querySelector('.stage__card')!.getBoundingClientRect();
    for (const el of document.querySelectorAll('.stage__card *')) {
      if ((el instanceof SVGElement && el.ownerSVGElement) || el.closest('.sr-only, [aria-hidden="true"], .is-eaten')) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height && (r.top < card.top - 2 || r.bottom > card.bottom + 2)) { out.push(`${name} clue: clipped by the card: ${(el.textContent ?? '').trim().slice(0, 12)}`); break; }
    }
    const prompt = document.querySelector('.flash__prompt')!.getBoundingClientRect();
    const tiles = document.querySelector('.choices')!.getBoundingClientRect();
    if (prompt.bottom > tiles.top + 2) out.push(`${name} clue: the prompt slides under the tiles (${Math.round(prompt.bottom)} > ${Math.round(tiles.top)})`);
    return out;
  }, size.name)));
  // the card keeps its size when feedback appears, so a box sized for the question (写一写's grid) is never clipped
  const cardH = async (hash: string) => { await page.goto(`file://${dir}/index.html?case=${hash}`); await page.waitForTimeout(300); return page.evaluate(() => document.querySelector('.stage__card')!.getBoundingClientRect().height); };
  const neutral = await cardH("neutral"), good = await cardH("good");
  if (process.env.DEBUG_CASES) console.log(size.name, "card neutral", neutral, "good", good);
  if (Math.abs(neutral - good) > 2) problems.push(`${size.name} sheet: the card shrinks ${Math.round(neutral - good)}px when feedback appears`);
  await page.close();
}
// every expression × looks: nothing of him pokes out of his box (a seam, an ear, a mark), and a sheet to read by eye
{
  const page = await browser.newPage({ viewport: { width: 1100, height: 560 } });
  await page.goto(`file://${dir}/index.html?case=faces`);
  await page.waitForTimeout(400);
  mkdirSync('fit-shots/stage-cases', { recursive: true });
  await page.screenshot({ path: 'fit-shots/stage-cases/faces.png', fullPage: true });
  problems.push(...(await page.evaluate(() => {
    const out: string[] = [];
    for (const svg of document.querySelectorAll('svg.truffle')) {
      const box = svg.getBoundingClientRect();
      const rig = svg.querySelector('[data-part="rig"]')!.getBoundingClientRect();
      const tilted = ['curious', 'embarrassed', 'proud'].includes(svg.getAttribute('data-expression') ?? '');
      const m = tilted ? 14 : 4; // a tilted head swings a hat a little past the box; Truffle is never clipped on screen
      if (rig.left < box.left - m || rig.right > box.right + m || rig.top < box.top - m || rig.bottom > box.bottom + m) out.push(`faces: ${svg.getAttribute('data-expression')} (${svg.getAttribute('data-outfit') ?? svg.getAttribute('data-accessory') ?? svg.getAttribute('data-power') ?? 'plain'}) pokes out of his box`);
    }
    return out;
  })));
  await page.close();
}
await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'stage cases: ok');
process.exit(problems.length ? 1 : 0);
