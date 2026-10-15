// Runs the stage cases (stage-cases/page.tsx) in WebKit at a phone and an iPad size; exits 1 on any problem.
import { build } from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webkit } from 'playwright-core';
import { chaptersShim } from './stage-cases/shim';
import { storyWalk } from './story-walk';
import { WORLDS } from '../src/fun/worlds';

const dir = join(tmpdir(), `ziji-stage-cases-${process.pid}`);
mkdirSync(dir, { recursive: true });
await build({ entryPoints: ['scripts/stage-cases/page.tsx'], bundle: true, outdir: dir, plugins: [chaptersShim], jsx: 'automatic', jsxImportSource: 'preact', loader: { '.json': 'json', '.woff2': 'file', '.woff': 'file', '.png': 'file', '.md': 'text' }, external: ['/fonts/*'], define: { 'import.meta.env.BASE_URL': '"./"' }, logLevel: 'error' });
cpSync('public/worlds', join(dir, 'worlds'), { recursive: true }); // the paintings, next to the page (spec 2026-10-13 §5)
writeFileSync(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="page.css"><div id="app"></div><script src="page.js"></script>`);

/** Anything in the lesson card cut off by the card's own box (the same probe as the clue case). */
const cardClipped = (page: import('playwright-core').Page, name: string, scrolls = '') => page.evaluate(([n, s]) => {
  const card = document.querySelector('.stage__card')?.getBoundingClientRect();
  if (!card) return [`${n}: no lesson card`];
  for (const el of document.querySelectorAll('.stage__card *')) {
    if ((el instanceof SVGElement && el.ownerSVGElement) || el.closest('.sr-only, [aria-hidden="true"]')) continue;
    if (s && el.closest(s)) continue; // a box meant to scroll, and what is inside it
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.top < card.top - 2 || r.bottom > card.bottom + 2 || r.left < card.left - 2 || r.right > card.right + 2)) return [`${n}: clipped by the card: ${(el.textContent ?? '').trim().slice(0, 12)}`];
    // a box inside the card that has to scroll hides its last rows (the 认新字 card scrolls rather than squash)
    const o = getComputedStyle(el).overflowY;
    if ((o === 'auto' || o === 'scroll' || o === 'hidden') && el.scrollHeight > el.clientHeight + 2) return [`${n}: ${el.className} scrolls ${el.scrollHeight - el.clientHeight}px`];
  }
  return [];
}, [name, scrolls] as const);

/** Nothing in a feedback sheet's explanation past the sheet, and the sheet on the screen (spec 2026-10-12 §3's why-lines). */
const sheetFits = (page: import('playwright-core').Page, name: string) => page.evaluate((n) => {
  const sheet = document.querySelector('.sheet')?.getBoundingClientRect();
  if (!sheet) return [`${n}: no sheet`];
  const out: string[] = [];
  if (sheet.top < -1 || sheet.bottom > innerHeight + 1) out.push(`${n}: the sheet runs off the screen (${Math.round(sheet.top)}–${Math.round(sheet.bottom)})`);
  for (const el of document.querySelectorAll('.sheet__detail *')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.left < sheet.left - 2 || r.right > sheet.right + 2 || r.bottom > sheet.bottom + 2)) { out.push(`${n}: cut off in the sheet: ${(el.textContent ?? '').trim().slice(0, 12)}`); break; }
  }
  return out;
}, name);

/** A sheet's explanation that has to scroll hides its last lines (final review C2: 找一家人's two misses). */
const sheetScrolls = (page: import('playwright-core').Page, name: string) => page.evaluate((n) => {
  const d = document.querySelector('.sheet__detail');
  return d && d.scrollHeight > d.clientHeight + 2 ? [`${n}: the sheet's explanation scrolls ${d.scrollHeight - d.clientHeight}px`] : [];
}, name);

