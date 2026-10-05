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

/** Anything in the lesson card cut off by the card's own box (the same probe as the clue case). */
const cardClipped = (page: import('playwright-core').Page, name: string) => page.evaluate((n) => {
  const card = document.querySelector('.stage__card')?.getBoundingClientRect();
  if (!card) return [`${n}: no lesson card`];
  for (const el of document.querySelectorAll('.stage__card *')) {
    if ((el instanceof SVGElement && el.ownerSVGElement) || el.closest('.sr-only, [aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.top < card.top - 2 || r.bottom > card.bottom + 2 || r.left < card.left - 2 || r.right > card.right + 2)) return [`${n}: clipped by the card: ${(el.textContent ?? '').trim().slice(0, 12)}`];
    // a box inside the card that has to scroll hides its last rows (the 认新字 card scrolls rather than squash)
    const o = getComputedStyle(el).overflowY;
    if ((o === 'auto' || o === 'scroll' || o === 'hidden') && el.scrollHeight > el.clientHeight + 2) return [`${n}: ${el.className} scrolls ${el.scrollHeight - el.clientHeight}px`];
  }
  return [];
}, name);

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
  // 练一练's new questions: pairing, 组句 (also with every tile placed, its longest) and 钓鱼
  mkdirSync('fit-shots/stage-cases', { recursive: true });
  for (const c of ['pair', 'match', 'build', 'fish']) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} ${c}`)));
  }
  // 成语 (phase C): each question, then with the sheet open after a miss; the 认新字 card with a 成语
  for (const c of ['idiom', 'idiom-fit', 'idiom-build', 'intro-idiom']) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} ${c}`)));
    if (c === 'idiom' || c === 'idiom-fit') {
      const right = c === 'idiom' ? '足' : '美中不足';
      const wrong = await page.$$eval('.choice', (bs, r) => bs.map((b) => b.textContent!).find((t) => t !== r)!, right);
      await page.click(`.choice:text-is("${wrong}")`);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `fit-shots/stage-cases/${c}-wrong-${size.name}.png` });
      problems.push(...(await cardClipped(page, `${size.name} ${c} wrong`)));
    }
  }
  await page.goto(`file://${dir}/index.html?case=build`);
  for (let i = 0; i < 6 && (await page.$('.build__bank .choice')); i++) await page.click('.build__bank .choice');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `fit-shots/stage-cases/build-done-${size.name}.png` });
  problems.push(...(await cardClipped(page, `${size.name} build done`)));
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
// a live Truffle: smooth while idle and while reacting, back at rest after, and still while a question is up
{
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  // a string, so the bundler's name helpers never reach the page
  const p95 = () => page.evaluate<number>(`new Promise((done) => {
    const t = [];
    const tick = (now) => { t.push(now); if (t.length <= 120) requestAnimationFrame(tick); else { const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b); done(d[Math.floor(d.length * 0.95)]); } };
    requestAnimationFrame(tick);
  })`);
  await page.goto(`file://${dir}/index.html?case=alive`);
  await page.waitForTimeout(500);
  if (!(await page.$('svg.truffle[data-alive="true"]'))) problems.push('alive: no live Truffle rendered');
  const idle = await p95();
  if (idle > 20) problems.push(`alive: slow frames while idle: p95 ${idle.toFixed(1)}ms over 120 frames`);
  // spec §6: ≤ 8 ms of script + layout per frame on the Mac (headroom for an older iPad); the interval check above only
  // notices work past a whole frame
  const work = () => page.evaluate<number>(`(() => { const w = window.rafWork.splice(0).sort((a, b) => a - b); return w[Math.floor(w.length * 0.95)] ?? 0; })()`);
  const idleWork = await work();
  if (idleWork > 8) problems.push(`alive: too much work per frame while idle: p95 ${idleWork.toFixed(1)}ms (budget 8)`);
  await page.evaluate(() => (window as unknown as { react: (k: string) => void }).react('right'));
  const reacting = await p95();
  if (reacting > 20) problems.push(`alive: slow frames while reacting: p95 ${reacting.toFixed(1)}ms over 120 frames`);
  const reactWork = await work();
  if (reactWork > 8) problems.push(`alive: too much work per frame while reacting: p95 ${reactWork.toFixed(1)}ms (budget 8)`);
  await page.waitForTimeout(1500); // REACTIONS.right: a 910 ms hop, a 1200 ms hold
  const rest = await page.evaluate(() => document.querySelector('[data-part="rig"]')!.getAttribute('transform') ?? '');
  if (!/^translate\(0\.00 0\.00\) translate\(160 276\) scale\(1\.0000 1\.0000\)/.test(rest)) problems.push(`alive: not back at rest after a reaction (${rest})`);
  if (process.env.DEBUG_CASES) console.log('alive p95 idle', idle, 'reacting', reacting, 'work idle', idleWork, 'reacting', reactWork, 'rest', rest);
  await page.goto(`file://${dir}/index.html?case=alive-calm`);
  await page.waitForTimeout(300);
  const ears = new Set<string>();
  for (let i = 0; i < 16; i++) {
    ears.add(await page.evaluate(() => ['ear-l', 'ear-r'].map((p) => (document.querySelector(`[data-part="${p}"]`) as SVGGElement).style.transform).join('|')));
    await page.waitForTimeout(250);
  }
  if (ears.size > 1) problems.push(`alive-calm: his ears moved while a question was up (${[...ears].slice(0, 3).join(' / ')})`);
  await page.close();
}
await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'stage cases: ok');
process.exit(problems.length ? 1 : 0);
