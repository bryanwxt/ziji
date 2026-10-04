/* Fit sweep (spec §18): every child screen and lesson step must fit one screen in WebKit, the engine of the iPad and iPhone.
   Run: npm run fit  (builds, serves dist on :4174, walks every flow at every size, writes fit-shots/). Exit 1 on any problem. */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { webkit, type Browser, type Page } from 'playwright-core';
import { WORLDS } from '../src/fun/worlds';
import { buildFitProfile, type FitProfileOptions } from './fit-profile';
import type { ActivityKind } from '../src/types';

const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = 'fit-shots';
const AFTERNOON = new Date(2026, 9, 6, 16, 0);
const EVENING = new Date(2026, 9, 6, 21, 0); // timeOfDay() calls this 'evening': the darkest wash
const SIZES = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-15', width: 390, height: 844 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
  { name: 'ipad-landscape', width: 1024, height: 768 },
  { name: 'ipad-air-landscape', width: 1180, height: 820 },
];
type Size = (typeof SIZES)[number];
interface Result { size: string; flow: string; step: number; sig: string; problems: string[] }
const results: Result[] = [];
/** One lesson-stage screen's boxes and type sizes (spec 2026-10-04 §3), compared across screens once every size has run. */
interface StageEntry { size: string; flow: string; step: number; group: string; card: number[] | null; truffle: number[] | null; sheet: number[] | null; isQuestion: boolean }
const stageEntries: StageEntry[] = [];
const framed = new Set<string>(); // size|flow pairs whose frame time was measured
const ONLY = process.env.FIT_ONLY ? new RegExp(process.env.FIT_ONLY) : null; // e.g. FIT_ONLY=home npm run fit

/* ---------- in-page probes (plain JS: they run inside WebKit) ---------- */
const MAIN = '.choice, .sheet .btn, .path__node, .mic-btn, .tabbar__item, .fishtile, .bubble-opt';
const SCROLLERS = '.scroll-panel, .filters, .kantu__words, .passage, .langdu__passage';

