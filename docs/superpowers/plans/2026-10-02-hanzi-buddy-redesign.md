# Hanzi Buddy Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize Hanzi Buddy's look and motion, replace the emoji mascot with an animated vector dragon, and fix the radical-meaning bug found during verification.

**Architecture:** This builds on the app produced by `docs/superpowers/plans/2026-10-02-hanzi-buddy.md` (branch `build/v1`).
- Pure helpers carry the logic and get unit tests: dragon geometry, motion geometry, session progress, font text collection.
- New Preact components: `Dragon`, `Scene`, `ProgressBar`, `Chest`.
- The stylesheet is rewritten around motion and shadow tokens.
- Components keep their existing class names and props wherever possible, so screen code changes stay small.

**Tech Stack:**
- Same stack as before.
- `subset-font` (font subsetting at build time), `@fontsource/nunito`.
- The LXGW WenKai font, used under SIL OFL 1.1.
- The Web Animations API and the View Transitions API, both with fallbacks.

**Spec:** `docs/superpowers/specs/2026-10-02-hanzi-buddy-design.md`. Read §5b first; §5 and §5a are context.

## Global Constraints

- **Location:** the project root is `/Users/bryantan/apps/ziji`, on branch `build/v1`. Every Global Constraint of the first plan still applies.
- **Motion tokens:**
  - `--dur-fast` 150ms, `--dur-base` 280ms, `--dur-slow` 520ms
  - `--spring` and `--spring-bouncy` are CSS `linear()` curves, with a `cubic-bezier` fallback under `@supports not`
- **Reduced motion:** `prefers-reduced-motion` disables:
  - all CSS animations and transitions, including view transitions
  - JS particles and flights (they no-op)
  - dragon blinking
- **No `hue-rotate`.** Dragon colours come from the `--d-*` CSS variables only.
- **Confetti** (`celebrate()`) is only for:
  - a finished session
  - the pet evolving
  - a new badge
  - a reached reward goal

  The chest uses `burst()` instead.
- **Fonts:**
  - Characters (`.hanzi`, `--hanzi`) use `'WenKai'`.
  - UI Latin text and pinyin use `'Nunito'`.
  - Both are self-hosted, so nothing comes from a CDN at runtime.
- **Meanings:** component meanings and families come from the character's **radical only** (`info.radical`).

## Review Focus

Things the spec implies but no task's tests exercise:

1. **Older iPad Safari without `linear()` or View Transitions:**
   - Springs fall back to `cubic-bezier`.
   - Route changes still work, they just aren't animated.
   - **Test:** Task R3, `withViewTransition` without the API.
2. **Parent turns on Reduce Motion:**
   - No particles, no flights, no blinking.
   - Answers and navigation still work.
   - **Test:** Task R3, `burst` and `flyAlong` no-op under `matchMedia` reduce.
3. **A fast double-tap on a choice while its flight animation runs:**
   - It counts as one answer, and the flight doesn't block 下一个.
   - **Coverage:** Task R6. Existing `phase !== 'quiz'` guard; the flight is fire-and-forget. The test asserts `onDone` fires once.
4. **A parent word containing a character outside the font subset:**
   - It renders in the fallback 楷体 or PingFang, never as blank boxes.
   - **Coverage:** Task R2. The CSS font stack lists fallbacks; checked by inspection in R8.
5. **Portrait iPad (768×1024):**
   - The two-column setup and flashcard layouts collapse to one column.
   - Nothing overflows horizontally.
   - **Coverage:** Task R8 visual pass.

## File Map

```
scripts/font-lib.ts (+test), scripts/build-font.ts        subset LXGW WenKai → public/fonts/wenkai.woff2 (+OFL text)
src/styles.css                                             rewritten: tokens, motion, dragon, scenes, progress, chest, particles
src/ui/motion.ts (+test)                                   arcPoints, burstVectors, burst, flyAlong, withViewTransition, reducedMotion
src/ui/dragon/parts.ts (+test), src/ui/dragon/Dragon.tsx (+test)
src/ui/Pet.tsx                                             now renders <Dragon>
src/ui/Scene.tsx, src/ui/ProgressBar.tsx, src/ui/Chest.tsx (+tests in src/ui/scenery.test.tsx)
src/session/progress.ts (+test)
Modified: game.ts, stickers.ts, FlashcardStep.tsx, ComponentsStep.tsx, WritingStep.tsx, Label.tsx, PetSetup.tsx,
          SessionScreen.tsx, Celebration.tsx, HomeScreen.tsx, PlacementScreen.tsx, StickerBook.tsx, Wardrobe.tsx,
          App.tsx, main.tsx, vite.config.ts, fun/pet.ts, CREDITS.md, parent/Credits.tsx
```

---

### Task 1: (R1) Radical-only meanings and pinyin digit grouping

**Files:**
- Modify: `src/activities/components/game.ts`, `src/fun/stickers.ts`, `src/activities/flashcards/FlashcardStep.tsx` (`Intro` only), `src/ui/Label.tsx`
- Test: `src/activities/components/game.test.ts`, `src/fun/stickers.test.ts`, `src/activities/flashcards/FlashcardStep.test.tsx`, `src/ui/widgets.test.tsx` (new cases added to each)

**Interfaces:**
- Changes:
  - `charHasComponent(char, component)` now means "`component` is `char`'s radical (and isn't the character itself)".
  - Which-part questions use `info.radical` as the answer.
  - `stickerFamilies` groups by radical.
- Unchanged: every signature.

- [ ] **Step 1: Add the failing tests**

Append to `src/activities/components/game.test.ts`:
```ts
describe('radical-only meanings', () => {
  it('does not treat a non-radical part as a meaning', () => {
    expect(charHasComponent('日', '口')).toBe(false);
    expect(charHasComponent('吃', '口')).toBe(true);
  });
  it('asks which-part questions only about the radical', () => {
    const round = buildComponentRound(KNOWN, mulberry32(7))!;
    for (const q of round.filter((q): q is WhichPartQuestion => q.kind === 'whichPart')) {
      expect(getCharInfo(q.char)!.radical).toBe(q.component);
    }
  });
});
```
Add `import { getCharInfo } from '../../content';` to that file's imports.

In `src/fun/stickers.test.ts`, replace the `builtin` fixture and the first test with:
```ts
const builtin = [
  ch('河', '氵', ['氵', '可'], 3), ch('汉', '氵', ['氵', '又'], 1), ch('洗', '氵', ['氵', '先'], 2),
  ch('吃', '口', ['口', '乞'], 4), ch('叫', '口', ['口', '丩'], 5), ch('喝', '口', ['口', '曷'], 7),
  ch('日', '日', ['口', '一'], 6), ch('水', '水', [], 0),
];

describe('sticker families', () => {
  const families = stickerFamilies(builtin);
  it('groups characters by radical, keeping families of 3 or more, in rank order', () => {
    expect(families.map((f) => [f.component, f.chars])).toEqual([['口', ['吃', '叫', '喝']], ['氵', ['汉', '洗', '河']]]);
  });
```
In the same file, change `familyProgress(families[0]!, …)` to `familyProgress(families.find((f) => f.component === '氵')!, …)`.

Append to `src/activities/flashcards/FlashcardStep.test.tsx`:
```tsx
describe('intro meanings', () => {
  it('labels only the radical with a meaning', () => {
    const ri = pool.find((w) => w.text === '日')!;
    render(<FlashcardStep {...base} word={ri} item={{ wordId: ri.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.intro')!.textContent).not.toContain('👄');
    cleanup();
    render(<FlashcardStep {...base} item={{ wordId: he.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.intro')!.textContent).toContain('💧');
  });
});
```
Add `cleanup` to that file's `@testing-library/preact` import.

Append to `src/ui/widgets.test.tsx`:
```tsx
describe('Label digits', () => {
  it('keeps numbers together in the pinyin line', () => {
    const { container } = render(<Label zh="我认识 45 个字" />);
    expect(container.querySelector('.label__py')?.textContent).toBe('wǒ rèn shi 45 gè zì');
  });
});
```

- [ ] **Step 2: Run and confirm the new tests fail**

Run: `npx vitest run src/activities src/fun src/ui`
Expected: the new cases FAIL:
- `charHasComponent('日','口')` returns true
- the families include 日 under 口
- the 日 intro contains 👄
- the pinyin is `wǒ rèn shi 4 5 gè zì`

- [ ] **Step 3: Implement**

In `src/activities/components/game.ts`, replace `charHasComponent` and the `whichPart` builder:
```ts
/** True when `component` is `char`'s radical — the only part whose meaning we teach. */
export function charHasComponent(char: string, component: string): boolean {
  const info = getCharInfo(char);
  return !!info && char !== component && info.radical === component;
}
```
```ts
  const whichPart: WhichPartQuestion[] = shuffle(chars, rng).flatMap((char) => {
    const info = getCharInfo(char)!;
    const component = info.radical;
    const meaning = RADICALS[component];
    const parts = info.components.filter((p) => p !== char);
    if (!meaning || component === char || !parts.includes(component)) return [];
    const others = parts.filter((p) => p !== component && RADICALS[p]?.zh !== meaning.zh);
    if (!others.length) return [];
    return [{ kind: 'whichPart' as const, char, component, options: shuffle([component, ...shuffle(others, rng).slice(0, 2)], rng) }];
  });
```

In `src/fun/stickers.ts`, change the filter inside `stickerFamilies` to:
```ts
        .filter((c) => c.char !== component && c.radical === component)
```

In `src/activities/flashcards/FlashcardStep.tsx`, inside `Intro`, replace the `hanChars(word.text).map(...)` block with:
```tsx
        {hanChars(word.text).map((ch) => {
          const info = getCharInfo(ch);
          const parts = info?.components ?? [];
          if (!info || parts.length < 2) return null;
          return (
            <div class="parts" key={ch}>
              {parts.map((p, i) => {
                const m = p === info.radical ? radicalMeaning(p) : undefined;
                return (
                  <span key={p} class={m ? 'part--radical' : ''}>
                    {i > 0 ? '+ ' : ''}
                    {p}
                    {m ? ` ${m.emoji}` : ''}
                  </span>
                );
              })}
            </div>
          );
        })}
```

In `src/ui/Label.tsx`, change the memo line to:
```tsx
  const py = useMemo(() => pinyin(zh, { nonZh: 'consecutive' }).replace(/\s+/g, ' ').trim(), [zh]);
```

- [ ] **Step 4: Run all tests**

Run: `npm test && npx tsc --noEmit`
Expected:
- all tests pass, including `finds plenty of families in the real built-in set`
- the components round test still builds 6 alternating questions

If the real-set family test drops below its thresholds, record the actual numbers and lower them to what the radical-only data supports (at least 8 families, first family at least 8). That's a ruling: the spec values correctness over family count.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: teach meanings from the radical only; keep digits together in pinyin labels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: (R2) Fonts and the modern stylesheet

**Files:**
- Create: `scripts/font-lib.ts`, `scripts/font-lib.test.ts`, `scripts/build-font.ts`
- Generate: `public/fonts/wenkai.woff2`, `public/fonts/LXGWWenKai-OFL.txt`
- Modify:
  - `src/styles.css` (replace entirely)
  - `src/main.tsx`
  - `vite.config.ts` (workbox `globPatterns`)
  - `package.json` (dev dependency, plus a `font` script)
  - `CREDITS.md`, `src/parent/Credits.tsx`

**Interfaces:**
- Produces:
  - `collectFontText(sources: string[]): string`
  - `EXTRA_GLYPHS`
  - `npm run font`
  - Every CSS class the later tasks use:
    - `.scene*`, `.progressbar*`, `.dragon*`, `.chest*`
    - `.particles`, `.particle`, `.stagger`
    - `.card-glass`, `.setup*`, `.celebrate--night`, `.chip.is-bumping`

- [ ] **Step 1: Write the failing test** `scripts/font-lib.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { collectFontText, EXTRA_GLYPHS } from './font-lib';

describe('collectFontText', () => {
  it('keeps unique Han characters plus punctuation and digits, sorted', () => {
    const text = collectFontText(['你好 hello', '好，学']);
    expect([...text].filter((c) => /\p{Script=Han}/u.test(c))).toEqual(['你', '好', '学'].sort());
    expect(text).not.toContain('h');
    for (const g of EXTRA_GLYPHS) expect(text).toContain(g);
    expect(new Set(text).size).toBe([...text].length);
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run scripts/font-lib.test.ts`
Expected: FAIL, because `./font-lib` can't be resolved.

- [ ] **Step 3: Implement the font pipeline**

`scripts/font-lib.ts`:
```ts
export const EXTRA_GLYPHS = '，。！？：；“”‘’、（）《》…—·0123456789';

/** Every Han character in the sources plus common CJK punctuation and digits, unique and sorted. */
export function collectFontText(sources: string[]): string {
  const set = new Set<string>();
  for (const s of sources) for (const ch of s) if (/\p{Script=Han}/u.test(ch)) set.add(ch);
  for (const ch of EXTRA_GLYPHS) set.add(ch);
  return [...set].sort().join('');
}
```