const SIZES = [{ name: 'iphone-se', width: 375, height: 667 }, { name: 'iphone-safari', width: 390, height: 664 }, { name: 'iphone-15', width: 390, height: 844 }, { name: 'ipad-landscape', width: 1024, height: 768 }, { name: 'ipad-portrait', width: 768, height: 1024 }];
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
  for (const c of ['pair', 'match', 'build', 'fish', 'hear', 'hear-long', 'hear-read', 'hear-bound', 'hear-bound-read', 'hear-bound-long']) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} ${c}`)));
    if (c === 'pair') {
      // 8 halves, two of them decoys (production practice spec §5), all on the card at every size
      const tiles = (await page.$$('.pairs--eight .pair__tile')).length;
      if (tiles !== 8) problems.push(`${size.name} pair: ${tiles} tiles on the board (want 8)`);
      // play it with wrong tries (always the last open right tile): the board ends explaining every 组词, and nothing is cut off;
      // a left decoy tried three times is set aside (disabled), so the next open left tile is taken
      for (let k = 0; k < 40; k++) {
        const left = await page.$('.pairs__col--left .pair__tile:not(.is-matched):not(.is-shown):not([disabled])');
        if (!left) break;
        await left.click();
        const rights = await page.$$('.pairs__col--right .pair__tile:not(.is-matched):not(.is-shown)');
        await rights[rights.length - 1]!.click();
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(400);
      await page.screenshot({ path: `fit-shots/stage-cases/pair-done-${size.name}.png` });
      if (!(await page.$('.pair-summary'))) problems.push(`${size.name} pair: no 组词 explained after wrong tries`);
      problems.push(...(await cardClipped(page, `${size.name} pair done`)));
    }
  }
  // a read-only character traced over its outline (production practice spec §3): the 田字格 with 澡's outline drawn, on the card
  {
    await page.goto(`file://${dir}/index.html?case=trace`);
    await page.waitForSelector('.tianzige svg', { timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `fit-shots/stage-cases/trace-${size.name}.png` });
    if ((await page.$$('.tianzige svg path')).length === 0) problems.push(`${size.name} trace: no outline in the 田字格`);
    problems.push(...(await cardClipped(page, `${size.name} trace`)));
  }
  // 说一句 (production practice spec §4): the ask and its pattern, then after a take 再录一次 and 听一听例句, and the model sentence once he taps it
  {
    await page.goto(`file://${dir}/index.html?case=sentence`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/sentence-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} sentence`)));
    await page.click('.mic-btn');
    await page.waitForSelector('.mic-btn.is-recording', { timeout: 5000 }).catch(() => null);
    await page.click('.mic-btn.is-recording').catch(() => null);
    await page.waitForSelector('text=听一听例句', { timeout: 5000 }).catch(() => null);
    await page.screenshot({ path: `fit-shots/stage-cases/sentence-took-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} sentence took`)));
    await page.click('text=听一听例句').catch(() => null); // the model shows only on this tap (or after the re-record)
    const said = await page.waitForSelector('.say-sentence__model', { timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/sentence-said-${size.name}.png` });
    if (!said) problems.push(`${size.name} sentence: no model sentence after a take`);
    problems.push(...(await cardClipped(page, `${size.name} sentence said`)));
  }
  // 「都不对」 (production practice spec §5): right (the real answer on the sheet) and wrong, for the 组词 gap and the English meaning
  for (const c of ['none-word', 'none-meaning']) {
    for (const pick of ['.choice--none', '.choice:not(.choice--none)']) {
      await page.goto(`file://${dir}/index.html?case=${c}`);
      await page.waitForTimeout(300);
      if (!(await page.$('.choice--none'))) { problems.push(`${size.name} ${c}: no 都不对 choice`); break; }
      problems.push(...(await cardClipped(page, `${size.name} ${c}`)));
      await page.click(pick);
      await page.waitForTimeout(1600);
      const name = `${c}-${pick === '.choice--none' ? 'right' : 'wrong'}`;
      await page.screenshot({ path: `fit-shots/stage-cases/${name}-${size.name}.png` });
      if (!(await page.$('.sheet .sheet__en'))) problems.push(`${size.name} ${name}: the sheet doesn't show the real answer`);
      // a right pick flies to Truffle (is-eaten): it leaves the card on purpose
      problems.push(...(await cardClipped(page, `${size.name} ${name}`, '.is-eaten')), ...(await sheetFits(page, `${size.name} ${name}`)), ...(await sheetScrolls(page, `${size.name} ${name}`)));
    }
  }
  // the Understand question (plan 2b): the choices open after the sentence (5 s here: no voice ends it), then a miss's sheet
  {
    await page.goto(`file://${dir}/index.html?case=understand`);
    await page.waitForTimeout(5300);
    await page.screenshot({ path: `fit-shots/stage-cases/understand-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} understand`)));
    const wrong = await page.$$('.understand__choice');
    if (wrong.length !== 3) problems.push(`${size.name} understand: ${wrong.length} choices`);
    await page.click('.understand__choice >> nth=0');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `fit-shots/stage-cases/understand-picked-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} understand picked`)));
  }
  // 成语 (phase C): each question, then with the sheet open after a miss; the 认新字 card with a 成语
  for (const c of ['idiom', 'idiom-fit', 'idiom-build', 'intro-idiom', 'intro-idiom-word', 'intro-school-idiom']) {
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
  // cards that teach (spec 2026-10-12 §7): the why-sheets, a faded sentence with a peek, the family question
  for (const [c, wrong] of [['why-look', '.choice:text-is("睛")'], ['why-pinyin', '.choice:text-is("qīng")']] as const) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(300);
    await page.click(wrong);
    await page.waitForTimeout(1600); // the pinyin and English come 1 s after the characters
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    if (!(await page.$('.sheet .why'))) problems.push(`${size.name} ${c}: no why-line on the sheet`);
    problems.push(...(await cardClipped(page, `${size.name} ${c}`)), ...(await sheetFits(page, `${size.name} ${c}`)));
  }
  {
    await page.goto(`file://${dir}/index.html?case=fade-peek`);
    await page.waitForTimeout(300);
    if (!(await page.$('.meaning-cue .label__cell--hidden'))) problems.push(`${size.name} fade-peek: no faded pinyin`);
    await page.click('.meaning-cue .label__cell--hidden >> nth=0');
    await page.waitForTimeout(200);
    const peek = await page.$eval('.label__cell--peek .label__py', (e) => e.textContent ?? '').catch(() => '');
    if (!peek) problems.push(`${size.name} fade-peek: a tap showed no pinyin`);
    await page.screenshot({ path: `fit-shots/stage-cases/fade-peek-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} fade-peek`)));
  }
  {
    await page.goto(`file://${dir}/index.html?case=intro-full`);
    await page.waitForTimeout(2400); // its pinyin comes 2 s after the character
    await page.screenshot({ path: `fit-shots/stage-cases/intro-full-${size.name}.png` });
    // the tallest intro card (组词 rows and a 成语): the character, its speak button and every row sit inside the card on every size
    for (const sel of ['.intro .speak', '.intro__group.intro__idiom']) if (!(await page.$(sel))) problems.push(`${size.name} intro-full: no ${sel}`);
    if (await page.$('.family, .family__word')) problems.push(`${size.name} intro-full: a 一家人 row is back on the card`);
    problems.push(...(await cardClipped(page, `${size.name} intro-full`)));
  }
  // a bound character's 认新字 card (parent 2026-10-15): the pair, the character alone and the speak button all on the card
  for (const c of ['intro-bound', 'intro-bound-full', 'intro-bound-long']) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(2400); // its pinyin comes 2 s after the character
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    for (const sel of ['.hanzi--pair', '.bound__ch', '.intro__alone', '.intro__bound .speak']) if (!(await page.$(sel))) problems.push(`${size.name} ${c}: no ${sel}`);
    problems.push(...(await cardClipped(page, `${size.name} ${c}`)));
  }
  {
    await page.goto(`file://${dir}/index.html?case=family`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/family-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} family`)));
    await page.click('.choice:text-is("星星")');
    await page.click('.choice:text-is("先生")');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `fit-shots/stage-cases/family-wrong-${size.name}.png` });
    if (!(await page.$('.family-sum__row.is-missed'))) problems.push(`${size.name} family: the miss is not explained`);
    problems.push(...(await cardClipped(page, `${size.name} family wrong`)), ...(await sheetFits(page, `${size.name} family wrong`)), ...(await sheetScrolls(page, `${size.name} family wrong`)));
    // both picks wrong (final review C2, live on his iPad): two words, two look-alikes and two why-lines, none clipped or scrolled
    await page.goto(`file://${dir}/index.html?case=family`);
    await page.waitForTimeout(300);
    await page.click('.choice:text-is("星星")');
    await page.click('.choice:text-is("出去")');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `fit-shots/stage-cases/family-two-wrong-${size.name}.png` });
    const missed = (await page.$$('.family-sum__row.is-missed')).length;
    if (missed !== 2) problems.push(`${size.name} family two wrong: ${missed} misses explained (want 2)`);
    problems.push(...(await cardClipped(page, `${size.name} family two wrong`)), ...(await sheetFits(page, `${size.name} family two wrong`)), ...(await sheetScrolls(page, `${size.name} family two wrong`)));
  }
  // 朗读 (spec 2026-10-12 §8): every part with the longest built-in text, the sentence lit while the model reads, a missed question
  for (const c of ['langdu-warmup', 'langdu-listen', 'langdu-read', 'langdu-read-blocked', 'langdu-compare', 'langdu-meaning']) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} ${c}`, '.langdu__passage')));
    // the highlight follows the voice: a machine with no Chinese voice (a Linux CI runner) never reads, so there is nothing to light
    const zhVoice = await page.evaluate(() => typeof speechSynthesis !== 'undefined' && speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith('zh')));
    if (c === 'langdu-listen' && zhVoice && !(await page.$('.langdu__sentence.is-reading'))) problems.push(`${size.name} langdu-listen: no sentence lit while the model reads`);
  }
  {
    await page.goto(`file://${dir}/index.html?case=langdu-meaning`);
    await page.waitForTimeout(300);
    await page.click('.langdu__choices .choice >> nth=0'); // p20's right answer is the second choice
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `fit-shots/stage-cases/langdu-meaning-wrong-${size.name}.png` });
    if (!(await page.$('.langdu__choices .choice.is-answer'))) problems.push(`${size.name} langdu-meaning: the miss does not show the right choice`);
    problems.push(...(await cardClipped(page, `${size.name} langdu-meaning wrong`)), ...(await sheetFits(page, `${size.name} langdu-meaning wrong`)));
  }
  await page.goto(`file://${dir}/index.html?case=build`);
  for (let i = 0; i < 6 && (await page.$('.build__bank .choice')); i++) await page.click('.build__bank .choice');
  await page.click('.sheet .btn'); // 好了！: the marked sheet is the tallest state
  await page.waitForTimeout(300);
  await page.screenshot({ path: `fit-shots/stage-cases/build-done-${size.name}.png` });
  problems.push(...(await cardClipped(page, `${size.name} build done`)));
  // the parent's Listen & confirm queue (spec 2026-10-11 §6, §8): looked at on every size, ✓ and ✗ big enough to tap
  await page.goto(`file://${dir}/index.html?case=listen`);
  await page.waitForSelector('.listen__row');
  await page.screenshot({ path: `fit-shots/stage-cases/listen-${size.name}.png`, fullPage: true });
  for (const b of await page.$$('.listen__verdict button')) {
    const box = await b.boundingBox();
    if (!box || Math.min(box.width, box.height) < 43.5) problems.push(`${size.name} listen: ✓/✗ under 44px (${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'hidden'})`);
  }
  // the passage row (final review I8): each misread character, 听原文 and Done big enough to tap; nothing makes the page scroll sideways
  if (!(await page.$('.listen__row--passage'))) problems.push(`${size.name} listen: no passage row`);
  if (!(await page.$('.listen__row--sentence .listen__sentence'))) problems.push(`${size.name} listen: no 说一句 row with its model sentence`);
  else await page.locator('.listen__row--passage').screenshot({ path: `fit-shots/stage-cases/listen-passage-${size.name}.png` });
  for (const q of ['.listen__row--passage .misread-ch', '.listen__row--passage .listen__done', '.listen__row--passage .listen__model']) {
    const els = await page.$$(q);
    if (!els.length) problems.push(`${size.name} listen: no ${q}`);
    for (const b of els) {
      const box = await b.boundingBox();
      if (!box || Math.min(box.width, box.height) < 43.5) { problems.push(`${size.name} listen: ${q} under 44px (${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'hidden'})`); break; }
    }
  }
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (sideways > 1) problems.push(`${size.name} listen: the page scrolls sideways ${sideways}px`);
  await page.close();
}
// every expression × looks: nothing of him pokes out of his box (a seam, an ear, a mark), and a sheet to read by eye
{
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
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
// the worlds' creatures and every world at three sizes for the parent to look over, and every prop moment timed (spec 2026-10-13 §6, §10; 2026-10-04 §6)
{
  const page = await browser.newPage({ viewport: { width: 1320, height: 1300 } });
  mkdirSync('fit-shots/stage-cases', { recursive: true });
  // every creature and thing in light cel (spec 2026-10-13 §6–7)
  await page.goto(`file://${dir}/index.html?case=creatures`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'fit-shots/stage-cases/creatures.png', fullPage: true });
  // every world, by day and by evening, at iPad landscape, iPad portrait and phone, with its props and Truffle (spec §10)
  for (const w of WORLDS) for (const time of ['afternoon', 'evening']) for (const [name, width, height] of [['ipad-landscape', 1024, 768], ['ipad-portrait', 768, 1024], ['iphone', 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(`file://${dir}/index.html?case=river&world=${w.id}&time=${time}`);
    await page.waitForFunction(() => { const i = document.querySelector('.world-scene image') as SVGImageElement | null; return !!i && i.getBBox().width > 0; }, null, { timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `fit-shots/stage-cases/river-${w.id}-${time}-${name}.png` });
    const shown = await page.evaluate(() => { const r = document.querySelector('.world-scene svg')!.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !!document.querySelector('.world-props .tap'); });
    if (!shown) problems.push(`river ${w.id} ${time} ${name}: the world or its props did not draw`);
  }
  await page.setViewportSize({ width: 1000, height: 640 });
  await page.goto(`file://${dir}/index.html?case=bursts`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'fit-shots/stage-cases/bursts.png' });
  await page.setViewportSize({ width: 1260, height: 1500 });
  await page.goto(`file://${dir}/index.html?case=costumes`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'fit-shots/stage-cases/costumes.png', fullPage: true });
  await page.setViewportSize({ width: 1400, height: 300 });
  await page.goto(`file://${dir}/index.html?case=granny`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'fit-shots/stage-cases/granny.png', fullPage: true });
  if ((await page.$$('svg.granny')).length !== 7) problems.push('granny: not every pose drew');
  // talking: exactly one of her two mouths shows at any moment (final review I1: a mouthless dragon)
  for (const t of [100, 380]) {
    const shown = await page.evaluate((at) => {
      const g = document.querySelector('.granny__mouth--talking')!;
      for (const a of g.getAnimations({ subtree: true })) { a.pause(); a.currentTime = at; }
      return [...g.querySelectorAll('path')].filter((p) => parseFloat(getComputedStyle(p).opacity) > 0.5).length;
    }, t);
    if (shown !== 1) problems.push(`granny talking at ${t} ms: ${shown} mouths showing (want exactly 1)`);
  }
  // the 3c reader: setup page, Granny's lines, 听一听 and the rescued words, at three sizes (spec 2026-10-07 3c §7)
  mkdirSync(join(dir, 'story/bg'), { recursive: true });
  for (const f of readdirSync('public/story/bg').filter((x) => x.endsWith('.webp'))) copyFileSync(`public/story/bg/${f}`, join(dir, 'story/bg', f));
  for (const c of ['story-setup', 'story-granny', 'story-listen', 'story-rescued']) {
    for (const [name, width, height] of [['ipad-portrait', 768, 1024], ['ipad-landscape', 1024, 768], ['iphone', 390, 664]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(`file://${dir}/index.html?case=${c}`);
      await page.waitForSelector('.story', { timeout: 10_000 });
      // Truffle stays in the picture through a page turn (parent 2026-10-07: he blinked out on every turn)
      if (c === 'story-setup') {
        await page.waitForTimeout(900);
        await page.click('.story__nav-btn--next');
        for (const t of [30, 120, 400]) {
          await page.waitForTimeout(t === 30 ? 30 : t === 120 ? 90 : 280);
          const seen = await page.evaluate(() => {
            const a = document.querySelector('.story__cast .story__actor');
            return a ? parseFloat(getComputedStyle(a).opacity) : 0;
          });
          if (seen < 0.95) problems.push(`${c} ${name}: Truffle fades out ${t} ms into a page turn (opacity ${seen.toFixed(2)})`);
        }
        await page.click('.story__nav-btn--back');
      }
      // long pages split into more screens on a small one: page on until Granny's lines are up
      if (c === 'story-granny') for (let i = 0; i < 12 && !(await page.$('.story__granny')); i++) { await page.click('.story__nav-btn--next:not(.story__nav-btn--go)', { timeout: 5_000 }); await page.waitForTimeout(150); }
      if (c === 'story-granny' && !(await page.$('.story__granny'))) problems.push(`${c} ${name}: never reached Granny's lines`);
      await page.waitForTimeout(c === 'story-listen' ? 4500 : 900);
      if (c === 'story-listen' && !(await page.waitForSelector('.story__question', { timeout: 12_000 }).catch(() => null))) problems.push(`${c} ${name}: the question never came up`);
      await page.screenshot({ path: `fit-shots/stage-cases/${c}-${name}.png` });
      problems.push(...(await page.evaluate((n) => {
        const out: string[] = [];
        const pic = document.querySelector('.story__pic')?.getBoundingClientRect();
        if (!pic) return [`${n}: no picture`];
        // edge to edge: the whole width on a portrait page, the whole height beside the page on a landscape one
        if (pic.left > 1 || pic.top > 1 || (pic.width < innerWidth - 1 && pic.height < innerHeight - 1)) out.push(`${n}: the picture isn't edge to edge`);
        const words = document.querySelector('.story__words')!.getBoundingClientRect();
        if (words.width < 260) out.push(`${n}: the page is too narrow (${Math.round(words.width)}px)`);
        const w = document.querySelector('.story__words:not(.story__measure)')!;
        if (w.scrollHeight > w.clientHeight + 2) out.push(`${n}: the words scroll ${w.scrollHeight - w.clientHeight}px`);
        for (const x of document.querySelectorAll('.story__cast svg')) {
          const r = x.getBoundingClientRect();
          if (r.left < pic.left - 1 || r.right > pic.right + 1 || r.bottom > pic.bottom + 1) out.push(`${n}: a character pokes out of the picture`);
        }
        const nav = document.querySelector('.story__nav')!.getBoundingClientRect();
        if (nav.bottom > innerHeight + 2) out.push(`${n}: the page buttons are off the screen (${Math.round(nav.bottom)} > ${innerHeight})`);
        const fs = parseFloat(getComputedStyle(document.querySelector('.story__words')!).fontSize);
        if (fs < 18) out.push(`${n}: text ${fs}px is under 18px`);
        return out;
      }, `${c} ${name}`)));
    }
  }
  // the picture-book test page (spec 3b §8) at three sizes: the painting if the parent's is in, else a placeholder
  const bg = existsSync('public/story/bg/hdb-voiddeck.webp');
  if (bg) { mkdirSync(join(dir, 'bg'), { recursive: true }); copyFileSync('public/story/bg/hdb-voiddeck.webp', join(dir, 'bg/hdb-voiddeck.webp')); }
  for (const [name, width, height] of [['ipad-portrait', 768, 1024], ['ipad-landscape', 1024, 768], ['iphone', 390, 664]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(`file://${dir}/index.html?case=story-page${bg ? '' : '&bg=0'}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `fit-shots/stage-cases/story-page-${name}.png` });
    problems.push(...(await page.evaluate((n) => {
      const out: string[] = [];
      const pic = document.querySelector('[data-testid="sp-pic"]')!.getBoundingClientRect();
      if (Math.abs(pic.width / pic.height - 4 / 3) > 0.03) out.push(`story-page ${n}: picture is not 4:3 (${Math.round(pic.width)}×${Math.round(pic.height)})`);
      for (const c of document.querySelectorAll('.sp-cast svg')) {
        const r = c.getBoundingClientRect();
        if (r.left < pic.left - 1 || r.right > pic.right + 1 || r.top < pic.top - 1 || r.bottom > pic.bottom + 1) out.push(`story-page ${n}: a character pokes out of the picture`);
      }
      // the real page is the picture and the words (the states strip below is only this mock's legend)
      const bottom = document.querySelector('[data-testid="sp-words"]')!.getBoundingClientRect().bottom;
      if (bottom > innerHeight + 2) out.push(`story-page ${n}: the words run off the page (${Math.round(bottom)} > ${innerHeight})`);
      const fs = parseFloat(getComputedStyle(document.querySelector('[data-testid="sp-words"]')!).fontSize);
      if (fs < 18) out.push(`story-page ${n}: text ${fs}px is under 18px`);
      return out;
    }, name)));
  }
  await page.close();
  const m = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  for (const world of WORLDS.map((w) => w.id)) {
    await m.goto(`file://${dir}/index.html?case=moments&world=${world}`);
    await m.waitForTimeout(400);
    const labels = await m.$$eval('.world-props .tap', (ts) => ts.map((t) => t.getAttribute('aria-label')!));
    if (!labels.length) problems.push(`moments ${world}: no props to tap`);
    for (const label of labels) {
      await m.evaluate(() => { (window as unknown as { rafWork: number[] }).rafWork.splice(0); });
      await m.$eval(`.world-props .tap[aria-label="${label}"]`, (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await m.waitForTimeout(1500);
      const worst = await m.evaluate<number>(`(() => { const w = window.rafWork.splice(0).sort((a, b) => a - b); return w[Math.floor(w.length * 0.95)] ?? 0; })()`);
      if (worst > 8) problems.push(`moments ${world} ${label}: too much work per frame: p95 ${worst.toFixed(1)}ms (budget 8)`);
      await m.waitForTimeout(2400); // let it finish (the magpie bridge is the longest, 3.6 s)
    }
    await m.screenshot({ path: `fit-shots/stage-cases/moments-${world}.png` });
  }
  await m.close();
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
  // frame intervals measure the machine as much as the app: a 2-core CI runner gets more slack; the per-frame work budget below stays 8 ms
  const SLOW_FRAME = process.env.CI ? 40 : 20;
  const idle = await p95();
  if (idle > SLOW_FRAME) problems.push(`alive: slow frames while idle: p95 ${idle.toFixed(1)}ms over 120 frames`);
  // spec §6: ≤ 8 ms of script + layout per frame on the Mac (headroom for an older iPad); the interval check above only
  // notices work past a whole frame
  const work = () => page.evaluate<number>(`(() => { const w = window.rafWork.splice(0).sort((a, b) => a - b); return w[Math.floor(w.length * 0.95)] ?? 0; })()`);
  const idleWork = await work();
  if (idleWork > 8) problems.push(`alive: too much work per frame while idle: p95 ${idleWork.toFixed(1)}ms (budget 8)`);
  await page.evaluate(() => (window as unknown as { react: (k: string) => void }).react('right'));
  const reacting = await p95();
  if (reacting > SLOW_FRAME) problems.push(`alive: slow frames while reacting: p95 ${reacting.toFixed(1)}ms over 120 frames`);
  const reactWork = await work();
  if (reactWork > 8) problems.push(`alive: too much work per frame while reacting: p95 ${reactWork.toFixed(1)}ms (budget 8)`);
  // his paws (phase E): a wave and covering his eyes, timed the same way
  for (const kind of ['hello', 'peek']) {
    await page.waitForTimeout(1800);
    await work();
    await page.evaluate((k) => (window as unknown as { react: (k: string) => void }).react(k), kind);
    await p95();
    const w = await work();
    if (w > 8) problems.push(`alive: too much work per frame while he ${kind === 'hello' ? 'waves' : 'covers his eyes'}: p95 ${w.toFixed(1)}ms (budget 8)`);
  }
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