function probe(args: { main: string; scrollers: string }): string[] {
  const out: string[] = [];
  const de = document.documentElement;
  if (de.scrollHeight > innerHeight + 1) out.push(`page scrolls ${de.scrollHeight - innerHeight}px`);
  if (de.scrollWidth > innerWidth + 1) out.push(`page scrolls sideways ${de.scrollWidth - innerWidth}px`);
  // a .screen clips its own overflow (height: 100dvh; overflow: hidden), so the document never scrolls: look for content past the screen's edges
  const cut = new Set<string>();
  for (const sc of document.querySelectorAll('.screen')) if (sc.scrollTop > 0 || sc.scrollLeft > 0) out.push(`screen scrolled by ${sc.scrollTop}px (a clipped screen moved: its top is hidden)`);
  if ((document.scrollingElement?.scrollTop ?? 0) > 0) out.push(`page scrolled by ${document.scrollingElement!.scrollTop}px`);
  const past = (el: Element) => {
    if (el.closest('[aria-hidden="true"], .sr-only, .world-taps, [hidden], .scene') || el.parentElement?.closest(args.scrollers)) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return;
    if (r.bottom > innerHeight + 1 || r.top < -1 || r.right > innerWidth + 1 || r.left < -1) { cut.add(`content cut off: ${(el.textContent ?? '').trim().slice(0, 16) || `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}">`} at ${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)}`); }
  };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if ((n.textContent ?? '').trim() && n.parentElement) past(n.parentElement);
  for (const el of document.querySelectorAll('svg.truffle, .card, .goal, .tianzige, .passage, img')) past(el);
  out.push(...cut);
  const name = (el: Element) => (el.getAttribute('aria-label') || el.textContent || el.className.toString()).trim().slice(0, 24);
  const mainMin = innerWidth < 600 ? 52 : 64;
  for (const el of document.querySelectorAll('button, [role="button"], [role="tab"], a[href], input, select, textarea')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || el.closest('[aria-hidden="true"], .sr-only, .world-taps, .is-eaten') || getComputedStyle(el).visibility === 'hidden') continue;
    if (!el.parentElement?.closest(args.scrollers) && (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)) out.push(`off screen: ${name(el)}`);
    if (Math.min(r.width, r.height) < 43.5) out.push(`under 44px: ${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    if (el.matches(args.main) && Math.min(r.width, r.height) < mainMin - 0.5) out.push(`main action under ${mainMin}px: ${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const small = new Set<string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!/\p{Script=Han}/u.test(n.textContent ?? '')) continue;
    const el = n.parentElement!;
    if (el.closest('[aria-hidden="true"], .sr-only, .world-taps, [hidden]')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || getComputedStyle(el).visibility === 'hidden') continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 15.5) small.add(`Chinese text under 16px: ${(el.closest('.label')?.textContent ?? n.textContent ?? '').trim().slice(0, 12)} ${fs}px`);
  }
  out.push(...small);
  // solid things must not sit on each other (the eye catches this; scroll and size checks don't)
  const solid = [...document.querySelectorAll('button, h1, h2, .card, .goal, .pet__bubble, svg.truffle, .path__name, .week, .stat, .home__who, .passage, .tianzige, .intro__card, .hanzi--xl, .langdu__phrase, .kantu__pic')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[aria-hidden="true"]:not(.truffle):not(.pet), .arrival, .zika-big, .closeup, .rotate-hint, .world-taps, .particles, .is-eaten') && getComputedStyle(el).visibility !== 'hidden'; });
  const seenPair = new Set<string>();
  // what's actually visible: clipped to the scroll panel an element sits in (cards scrolled out of a panel are hidden, not overlapping)
  const shown = (el: Element) => {
    const r = el.getBoundingClientRect();
    const box = el.parentElement?.closest(args.scrollers)?.getBoundingClientRect();
    const left = Math.max(r.left, box?.left ?? -Infinity), right = Math.min(r.right, box?.right ?? Infinity);
    const top = Math.max(r.top, box?.top ?? -Infinity), bottom = Math.min(r.bottom, box?.bottom ?? Infinity);
    return right - left > 0 && bottom - top > 0 ? { left, right, top, bottom } : null;
  };
  const boxes = solid.map((el) => ({ el, r: shown(el) })).filter((x): x is { el: Element; r: NonNullable<ReturnType<typeof shown>> } => x.r !== null); // measure each once
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
    const { el: A, r: ra } = boxes[a]!, { el: B, r: rb } = boxes[b]!;
    if (ra.right <= rb.left || rb.right <= ra.left || ra.bottom <= rb.top || rb.bottom <= ra.top) continue;
    if (A.contains(B) || B.contains(A)) continue;
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 6 && h > 6) { const key = `${name(A)} × ${name(B)}`; if (!seenPair.has(key)) { seenPair.add(key); out.push(`overlap: ${key}`); } }
  }
  for (const t of document.querySelectorAll('.world-taps .tap > *')) {
    // the centre and four points around it: a target is lost when its centre is covered, or half of it (2 of the 4 points)
    const r = t.getBoundingClientRect();
    const covered = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].map(([fx, fy]) => {
      const x = r.left + r.width * fx!, y = r.top + r.height * fy!;
      const top = document.elementFromPoint(x, y);
      return top?.closest('.world-taps .tap') ? null : `${Math.round(x)},${Math.round(y)} covered by ${top ? (typeof top.className === 'string' ? top.className : top.tagName) || top.tagName : 'nothing (off screen)'}`;
    });
    const hits = covered.filter((c): c is string => !!c);
    if (covered[0] || hits.length >= 2) out.push(`world tap at ${hits.join('; ')}`);
  }
  return out;
}

function signature(): string {
  const s = document.querySelector('.screen');
  const marks = ['.home', '.flash', '.usage-opts', '.intro', '.write', '.components', '.pond', '.bubbles', '.langdu', '.kantu', '.kantu__ask', '.kantu__model', '.celebrate', '.chest', '.room', '.zika-grid', '.setup', '.pinpad', '.choices', '.arrival', '.zika-big', '.rotate-hint'];
  const on = marks.filter((m) => s?.matches(m) || s?.querySelector(m) || document.querySelector(`${m}:not(.rotate-hint)`));
  const tone = document.querySelector('.sheet')?.className ?? '';
  const words = (s?.querySelector('.kantu__q, .langdu__step, .pet__bubble, h1, h2')?.textContent ?? '').slice(0, 14);
  return `${on.join(',')}|${tone}|${words}`;
}

