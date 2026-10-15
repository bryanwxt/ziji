// A WebKit contact sheet of costumes for the v3 check (rewards spec §5.1): each at 220 px idle, at the 64 px Wardrobe tile, and
// at 220 px cheering with his right paw raised, saved to fit-shots/costumes/<label>.png to compare by eye with
// docs/worlds/costumes/standard-v3.png. Fails if a costume doesn't draw or a held prop crosses his eyes or mouth.
// Usage: npx tsx scripts/costume-sheet.ts <label> [id,id,...]   (no ids: every costume in the chest)
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright-core';
import { CHEST_COSTUMES } from '../src/fun/costumes';
import { bundleStagePage } from './stage-cases/bundle';
import { SHEET_CELL_HEIGHT, SHEET_COLUMNS, SHEET_PROBE } from './stage-cases/faceProbe';

const [label = 'sheet', list] = process.argv.slice(2);
const ids = list ? list.split(',') : CHEST_COSTUMES.map((c) => c.id);
const dir = await bundleStagePage();
const browser = await webkit.launch();
// tall enough that every figure is on screen: elementFromPoint only sees the viewport
const page = await browser.newPage({ viewport: { width: SHEET_COLUMNS * 240 + 20, height: Math.ceil(ids.length / SHEET_COLUMNS) * SHEET_CELL_HEIGHT + 40 } });
await page.goto(`file://${dir}/index.html?case=costume-sheet&ids=${ids.join(',')}`);
await page.waitForTimeout(500);
mkdirSync('fit-shots/costumes', { recursive: true });
await page.screenshot({ path: `fit-shots/costumes/${label}.png`, fullPage: true });
const problems = await page.evaluate<string[]>(SHEET_PROBE);
await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : `costume sheet ${label}: ok (${ids.length}) → fit-shots/costumes/${label}.png`);
process.exit(problems.length ? 1 : 0);
