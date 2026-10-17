/* Fit sweep (spec §18): every child screen and lesson step must fit one screen in WebKit, the engine of the iPad and iPhone.
   Run: npm run fit  (builds, serves dist on :4174, walks every flow at every size, writes fit-shots/). Exit 1 on any problem. */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import type { Browser, Page } from 'playwright-core';
import { WORLDS } from '../src/fun/worlds';
import { buildFitProfile, type FitProfileOptions } from './fit-profile';
import { textChecks } from './text-checks';
import { serveStrokeData } from './stroke-route';
import type { ActivityKind } from '../src/types';
import { launchWebKit } from './launch-webkit';

const PORT = Number(process.env.FIT_PORT ?? 4174); // FIT_PORT: another worktree's sweep may hold 4174
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = 'fit-shots';
/** An invented weekly sheet as Live Text gives it (never the parent's): a grid, 生字 he has, then 搭配 under two themes, the second read a cell a line. */
const WEEK_SHEET = ['P2-L33-复习', '考考自己', '一、词语', '公园 草地 蝴蝶 跑步', '整齐 热闹 干净 安静', '帮助 告诉 闪闪亮', '二、生字', '手 书 开 出', '三、词语搭配', '早餐', '吃 面包', '喝 牛奶', '煎 鸡蛋', '游乐场', '放', '风筝', '踢', '足球', '荡', '秋千', '©2026 Example Publisher Pte Ltd.'].join('\n');
const AFTERNOON = new Date(2026, 9, 6, 16, 0);
const EVENING = new Date(2026, 9, 6, 21, 0); // timeOfDay() calls this 'evening': the darkest wash
const SIZES = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-15', width: 390, height: 844 },
  { name: 'iphone-safari', width: 390, height: 664 }, // in Safari, not from the home screen: the browser's bars take ~180px (parent, 2026-10-05)
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
const VIEWPORT = process.env.FIT_VIEWPORT ? new RegExp(process.env.FIT_VIEWPORT) : null; // size names, e.g. FIT_VIEWPORT='^ipad-' (CI shards the sweep by size; iphone-sideways is the rotate check)