/** One forward tap through a lesson. Returns false when nothing could be tapped. */
function advance(): boolean {
  const vis = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const enabled = (el: Element) => !(el as HTMLButtonElement).disabled;
  const first = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((e) => vis(e) && enabled(e));
  const byText = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.screen button')].find((b) => vis(b) && enabled(b) && b.textContent?.includes(t));
  const tap = (el: HTMLElement | undefined) => (el ? (el.click(), true) : false);
  if (tap(byText('停止'))) return true;
  if (!document.querySelector('.kantu__model') && tap(byText('听松露说'))) return true; // show the model once: the tallest state
  if (tap(first('.sheet .btn'))) return true;
  if (tap(byText('开始录音'))) return true;
  for (const t of ['我记住了', '下一句', '开始朗读', '听听你自己', '开始！', '走吧', '继续', '回家']) if (tap(byText(t))) return true;
  if (tap(first('.choice'))) return true;
  if (tap(first('.fishtile, .bubble-opt, .whichpart__char'))) return true;
  if (tap(first('.chest'))) return true;
  return false;
}

/* ---------- harness ---------- */
async function seed(page: Page, json: string) {
  await page.goto(BASE);
  await page.waitForSelector('.screen:not(.loading)'); // booted: the app has created its database
  await page.evaluate(async (text) => {
    const file = JSON.parse(text);
    const decode = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(decode) : v && typeof v === 'object' ? (typeof (v as { $date?: unknown }).$date === 'string' ? new Date((v as { $date: string }).$date) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x)]))) : v;
    const db: IDBDatabase = await new Promise((ok, no) => { const r = indexedDB.open('hanzi-buddy'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const tx = db.transaction([...Object.keys(file.stores), 'settings', 'kid'], 'readwrite');
    for (const [name, rows] of Object.entries(file.stores) as [string, unknown[]][]) { const st = tx.objectStore(name); st.clear(); for (const row of rows) st.put(decode(row)); }
    if (file.settings) tx.objectStore('settings').put(decode(file.settings), 'main'); else tx.objectStore('settings').delete('main');
    if (file.kid) tx.objectStore('kid').put(decode(file.kid), 'main'); else tx.objectStore('kid').delete('main');
    await new Promise((ok, no) => { tx.oncomplete = ok; tx.onerror = () => no(tx.error); });
    db.close();
  }, json);
  await page.reload();
  await page.waitForSelector('.screen:not(.loading)');
  await page.waitForTimeout(600);
}