Run: `npm install -D subset-font@^5 && npm install @fontsource/nunito@^5`

`scripts/build-font.ts`:
```ts
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import { collectFontText } from './font-lib';

const FONT_URL = 'https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Regular.ttf';
const OFL_URL = 'https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/OFL.txt';
const CHARLIST_URL = 'https://raw.githubusercontent.com/elkmovie/hsk30/main/charlist.txt';
const cacheDir = new URL('./.cache/', import.meta.url);
const outDir = new URL('../public/fonts/', import.meta.url);

async function cached(name: string, url: string): Promise<Buffer> {
  const file = new URL(name, cacheDir);
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed for ${name}: ${res.status}`);
    await mkdir(cacheDir, { recursive: true });
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(file);
}

async function sourceTexts(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && /\.(tsx?|json)$/.test(entry.name)) out.push(await readFile(join(entry.parentPath, entry.name), 'utf8'));
  }
  return out;
}

const text = collectFontText([
  (await cached('charlist.txt', CHARLIST_URL)).toString('utf8'),
  ...(await sourceTexts(fileURLToPath(new URL('../src/', import.meta.url)))),
]);
const woff2 = await subsetFont(await cached('LXGWWenKai-Regular.ttf', FONT_URL), text, { targetFormat: 'woff2' });
await mkdir(outDir, { recursive: true });
await writeFile(new URL('wenkai.woff2', outDir), woff2);
await writeFile(new URL('LXGWWenKai-OFL.txt', outDir), await cached('OFL.txt', OFL_URL));
console.log(`Subset ${[...text].length} glyphs → ${Math.round(woff2.length / 1024)} KiB`);
```

In `package.json` `scripts`, add `"font": "tsx scripts/build-font.ts"`.

If `npx tsc --noEmit` reports `Could not find a declaration file for module 'subset-font'`, create `scripts/subset-font.d.ts`:
```ts
declare module 'subset-font' {
  export default function subsetFont(
    font: Uint8Array,
    text: string,
    options?: { targetFormat?: 'woff2' | 'woff' | 'sfnt' | 'truetype' },
  ): Promise<Buffer>;
}
```

Run: `npm run font`
Expected: `Subset ~3000+ glyphs → roughly 1000–1800 KiB`, and both files exist in `public/fonts/`.

- [ ] **Step 4: Load the fonts.** Replace `src/main.tsx` with:

```tsx
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './styles.css';

registerSW({ immediate: true });
render(<App />, document.getElementById('app')!);
```

In `vite.config.ts`, change the workbox `globPatterns` to `['**/*.{js,css,html,png,svg,ico,webmanifest,woff2}']`.

- [ ] **Step 5: Replace `src/styles.css`.** The class names are unchanged from the first build, plus the new ones.

```css
:root {
  --bg: #fff7ec;
  --surface: #ffffff;
  --surface-glass: rgba(255, 255, 255, 0.84);
  --surface-2: #fff3e0;
  --ink: #1f2937;
  --ink-soft: #5b6472;
  --muted: #a3acb9;
  --line: #efe4d3;
  --accent: #ff8a3d;
  --accent-2: #ffb15c;
  --good: #22c55e;
  --good-2: #4ade80;
  --good-soft: #dcfce7;
  --calm: #60a5fa;
  --calm-strong: #2563eb;
  --calm-soft: #e0efff;
  --gold: #fbbf24;
  --radius-sm: 14px;
  --radius: 22px;
  --radius-lg: 30px;
  --shadow-1: 0 1px 2px rgba(31, 41, 55, 0.06), 0 4px 14px rgba(31, 41, 55, 0.08);
  --shadow-2: 0 2px 6px rgba(31, 41, 55, 0.08), 0 14px 34px rgba(31, 41, 55, 0.12);
  --focus: 0 0 0 5px rgba(255, 138, 61, 0.28);
  --font: 'Nunito', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', sans-serif;
  --hanzi: 'WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', 'PingFang SC', serif;
  --dur-fast: 150ms;
  --dur-base: 280ms;
  --dur-slow: 520ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --spring: linear(0, 0.06, 0.22 8%, 0.6 18%, 0.86 28%, 1.01 40%, 1.04 48%, 1.02 60%, 1);
  --spring-bouncy: linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1);
  color-scheme: light;
}
@supports not (transition-timing-function: linear(0, 1)) {
  :root { --spring: cubic-bezier(0.34, 1.4, 0.64, 1); --spring-bouncy: cubic-bezier(0.34, 1.8, 0.64, 1); }
}
@font-face { font-family: 'WenKai'; src: url('/fonts/wenkai.woff2') format('woff2'); font-display: swap; }

* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 20px;
  -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
}
input, textarea, select { font: inherit; user-select: text; -webkit-user-select: text; }
button { font: inherit; color: inherit; cursor: pointer; touch-action: manipulation; transition: transform var(--dur-fast) var(--spring); }
button:active:not(:disabled) { transform: scale(0.95); }
button:focus-visible, input:focus-visible { outline: none; box-shadow: var(--focus); }
#app { min-height: 100%; }

