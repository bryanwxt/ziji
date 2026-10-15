// A WebKit contact sheet of costumes for the v3 check (rewards spec §5.1): each at 220 px idle, at the 64 px Wardrobe tile, and
// at 220 px cheering with his right paw raised, saved to fit-shots/costumes/<label>.png to compare by eye with
// docs/worlds/costumes/standard-v3.png. Then every paw move (PAW_TRACKS: wave, raise, clap, knead, cover, swat) is probed frame by
// frame, unseen in the picture. Fails if a costume doesn't draw, a held prop crosses his eyes or mouth in any pose, or opaque
// headgear covers an eye.
// Usage: npx tsx scripts/costume-sheet.ts <label> [id,id,...]   (no ids: every costume in the chest)
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright-core';
import { CHEST_COSTUMES } from '../src/fun/costumes';
import { PAW_TRACKS, type PawPose } from '../src/ui/truffle/timelines';
import { bundleStagePage } from './stage-cases/bundle';
import { SHEET_CELL_HEIGHT, SHEET_COLUMNS, SHEET_PROBE } from './stage-cases/faceProbe';

/** Each paw move's distinct frames (20 ms apart, told apart at 3 units), leaving out the paws at rest (the sheet's idle row). */
function pawFrames(): { row: string; paws: PawPose }[] {
  const out: { row: string; paws: PawPose }[] = [];
  for (const [name, track] of Object.entries(PAW_TRACKS)) {
    const seen = new Set<string>();
    for (let t = 0; ; t += 20) {
      const p = track(t);
      if (!p) break;
      const key = Object.values(p).map((v) => Math.round(v / 3)).join(',');
      if (/^(0,){5}0$/.test(key) || seen.has(key)) continue;
      seen.add(key);
      out.push({ row: `${name}@${t}ms`, paws: p });
    }
  }
  return out;
}

const [label = 'sheet', list] = process.argv.slice(2);
const ids = list ? list.split(',') : CHEST_COSTUMES.map((c) => c.id);
const dir = await bundleStagePage();
const browser = await webkit.launch();
// tall enough that every figure is on screen: elementFromPoint only sees the viewport
const page = await browser.newPage({ viewport: { width: SHEET_COLUMNS * 240 + 20, height: Math.ceil(ids.length / SHEET_COLUMNS) * SHEET_CELL_HEIGHT + 40 } });
const pageErrors: string[] = [];
page.on('pageerror', (e) => pageErrors.push(`page error: ${e.message}`));
await page.goto(`file://${dir}/index.html?case=costume-sheet&ids=${ids.join(',')}`);
// every cell drawn before the probe: an empty page would pass it (on a loaded machine the bundle can still be running here)
await page.waitForFunction(`document.querySelectorAll('[data-costume]').length === ${ids.length} && typeof window.__sheetPose === 'function'`, undefined, { timeout: 60_000 })
  .catch(async (e: Error) => { console.log([...pageErrors, `the sheet never drew: ${e.message.split('\n')[0]}`].map((p) => `FAIL ${p}`).join('\n')); await browser.close(); process.exit(1); });
await page.waitForTimeout(300);
mkdirSync('fit-shots/costumes', { recursive: true });
await page.screenshot({ path: `fit-shots/costumes/${label}.png`, fullPage: true });
const problems = await page.evaluate<string[]>(SHEET_PROBE);
const frames = pawFrames();
for (const { row, paws } of frames) {
  await page.evaluate(`window.__sheetPose(${JSON.stringify(paws)}, ${JSON.stringify(row)})`);
  await page.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
  problems.push(...(await page.evaluate<string[]>(SHEET_PROBE)));
}
await browser.close();
/** One line per costume and finding, with the first pose it was seen in and how many more: headgear on an eye is in every pose. */
function grouped(list: string[]): string[] {
  const by = new Map<string, string[]>();
  for (const p of list) {
    const m = /^(\S+) (\S+): (.*?)(?: \(\d+%\))?$/.exec(p);
    const key = m ? `${m[1]}: ${m[3]}` : p;
    by.set(key, [...(by.get(key) ?? []), m?.[2] ?? '']);
  }
  return [...by].map(([key, rows]) => (rows.length > 1 ? `${key} (${rows[0]} and ${rows.length - 1} more poses)` : `${key} (${rows[0]})`));
}
const fails = [...pageErrors, ...grouped(problems)];
console.log(fails.length ? fails.map((p) => `FAIL ${p}`).join('\n') : `costume sheet ${label}: ok (${ids.length} costumes, idle + ${frames.length} paw frames) → fit-shots/costumes/${label}.png`);
process.exit(fails.length ? 1 : 0);