async function open(browser: Browser, size: { name: string; width: number; height: number }, now: Date, profile: Omit<FitProfileOptions, 'now'>, errors: string[] = []): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: true, serviceWorkers: 'block' });
  await ctx.clock.setFixedTime(now);
  await ctx.addInitScript({ content: 'window.__name = (f) => f;' }); // tsx (esbuild keepNames) wraps functions in __name(); in-page code needs it to exist
  await ctx.addInitScript(() => {
    // A pretend microphone, so the recorded states (听松露说, 重录) are walked too.
    class FakeRecorder {
      static isTypeSupported() { return true; }
      mimeType = 'audio/mp4'; state = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null; onstop: (() => void) | null = null;
      constructor(_s: MediaStream) {}
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; setTimeout(() => { this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/mp4' }) }); this.onstop?.(); }, 10); }
      addEventListener(t: string, f: () => void) { (this as Record<string, unknown>)[`on${t}`] = f; }
      removeEventListener() {}
    }
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorder;
    const stream = () => { const ac = new AudioContext(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream() } });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  await seed(page, await buildFitProfile({ now, ...profile }));
  return page;
}

async function check(page: Page, size: Size, flow: string, step: number) {
  console.error(`[${new Date().toTimeString().slice(0, 8)}] ${size.name} ${flow}-${step}`); // progress, so a hang shows where
  await page.waitForTimeout(500);
  const sig = await page.evaluate(signature);
  const problems = await page.evaluate(probe, { main: MAIN, scrollers: SCROLLERS });
  problems.push(...(await stageChecks(page, size, flow, step)));
  mkdirSync(`${OUT}/${size.name}`, { recursive: true });
  await page.screenshot({ path: `${OUT}/${size.name}/${flow}-${String(step).padStart(2, '0')}.png` });
  results.push({ size: size.name, flow, step, sig, problems });
}

/** The stage on this screen: record its boxes, check its type sizes, and time its frames once per flow (spec 2026-10-04 §3, §6). */
async function stageChecks(page: Page, size: Size, flow: string, step: number): Promise<string[]> {
  const st = await page.evaluate(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return null;
    const box = (sel: string) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
    const fontPx = (sel: string) => { const el = document.querySelector(sel); return el ? parseFloat(getComputedStyle(el).fontSize) : null; };
    return {
      group: `${stage.getAttribute('data-stage')}|${document.querySelector('.lessonbar') ? 'lesson' : 'own'}`,
      card: box('.stage__card'), truffle: box('.stage__truffle .truffle'), sheet: box('.stage__sheet'),
      q: fontPx('[data-q]'), tile: fontPx('.stage__card .choices--hanzi .choice'), sentence: fontPx('.stage__card .meaning-cue--sentence, .stage__card .usage-opt'),
      isQuestion: !document.querySelector('.sheet--good, .sheet--oops'),
    };
  });
  if (!st) return [];
  // the card clips its overflow, so the viewport probe can't see what it cuts off: anything poking out of it is clipped (review I4)
  const clipped = await page.evaluate(() => {
    const card = document.querySelector('.stage__card');
    if (!card) return [] as string[];
    const c = card.getBoundingClientRect();
    const scrolls = (el: Element) => { for (let p = el.parentElement; p && p !== card; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if (o === 'auto' || o === 'scroll') return true; } return false; };
    const out: string[] = [];
    for (const el of card.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || el.closest('.sr-only, [aria-hidden="true"]:not(.truffle), .is-eaten') || getComputedStyle(el).visibility === 'hidden' || scrolls(el)) continue;
      if (el instanceof SVGElement && el.ownerSVGElement) continue; // inside a drawing (hanzi-writer's strokes): the svg's own box is what counts
      if (r.top < c.top - 2 || r.bottom > c.bottom + 2 || r.left < c.left - 2 || r.right > c.right + 2) {
        out.push(`clipped by the card: ${(el.textContent ?? '').trim().slice(0, 14) || `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}">`} at ${Math.round(r.top)}–${Math.round(r.bottom)} (card ${Math.round(c.top)}–${Math.round(c.bottom)})`);
        if (out.length >= 3) break;
      }
    }
    return out;
  });
  stageEntries.push({ size: size.name, flow, step, group: st.group, card: st.card, truffle: st.truffle, sheet: st.sheet, isQuestion: st.isQuestion });
  const out: string[] = [...clipped];
  const tablet = size.width >= 600;
  if (st.q !== null && st.q < (tablet ? 64 : 48)) out.push(`too small: question ${st.q}px (needs ≥ ${tablet ? 64 : 48})`);
  if (tablet && st.tile !== null && (st.tile < 40 || st.tile > 48)) out.push(`tile size: answer tiles ${st.tile}px (needs 40–48)`);
  if (tablet && st.sentence !== null && st.sentence < 28) out.push(`too small: sentence ${st.sentence}px (needs ≥ 28)`);
  const key = `${size.name}|${flow}`;
  if (!framed.has(key)) {
    framed.add(key);
    // WebKit can't throttle the CPU: a p95 frame interval ≤ 20ms on this machine stands in for spec §6's budget (the parent checks the iPad)
    const p95 = await page.evaluate(() => new Promise<number>((done) => {
      const t: number[] = []; let last = performance.now(); let n = 0;
      const tick = (now: number) => { t.push(now - last); last = now; if (++n < 90) requestAnimationFrame(tick); else { t.sort((a, b) => a - b); done(t[Math.floor(t.length * 0.95)]!); } };
      requestAnimationFrame(tick);
    }));
    if (p95 > 20) out.push(`slow frames: p95 ${p95.toFixed(1)}ms over 90 frames`);
  }
  return out;
}

/** One box per activity, and Truffle and the sheet in one place across a lesson's activities (spec 2026-10-04 §3). */
function stageInvariants() {
  const same = (a: number[] | null, b: number[] | null, idx = [0, 1, 2, 3]) => !!a && !!b && idx.every((i) => Math.abs(a[i]! - b[i]!) <= 2);
  const sizes = [...new Set(stageEntries.map((e) => e.size))];
  for (const size of sizes) {
    const qs = stageEntries.filter((e) => e.size === size && e.isQuestion);
    const flag = (e: StageEntry, msg: string) => results.push({ size, flow: e.flow, step: e.step, sig: 'stage', problems: [`stage moved: ${msg}`] });
    for (const group of new Set(qs.map((e) => e.group))) {
      const g = qs.filter((e) => e.group === group);
      const odd = g.find((e) => !same(e.card, g[0]!.card));
      if (odd) flag(odd, `${group} card ${g[0]!.card} vs ${odd.card} (${g[0]!.flow}-${g[0]!.step})`);
    }
    const lesson = qs.filter((e) => e.group.endsWith('|lesson'));
    const t = lesson.find((e) => !same(e.truffle, lesson[0]!.truffle));
    if (t) flag(t, `Truffle ${lesson[0]!.truffle} vs ${t.truffle} (${lesson[0]!.flow}-${lesson[0]!.step})`);
    const sh = lesson.find((e) => !same(e.sheet, lesson[0]!.sheet, [0, 2]));
    if (sh) flag(sh, `sheet ${lesson[0]!.sheet} vs ${sh.sheet} (${lesson[0]!.flow}-${lesson[0]!.step})`);
  }
}