.screen {
  position: relative; z-index: 1; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; gap: 16px;
  padding: max(16px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
}
.loading { align-items: center; justify-content: center; font-size: 80px; }
.topbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.spacer { flex: 1; }
.chip {
  background: var(--surface-glass); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  border-radius: 999px; padding: 8px 16px; font-weight: 800; box-shadow: var(--shadow-1);
}
.chip.is-bumping { animation: bump var(--dur-slow) var(--spring-bouncy); }
@keyframes bump { 30% { transform: scale(1.25); } }
.center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; }
.row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; align-items: center; }
.warning { background: #fff4d6; border-radius: var(--radius-sm); padding: 12px 16px; margin: 0; }
.card-glass, .intro__card, .goal, .passage, .family, .setup__form {
  background: var(--surface-glass); -webkit-backdrop-filter: blur(14px) saturate(1.2); backdrop-filter: blur(14px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.75); box-shadow: var(--shadow-2); border-radius: var(--radius-lg);
}

/* Buttons */
.btn {
  min-height: 64px; min-width: 64px; padding: 12px 28px; border: none; border-radius: 999px; background: var(--surface);
  box-shadow: var(--shadow-1); font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
.btn--primary { background: linear-gradient(180deg, var(--accent-2), var(--accent)); color: #fff; box-shadow: 0 8px 20px rgba(255, 138, 61, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4); }
.btn--good { background: linear-gradient(180deg, var(--good-2), var(--good)); color: #fff; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4); }
.btn--ghost { background: transparent; box-shadow: none; }
.btn--big { font-size: 30px; padding: 20px 52px; min-height: 92px; }
.btn:disabled { opacity: 0.5; }
.link { background: none; border: none; color: var(--ink-soft); text-decoration: underline; min-height: 44px; }
.small-btn { min-height: 44px; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--line); background: #fff; }

/* Text */
.label { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.15; }
.label__py { font-size: 0.55em; font-weight: 700; opacity: 0.75; letter-spacing: 0.01em; }
.hanzi { font-family: var(--hanzi); }
.hanzi--xl { font-family: var(--hanzi); font-size: 150px; line-height: 1.05; }
.pinyin { color: var(--ink-soft); font-size: 24px; font-weight: 700; }
.meaning { color: var(--ink-soft); font-size: 18px; }
.speak {
  min-width: 64px; min-height: 64px; border-radius: 50%; border: none; font-size: 28px; color: var(--calm-strong);
  background: var(--calm-soft); box-shadow: var(--shadow-1);
}
.speak--big { min-width: 128px; min-height: 128px; font-size: 56px; box-shadow: 0 0 0 10px rgba(96, 165, 250, 0.18), var(--shadow-2); animation: speak-pulse 2.4s ease-in-out infinite; }
@keyframes speak-pulse { 50% { box-shadow: 0 0 0 18px rgba(96, 165, 250, 0.08), var(--shadow-2); } }

/* Pet & dragon */
.pet { position: relative; display: inline-flex; flex-direction: column; align-items: center; line-height: 1; }
.pet-button { background: none; border: none; padding: 0; }
.pet__bubble {
  position: relative; background: #fff; border-radius: 20px; padding: 10px 18px; font-size: 22px; font-weight: 800;
  margin-bottom: 10px; box-shadow: var(--shadow-2); white-space: nowrap; transform-origin: 50% 100%;
  animation: bubble-in var(--dur-slow) var(--spring-bouncy) backwards;
}
.pet__bubble::after { content: ''; position: absolute; bottom: -9px; left: 50%; width: 18px; height: 18px; background: #fff; transform: translateX(-50%) rotate(45deg); border-radius: 3px; }
@keyframes bubble-in { from { transform: scale(0.5) translateY(10px); opacity: 0; } }
.dragon { display: block; overflow: visible; }
.dragon g, .dragon path, .dragon ellipse, .dragon circle, .dragon text { transform-box: fill-box; }
.dragon__shadow { fill: rgba(31, 41, 55, 0.12); }
.dragon__body-group { transform-origin: 50% 100%; animation: breathe 3.4s ease-in-out infinite; }
@keyframes breathe { 50% { transform: scale(1.015, 1.035); } }
.dragon__egg { transform-origin: 50% 100%; animation: egg-wobble 3s ease-in-out infinite; }
@keyframes egg-wobble { 0%, 60%, 100% { transform: rotate(0); } 70% { transform: rotate(-5deg); } 80% { transform: rotate(4deg); } 90% { transform: rotate(-2deg); } }
.dragon__wing--l { transform-origin: 100% 70%; animation: wing-l 4s ease-in-out infinite; }
.dragon__wing--r { transform-origin: 0% 70%; animation: wing-r 4s ease-in-out infinite; }
@keyframes wing-l { 0%, 80%, 100% { transform: rotate(0); } 88% { transform: rotate(-12deg); } }
@keyframes wing-r { 0%, 80%, 100% { transform: rotate(0); } 88% { transform: rotate(12deg); } }
.dragon__eyelid { transform-origin: 50% 0%; transform: scaleY(0); transition: transform 90ms ease-in; }
.dragon.is-blinking .dragon__eyelid { transform: scaleY(1); }
.dragon__pupil { transition: transform var(--dur-base) var(--spring); }
.dragon__mouth-open { transform-origin: 50% 0%; transform: scaleY(0); }
.dragon--munch .dragon__mouth-open { animation: chew 0.45s ease-in-out 2; }
@keyframes chew { 50% { transform: scaleY(1); } }
.dragon--happy .dragon__all, .dragon--munch .dragon__all, .dragon--cheer .dragon__all { transform-origin: 50% 100%; animation: hop 700ms var(--ease-out); }
@keyframes hop {
  18% { transform: translateY(0) scale(1.08, 0.9); }
  45% { transform: translateY(-22px) scale(0.94, 1.07); }
  72% { transform: translateY(0) scale(1.06, 0.94); }
}
.dragon--comfort .dragon__head { transform-origin: 50% 90%; animation: nod 900ms ease-in-out; }
@keyframes nod { 30% { transform: rotate(-7deg) translateY(2px); } 65% { transform: rotate(5deg); } }
.dragon--cheer .dragon__wing--l { animation: flap-l 260ms ease-in-out 5; }
.dragon--cheer .dragon__wing--r { animation: flap-r 260ms ease-in-out 5; }
@keyframes flap-l { 50% { transform: rotate(-24deg); } }
@keyframes flap-r { 50% { transform: rotate(24deg); } }
.dragon__aura { transform-origin: 50% 50%; animation: aura 3s ease-in-out infinite; }
@keyframes aura { 50% { transform: scale(1.06); opacity: 0.8; } }
.dragon__sparkle { transform-origin: 50% 50%; animation: twinkle 1.8s ease-in-out infinite; }
.dragon__sparkle:nth-of-type(2) { animation-delay: 0.6s; }
.dragon__sparkle:nth-of-type(3) { animation-delay: 1.2s; }
@keyframes twinkle { 0%, 100% { transform: scale(0.4); opacity: 0.3; } 50% { transform: scale(1); opacity: 1; } }
.dragon__accessory { transform-origin: 50% 100%; animation: accessory-in var(--dur-slow) var(--spring-bouncy) backwards; }
@keyframes accessory-in { from { transform: translateY(-20px) scale(0.4); opacity: 0; } }

/* Scenes */
.scene { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.scene--home, .scene--sky { background: linear-gradient(180deg, #bfe3ff 0%, #e8f5ff 55%, #fff7ec 100%); }
.scene--desk { background: linear-gradient(180deg, #fff7ec 0%, #fdebd3 100%); }
.scene--pond { background: linear-gradient(180deg, #dff5ff 0%, #b4e5f6 60%, #8ad0ec 100%); }
.scene--stage { background: radial-gradient(ellipse at 50% 0%, #fff6d8 0%, #f6eaff 45%, #ecdcff 100%); }
.scene--night { background: linear-gradient(180deg, #1e1b4b 0%, #4c1d95 60%, #7c3aed 100%); }
.scene__cloud { position: absolute; left: 0; fill: rgba(255, 255, 255, 0.92); animation: drift linear infinite; }
@keyframes drift { from { transform: translateX(-30vw); } to { transform: translateX(130vw); } }
.scene__hills { position: absolute; bottom: 0; left: 0; width: 100%; height: 26vh; }
.scene__waves { position: absolute; bottom: 0; left: 0; width: 200%; height: 20vh; animation: waves 14s linear infinite; }
.scene__waves--back { bottom: 3vh; opacity: 0.55; animation-duration: 22s; }
@keyframes waves { to { transform: translateX(-50%); } }
.scene__desk { position: absolute; bottom: 0; left: 0; right: 0; height: 24vh; background: linear-gradient(180deg, #e9b98a, #d39b68); box-shadow: inset 0 6px 0 rgba(255, 255, 255, 0.25); }
.scene__star { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #fff; animation: twinkle 2.4s ease-in-out infinite; }

/* Session header & progress */
.stepbar { display: flex; align-items: center; gap: 14px; }
.progressbar { position: relative; flex: 1; height: 48px; display: flex; align-items: center; margin-right: 24px; }
.progressbar__track { position: relative; width: 100%; height: 16px; border-radius: 999px; background: rgba(255, 255, 255, 0.75); box-shadow: inset 0 1px 3px rgba(31, 41, 55, 0.14); overflow: hidden; }
.progressbar__fill {
  height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--good-2), var(--good));
  box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.35); transition: width var(--dur-slow) var(--spring);
}
.progressbar__cp {
  position: absolute; top: 50%; width: 42px; height: 42px; margin: -21px 0 0 -21px; border-radius: 50%; background: #fff;
  box-shadow: var(--shadow-1); display: flex; align-items: center; justify-content: center; font-size: 20px; filter: grayscale(1); opacity: 0.75;
}
.progressbar__cp.is-current { filter: none; opacity: 1; }
.progressbar__cp.is-done { filter: none; opacity: 1; background: var(--good-soft); animation: cp-pop var(--dur-slow) var(--spring-bouncy); }
@keyframes cp-pop { from { transform: scale(0.5); } }
.combo { font-weight: 800; color: #c2410c; background: #ffedd5; border-radius: 999px; padding: 6px 14px; }
.combo-banner {
  position: fixed; top: 18%; left: 50%; z-index: 30; pointer-events: none; background: linear-gradient(180deg, #fb923c, #f97316);
  color: #fff; font-size: 40px; font-weight: 800; padding: 16px 34px; border-radius: 999px; box-shadow: var(--shadow-2);
  animation: banner 1.6s var(--ease-out) forwards;
}
@keyframes banner {
  0% { transform: translateX(-50%) scale(0.3); opacity: 0; }
  18% { transform: translateX(-50%) scale(1.08); opacity: 1; }
  28% { transform: translateX(-50%) scale(1); }
  85% { opacity: 1; }
  100% { transform: translateX(-50%) translateY(-20px); opacity: 0; }
}

/* Flashcards */
.flash { flex: 1; display: grid; grid-template-columns: 1fr 1.4fr; gap: 24px; align-items: center; }
.flash__pet { display: flex; justify-content: center; }
.flash__main { display: flex; flex-direction: column; align-items: center; gap: 22px; }
.flash__prompt { display: flex; justify-content: center; align-items: center; min-height: 168px; }
.choices { display: grid; grid-template-columns: repeat(2, minmax(150px, 1fr)); gap: 16px; width: 100%; max-width: 540px; }
.choice {
  position: relative; min-height: 112px; border: 3px solid transparent; border-radius: var(--radius); background: var(--surface-glass);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); box-shadow: var(--shadow-2); font-size: 30px; font-weight: 800;
  transition: transform var(--dur-fast) var(--spring), opacity var(--dur-base) var(--ease-out), border-color var(--dur-base);
}
.choices--hanzi .choice { font-family: var(--hanzi); font-size: 66px; font-weight: 400; }
.choice.is-eaten { pointer-events: none; z-index: 20; }
.choice.is-answer { border-color: var(--good); background: var(--good-soft); }
.choice.is-wrong { animation: wobble 0.45s; opacity: 0.55; }
.choice.is-dim { opacity: 0.3; }
@keyframes wobble { 25% { transform: translateX(-7px) rotate(-2deg); } 75% { transform: translateX(7px) rotate(2deg); } }
.flash__next { display: flex; flex-direction: column; align-items: center; gap: 12px; animation: rise-in var(--dur-slow) var(--spring) backwards; }
.answer-reveal { font-size: 28px; display: flex; align-items: center; gap: 12px; margin: 0; }
.answer-reveal .hanzi { font-size: 44px; }
.intro { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.intro__card { padding: 24px 44px; display: flex; flex-direction: column; align-items: center; gap: 8px; animation: rise-in var(--dur-slow) var(--spring) backwards; }
.parts { font-size: 28px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; font-family: var(--hanzi); }
.part--radical { color: #c2410c; }
.example { font-size: 26px; display: flex; align-items: center; gap: 10px; }
@media (orientation: portrait) { .flash { grid-template-columns: 1fr; } }

/* Writing */
.write { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.write__prompt { display: flex; align-items: center; gap: 16px; font-size: 36px; }
.tianzige {
  background-color: #fffdf8; border: 4px solid #e35d4b; border-radius: 12px; touch-action: none; box-shadow: var(--shadow-2);
  background-image:
    linear-gradient(to right, transparent calc(50% - 1px), rgba(227, 93, 75, 0.35) calc(50% - 1px), rgba(227, 93, 75, 0.35) calc(50% + 1px), transparent calc(50% + 1px)),
    linear-gradient(to bottom, transparent calc(50% - 1px), rgba(227, 93, 75, 0.35) calc(50% - 1px), rgba(227, 93, 75, 0.35) calc(50% + 1px), transparent calc(50% + 1px));
}
.dots { display: flex; gap: 8px; }
.dot { width: 16px; height: 16px; border-radius: 50%; background: rgba(31, 41, 55, 0.12); transition: background var(--dur-base); }
.dot.is-done { background: var(--good); animation: cp-pop var(--dur-slow) var(--spring-bouncy); }
.praise { font-size: 40px; font-weight: 800; color: var(--good); animation: pop-in var(--dur-slow) var(--spring-bouncy); margin: 0; }
@keyframes pop-in { from { transform: scale(0.4); opacity: 0; } }

/* Components: fishing */
.pond-q { font-size: 28px; display: flex; align-items: center; gap: 12px; justify-content: center; flex-wrap: wrap; font-weight: 800; }
.pond { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; width: 100%; max-width: 780px; padding: 12px; }
.fish {
  position: relative; min-height: 112px; border: none; background: none;
  animation: rise-in var(--dur-slow) var(--spring) backwards, bob 2.6s ease-in-out infinite;
}
.fish__body { font-size: 86px; display: block; filter: drop-shadow(0 6px 8px rgba(8, 47, 73, 0.25)); }
.fish__char {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-family: var(--hanzi); font-size: 42px; color: #fff; text-shadow: 0 2px 6px rgba(8, 47, 73, 0.6);
}
.fish.is-caught { animation: none; transform: translateY(-14px) scale(1.1); filter: drop-shadow(0 0 12px #fff); }
.fish.is-right { animation: none; filter: drop-shadow(0 0 14px var(--good)); }
.fish.is-missed { animation: wobble 0.45s 2; }
.fish.is-oops { animation: none; opacity: 0.4; }
@keyframes bob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
.bubbles { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
.bubble-opt {
  width: 140px; height: 140px; border-radius: 50%; border: 3px solid rgba(255, 255, 255, 0.9); font-family: var(--hanzi); font-size: 66px;
  background: radial-gradient(circle at 30% 28%, #fff 0%, #e6f4ff 40%, #9fd1ff 100%); box-shadow: var(--shadow-2);
}
.bubble-opt.is-right { border-color: var(--good); box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.2), var(--shadow-2); }
.bubble-opt.is-oops { opacity: 0.4; }

/* Speaking */
.speak-step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.speak-step img { max-width: min(90vw, 640px); max-height: 45vh; border-radius: var(--radius); box-shadow: var(--shadow-2); }
.helpers { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.helper { background: var(--surface-glass); border-radius: 999px; padding: 8px 18px; font-size: 22px; box-shadow: var(--shadow-1); }
.passage { padding: 24px 34px; font-family: var(--hanzi); font-size: 36px; line-height: 1.8; max-width: 780px; margin: 0; }
.passage__py { font-size: 18px; color: var(--ink-soft); margin: 0; max-width: 780px; }
.rec-dot { width: 20px; height: 20px; border-radius: 50%; background: #ef4444; animation: pulse 1s infinite; display: inline-block; }
@keyframes pulse { 50% { opacity: 0.3; transform: scale(0.8); } }

/* Celebration */
.celebrate { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; text-align: center; }
.celebrate h1 { font-size: 56px; margin: 0; font-weight: 800; }
.celebrate--night { color: #fff; }
.celebrate--night .label__py { opacity: 0.85; }
.stars { font-size: 72px; display: flex; gap: 10px; min-height: 86px; }
.chest { background: none; border: none; padding: 0; }
.chest svg { overflow: visible; }
.chest:not(.is-open) svg { transform-origin: 50% 100%; animation: chest-shake 1.8s ease-in-out infinite; }
@keyframes chest-shake { 0%, 70%, 100% { transform: rotate(0); } 76% { transform: rotate(-4deg); } 84% { transform: rotate(4deg); } 92% { transform: rotate(-2deg); } }
.chest__lid { transform-box: fill-box; transform-origin: 0% 100%; transition: transform var(--dur-slow) var(--spring-bouncy); }
.chest.is-open .chest__lid { transform: translate(-8px, -30px) rotate(-30deg); }
.chest__glow { opacity: 0; transition: opacity var(--dur-slow) var(--ease-out); }
.chest.is-open .chest__glow { opacity: 1; }
.prize { font-size: 130px; animation: prize-rise var(--dur-slow) var(--spring-bouncy) backwards; }
@keyframes prize-rise { from { transform: translateY(70px) scale(0.3); opacity: 0; } }

/* Home */
.home__main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.home__name { font-size: 28px; font-weight: 800; }
.home__known { font-size: 24px; color: var(--ink-soft); font-weight: 700; }
.goal { display: flex; align-items: center; gap: 16px; padding: 12px 24px; width: min(90vw, 480px); }
.goal--reached { background: rgba(220, 252, 231, 0.9); }
.goal__emoji { font-size: 48px; }
.goal__body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.progress { height: 14px; border-radius: 999px; background: rgba(31, 41, 55, 0.08); overflow: hidden; }
.progress__fill { height: 100%; background: linear-gradient(90deg, var(--good-2), var(--good)); border-radius: 999px; transition: width var(--dur-slow) var(--spring); }
.done-today { font-size: 32px; font-weight: 800; margin: 0; }

/* Sticker book & wardrobe */
.book { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.family { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px; min-height: 150px; }
.family__icon { font-size: 40px; }
.family__name { font-size: 30px; font-family: var(--hanzi); }
.sticker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 16px; }
.sticker {
  aspect-ratio: 1; border-radius: 24px; border: 4px solid #fff; background: linear-gradient(135deg, #fde68a, #fca5a5);
  font-family: var(--hanzi); font-size: 54px; box-shadow: var(--shadow-2); transform: rotate(var(--tilt, 0deg));
  display: flex; align-items: center; justify-content: center;
}
.sticker--unknown { background: rgba(255, 255, 255, 0.5); color: var(--muted); border: 3px dashed var(--muted); box-shadow: none; }
.badges { display: flex; gap: 12px; flex-wrap: wrap; }
.badge { background: linear-gradient(180deg, #fde68a, var(--gold)); border-radius: 999px; padding: 6px 16px; font-weight: 800; box-shadow: var(--shadow-1); }
.wardrobe { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 16px; width: 100%; max-width: 720px; }
.wardrobe button { min-height: 96px; font-size: 48px; border-radius: var(--radius); border: 3px solid transparent; background: var(--surface-glass); box-shadow: var(--shadow-1); }
.wardrobe button.is-on { border-color: var(--accent); box-shadow: var(--focus); }

/* Setup */
.setup { flex: 1; display: grid; grid-template-columns: 1fr 1.1fr; gap: 28px; align-items: center; }
.setup__pet { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.setup__form { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.setup__form p { margin: 0; }
@media (orientation: portrait) { .setup { grid-template-columns: 1fr; } }
.swatch { width: 84px; height: 84px; border-radius: var(--radius); border: 3px solid transparent; background: #fff; box-shadow: var(--shadow-1); display: flex; align-items: center; justify-content: center; padding: 4px; }
.swatch.is-on { border-color: var(--accent); box-shadow: var(--focus); }
.name-input { font-size: 34px; text-align: center; padding: 10px 20px; border-radius: 999px; border: 2px solid var(--line); width: min(80vw, 300px); background: #fff; }

/* PIN pad */
.pinpad { display: grid; grid-template-columns: repeat(3, 80px); gap: 12px; justify-content: center; }
.pinpad button { height: 80px; border-radius: 24px; border: none; background: #fff; box-shadow: var(--shadow-1); font-size: 32px; font-weight: 800; }
.pin-dots { display: flex; gap: 16px; justify-content: center; }
.pin-dots span { width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--ink-soft); transition: background var(--dur-fast); }
.pin-dots span.is-filled { background: var(--ink); border-color: var(--ink); animation: pop-in var(--dur-base) var(--spring-bouncy); }
.pin-error { color: #b91c1c; margin: 0; }

/* Parent area */
.parent { font-size: 17px; }
.tabs { display: flex; gap: 4px; overflow-x: auto; }
.tab { border: none; background: none; padding: 12px 14px; border-radius: 999px; min-height: 48px; white-space: nowrap; font-weight: 700; }
.tab.is-active { background: #fff; box-shadow: var(--shadow-1); }
.parent__body { display: flex; flex-direction: column; gap: 16px; max-width: 980px; width: 100%; margin: 0 auto; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.tile { background: #fff; border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-1); display: flex; flex-direction: column; gap: 6px; }
.tile__value { font-size: 32px; font-weight: 800; }
.tile__label { color: var(--ink-soft); font-size: 15px; }
.panel { background: #fff; border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow-1); display: flex; flex-direction: column; gap: 12px; }
.panel h2 { margin: 0; font-size: 20px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field input, .field textarea, .field select { padding: 10px 12px; border: 2px solid var(--line); border-radius: 12px; background: #fff; }
.table { width: 100%; border-collapse: collapse; font-size: 16px; }
.table th, .table td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.thumbs img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 12px; }

/* Chart (single series: one hue, no legend, hover tooltip, table view) */
.chart { margin: 0; display: flex; flex-direction: column; gap: 8px; }
.chart figcaption { font-weight: 800; }
.chart__plot { position: relative; height: 140px; border-bottom: 1px solid var(--muted); padding-top: 18px; }
.chart__max { position: absolute; top: 0; left: 0; font-size: 12px; color: var(--ink-soft); }
.chart__bars { display: flex; align-items: flex-end; gap: 2px; height: 100%; }
.chart__col { flex: 1; height: 100%; display: flex; align-items: flex-end; position: relative; }
.chart__bar { width: 100%; background: var(--calm); border-radius: 4px 4px 0 0; }
.chart__col:hover .chart__bar { background: var(--calm-strong); }
.chart__col:hover::after {
  content: attr(data-tip); position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); z-index: 2;
  background: var(--ink); color: #fff; font-size: 12px; padding: 4px 8px; border-radius: 6px; white-space: nowrap;
}
.chart__axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-soft); }

/* Particles & entrances */
.particles { position: fixed; width: 0; height: 0; pointer-events: none; z-index: 60; }
.particle {
  position: absolute; left: 0; top: 0; width: 1em; height: 1em; margin: -0.5em 0 0 -0.5em; text-align: center; line-height: 1;
  font-size: 20px; color: var(--gold); text-shadow: 0 0 8px rgba(251, 191, 36, 0.7);
}
@keyframes rise-in { from { opacity: 0; transform: translateY(14px) scale(0.92); } }
.stagger > * { animation: rise-in var(--dur-slow) var(--spring) backwards; }
.stagger > :nth-child(2) { animation-delay: 40ms; }
.stagger > :nth-child(3) { animation-delay: 80ms; }
.stagger > :nth-child(4) { animation-delay: 120ms; }
.stagger > :nth-child(5) { animation-delay: 160ms; }
.stagger > :nth-child(6) { animation-delay: 200ms; }
.stagger > :nth-child(7) { animation-delay: 240ms; }
.stagger > :nth-child(8) { animation-delay: 280ms; }
.stagger > :nth-child(9) { animation-delay: 320ms; }
.stagger > :nth-child(10) { animation-delay: 360ms; }
.stagger > :nth-child(11) { animation-delay: 400ms; }
.stagger > :nth-child(n + 12) { animation-delay: 440ms; }

/* Screen transitions */
::view-transition-old(root) { animation: vt-out 200ms var(--ease-out) both; }
::view-transition-new(root) { animation: vt-in 420ms var(--spring) both; }
@keyframes vt-out { to { opacity: 0; transform: scale(0.98); } }
@keyframes vt-in { from { opacity: 0; transform: translateY(18px) scale(1.01); } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

- [ ] **Step 6: Credits.** Append to `CREDITS.md`:
```markdown
- **LXGW WenKai (霞鹜文楷)** — [lxgw/LxgwWenKai](https://github.com/lxgw/LxgwWenKai), SIL Open Font License 1.1. Subset to the app's characters as `public/fonts/wenkai.woff2`; licence text in `public/fonts/LXGWWenKai-OFL.txt`.
- **Nunito** — via `@fontsource/nunito`, SIL Open Font License 1.1.
```
In `src/parent/Credits.tsx`, add this before the passages line:
```tsx
        <li>Fonts: LXGW WenKai 霞鹜文楷 and Nunito — SIL Open Font License 1.1.</li>
```

- [ ] **Step 7: Run everything**

Run: `npx vitest run scripts/font-lib.test.ts && npm test && npm run build && ls -la public/fonts && grep -c woff2 dist/sw.js`
Expected:
- all tests pass and the build succeeds
- `public/fonts/wenkai.woff2` exists
- the service worker precache lists woff2 files (count of at least 1)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: self-hosted WenKai + Nunito fonts and modern stylesheet with motion tokens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: (R3) Motion helpers and screen transitions

**Files:**
- Create: `src/ui/motion.ts`, `src/ui/motion.test.ts`
- Modify: `src/App.tsx` (`go` goes through `withViewTransition`)

**Interfaces:**
- Produces:
  - `type Pt = { x: number; y: number }`
  - `reducedMotion(): boolean`
  - `arcPoints(from, to, lift?, steps?): Pt[]`
  - `burstVectors(count, rng, minDist?, maxDist?): BurstVector[]`, where `BurstVector = { dx; dy; rotate; scale }`
  - `burst(x, y, opts?: { count?; glyphs? }): void`
  - `flyAlong(el, to: Pt, opts?: { lift?; duration?; endScale?; fade? }): Promise<void>`
  - `withViewTransition(update: () => void): void`

- [ ] **Step 1: Write the failing test** `src/ui/motion.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../lib/random';
import { arcPoints, burst, burstVectors, flyAlong, withViewTransition } from './motion';

afterEach(() => {
  vi.unstubAllGlobals();
  document.querySelectorAll('.particles').forEach((n) => n.remove());
  delete (Element.prototype as { animate?: unknown }).animate;
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});

describe('motion geometry', () => {
  it('arcs from start to end, bowing above both', () => {
    const pts = arcPoints({ x: 0, y: 100 }, { x: 200, y: 50 }, 80, 10);
    expect(pts[0]).toEqual({ x: 0, y: 100 });
    expect(pts[10]).toEqual({ x: 200, y: 50 });
    expect(Math.min(...pts.map((p) => p.y))).toBeLessThan(50);
  });
  it('spreads burst vectors around the circle within range', () => {
    const v = burstVectors(10, mulberry32(1), 40, 90);
    expect(v).toHaveLength(10);
    for (const { dx, dy } of v) {
      const d = Math.hypot(dx, dy);
      expect(d).toBeGreaterThanOrEqual(40 - 1e-9);
      expect(d).toBeLessThanOrEqual(90 + 1e-9);
    }
  });
});

describe('motion effects', () => {
  it('does nothing where Web Animations are unavailable', async () => {
    burst(10, 10);
    expect(document.querySelector('.particles')).toBeNull();
    await expect(flyAlong(document.createElement('div'), { x: 0, y: 0 })).resolves.toBeUndefined();
  });
  it('spawns particles when Web Animations exist', () => {
    Element.prototype.animate = vi.fn(() => ({ onfinish: null, finished: Promise.resolve() })) as never;
    burst(10, 10, { count: 6 });
    expect(document.querySelectorAll('.particles .particle')).toHaveLength(6);
  });
  it('skips particles when the user prefers reduced motion', () => {
    Element.prototype.animate = vi.fn() as never;
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }));
    burst(10, 10);
    expect(document.querySelector('.particles')).toBeNull();
  });
  it('updates directly without the View Transitions API, and through it when present', () => {
    const update = vi.fn();
    withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
    const start = vi.fn((cb: () => unknown) => cb());
    (document as { startViewTransition?: unknown }).startViewTransition = start;
    withViewTransition(update);
    expect(start).toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/ui/motion.test.ts`
Expected: FAIL, because `./motion` can't be resolved.

- [ ] **Step 3: Implement `src/ui/motion.ts`**

```ts
import type { Rng } from '../lib/random';

export interface Pt {
  x: number;
  y: number;
}

export interface BurstVector {
  dx: number;
  dy: number;
  rotate: number;
  scale: number;
}

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

const canAnimate = () => typeof document !== 'undefined' && typeof document.body?.animate === 'function' && !reducedMotion();

/** Points along a quadratic arc from `from` to `to`, bowing `lift` px above the higher end. */
export function arcPoints(from: Pt, to: Pt, lift = 120, steps = 12): Pt[] {
  const c = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return { x: u * u * from.x + 2 * u * t * c.x + t * t * to.x, y: u * u * from.y + 2 * u * t * c.y + t * t * to.y };
  });
}

export function burstVectors(count: number, rng: Rng, minDist = 40, maxDist = 90): BurstVector[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.6;
    const dist = minDist + rng() * (maxDist - minDist);
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, rotate: (rng() - 0.5) * 180, scale: 0.6 + rng() * 0.8 };
  });
}

/** A short burst of sparkles at a viewport point. No-op without Web Animations or under reduced motion. */
export function burst(x: number, y: number, opts: { count?: number; glyphs?: string[] } = {}): void {
  if (!canAnimate()) return;
  const glyphs = opts.glyphs ?? ['✦', '★', '•'];
  const layer = document.createElement('div');
  layer.className = 'particles';
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;
  document.body.appendChild(layer);
  const vectors = burstVectors(opts.count ?? 10, Math.random);
  let remaining = vectors.length;
  vectors.forEach((v, i) => {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = glyphs[i % glyphs.length]!;
    layer.appendChild(p);
    const anim = p.animate(
      [
        { transform: 'translate(0, 0) scale(0.3)', opacity: 1 },
        { transform: `translate(${v.dx}px, ${v.dy}px) rotate(${v.rotate}deg) scale(${v.scale})`, opacity: 0 },
      ],
      { duration: 650, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' },
    );
    anim.onfinish = () => {
      if (--remaining === 0) layer.remove();
    };
  });
}

/** Moves an element along an upward arc to a viewport point. Resolves immediately when animation is unavailable. */
export function flyAlong(el: HTMLElement, to: Pt, opts: { lift?: number; duration?: number; endScale?: number; fade?: boolean } = {}): Promise<void> {
  if (!canAnimate() || typeof el.animate !== 'function') return Promise.resolve();
  const r = el.getBoundingClientRect();
  const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  const pts = arcPoints(from, to, opts.lift ?? 120);
  const last = pts.length - 1;
  const endScale = opts.endScale ?? 0.3;
  el.style.position = 'relative';
  el.style.zIndex = '40';
  const frames = pts.map((p, i) => ({
    transform: `translate(${p.x - from.x}px, ${p.y - from.y}px) scale(${1 + (endScale - 1) * (i / last)})`,
    opacity: opts.fade && i === last ? 0 : 1,
  }));
  return el
    .animate(frames, { duration: opts.duration ?? 650, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' })
    .finished.then(
      () => undefined,
      () => undefined,
    );
}

type TransitionDoc = Document & { startViewTransition?: (cb: () => unknown) => unknown };

/** Runs a state update inside a view transition when supported; otherwise just runs it. */
export function withViewTransition(update: () => void): void {
  const doc = typeof document !== 'undefined' ? (document as TransitionDoc) : null;
  if (!doc?.startViewTransition || reducedMotion()) {
    update();
    return;
  }
  doc.startViewTransition(() => {
    update();
    // Preact renders on the next tick; resolve after it so the new screen is captured.
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}
```

- [ ] **Step 4: Route changes animate.** In `src/App.tsx`:
- Add `import { withViewTransition } from './ui/motion';`.
- Change `const app: AppData = { ...booted, now, go: setRoute, refresh };` to:
```tsx
  const app: AppData = { ...booted, now, go: (r) => withViewTransition(() => setRoute(r)), refresh };
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/ui && npm test && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: motion helpers (bursts, arc flights, view transitions) with reduced-motion fallbacks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: (R4) The vector dragon

**Files:**
- Create: `src/ui/dragon/parts.ts`, `src/ui/dragon/parts.test.ts`, `src/ui/dragon/Dragon.tsx`, `src/ui/dragon/Dragon.test.tsx`
- Modify:
  - `src/ui/Pet.tsx` (replace entirely)
  - `src/ui/widgets.test.tsx` (replace the Pet case)
  - `src/app/PetSetup.tsx` (replace entirely)
  - `src/fun/pet.ts` (remove `STAGE_LOOKS` and `StageLook`; `PET_COLORS` keeps only `zh`)

**Interfaces:**
- Consumes: `reducedMotion` (R3), `PetColor` and `KidState` (types), `petStage` (fun/pet).
- Produces:
  - **Types:** `DragonParts`, `Body`, `Circle`, `DragonPalette`
  - **Constants:** `DRAGON_PALETTES`, `BLINK_MIN_MS`, `BLINK_MAX_MS`
  - **Functions:** `stageParts(stage)`, `accessoryAnchor(parts)`, `paletteVars(color)`, `nextBlinkDelay(rng)`
  - **Dragon:** `<Dragon stage color mood? accessory? lookAt? size? label? />`, with `DragonMood = 'happy' | 'munch' | 'comfort' | 'cheer' | null`. Passing `label={null}` makes it decorative (`aria-hidden`).
  - **Pet:** `<Pet kid known mood? bubble? size? stage? lookAt? />`, the same props as before plus `lookAt`. `PetMood` is now `DragonMood`.

- [ ] **Step 1: Write the failing tests**

`src/ui/dragon/parts.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { accessoryAnchor, BLINK_MAX_MS, BLINK_MIN_MS, DRAGON_PALETTES, nextBlinkDelay, paletteVars, stageParts } from './parts';

describe('dragon parts', () => {
  it('grows from egg to golden dragon', () => {
    const s = [0, 1, 2, 3, 4, 5].map(stageParts);
    expect(s.map((p) => p.egg)).toEqual([true, false, false, false, false, false]);
    expect(s.map((p) => p.shell)).toEqual([false, true, false, false, false, false]);
    expect(s.map((p) => p.wingScale)).toEqual([0, 0, 1, 1, 1.45, 1.45]);
    expect(s.map((p) => p.horns)).toEqual([false, false, false, true, true, true]);
    expect(s.map((p) => p.tail)).toEqual([false, false, false, true, true, true]);
    expect(s.map((p) => p.aura)).toEqual([false, false, false, false, false, true]);
  });
  it('clamps out-of-range stages', () => {
    expect(stageParts(-3).egg).toBe(true);
    expect(stageParts(9).aura).toBe(true);
  });
  it('puts accessories just above the egg or the head', () => {
    expect(accessoryAnchor(stageParts(0))).toEqual({ x: 100, y: 66, size: 40 });
    const p = stageParts(2);
    const a = accessoryAnchor(p);
    expect(a.y).toBeLessThan(p.head!.cy);
    expect(a.y).toBeGreaterThan(p.head!.cy - p.head!.r - 5);
  });
  it('exposes palette colours as CSS variables', () => {
    expect(paletteVars('blue')['--d-body']).toBe(DRAGON_PALETTES.blue.body);
    expect(Object.keys(paletteVars('gold'))).toEqual(['--d-body', '--d-belly', '--d-wing', '--d-cheek', '--d-dark']);
  });
  it('blinks every 2.5–5 seconds', () => {
    expect(nextBlinkDelay(() => 0)).toBe(BLINK_MIN_MS);
    expect(nextBlinkDelay(() => 0.999999)).toBeLessThanOrEqual(BLINK_MAX_MS);
  });
});
```

`src/ui/dragon/Dragon.test.tsx`:
```tsx
import { act, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dragon } from './Dragon';
import { accessoryAnchor, DRAGON_PALETTES, stageParts } from './parts';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const svgOf = (c: HTMLElement) => c.querySelector('svg.dragon') as SVGSVGElement;

describe('Dragon', () => {
  it('draws an egg at stage 0 and a horned, tailed dragon at stage 3', () => {
    const egg = render(<Dragon stage={0} color="green" />);
    expect(egg.container.querySelector('.dragon__egg')).toBeTruthy();
    expect(svgOf(egg.container).getAttribute('data-stage')).toBe('0');
    const big = render(<Dragon stage={3} color="green" />);
    expect(big.container.querySelector('.dragon__tail')).toBeTruthy();
    expect(big.container.querySelectorAll('.dragon__horn')).toHaveLength(2);
    expect(big.container.querySelector('.dragon__egg')).toBeNull();
  });

  it('applies the mood class and palette variables', () => {
    const { container } = render(<Dragon stage={2} color="blue" mood="munch" />);
    const svg = svgOf(container);
    expect(svg.getAttribute('class')).toContain('dragon--munch');
    expect(svg.style.getPropertyValue('--d-body')).toBe(DRAGON_PALETTES.blue.body);
  });

  it('anchors the accessory above the head', () => {
    const { container } = render(<Dragon stage={2} color="green" accessory="🎩" />);
    const hat = container.querySelector('.dragon__accessory')!;
    expect(hat.textContent).toBe('🎩');
    expect(Number(hat.getAttribute('y'))).toBe(accessoryAnchor(stageParts(2)).y);
  });

  it('looks toward the answers', () => {
    const { container } = render(<Dragon stage={2} color="green" lookAt={1} />);
    const r = stageParts(2).head!.r;
    expect((container.querySelector('.dragon__pupil') as SVGGElement).style.transform).toBe(`translateX(${0.12 * r}px)`);
  });

  it('blinks on a timer', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { container } = render(<Dragon stage={2} color="green" />);
    act(() => { vi.advanceTimersByTime(2500); });
    expect(svgOf(container).getAttribute('class')).toContain('is-blinking');
    act(() => { vi.advanceTimersByTime(150); });
    expect(svgOf(container).getAttribute('class')).not.toContain('is-blinking');
  });

  it('can be decorative', () => {
    const { container } = render(<Dragon stage={2} color="green" label={null} />);
    expect(svgOf(container).getAttribute('aria-hidden')).toBe('true');
    expect(svgOf(container).getAttribute('role')).toBeNull();
  });
});
```

In `src/ui/widgets.test.tsx`, replace the Pet test (`it('Pet grows from egg to dragon and always wears its accessory', …)`) with:
```tsx
  it('Pet shows the dragon for its stage, with accessory and bubble', () => {
    const kid = { ...DEFAULT_KID, wearing: '🎩' };
    const { rerender } = render(<Pet kid={kid} known={0} />);
    expect(screen.getByRole('img', { name: '小龙' }).getAttribute('data-stage')).toBe('0');
    expect(screen.getByText('🎩')).toBeTruthy();
    rerender(<Pet kid={kid} known={80} bubble="加油！" />);
    expect(screen.getByRole('img', { name: '小龙' }).getAttribute('data-stage')).toBe('2');
    expect(screen.getByText('加油！')).toBeTruthy();
  });
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/ui`
Expected: FAIL. `./parts` and `./Dragon` don't exist, and the Pet test fails because it finds no `data-stage`.

- [ ] **Step 3: Implement `src/ui/dragon/parts.ts`**

```ts
import type { PetColor } from '../../types';

export interface Circle {
  cy: number;
  r: number;
}

export interface Body {
  cy: number;
  rx: number;
  ry: number;
}

export interface DragonParts {
  egg: boolean;
  shell: boolean;
  wingScale: number;
  horns: boolean;
  tail: boolean;
  aura: boolean;
  head: Circle | null;
  body: Body | null;
}

/** Geometry per growth stage, in a 200×200 viewBox. */
export function stageParts(stage: number): DragonParts {
  const s = Math.max(0, Math.min(5, Math.round(stage)));
  const none = { egg: false, shell: false, wingScale: 0, horns: false, tail: false, aura: false };
  if (s === 0) return { ...none, egg: true, head: null, body: null };
  if (s === 1) return { ...none, shell: true, head: { cy: 108, r: 46 }, body: null };
  if (s === 2) return { ...none, wingScale: 1, head: { cy: 86, r: 44 }, body: { cy: 150, rx: 42, ry: 36 } };
  if (s === 3) return { ...none, wingScale: 1, horns: true, tail: true, head: { cy: 80, r: 42 }, body: { cy: 148, rx: 46, ry: 40 } };
  return { ...none, wingScale: 1.45, horns: true, tail: true, aura: s === 5, head: { cy: 74, r: 40 }, body: { cy: 146, rx: 50, ry: 44 } };
}

/** Where an accessory emoji sits: its baseline just inside the top of the egg or head. */
export function accessoryAnchor(parts: DragonParts): { x: number; y: number; size: number } {
  if (!parts.head) return { x: 100, y: 66, size: 40 };
  const size = Math.round(parts.head.r * 0.95);
  return { x: 100, y: parts.head.cy - parts.head.r + Math.round(size * 0.3), size };
}

export interface DragonPalette {
  body: string;
  belly: string;
  wing: string;
  cheek: string;
  dark: string;
}

export const DRAGON_PALETTES: Record<PetColor, DragonPalette> = {
  green: { body: '#5bc98c', belly: '#e8f8d8', wing: '#3fa36c', cheek: '#ff9fb0', dark: '#2e6b4a' },
  blue: { body: '#5aa9f0', belly: '#e3f1ff', wing: '#3b82d6', cheek: '#ffa3b5', dark: '#234e7e' },
  purple: { body: '#a98bf0', belly: '#f1ebff', wing: '#7e5bd6', cheek: '#ffa3c8', dark: '#4a3488' },
  red: { body: '#f07a6a', belly: '#ffe9e2', wing: '#d65745', cheek: '#ffc2a8', dark: '#7e2e24' },
  gold: { body: '#f6c343', belly: '#fff6d6', wing: '#e0a21e', cheek: '#ff9f7a', dark: '#7a5a10' },
};

export function paletteVars(color: PetColor): Record<string, string> {
  const p = DRAGON_PALETTES[color];
  return { '--d-body': p.body, '--d-belly': p.belly, '--d-wing': p.wing, '--d-cheek': p.cheek, '--d-dark': p.dark };
}

export const BLINK_MIN_MS = 2500;
export const BLINK_MAX_MS = 5000;

export function nextBlinkDelay(rng: () => number): number {
  return BLINK_MIN_MS + rng() * (BLINK_MAX_MS - BLINK_MIN_MS);
}
```

- [ ] **Step 4: Implement `src/ui/dragon/Dragon.tsx`**

```tsx
import { useEffect, useState } from 'preact/hooks';
import type { PetColor } from '../../types';
import { reducedMotion } from '../motion';
import { accessoryAnchor, nextBlinkDelay, paletteVars, stageParts, type Body, type Circle } from './parts';

export type DragonMood = 'happy' | 'munch' | 'comfort' | 'cheer' | null;

interface Props {
  stage: number;
  color: PetColor;
  mood?: DragonMood;
  accessory?: string | null;
  lookAt?: number; // -1 (left) … 1 (right)
  size?: number;
  label?: string | null; // null → decorative
}

const BLINK_MS = 140;

function useBlink(enabled: boolean): boolean {
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (!enabled || reducedMotion()) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlinking(true);
        timer = setTimeout(() => {
          setBlinking(false);
          schedule();
        }, BLINK_MS);
      }, nextBlinkDelay(Math.random));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [enabled]);
  return blinking;
}

export function Dragon({ stage, color, mood = null, accessory = null, lookAt = 0, size = 160, label = '小龙' }: Props) {
  const parts = stageParts(stage);
  const blinking = useBlink(!parts.egg);
  const look = Math.max(-1, Math.min(1, lookAt)) * 0.12;
  const anchor = accessoryAnchor(parts);
  const cls = `dragon dragon--stage${stage}${mood ? ` dragon--${mood}` : ''}${blinking ? ' is-blinking' : ''}`;
  const a11y = label === null ? { 'aria-hidden': 'true' as const } : { role: 'img', 'aria-label': label };
  return (
    <svg class={cls} viewBox="0 0 200 200" width={size} height={size} data-stage={String(stage)} style={paletteVars(color)} {...a11y}>
      <defs>
        <radialGradient id="dragon-aura">
          <stop offset="0" stop-color="#ffe9a6" stop-opacity="0.95" />
          <stop offset="1" stop-color="#ffe9a6" stop-opacity="0" />
        </radialGradient>
      </defs>
      <ellipse class="dragon__shadow" cx="100" cy="190" rx="52" ry="7" />
      {parts.aura && (
        <g class="dragon__aura">
          <circle cx="100" cy="112" r="94" fill="url(#dragon-aura)" />
        </g>
      )}
      <g class="dragon__all">
        {parts.egg ? (
          <Egg />
        ) : (
          <g class="dragon__body-group">
            {parts.tail && parts.body && <Tail body={parts.body} />}
            {parts.wingScale > 0 && parts.body && <Wings body={parts.body} scale={parts.wingScale} />}
            {parts.body && <Torso body={parts.body} />}
            {parts.head && <Head head={parts.head} horns={parts.horns} look={look} />}
            {parts.shell && (
              <path
                class="dragon__shell"
                d="M46 136 L58 124 L70 138 L84 122 L100 138 L116 122 L130 138 L142 124 L154 136 C158 172 134 192 100 192 C66 192 42 172 46 136 Z"
                fill="var(--d-belly)"
                stroke="var(--d-body)"
                stroke-width="4"
                stroke-linejoin="round"
              />
            )}
          </g>
        )}
        {accessory && (
          <text class="dragon__accessory" x={anchor.x} y={anchor.y} font-size={anchor.size} text-anchor="middle">
            {accessory}
          </text>
        )}
      </g>
      {parts.aura && (
        <>
          <Sparkle x={34} y={60} s={9} />
          <Sparkle x={170} y={72} s={7} />
          <Sparkle x={160} y={150} s={8} />
        </>
      )}
    </svg>
  );
}

function Egg() {
  return (
    <g class="dragon__egg">
      <ellipse cx="100" cy="122" rx="56" ry="68" fill="var(--d-belly)" stroke="var(--d-body)" stroke-width="4" />
      <circle cx="78" cy="98" r="11" fill="var(--d-body)" opacity="0.55" />
      <circle cx="124" cy="128" r="14" fill="var(--d-body)" opacity="0.55" />
      <circle cx="94" cy="156" r="8" fill="var(--d-body)" opacity="0.55" />
      <circle cx="128" cy="90" r="7" fill="var(--d-body)" opacity="0.55" />
      <ellipse cx="80" cy="84" rx="9" ry="16" fill="#fff" opacity="0.6" transform="rotate(-20 80 84)" />
    </g>
  );
}

function Tail({ body }: { body: Body }) {
  const x = 100 + body.rx - 10;
  const y = body.cy + body.ry - 14;
  return (
    <path
      class="dragon__tail"
      d={`M${x} ${y} C${x + 30} ${y + 6} ${x + 44} ${y - 18} ${x + 36} ${y - 44} C${x + 32} ${y - 26} ${x + 22} ${y - 14} ${x - 4} ${y - 16} Z`}
      fill="var(--d-body)"
    />
  );
}

function wingPath(x: number, y: number, f: number, dir: -1 | 1): string {
  const p = (dx: number, dy: number) => `${x + dir * dx * f} ${y + dy * f}`;
  return `M${p(0, 0)} C${p(28, -34)} ${p(40, 2)} ${p(26, 18)} C${p(18, 12)} ${p(10, 18)} ${p(0, 14)} Z`;
}

function Wings({ body, scale }: { body: Body; scale: number }) {
  const y = body.cy - body.ry * 0.45;
  return (
    <>
      <path class="dragon__wing dragon__wing--l" d={wingPath(100 - body.rx + 8, y, scale, -1)} fill="var(--d-wing)" />
      <path class="dragon__wing dragon__wing--r" d={wingPath(100 + body.rx - 8, y, scale, 1)} fill="var(--d-wing)" />
    </>
  );
}

function Torso({ body }: { body: Body }) {
  const { cy, rx, ry } = body;
  return (
    <g class="dragon__torso">
      <ellipse cx="100" cy={cy} rx={rx} ry={ry} fill="var(--d-body)" />
      <ellipse cx="100" cy={cy + 6} rx={rx * 0.62} ry={ry * 0.72} fill="var(--d-belly)" />
      <path
        d={`M${100 - rx * 0.4} ${cy - 2} h${rx * 0.8} M${100 - rx * 0.45} ${cy + 12} h${rx * 0.9}`}
        stroke="var(--d-body)"
        stroke-opacity="0.25"
        stroke-width="3"
        stroke-linecap="round"
      />
      <ellipse cx={100 - rx * 0.5} cy={cy + ry - 4} rx="13" ry="8" fill="var(--d-wing)" />
      <ellipse cx={100 + rx * 0.5} cy={cy + ry - 4} rx="13" ry="8" fill="var(--d-wing)" />
    </g>
  );
}

function Head({ head, horns, look }: { head: Circle; horns: boolean; look: number }) {
  const { cy, r } = head;
  const eye = (side: -1 | 1) => {
    const ex = 100 + side * r * 0.38;
    const ey = cy - r * 0.05;
    const rx = r * 0.24;
    const ry = r * 0.28;
    return (
      <g key={side}>
        <ellipse cx={ex} cy={ey} rx={rx} ry={ry} fill="#fff" />
        <g class="dragon__pupil" style={{ transform: `translateX(${look * r}px)` }}>
          <circle cx={ex} cy={ey + ry * 0.12} r={r * 0.14} fill="#1f2937" />
          <circle cx={ex - r * 0.05} cy={ey - ry * 0.18} r={r * 0.05} fill="#fff" />
        </g>
        <ellipse class="dragon__eyelid" cx={ex} cy={ey} rx={rx + 1} ry={ry + 1} fill="var(--d-body)" />
      </g>
    );
  };
  const horn = (side: -1 | 1) => (
    <path
      key={`h${side}`}
      class="dragon__horn"
      d={`M${100 + side * r * 0.55} ${cy - r * 0.62} q${side * r * 0.05} ${-r * 0.55} ${-side * r * 0.28} ${-r * 0.52} q${side * r * 0.1} ${r * 0.25} ${-side * r * 0.05} ${r * 0.42} Z`}
      fill="var(--d-wing)"
    />
  );
  return (
    <g class="dragon__head">
      {horns && [horn(-1), horn(1)]}
      <circle cx="100" cy={cy} r={r} fill="var(--d-body)" />
      <ellipse cx="100" cy={cy + r * 0.42} rx={r * 0.5} ry={r * 0.32} fill="var(--d-belly)" />
      {eye(-1)}
      {eye(1)}
      <ellipse cx={100 - r * 0.62} cy={cy + r * 0.3} rx={r * 0.16} ry={r * 0.1} fill="var(--d-cheek)" opacity="0.7" />
      <ellipse cx={100 + r * 0.62} cy={cy + r * 0.3} rx={r * 0.16} ry={r * 0.1} fill="var(--d-cheek)" opacity="0.7" />
      <circle cx={100 - r * 0.12} cy={cy + r * 0.32} r={r * 0.035} fill="var(--d-dark)" />
      <circle cx={100 + r * 0.12} cy={cy + r * 0.32} r={r * 0.035} fill="var(--d-dark)" />
      <path
        class="dragon__smile"
        d={`M${100 - r * 0.16} ${cy + r * 0.5} Q100 ${cy + r * 0.64} ${100 + r * 0.16} ${cy + r * 0.5}`}
        fill="none"
        stroke="var(--d-dark)"
        stroke-width="3"
        stroke-linecap="round"
      />
      <ellipse class="dragon__mouth-open" cx="100" cy={cy + r * 0.56} rx={r * 0.14} ry={r * 0.12} fill="var(--d-dark)" />
    </g>
  );
}

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      class="dragon__sparkle"
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`}
      fill="#ffd54a"
    />
  );
}
```

- [ ] **Step 5: Replace `src/ui/Pet.tsx`**

```tsx
import { petStage } from '../fun/pet';
import type { KidState } from '../types';
import { Dragon, type DragonMood } from './dragon/Dragon';

export type PetMood = DragonMood;

interface Props {
  kid: KidState;
  known: number;
  mood?: PetMood;
  bubble?: string | null;
  size?: number;
  stage?: number; // override, e.g. to show the previous stage during evolution
  lookAt?: number;
}

export function Pet({ kid, known, mood = null, bubble = null, size = 120, stage, lookAt = 0 }: Props) {
  return (
    <div class="pet">
      {bubble && (
        <div class="pet__bubble" key={bubble}>
          {bubble}
        </div>
      )}
      <Dragon
        stage={stage ?? petStage(known)}
        color={kid.petColor}
        mood={mood}
        accessory={kid.wearing}
        lookAt={lookAt}
        size={size}
        label={kid.petName}
      />
    </div>
  );
}
```

- [ ] **Step 6: Tidy `src/fun/pet.ts`**
- Delete the `StageLook` interface and the `STAGE_LOOKS` array.
- Replace `PET_COLORS` with:
```ts
export const PET_COLORS: Record<PetColor, { zh: string }> = {
  green: { zh: '绿色' },
  blue: { zh: '蓝色' },
  purple: { zh: '紫色' },
  red: { zh: '红色' },
  gold: { zh: '金色' },
};
```

- [ ] **Step 7: Replace `src/app/PetSetup.tsx`.** It's a two-column layout that fits a 1024×768 screen.

```tsx
import { useState } from 'preact/hooks';
import { PET_COLORS } from '../fun/pet';
import { saveKid } from '../store/repo';
import { DEFAULT_KID, type PetColor } from '../types';
import { Dragon } from '../ui/dragon/Dragon';
import { Label } from '../ui/Label';
import { useApp } from './AppContext';

const COLORS: PetColor[] = ['green', 'blue', 'purple', 'red', 'gold'];

export function PetSetup() {
  const { db, go, refresh } = useApp();
  const [name, setName] = useState(DEFAULT_KID.petName);
  const [color, setColor] = useState<PetColor>('green');

  const done = async () => {
    await saveKid(db, { ...DEFAULT_KID, petName: name.trim() || DEFAULT_KID.petName, petColor: color });
    await refresh();
    go({ name: 'placement' });
  };

  return (
    <div class="screen">
      <div class="setup">
        <div class="setup__pet">
          <Dragon stage={0} color={color} size={240} label={name.trim() || DEFAULT_KID.petName} />
          <h1><Label zh="这是你的龙蛋！" /></h1>
        </div>
        <div class="setup__form">
          <p><Label zh="给你的小龙起个名字" /></p>
          <input class="name-input" aria-label="Pet name" maxLength={6} value={name} onInput={(e) => setName(e.currentTarget.value)} />
          <p><Label zh="选一个颜色" /></p>
          <div class="row stagger">
            {COLORS.map((c) => (
              <button key={c} type="button" class={`swatch ${c === color ? 'is-on' : ''}`} aria-label={PET_COLORS[c].zh} aria-pressed={c === color} onClick={() => setColor(c)}>
                <Dragon stage={2} color={c} size={70} label={null} />
              </button>
            ))}
          </div>
          <button type="button" class="btn btn--primary btn--big" onClick={() => void done()}>
            <Label zh="好了！" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run all tests**

Run: `npm test && npx tsc --noEmit`
Expected: all pass. `PetSetup` still saves the colour, because the swatch `aria-label`s are unchanged.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: animated vector dragon mascot (6 stages, palettes, blinking, gaze, moods) and roomier pet setup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: (R5) Scenes and the session progress bar

**Files:**
- Create: `src/ui/Scene.tsx`, `src/ui/ProgressBar.tsx`, `src/session/progress.ts`, `src/session/progress.test.ts`, `src/ui/scenery.test.tsx`
- Modify:
  - `src/app/SessionScreen.tsx`: header and scene
  - Add `<Scene>` to `src/app/HomeScreen.tsx`, `PlacementScreen.tsx`, `PetSetup.tsx`, `StickerBook.tsx` and `Wardrobe.tsx`

**Interfaces:**
- Produces:
  - `sessionProgress(rec: SessionRecord): number` (0–1)
  - `type SceneKind = 'home' | 'sky' | 'desk' | 'pond' | 'stage' | 'night'`, `<Scene kind />`
  - `<ProgressBar steps stepIndex fraction />`

- [ ] **Step 1: Write the failing tests**

`src/session/progress.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { SessionPlan } from '../types';
import { sessionProgress } from './progress';
import { afterFlashAnswer, afterWriteWord, createSessionRecord, finishStep } from './runner';

const plan: SessionPlan = {
  steps: ['flashcards', 'writing'], reviewWordIds: ['a', 'b', 'c', 'd'], newWordIds: [],
  flashTimeBoxMs: 1_000_000, writeCandidates: [{ wordId: 'w', isNew: false }, { wordId: 'x', isNew: false }], writeCount: 2,
};

describe('sessionProgress', () => {
  it('starts at 0 and counts progress within the current step', () => {
    let rec = createSessionRecord(plan, 'd', 0);
    expect(sessionProgress(rec)).toBe(0);
    rec = afterFlashAnswer(rec, true, 10);
    expect(sessionProgress(rec)).toBeCloseTo(0.125);
    rec = finishStep(rec);
    expect(sessionProgress(rec)).toBe(0.5);
    rec = afterWriteWord(rec, true, 10);
    expect(sessionProgress(rec)).toBe(0.75);
  });
  it('uses the time box when it is further along than the card count', () => {
    const rec = { ...createSessionRecord({ ...plan, flashTimeBoxMs: 100 }, 'd', 0), flashElapsedMs: 50 };
    expect(sessionProgress(rec)).toBe(0.25);
  });
  it('is complete when the session is', () => {
    expect(sessionProgress(createSessionRecord({ ...plan, steps: [] }, 'd', 0))).toBe(1);
  });
});
```

`src/ui/scenery.test.tsx`:
```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';
import { Scene } from './Scene';

describe('Scene', () => {
  it('renders the requested scene with its decorations', () => {
    const { container } = render(<Scene kind="pond" />);
    expect(container.querySelector('.scene--pond')).toBeTruthy();
    expect(container.querySelectorAll('.scene__waves')).toHaveLength(2);
    expect(container.querySelector('.scene')!.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('ProgressBar', () => {
  it('fills to the fraction and marks finished checkpoints', () => {
    const { container } = render(<ProgressBar steps={['flashcards', 'writing', 'components']} stepIndex={1} fraction={0.5} />);
    expect(container.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('50');
    expect((container.querySelector('.progressbar__fill') as HTMLElement).style.width).toBe('50%');
    expect(container.querySelectorAll('.progressbar__cp.is-done')).toHaveLength(1);
    expect(container.querySelectorAll('.progressbar__cp.is-current')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/session/progress.test.ts src/ui/scenery.test.tsx`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Implement**

`src/session/progress.ts`:
```ts
import type { SessionRecord } from '../types';
import { currentStep } from './runner';

/** Overall session progress, 0–1: finished steps plus the fraction done within the current one. */
export function sessionProgress(rec: SessionRecord): number {
  const n = rec.plan.steps.length;
  if (!n || rec.completed) return 1;
  const step = currentStep(rec);
  let within = 0;
  if (step === 'flashcards') {
    const byCards = rec.flashQueue.length ? rec.flashIndex / rec.flashQueue.length : 0;
    const byTime = Number.isFinite(rec.plan.flashTimeBoxMs) && rec.plan.flashTimeBoxMs > 0 ? rec.flashElapsedMs / rec.plan.flashTimeBoxMs : 0;
    within = Math.max(byCards, byTime);
  } else if (step === 'writing') {
    within = rec.plan.writeCount ? rec.writeDone / rec.plan.writeCount : 0;
  }
  return Math.min(1, (rec.stepIndex + Math.min(1, within)) / n);
}
```

`src/ui/ProgressBar.tsx`:
```tsx
import type { StepKind } from '../types';

const ICONS: Record<StepKind, string> = { flashcards: '🐲', writing: '✍️', components: '🎣', speaking: '🎤' };

export function ProgressBar({ steps, stepIndex, fraction }: { steps: StepKind[]; stepIndex: number; fraction: number }) {
  const pct = Math.round(fraction * 100);
  return (
    <div class="progressbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div class="progressbar__track">
        <div class="progressbar__fill" style={{ width: `${pct}%` }} />
      </div>
      {steps.map((s, i) => (
        <span
          key={s}
          class={`progressbar__cp ${i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : ''}`}
          style={{ left: `${((i + 1) / steps.length) * 100}%` }}
          aria-hidden="true"
        >
          {ICONS[s]}
        </span>
      ))}
    </div>
  );
}
```

`src/ui/Scene.tsx`:
```tsx
export type SceneKind = 'home' | 'sky' | 'desk' | 'pond' | 'stage' | 'night';

const CLOUDS = [
  { top: '7%', w: 180, dur: 70, delay: -10 },
  { top: '17%', w: 120, dur: 95, delay: -55 },
  { top: '29%', w: 150, dur: 82, delay: -30 },
];
const WAVE = 'M0 60 Q75 20 150 60 T300 60 T450 60 T600 60 T750 60 T900 60 T1050 60 T1200 60 V120 H0 Z';
const STARS = Array.from({ length: 24 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 60, d: (i % 6) * 0.4 }));

/** Decorative full-screen background with slow ambient motion. */
export function Scene({ kind }: { kind: SceneKind }) {
  return (
    <div class={`scene scene--${kind}`} aria-hidden="true">
      {(kind === 'home' || kind === 'sky') &&
        CLOUDS.map((c, i) => (
          <svg
            key={i}
            class="scene__cloud"
            viewBox="0 0 120 60"
            style={{ top: c.top, width: `${c.w}px`, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
          >
            <path d="M20 50 a18 18 0 0 1 4 -35 a24 24 0 0 1 44 -6 a20 20 0 0 1 34 14 a16 16 0 0 1 -2 27 Z" />
          </svg>
        ))}
      {kind === 'home' && (
        <svg class="scene__hills" viewBox="0 0 1000 300" preserveAspectRatio="none">
          <path d="M0 180 Q250 90 500 170 T1000 150 V300 H0 Z" fill="#b8e6a0" />
          <path d="M0 230 Q300 160 620 230 T1000 220 V300 H0 Z" fill="#8fd47a" />
        </svg>
      )}
      {kind === 'pond' && (
        <>
          <svg class="scene__waves scene__waves--back" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d={WAVE} fill="#5bb6dd" />
          </svg>
          <svg class="scene__waves" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d={WAVE} fill="#3fa4d1" />
          </svg>
        </>
      )}
      {kind === 'desk' && <div class="scene__desk" />}
      {kind === 'night' &&
        STARS.map((s, i) => <span key={i} class="scene__star" style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.d}s` }} />)}
    </div>
  );
}
```

- [ ] **Step 4: Wire the screens**

In `src/app/SessionScreen.tsx`:
- Delete the `STEP_ICONS` constant.
- Add these imports:
```tsx
import { sessionProgress } from '../session/progress';
import { ProgressBar } from '../ui/ProgressBar';
import { Scene, type SceneKind } from '../ui/Scene';
```
- Add near the top:
```tsx
const SCENES: Record<StepKind, SceneKind> = { flashcards: 'sky', writing: 'desk', components: 'pond', speaking: 'stage' };
```
- Replace the returned `<div class="screen">` opening and its whole `<header>` with:
```tsx
    <div class="screen">
      <Scene kind={step ? SCENES[step] : 'sky'} />
      <header class="stepbar">
        <button type="button" class="btn btn--ghost" aria-label="回家" onClick={() => go({ name: 'home' })}>🏠</button>
        <ProgressBar steps={rec.plan.steps} stepIndex={rec.stepIndex} fraction={sessionProgress(rec)} />
        {combo >= 3 && <span class="combo">🔥 {combo}</span>}
      </header>
```

In each of these, add `import { Scene } from '../ui/Scene';` and insert `<Scene kind="home" />` as the first child of the outermost `<div class="screen">` (the loading-state returns stay as they are):
- `HomeScreen.tsx`
- `PlacementScreen.tsx` (both returns that render `class="screen"` with content)
- `PetSetup.tsx`
- `StickerBook.tsx`
- `Wardrobe.tsx`

- [ ] **Step 5: Run all tests**

Run: `npm test && npx tsc --noEmit`
Expected: all pass. The session tests don't depend on the old step icons.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ambient scenes per activity and a filling session progress bar with checkpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: (R6) Juicier activity feedback

**Files:**
- Modify: `src/activities/flashcards/FlashcardStep.tsx`, `src/activities/components/ComponentsStep.tsx`, `src/activities/writing/WritingStep.tsx`, `src/app/StickerBook.tsx`, `src/app/Wardrobe.tsx`
- Test:
  - `src/activities/flashcards/FlashcardStep.test.tsx`: mock motion, plus new cases
  - `src/activities/components/ComponentsStep.test.tsx`: mock motion, plus a new case

**Interfaces:**
- Consumes: `burst` and `flyAlong` (R3); `Pet` with `lookAt` (R4).
- Behaviour:
  - **Correct flashcard:**
    - a burst at the tile, and the tile flies along an arc into the dragon
    - the pet looks at the answers during the quiz
  - **Fishing:**
    - a burst when a fish is caught
    - when the check is all right: bursts on every answer
  - **Which-part:** a burst on the correct bubble.
  - **Writing:** a burst over the 田字格 when a character is finished.
  - **Staggered entrances:**
    - `.stagger` on `.choices`, `.bubbles`, `.sticker-grid`, `.book` and `.wardrobe`
    - the fish already stagger by inline delay

- [ ] **Step 1: Write the failing tests**

At the top of `src/activities/flashcards/FlashcardStep.test.tsx`, add after the existing `vi.mock` lines:
```tsx
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { burst, flyAlong } from '../../ui/motion';
```
Append:
```tsx
describe('feedback effects', () => {
  it('bursts and feeds the tile to the dragon on a correct answer, once', () => {
    vi.mocked(burst).mockClear();
    vi.mocked(flyAlong).mockClear();
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={onDone} />);
    const right = screen.getByRole('button', { name: he.pinyin });
    fireEvent.click(right);
    fireEvent.click(right);
    expect(burst).toHaveBeenCalledTimes(1);
    expect(flyAlong).toHaveBeenCalledWith(right, expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }), expect.anything());
    fireEvent.click(screen.getByText('下一个'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('does not celebrate a wrong answer', () => {
    vi.mocked(burst).mockClear();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    expect(burst).not.toHaveBeenCalled();
  });
});
```

At the top of `src/activities/components/ComponentsStep.test.tsx`, add:
```tsx
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), reducedMotion: () => false }));
import { burst } from '../../ui/motion';
```
Append:
```tsx
describe('fishing effects', () => {
  it('splashes when a fish is caught and when the catch is all right', () => {
    vi.mocked(burst).mockClear();
    render(<ComponentsStep questions={questions} kid={DEFAULT_KID} known={20} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '河' }));
    expect(burst).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '汉' }));
    fireEvent.click(screen.getByText('检查'));
    expect(burst).toHaveBeenCalledTimes(4);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/activities`
Expected: the new cases FAIL, because `burst` is never called.

- [ ] **Step 3: Implement**

**`FlashcardStep.tsx`:**
- Add `import { burst, flyAlong } from '../../ui/motion';`.
- Inside the component, after the `quizAt` ref, add:
```tsx
  const petRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
```
- In `choose`, replace the `if (correct) { … } else { … }` sound block with:
```tsx
    const btn = optionRefs.current.get(option);
    if (correct) {
      playSfx('munch');
      setTimeout(() => playSfx('correct'), 250);
      if (btn) {
        const r = btn.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
        const p = petRef.current?.getBoundingClientRect();
        if (p) void flyAlong(btn, { x: p.left + p.width / 2, y: p.top + p.height * 0.6 }, { endScale: 0.2, fade: true });
      }
    } else {
      playSfx('wrong');
    }
```
- Change `<div class="flash__pet">` to `<div class="flash__pet" ref={petRef}>`.
- Give the `Pet` the extra prop `lookAt={phase === 'quiz' ? 0.8 : 0}`.
- Change the choices container class to ``class={`choices stagger ${quiz.listen ? 'choices--hanzi' : 'choices--pinyin'}`}``.
- Add to each choice button:
```tsx
                  ref={(el) => {
                    if (el) optionRefs.current.set(o, el);
                  }}
```

**`ComponentsStep.tsx`:**
- Add `import { burst } from '../../ui/motion';`.
- Add this helper at module level:
```tsx
const splash = (el: Element | null | undefined, count = 8) => {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, { count, glyphs: ['💧', '✦', '•'] });
};
```
- In `TapAll`, add `const fishRefs = useRef(new Map<string, HTMLButtonElement>());` (import `useRef` from `preact/hooks`).
- Change `toggle` to:
```tsx
  const toggle = (c: string) => {
    if (checked) return;
    const next = new Set(caught);
    if (next.has(c)) next.delete(c);
    else {
      next.add(c);
      splash(fishRefs.current.get(c), 6);
    }
    setCaught(next);
  };
```
- Change the check button's `onClick` to:
```tsx
onClick={() => {
  if (allRight) q.answers.forEach((a) => splash(fishRefs.current.get(a)));
  onCheck(allRight);
}}
```
- Add `ref={(el) => { if (el) fishRefs.current.set(c, el); }}` to each fish button.
- In `WhichPart`, change each bubble's `onClick` to:
```tsx
onClick={(e) => {
  setPicked(o);
  if (o === q.component) splash(e.currentTarget, 10);
  onCheck(o === q.component);
}}
```
- Change `<div class="bubbles">` to `<div class="bubbles stagger">`.

**`WritingStep.tsx`:**
- Add `import { burst } from '../../ui/motion';`.
- Inside the quiz `onComplete`, after `playSfx('star');`, add:
```tsx
        const r = host.current?.getBoundingClientRect();
        if (r) burst(r.left + r.width / 2, r.top + r.height / 2, { count: summary.totalMistakes === 0 ? 14 : 8 });
```

**Stagger classes:**
- In `StickerBook.tsx`: `class="sticker-grid"` → `class="sticker-grid stagger"` (both occurrences), and `class="book"` → `class="book stagger"`.
- In `Wardrobe.tsx`: `class="wardrobe"` → `class="wardrobe stagger"`.

- [ ] **Step 4: Run all tests**

Run: `npm test && npx tsc --noEmit`
Expected: all pass, including the double-tap case (`burst` once, `onDone` once).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: bursts, arc-flight feeding, gaze and staggered entrances in activities

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: (R7) Treasure chest and flying-star celebration

**Files:**
- Create: `src/ui/Chest.tsx`
- Modify: `src/app/Celebration.tsx` (replace entirely)
- Test:
  - `src/ui/scenery.test.tsx` (add a Chest case)
  - `src/app/SessionScreen.test.tsx` (add a star-counter assertion)

**Interfaces:**
- Consumes: `flyAlong`, `burst` (R3); `Scene` (R5); `totalStars` (stats); `allSessions` (repo).
- Produces: `<Chest open onOpen />`.
- Behaviour:
  - The celebration shows a ⭐ counter chip. Earned stars fly into it one by one; each landing bumps the chip and plays a sound.
  - The chest uses a burst, not confetti.

- [ ] **Step 1: Write the failing tests**

Append to `src/ui/scenery.test.tsx`:
```tsx
import { fireEvent } from '@testing-library/preact';
import { vi } from 'vitest';
import { Chest } from './Chest';

describe('Chest', () => {
  it('opens on tap', () => {
    const onOpen = vi.fn();
    const { container, rerender } = render(<Chest open={false} onOpen={onOpen} />);
    fireEvent.click(container.querySelector('button')!);
    expect(onOpen).toHaveBeenCalled();
    rerender(<Chest open onOpen={onOpen} />);
    expect(container.querySelector('.chest')!.className).toContain('is-open');
  });
});
```
Merge these imports with the file's existing `import` lines rather than duplicating them.

In `src/app/SessionScreen.test.tsx`, in the first test, after `expect(await screen.findByText('太棒了！')).toBeTruthy();`, add:
```tsx
    expect(await screen.findByText('⭐ 1')).toBeTruthy();
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/ui/scenery.test.tsx src/app/SessionScreen.test.tsx`
Expected: FAIL. `./Chest` is missing, and there's no `⭐ 1` counter.

- [ ] **Step 3: Implement**

`src/ui/Chest.tsx`:
```tsx
export function Chest({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  return (
    <button type="button" class={`chest ${open ? 'is-open' : ''}`} aria-label="打开宝箱" onClick={onOpen} disabled={open}>
      <svg viewBox="0 0 160 140" width="210" height="184" aria-hidden="true">
        <defs>
          <radialGradient id="chest-glow">
            <stop offset="0" stop-color="#ffe9a6" stop-opacity="0.95" />
            <stop offset="1" stop-color="#ffe9a6" stop-opacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="80" cy="132" rx="60" ry="6" fill="rgba(31,41,55,0.14)" />
        <circle class="chest__glow" cx="80" cy="58" r="62" fill="url(#chest-glow)" />
        <rect x="20" y="62" width="120" height="66" rx="12" fill="#c77b30" />
        <rect x="20" y="62" width="120" height="14" fill="#a8611f" />
        <rect x="72" y="62" width="16" height="66" fill="#f6c343" />
        <rect x="70" y="80" width="20" height="18" rx="5" fill="#f6c343" stroke="#b8860b" stroke-width="2" />
        <g class="chest__lid">
          <path d="M20 62 V46 Q20 18 80 18 Q140 18 140 46 V62 Z" fill="#d98a3d" />
          <rect x="72" y="18" width="16" height="44" fill="#f6c343" />
          <path d="M30 40 Q80 24 130 40" stroke="rgba(255,255,255,0.35)" stroke-width="4" fill="none" stroke-linecap="round" />
        </g>
      </svg>
    </button>
  );
}
```

`src/app/Celebration.tsx`:
```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { BUILTIN } from '../content';
import { radicalMeaning } from '../content/radicals';
import { canOpenChest, openChest, petStage, type ChestResult } from '../fun/pet';
import { newBadges, stickerFamilies } from '../fun/stickers';
import { localDateKey } from '../lib/date';
import { totalStars } from '../stats/stats';
import { allSessions, getKid, saveKid } from '../store/repo';
import { DEFAULT_KID, type KidState, type SessionRecord } from '../types';
import { Chest } from '../ui/Chest';
import { celebrate } from '../ui/confetti';
import { Label } from '../ui/Label';
import { burst, flyAlong } from '../ui/motion';
import { Pet } from '../ui/Pet';
import { Scene } from '../ui/Scene';
import { useApp } from './AppContext';
import { loadKnowledge } from './knowledge';

type Phase = 'stars' | 'chest' | 'evolve' | 'badges';

interface Sequence {
  order: Phase[];
  stage: number;
  fromStage: number;
  badges: string[];
  known: number;
  starsBefore: number;
}

export function Celebration({ rec }: { rec: SessionRecord }) {
  const { db, now, go, refresh } = useApp();
  const today = localDateKey(now());
  const kidRef = useRef<KidState>(DEFAULT_KID);
  const counterRef = useRef<HTMLSpanElement>(null);
  const chestRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [kid, setKid] = useState<KidState | null>(null);
  const [seq, setSeq] = useState<Sequence | null>(null);
  const [phase, setPhase] = useState<Phase>('stars');
  const [chest, setChest] = useState<ChestResult | null>(null);
  const [landed, setLanded] = useState(0);
  const stars = rec.free ? 0 : rec.completedSteps.length;

  useEffect(() => {
    celebrate();
    void (async () => {
      const [k, know, sessions] = await Promise.all([getKid(db), loadKnowledge(db), allSessions(db)]);
      const kidNow = k ?? DEFAULT_KID;
      const stage = petStage(know.known);
      const badges = newBadges(stickerFamilies(BUILTIN), know.knownChars, kidNow.badgesSeen);
      const order: Phase[] = ['stars'];
      if (!rec.free && canOpenChest(kidNow, today)) order.push('chest');
      if (stage > kidNow.lastStageSeen) order.push('evolve');
      if (badges.length) order.push('badges');
      kidRef.current = kidNow;
      setKid(kidNow);
      setSeq({ order, stage, fromStage: kidNow.lastStageSeen, badges, known: know.known, starsBefore: totalStars(sessions, kidNow.bonusStars) - stars });
    })();
  }, []);

  // Fly each earned star into the counter, one after another.
  useEffect(() => {
    if (!seq) return;
    let cancelled = false;
    void (async () => {
      for (let i = 0; i < stars; i++) {
        const el = starRefs.current[i];
        const c = counterRef.current?.getBoundingClientRect();
        if (el && c) await flyAlong(el, { x: c.left + c.width / 2, y: c.top + c.height / 2 }, { lift: 80, endScale: 0.4, fade: true, duration: 550 });
        if (cancelled) return;
        playSfx('star');
        setLanded((n) => n + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seq]);

  if (!seq || !kid) return <div class="screen loading">⭐</div>;

  const save = async (next: KidState) => {
    kidRef.current = next;
    setKid(next);
    await saveKid(db, next);
  };
  const advance = async () => {
    const nextPhase = seq.order[seq.order.indexOf(phase) + 1];
    if (!nextPhase) {
      await refresh();
      go({ name: 'home' });
      return;
    }
    if (nextPhase === 'evolve') {
      playSfx('levelUp');
      celebrate();
      await save({ ...kidRef.current, lastStageSeen: seq.stage });
    }
    if (nextPhase === 'badges') {
      playSfx('levelUp');
      celebrate();
      await save({ ...kidRef.current, badgesSeen: [...kidRef.current.badgesSeen, ...seq.badges] });
    }
    setPhase(nextPhase);
  };
  const open = async () => {
    const { kid: next, result } = openChest(kidRef.current, today);
    await save(next);
    setChest(result);
    playSfx('chest');
    const r = chestRef.current?.getBoundingClientRect();
    if (r) burst(r.left + r.width / 2, r.top + r.height * 0.35, { count: 16 });
  };

  const isLast = seq.order.indexOf(phase) === seq.order.length - 1;
  const beforeEvolve = seq.order.includes('evolve') && seq.order.indexOf(phase) < seq.order.indexOf('evolve');

  return (
    <div class="screen">
      <Scene kind="night" />
      {!rec.free && (
        <header class="topbar">
          <span class="spacer" />
          <span key={landed} ref={counterRef} class={`chip ${landed ? 'is-bumping' : ''}`}>⭐ {seq.starsBefore + landed}</span>
        </header>
      )}
      <div class="celebrate celebrate--night">
        {phase === 'stars' && (
          <>
            <h1><Label zh={rec.free ? '练习得很好！' : '太棒了！'} /></h1>
            {!rec.free && (
              <>
                <div class="stars stagger">
                  {Array.from({ length: stars }, (_, i) => (
                    <span key={i} ref={(el) => { starRefs.current[i] = el; }}>⭐</span>
                  ))}
                </div>
                <p><Label zh={`你得到了 ${stars} 颗星`} /></p>
              </>
            )}
          </>
        )}
        {phase === 'chest' && (
          <>
            <h1><Label zh={chest ? (chest.kind === 'accessory' ? `${kid.petName}有新东西了！` : `多了 ${chest.amount} 颗星！`) : '宝箱！'} /></h1>
            {chest && <div class="prize">{chest.kind === 'accessory' ? chest.item : '⭐⭐⭐'}</div>}
            <div ref={chestRef}>
              <Chest open={!!chest} onOpen={() => void open()} />
            </div>
            {!chest && <p><Label zh="点一下打开宝箱！" /></p>}
          </>
        )}
        {phase === 'evolve' && <h1><Label zh={`${kid.petName}长大了！`} /></h1>}
        {phase === 'badges' && (
          <>
            <h1><Label zh="新徽章！" /></h1>
            <div class="badges stagger">
              {seq.badges.map((b) => <span key={b} class="badge">🏅 {b} {radicalMeaning(b)?.emoji}</span>)}
            </div>
          </>
        )}
        {phase !== 'chest' && (
          <Pet
            key={phase}
            kid={kid}
            known={seq.known}
            stage={beforeEvolve ? seq.fromStage : seq.stage}
            mood={phase === 'evolve' || phase === 'badges' ? 'cheer' : 'happy'}
            size={phase === 'evolve' ? 230 : 160}
          />
        )}
        {(phase !== 'chest' || chest) && (
          <button type="button" class="btn btn--primary btn--big" onClick={() => void advance()}>
            <Label zh={isLast ? '回家' : '继续'} />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all pass and the build succeeds. In jsdom, `flyAlong` resolves immediately, so the counter reaches `⭐ 1`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: animated treasure chest and stars that fly into the counter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: (R8) Visual verification at iPad sizes

**Files:** none planned. Fix any layout issue in the file that owns it, and commit there with a short message.

- [ ] **Step 1: Serve the build**
- Run `npm run build`.
- Start the `hanzi-buddy-preview` server (`/Users/bryantan/apps/531/.claude/launch.json`) with `preview_start`.
- Delete the browser's existing IndexedDB `hanzi-buddy` first (in the pane: `indexedDB.deleteDatabase('hanzi-buddy')`, then reload), so first launch runs.

- [ ] **Step 2: Landscape, 1024×768.** Drive the UI with DOM clicks; the pane's coordinate clicks don't land under viewport emulation. Screenshot and check each of these:
  1. **PIN setup.**
  2. **Pet setup:**
     - the egg changes colour with the swatch
     - 好了！ is visible without scrolling
  3. **Placement.**
  4. **Home:**
     - clouds and hills
     - the dragon blinks and hops
     - the progress chip
  5. **Flashcards:**
     - the intro card is glassy
     - the pet's gaze shifts toward the choices
     - a correct answer bursts and flies into the dragon, which munches
     - the progress bar fills
  6. **Writing:** the desk scene and the 田字格.
  7. **Fishing:** the pond waves, a splash on catch, and the check.
  8. **Speaking:** the stage scene; the blocked microphone path offers 继续.
  9. **Celebration:**
     - the night sky
     - stars fly into the counter
     - the chest shakes, then opens with a burst and the prize
  10. **Sticker book and wardrobe:** the staggered entrance.
  11. **Parent area:** readable on the plain background.

- [ ] **Step 3: Portrait, 768×1024.**
- Check home, flashcards, pet setup, fishing and the celebration for one-column layouts.
- `document.documentElement.scrollWidth <= innerWidth` must hold on every screen, so nothing overflows horizontally.

- [ ] **Step 4: Check the fonts and the console**
- `document.fonts.check('40px WenKai', '河')` is true after load, and `.hanzi` elements compute `font-family` starting with `WenKai`.
- `read_console_messages` with `onlyErrors: true` shows nothing app-related.

- [ ] **Step 5: Reset and run the final checks**
- Reset the viewport to `desktop` and stop the preview server.
- Run `npm test && npm run build`. Everything must be green.