/* ---------- in-page probes (plain JS: they run inside WebKit) ---------- */
const MAIN = '.choice, .setup__grade, .sheet .btn, .path__node, .mic-btn, .tabbar__item, .fishtile, .bubble-opt';
const SCROLLERS = '.scroll-panel, .filters, .kantu__words, .passage, .langdu__passage, .placement-result__body, .placement-confirm__body';

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
    if (el.closest('[aria-hidden="true"], .sr-only, .world-props, [hidden]') || el.parentElement?.closest(args.scrollers)) return;
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
    if (r.width === 0 || r.height === 0 || el.closest('[aria-hidden="true"], .sr-only, .world-props, .is-eaten') || getComputedStyle(el).visibility === 'hidden') continue;
    if (!el.parentElement?.closest(args.scrollers) && (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)) out.push(`off screen: ${name(el)}`);
    // its laid-out size: a transform mid-animation (a card scaling in) shrinks the box on screen, not the button
    const h = el as HTMLElement;
    const w = h.offsetWidth || r.width, ht = h.offsetHeight || r.height;
    if (Math.min(w, ht) < 43.5) out.push(`under 44px: ${name(el)} ${Math.round(w)}×${Math.round(ht)}`);
    if (el.matches(args.main) && Math.min(r.width, r.height) < mainMin - 0.5) out.push(`main action under ${mainMin}px: ${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const small = new Set<string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!/\p{Script=Han}/u.test(n.textContent ?? '')) continue;
    const el = n.parentElement!;
    if (el.closest('[aria-hidden="true"], .sr-only, .world-props, [hidden]')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || getComputedStyle(el).visibility === 'hidden') continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 15.5) small.add(`Chinese text under 16px: ${(el.closest('.label')?.textContent ?? n.textContent ?? '').trim().slice(0, 12)} ${fs}px`);
  }
  out.push(...small);
  // solid things must not sit on each other (the eye catches this; scroll and size checks don't)
  const solid = [...document.querySelectorAll('button, h1, h2, .card, .goal, .pet__bubble, svg.truffle, .path__name, .week, .stat, .home__who, .passage, .tianzige, .intro__card, .hanzi--xl, .langdu__phrase, .kantu__pic')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[aria-hidden="true"]:not(.truffle):not(.pet), .arrival, .zika-big, .closeup, .rotate-hint, .world-props, .particles, .is-eaten') && getComputedStyle(el).visibility !== 'hidden'; });
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
  // world props: one the painting's crop leaves off this screen is fine (spec 2026-10-13 §5), one on it must not be covered, and
  // every world keeps at least one to tap
  const taps = [...document.querySelectorAll('.world-props .tap')];
  const onScreen = (x: number, y: number) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight;
  let usable = 0;
  for (const t of taps) {
    // the centre and four points around it: a target is lost when its centre is covered, or half of it (2 of the 4 points)
    const r = t.getBoundingClientRect();
    if (!onScreen(r.left + r.width / 2, r.top + r.height / 2)) continue;
    const covered = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].map(([fx, fy]) => {
      const x = r.left + r.width * fx!, y = r.top + r.height * fy!;
      if (!onScreen(x, y)) return null;
      const top = document.elementFromPoint(x, y);
      return top?.closest('.world-props .tap') ? null : `${Math.round(x)},${Math.round(y)} covered by ${top ? (typeof top.className === 'string' ? top.className : top.tagName) || top.tagName : 'nothing'}`;
    });
    const hits = covered.filter((c): c is string => !!c);
    if (covered[0] || hits.length >= 2) out.push(`world tap ${t.getAttribute('aria-label')} at ${hits.join('; ')}`);
    else usable++;
  }
  if (taps.length && !usable) out.push('no world prop to tap on this screen');
  return out;
}

function signature(): string {
  const s = document.querySelector('.screen');
  const marks = ['.home', '.usage-opts', '.intro', '.pond', '.bubbles', '.langdu', '.kantu', '.kantu__ask', '.kantu__model', '.celebrate', '.chest', '.room', '.zika-grid', '.setup', '.pinpad', '.choices', '.choices--six', '.say', '.say__after', '.say-sentence', '.say-sentence__model', '.pairs--eight', '.choice--none', '.arrival', '.zika-big', '.rotate-hint', '.river', '.goals'];
  const on = marks.filter((m) => s?.matches(m) || s?.querySelector(m) || document.querySelector(`${m}:not(.rotate-hint)`));
  const tone = document.querySelector('.sheet')?.className ?? '';
  const words = (s?.querySelector('.kantu__q, .langdu__step, .pet__bubble, h1, h2')?.textContent ?? '').slice(0, 14);
  const stage = document.querySelector('[data-stage]')?.getAttribute('data-stage') ?? ''; // the lesson activity (phase A's stage), not stale class markers
  return `${stage}|${on.join(',')}|${tone}|${words}`;
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
  if (document.querySelector('.langdu__listen[data-heard="false"]')) return true; // 朗读: the model is reading; 开始朗读 comes after
  if (tap(first('.sheet .btn'))) return true;
  if (tap(byText('开始录音'))) return true;
  for (const t of ['我记住了', '下一句', '开始朗读', '听听你自己', '开始！', '走吧', '继续', '回家']) if (tap(byText(t))) return true;
  if (document.querySelector('.understand__choice:disabled:not(.is-answer):not(.is-wrong):not(.is-dim)')) return true; // 听一听 opens its choices after the line has been said
  if (tap(first('.choice:not(.is-picked)'))) return true; // 找一家人 takes two picks: tapping a picked word lets it go
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
  await serveStrokeData(ctx);
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
    // one oscillator for the page, a fresh track per recording: an AudioContext per getUserMedia, never closed, piled up in
    // the recording flows (langdu, practice, say), the ones whose page WebKit on Linux killed now and then
    let tone: MediaStream | null = null;
    const stream = () => {
      if (!tone) { const ac = new AudioContext(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination(); o.connect(d); o.start(); tone = d.stream; }
      return new MediaStream(tone.getAudioTracks().map((t) => t.clone()));
    };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream() } });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('crash', () => errors.push('the page crashed (WebKit killed its web process)'));
  await seed(page, await buildFitProfile({ now, ...profile }));
  return page;
}

async function check(page: Page, size: Size, flow: string, step: number) {
  console.error(`[${new Date().toTimeString().slice(0, 8)}] ${size.name} ${flow}-${step}`); // progress, so a hang shows where
  await page.waitForTimeout(500);
  // measure once entrances have settled: a card still scaling in reads a 44px button as 40–43px (a false "under 44px")
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity)).map((a) => a.finished.catch(() => {}))),
    new Promise((r) => setTimeout(r, 1500)),
  ]));
  const sig = await page.evaluate(signature);
  const problems = await page.evaluate(probe, { main: MAIN, scrollers: SCROLLERS });
  problems.push(...(await page.evaluate(textChecks))); // pinyin over its character, no line led by 。, no speak button on text, no clipped tag
  problems.push(...(await stageChecks(page, size, flow, step)));
  mkdirSync(`${OUT}/${size.name}`, { recursive: true });
  await page.screenshot({ path: `${OUT}/${size.name}/${flow}-${String(step).padStart(2, '0')}.png` });
  results.push({ size: size.name, flow, step, sig, problems });
}

/** A screenshot only (spec 2026-10-11 §10): the parent area scrolls and isn't held to the child screens' fit rules. */
async function snap(page: Page, size: Size, name: string, selector: string) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.evaluate(() => Promise.race([ // entrances settled: no shot of a card mid-scale
    Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity)).map((a) => a.finished.catch(() => {}))),
    new Promise((r) => setTimeout(r, 1500)),
  ]));
  mkdirSync(`${OUT}/${size.name}`, { recursive: true });
  await page.screenshot({ path: `${OUT}/${size.name}/${name}.png` });
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

/** Taps a walk may take: a full lesson with 朗读 is ~250, and each 8-tile 连一连 board takes ~30 blind taps (decoys; production practice spec §5). */
const WALK_CAP = 900;

async function walkLesson(page: Page, size: Size, flow: string, opts: { firstOnly?: boolean } = {}) {
  const seen = new Set<string>(); // check each distinct screen once; keep walking through repeats (20 phrases, 25 words) to reach the end
  for (let i = 0; i < WALK_CAP; i++) {
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
  // the cap reached with the lesson still up: the rest of the flow was never looked at (final review M5)
  // the Celebration too: a 继续 that never moves on (a fixed Date once blocked it) passed silently, its later phases never checked
  if (await page.$('.lessonbar, .celebrate')) results.push({ size: size.name, flow, step: WALK_CAP, sig: '', problems: [`walker ran out of taps: the lesson or its Celebration still shows after ${WALK_CAP} taps (stuck on: ${await page.evaluate(signature)})`] });
}

// The sizes share one browser; if it dies, the next flow launches another rather than every later flow failing on a closed one.
let shared: Promise<Browser> | null = null;
function browserNow(): Promise<Browser> {
  if (!shared) shared = launchWebKit();
  return shared.then((b) => {
    if (b.isConnected()) return b;
    shared = null;
    return browserNow();
  });
}

async function sweep(size: Size) {
  const run = async (flow: string, now: Date, profile: Omit<FitProfileOptions, 'now'>, then: (p: Page) => Promise<void>) => {
    if (ONLY && !ONLY.test(flow)) return;
    // a 2-core CI runner is several times slower than the Mac: more time per flow, and one retry of a crashed flow (what we do by hand locally)
    const limitMs = process.env.CI ? 15 * 60_000 : 360_000;
    for (let attempt = 1; attempt <= (process.env.CI ? 2 : 1); attempt++) {
      const mark = results.length;
      let page: Page | null = null;
      const errors: string[] = [];
      let crashed = false;
      // a retry gets a browser of its own: nothing left over from the crash (or from the other sizes' flows) can take it down too
      const own = attempt > 1 ? await launchWebKit() : null;
      try {
        const limit = new Promise<never>((_, no) => setTimeout(() => no(new Error(`flow took over ${limitMs / 60_000} minutes (stuck?)`)), limitMs));
        page = await Promise.race([open(own ?? (await browserNow()), size, now, profile, errors), limit]);
        if (process.env.CI) page.setDefaultTimeout(60_000);
        const p = page;
        await Promise.race([then(p), limit]); // one stuck screen can't stall the whole sweep
      } catch (e) {
        crashed = true;
        results.splice(mark); // a retry re-checks the whole flow; keep only the last attempt's screens
        results.push({ size: size.name, flow, step: -1, sig: '', problems: [`flow crashed${attempt > 1 ? ' (after a retry)' : ''}: ${String(e).slice(0, 900)}`, ...errors.map((m) => `page error: ${m}`)] });
      }
      await page?.context().close().catch(() => {});
      await own?.close().catch(() => {});
      if (!crashed) return;
      if (attempt < (process.env.CI ? 2 : 1)) { console.log(`retrying ${size.name} ${flow} after a crash:\n       - ${results[results.length - 1]!.problems.join('\n       - ')}`); results.splice(mark); }
    }
  };
  const tabTo = (p: Page, label: string) => p.click(`.tabbar__item:has-text("${label}")`);
  // wait for the lesson to load: a slow start used to look like "back home" and skip the whole flow silently (3b review: Truffle's
  // clip-paths made lessons start in ~5 s and every lesson flow checked nothing); a start over 15 s is a problem, not a skip
  const startLesson = async (p: Page) => {
    await p.click('.path__node--current');
    // a chapter due today opens first (3c): the stage cases check the reader, so the sweep steps past it to the lesson
    const first = await p.waitForSelector('.lessonbar, .celebrate, .story', { timeout: 15_000 });
    if (await first.evaluate((e) => e.classList.contains('story'))) await p.click('.story__skip');
    await p.waitForSelector('.lessonbar, .celebrate', { timeout: 15_000 });
  };

  // Home: not started, and done-for-today with every optional card; world taps in every world
  await run('home', AFTERNOON, {}, (p) => check(p, size, 'home', 0));
  await run('home-done', AFTERNOON, { doneToday: true }, (p) => check(p, size, 'home-done', 0));
  await run('home-done-later', AFTERNOON, { doneToday: true, doneMinutesAgo: 30 }, (p) => check(p, size, 'home-done-later', 0)); // 下午再来！ in 再学一课's place (learning rules 2026-10-17)
  await run('home-evening', EVENING, { world: 'home' }, (p) => check(p, size, 'home-evening', 0)); // the first world's evening
  for (const w of WORLDS) {
    await run(`home-${w.id}`, AFTERNOON, { world: w.id }, (p) => check(p, size, `home-${w.id}`, 0));
    await run(`home-done-${w.id}`, AFTERNOON, { world: w.id, doneToday: true }, (p) => check(p, size, `home-done-${w.id}`, 0)); // the done card and 再玩一会 sit differently
  }
  // First run
  await run('setup-pin', AFTERNOON, { pin: false, kid: false, placementDone: false }, (p) => check(p, size, 'setup-pin', 0));
  await run('pet-setup', AFTERNOON, { kid: false, placementDone: false }, async (p) => {
    await check(p, size, 'pet-setup', 0); // asleep: 你读几年级？ and six grade buttons
    await p.click('.setup__grade >> nth=0');
    await p.waitForSelector('.setup__school');
    await check(p, size, 'pet-setup', 1); // awake: where school is, 改 and 好！
  });
  await run('placement', AFTERNOON, { placementDone: false }, async (p) => {
    // 读一读 and 听一听 (spec 2026-10-14 v2.1): answer and look again until the walk ends (by 20) — a guess between the 不知道
    // taps; every question keeps the same box and grid: the screen must not jump between styles (the parent noticed)
    const boxes: string[] = [];
    for (let i = 0; i < 20; i++) {
      await p.waitForSelector('.placement[data-ready="true"], .placement__levels, .placement-confirm', { timeout: 60_000 });
      if (await p.$('.placement__levels, .placement-confirm')) break;
      await check(p, size, 'placement', i);
      boxes.push(await p.evaluate(() => ['.placement__prompt', '.placement__choices', '.placement .btn--big']
        .map((sel) => { const r = document.querySelector(sel)!.getBoundingClientRect(); return [r.top, r.height, r.width].map(Math.round).join(','); }).join(' | ')));
      const guess = i % 2 === 1 ? await p.$('.placement .choice') : null;
      await (guess ? guess.click() : p.click('.placement .btn--big', { timeout: 3000 })).catch(() => {}); // the walk can end under the tap: the result is up
      await p.waitForTimeout(150);
    }
    const moved = boxes.findIndex((b) => b !== boxes[0]);
    if (moved > 0) results.push({ size: size.name, flow: 'placement', step: moved, sig: 'steady', problems: [`question size changed between questions: ${boxes[0]} → ${boxes[moved]}`] });
    for (let i = 0; i < 30 && !(await p.$('.placement__levels, .placement-confirm')); i++) {
      if (await p.$('.placement .btn--big')) await p.click('.placement .btn--big', { timeout: 2000 }).catch(() => {});
      await p.waitForTimeout(150);
    }
    if (await p.$('.placement-confirm')) await p.click('.placement-confirm__keep');
    await p.waitForSelector('.placement__levels', { timeout: 30_000 });
    await check(p, size, 'placement', 90); // the result: 开始！ on screen at every size (spec v2.1)
  });
  // a strong reader's result (spec v2.1): every answer right climbs off the top to 三下, well above his class (二下), so the
  // parent's check comes first — its sheet, its PIN pad — then the result with the biggest numbers, 开始！ on screen
  const FIT_PIN = '2580'; // a test PIN for this local sweep only
  await run('placement-result', AFTERNOON, { placementDone: false, pinCode: FIT_PIN }, async (p) => {
    for (let i = 0; i < 25; i++) {
      await p.waitForSelector('.placement[data-ready="true"], .placement-confirm', { timeout: 60_000 });
      if (await p.$('.placement-confirm')) break;
      await p.click('.placement [data-answer="true"]').catch(() => {});
      await p.waitForTimeout(150);
    }
    await p.waitForSelector('.placement-confirm', { timeout: 30_000 });
    await check(p, size, 'placement-result', 0);
    await p.click('.placement-confirm__use');
    await p.waitForSelector('.placement-confirm .pinpad');
    await check(p, size, 'placement-result', 1);
    for (const d of FIT_PIN) await p.click(`.pinpad button[aria-label="${d}"]`);
    await p.waitForSelector('.placement__levels', { timeout: 60_000 });
    await check(p, size, 'placement-result', 2);
  });
  // the placement check re-run from Settings (sweep): its 回家 ✕ against the card and Truffle's bubble
  await run('placement-rerun', AFTERNOON, { pinCode: FIT_PIN }, async (p) => {
    await tabTo(p, '家长');
    for (const d of FIT_PIN) await p.click(`.pinpad button[aria-label="${d}"]`);
    await p.click('.tab:has-text("Settings")');
    await p.click('button:has-text("Re-run placement check")');
    for (let i = 0; i < 3; i++) {
      await p.waitForSelector('.placement[data-ready="true"]');
      await check(p, size, 'placement-rerun', i);
      await p.click('.placement .btn--big');
      await p.waitForTimeout(150);
    }
  });
  // the parent area's five tabs (parent, 2026-10-15), each shot; its class lesson and Progress against the lists (spec 2026-10-11 §8), in WebKit
  await run('parent', AFTERNOON, { pinCode: FIT_PIN, reviewHistory: true }, async (p) => {
    await tabTo(p, '家长');
    for (const d of FIT_PIN) await p.click(`.pinpad button[aria-label="${d}"]`);
    let step = 0;
    // the parent area may scroll down, never sideways: the five tabs fit in one row, no label cut (the old thirteen scrolled sideways on a phone)
    const fits = async () => results.push({ size: size.name, flow: 'parent-tabs', step: step++, sig: await p.evaluate(() => document.querySelector('.tab.is-active')?.textContent ?? ''), problems: await p.evaluate(() => {
      const out: string[] = [];
      const de = document.documentElement;
      if (de.scrollWidth > innerWidth + 1) out.push(`page scrolls sideways ${de.scrollWidth - innerWidth}px`);
      const nav = document.querySelector('.parent__tabs');
      if (!nav) return ['no parent tabs'];
      if (nav.scrollWidth > nav.clientWidth + 1) out.push(`tabs scroll sideways ${nav.scrollWidth - nav.clientWidth}px`);
      const tops = new Set<number>();
      for (const el of nav.querySelectorAll('.tab, .tab__zh, .tab__en')) {
        if (el.scrollWidth > el.clientWidth + 1) out.push(`cut: ${el.textContent}`);
        if (el.classList.contains('tab')) tops.add(Math.round(el.getBoundingClientRect().top));
      }
      if (tops.size > 1) out.push('tabs wrap to two rows');
      const r = nav.getBoundingClientRect();
      if (r.left < -1 || r.right > innerWidth + 1) out.push('tabs off screen');
      for (const el of document.querySelectorAll('.segmented__opt')) if (el.scrollWidth > el.clientWidth + 1) out.push(`cut: ${el.textContent}`);
      return out;
    }) });
    const tab = (label: string) => p.click(`.parent__tabs .tab:has-text("${label}")`);
    await p.waitForSelector('.tiles');
    await fits();
    await snap(p, size, 'parent-today', '.parent__tabs');
    await snap(p, size, 'parent-today-listen', '#parent-listen');
    await p.click('button:has-text("All recordings")');
    await snap(p, size, 'parent-today-recordings', '#parent-recordings');
    await tab('Progress');
    await p.waitForSelector('.progress__bars');
    await fits();
    await snap(p, size, 'parent-progress-top', '.parent__tabs');
    await snap(p, size, 'parent-progress', '.progress__bars');
    // retention and the fit (SRS tuning spec §5, §6.2): the real optimizer loads from the build, in WebKit
    await p.waitForSelector('.skills__retention');
    await snap(p, size, 'parent-skills-placement', '.skills__placement'); // the placement result and its rechecks (spec 2026-10-14)
    await snap(p, size, 'parent-skills', '.skills__retention');
    await p.click('button:has-text("Fit to his memory")');
    await p.waitForSelector('.skills__compare', { timeout: 20_000 });
    await snap(p, size, 'parent-fit', 'button:has-text("Use these")');
    await tab('Content');
    await p.waitForSelector('.segmented');
    for (const [i, part] of ['This week', 'Words', 'From a worksheet', 'Reading texts', 'Pictures'].entries()) {
      await p.click(`.segmented__opt:has-text("${part}")`);
      await p.waitForTimeout(200);
      await fits();
      await snap(p, size, `parent-content-${i}`, '.parent__tabs');
    }
    await tab('Rewards');
    await fits();
    await snap(p, size, 'parent-rewards', '.parent__tabs');
    await tab('Settings');
    await p.waitForSelector('#st-class-now');
    await fits();
    await snap(p, size, 'parent-settings-top', '.parent__tabs');
    await snap(p, size, 'parent-settings', '#st-class-now');
    await snap(p, size, 'parent-backup', '#parent-backup');
  });
  // 本周词语 (weekly list spec 2026-10-17 §3): empty, a pasted sheet's preview (two theme groups, one read column-wise and
  // flagged), the wrong answers to confirm, All fine, saved, and Close's own confirm; a screenshot each, never sideways
  await run('parent-week', AFTERNOON, { pinCode: FIT_PIN }, async (p) => {
    await tabTo(p, '家长');
    for (const d of FIT_PIN) await p.click(`.pinpad button[aria-label="${d}"]`);
    await p.click('.parent__tabs .tab:has-text("Content")');
    await p.click('.segmented__opt:has-text("This week")');
    await p.waitForSelector('#week-paste');
    let step = 0;
    const sideways = async () => results.push({ size: size.name, flow: 'parent-week', step: step++, sig: await p.evaluate(() => document.querySelector('.week h3')?.textContent ?? 'empty'), problems: await p.evaluate(() => {
      const out: string[] = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`page scrolls sideways ${document.documentElement.scrollWidth - innerWidth}px`);
      for (const el of document.querySelectorAll('.week button, .week input')) { const r = el.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > innerWidth + 1)) out.push(`off screen: ${el.textContent || el.getAttribute('aria-label')}`); }
      return out;
    }) });
    await sideways();
    await snap(p, size, 'parent-week-0-empty', '.parent__tabs');
    await p.fill('#week-paste', WEEK_SHEET);
    await p.click('.week__read:not([disabled])');
    await p.waitForSelector('.week__preview');
    await sideways();
    await snap(p, size, 'parent-week-1-preview', '.week__meta');
    await snap(p, size, 'parent-week-2-words', '.week__items');
    await snap(p, size, 'parent-week-3-dapei', '.week__group');
    await snap(p, size, 'parent-week-4-fills', '[aria-label="选词填空"]');
    await p.click('.week__allfine');
    // rows with a doubtful decoy need their own Fine (fix round 2026-10-17)
    for (const fine of await p.$$('li.is-doubt:not(.is-ok):not(.is-off) .week__fine')) await fine.click();
    await sideways();
    await snap(p, size, 'parent-week-5-allfine', '.week__bar');
    await p.click('.week__bar .btn--primary');
    await p.waitForSelector('.week__list');
    await sideways();
    await snap(p, size, 'parent-week-6-saved', '.week__lists');
    await p.click('.week__list button:has-text("Close")');
    await snap(p, size, 'parent-week-7-close', '.week__confirm');
    await p.click('.week__list button:has-text("Keep it")');
    await p.click('.week__list button:has-text("Edit")');
    await sideways();
    await snap(p, size, 'parent-week-8-edit', '.week__editor');
  });
  // the weekly list on Home and 考考自己 (weekly list spec 2026-10-17 §8.1, §9): the countdown line (before and after the day's
  // lesson), the ready-by day's card, every question of the check (no pinyin on any), its end sheet, and the parent's readiness
  // line on Today
  await run('home-week', AFTERNOON, { weekList: 'countdown' }, (p) => check(p, size, 'home-week', 0));
  await run('home-week-done', AFTERNOON, { weekList: 'countdown', doneToday: true }, (p) => check(p, size, 'home-week-done', 0));
  await run('check', AFTERNOON, { weekList: 'check' }, async (p) => {
    await check(p, size, 'home-check', 0);
    await p.click('.week-check button');
    let tries = 0;
    for (let i = 0; i < 20; i++) {
      await p.waitForSelector('.check .stage__card', { timeout: 15_000 });
      if (await p.$('.check--done')) break;
      await check(p, size, 'check', i);
      const py = await p.evaluate(() => [...document.querySelectorAll('.stage__card .label__py, .stage__card .pinyin')].map((e) => e.textContent ?? '').filter((t) => t.trim()).join(' '));
      if (py) results.push({ size: size.name, flow: 'check', step: i, sig: 'pinyin', problems: [`pinyin on a check question: ${py}`] });
      if (await p.$('.pairs')) {
        // a board: join each left tile, trying the right tiles in turn (a wrong join lets go)
        for (let guard = 0; guard < 40 && (await p.$('.check .pairs')); guard++) {
          const left = await p.$('.pairs__col--left .pair__tile:not(.is-matched):not([disabled])');
          if (!left) break;
          await left.click();
          const rights = await p.$$('.pairs__col--right .pair__tile:not(.is-matched):not([disabled])');
          if (rights.length) await rights[tries++ % rights.length]!.click();
          await p.waitForTimeout(60);
        }
      } else await p.click('.stage__card .choice >> nth=0');
      await p.waitForTimeout(400); // the answer is saved, then the next question comes
    }
    await p.waitForSelector('.check--done', { timeout: 15_000 });
    await check(p, size, 'check-done', 0);
  });
  await run('parent-week-line', AFTERNOON, { weekList: 'countdown', pinCode: FIT_PIN }, async (p) => {
    await tabTo(p, '家长');
    for (const d of FIT_PIN) await p.click(`.pinpad button[aria-label="${d}"]`);
    await p.waitForSelector('.dash__week', { timeout: 15_000 });
    const sideways = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    results.push({ size: size.name, flow: 'parent-week-line', step: 0, sig: 'today', problems: sideways > 1 ? [`page scrolls sideways ${sideways}px`] : [] });
    await snap(p, size, 'parent-week-line', '.dash__week');
  });
  // Tabs
  await run('collection', AFTERNOON, {}, async (p) => { await tabTo(p, '字卡'); await check(p, size, 'collection', 0); await p.click('.zika:not(.card--back)'); await check(p, size, 'collection', 1); });
  await run('room', AFTERNOON, {}, async (p) => {
    await tabTo(p, '松露');
    await p.waitForSelector('.room__tabs');
    let i = 0;
    for (const tab of await p.$$('.room__tabs [role="tab"], .room__tabs .chip')) { await tab.click(); await check(p, size, 'room', i++); }
    // tapping Truffle: his bubble shows and nothing below him moves (parent, 2026-10-05: the whole screen shifted)
    const tabsTop = () => p.evaluate(() => Math.round(document.querySelector('.room__tabs')!.getBoundingClientRect().top));
    const before = await tabsTop();
    await p.click('.room .pet svg.truffle');
    await p.waitForSelector('.room .pet__bubble');
    await check(p, size, 'room-tap', 0);
    const after = await tabsTop();
    if (after !== before) results.push({ size: size.name, flow: 'room-tap', step: 0, sig: 'steady', problems: [`the tabs moved ${after - before}px when Truffle spoke`] });
  });
  await run('pin-gate', AFTERNOON, {}, async (p) => { await tabTo(p, '家长'); await check(p, size, 'pin-gate', 0); });
  // Lessons, one activity at a time
  const only = (...ks: ActivityKind[]): Record<ActivityKind, boolean> => ({ newwords: ks.includes('newwords'), practice: ks.includes('practice'), writing: ks.includes('writing'), speaking: ks.includes('speaking') });
  // Say cards (spec 2026-10-11 §8): every Say screen at every size, recorded with the pretend microphone in WebKit (MediaRecorder
  // differs in Safari): the card must reach its 听一听 state and leave a Say card behind. (The take itself isn't stored here:
  // WebKit's test contexts can't put a Blob in IndexedDB; the review queue is screenshotted by the stage cases instead.)
  await run('say', AFTERNOON, { activities: only('practice') }, async (p) => {
    await startLesson(p);
    await walkLesson(p, size, 'say');
    const seen = (mark: string) => results.some((r) => r.size === size.name && r.flow === 'say' && r.sig.includes(mark));
    if (!seen('.say')) results.push({ size: size.name, flow: 'say', step: -1, sig: '', problems: ['no Say card came in 练一练'] });
    else if (!seen('.say__after')) results.push({ size: size.name, flow: 'say', step: -1, sig: '', problems: ['a Say card never finished recording in WebKit'] });
    const made = await p.evaluate(async () => {
      const db: IDBDatabase = await new Promise((ok, no) => { const r = indexedDB.open('hanzi-buddy'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
      const cards: { kind: string }[] = await new Promise((ok, no) => { const q = db.transaction('cards').objectStore('cards').getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
      db.close();
      return cards.filter((c) => c.kind === 'say').length;
    });
    if (!made) results.push({ size: size.name, flow: 'say', step: 98, sig: 'cards', problems: ['no Say card was made from a take'] });
  });
  await run('newwords', AFTERNOON, { activities: only('newwords') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'newwords'); });
  for (const w of WORLDS) { // each world behind a lesson card (parent, 2026-10-05: scenery showed round the card and buttons)
    await run(`lesson-${w.id}`, AFTERNOON, { world: w.id, activities: only('newwords') }, async (p) => { await startLesson(p); await walkLesson(p, size, `lesson-${w.id}`, { firstOnly: true }); });
  }
  await run('practice', AFTERNOON, { activities: only('newwords', 'practice') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'practice'); });
  await run('practice-evening', EVENING, { activities: only('newwords', 'practice') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'practice-evening'); });
  await run('writing', AFTERNOON, { activities: only('writing') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'writing', { firstOnly: true }); });
  await run('writing-sentence', AFTERNOON, { activities: only('writing'), writeSentence: true }, async (p) => { await startLesson(p); await walkLesson(p, size, 'writing-sentence'); });
  await run('langdu', AFTERNOON, { activities: only('speaking'), speakingLast: 'story', langdu: true }, async (p) => { await startLesson(p); await walkLesson(p, size, 'langdu'); });
  await run('lesson', AFTERNOON, { langdu: true }, async (p) => { await startLesson(p); await walkLesson(p, size, 'lesson'); }); // every step in order, 朗读 too, then the chest
  // the chest's stars prize; new words only, as the walker can't trace a character and stopped at 写一写, short of the chest
  await run('chest-stars', AFTERNOON, { ownsAll: true, activities: only('newwords') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'chest-stars'); });
  // the river meter after an extra lesson (rewards spec §3, §9): half way, the day's second chest, the cap, and a lesson that
  // mastered nothing — at every size. Extra lessons are review only (no 认新字), so they run a short 朗读 (练一练's review round took
  // over 6 minutes a size to walk); `mastered` seeds a word newly writable since the day's lesson, which moves the boat
  const extra = (halves: number, chestsToday: number, mastered = true) => ({ doneToday: true, activities: only('speaking'), langdu: true, speakingLast: 'story' as const, meter: { halves, chestsToday }, extraMastered: mastered });
  const extraLesson = async (p: Page) => {
    await p.click('.done-card button:has-text("再学一课")');
    await p.waitForSelector('.lessonbar, .celebrate', { timeout: 15_000 });
  };
  await run('extra-half', AFTERNOON, extra(0, 1), async (p) => { await extraLesson(p); await walkLesson(p, size, 'extra-half'); }); // 再学会几个字，就能开宝箱！
  await run('extra-resting', AFTERNOON, extra(1, 1, false), async (p) => { await extraLesson(p); await walkLesson(p, size, 'extra-resting'); }); // 你学得很认真！ 多学会几个字，小船就走！
  await run('extra-chest', AFTERNOON, extra(1, 1), async (p) => { await extraLesson(p); await walkLesson(p, size, 'extra-chest'); }); // the second chest, then 明天再开宝箱！
  await run('extra-capped', AFTERNOON, extra(0, 2), async (p) => { await extraLesson(p); await walkLesson(p, size, 'extra-capped'); }); // 明天再开宝箱！
  // yesterday's bank (a full meter) and today's first lesson: two chest phases in one Celebration (rewards ruling 2)
  await run('chest-two', AFTERNOON, { activities: only('newwords'), bank: 2 }, async (p) => { await startLesson(p); await walkLesson(p, size, 'chest-two'); });
  await run('langdu-extra', AFTERNOON, { doneToday: true, langdu: true }, async (p) => { await p.click('.langdu-btn'); await walkLesson(p, size, 'langdu-extra'); });
  await run('langdu-library', AFTERNOON, { activities: only('speaking'), speakingLast: 'story', langdu: true, schoolText: false }, async (p) => { await startLesson(p); await walkLesson(p, size, 'langdu-library'); }); // a library passage: picture, credit, 下一篇 (spec 2026-10-15)
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    try { await browserNow(); } catch (e) { console.error(`WebKit is missing: run  npx playwright-core install webkit  (ask first: it downloads ~100 MB)\n${e}`); process.exitCode = 2; return; }
    const sizes = SIZES.filter((s) => !VIEWPORT || VIEWPORT.test(s.name));
    await Promise.all(sizes.map((size) => sweep(size))); // sizes in parallel, each in its own contexts
    stageInvariants();
    // A phone turned sideways: the overlay covers the screen
    const side = { name: 'iphone-sideways', width: 667, height: 375 };
    if (!VIEWPORT || VIEWPORT.test(side.name)) {
      const page = await open(await browserNow(), side, AFTERNOON, {});
      const covered = await page.evaluate(() => { const h = document.querySelector('.rotate-hint'); if (!h) return false; const r = h.getBoundingClientRect(); return getComputedStyle(h).display !== 'none' && r.width >= innerWidth && r.height >= innerHeight; });
      mkdirSync(`${OUT}/${side.name}`, { recursive: true });
      await page.screenshot({ path: `${OUT}/${side.name}/home-00.png` });
      results.push({ size: side.name, flow: 'rotate', step: 0, sig: '', problems: covered ? [] : ['the turn-it-upright overlay does not cover the screen'] });
    }
    await (await browserNow()).close();
  } finally {
    server.kill();
  }
  const bad = results.filter((r) => r.problems.length);
  const lines = results.map((r) => `${r.problems.length ? 'FAIL' : 'ok  '} ${r.size.padEnd(18)} ${r.flow}-${String(r.step).padStart(2, '0')}  ${r.sig}${r.problems.length ? `\n       - ${r.problems.join('\n       - ')}` : ''}`);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/report.txt`, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log(`\n${results.length} screens checked, ${bad.length} with problems. Screenshots: ${OUT}/`);
  if (!results.length) { console.error(`nothing was checked: FIT_VIEWPORT=${process.env.FIT_VIEWPORT ?? ''} FIT_ONLY=${process.env.FIT_ONLY ?? ''} match no size or flow`); process.exit(1); }
  process.exit(bad.length ? 1 : 0);
}

void main();