async function walkLesson(page: Page, size: Size, flow: string, opts: { firstOnly?: boolean } = {}) {
  const seen = new Set<string>(); // check each distinct screen once; keep walking through repeats (20 phrases, 25 words) to reach the end
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(450);
    if (!(await page.$('.lessonbar')) && !(await page.$('.celebrate'))) return; // back home
    const sig = await page.evaluate(signature);
    if (!seen.has(sig)) { seen.add(sig); await check(page, size, flow, i); }
    if (opts.firstOnly) return;
    const hold = await page.$('.hold:not(.is-done)'); // the chest opens on press-and-hold, which a click can't do
    const box = hold && (await hold.isVisible()) ? await hold.boundingBox() : null;
    if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up(); continue; }
    if (!(await page.evaluate(advance))) return;
  }
}

async function sweep(browser: Browser, size: Size) {
  const run = async (flow: string, now: Date, profile: Omit<FitProfileOptions, 'now'>, then: (p: Page) => Promise<void>) => {
    if (ONLY && !ONLY.test(flow)) return;
    let page: Page | null = null;
    const errors: string[] = [];
    try {
      const limit = new Promise<never>((_, no) => setTimeout(() => no(new Error('flow took over 3 minutes (stuck?)')), 180_000));
      page = await Promise.race([open(browser, size, now, profile, errors), limit]);
      const p = page;
      await Promise.race([then(p), limit]); // one stuck screen can't stall the whole sweep
    } catch (e) {
      results.push({ size: size.name, flow, step: -1, sig: '', problems: [`flow crashed: ${String(e).slice(0, 900)}`, ...errors.map((m) => `page error: ${m}`)] });
    }
    await page?.context().close();
  };
  const tabTo = (p: Page, label: string) => p.click(`.tabbar__item:has-text("${label}")`);
  const startLesson = async (p: Page) => { await p.click('.path__node--current'); };

  // Home: not started, and done-for-today with every optional card; world taps in every world
  await run('home', AFTERNOON, {}, (p) => check(p, size, 'home', 0));
  await run('home-done', AFTERNOON, { doneToday: true }, (p) => check(p, size, 'home-done', 0));
  await run('home-yard-evening', EVENING, { world: 'yard' }, (p) => check(p, size, 'home-yard-evening', 0)); // the paper yard's evening (review I3)
  for (const w of WORLDS) {
    await run(`home-${w.id}`, AFTERNOON, { world: w.id }, (p) => check(p, size, `home-${w.id}`, 0));
    await run(`home-done-${w.id}`, AFTERNOON, { world: w.id, doneToday: true }, (p) => check(p, size, `home-done-${w.id}`, 0)); // the done card and 再玩一会儿 sit differently
  }
  // First run
  await run('setup-pin', AFTERNOON, { pin: false, kid: false, placementDone: false }, (p) => check(p, size, 'setup-pin', 0));
  await run('pet-setup', AFTERNOON, { kid: false, placementDone: false }, (p) => check(p, size, 'pet-setup', 0));
  await run('placement', AFTERNOON, { placementDone: false }, async (p) => {
    // each style is its own screen (spec §19 part 6): answer 不知道 and look again, ten times
    // and every question keeps the same box and grid: the screen must not jump between styles (the parent noticed)
    const boxes: string[] = [];
    for (let i = 0; i < 11; i++) {
      await p.waitForSelector('.placement[data-ready="true"]');
      await check(p, size, 'placement', i);
      boxes.push(await p.evaluate(() => ['.placement__prompt', '.placement__choices', '.placement .btn--big']
        .map((sel) => { const r = document.querySelector(sel)!.getBoundingClientRect(); return [r.top, r.height, r.width].map(Math.round).join(','); }).join(' | ')));
      await p.click('.placement .btn--big');
      await p.waitForTimeout(150);
    }
    const moved = boxes.findIndex((b) => b !== boxes[0]);
    if (moved > 0) results.push({ size: size.name, flow: 'placement', step: moved, sig: 'steady', problems: [`question size changed between questions: ${boxes[0]} → ${boxes[moved]}`] });
  });
  // Tabs
  await run('collection', AFTERNOON, {}, async (p) => { await tabTo(p, '字卡'); await check(p, size, 'collection', 0); await p.click('.zika:not(.card--back)'); await check(p, size, 'collection', 1); });
  await run('room', AFTERNOON, {}, async (p) => {
    await tabTo(p, '松露');
    await p.waitForSelector('.room__tabs');
    let i = 0;
    for (const tab of await p.$$('.room__tabs [role="tab"], .room__tabs .chip')) { await tab.click(); await check(p, size, 'room', i++); }
  });
  await run('pin-gate', AFTERNOON, {}, async (p) => { await tabTo(p, '家长'); await check(p, size, 'pin-gate', 0); });
  // Lessons, one activity at a time
  const only = (k: ActivityKind): Record<ActivityKind, boolean> => ({ flashcards: k === 'flashcards', choose: k === 'choose', writing: k === 'writing', components: k === 'components', speaking: k === 'speaking' });
  await run('flashcards', AFTERNOON, { activities: only('flashcards') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'flashcards'); });
  await run('flashcards-evening', EVENING, { activities: only('flashcards') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'flashcards-evening'); });
  await run('writing', AFTERNOON, { activities: only('writing') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'writing', { firstOnly: true }); });
  await run('writing-sentence', AFTERNOON, { activities: only('writing'), writeSentence: true }, async (p) => { await startLesson(p); await walkLesson(p, size, 'writing-sentence'); });
  await run('lesson', AFTERNOON, {}, async (p) => { await startLesson(p); await walkLesson(p, size, 'lesson'); }); // every step in order, then 用一用 and the chest
  await run('choose', AFTERNOON, { activities: only('choose') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'choose'); });
  await run('wrapup', AFTERNOON, { activities: { ...only('flashcards'), choose: true } }, async (p) => { await startLesson(p); await walkLesson(p, size, 'wrapup'); }); // its walk misses some, so 用一用 has words
  await run('components', AFTERNOON, { activities: only('components') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'components'); });
  await run('langdu', AFTERNOON, { activities: only('speaking'), speakingLast: 'story' }, async (p) => { await startLesson(p); await walkLesson(p, size, 'langdu'); });
  await run('langdu-extra', AFTERNOON, { doneToday: true }, async (p) => { await p.click('.langdu-btn'); await walkLesson(p, size, 'langdu-extra'); });
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    let browser: Browser;
    try { browser = await webkit.launch(); } catch (e) { console.error(`WebKit is missing: run  npx playwright-core install webkit  (ask first: it downloads ~100 MB)\n${e}`); process.exitCode = 2; return; }
    await Promise.all(SIZES.map((size) => sweep(browser, size))); // sizes in parallel, each in its own contexts
    stageInvariants();
    // A phone turned sideways: the overlay covers the screen
    const side = { name: 'iphone-sideways', width: 667, height: 375 };
    const page = await open(browser, side, AFTERNOON, {});
    const covered = await page.evaluate(() => { const h = document.querySelector('.rotate-hint'); if (!h) return false; const r = h.getBoundingClientRect(); return getComputedStyle(h).display !== 'none' && r.width >= innerWidth && r.height >= innerHeight; });
    mkdirSync(`${OUT}/${side.name}`, { recursive: true });
    await page.screenshot({ path: `${OUT}/${side.name}/home-00.png` });
    results.push({ size: side.name, flow: 'rotate', step: 0, sig: '', problems: covered ? [] : ['the turn-it-upright overlay does not cover the screen'] });
    await browser.close();
  } finally {
    server.kill();
  }
  const bad = results.filter((r) => r.problems.length);
  const lines = results.map((r) => `${r.problems.length ? 'FAIL' : 'ok  '} ${r.size.padEnd(18)} ${r.flow}-${String(r.step).padStart(2, '0')}  ${r.sig}${r.problems.length ? `\n       - ${r.problems.join('\n       - ')}` : ''}`);
  writeFileSync(`${OUT}/report.txt`, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log(`\n${results.length} screens checked, ${bad.length} with problems. Screenshots: ${OUT}/`);
  process.exit(bad.length ? 1 : 0);
}

void main();
