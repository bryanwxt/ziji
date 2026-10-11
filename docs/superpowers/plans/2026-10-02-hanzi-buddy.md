# Hanzi Buddy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline iPad home-screen web app where an 8-year-old practises Chinese characters alone every day. It covers spaced-repetition flashcards, 听写 writing, a component game and speaking recordings, all wrapped in a pet-dragon game, plus a PIN-gated parent area.

**Architecture:**
- A Vite + Preact + TypeScript static PWA.
- All decision logic lives in pure modules, unit-tested with Vitest: scheduling, session planning, distractors, component game, placement, stats and fun rules.
- Only `src/store/` touches IndexedDB, and only `src/audio/` touches speech, the microphone or Web Audio.
- Screens are thin Preact components over those modules, switched by a small state router in `App.tsx`.

**Tech Stack:** Preact 10, Vite 7, TypeScript 5.9, Vitest 4 (jsdom + fake-indexeddb), ts-fsrs 5, idb 8, pinyin-pro 3, hanzi-writer 3 (+ hanzi-writer-data 2.0.1), canvas-confetti 1, vite-plugin-pwa 1.

**Spec:** `docs/superpowers/specs/2026-10-02-hanzi-buddy-design.md`. Read it before starting any task.

## Global Constraints

- Project root is `/Users/bryantan/apps/ziji`. All paths below are relative to it.
- Node v22.22.0, npm 10.
- Pinned major versions:
  - `preact@^10`, `vite@^7`, `vitest@^4`, `typescript@~5.9`
  - `ts-fsrs@^5`, `idb@^8`, `pinyin-pro@^3`, `hanzi-writer@^3`, `hanzi-writer-data@2.0.1`, `canvas-confetti@^1`
  - `vite-plugin-pwa@^1`, `@preact/preset-vite@^2`, `fake-indexeddb@^6`, `@testing-library/preact@^3`, `jsdom@^26`, `tsx@^4`
  - Don't upgrade majors.
- Child data never leaves the device. The only network requests are the app's own files and `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/<char>.json`.
- **Kid-facing text:**
  - Chinese, rendered with `<Label zh="…" />`, which shows pinyin above.
  - Parent-facing text is English.
- **Layout:**
  - Touch targets are at least 64px.
  - The primary layout is landscape iPad, 1024×768. It must also work in portrait (768×1024).
- **Tone:**
  - No red crosses, no point loss, no visible timers in quizzes.
  - Nothing the child has earned can ever be lost.
- **Speech:** every `speak()` call must come from a tap, or from an effect that runs directly after a tap-driven state change. The home "start" button calls `primeSpeech()`.
- **Session numbers** (from the spec):
  - Flashcard time box is `sessionMinutes × 0.4` minutes.
  - At most 60 reviews per session.
  - New cards drop to 0 when more than 40 cards are due.
  - Writing: 3 words if `sessionMinutes < 25`, otherwise 5. At most 2 new write cards a day.
  - Components game needs at least 12 known characters.
  - A passage is eligible when at least 90% of its characters are known.
  - Recordings are capped at 60 seconds; keep 100.
- **Ratings:**
  - Recognition: wrong → Again; correct and `responseMs > 6000` → Hard; otherwise Good.
  - Writing: 0 misses → Good; 1–3 → Hard; 4 or more → Again.
  - Never Easy.
- **Pet stages:** thresholds 0/25/75/150/300/500. The chest gives 3 bonus stars once all 16 accessories are owned.
- **Blob tests:** any test that stores a `Blob` in IndexedDB must start with `// @vitest-environment node`. fake-indexeddb can't structured-clone jsdom's Blob.
- **Commits:** commit after every task. Every commit message ends with a blank line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Remote:** never create a GitHub remote, push, or enable Pages without the parent's explicit go-ahead in chat (Task 29).

## Review Focus

These are likely ways the app could break for a real family that no spec-driven test covers. Each one has a pinned test in the task named.

1. **The app is opened on a new day while yesterday's session is unfinished.** Expected: a fresh plan for today. Yesterday's partial session stays in history, and its minutes still count, but it isn't resumed. Pinned in **Task 9** (`startOrResumeSession` stale-record test).
2. **The parent pastes a list containing words already in the deck.**
   - Expected for built-in characters: they move to the front of the new-word order and aren't duplicated.
   - Expected for words already in an earlier list: they're skipped and reported.
   - Pinned in **Task 7** (`makeParentWords` tests).
3. **A word is paused or deleted while it sits in today's saved session queue.** Expected: that item is skipped silently, with no crash. Pinned in **Task 22** (SessionScreen paused-word test).
4. **A tiny deck early on.** Example: a 2-character parent word with no other 2-character words to draw from. Expected: listen mode falls back to read mode, read mode always shows 4 distinct pinyin options, and nothing is duplicated or empty. Pinned in **Task 10** (small-pool tests) and **Task 18** (fallback test).
5. **Importing a non-Hanzi-Buddy JSON or garbage file, or re-importing a backup that contains recordings.** Expected: a clear message and no change for bad files. Restored recordings are playable Blobs. Pinned in **Task 15** (`readBackup` rejection and round-trip tests).

## File Map

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore, CREDITS.md, README.md
.github/workflows/deploy.yml
public/icon.svg (+ generated PNG icons)
scripts/content-lib.ts            pure: parse HSK lists, build built-in characters
scripts/build-content.ts          downloads sources, writes src/content/builtin.json
scripts/check-content.ts          pure: validates built-in data + passages
src/main.tsx, src/App.tsx, src/bootstrap.ts, src/styles.css
src/types.ts                      every shared type + DEFAULT_SETTINGS/DEFAULT_KID
src/lib/date.ts, random.ts, hash.ts, files.ts
src/content/index.ts, radicals.ts, builtin.json, passages.json, parseWordList.ts, strokes.ts
src/srs/scheduler.ts              FSRS wrapper
src/store/db.ts, repo.ts, backup.ts
src/session/plan.ts, runner.ts, record.ts
src/activities/flashcards/distractors.ts, FlashcardStep.tsx
src/activities/writing/WritingStep.tsx
src/activities/components/game.ts, ComponentsStep.tsx
src/activities/speaking/prompts.ts, SpeakingStep.tsx
src/placement/placement.ts, apply.ts
src/stats/stats.ts
src/fun/pet.ts, stickers.ts, rewards.ts
src/audio/speech.ts, recorder.ts, sfx.ts
src/ui/confetti.ts, Label.tsx, SpeakButton.tsx, Pet.tsx, PinPad.tsx
src/app/AppContext.tsx, knowledge.ts, SessionScreen.tsx, Celebration.tsx, SetupPin.tsx, PetSetup.tsx,
        PlacementScreen.tsx, HomeScreen.tsx, Wardrobe.tsx, StickerBook.tsx, ErrorScreen.tsx
src/parent/ParentArea.tsx, PinGate.tsx, Dashboard.tsx, MinutesChart.tsx, RewardsPanel.tsx, Credits.tsx,
           WordsPanel.tsx, RecordingsPanel.tsx, PicturesPanel.tsx, SettingsPanel.tsx, BackupPanel.tsx
src/test/setup.ts, fixtures.ts, renderWithApp.tsx
```

---

### Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `npm test` (Vitest, jsdom, fake-indexeddb loaded globally, Web Crypto available, object-URL stubs) and `npm run build`. `App` is exported from `src/App.tsx`; Task 27 replaces it.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "hanzi-buddy",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host",
    "test": "vitest run",
    "test:watch": "vitest",
    "content": "tsx scripts/build-content.ts"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd /Users/bryantan/apps/ziji
npm install preact@^10 idb@^8 ts-fsrs@^5 pinyin-pro@^3 hanzi-writer@^3 canvas-confetti@^1
npm install -D vite@^7 @preact/preset-vite@^2 vite-plugin-pwa@^1 typescript@~5.9 vitest@^4 jsdom@^26 @testing-library/preact@^3 fake-indexeddb@^6 tsx@^4 hanzi-writer-data@2.0.1 @types/node@^22 @types/canvas-confetti@^1
```
Expected: both finish with no `ERR!`. Peer warnings are fine.

- [ ] **Step 3: Write the config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

`src/test/setup.ts`:
```ts
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { afterEach } from 'vitest';

// jsdom's window may hide Node's Web Crypto; the app needs subtle.digest and randomUUID.
if (!globalThis.crypto?.subtle || !globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

if (typeof document !== 'undefined') {
  // jsdom has no object URLs.
  URL.createObjectURL ??= () => 'blob:test';
  URL.revokeObjectURL ??= () => {};
  const { cleanup } = await import('@testing-library/preact');
  afterEach(() => cleanup());
}
```

`index.html`:
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="汉字小伙伴" />
    <title>汉字小伙伴 Hanzi Buddy</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules/
dist/
dev-dist/
scripts/.cache/
.DS_Store
*.local
```

- [ ] **Step 4: Write the failing smoke test** in `src/App.test.tsx`

```tsx
import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the app name', () => {
    render(<App />);
    expect(screen.getByText('汉字小伙伴')).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run it and confirm it fails**

Run: `npm test`
Expected: FAIL, with `Failed to resolve import "./App"`.

- [ ] **Step 6: Add the minimal app**

`src/App.tsx`:
```tsx
export function App() {
  return <h1>汉字小伙伴</h1>;
}
```

`src/main.tsx`:
```tsx
import { render } from 'preact';
import { App } from './App';
import './styles.css';

render(<App />, document.getElementById('app')!);
```

`src/styles.css`:
```css
body { margin: 0; }
```

- [ ] **Step 7: Run the tests and the build**

Run: `npm test && npm run build`
Expected: 1 test passes, `tsc` reports no errors, and `vite build` writes `dist/`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Preact + Vitest project

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared types and small utilities

**Files:**
- Create: `src/types.ts`, `src/lib/date.ts`, `src/lib/random.ts`, `src/lib/hash.ts`
- Test: `src/lib/date.test.ts`, `src/lib/random.test.ts`, `src/lib/hash.test.ts`

**Interfaces:**
- Produces:
  - Every type in `src/types.ts`, used by all later tasks.
  - `localDateKey(d: Date): string`, `endOfLocalDay(d: Date): Date`, `addDays(d: Date, n: number): Date`, `parseDateKey(key: string): Date`
  - `type Rng = () => number`, `mulberry32(seed: number): Rng`, `shuffle<T>(items: readonly T[], rng: Rng): T[]`, `seedFromString(s: string): number`
  - `hashPin(pin: string): Promise<string>`

- [ ] **Step 1: Write `src/types.ts`.** It's type-only plus two constants, so no test of its own.

```ts
import type { Card as FsrsCard, Grade } from 'ts-fsrs';

export type { FsrsCard, Grade };

export type Level = 1 | 2 | 3;

export interface Example {
  text: string;
  pinyin: string;
}

/** One built-in character as stored in src/content/builtin.json. */
export interface BuiltinChar {
  char: string;
  pinyin: string;
  meaning: string;
  level: Level;
  rank: number;
  radical: string;
  components: string[];
  strokes: number;
  writeable: boolean;
  examples: Example[];
}

export interface CharInfo {
  char: string;
  radical: string;
  components: string[];
}

export interface Word {
  id: string; // 'b:<char>' built-in, 'p:<uuid>' parent-added
  text: string;
  pinyin: string; // tone-marked syllables separated by single spaces
  meaning?: string;
  level: Level | null;
  rank: number | null; // built-in order; null for parent words
  source: 'builtin' | 'parent';
  listName?: string;
  listedAt?: number; // set for parent words and built-in words pulled forward by a parent list
  writeable: boolean;
  paused: boolean;
  createdAt: number;
  examples?: Example[];
}

export type CardKind = 'recognise' | 'write';

export interface CardRecord {
  id: string; // `${wordId}:${kind}`
  wordId: string;
  kind: CardKind;
  fsrs: FsrsCard;
}

export interface ReviewLog {
  id?: number;
  cardId: string;
  wordId: string;
  kind: CardKind;
  at: number;
  rating: Grade;
  correct: boolean;
  responseMs?: number;
  misses?: number;
}

export type StepKind = 'flashcards' | 'writing' | 'components' | 'speaking';

export interface SessionPlan {
  steps: StepKind[];
  reviewWordIds: string[];
  newWordIds: string[];
  flashTimeBoxMs: number;
  writeCandidates: { wordId: string; isNew: boolean }[];
  writeCount: number;
}

export interface FlashItem {
  wordId: string;
  isNew: boolean;
  retry: boolean; // re-shown after a wrong answer (or free play): no scheduler review
}

export interface SessionRecord {
  date: string; // local YYYY-MM-DD the session started
  startedAt: number;
  activeMs: number;
  free: boolean; // free play: never saved, never reviewed by the scheduler
  plan: SessionPlan;
  stepIndex: number;
  flashQueue: FlashItem[];
  flashIndex: number;
  flashElapsedMs: number;
  writeIndex: number;
  writeDone: number;
  completedSteps: StepKind[];
  completed: boolean;
}

export type RecordingPrompt =
  | { kind: 'picture'; promptId: string }
  | { kind: 'passage'; passageId: string };

export interface Recording {
  id: string;
  createdAt: number;
  prompt: RecordingPrompt;
  blob: Blob;
  mime: string;
  durationSec: number;
}

export interface PicturePrompt {
  id: string;
  createdAt: number;
  blob: Blob;
  mime: string;
}

export interface Passage {
  id: string;
  title: string;
  text: string;
}

export interface Settings {
  pinHash: string | null;
  sessionMinutes: number;
  newPerDay: number;
  activities: Record<StepKind, boolean>;
  speechRate: number;
  soundEffects: boolean;
  targetRecognise: number;
  targetWrite: number;
  lastBackupAt: number | null;
  placementDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  pinHash: null,
  sessionMinutes: 20,
  newPerDay: 5,
  activities: { flashcards: true, writing: true, components: true, speaking: true },
  speechRate: 0.8,
  soundEffects: true,
  targetRecognise: 500,
  targetWrite: 150,
  lastBackupAt: null,
  placementDone: false,
};

export type PetColor = 'green' | 'blue' | 'purple' | 'red' | 'gold';

export interface KidState {
  petName: string;
  petColor: PetColor;
  ownedAccessories: string[];
  wearing: string | null;
  bonusStars: number;
  lastChestDate: string | null;
  lastStageSeen: number;
  badgesSeen: string[];
}

export const DEFAULT_KID: KidState = {
  petName: '小龙',
  petColor: 'green',
  ownedAccessories: [],
  wearing: null,
  bonusStars: 0,
  lastChestDate: null,
  lastStageSeen: 0,
  badgesSeen: [],
};

export interface RewardGoal {
  id: string;
  title: string;
  emoji: string;
  metric: 'stars' | 'known';
  target: number;
  createdAt: number;
  claimedAt: number | null;
}
```

- [ ] **Step 2: Write the failing tests**

`src/lib/date.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { addDays, endOfLocalDay, localDateKey, parseDateKey } from './date';

describe('date helpers', () => {
  it('formats local date keys with zero padding', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
  it('gives the last millisecond of the same local day', () => {
    const e = endOfLocalDay(new Date(2026, 9, 2, 8));
    expect([e.getDate(), e.getHours(), e.getMinutes(), e.getMilliseconds()]).toEqual([2, 23, 59, 999]);
  });
  it('adds days across month ends', () => {
    expect(localDateKey(addDays(new Date(2026, 9, 31), 1))).toBe('2026-11-01');
  });
  it('parses keys back to local midnight', () => {
    const d = parseDateKey('2026-10-02');
    expect(localDateKey(d)).toBe('2026-10-02');
    expect(d.getHours()).toBe(0);
  });
});
```

`src/lib/random.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { mulberry32, seedFromString, shuffle } from './random';

describe('random helpers', () => {
  it('mulberry32 repeats for the same seed and stays in [0, 1)', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('shuffle keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, mulberry32(1));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
  it('seedFromString is stable and differs between strings', () => {
    expect(seedFromString('2026-10-02')).toBe(seedFromString('2026-10-02'));
    expect(seedFromString('2026-10-02')).not.toBe(seedFromString('2026-10-03'));
  });
});
```

`src/lib/hash.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { hashPin } from './hash';

describe('hashPin', () => {
  it('returns a stable 64-character hex digest that differs per PIN', async () => {
    const a = await hashPin('1234');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashPin('1234')).toBe(a);
    expect(await hashPin('4321')).not.toBe(a);
  });
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `npx vitest run src/lib`
Expected: FAIL, with unresolved imports `./date`, `./random` and `./hash`.

- [ ] **Step 4: Implement**

`src/lib/date.ts`:
```ts
export function localDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function endOfLocalDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function addDays(d: Date, n: number): Date {
  const e = new Date(d);
  e.setDate(e.getDate() + n);
  return e;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}
```

`src/lib/random.ts`:
```ts
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** FNV-1a hash, for seeding mulberry32 from a date key. */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
```

`src/lib/hash.ts`:
```ts
export async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`hanzi-buddy:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run src/lib && npx tsc --noEmit`
Expected: 8 tests pass and there are no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shared types, date/random/hash utilities

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content build pipeline (built-in characters)

**Files:**
- Create: `scripts/content-lib.ts`, `scripts/build-content.ts`, `CREDITS.md`
- Generate: `src/content/builtin.json`
- Test: `scripts/content-lib.test.ts`

**Interfaces:**
- Consumes: `BuiltinChar`, `Example`, `Level` from `src/types.ts`.
- Produces:
  - `src/content/builtin.json` in the shape `{ "version": 1, "chars": BuiltinChar[] }`: 600 entries with ranks 0–599 and levels 200/200/200.
  - `parseHskSections(text): Map<string, string[]>`
  - `cleanHskWord(raw): string`
  - `extractComponents(decomposition): string[]`
  - `firstSenses(definition, n?): string`
  - `buildBuiltin(input): BuiltinChar[]`

**Source facts** (verified 2026-10-02):
- `charlist.txt` and `wordlist.txt` from `elkmovie/hsk30` (MIT, © 2021 Pleco Inc.) have `#` comment lines, a section header line (e.g. `一级汉字表`), then numbered entries.
  - Character entries are `N<TAB>字`.
  - Word entries are `N 词`, and may contain `｜` variants or `（形）` notes.
  - Sections used: `一级汉字表`, `二级汉字表`, `初等手写字表` (300 characters), and `一级词汇表`, `二级词汇表`, `三级词汇表`.
- Make Me a Hanzi `dictionary.txt` is JSON lines: `{"character":"河","definition":"river, stream; the Yellow river","pinyin":["hé"],"decomposition":"⿰氵可","radical":"氵","matches":[...one per stroke]}`.
- Every HSK level 1–2 character has an entry.

- [ ] **Step 1: Write the failing test** in `scripts/content-lib.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { buildBuiltin, cleanHskWord, extractComponents, firstSenses, parseHskSections, type MmahEntry } from './content-lib';

const charlist = '# header\n\n一级汉字表\n1\t大\n2\t河\n3\t人\n\n二级汉字表\n1\t可\n2\t人\n\n初等手写字表\n1\t大\n2\t人\n';
const wordlist = '# header\n\n一级词汇表\n1 大人\n2 爸爸｜爸\n\n二级词汇表\n1 大河（名）\n\n三级词汇表\n1 可人\n';

function entry(character: string, strokes: number, decomposition: string, radical: string): MmahEntry {
  return { character, definition: `def of ${character}; more; extra`, pinyin: [], decomposition, radical, matches: Array(strokes).fill(null) };
}
const dictionary = new Map<string, MmahEntry>([
  ['大', entry('大', 3, '？', '大')],
  ['河', entry('河', 8, '⿰氵可', '氵')],
  ['人', entry('人', 2, '？', '人')],
  ['可', entry('可', 5, '⿹丁口', '口')],
]);
const pinyinOf = (t: string) => [...t].map((c) => `py(${c})`).join(' ');

describe('parseHskSections', () => {
  it('groups numbered entries under their section headers', () => {
    const s = parseHskSections(charlist);
    expect(s.get('一级汉字表')).toEqual(['大', '河', '人']);
    expect(s.get('初等手写字表')).toEqual(['大', '人']);
    expect(parseHskSections(wordlist).get('一级词汇表')).toEqual(['大人', '爸爸｜爸']);
  });
});

describe('cleanHskWord', () => {
  it('keeps the first variant and drops part-of-speech notes', () => {
    expect(cleanHskWord('爸爸｜爸')).toBe('爸爸');
    expect(cleanHskWord('大河（名）')).toBe('大河');
  });
});

describe('extractComponents', () => {
  it('drops structure symbols, unknown markers and duplicates', () => {
    expect(extractComponents('⿰氵可')).toEqual(['氵', '可']);
    expect(extractComponents('？')).toEqual([]);
    expect(extractComponents('⿱口口')).toEqual(['口']);
  });
});

describe('firstSenses', () => {
  it('keeps the first two senses', () => {
    expect(firstSenses('river, stream; the Yellow river')).toBe('river, stream');
    expect(firstSenses(undefined)).toBe('');
  });
});

describe('buildBuiltin', () => {
  const chars = buildBuiltin({ hskChars: parseHskSections(charlist), hskWords: parseHskSections(wordlist), dictionary, pinyinOf });

  it('orders by HSK level then stroke count, skipping repeats', () => {
    expect(chars.map((c) => c.char)).toEqual(['人', '大', '河', '可']);
    expect(chars.map((c) => c.rank)).toEqual([0, 1, 2, 3]);
  });
  it('marks handwriting-list characters as writeable', () => {
    expect(chars.filter((c) => c.writeable).map((c) => c.char)).toEqual(['人', '大']);
  });
  it('picks up to two example words made of same-or-lower-level characters', () => {
    const da = chars.find((c) => c.char === '大')!;
    expect(da.examples.map((e) => e.text)).toEqual(['大人', '大河']);
    expect(da.examples[0]!.pinyin).toBe('py(大) py(人)');
  });
  it('carries radical, components, strokes and meaning', () => {
    expect(chars.find((c) => c.char === '河')).toMatchObject({
      radical: '氵', components: ['氵', '可'], strokes: 8, meaning: 'def of 河, more', level: 1,
    });
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run scripts/content-lib.test.ts`
Expected: FAIL, because `./content-lib` can't be resolved.

- [ ] **Step 3: Implement `scripts/content-lib.ts`**

```ts
import type { BuiltinChar, Example, Level } from '../src/types';

export interface MmahEntry {
  character: string;
  definition?: string;
  pinyin: string[];
  decomposition: string;
  radical: string;
  matches: unknown[];
}

export interface BuildInput {
  hskChars: Map<string, string[]>;
  hskWords: Map<string, string[]>;
  dictionary: Map<string, MmahEntry>;
  pinyinOf: (text: string) => string;
}

export const CHAR_SECTIONS = ['一级汉字表', '二级汉字表'] as const;
export const WORD_SECTIONS = ['一级词汇表', '二级词汇表', '三级词汇表'] as const;
export const HANDWRITING_SECTION = '初等手写字表';
export const LEVEL_SIZE = 200;

const IDC = /[⿰-⿿]/u; // ideographic description characters (⿰, ⿱, …)

/** Parses Pleco's hsk30 charlist/wordlist into section header -> entries, in file order. */
export function parseHskSections(text: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^\d+\s+(.+)$/);
    if (m) {
      current?.push(m[1]!.trim());
    } else {
      current = [];
      sections.set(line, current);
    }
  }
  return sections;
}

/** '爸爸｜爸' -> '爸爸'; '白（形）' -> '白'. */
export function cleanHskWord(raw: string): string {
  return raw.split('｜')[0]!.replace(/（[^）]*）|\([^)]*\)/g, '').replace(/[^\p{Script=Han}]/gu, '');
}

export function extractComponents(decomposition: string): string[] {
  const out: string[] = [];
  for (const ch of decomposition) {
    if (IDC.test(ch) || ch === '？' || out.includes(ch)) continue;
    out.push(ch);
  }
  return out;
}

export function firstSenses(definition: string | undefined, n = 2): string {
  if (!definition) return '';
  return definition.split(/[;,]/).map((s) => s.trim()).filter(Boolean).slice(0, n).join(', ');
}

export function buildBuiltin(input: BuildInput): BuiltinChar[] {
  const handwriting = new Set(input.hskChars.get(HANDWRITING_SECTION) ?? []);
  const seen = new Set<string>();
  const pool: { char: string; hsk: number; index: number; strokes: number; entry: MmahEntry }[] = [];

  CHAR_SECTIONS.forEach((section, s) => {
    const chars = input.hskChars.get(section);
    if (!chars) throw new Error(`Missing section ${section}`);
    chars.forEach((char, index) => {
      if (seen.has(char)) return;
      const entry = input.dictionary.get(char);
      if (!entry) throw new Error(`No Make Me a Hanzi entry for ${char}`);
      seen.add(char);
      pool.push({ char, hsk: s + 1, index, strokes: entry.matches.length, entry });
    });
  });
  pool.sort((a, b) => a.hsk - b.hsk || a.strokes - b.strokes || a.index - b.index);

  const levelOf = new Map<string, Level>();
  pool.forEach((p, rank) => levelOf.set(p.char, Math.min(3, Math.floor(rank / LEVEL_SIZE) + 1) as Level));

  const words = WORD_SECTIONS.flatMap((s) => input.hskWords.get(s) ?? [])
    .map(cleanHskWord)
    .filter((w) => w.length >= 2 && w.length <= 3);

  return pool.map((p, rank) => {
    const level = levelOf.get(p.char)!;
    const examples: Example[] = [];
    for (const w of words) {
      if (examples.length >= 2) break;
      if (!w.includes(p.char) || examples.some((e) => e.text === w)) continue;
      if (![...w].every((c) => (levelOf.get(c) ?? 99) <= level)) continue;
      examples.push({ text: w, pinyin: input.pinyinOf(w) });
    }
    return {
      char: p.char,
      pinyin: input.pinyinOf(p.char),
      meaning: firstSenses(p.entry.definition),
      level,
      rank,
      radical: p.entry.radical,
      components: extractComponents(p.entry.decomposition),
      strokes: p.strokes,
      writeable: handwriting.has(p.char),
      examples,
    };
  });
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run scripts/content-lib.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Write `scripts/build-content.ts`**

```ts
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pinyin } from 'pinyin-pro';
import { buildBuiltin, parseHskSections, type MmahEntry } from './content-lib';

const SOURCES = {
  charlist: 'https://raw.githubusercontent.com/elkmovie/hsk30/main/charlist.txt',
  wordlist: 'https://raw.githubusercontent.com/elkmovie/hsk30/main/wordlist.txt',
  dictionary: 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt',
};
const cacheDir = new URL('./.cache/', import.meta.url);
const outFile = new URL('../src/content/builtin.json', import.meta.url);

async function source(name: keyof typeof SOURCES): Promise<string> {
  const file = new URL(`${name}.txt`, cacheDir);
  if (!existsSync(file)) {
    const res = await fetch(SOURCES[name]);
    if (!res.ok) throw new Error(`Download failed for ${name}: ${res.status}`);
    await mkdir(cacheDir, { recursive: true });
    await writeFile(file, await res.text());
  }
  return readFile(file, 'utf8');
}

const dictionary = new Map<string, MmahEntry>();
for (const line of (await source('dictionary')).split('\n')) {
  if (!line.trim()) continue;
  const e = JSON.parse(line) as MmahEntry;
  dictionary.set(e.character, e);
}

const chars = buildBuiltin({
  hskChars: parseHskSections(await source('charlist')),
  hskWords: parseHskSections(await source('wordlist')),
  dictionary,
  pinyinOf: (text) => pinyin(text, { type: 'array' }).join(' '),
});

const body = chars.map((c) => '  ' + JSON.stringify(c)).join(',\n');
await mkdir(new URL('../src/content/', import.meta.url), { recursive: true });
await writeFile(outFile, `{\n "version": 1,\n "chars": [\n${body}\n ]\n}\n`);
const perLevel = [1, 2, 3].map((l) => chars.filter((c) => c.level === l).length).join('/');
console.log(`Wrote ${chars.length} characters (levels ${perLevel}), ${chars.filter((c) => c.writeable).length} writeable`);
```

- [ ] **Step 6: Generate the data**

Run: `npm run content`
Expected: `Wrote 600 characters (levels 200/200/200), 297 writeable`. Then spot-check the file:

Run: `grep -m3 '"char":"河"\|"rank":0,' src/content/builtin.json`
Expected: rank 0 is `一` with pinyin `yī`. 河 has `"radical":"氵"`, `"level":3` and examples containing 河.

- [ ] **Step 7: Write `CREDITS.md`**

```markdown
# Credits

Hanzi Buddy is built on these open resources:

- **HSK 3.0 character and word lists** — [elkmovie/hsk30](https://github.com/elkmovie/hsk30), MIT License, © 2021 Pleco Inc.
  Used for the 600 built-in characters, their levels, the handwriting list, and example words.
- **Make Me a Hanzi** `dictionary.txt` — [skishore/makemeahanzi](https://github.com/skishore/makemeahanzi), GNU LGPL v3 or later
  (derived from Unihan and CJKlib). Used for meanings, radicals, components and stroke counts in `src/content/builtin.json`;
  those derived fields are distributed under the same licence.
- **Hanzi Writer** — [chanind/hanzi-writer](https://github.com/chanind/hanzi-writer), MIT License.
- **hanzi-writer-data** stroke data — Arphic Public License (derived from Make Me a Hanzi graphics / Arphic fonts).
- **pinyin-pro** — MIT License. **ts-fsrs** — MIT License. **canvas-confetti** — ISC License. **idb** — ISC License. **Preact** — MIT License.
- Read-aloud passages were written for this project.

Jun Da's *Modern Chinese Character Frequency List* was considered. On 2026-10-02 it stated no terms of use, so it is not used.
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build 600 built-in characters from HSK 3.0 + Make Me a Hanzi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Runtime content module, radicals, passages and content check

**Files:**
- Create: `src/content/index.ts`, `src/content/radicals.ts`, `src/content/passages.json`, `scripts/check-content.ts`
- Test: `src/content/index.test.ts`, `scripts/check-content.test.ts`

**Interfaces:**
- Consumes: `src/content/builtin.json` (Task 3).
- Produces:
  - `BUILTIN: BuiltinChar[]`, `PASSAGES: Passage[]`
  - `getCharInfo(char): CharInfo | undefined`
  - `isHan(ch): boolean`, `hanChars(text): string[]`
  - `builtinWordId(char): string`, `builtinWords(now: number): Word[]`
  - `wordComponents(text): string[]`
  - `RADICALS: Record<string, RadicalMeaning>`, `radicalMeaning(component): RadicalMeaning | undefined`, where `RadicalMeaning = { zh: string; en: string; emoji: string }`
  - `checkContent(chars, passages, hasStrokeFile): string[]`

- [ ] **Step 1: Write the failing tests**

`src/content/index.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { BUILTIN, builtinWords, getCharInfo, hanChars, wordComponents } from './index';
import { radicalMeaning } from './radicals';

describe('content module', () => {
  it('maps every built-in character to an active built-in word', () => {
    const words = builtinWords(123);
    expect(words).toHaveLength(600);
    expect(words[0]).toMatchObject({ id: `b:${BUILTIN[0]!.char}`, source: 'builtin', paused: false, createdAt: 123, rank: 0 });
  });
  it('knows the components of 河', () => {
    expect(getCharInfo('河')?.components).toContain('氵');
  });
  it('hanChars ignores punctuation and letters', () => {
    expect(hanChars('我，ok 你！')).toEqual(['我', '你']);
  });
  it('wordComponents unions radicals and components of each character', () => {
    expect(wordComponents('汉河')).toEqual(expect.arrayContaining(['氵', '又', '可']));
  });
  it('explains common radicals for children', () => {
    expect(radicalMeaning('氵')).toEqual({ zh: '水', en: 'water', emoji: '💧' });
  });
});
```

`scripts/check-content.test.ts`:
```ts
// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILTIN, PASSAGES } from '../src/content';
import { checkContent } from './check-content';

const dataDir = join(process.cwd(), 'node_modules', 'hanzi-writer-data');
const hasStrokeFile = (ch: string) => existsSync(join(dataDir, `${ch}.json`));

describe('built-in content', () => {
  it('has no problems', () => {
    expect(checkContent(BUILTIN, PASSAGES, hasStrokeFile)).toEqual([]);
  });
  it('flags a passage that uses a character outside levels 1–2', () => {
    const problems = checkContent(BUILTIN, [{ id: 'x', title: 't', text: '我'.repeat(29) + '澡' }], hasStrokeFile);
    expect(problems).toContain('x: uses 澡 outside levels 1–2');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/content scripts/check-content.test.ts`
Expected: FAIL, because modules are missing.

- [ ] **Step 3: Implement `src/content/radicals.ts`**

```ts
export interface RadicalMeaning {
  zh: string;
  en: string;
  emoji: string;
}

const m = (zh: string, en: string, emoji: string): RadicalMeaning => ({ zh, en, emoji });

/** Components a P2/P3 child meets often, with a child-friendly meaning. Variants share a meaning. */
export const RADICALS: Record<string, RadicalMeaning> = {
  '氵': m('水', 'water', '💧'), '水': m('水', 'water', '💧'),
  '扌': m('手', 'hand', '✋'), '手': m('手', 'hand', '✋'),
  '亻': m('人', 'person', '🧍'), '人': m('人', 'person', '🧍'),
  '口': m('口', 'mouth', '👄'),
  '木': m('木', 'tree', '🌳'),
  '日': m('日', 'sun', '☀️'),
  '月': m('月', 'moon / body', '🌙'),
  '女': m('女', 'girl', '👧'),
  '讠': m('言', 'speech', '💬'), '言': m('言', 'speech', '💬'),
  '艹': m('草', 'grass', '🌿'),
  '辶': m('走', 'walk', '🚶'), '走': m('走', 'walk', '🚶'),
  '忄': m('心', 'heart', '❤️'), '心': m('心', 'heart', '❤️'),
  '土': m('土', 'earth', '🟫'),
  '火': m('火', 'fire', '🔥'), '灬': m('火', 'fire', '🔥'),
  '钅': m('金', 'metal', '🔩'),
  '纟': m('丝', 'thread', '🧵'),
  '宀': m('房', 'roof', '🏠'),
  '目': m('目', 'eye', '👁️'),
  '米': m('米', 'rice', '🍚'),
  '禾': m('禾', 'grain', '🌾'),
  '竹': m('竹', 'bamboo', '🎋'), '⺮': m('竹', 'bamboo', '🎋'),
  '犭': m('犬', 'animal', '🐕'),
  '虫': m('虫', 'insect', '🐛'),
  '鸟': m('鸟', 'bird', '🐦'),
  '雨': m('雨', 'rain', '🌧️'),
  '门': m('门', 'door', '🚪'),
  '衤': m('衣', 'clothes', '👕'), '衣': m('衣', 'clothes', '👕'),
  '饣': m('饭', 'food', '🍜'),
  '疒': m('病', 'sickness', '🤒'),
  '王': m('玉', 'jade', '💎'),
  '石': m('石', 'stone', '🪨'),
  '贝': m('贝', 'money', '💰'),
  '车': m('车', 'vehicle', '🚗'),
  '力': m('力', 'strength', '💪'),
  '刂': m('刀', 'knife', '🔪'),
  '冫': m('冰', 'ice', '🧊'),
  '足': m('足', 'foot', '🦶'), '⻊': m('足', 'foot', '🦶'),
  '马': m('马', 'horse', '🐎'),
  '山': m('山', 'mountain', '⛰️'),
  '田': m('田', 'field', '🟩'),
  '页': m('头', 'head', '🙂'),
  '阝': m('阝', 'hill / town', '🏘️'),
  '广': m('广', 'shelter', '🛖'),
};

export function radicalMeaning(component: string): RadicalMeaning | undefined {
  return RADICALS[component];
}
```

- [ ] **Step 4: Implement `src/content/index.ts`**

```ts
import data from './builtin.json';
import passages from './passages.json';
import type { BuiltinChar, CharInfo, Passage, Word } from '../types';

export const BUILTIN: BuiltinChar[] = (data as unknown as { chars: BuiltinChar[] }).chars;
export const PASSAGES: Passage[] = passages as Passage[];

const infoByChar = new Map<string, CharInfo>(
  BUILTIN.map((c) => [c.char, { char: c.char, radical: c.radical, components: c.components }]),
);

export function getCharInfo(char: string): CharInfo | undefined {
  return infoByChar.get(char);
}

export function isHan(ch: string): boolean {
  return /\p{Script=Han}/u.test(ch);
}

export function hanChars(text: string): string[] {
  return Array.from(text).filter(isHan);
}

export const builtinWordId = (char: string) => `b:${char}`;

export function builtinWords(now: number): Word[] {
  return BUILTIN.map((c) => ({
    id: builtinWordId(c.char),
    text: c.char,
    pinyin: c.pinyin,
    meaning: c.meaning,
    level: c.level,
    rank: c.rank,
    source: 'builtin' as const,
    writeable: c.writeable,
    paused: false,
    createdAt: now,
    examples: c.examples,
  }));
}

/** Radical and components of every character in the text, de-duplicated, in order. */
export function wordComponents(text: string): string[] {
  const out: string[] = [];
  for (const ch of hanChars(text)) {
    const info = getCharInfo(ch);
    if (!info) continue;
    for (const part of [info.radical, ...info.components]) if (part && !out.includes(part)) out.push(part);
  }
  return out;
}
```

- [ ] **Step 5: Create `src/content/passages.json`.** These are the 20 passages checked on 2026-10-02: each has 32–56 characters, all within levels 1–2.

```json
[
  {"id":"p01","title":"我的家","text":"我家有五个人：爸爸、妈妈、哥哥、妹妹和我。爸爸是医生，妈妈是老师。我很爱我的家。"},
  {"id":"p02","title":"上学","text":"早上七点，我起床了。我先洗手，再吃早饭。妈妈说：“快一点，不要错过车！”我坐车去学校。"},
  {"id":"p03","title":"下雨了","text":"今天下雨了，天很阴，也有一点冷。我和弟弟不能去外面玩，就在家里看书、听歌。下午不下雨了，我们高高兴兴地去球场打球。"},
  {"id":"p04","title":"我的朋友","text":"我的好朋友叫小明。他八岁，和我在一个班。他很喜欢笑，也很喜欢帮别人。我们常常一起玩，一起做作业。"},
  {"id":"p05","title":"生日","text":"今天是我的生日。妈妈做了很多好吃的菜，爸爸送我一本新书。哥哥给我唱生日歌。我九岁了，真高兴！"},
  {"id":"p06","title":"去医院","text":"弟弟病了，头很热。妈妈和我一起送他去医院。医生看了看他，说：“没关系，多喝水，多睡觉，两天就好了。”弟弟听了，笑了。"},
  {"id":"p07","title":"买东西","text":"星期六，我跟妈妈去商店买东西。我们买了米、鸡蛋、牛奶和水果。妈妈问我：“你想要什么？”我说：“我想要一个新书包。”"},
  {"id":"p08","title":"看星星","text":"晚上，天上有很多星星。我和爷爷坐在门口看星星。爷爷说：“星星很远很远。”我想：“我长大了，要坐飞机去看星星！”"},
  {"id":"p09","title":"学写字","text":"老师教我们写汉字。写字的时候，要坐好，要认真。我写了一个“大”字，又写了一个“天”字。老师说我写得很好。"},
  {"id":"p10","title":"小鸟","text":"树上有一只小鸟。它飞来飞去，还会唱歌。我想跟它一起玩，可是它飞走了。明天你还会来吗？"},
  {"id":"p11","title":"我的房间","text":"我的房间不大。房间里有床，有桌子，还有很多书。桌子在床的旁边。我常常坐在桌子前面看书、写作业。我很喜欢我的房间。"},
  {"id":"p12","title":"吃饭","text":"中午，我们一家人坐在一起吃饭。桌上有米饭、鸡蛋、肉和菜。奶奶做的菜最好吃。我吃了很多，奶奶笑着说：“多吃一点，快快长高！”"},
  {"id":"p13","title":"打球","text":"下课了，同学们都去球场。男同学打球，女同学跑来跑去。我跑得很快，可是有一点累。我喝了一大杯水，又回去打球了。"},
  {"id":"p14","title":"坐车","text":"我家到学校很远。我天天坐公共汽车去学校。车上人很多，我找不到地方坐，就站着。到学校的时候，我看见同学在门口等我。"},
  {"id":"p15","title":"过新年","text":"过新年了！我们穿上新衣服，去爷爷奶奶家。爷爷奶奶给我们红包，我说：“谢谢爷爷！谢谢奶奶！”大家都很高兴。"},
  {"id":"p16","title":"帮妈妈","text":"星期天，妈妈很忙。我帮妈妈洗菜，还帮她做饭。妈妈说：“你长大了，会帮妈妈做事了！”我听了很开心。"},
  {"id":"p17","title":"小马","text":"牛爷爷家有一只小马。小马很喜欢跑，天天在外面跑来跑去。有一天，它跑得太远了，找不到家了。牛爷爷找到了它，小马说：“谢谢您！”"},
  {"id":"p18","title":"太阳和风","text":"太阳和风比一比，看谁的力大。风大大地吹，人们都很冷。太阳出来了，天热了，人们都高兴地笑了。风说：“太阳，你真有力！”"},
  {"id":"p19","title":"看电视","text":"晚饭后，我想看电视。妈妈说：“先做作业，再看电视。”我很快地做好了作业，才去看电视。电视里的小马在唱歌，我也跟着唱。"},
  {"id":"p20","title":"我的学校","text":"我的学校很大，有很多树和花。学校里有一个大球场。我在二年级三班，我们班有三十个同学。我很喜欢我的学校，也很喜欢我的老师和同学。"}
]
```

- [ ] **Step 6: Implement `scripts/check-content.ts`**

```ts
import type { BuiltinChar, Passage } from '../src/types';

const HAN = /\p{Script=Han}/u;

export function checkContent(chars: BuiltinChar[], passages: Passage[], hasStrokeFile: (char: string) => boolean): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const c of chars) {
    if (seen.has(c.char)) problems.push(`duplicate ${c.char}`);
    seen.add(c.char);
    if (!c.pinyin.trim()) problems.push(`${c.char}: no pinyin`);
    if (!c.meaning.trim()) problems.push(`${c.char}: no meaning`);
    if (!c.radical) problems.push(`${c.char}: no radical`);
    if (!hasStrokeFile(c.char)) problems.push(`${c.char}: no stroke data`);
  }
  for (const level of [1, 2, 3] as const) {
    const n = chars.filter((c) => c.level === level).length;
    if (n !== 200) problems.push(`level ${level} has ${n} characters, expected 200`);
  }

  const easy = new Set(chars.filter((c) => c.level <= 2).map((c) => c.char));
  const ids = new Set<string>();
  for (const p of passages) {
    if (ids.has(p.id)) problems.push(`duplicate passage ${p.id}`);
    ids.add(p.id);
    const han = Array.from(p.text).filter((ch) => HAN.test(ch));
    if (han.length < 30 || han.length > 80) problems.push(`${p.id}: ${han.length} characters, expected 30–80`);
    const outside = [...new Set(han.filter((ch) => !easy.has(ch)))];
    if (outside.length) problems.push(`${p.id}: uses ${outside.join('')} outside levels 1–2`);
  }
  return problems;
}
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/content scripts && npx tsc --noEmit`
Expected: all pass. If the content check lists a problem in a passage, replace the offending character in `passages.json` with one from levels 1–2 (keeping the sentence natural) and re-run. Don't loosen the check.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: runtime content module, radicals, 20 read-aloud passages, content check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Spaced-repetition scheduler wrapper

**Files:**
- Create: `src/srs/scheduler.ts`
- Test: `src/srs/scheduler.test.ts`

**Interfaces:**
- Produces:
  - `type Outcome = { kind: 'recognise'; correct: boolean; responseMs: number } | { kind: 'write'; totalMisses: number }`
  - `toRating(o: Outcome): Grade`
  - `newCard(now: Date): FsrsCard`
  - `review(card: FsrsCard, rating: Grade, now: Date): FsrsCard`
  - `isKnown(card: FsrsCard): boolean`
  - `seededKnownCard(now: Date): FsrsCard`
  - `SLOW_ANSWER_MS = 6000`

**ts-fsrs 5 facts** (verified):
- `fsrs(generatorParameters({ enable_fuzz: false }))`, then `.next(card, now, rating)` returns `{ card, log }`.
- `State` is `New=0, Learning=1, Review=2, Relearning=3`. `Rating` is `Again=1, Hard=2, Good=3, Easy=4`.
- A new card rated Good becomes Learning, due in 10 minutes. Rated Good again at that time, it becomes Review, due about 2 days later.

- [ ] **Step 1: Write the failing test** in `src/srs/scheduler.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import { isKnown, newCard, review, seededKnownCard, toRating } from './scheduler';

const now = new Date(2026, 9, 2, 9, 0);

describe('toRating', () => {
  it('maps recognition answers', () => {
    expect(toRating({ kind: 'recognise', correct: false, responseMs: 500 })).toBe(Rating.Again);
    expect(toRating({ kind: 'recognise', correct: true, responseMs: 6000 })).toBe(Rating.Good);
    expect(toRating({ kind: 'recognise', correct: true, responseMs: 6001 })).toBe(Rating.Hard);
  });
  it('maps writing misses', () => {
    expect(toRating({ kind: 'write', totalMisses: 0 })).toBe(Rating.Good);
    expect(toRating({ kind: 'write', totalMisses: 1 })).toBe(Rating.Hard);
    expect(toRating({ kind: 'write', totalMisses: 3 })).toBe(Rating.Hard);
    expect(toRating({ kind: 'write', totalMisses: 4 })).toBe(Rating.Again);
  });
});

describe('review', () => {
  it('graduates a new card to known after two good reviews', () => {
    const first = review(newCard(now), Rating.Good, now);
    expect(first.due.getTime()).toBeGreaterThan(now.getTime());
    expect(isKnown(first)).toBe(false);
    const second = review(first, Rating.Good, first.due);
    expect(second.state).toBe(State.Review);
    expect(isKnown(second)).toBe(true);
  });
  it('a lapse makes a known card not known', () => {
    const known = seededKnownCard(now);
    expect(isKnown(review(known, Rating.Again, known.due))).toBe(false);
  });
});

describe('seededKnownCard', () => {
  it('is known and due in 14 days', () => {
    const c = seededKnownCard(now);
    expect(isKnown(c)).toBe(true);
    expect(c.due.getTime() - now.getTime()).toBe(14 * 86_400_000);
  });
  it('a good review at due date pushes it further out', () => {
    const c = seededKnownCard(now);
    const next = review(c, Rating.Good, c.due);
    expect(next.due.getTime() - c.due.getTime()).toBeGreaterThan(14 * 86_400_000);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/srs`
Expected: FAIL, because `./scheduler` is missing.

- [ ] **Step 3: Implement `src/srs/scheduler.ts`**

```ts
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

export const SLOW_ANSWER_MS = 6000;

export type Outcome =
  | { kind: 'recognise'; correct: boolean; responseMs: number }
  | { kind: 'write'; totalMisses: number };

export function toRating(o: Outcome): Grade {
  if (o.kind === 'recognise') {
    if (!o.correct) return Rating.Again;
    return o.responseMs > SLOW_ANSWER_MS ? Rating.Hard : Rating.Good;
  }
  if (o.totalMisses === 0) return Rating.Good;
  return o.totalMisses <= 3 ? Rating.Hard : Rating.Again;
}

export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

export function review(card: Card, rating: Grade, now: Date): Card {
  return scheduler.next(card, now, rating).card;
}

export function isKnown(card: Card): boolean {
  return card.state === State.Review;
}

/** A card for a character the child already knew at placement: in review, due in 14 days. */
export function seededKnownCard(now: Date): Card {
  return {
    ...createEmptyCard(now),
    state: State.Review,
    stability: 14,
    difficulty: 5,
    reps: 1,
    scheduled_days: 14,
    due: new Date(now.getTime() + 14 * 86_400_000),
    last_review: now,
  };
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/srs`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: FSRS scheduler wrapper with rating rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: IndexedDB storage and test fixtures

**Files:**
- Create: `src/store/db.ts`, `src/store/repo.ts`, `src/test/fixtures.ts`
- Test: `src/store/repo.test.ts`

**Interfaces:**
- Consumes: types from Task 2.
- Produces:
  - **db.ts:** `type AppDb`, `DB_NAME = 'hanzi-buddy'`, `DB_VERSION = 1`, `openAppDb(name?: string): Promise<AppDb>`. Stores: `words`, `cards` (index `byWord`), `reviewLogs` (auto id, index `byAt`), `sessions` (key `date`), `recordings` (index `byCreatedAt`), `prompts`, `rewards`, and singleton stores `settings` and `kid` (key `'main'`).
  - **repo.ts, settings and kid:** `getSettings(db): Promise<Settings>`, `saveSettings(db, s)`, `updateSettings(db, patch): Promise<Settings>`, `getKid(db): Promise<KidState | null>`, `saveKid(db, k)`
  - **repo.ts, words and cards:** `seedBuiltinWords(db, words): Promise<number>`, `allWords(db)`, `getWord(db, id)`, `putWords(db, words)`, `deleteWord(db, id)`, `allCards(db)`, `getCard(db, id)`, `putCards(db, cards)`
  - **repo.ts, logs and sessions:** `addReviewLog(db, log)`, `logsSince(db, sinceMs)`, `getSession(db, date)`, `saveSession(db, rec)`, `allSessions(db)`
  - **repo.ts, recordings, prompts and rewards:** `addRecording(db, r)`, `listRecordings(db)` (newest first), `deleteRecording(db, id)`, `countRecordings(db)`, `addPrompt(db, p)`, `listPrompts(db)`, `deletePrompt(db, id)`, `listRewards(db)` (oldest first), `saveReward(db, g)`, `deleteReward(db, id)`
  - **fixtures.ts:** `freshDb(): Promise<AppDb>`, `makeWord(text, over?): Word`, `makeCard(wordId, kind, due, known?): CardRecord`

- [ ] **Step 1: Write the test fixtures** in `src/test/fixtures.ts`

```ts
import { createEmptyCard, State } from 'ts-fsrs';
import { openAppDb, type AppDb } from '../store/db';
import type { CardKind, CardRecord, Word } from '../types';

export function freshDb(): Promise<AppDb> {
  return openAppDb(`test-${crypto.randomUUID()}`);
}

export function makeWord(text: string, over: Partial<Word> = {}): Word {
  return { id: `b:${text}`, text, pinyin: 'x', level: 1, rank: 0, source: 'builtin', writeable: true, paused: false, createdAt: 0, ...over };
}

export function makeCard(wordId: string, kind: CardKind, due: Date, known = false): CardRecord {
  return {
    id: `${wordId}:${kind}`,
    wordId,
    kind,
    fsrs: { ...createEmptyCard(due), due, reps: 1, state: known ? State.Review : State.Learning },
  };
}
```

- [ ] **Step 2: Write the failing test** in `src/store/repo.test.ts`

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, DEFAULT_KID } from '../types';
import {
  addRecording, addReviewLog, allCards, allWords, deleteWord, getKid, getSettings, listRecordings,
  logsSince, putCards, putWords, saveKid, seedBuiltinWords, updateSettings,
} from './repo';

describe('repo', () => {
  it('returns default settings and merges updates', async () => {
    const db = await freshDb();
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
    await updateSettings(db, { newPerDay: 7 });
    expect((await getSettings(db)).newPerDay).toBe(7);
    expect((await getSettings(db)).sessionMinutes).toBe(20);
  });

  it('seeds only missing built-in words and keeps existing flags', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('大', { paused: true })]);
    const added = await seedBuiltinWords(db, [makeWord('大'), makeWord('人')]);
    expect(added).toBe(1);
    const words = await allWords(db);
    expect(words.find((w) => w.text === '大')?.paused).toBe(true);
    expect(words).toHaveLength(2);
  });

  it('deleting a word removes its cards', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 2);
    await putWords(db, [makeWord('大')]);
    await putCards(db, [makeCard('b:大', 'recognise', now), makeCard('b:大', 'write', now)]);
    await deleteWord(db, 'b:大');
    expect(await allCards(db)).toEqual([]);
  });

  it('keeps Date objects in cards', async () => {
    const db = await freshDb();
    const due = new Date(2026, 9, 5);
    await putCards(db, [makeCard('b:大', 'recognise', due)]);
    expect((await allCards(db))[0]!.fsrs.due).toBeInstanceOf(Date);
  });

  it('filters review logs by time', async () => {
    const db = await freshDb();
    await addReviewLog(db, { cardId: 'a', wordId: 'a', kind: 'recognise', at: 100, rating: Rating.Good, correct: true });
    await addReviewLog(db, { cardId: 'a', wordId: 'a', kind: 'recognise', at: 200, rating: Rating.Again, correct: false });
    expect((await logsSince(db, 150)).map((l) => l.at)).toEqual([200]);
  });

  it('lists recordings newest first with their audio intact', async () => {
    const db = await freshDb();
    const blob = (t: string) => new Blob([t], { type: 'audio/mp4' });
    await addRecording(db, { id: 'old', createdAt: 1, prompt: { kind: 'passage', passageId: 'p01' }, blob: blob('a'), mime: 'audio/mp4', durationSec: 3 });
    await addRecording(db, { id: 'new', createdAt: 2, prompt: { kind: 'passage', passageId: 'p02' }, blob: blob('bb'), mime: 'audio/mp4', durationSec: 4 });
    const list = await listRecordings(db);
    expect(list.map((r) => r.id)).toEqual(['new', 'old']);
    expect(await list[0]!.blob.text()).toBe('bb');
  });

  it('stores the kid state', async () => {
    const db = await freshDb();
    expect(await getKid(db)).toBeNull();
    await saveKid(db, { ...DEFAULT_KID, petName: '豆豆' });
    expect((await getKid(db))?.petName).toBe('豆豆');
  });
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `npx vitest run src/store`
Expected: FAIL, because `../store/db` and `./repo` are missing.

- [ ] **Step 4: Implement `src/store/db.ts`**

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CardRecord, KidState, PicturePrompt, Recording, ReviewLog, RewardGoal, SessionRecord, Settings, Word } from '../types';

export interface HanziDB extends DBSchema {
  words: { key: string; value: Word };
  cards: { key: string; value: CardRecord; indexes: { byWord: string } };
  reviewLogs: { key: number; value: ReviewLog; indexes: { byAt: number } };
  sessions: { key: string; value: SessionRecord };
  recordings: { key: string; value: Recording; indexes: { byCreatedAt: number } };
  prompts: { key: string; value: PicturePrompt };
  rewards: { key: string; value: RewardGoal };
  settings: { key: string; value: Settings };
  kid: { key: string; value: KidState };
}

export type AppDb = IDBPDatabase<HanziDB>;

export const DB_NAME = 'hanzi-buddy';
export const DB_VERSION = 1;

/** Stores holding one record per item (everything except the 'main' singletons). */
export const LIST_STORES = ['words', 'cards', 'reviewLogs', 'sessions', 'rewards', 'recordings', 'prompts'] as const;
export type ListStore = (typeof LIST_STORES)[number];

export function openAppDb(name: string = DB_NAME): Promise<AppDb> {
  return openDB<HanziDB>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Each version step is applied in order; a thrown error aborts the upgrade and leaves the old data untouched.
      if (oldVersion < 1) {
        db.createObjectStore('words', { keyPath: 'id' });
        db.createObjectStore('cards', { keyPath: 'id' }).createIndex('byWord', 'wordId');
        db.createObjectStore('reviewLogs', { keyPath: 'id', autoIncrement: true }).createIndex('byAt', 'at');
        db.createObjectStore('sessions', { keyPath: 'date' });
        db.createObjectStore('recordings', { keyPath: 'id' }).createIndex('byCreatedAt', 'createdAt');
        db.createObjectStore('prompts', { keyPath: 'id' });
        db.createObjectStore('rewards', { keyPath: 'id' });
        db.createObjectStore('settings');
        db.createObjectStore('kid');
      }
    },
  });
}
```

- [ ] **Step 5: Implement `src/store/repo.ts`**

```ts
import { DEFAULT_SETTINGS, type CardRecord, type KidState, type PicturePrompt, type Recording, type ReviewLog, type RewardGoal, type SessionRecord, type Settings, type Word } from '../types';
import type { AppDb } from './db';

const MAIN = 'main';

export async function getSettings(db: AppDb): Promise<Settings> {
  const s = await db.get('settings', MAIN);
  return { ...DEFAULT_SETTINGS, ...s, activities: { ...DEFAULT_SETTINGS.activities, ...s?.activities } };
}

export async function saveSettings(db: AppDb, s: Settings): Promise<void> {
  await db.put('settings', s, MAIN);
}

export async function updateSettings(db: AppDb, patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings(db)), ...patch };
  await saveSettings(db, next);
  return next;
}

export async function getKid(db: AppDb): Promise<KidState | null> {
  return (await db.get('kid', MAIN)) ?? null;
}

export async function saveKid(db: AppDb, kid: KidState): Promise<void> {
  await db.put('kid', kid, MAIN);
}

export async function seedBuiltinWords(db: AppDb, words: Word[]): Promise<number> {
  const tx = db.transaction('words', 'readwrite');
  const existing = new Set(await tx.store.getAllKeys());
  const missing = words.filter((w) => !existing.has(w.id));
  await Promise.all([...missing.map((w) => tx.store.put(w)), tx.done]);
  return missing.length;
}

export const allWords = (db: AppDb) => db.getAll('words');
export const getWord = (db: AppDb, id: string) => db.get('words', id);

export async function putWords(db: AppDb, words: Word[]): Promise<void> {
  const tx = db.transaction('words', 'readwrite');
  await Promise.all([...words.map((w) => tx.store.put(w)), tx.done]);
}

export async function deleteWord(db: AppDb, id: string): Promise<void> {
  const tx = db.transaction(['words', 'cards'], 'readwrite');
  await Promise.all([
    tx.objectStore('words').delete(id),
    tx.objectStore('cards').delete(`${id}:recognise`),
    tx.objectStore('cards').delete(`${id}:write`),
    tx.done,
  ]);
}

export const allCards = (db: AppDb) => db.getAll('cards');
export const getCard = (db: AppDb, id: string) => db.get('cards', id);

export async function putCards(db: AppDb, cards: CardRecord[]): Promise<void> {
  const tx = db.transaction('cards', 'readwrite');
  await Promise.all([...cards.map((c) => tx.store.put(c)), tx.done]);
}

export async function addReviewLog(db: AppDb, log: ReviewLog): Promise<void> {
  const { id: _id, ...rest } = log;
  await db.add('reviewLogs', rest as ReviewLog);
}

export const logsSince = (db: AppDb, sinceMs: number) =>
  db.getAllFromIndex('reviewLogs', 'byAt', IDBKeyRange.lowerBound(sinceMs));

export const getSession = (db: AppDb, date: string) => db.get('sessions', date);
export const allSessions = (db: AppDb) => db.getAll('sessions');

export async function saveSession(db: AppDb, rec: SessionRecord): Promise<void> {
  await db.put('sessions', rec);
}

export async function addRecording(db: AppDb, r: Recording): Promise<void> {
  await db.put('recordings', r);
}

export async function listRecordings(db: AppDb): Promise<Recording[]> {
  return (await db.getAllFromIndex('recordings', 'byCreatedAt')).reverse();
}

export const deleteRecording = (db: AppDb, id: string) => db.delete('recordings', id);
export const countRecordings = (db: AppDb) => db.count('recordings');

export async function addPrompt(db: AppDb, p: PicturePrompt): Promise<void> {
  await db.put('prompts', p);
}

export async function listPrompts(db: AppDb): Promise<PicturePrompt[]> {
  return (await db.getAll('prompts')).sort((a, b) => a.createdAt - b.createdAt);
}

export const deletePrompt = (db: AppDb, id: string) => db.delete('prompts', id);

export async function listRewards(db: AppDb): Promise<RewardGoal[]> {
  return (await db.getAll('rewards')).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveReward(db: AppDb, g: RewardGoal): Promise<void> {
  await db.put('rewards', g);
}

export const deleteReward = (db: AppDb, id: string) => db.delete('rewards', id);
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/store && npx tsc --noEmit`
Expected: 7 tests pass and there are no type errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: IndexedDB schema v1 and repository functions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Parent word lists and stroke-data availability

**Files:**
- Create: `src/content/parseWordList.ts`, `src/content/strokes.ts`
- Test: `src/content/parseWordList.test.ts`, `src/content/strokes.test.ts`

**Interfaces:**
- Consumes: `Word` (Task 2), `makeWord` (Task 6).
- Produces:
  - `parseWordList(input: string): { words: ParsedWord[]; rejected: string[] }`, where `ParsedWord = { text: string; pinyin: string }`
  - `makeParentWords(parsed, opts: { listName; writeable; existing: Word[]; now: number; newId?: () => string }): { added: Word[]; promoted: Word[]; duplicates: string[] }`
  - `strokeUrl(char): string`
  - `strokeAvailability(char, fetcher?): Promise<'yes' | 'no' | 'unknown'>`
  - `loadStrokeData(char): Promise<unknown>`
  - `prefetchStrokes(chars, fetcher?, concurrency?): Promise<void>`
  - `type Fetcher = (url: string) => Promise<Response>`

- [ ] **Step 1: Write the failing tests**

`src/content/parseWordList.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { makeParentWords, parseWordList } from './parseWordList';

describe('parseWordList', () => {
  it('reads one word per line, ignoring blanks, spaces and numbering', () => {
    expect(parseWordList('1. 大人\n\n 朋 友 \n3、学校').words.map((w) => w.text)).toEqual(['大人', '朋友', '学校']);
  });
  it('skips repeats within the same paste', () => {
    expect(parseWordList('大人\n大人').words).toHaveLength(1);
  });
  it('rejects non-Chinese lines and words longer than 4 characters', () => {
    const r = parseWordList('hello\n我们是好朋友\n你好');
    expect(r.words.map((w) => w.text)).toEqual(['你好']);
    expect(r.rejected).toEqual(['hello', '我们是好朋友']);
  });
  it('gives pinyin that follows the word context', () => {
    expect(parseWordList('长大\n银行').words.map((w) => w.pinyin)).toEqual(['zhǎng dà', 'yín háng']);
  });
});

describe('makeParentWords', () => {
  const parsed = [
    { text: '朋友', pinyin: 'péng you' },
    { text: '大', pinyin: 'dà' },
    { text: '学校', pinyin: 'xué xiào' },
  ];
  const existing = [
    makeWord('大', { rank: 5, writeable: false }),
    makeWord('学校', { id: 'p:old', source: 'parent', rank: null, level: null, listName: '听写 1', listedAt: 1 }),
  ];
  const r = makeParentWords(parsed, { listName: '听写 2', writeable: true, existing, now: 1000, newId: () => 'n1' });

  it('adds new words as parent words in paste order', () => {
    expect(r.added).toEqual([
      expect.objectContaining({ id: 'p:n1', text: '朋友', pinyin: 'péng you', source: 'parent', listName: '听写 2', listedAt: 1000, writeable: true, paused: false }),
    ]);
  });
  it('pulls matching built-in words to the front instead of duplicating them', () => {
    expect(r.promoted).toEqual([expect.objectContaining({ id: 'b:大', listName: '听写 2', listedAt: 1001, writeable: true })]);
  });
  it('reports words already in an earlier list', () => {
    expect(r.duplicates).toEqual(['学校']);
  });
});
```

`src/content/strokes.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { prefetchStrokes, strokeAvailability, strokeUrl } from './strokes';

const res = (status: number) => ({ ok: status === 200, status }) as Response;

describe('stroke data', () => {
  it('builds the pinned CDN URL', () => {
    expect(strokeUrl('河')).toBe('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/%E6%B2%B3.json');
  });
  it('reports availability', async () => {
    expect(await strokeAvailability('河', async () => res(200))).toBe('yes');
    expect(await strokeAvailability('河', async () => res(404))).toBe('no');
    expect(await strokeAvailability('河', async () => res(503))).toBe('unknown');
    expect(await strokeAvailability('河', async () => { throw new TypeError('offline'); })).toBe('unknown');
  });
  it('prefetches each character once', async () => {
    const f = vi.fn(async () => res(200));
    await prefetchStrokes(['河', '河', '大'], f);
    expect(f).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/content/parseWordList.test.ts src/content/strokes.test.ts`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Implement `src/content/parseWordList.ts`**

```ts
import { pinyin } from 'pinyin-pro';
import type { Word } from '../types';

export interface ParsedWord {
  text: string;
  pinyin: string;
}

export interface ParseResult {
  words: ParsedWord[];
  rejected: string[];
}

export const MAX_WORD_LENGTH = 4;
const WORD = new RegExp(`^\\p{Script=Han}{1,${MAX_WORD_LENGTH}}$`, 'u');

export function parseWordList(input: string): ParseResult {
  const words: ParsedWord[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.replace(/^\s*\d+\s*[.、)）:：]?/, '').replace(/[\s　]+/g, '');
    if (!line) continue;
    if (!WORD.test(line)) {
      rejected.push(raw.trim());
      continue;
    }
    if (seen.has(line)) continue;
    seen.add(line);
    words.push({ text: line, pinyin: pinyin(line, { type: 'array' }).join(' ') });
  }
  return { words, rejected };
}

export interface ListOptions {
  listName: string;
  writeable: boolean;
  existing: Word[];
  now: number;
  newId?: () => string;
}

export interface ListResult {
  added: Word[];
  promoted: Word[];
  duplicates: string[];
}

/**
 * Turns parsed lines into words. Built-in words not yet on any list are pulled to the front
 * (given this list's name and time) rather than duplicated; words already on a list are reported.
 */
export function makeParentWords(parsed: ParsedWord[], opts: ListOptions): ListResult {
  const byText = new Map(opts.existing.map((w) => [w.text, w]));
  const newId = opts.newId ?? (() => crypto.randomUUID());
  const result: ListResult = { added: [], promoted: [], duplicates: [] };
  parsed.forEach((p, i) => {
    const listedAt = opts.now + i;
    const existing = byText.get(p.text);
    if (existing?.source === 'builtin' && existing.listName === undefined) {
      result.promoted.push({ ...existing, listName: opts.listName, listedAt, writeable: existing.writeable || opts.writeable, paused: false });
    } else if (existing) {
      result.duplicates.push(p.text);
    } else {
      result.added.push({
        id: `p:${newId()}`, text: p.text, pinyin: p.pinyin, level: null, rank: null, source: 'parent',
        listName: opts.listName, listedAt, writeable: opts.writeable, paused: false, createdAt: listedAt,
      });
    }
  });
  return result;
}
```

- [ ] **Step 4: Implement `src/content/strokes.ts`**

```ts
export const STROKE_DATA_VERSION = '2.0.1';

export type Fetcher = (url: string) => Promise<Response>;
export type StrokeAvailability = 'yes' | 'no' | 'unknown';

const defaultFetch: Fetcher = (url) => fetch(url);

export function strokeUrl(char: string): string {
  return `https://cdn.jsdelivr.net/npm/hanzi-writer-data@${STROKE_DATA_VERSION}/${encodeURIComponent(char)}.json`;
}

/** 'no' only when the CDN says the file does not exist; network trouble is 'unknown'. */
export async function strokeAvailability(char: string, fetcher: Fetcher = defaultFetch): Promise<StrokeAvailability> {
  try {
    const res = await fetcher(strokeUrl(char));
    if (res.ok) return 'yes';
    return res.status === 404 ? 'no' : 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function loadStrokeData(char: string): Promise<unknown> {
  const res = await fetch(strokeUrl(char));
  if (!res.ok) throw new Error(`Stroke data for ${char}: HTTP ${res.status}`);
  return res.json();
}

/** Warms the service-worker cache so writing works offline later. */
export async function prefetchStrokes(chars: string[], fetcher: Fetcher = defaultFetch, concurrency = 4): Promise<void> {
  const queue = [...new Set(chars)];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let c = queue.shift(); c !== undefined; c = queue.shift()) await strokeAvailability(c, fetcher);
    }),
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/content && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: parse pasted 听写 lists; stroke-data availability and prefetch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Daily session plan

**Files:**
- Create: `src/session/plan.ts`
- Test: `src/session/plan.test.ts`

**Interfaces:**
- Consumes: `isKnown` (Task 5), `endOfLocalDay` (Task 2), `shuffle` and `Rng` (Task 2), `makeWord` and `makeCard` (Task 6).
- Produces:
  - Constants: `REVIEW_CAP = 60`, `BACKLOG_PAUSE = 40`, `MAX_NEW_WRITE = 2`, `FREE_PLAY_SIZE = 20`, `STEP_ORDER`
  - `newWordOrder(a: Word, b: Word): number`
  - `buildSessionPlan(input: { cards: CardRecord[]; words: Word[]; settings: Settings; now: Date }): SessionPlan`
  - `buildFreePlayQueue(cards, words, rng, n?): FlashItem[]`

- [ ] **Step 1: Write the failing test** in `src/session/plan.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_SETTINGS, type Settings } from '../types';
import { buildFreePlayQueue, buildSessionPlan } from './plan';

const now = new Date(2026, 9, 2, 8, 0);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over });
const words = (n: number) => Array.from({ length: n }, (_, i) => makeWord(`字${i}`, { id: `b:${i}`, rank: i }));

describe('buildSessionPlan', () => {
  it('puts the most overdue reviews first and caps them at 60', () => {
    const ws = words(70);
    const cards = ws.map((w, i) => makeCard(w.id, 'recognise', hoursAgo(i + 1)));
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now });
    expect(plan.reviewWordIds).toHaveLength(60);
    expect(plan.reviewWordIds[0]).toBe('b:69');
  });

  it('includes cards due later today but not tomorrow', () => {
    const cards = [makeCard('b:0', 'recognise', new Date(2026, 9, 2, 22)), makeCard('b:1', 'recognise', new Date(2026, 9, 3, 1))];
    expect(buildSessionPlan({ cards, words: words(2), settings: settings(), now }).reviewWordIds).toEqual(['b:0']);
  });

  it('introduces listed words first (oldest list first), then by rank, skipping paused and started words', () => {
    const ws = [
      makeWord('a', { id: 'b:a', rank: 0 }),
      makeWord('b', { id: 'b:b', rank: 1, paused: true }),
      makeWord('c', { id: 'b:c', rank: 2 }),
      makeWord('d', { id: 'b:d', rank: 3 }),
      makeWord('朋友', { id: 'p:1', source: 'parent', rank: null, level: null, listedAt: 50, createdAt: 50 }),
      makeWord('大', { id: 'b:大', rank: 400, listedAt: 10 }),
    ];
    const cards = [makeCard('b:c', 'recognise', new Date(2026, 9, 9))];
    const plan = buildSessionPlan({ cards, words: ws, settings: settings({ newPerDay: 3 }), now });
    expect(plan.newWordIds).toEqual(['b:大', 'p:1', 'b:a']);
  });

  it('pauses new words when more than 40 cards are due', () => {
    const ws = words(50);
    const due = (n: number) => ws.slice(0, n).map((w) => makeCard(w.id, 'recognise', hoursAgo(1)));
    expect(buildSessionPlan({ cards: due(41), words: ws, settings: settings(), now }).newWordIds).toEqual([]);
    expect(buildSessionPlan({ cards: due(40), words: ws, settings: settings(), now }).newWordIds).toHaveLength(5);
  });

  it('offers due write cards first, then at most 2 new ones for known writeable words', () => {
    const ws = words(6).map((w, i) => ({ ...w, writeable: i !== 4 }));
    const future = new Date(2026, 9, 20);
    const cards = [
      makeCard('b:0', 'write', hoursAgo(2)),
      ...[1, 2, 3, 4].map((i) => makeCard(`b:${i}`, 'recognise', future, true)),
      makeCard('b:5', 'recognise', future, false),
    ];
    expect(buildSessionPlan({ cards, words: ws, settings: settings(), now }).writeCandidates).toEqual([
      { wordId: 'b:0', isNew: false },
      { wordId: 'b:1', isNew: true },
      { wordId: 'b:2', isNew: true },
    ]);
  });

  it('sizes the writing step and the flashcard time box from session minutes', () => {
    const p20 = buildSessionPlan({ cards: [], words: [], settings: settings({ sessionMinutes: 20 }), now });
    expect([p20.writeCount, p20.flashTimeBoxMs]).toEqual([3, 8 * 60_000]);
    expect(buildSessionPlan({ cards: [], words: [], settings: settings({ sessionMinutes: 25 }), now }).writeCount).toBe(5);
  });

  it('only includes switched-on activities, in the fixed order', () => {
    const s = settings({ activities: { flashcards: true, writing: false, components: true, speaking: false } });
    expect(buildSessionPlan({ cards: [], words: [], settings: s, now }).steps).toEqual(['flashcards', 'components']);
  });
});

describe('buildFreePlayQueue', () => {
  it('uses started, active words only, as retries (no scheduler reviews)', () => {
    const ws = [makeWord('a', { id: 'b:a' }), makeWord('b', { id: 'b:b', paused: true }), makeWord('c', { id: 'b:c' })];
    const cards = [makeCard('b:a', 'recognise', now), makeCard('b:b', 'recognise', now)];
    expect(buildFreePlayQueue(cards, ws, mulberry32(1))).toEqual([{ wordId: 'b:a', isNew: false, retry: true }]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/session/plan.test.ts`
Expected: FAIL, because `./plan` is missing.

- [ ] **Step 3: Implement `src/session/plan.ts`**

```ts
import { endOfLocalDay } from '../lib/date';
import { shuffle, type Rng } from '../lib/random';
import { isKnown } from '../srs/scheduler';
import type { CardKind, CardRecord, FlashItem, SessionPlan, Settings, StepKind, Word } from '../types';

export const REVIEW_CAP = 60;
export const BACKLOG_PAUSE = 40;
export const MAX_NEW_WRITE = 2;
export const FREE_PLAY_SIZE = 20;
export const STEP_ORDER: StepKind[] = ['flashcards', 'writing', 'components', 'speaking'];

const LAST = Number.MAX_SAFE_INTEGER;

/** Listed words first (oldest list first), then built-in words by rank. */
export function newWordOrder(a: Word, b: Word): number {
  return (a.listedAt ?? LAST) - (b.listedAt ?? LAST) || (a.rank ?? LAST) - (b.rank ?? LAST) || a.createdAt - b.createdAt;
}

export interface PlanInput {
  cards: CardRecord[];
  words: Word[];
  settings: Settings;
  now: Date;
}

export function buildSessionPlan({ cards, words, settings, now }: PlanInput): SessionPlan {
  const active = words.filter((w) => !w.paused);
  const activeIds = new Set(active.map((w) => w.id));
  const cutoff = endOfLocalDay(now).getTime();
  const ofKind = (kind: CardKind) => cards.filter((c) => c.kind === kind);
  const dueOf = (list: CardRecord[]) =>
    list
      .filter((c) => activeIds.has(c.wordId) && c.fsrs.due.getTime() <= cutoff)
      .sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());

  const recognise = ofKind('recognise');
  const started = new Set(recognise.map((c) => c.wordId));
  const dueRecognise = dueOf(recognise);
  const newLimit = dueRecognise.length > BACKLOG_PAUSE ? 0 : settings.newPerDay;

  const write = ofKind('write');
  const hasWrite = new Set(write.map((c) => c.wordId));
  const knownIds = new Set(recognise.filter((c) => isKnown(c.fsrs)).map((c) => c.wordId));

  return {
    steps: STEP_ORDER.filter((s) => settings.activities[s]),
    reviewWordIds: dueRecognise.slice(0, REVIEW_CAP).map((c) => c.wordId),
    newWordIds: active.filter((w) => !started.has(w.id)).sort(newWordOrder).slice(0, newLimit).map((w) => w.id),
    flashTimeBoxMs: settings.sessionMinutes * 60_000 * 0.4,
    writeCandidates: [
      ...dueOf(write).map((c) => ({ wordId: c.wordId, isNew: false })),
      ...active
        .filter((w) => w.writeable && knownIds.has(w.id) && !hasWrite.has(w.id))
        .sort(newWordOrder)
        .slice(0, MAX_NEW_WRITE)
        .map((w) => ({ wordId: w.id, isNew: true })),
    ],
    writeCount: settings.sessionMinutes < 25 ? 3 : 5,
  };
}

export function buildFreePlayQueue(cards: CardRecord[], words: Word[], rng: Rng, n = FREE_PLAY_SIZE): FlashItem[] {
  const active = new Set(words.filter((w) => !w.paused).map((w) => w.id));
  const ids = cards.filter((c) => c.kind === 'recognise' && active.has(c.wordId)).map((c) => c.wordId);
  return shuffle(ids, rng).slice(0, n).map((wordId) => ({ wordId, isNew: false, retry: true }));
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/session/plan.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: daily session plan (reviews, new words, writing, steps) and free play queue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Session runner and answer recording

**Files:**
- Create: `src/session/runner.ts` (pure), `src/session/record.ts` (uses the store)
- Test: `src/session/runner.test.ts`, `src/session/record.test.ts`

**Interfaces:**
- Consumes: `buildSessionPlan` (Task 8); `toRating`, `review`, `newCard` (Task 5); repo functions (Task 6); `localDateKey` (Task 2).
- Produces:
  - **runner.ts:**
    - `RETRY_GAP = 4`
    - `createSessionRecord(plan, date, now, free?): SessionRecord`, `createFreePlayRecord(queue, date, now): SessionRecord`
    - `currentStep(rec): StepKind | null`, `currentFlashItem(rec): FlashItem | null`, `currentWriteCandidate(rec): { wordId; isNew } | null`
    - `finishStep(rec)`, `afterFlashAnswer(rec, correct, elapsedMs)`, `skipFlashItem(rec)`, `afterWriteWord(rec, done, elapsedMs)`, `addActiveTime(rec, ms)`. Each returns a new `SessionRecord`.
  - **record.ts:**
    - `recordRecognition(db, wordId, { correct, responseMs }, now): Promise<CardRecord>`
    - `recordWriting(db, wordId, totalMisses, now): Promise<CardRecord>`
    - `startOrResumeSession(db, now): Promise<SessionRecord>`

- [ ] **Step 1: Write the failing tests**

`src/session/runner.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { SessionPlan } from '../types';
import {
  afterFlashAnswer, afterWriteWord, createFreePlayRecord, createSessionRecord, currentFlashItem,
  currentStep, currentWriteCandidate, finishStep, skipFlashItem,
} from './runner';

const plan = (over: Partial<SessionPlan> = {}): SessionPlan => ({
  steps: ['flashcards', 'writing'],
  reviewWordIds: ['r1', 'r2'],
  newWordIds: ['n1'],
  flashTimeBoxMs: 600_000,
  writeCandidates: [{ wordId: 'w1', isNew: false }, { wordId: 'w2', isNew: true }, { wordId: 'w3', isNew: true }],
  writeCount: 2,
  ...over,
});

describe('session runner', () => {
  it('queues reviews before new words', () => {
    const rec = createSessionRecord(plan(), '2026-10-02', 0);
    expect(rec.flashQueue.map((i) => [i.wordId, i.isNew])).toEqual([['r1', false], ['r2', false], ['n1', true]]);
    expect(currentStep(rec)).toBe('flashcards');
  });

  it('re-shows a wrong card later as a retry, only once', () => {
    let rec = createSessionRecord(plan(), 'd', 0);
    rec = afterFlashAnswer(rec, false, 1000);
    expect(rec.flashQueue.map((i) => i.wordId)).toEqual(['r1', 'r2', 'n1', 'r1']);
    expect(rec.flashQueue[3]).toEqual({ wordId: 'r1', isNew: false, retry: true });
    rec = afterFlashAnswer(rec, true, 1000);
    rec = afterFlashAnswer(rec, true, 1000);
    expect(currentFlashItem(rec)?.retry).toBe(true);
    rec = afterFlashAnswer(rec, false, 1000);
    expect(rec.flashQueue).toHaveLength(4);
    expect(currentStep(rec)).toBe('writing');
    expect(rec.completedSteps).toEqual(['flashcards']);
    expect(rec.activeMs).toBe(4000);
  });

  it('inserts the retry four cards later when the queue is long', () => {
    const rec = afterFlashAnswer(createSessionRecord(plan({ reviewWordIds: ['a', 'b', 'c', 'd', 'e', 'f'], newWordIds: [] }), 'd', 0), false, 10);
    expect(rec.flashQueue.map((i) => i.wordId)).toEqual(['a', 'b', 'c', 'd', 'e', 'a', 'f']);
  });

  it('ends flashcards when the time box runs out', () => {
    const rec = afterFlashAnswer(createSessionRecord(plan({ flashTimeBoxMs: 5000 }), 'd', 0), true, 6000);
    expect(currentStep(rec)).toBe('writing');
  });

  it('skips an item without counting time', () => {
    const rec = skipFlashItem(createSessionRecord(plan(), 'd', 0));
    expect(currentFlashItem(rec)?.wordId).toBe('r2');
    expect(rec.flashElapsedMs).toBe(0);
  });

  it('ends writing after writeCount words; skipped words do not count', () => {
    let rec = finishStep(createSessionRecord(plan(), 'd', 0));
    expect(currentWriteCandidate(rec)?.wordId).toBe('w1');
    rec = afterWriteWord(rec, false, 0);
    rec = afterWriteWord(rec, true, 1000);
    expect(rec.completed).toBe(false);
    rec = afterWriteWord(rec, true, 1000);
    expect(rec.completed).toBe(true);
    expect(rec.completedSteps).toEqual(['flashcards', 'writing']);
  });

  it('ends writing when the candidates run out', () => {
    let rec = finishStep(createSessionRecord(plan({ writeCandidates: [{ wordId: 'w1', isNew: false }] }), 'd', 0));
    rec = afterWriteWord(rec, true, 0);
    expect(rec.completed).toBe(true);
  });

  it('treats a plan with no steps as already complete', () => {
    expect(createSessionRecord(plan({ steps: [] }), 'd', 0).completed).toBe(true);
  });

  it('creates free play with only flashcards and no time box', () => {
    const rec = createFreePlayRecord([{ wordId: 'a', isNew: false, retry: true }], 'd', 0);
    expect(rec.free).toBe(true);
    expect(rec.plan.steps).toEqual(['flashcards']);
    expect(currentFlashItem(rec)?.wordId).toBe('a');
  });
});
```

`src/session/record.test.ts`:
```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { allCards, getSession, logsSince, putWords, saveSession } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { recordRecognition, recordWriting, startOrResumeSession } from './record';

const now = new Date(2026, 9, 2, 9);

describe('recording answers', () => {
  it('creates a card on the first answer and reviews it afterwards', async () => {
    const db = await freshDb();
    const first = await recordRecognition(db, 'b:大', { correct: true, responseMs: 1000 }, now);
    expect(first.id).toBe('b:大:recognise');
    const second = await recordRecognition(db, 'b:大', { correct: true, responseMs: 1000 }, new Date(first.fsrs.due.getTime() + 1000));
    expect(second.fsrs.reps).toBe(2);
    expect((await logsSince(db, 0)).map((l) => l.rating)).toEqual([Rating.Good, Rating.Good]);
  });

  it('records writing with its miss count', async () => {
    const db = await freshDb();
    await recordWriting(db, 'b:大', 2, now);
    const [log] = await logsSince(db, 0);
    expect(log).toMatchObject({ kind: 'write', misses: 2, rating: Rating.Hard, correct: true });
    expect((await allCards(db))[0]!.id).toBe('b:大:write');
  });
});

describe('startOrResumeSession', () => {
  it('resumes on the same day and starts fresh on a new day, keeping yesterday in history', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('大', { id: 'b:大' })]);
    const first = await startOrResumeSession(db, now);
    expect(first.plan.newWordIds).toEqual(['b:大']);
    await saveSession(db, { ...first, flashIndex: 1 });
    expect((await startOrResumeSession(db, new Date(2026, 9, 2, 18))).flashIndex).toBe(1);
    const tomorrow = await startOrResumeSession(db, new Date(2026, 9, 3, 9));
    expect(tomorrow.date).toBe('2026-10-03');
    expect(tomorrow.flashIndex).toBe(0);
    expect((await getSession(db, '2026-10-02'))?.flashIndex).toBe(1);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/session`
Expected: FAIL, because `./runner` and `./record` are missing.

- [ ] **Step 3: Implement `src/session/runner.ts`**

```ts
import type { FlashItem, SessionPlan, SessionRecord, StepKind } from '../types';

/** A wrong card comes back after this many other cards (or at the end of a short queue). */
export const RETRY_GAP = 4;

export function createSessionRecord(plan: SessionPlan, date: string, now: number, free = false): SessionRecord {
  const flashQueue: FlashItem[] = [
    ...plan.reviewWordIds.map((wordId) => ({ wordId, isNew: false, retry: false })),
    ...plan.newWordIds.map((wordId) => ({ wordId, isNew: true, retry: false })),
  ];
  return {
    date, startedAt: now, activeMs: 0, free, plan, stepIndex: 0,
    flashQueue, flashIndex: 0, flashElapsedMs: 0, writeIndex: 0, writeDone: 0,
    completedSteps: [], completed: plan.steps.length === 0,
  };
}

export function createFreePlayRecord(queue: FlashItem[], date: string, now: number): SessionRecord {
  const plan: SessionPlan = {
    steps: ['flashcards'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: Number.POSITIVE_INFINITY,
    writeCandidates: [], writeCount: 0,
  };
  return { ...createSessionRecord(plan, date, now, true), flashQueue: queue };
}

export function currentStep(rec: SessionRecord): StepKind | null {
  return rec.completed ? null : (rec.plan.steps[rec.stepIndex] ?? null);
}

export function currentFlashItem(rec: SessionRecord): FlashItem | null {
  return currentStep(rec) === 'flashcards' ? (rec.flashQueue[rec.flashIndex] ?? null) : null;
}

export function currentWriteCandidate(rec: SessionRecord): { wordId: string; isNew: boolean } | null {
  return currentStep(rec) === 'writing' ? (rec.plan.writeCandidates[rec.writeIndex] ?? null) : null;
}

export function finishStep(rec: SessionRecord): SessionRecord {
  const step = currentStep(rec);
  if (!step) return rec;
  const stepIndex = rec.stepIndex + 1;
  return { ...rec, stepIndex, completedSteps: [...rec.completedSteps, step], completed: stepIndex >= rec.plan.steps.length };
}

export function addActiveTime(rec: SessionRecord, ms: number): SessionRecord {
  return { ...rec, activeMs: rec.activeMs + ms };
}

export function afterFlashAnswer(rec: SessionRecord, correct: boolean, elapsedMs: number): SessionRecord {
  const item = currentFlashItem(rec);
  if (!item) return rec;
  const flashQueue = [...rec.flashQueue];
  if (!correct && !item.retry) {
    flashQueue.splice(Math.min(rec.flashIndex + 1 + RETRY_GAP, flashQueue.length), 0, { ...item, isNew: false, retry: true });
  }
  const next: SessionRecord = {
    ...rec,
    flashQueue,
    flashIndex: rec.flashIndex + 1,
    flashElapsedMs: rec.flashElapsedMs + elapsedMs,
    activeMs: rec.activeMs + elapsedMs,
  };
  const done = next.flashIndex >= flashQueue.length || next.flashElapsedMs >= rec.plan.flashTimeBoxMs;
  return done ? finishStep(next) : next;
}

export function skipFlashItem(rec: SessionRecord): SessionRecord {
  const next = { ...rec, flashIndex: rec.flashIndex + 1 };
  return next.flashIndex >= rec.flashQueue.length ? finishStep(next) : next;
}

/** done=false means the word was skipped (e.g. no stroke data) and does not count. */
export function afterWriteWord(rec: SessionRecord, done: boolean, elapsedMs: number): SessionRecord {
  const next: SessionRecord = {
    ...rec,
    writeIndex: rec.writeIndex + 1,
    writeDone: rec.writeDone + (done ? 1 : 0),
    activeMs: rec.activeMs + elapsedMs,
  };
  const finished = next.writeDone >= rec.plan.writeCount || next.writeIndex >= rec.plan.writeCandidates.length;
  return finished ? finishStep(next) : next;
}
```

- [ ] **Step 4: Implement `src/session/record.ts`**

```ts
import { localDateKey } from '../lib/date';
import { newCard, review, toRating } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { addReviewLog, allCards, allWords, getCard, getSession, getSettings, putCards, saveSession } from '../store/repo';
import type { CardKind, CardRecord, Grade, SessionRecord } from '../types';
import { buildSessionPlan } from './plan';
import { createSessionRecord } from './runner';

async function reviewCard(db: AppDb, wordId: string, kind: CardKind, rating: Grade, now: Date): Promise<CardRecord> {
  const id = `${wordId}:${kind}`;
  const existing = await getCard(db, id);
  const rec: CardRecord = { id, wordId, kind, fsrs: review(existing?.fsrs ?? newCard(now), rating, now) };
  await putCards(db, [rec]);
  return rec;
}

export async function recordRecognition(
  db: AppDb, wordId: string, outcome: { correct: boolean; responseMs: number }, now: Date,
): Promise<CardRecord> {
  const rating = toRating({ kind: 'recognise', ...outcome });
  const card = await reviewCard(db, wordId, 'recognise', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'recognise', at: now.getTime(), rating, ...outcome });
  return card;
}

export async function recordWriting(db: AppDb, wordId: string, totalMisses: number, now: Date): Promise<CardRecord> {
  const rating = toRating({ kind: 'write', totalMisses });
  const card = await reviewCard(db, wordId, 'write', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'write', at: now.getTime(), rating, correct: totalMisses <= 3, misses: totalMisses });
  return card;
}

/** Today's session if one exists (finished or not), otherwise a new plan. Earlier days are never resumed. */
export async function startOrResumeSession(db: AppDb, now: Date): Promise<SessionRecord> {
  const date = localDateKey(now);
  const existing = await getSession(db, date);
  if (existing) return existing;
  const [cards, words, settings] = await Promise.all([allCards(db), allWords(db), getSettings(db)]);
  const rec = createSessionRecord(buildSessionPlan({ cards, words, settings, now }), date, now.getTime());
  await saveSession(db, rec);
  return rec;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/session && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: session runner state machine and answer recording

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Distractor selection for flashcards

**Files:**
- Create: `src/activities/flashcards/distractors.ts`
- Test: `src/activities/flashcards/distractors.test.ts`

**Interfaces:**
- Consumes: `wordComponents`, `builtinWords` (Task 4), `shuffle` and `Rng` (Task 2).
- Produces:
  - `toneless(pinyin): string` (keeps ü)
  - `syllableTone(s): { base: string; tone: number }` (tone 5 means neutral)
  - `withTone(base, tone): string`
  - `pickCharacterDistractors(target: Word, pool: Word[], rng: Rng, n = 3): Word[]`
  - `pickPinyinDistractors(target: Word, pool: Word[], rng: Rng, n = 3): string[]`

- [ ] **Step 1: Write the failing test** in `src/activities/flashcards/distractors.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../../content';
import { mulberry32 } from '../../lib/random';
import { makeWord } from '../../test/fixtures';
import { pickCharacterDistractors, pickPinyinDistractors, syllableTone, toneless, withTone } from './distractors';

const all = builtinWords(0);
const w = (t: string) => all.find((x) => x.text === t)!;

describe('pinyin helpers', () => {
  it('strips tones but keeps ü', () => {
    expect(toneless('hé')).toBe('he');
    expect(toneless('péng you')).toBe('peng you');
    expect(toneless('lǜ')).toBe('lü');
  });
  it('splits a syllable into base and tone', () => {
    expect(syllableTone('lǜ')).toEqual({ base: 'lü', tone: 4 });
    expect(syllableTone('de')).toEqual({ base: 'de', tone: 5 });
  });
  it('places tone marks by the standard rules', () => {
    const bases = ['hao', 'gou', 'gui', 'liu', 'xie', 'lü'];
    const tones = [3, 1, 4, 4, 2, 4];
    expect(bases.map((b, i) => withTone(b, tones[i]!))).toEqual(['hǎo', 'gōu', 'guì', 'liù', 'xié', 'lǜ']);
  });
});

describe('pickCharacterDistractors', () => {
  it('prefers look-alikes and never offers a sound-alike', () => {
    const pool = ['喝', '汉', '洗', '汽', '大', '人', '口', '他'].map(w);
    const picked = pickCharacterDistractors(w('河'), pool, mulberry32(3)).map((x) => x.text);
    expect([...picked].sort()).toEqual(['汉', '汽', '洗'].sort());
  });
  it('only offers options of the same length, and fewer when the pool is small', () => {
    const target = makeWord('大人', { id: 'p:1', pinyin: 'dà rén', source: 'parent', level: null, rank: null });
    const pool = [w('大'), w('人'), makeWord('朋友', { id: 'p:2', pinyin: 'péng you', level: null, rank: null })];
    expect(pickCharacterDistractors(target, pool, mulberry32(1)).map((x) => x.text)).toEqual(['朋友']);
  });
  it('never returns the target or duplicates', () => {
    expect(pickCharacterDistractors(w('河'), [w('河'), w('河'), w('汉'), w('汉')], mulberry32(1)).map((x) => x.text)).toEqual(['汉']);
  });
});

describe('pickPinyinDistractors', () => {
  it('returns three distinct wrong options including a tone change', () => {
    const opts = pickPinyinDistractors(w('河'), all, mulberry32(5));
    expect(opts).toHaveLength(3);
    expect(new Set(opts).size).toBe(3);
    expect(opts).not.toContain('hé');
    expect(opts.some((o) => ['hē', 'hě', 'hè'].includes(o))).toBe(true);
  });
  it('still gives three options for a two-syllable word with an empty pool', () => {
    const opts = pickPinyinDistractors(makeWord('朋友', { pinyin: 'péng you' }), [], mulberry32(2));
    expect(opts).toHaveLength(3);
    expect(opts.every((o) => o.split(' ').length === 2 && o !== 'péng you')).toBe(true);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/activities/flashcards`
Expected: FAIL, because `./distractors` is missing.

- [ ] **Step 3: Implement `src/activities/flashcards/distractors.ts`**

```ts
import { wordComponents } from '../../content';
import { shuffle, type Rng } from '../../lib/random';
import type { Word } from '../../types';

const MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};
const UNMARK = new Map<string, [string, number]>(
  Object.entries(MARKS).flatMap(([vowel, marked]) => marked.map((m, i): [string, [string, number]] => [m, [vowel, i + 1]])),
);

export function syllableTone(s: string): { base: string; tone: number } {
  let base = '';
  let tone = 5;
  for (const ch of s) {
    const hit = UNMARK.get(ch);
    if (hit) {
      base += hit[0];
      tone = hit[1];
    } else {
      base += ch;
    }
  }
  return { base, tone };
}

export function toneless(pinyin: string): string {
  return pinyin.trim().toLowerCase().split(/\s+/).map((s) => syllableTone(s).base).join(' ');
}

/** Standard placement: a, else e, else the o of "ou", else the last of i/o/u/ü. */
export function withTone(base: string, tone: number): string {
  if (tone < 1 || tone > 4) return base;
  const idx = base.includes('a')
    ? base.indexOf('a')
    : base.includes('e')
      ? base.indexOf('e')
      : base.includes('ou')
        ? base.indexOf('o')
        : Math.max(...['i', 'o', 'u', 'ü'].map((v) => base.lastIndexOf(v)));
  if (idx < 0) return base;
  return base.slice(0, idx) + MARKS[base[idx]!]![tone - 1] + base.slice(idx + 1);
}

const lengthOf = (w: Word) => Array.from(w.text).length;

function sharesComponent(a: Word, b: Word): boolean {
  const parts = new Set(wordComponents(a.text));
  return wordComponents(b.text).some((p) => parts.has(p));
}

export function pickCharacterDistractors(target: Word, pool: Word[], rng: Rng, n = 3): Word[] {
  const sound = toneless(target.pinyin);
  const eligible = pool.filter((w) => lengthOf(w) === lengthOf(target) && w.text !== target.text && toneless(w.pinyin) !== sound);
  const tiers = [
    eligible.filter((w) => sharesComponent(target, w)),
    eligible.filter((w) => w.level !== null && w.level === target.level),
    eligible,
  ];
  const picked: Word[] = [];
  const usedText = new Set([target.text]);
  for (const tier of tiers) {
    for (const w of shuffle(tier, rng)) {
      if (picked.length >= n) return picked;
      if (usedText.has(w.text)) continue;
      picked.push(w);
      usedText.add(w.text);
    }
  }
  return picked;
}

export function pickPinyinDistractors(target: Word, pool: Word[], rng: Rng, n = 3): string[] {
  const used = new Set([target.pinyin]);
  const out: string[] = [];
  const add = (p: string) => {
    if (out.length < n && p && !used.has(p)) {
      used.add(p);
      out.push(p);
    }
  };

  const syllables = target.pinyin.split(' ');
  const toneVariants: string[] = [];
  syllables.forEach((s, i) => {
    const { base, tone } = syllableTone(s);
    for (const t of [1, 2, 3, 4]) {
      if (t === tone) continue;
      const copy = [...syllables];
      copy[i] = withTone(base, t);
      toneVariants.push(copy.join(' '));
    }
  });
  const variants = shuffle(toneVariants, rng);

  // Tier 1: up to two tone changes (so options are not all the same syllable).
  variants.slice(0, 2).forEach(add);
  // Tier 2: pinyin of look-alike words; tier 3: any word of the same length.
  const sameLength = pool.filter((w) => w.pinyin.split(' ').length === syllables.length && w.text !== target.text);
  shuffle(sameLength.filter((w) => sharesComponent(target, w)), rng).forEach((w) => add(w.pinyin));
  shuffle(sameLength, rng).forEach((w) => add(w.pinyin));
  // Tiny pools: fill with the remaining tone variants.
  variants.forEach(add);
  return out;
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/activities/flashcards`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: flashcard distractors (look-alikes, no sound-alikes, tone variants)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Components game logic

**Files:**
- Create: `src/activities/components/game.ts`
- Test: `src/activities/components/game.test.ts`

**Interfaces:**
- Consumes: `getCharInfo` (Task 4), `RADICALS` (Task 4), `shuffle` and `Rng` (Task 2).
- Produces:
  - `MIN_KNOWN = 12`, `ROUND_SIZE = 6`, `GRID_SIZE = 8`
  - `type TapAllQuestion = { kind: 'tapAll'; component: string; grid: string[]; answers: string[] }`
  - `type WhichPartQuestion = { kind: 'whichPart'; char: string; component: string; options: string[] }`, where `component` is the answer
  - `type ComponentQuestion = TapAllQuestion | WhichPartQuestion`
  - `charHasComponent(char, component): boolean`
  - `buildComponentRound(known: string[], rng): ComponentQuestion[] | null`

- [ ] **Step 1: Write the failing test** in `src/activities/components/game.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { RADICALS } from '../../content/radicals';
import { mulberry32 } from '../../lib/random';
import { buildComponentRound, charHasComponent, type TapAllQuestion, type WhichPartQuestion } from './game';

const KNOWN = [...'河汉洗汽没喝吃叫吗呢他你们休大人口一二三好妈姐妹'];

describe('buildComponentRound', () => {
  it('needs at least 12 known characters', () => {
    expect(buildComponentRound(KNOWN.slice(0, 11), mulberry32(1))).toBeNull();
  });

  const round = buildComponentRound(KNOWN, mulberry32(7))!;

  it('builds 6 questions, alternating kinds', () => {
    expect(round).toHaveLength(6);
    expect(round.map((q) => q.kind)).toEqual(['tapAll', 'whichPart', 'tapAll', 'whichPart', 'tapAll', 'whichPart']);
  });

  it('tap-all questions have 2–4 correct fish in a grid of 8 distinct characters', () => {
    for (const q of round.filter((q): q is TapAllQuestion => q.kind === 'tapAll')) {
      expect(q.grid).toHaveLength(8);
      expect(new Set(q.grid).size).toBe(8);
      expect(q.answers.length).toBeGreaterThanOrEqual(2);
      expect(q.answers.length).toBeLessThanOrEqual(4);
      for (const c of q.grid) expect(charHasComponent(c, q.component)).toBe(q.answers.includes(c));
    }
  });

  it('which-part questions offer real parts with the answer exactly once', () => {
    for (const q of round.filter((q): q is WhichPartQuestion => q.kind === 'whichPart')) {
      expect(RADICALS[q.component]).toBeDefined();
      expect(q.options.filter((o) => o === q.component)).toHaveLength(1);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(charHasComponent(q.char, q.component)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/activities/components`
Expected: FAIL, because `./game` is missing.

- [ ] **Step 3: Implement `src/activities/components/game.ts`**

```ts
import { getCharInfo } from '../../content';
import { RADICALS } from '../../content/radicals';
import { shuffle, type Rng } from '../../lib/random';

export const MIN_KNOWN = 12;
export const ROUND_SIZE = 6;
export const GRID_SIZE = 8;

export interface TapAllQuestion {
  kind: 'tapAll';
  component: string;
  grid: string[];
  answers: string[];
}

export interface WhichPartQuestion {
  kind: 'whichPart';
  char: string;
  component: string; // the correct option
  options: string[];
}

export type ComponentQuestion = TapAllQuestion | WhichPartQuestion;

export function charHasComponent(char: string, component: string): boolean {
  const info = getCharInfo(char);
  return !!info && char !== component && (info.radical === component || info.components.includes(component));
}

export function buildComponentRound(known: string[], rng: Rng): ComponentQuestion[] | null {
  const chars = [...new Set(known.filter((c) => getCharInfo(c)))];
  if (chars.length < MIN_KNOWN) return null;

  const families = Object.keys(RADICALS)
    .map((component) => ({ component, members: chars.filter((c) => charHasComponent(c, component)) }))
    .filter((f) => f.members.length >= 2);

  const tapAll: TapAllQuestion[] = shuffle(families, rng).flatMap((f) => {
    const answers = shuffle(f.members, rng).slice(0, 4);
    const others = shuffle(chars.filter((c) => c !== f.component && !charHasComponent(c, f.component)), rng).slice(0, GRID_SIZE - answers.length);
    if (answers.length + others.length < GRID_SIZE) return [];
    return [{ kind: 'tapAll' as const, component: f.component, answers, grid: shuffle([...answers, ...others], rng) }];
  });

  const whichPart: WhichPartQuestion[] = shuffle(chars, rng).flatMap((char) => {
    const parts = getCharInfo(char)!.components.filter((p) => p !== char);
    const component = parts.find((p) => RADICALS[p]);
    if (!component || parts.length < 2) return [];
    const sameMeaning = RADICALS[component]!.zh;
    const others = parts.filter((p) => p !== component && RADICALS[p]?.zh !== sameMeaning);
    if (!others.length) return [];
    return [{ kind: 'whichPart' as const, char, component, options: shuffle([component, ...shuffle(others, rng).slice(0, 2)], rng) }];
  });

  const out: ComponentQuestion[] = [];
  for (let i = 0; out.length < ROUND_SIZE && (i < tapAll.length || i < whichPart.length); i++) {
    if (tapAll[i]) out.push(tapAll[i]!);
    if (out.length < ROUND_SIZE && whichPart[i]) out.push(whichPart[i]!);
  }
  return out.length ? out : null;
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/activities/components`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: components game rounds (tap-all fishing, which-part)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Placement logic

**Files:**
- Create: `src/placement/placement.ts` (pure), `src/placement/apply.ts` (uses the store)
- Test: `src/placement/placement.test.ts`, `src/placement/apply.test.ts`

**Interfaces:**
- Consumes: `seededKnownCard` and `isKnown` (Task 5), repo functions (Task 6), `builtinWords` (Task 4).
- Produces:
  - `PLACEMENT_SAMPLES = 40`
  - `pickPlacementSamples(words, n?): Word[]`
  - `placementCutoff(samples, known: boolean[]): number`
  - `seedPlacementCards(words, cutoffRank, now): CardRecord[]`
  - `applyPlacement(db, cutoffRank, now): Promise<number>`, which returns the number of new cards seeded and sets `placementDone`

- [ ] **Step 1: Write the failing tests**

`src/placement/placement.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { isKnown } from '../srs/scheduler';
import { pickPlacementSamples, placementCutoff, seedPlacementCards } from './placement';

const words = builtinWords(0);
const now = new Date(2026, 9, 2, 9);

describe('placement', () => {
  it('picks 40 samples evenly across the built-in ranking', () => {
    const s = pickPlacementSamples(words);
    expect(s).toHaveLength(40);
    expect([s[0]!.rank, s[1]!.rank, s[39]!.rank]).toEqual([0, 15, 585]);
  });
  it('uses the rank of the first unknown sample as the cut-off', () => {
    const s = pickPlacementSamples(words);
    expect(placementCutoff(s.slice(0, 4), [true, true, true, false])).toBe(45);
    expect(placementCutoff(s.slice(0, 1), [false])).toBe(0);
    expect(placementCutoff(s, s.map(() => true))).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('seeds known cards only below the cut-off', () => {
    const cards = seedPlacementCards(words, 45, now);
    expect(cards).toHaveLength(45);
    expect(cards.every((c) => isKnown(c.fsrs) && c.kind === 'recognise')).toBe(true);
    expect(cards[0]!.id).toBe(`${words[0]!.id}:recognise`);
  });
});
```

`src/placement/apply.test.ts`:
```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { isKnown } from '../srs/scheduler';
import { allCards, getSettings, putCards, putWords } from '../store/repo';
import { freshDb, makeCard } from '../test/fixtures';
import { applyPlacement } from './apply';

describe('applyPlacement', () => {
  it('seeds missing cards, keeps existing ones, and marks placement done', async () => {
    const db = await freshDb();
    const now = new Date(2026, 9, 2, 9);
    const words = builtinWords(0).slice(0, 10);
    await putWords(db, words);
    await putCards(db, [makeCard(words[0]!.id, 'recognise', now)]);
    expect(await applyPlacement(db, 5, now)).toBe(4);
    const first = (await allCards(db)).find((c) => c.wordId === words[0]!.id)!;
    expect(isKnown(first.fsrs)).toBe(false);
    expect((await getSettings(db)).placementDone).toBe(true);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/placement`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Implement**

`src/placement/placement.ts`:
```ts
import { seededKnownCard } from '../srs/scheduler';
import type { CardRecord, Word } from '../types';

export const PLACEMENT_SAMPLES = 40;

const builtinByRank = (words: Word[]) =>
  words.filter((w) => w.source === 'builtin' && w.rank !== null).sort((a, b) => a.rank! - b.rank!);

export function pickPlacementSamples(words: Word[], n = PLACEMENT_SAMPLES): Word[] {
  const ranked = builtinByRank(words);
  if (ranked.length <= n) return ranked;
  return Array.from({ length: n }, (_, i) => ranked[Math.floor((i * ranked.length) / n)]!);
}

/** Everything ranked before the first "don't know" counts as known. All known → everything. */
export function placementCutoff(samples: Word[], known: boolean[]): number {
  const firstUnknown = known.findIndex((k) => !k);
  return firstUnknown === -1 ? Number.MAX_SAFE_INTEGER : samples[firstUnknown]!.rank!;
}

export function seedPlacementCards(words: Word[], cutoffRank: number, now: Date): CardRecord[] {
  return builtinByRank(words)
    .filter((w) => w.rank! < cutoffRank)
    .map((w) => ({ id: `${w.id}:recognise`, wordId: w.id, kind: 'recognise' as const, fsrs: seededKnownCard(now) }));
}
```

`src/placement/apply.ts`:
```ts
import type { AppDb } from '../store/db';
import { allCards, allWords, putCards, updateSettings } from '../store/repo';
import { seedPlacementCards } from './placement';

export async function applyPlacement(db: AppDb, cutoffRank: number, now: Date): Promise<number> {
  const [words, cards] = await Promise.all([allWords(db), allCards(db)]);
  const existing = new Set(cards.map((c) => c.id));
  const seeds = seedPlacementCards(words, cutoffRank, now).filter((c) => !existing.has(c.id));
  await putCards(db, seeds);
  await updateSettings(db, { placementDone: true });
  return seeds.length;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/placement && npx tsc --noEmit`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: placement sampling, cut-off and seeding

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Progress stats and knowledge summary

**Files:**
- Create: `src/stats/stats.ts`, `src/app/knowledge.ts`
- Test: `src/stats/stats.test.ts`

**Interfaces:**
- Consumes: `isKnown` (Task 5), date helpers (Task 2), `allWords` and `allCards` (Task 6), `createSessionRecord` (Task 9, used in tests).
- Produces:
  - `interface Knowledge { words; cards; wordsById: Map<string, Word>; cardsById: Map<string, CardRecord>; knownWordIds: Set<string>; knownChars: Set<string>; known: number; written: number }`
  - `summarize(words, cards): Knowledge`
  - `streak(sessions, today: string): number`
  - `totalStars(sessions, bonusStars): number`
  - `minutesPerDay(sessions, today, days = 30): { date: string; minutes: number }[]`
  - `weeklyAccuracy(logs, now, weeks = 6): { weekStart: string; accuracy: number | null }[]`
  - `troubleWords(logs, limit = 10): { wordId: string; misses: number }[]`
  - `dueTomorrow(cards, words, now): number`
  - `loadKnowledge(db): Promise<Knowledge>`, in `src/app/knowledge.ts`

- [ ] **Step 1: Write the failing test** in `src/stats/stats.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { createSessionRecord } from '../session/runner';
import { makeCard, makeWord } from '../test/fixtures';
import type { ReviewLog, SessionPlan, SessionRecord } from '../types';
import { dueTomorrow, minutesPerDay, streak, summarize, totalStars, troubleWords, weeklyAccuracy } from './stats';

const emptyPlan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const session = (date: string, over: Partial<SessionRecord> = {}): SessionRecord => ({ ...createSessionRecord(emptyPlan, date, 0), completed: true, ...over });
const log = (wordId: string, rating: ReviewLog['rating'], at: number): ReviewLog => ({
  cardId: `${wordId}:recognise`, wordId, kind: 'recognise', at, rating, correct: rating !== Rating.Again,
});

describe('summarize', () => {
  it('counts known recognise and write cards and collects known single characters', () => {
    const now = new Date(2026, 9, 2);
    const words = [makeWord('大'), makeWord('朋友', { id: 'p:1' }), makeWord('人')];
    const cards = [
      makeCard('b:大', 'recognise', now, true),
      makeCard('p:1', 'recognise', now, true),
      makeCard('b:人', 'recognise', now, false),
      makeCard('b:大', 'write', now, true),
    ];
    const k = summarize(words, cards);
    expect([k.known, k.written]).toEqual([2, 1]);
    expect([...k.knownChars]).toEqual(['大']);
    expect(k.knownWordIds.has('p:1')).toBe(true);
  });
});

describe('streak', () => {
  const sessions = [session('2026-09-29'), session('2026-09-30'), session('2026-10-01'), session('2026-09-27')];
  it('counts consecutive completed days up to yesterday while today is not done', () => {
    expect(streak(sessions, '2026-10-02')).toBe(3);
  });
  it('includes today once it is done', () => {
    expect(streak([...sessions, session('2026-10-02')], '2026-10-02')).toBe(4);
  });
  it('ignores unfinished sessions', () => {
    expect(streak([session('2026-10-01', { completed: false })], '2026-10-02')).toBe(0);
  });
});

describe('totals', () => {
  it('adds completed steps and chest bonus stars', () => {
    const sessions = [session('a', { completedSteps: ['flashcards', 'writing'] }), session('b', { completedSteps: ['flashcards'] })];
    expect(totalStars(sessions, 3)).toBe(6);
  });
  it('lists minutes for each of the last N days, zero-filled', () => {
    expect(minutesPerDay([session('2026-10-01', { activeMs: 12 * 60_000 })], '2026-10-02', 3)).toEqual([
      { date: '2026-09-30', minutes: 0 },
      { date: '2026-10-01', minutes: 12 },
      { date: '2026-10-02', minutes: 0 },
    ]);
  });
});

describe('logs and cards', () => {
  const now = new Date(2026, 9, 2, 12);
  it('ranks trouble words by number of Again ratings', () => {
    const logs = [log('a', Rating.Again, 1), log('b', Rating.Again, 2), log('b', Rating.Again, 3), log('c', Rating.Good, 4)];
    expect(troubleWords(logs)).toEqual([{ wordId: 'b', misses: 2 }, { wordId: 'a', misses: 1 }]);
  });
  it('computes weekly accuracy for 7-day windows ending today, null when empty', () => {
    const at = new Date(2026, 9, 2, 9).getTime();
    expect(weeklyAccuracy([log('a', Rating.Good, at), log('a', Rating.Again, at)], now, 2)).toEqual([
      { weekStart: '2026-09-19', accuracy: null },
      { weekStart: '2026-09-26', accuracy: 0.5 },
    ]);
  });
  it('counts cards due tomorrow for active words only', () => {
    const words = [makeWord('a', { id: 'a' }), makeWord('b', { id: 'b', paused: true })];
    const cards = [
      makeCard('a', 'recognise', new Date(2026, 9, 3, 10)),
      makeCard('b', 'recognise', new Date(2026, 9, 3, 10)),
      makeCard('a', 'write', new Date(2026, 9, 2, 20)),
    ];
    expect(dueTomorrow(cards, words, now)).toBe(1);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/stats`
Expected: FAIL, because `./stats` is missing.

- [ ] **Step 3: Implement `src/stats/stats.ts`**

```ts
import { Rating } from 'ts-fsrs';
import { addDays, endOfLocalDay, localDateKey, parseDateKey } from '../lib/date';
import { isKnown } from '../srs/scheduler';
import type { CardRecord, ReviewLog, SessionRecord, Word } from '../types';

export interface Knowledge {
  words: Word[];
  cards: CardRecord[];
  wordsById: Map<string, Word>;
  cardsById: Map<string, CardRecord>;
  knownWordIds: Set<string>;
  knownChars: Set<string>; // single-character words the child knows
  known: number;
  written: number;
}

export function summarize(words: Word[], cards: CardRecord[]): Knowledge {
  const wordsById = new Map(words.map((w) => [w.id, w]));
  const knownWordIds = new Set(cards.filter((c) => c.kind === 'recognise' && isKnown(c.fsrs)).map((c) => c.wordId));
  const knownChars = new Set<string>();
  for (const id of knownWordIds) {
    const text = wordsById.get(id)?.text;
    if (text && Array.from(text).length === 1) knownChars.add(text);
  }
  return {
    words,
    cards,
    wordsById,
    cardsById: new Map(cards.map((c) => [c.id, c])),
    knownWordIds,
    knownChars,
    known: knownWordIds.size,
    written: cards.filter((c) => c.kind === 'write' && isKnown(c.fsrs)).length,
  };
}

/** Consecutive completed days ending today (or yesterday, while today is still to do). */
export function streak(sessions: SessionRecord[], today: string): number {
  const done = new Set(sessions.filter((s) => s.completed && !s.free).map((s) => s.date));
  let day = parseDateKey(today);
  if (!done.has(today)) day = addDays(day, -1);
  let n = 0;
  while (done.has(localDateKey(day))) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function totalStars(sessions: SessionRecord[], bonusStars: number): number {
  return sessions.reduce((sum, s) => sum + s.completedSteps.length, 0) + bonusStars;
}

export function minutesPerDay(sessions: SessionRecord[], today: string, days = 30): { date: string; minutes: number }[] {
  const byDate = new Map(sessions.map((s) => [s.date, Math.round(s.activeMs / 60_000)]));
  const end = parseDateKey(today);
  return Array.from({ length: days }, (_, i) => {
    const date = localDateKey(addDays(end, i - days + 1));
    return { date, minutes: byDate.get(date) ?? 0 };
  });
}

export function weeklyAccuracy(logs: ReviewLog[], now: Date, weeks = 6): { weekStart: string; accuracy: number | null }[] {
  const today = parseDateKey(localDateKey(now));
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(today, -7 * (weeks - i) + 1);
    const end = addDays(start, 7).getTime();
    const inWeek = logs.filter((l) => l.at >= start.getTime() && l.at < end);
    return {
      weekStart: localDateKey(start),
      accuracy: inWeek.length ? inWeek.filter((l) => l.correct).length / inWeek.length : null,
    };
  });
}

export function troubleWords(logs: ReviewLog[], limit = 10): { wordId: string; misses: number }[] {
  const misses = new Map<string, number>();
  for (const l of logs) if (l.rating === Rating.Again) misses.set(l.wordId, (misses.get(l.wordId) ?? 0) + 1);
  return [...misses]
    .map(([wordId, n]) => ({ wordId, misses: n }))
    .sort((a, b) => b.misses - a.misses || a.wordId.localeCompare(b.wordId))
    .slice(0, limit);
}

export function dueTomorrow(cards: CardRecord[], words: Word[], now: Date): number {
  const active = new Set(words.filter((w) => !w.paused).map((w) => w.id));
  const from = endOfLocalDay(now).getTime();
  const to = endOfLocalDay(addDays(now, 1)).getTime();
  return cards.filter((c) => active.has(c.wordId) && c.fsrs.due.getTime() > from && c.fsrs.due.getTime() <= to).length;
}
```

- [ ] **Step 4: Implement `src/app/knowledge.ts`**

```ts
import { summarize, type Knowledge } from '../stats/stats';
import type { AppDb } from '../store/db';
import { allCards, allWords } from '../store/repo';

export type { Knowledge };

export async function loadKnowledge(db: AppDb): Promise<Knowledge> {
  const [words, cards] = await Promise.all([allWords(db), allCards(db)]);
  return summarize(words, cards);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/stats && npx tsc --noEmit`
Expected: 9 tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: progress stats (streak, stars, minutes, accuracy, trouble words)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Fun rules (pet, chest, combo, sticker families, reward goals)

**Files:**
- Create: `src/fun/pet.ts`, `src/fun/stickers.ts`, `src/fun/rewards.ts`
- Test: `src/fun/pet.test.ts`, `src/fun/stickers.test.ts`, `src/fun/rewards.test.ts`

**Interfaces:**
- Consumes: `mulberry32`, `seedFromString`, `Rng` (Task 2); `RADICALS` (Task 4); `BUILTIN` (Task 4).
- Produces:
  - **pet.ts, constants:** `STAGE_THRESHOLDS`, `STAGE_LOOKS: { emoji; scale; glow; name }[]`, `PET_COLORS: Record<PetColor, { zh; hue }>`, `ACCESSORIES: string[]` (16), `CHEERS`, `COMFORTS`, `CHEST_BONUS_STARS = 3`
  - **pet.ts, functions:** `petStage(known): number`, `canOpenChest(kid, today): boolean`, `openChest(kid, today): { kid: KidState; result: ChestResult }`, `comboMilestone(combo): boolean`, `pickLine(lines, rng): string`
  - **stickers.ts:** `MIN_FAMILY_SIZE = 3`, `StickerFamily = { component; meaning: RadicalMeaning; chars: string[] }`, `stickerFamilies(builtin): StickerFamily[]`, `familyProgress(f, knownChars): { known; total; complete }`, `completedBadges(families, knownChars): string[]`, `newBadges(families, knownChars, seen): string[]`
  - **rewards.ts:** `goalProgress(goal, { stars, known }): { value; fraction; reached }`, `nextGoal(goals): RewardGoal | null`

- [ ] **Step 1: Write the failing tests**

`src/fun/pet.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_KID } from '../types';
import { ACCESSORIES, canOpenChest, CHEST_BONUS_STARS, comboMilestone, openChest, petStage } from './pet';

describe('pet', () => {
  it('grows through stages at 25/75/150/300/500 known characters', () => {
    const counts = [0, 24, 25, 74, 75, 149, 150, 299, 300, 499, 500, 9999];
    expect(counts.map(petStage)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('opens one chest per day with a deterministic, unowned accessory', () => {
    const a = openChest(DEFAULT_KID, '2026-10-02');
    expect(openChest(DEFAULT_KID, '2026-10-02').result).toEqual(a.result);
    expect(a.result.kind).toBe('accessory');
    expect(a.kid.lastChestDate).toBe('2026-10-02');
    expect(canOpenChest(a.kid, '2026-10-02')).toBe(false);
    expect(canOpenChest(a.kid, '2026-10-03')).toBe(true);
  });

  it('never repeats an accessory, then gives bonus stars', () => {
    let kid = DEFAULT_KID;
    for (let d = 1; d <= ACCESSORIES.length; d++) kid = openChest(kid, `2026-11-${String(d).padStart(2, '0')}`).kid;
    expect(new Set(kid.ownedAccessories).size).toBe(ACCESSORIES.length);
    const extra = openChest(kid, '2026-12-01');
    expect(extra.result).toEqual({ kind: 'stars', amount: CHEST_BONUS_STARS });
    expect(extra.kid.bonusStars).toBe(CHEST_BONUS_STARS);
    expect(extra.kid.ownedAccessories).toHaveLength(ACCESSORIES.length);
  });

  it('celebrates combos at 3, 5, 10 and every 10 after', () => {
    expect([1, 2, 3, 4, 5, 6, 9, 10, 11, 20, 30].map(comboMilestone)).toEqual([false, false, true, false, true, false, false, true, false, true, true]);
  });
});
```

`src/fun/stickers.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { BUILTIN } from '../content';
import type { BuiltinChar } from '../types';
import { completedBadges, familyProgress, newBadges, stickerFamilies } from './stickers';

const ch = (char: string, radical: string, components: string[], rank: number): BuiltinChar => ({
  char, pinyin: '', meaning: '', level: 1, rank, radical, components, strokes: 1, writeable: false, examples: [],
});
const builtin = [
  ch('河', '氵', ['氵', '可'], 3), ch('汉', '氵', ['氵', '又'], 1), ch('洗', '氵', ['氵', '先'], 2),
  ch('吃', '口', ['口', '乞'], 4), ch('叫', '口', ['口', '丩'], 5), ch('水', '水', [], 0),
];

describe('sticker families', () => {
  const families = stickerFamilies(builtin);
  it('groups characters by component, keeping families of 3 or more, in rank order', () => {
    expect(families.map((f) => [f.component, f.chars])).toEqual([['氵', ['汉', '洗', '河']]]);
  });
  it('tracks progress and completed badges', () => {
    expect(familyProgress(families[0]!, new Set(['汉', '洗']))).toEqual({ known: 2, total: 3, complete: false });
    const all = new Set(['汉', '洗', '河']);
    expect(completedBadges(families, all)).toEqual(['氵']);
    expect(newBadges(families, all, [])).toEqual(['氵']);
    expect(newBadges(families, all, ['氵'])).toEqual([]);
  });
  it('finds plenty of families in the real built-in set', () => {
    const real = stickerFamilies(BUILTIN);
    expect(real.length).toBeGreaterThan(10);
    expect(real[0]!.chars.length).toBeGreaterThanOrEqual(10);
  });
});
```

`src/fun/rewards.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { RewardGoal } from '../types';
import { goalProgress, nextGoal } from './rewards';

const goal = (over: Partial<RewardGoal>): RewardGoal => ({
  id: 'g', title: 'Ice cream', emoji: '🍦', metric: 'stars', target: 100, createdAt: 0, claimedAt: null, ...over,
});

describe('reward goals', () => {
  it('measures stars or known characters against the target', () => {
    expect(goalProgress(goal({}), { stars: 40, known: 300 })).toEqual({ value: 40, fraction: 0.4, reached: false });
    expect(goalProgress(goal({ metric: 'known', target: 200 }), { stars: 0, known: 300 })).toEqual({ value: 300, fraction: 1, reached: true });
  });
  it('picks the oldest unclaimed goal', () => {
    const goals = [goal({ id: 'b', createdAt: 2 }), goal({ id: 'a', createdAt: 1, claimedAt: 5 }), goal({ id: 'c', createdAt: 3 })];
    expect(nextGoal(goals)?.id).toBe('b');
    expect(nextGoal([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/fun`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Implement**

`src/fun/pet.ts`:
```ts
import { mulberry32, seedFromString, type Rng } from '../lib/random';
import type { KidState, PetColor } from '../types';

export const STAGE_THRESHOLDS = [0, 25, 75, 150, 300, 500] as const;

export interface StageLook {
  emoji: string;
  scale: number;
  glow: boolean;
  name: string;
}

export const STAGE_LOOKS: StageLook[] = [
  { emoji: '🥚', scale: 0.8, glow: false, name: '蛋' },
  { emoji: '🐣', scale: 0.9, glow: false, name: '小宝宝' },
  { emoji: '🐲', scale: 0.85, glow: false, name: '小龙' },
  { emoji: '🐲', scale: 1.1, glow: false, name: '大一点的龙' },
  { emoji: '🐉', scale: 1.1, glow: false, name: '大龙' },
  { emoji: '🐉', scale: 1.25, glow: true, name: '金光龙' },
];

/** Hue rotation applied to the (green) dragon emoji. */
export const PET_COLORS: Record<PetColor, { zh: string; hue: number }> = {
  green: { zh: '绿色', hue: 0 },
  blue: { zh: '蓝色', hue: 100 },
  purple: { zh: '紫色', hue: 160 },
  red: { zh: '红色', hue: 230 },
  gold: { zh: '金色', hue: 300 },
};

export const ACCESSORIES = ['🎩', '👑', '🕶️', '🎀', '🧢', '🎓', '⛑️', '🌸', '⭐', '🎈', '🍀', '🦋', '🌈', '🎧', '🧣', '🪁'];
export const CHEERS = ['好棒！', '你真努力！', '加油！', '太好了！', '真厉害！', '继续加油！'];
export const COMFORTS = ['没关系，再来！', '慢慢来！', '你可以的！'];
export const CHEST_BONUS_STARS = 3;

export type ChestResult = { kind: 'accessory'; item: string } | { kind: 'stars'; amount: number };

export function petStage(known: number): number {
  let stage = 0;
  STAGE_THRESHOLDS.forEach((t, i) => {
    if (known >= t) stage = i;
  });
  return stage;
}

/** Call only after today's daily (not free-play) session is complete. */
export function canOpenChest(kid: KidState, today: string): boolean {
  return kid.lastChestDate !== today;
}

export function openChest(kid: KidState, today: string): { kid: KidState; result: ChestResult } {
  const missing = ACCESSORIES.filter((a) => !kid.ownedAccessories.includes(a));
  if (!missing.length) {
    return {
      kid: { ...kid, bonusStars: kid.bonusStars + CHEST_BONUS_STARS, lastChestDate: today },
      result: { kind: 'stars', amount: CHEST_BONUS_STARS },
    };
  }
  const item = missing[Math.floor(mulberry32(seedFromString(today))() * missing.length)]!;
  return {
    kid: { ...kid, ownedAccessories: [...kid.ownedAccessories, item], lastChestDate: today },
    result: { kind: 'accessory', item },
  };
}

export function comboMilestone(combo: number): boolean {
  return combo === 3 || combo === 5 || (combo >= 10 && combo % 10 === 0);
}

export function pickLine(lines: readonly string[], rng: Rng): string {
  return lines[Math.floor(rng() * lines.length)]!;
}
```

`src/fun/stickers.ts`:
```ts
import { RADICALS, type RadicalMeaning } from '../content/radicals';
import type { BuiltinChar } from '../types';

export const MIN_FAMILY_SIZE = 3;

export interface StickerFamily {
  component: string;
  meaning: RadicalMeaning;
  chars: string[];
}

export function stickerFamilies(builtin: BuiltinChar[]): StickerFamily[] {
  return Object.entries(RADICALS)
    .map(([component, meaning]) => ({
      component,
      meaning,
      chars: builtin
        .filter((c) => c.char !== component && (c.radical === component || c.components.includes(component)))
        .sort((a, b) => a.rank - b.rank)
        .map((c) => c.char),
    }))
    .filter((f) => f.chars.length >= MIN_FAMILY_SIZE)
    .sort((a, b) => b.chars.length - a.chars.length || a.component.localeCompare(b.component));
}

export function familyProgress(f: StickerFamily, knownChars: Set<string>): { known: number; total: number; complete: boolean } {
  const known = f.chars.filter((c) => knownChars.has(c)).length;
  return { known, total: f.chars.length, complete: known === f.chars.length };
}

export function completedBadges(families: StickerFamily[], knownChars: Set<string>): string[] {
  return families.filter((f) => familyProgress(f, knownChars).complete).map((f) => f.component);
}

export function newBadges(families: StickerFamily[], knownChars: Set<string>, seen: string[]): string[] {
  return completedBadges(families, knownChars).filter((c) => !seen.includes(c));
}
```

`src/fun/rewards.ts`:
```ts
import type { RewardGoal } from '../types';

export interface GoalProgress {
  value: number;
  fraction: number;
  reached: boolean;
}

export function goalProgress(goal: RewardGoal, stats: { stars: number; known: number }): GoalProgress {
  const value = goal.metric === 'stars' ? stats.stars : stats.known;
  return { value, fraction: Math.min(1, value / goal.target), reached: value >= goal.target };
}

export function nextGoal(goals: RewardGoal[]): RewardGoal | null {
  return goals.filter((g) => g.claimedAt === null).sort((a, b) => a.createdAt - b.createdAt)[0] ?? null;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/fun && npx tsc --noEmit`
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: fun rules — pet stages, daily chest, combos, sticker families, reward goals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Backup export and import

**Files:**
- Create: `src/store/backup.ts`
- Test: `src/store/backup.test.ts`

**Interfaces:**
- Consumes: `LIST_STORES`, `DB_NAME`, `DB_VERSION`, `AppDb` (Task 6); repo functions (Task 6); `createSessionRecord` (Task 9, used in tests).
- Produces:
  - `BACKUP_FORMAT`, `BACKUP_FORMAT_VERSION = 1`, `class BackupError`
  - `exportBackup(db, { includeMedia, now }): Promise<string>`
  - `readBackup(text): BackupPreview`, where `BackupPreview = { file; exportedAt; counts: { words; cards; sessions; recordings }; hasMedia }`
  - `applyBackup(db, preview): Promise<void>`
  - `exportRawBackup(name?): Promise<string>`

- [ ] **Step 1: Write the failing test** in `src/store/backup.test.ts`

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { DEFAULT_KID } from '../types';
import { applyBackup, BACKUP_FORMAT, BackupError, exportBackup, exportRawBackup, readBackup } from './backup';
import { addRecording, allCards, getKid, getSettings, listRecordings, putCards, putWords, saveKid, saveSession, updateSettings } from './repo';

async function seeded() {
  const db = await freshDb();
  await putWords(db, [makeWord('大')]);
  await putCards(db, [makeCard('b:大', 'recognise', new Date(2026, 9, 5))]);
  await addRecording(db, {
    id: 'r1', createdAt: 1, prompt: { kind: 'passage', passageId: 'p01' },
    blob: new Blob(['hello'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 2,
  });
  await updateSettings(db, { newPerDay: 8 });
  await saveKid(db, { ...DEFAULT_KID, petName: '豆豆' });
  await saveSession(db, createSessionRecord({ steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, '2026-10-02', 0));
  return db;
}

describe('backup', () => {
  it('round-trips everything, including recordings and dates', async () => {
    const text = await exportBackup(await seeded(), { includeMedia: true, now: 1 });
    const preview = readBackup(text);
    expect(preview.counts).toEqual({ words: 1, cards: 1, sessions: 1, recordings: 1 });
    const target = await freshDb();
    await applyBackup(target, preview);
    expect((await allCards(target))[0]!.fsrs.due).toBeInstanceOf(Date);
    const [rec] = await listRecordings(target);
    expect(await rec!.blob.text()).toBe('hello');
    expect(rec!.blob.type).toBe('audio/mp4');
    expect((await getSettings(target)).newPerDay).toBe(8);
    expect((await getKid(target))?.petName).toBe('豆豆');
  });

  it('leaves existing recordings alone when the backup has no media', async () => {
    const text = await exportBackup(await seeded(), { includeMedia: false, now: 1 });
    expect(readBackup(text).hasMedia).toBe(false);
    const target = await seeded();
    await applyBackup(target, readBackup(text));
    expect(await listRecordings(target)).toHaveLength(1);
  });

  it('rejects files that are not backups, changing nothing', () => {
    expect(() => readBackup('not json')).toThrow('This file is not a Hanzi Buddy backup.');
    expect(() => readBackup('{"hello":1}')).toThrow(BackupError);
    expect(() => readBackup(JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 1, stores: { words: 'x' } }))).toThrow(BackupError);
    expect(() => readBackup(JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 1, stores: { secrets: [] } }))).toThrow(BackupError);
  });

  it('refuses backups from a newer app version', () => {
    expect(() => readBackup(JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 99, stores: {} }))).toThrow(/newer version/);
  });

  it('makes an emergency raw dump of any database', async () => {
    const db = await seeded();
    const name = db.name;
    db.close();
    const dump = JSON.parse(await exportRawBackup(name));
    expect(dump.stores.words).toHaveLength(1);
    expect(dump.stores.settings[0].key).toBe('main');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/store/backup.test.ts`
Expected: FAIL, because `./backup` is missing.

- [ ] **Step 3: Implement `src/store/backup.ts`**

```ts
import { openDB } from 'idb';
import type { KidState, Settings } from '../types';
import { DB_NAME, DB_VERSION, LIST_STORES, type AppDb, type ListStore } from './db';

export const BACKUP_FORMAT = 'hanzi-buddy-backup';
export const BACKUP_FORMAT_VERSION = 1;
const MEDIA_STORES: ListStore[] = ['recordings', 'prompts'];
const NOT_A_BACKUP = 'This file is not a Hanzi Buddy backup.';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  exportedAt: number;
  dbVersion: number;
  stores: Partial<Record<ListStore, unknown[]>>;
  settings: unknown;
  kid: unknown;
}

export interface BackupPreview {
  file: BackupFile;
  exportedAt: number;
  counts: { words: number; cards: number; sessions: number; recordings: number };
  hasMedia: boolean;
}

export class BackupError extends Error {}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBlob(b64: string, type: string): Blob {
  const binary = atob(b64);
  return new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], { type });
}

/** JSON-safe copy: Dates become {$date}, Blobs become {$blob, type}. */
async function encodeValue(value: unknown): Promise<unknown> {
  if (value instanceof Date) return { $date: value.toISOString() };
  if (value instanceof Blob) return { $blob: await blobToBase64(value), type: value.type };
  if (Array.isArray(value)) return Promise.all(value.map(encodeValue));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await encodeValue(v);
    return out;
  }
  return value;
}

function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeValue);
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v.$date === 'string') return new Date(v.$date);
    if (typeof v.$blob === 'string') return base64ToBlob(v.$blob, String(v.type ?? ''));
    const out: Record<string, unknown> = {};
    for (const [k, inner] of Object.entries(v)) out[k] = decodeValue(inner);
    return out;
  }
  return value;
}

export async function exportBackup(db: AppDb, opts: { includeMedia: boolean; now: number }): Promise<string> {
  const stores: BackupFile['stores'] = {};
  for (const name of LIST_STORES) {
    if (!opts.includeMedia && MEDIA_STORES.includes(name)) continue;
    stores[name] = (await encodeValue(await db.getAll(name))) as unknown[];
  }
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: opts.now,
    dbVersion: DB_VERSION,
    stores,
    settings: (await encodeValue(await db.get('settings', 'main'))) ?? null,
    kid: (await encodeValue(await db.get('kid', 'main'))) ?? null,
  };
  return JSON.stringify(file);
}

/** Validates without writing anything. Throws BackupError with a parent-friendly message. */
export function readBackup(text: string): BackupPreview {
  let file: BackupFile;
  try {
    file = JSON.parse(text);
  } catch {
    throw new BackupError(NOT_A_BACKUP);
  }
  if (!file || typeof file !== 'object' || file.format !== BACKUP_FORMAT || !file.stores || typeof file.stores !== 'object') {
    throw new BackupError(NOT_A_BACKUP);
  }
  if (file.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupError('This backup was made by a newer version of Hanzi Buddy. Update the app, then try again.');
  }
  for (const [name, rows] of Object.entries(file.stores)) {
    if (!(LIST_STORES as readonly string[]).includes(name) || !Array.isArray(rows)) throw new BackupError(NOT_A_BACKUP);
  }
  const count = (n: ListStore) => file.stores[n]?.length ?? 0;
  return {
    file,
    exportedAt: file.exportedAt,
    counts: { words: count('words'), cards: count('cards'), sessions: count('sessions'), recordings: count('recordings') },
    hasMedia: 'recordings' in file.stores,
  };
}

/** Replaces each store present in the backup (stores absent from it are kept), in one transaction. */
export async function applyBackup(db: AppDb, preview: BackupPreview): Promise<void> {
  const { file } = preview;
  const decoded = Object.entries(file.stores).map(([name, rows]) => [name as ListStore, (rows as unknown[]).map(decodeValue)] as const);
  const settings = decodeValue(file.settings) as Settings | null;
  const kid = decodeValue(file.kid) as KidState | null;
  const tx = db.transaction([...LIST_STORES, 'settings', 'kid'], 'readwrite');
  const ops: Promise<unknown>[] = [];
  for (const [name, rows] of decoded) {
    const store = tx.objectStore(name);
    ops.push(store.clear());
    for (const row of rows) ops.push(store.put(row as never));
  }
  if (settings) ops.push(tx.objectStore('settings').put(settings, 'main'));
  if (kid) ops.push(tx.objectStore('kid').put(kid, 'main'));
  await Promise.all([...ops, tx.done]);
}

/** Emergency dump of whatever is on disk, for when the app cannot open its database normally. */
export async function exportRawBackup(name: string = DB_NAME): Promise<string> {
  const db = await openDB(name);
  const stores: Record<string, unknown> = {};
  for (const store of Array.from(db.objectStoreNames)) {
    const [keys, values] = await Promise.all([db.getAllKeys(store), db.getAll(store)]);
    stores[store] = await encodeValue(values.map((value, i) => ({ key: keys[i], value })));
  }
  const dump = JSON.stringify({ format: 'hanzi-buddy-raw-dump', dbVersion: db.version, exportedAt: Date.now(), stores });
  db.close();
  return dump;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/store && npx tsc --noEmit`
Expected: all store tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: versioned backup export/import with media, plus emergency raw dump

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Audio, sound effects, confetti and file saving

**Files:**
- Create: `src/audio/speech.ts`, `src/audio/recorder.ts`, `src/audio/sfx.ts`, `src/ui/confetti.ts`, `src/lib/files.ts`
- Test: `src/audio/speech.test.ts`, `src/audio/recorder.test.ts`, `src/audio/sfx.test.ts`, `src/lib/files.test.ts`

**Interfaces:**
- Produces:
  - **speech.ts:** `pickVoice(voices): SpeechSynthesisVoice | null`, `loadChineseVoice(timeoutMs?): Promise<SpeechSynthesisVoice | null>`, `setSpeechRate(rate)`, `speak(text)`, `primeSpeech()`
  - **recorder.ts:** `MAX_RECORDING_MS = 60000`, `class MicDeniedError`, `FinishedRecording = { blob; mime; durationSec }`, `ActiveRecording = { stop(): Promise<FinishedRecording>; cancel(): void }`, `pickMime(): string`, `recordingSupported(): boolean`, `startRecording(onAutoStop: () => void): Promise<ActiveRecording>`
  - **sfx.ts:** `type Sfx = 'correct' | 'wrong' | 'combo' | 'star' | 'chest' | 'levelUp' | 'munch'`, `setSfxEnabled(on)`, `playSfx(name)`
  - **confetti.ts:** `celebrate(): void`, which does nothing under `prefers-reduced-motion`
  - **files.ts:** `saveTextFile(filename, text): Promise<void>`, which uses the share sheet when available, otherwise a download, and rethrows `AbortError` when the user cancels

- [ ] **Step 1: Write the failing tests**

`src/audio/speech.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickVoice, setSpeechRate, speak } from './speech';

const v = (lang: string, localService = true, name = lang) => ({ lang, localService, name }) as SpeechSynthesisVoice;

describe('pickVoice', () => {
  it('prefers a local mainland Mandarin voice', () => {
    expect(pickVoice([v('en-US'), v('zh-TW'), v('zh-CN', false, 'net'), v('zh-CN', true, 'Tingting')])?.name).toBe('Tingting');
  });
  it('falls back to another zh voice that is not HK/TW, else null', () => {
    expect(pickVoice([v('zh')])?.lang).toBe('zh');
    expect(pickVoice([v('zh-HK'), v('en-GB')])).toBeNull();
  });
});

describe('speak', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('speaks Mandarin at the configured rate', () => {
    const spoken: SpeechSynthesisUtterance[] = [];
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: SpeechSynthesisUtterance) => spoken.push(u), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string; lang = ''; rate = 1; volume = 1; voice: SpeechSynthesisVoice | null = null;
      constructor(t: string) { this.text = t; }
    });
    setSpeechRate(0.7);
    speak('河');
    expect(spoken[0]).toMatchObject({ text: '河', lang: 'zh-CN', rate: 0.7 });
  });
  it('does nothing where speech is unavailable', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(() => speak('河')).not.toThrow();
  });
});
```

`src/audio/recorder.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickMime, recordingSupported } from './recorder';

describe('recorder support', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('prefers mp4 audio, falling back to webm', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (m: string) => m === 'audio/webm' });
    expect(pickMime()).toBe('audio/webm');
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
    expect(pickMime()).toBe('audio/mp4');
  });
  it('reports no support without MediaRecorder', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(pickMime()).toBe('');
    expect(recordingSupported()).toBe(false);
  });
});
```

`src/audio/sfx.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { playSfx, setSfxEnabled } from './sfx';

describe('sfx', () => {
  it('is silent and safe without Web Audio or when switched off', () => {
    setSfxEnabled(true);
    expect(() => playSfx('correct')).not.toThrow();
    setSfxEnabled(false);
    expect(() => playSfx('levelUp')).not.toThrow();
  });
});
```

`src/lib/files.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveTextFile } from './files';

describe('saveTextFile', () => {
  afterEach(() => vi.restoreAllMocks());
  it('uses the share sheet when files can be shared', async () => {
    const share = vi.fn(async () => {});
    Object.assign(navigator, { canShare: () => true, share });
    await saveTextFile('b.json', '{}');
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
  });
  it('rethrows when the parent cancels the share sheet', async () => {
    Object.assign(navigator, { canShare: () => true, share: async () => { throw new DOMException('cancel', 'AbortError'); } });
    await expect(saveTextFile('b.json', '{}')).rejects.toThrow('cancel');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/audio src/lib/files.test.ts`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Implement**

`src/audio/speech.ts`:
```ts
let voice: SpeechSynthesisVoice | null = null;
let rate = 0.8;

const available = () => typeof speechSynthesis !== 'undefined' && !!speechSynthesis;

export function setSpeechRate(r: number): void {
  rate = r;
}

export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const mainland = voices.filter((v) => /^zh[-_]CN/i.test(v.lang));
  return (
    mainland.find((v) => v.localService) ??
    mainland[0] ??
    voices.find((v) => /^zh/i.test(v.lang) && !/HK|TW/i.test(v.lang)) ??
    null
  );
}

/** Voices load asynchronously on iPad Safari; wait briefly for them. */
export async function loadChineseVoice(timeoutMs = 1500): Promise<SpeechSynthesisVoice | null> {
  if (!available()) return (voice = null);
  voice = pickVoice(speechSynthesis.getVoices());
  if (!voice) {
    voice = await new Promise<SpeechSynthesisVoice | null>((resolve) => {
      const done = () => resolve(pickVoice(speechSynthesis.getVoices()));
      speechSynthesis.addEventListener?.('voiceschanged', done, { once: true });
      setTimeout(done, timeoutMs);
    });
  }
  return voice;
}

export function speak(text: string): void {
  if (!available()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = rate;
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

/** iOS only allows speech after a user gesture; call this from the first tap. */
export function primeSpeech(): void {
  if (!available()) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}
```

`src/audio/recorder.ts`:
```ts
export const MAX_RECORDING_MS = 60_000;

export class MicDeniedError extends Error {}

export interface FinishedRecording {
  blob: Blob;
  mime: string;
  durationSec: number;
}

export interface ActiveRecording {
  stop(): Promise<FinishedRecording>;
  cancel(): void;
}

export function pickMime(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder) return '';
  return ['audio/mp4', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}

export function recordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
}

export async function startRecording(onAutoStop: () => void): Promise<ActiveRecording> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw new MicDeniedError();
    throw e;
  }
  const mime = pickMime();
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const started = Date.now();
  const timer = setTimeout(onAutoStop, MAX_RECORDING_MS);
  const release = () => {
    clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
  };
  recorder.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          release();
          const type = recorder.mimeType || mime || 'audio/mp4';
          resolve({ blob: new Blob(chunks, { type }), mime: type, durationSec: Math.round((Date.now() - started) / 1000) });
        };
        recorder.stop();
      }),
    cancel: () => {
      recorder.onstop = release;
      if (recorder.state !== 'inactive') recorder.stop();
      else release();
    },
  };
}
```

`src/audio/sfx.ts`:
```ts
export type Sfx = 'correct' | 'wrong' | 'combo' | 'star' | 'chest' | 'levelUp' | 'munch';

type Note = [freq: number, offset: number, duration: number, type?: OscillatorType];

// Short synthesized sounds; 'wrong' is deliberately soft and low, never a buzzer.
const NOTES: Record<Sfx, Note[]> = {
  correct: [[660, 0, 0.12], [880, 0.1, 0.18]],
  wrong: [[330, 0, 0.2, 'triangle']],
  combo: [[523, 0, 0.1], [659, 0.08, 0.1], [784, 0.16, 0.1], [1047, 0.24, 0.2]],
  star: [[1319, 0, 0.08], [1760, 0.06, 0.12]],
  chest: [[392, 0, 0.15], [523, 0.12, 0.15], [659, 0.24, 0.15], [784, 0.36, 0.3]],
  levelUp: [[523, 0, 0.15], [523, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.4]],
  munch: [[180, 0, 0.06, 'square'], [150, 0.09, 0.06, 'square']],
};

let enabled = true;
let ctx: AudioContext | null = null;

export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function playSfx(name: Sfx): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  for (const [freq, offset, duration, type = 'sine'] of NOTES[name]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t + offset);
    osc.stop(t + offset + duration);
  }
}
```

`src/ui/confetti.ts`:
```ts
import confetti from 'canvas-confetti';

export function celebrate(): void {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  void confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
}
```

`src/lib/files.ts`:
```ts
/** Share sheet on iPad (save to Files/iCloud), download elsewhere. Rethrows AbortError if cancelled. */
export async function saveTextFile(filename: string, text: string): Promise<void> {
  const file = new File([text], filename, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/audio src/lib && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: speech, recorder, synthesized sound effects, confetti, file saving

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: UI foundation (context, styles, shared widgets, test helper)

**Files:**
- Create: `src/app/AppContext.tsx`, `src/ui/Label.tsx`, `src/ui/SpeakButton.tsx`, `src/ui/Pet.tsx`, `src/ui/PinPad.tsx`, `src/test/renderWithApp.tsx`
- Modify: `src/styles.css` (replace it entirely)
- Test: `src/ui/widgets.test.tsx`

**Interfaces:**
- Consumes: `speak` (Task 16), `petStage`, `STAGE_LOOKS`, `PET_COLORS` (Task 14), `openAppDb` (Task 6).
- Produces:
  - `type Route = { name: 'home' } | { name: 'session'; free: boolean } | { name: 'placement' } | { name: 'parent' } | { name: 'stickers' } | { name: 'wardrobe' } | { name: 'setupPin' } | { name: 'petSetup' }`
  - `interface AppData { db; settings; kid: KidState | null; voice: boolean; now: () => Date; go: (r: Route) => void; refresh: () => Promise<void> }`
  - `AppContext`, `useApp(): AppData`
  - `<Label zh />`, `<SpeakButton text big? />`
  - `<Pet kid known mood? bubble? size? stage? />`, with `PetMood = 'happy' | 'comfort' | 'munch' | null`
  - `<PinPad onComplete error? />`
  - `makeAppData(over?): Promise<AppData>`, `renderWithApp(ui, app)`
  - All CSS classes used by later tasks.

- [ ] **Step 1: Write the failing test** in `src/ui/widgets.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../types';
import { Label } from './Label';
import { Pet } from './Pet';
import { PinPad } from './PinPad';
import { SpeakButton } from './SpeakButton';

vi.mock('../audio/speech', () => ({ speak: vi.fn() }));
import { speak } from '../audio/speech';

describe('widgets', () => {
  it('Label shows pinyin above the Chinese', () => {
    const { container } = render(<Label zh="你好" />);
    expect(container.querySelector('.label__py')?.textContent).toBe('nǐ hǎo');
    expect(screen.getByText('你好')).toBeTruthy();
  });

  it('Pet grows from egg to dragon and always wears its accessory', () => {
    const kid = { ...DEFAULT_KID, wearing: '🎩' };
    const { rerender } = render(<Pet kid={kid} known={0} />);
    expect(screen.getByRole('img').textContent).toBe('🥚');
    expect(screen.getByText('🎩')).toBeTruthy();
    rerender(<Pet kid={kid} known={80} bubble="加油！" />);
    expect(screen.getByRole('img').textContent).toBe('🐲');
    expect(screen.getByText('加油！')).toBeTruthy();
  });

  it('PinPad reports a 4-digit PIN and resets', () => {
    const onComplete = vi.fn();
    render(<PinPad onComplete={onComplete} />);
    for (const d of ['1', '2', '3', '4']) fireEvent.click(screen.getByRole('button', { name: d }));
    expect(onComplete).toHaveBeenCalledWith('1234');
    expect(document.querySelectorAll('.pin-dots .is-filled')).toHaveLength(0);
  });

  it('SpeakButton speaks its text', () => {
    render(<SpeakButton text="河" />);
    fireEvent.click(screen.getByRole('button', { name: '听' }));
    expect(speak).toHaveBeenCalledWith('河');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/ui`
Expected: FAIL, because the components are missing.

- [ ] **Step 3: Implement the context and widgets**

`src/app/AppContext.tsx`:
```tsx
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { AppDb } from '../store/db';
import type { KidState, Settings } from '../types';

export type Route =
  | { name: 'home' }
  | { name: 'session'; free: boolean }
  | { name: 'placement' }
  | { name: 'parent' }
  | { name: 'stickers' }
  | { name: 'wardrobe' }
  | { name: 'setupPin' }
  | { name: 'petSetup' };

export interface AppData {
  db: AppDb;
  settings: Settings;
  kid: KidState | null;
  voice: boolean;
  now: () => Date;
  go: (route: Route) => void;
  refresh: () => Promise<void>;
}

export const AppContext = createContext<AppData | null>(null);

export function useApp(): AppData {
  const app = useContext(AppContext);
  if (!app) throw new Error('useApp must be used inside AppContext');
  return app;
}
```

`src/ui/Label.tsx`:
```tsx
import { pinyin } from 'pinyin-pro';
import { useMemo } from 'preact/hooks';

/** Chinese text with its pinyin shown small above it, for a P2 reader. */
export function Label({ zh }: { zh: string }) {
  const py = useMemo(() => pinyin(zh), [zh]);
  return (
    <span class="label">
      <small class="label__py">{py}</small>
      <span class="label__zh">{zh}</span>
    </span>
  );
}
```

`src/ui/SpeakButton.tsx`:
```tsx
import { speak } from '../audio/speech';

export function SpeakButton({ text, big = false }: { text: string; big?: boolean }) {
  return (
    <button type="button" class={`speak ${big ? 'speak--big' : ''}`} aria-label="听" onClick={() => speak(text)}>
      🔊
    </button>
  );
}
```

`src/ui/Pet.tsx`:
```tsx
import { PET_COLORS, petStage, STAGE_LOOKS } from '../fun/pet';
import type { KidState } from '../types';

export type PetMood = 'happy' | 'comfort' | 'munch' | null;

interface Props {
  kid: KidState;
  known: number;
  mood?: PetMood;
  bubble?: string | null;
  size?: number;
  stage?: number; // override, e.g. to show the previous stage during evolution
}

export function Pet({ kid, known, mood = null, bubble = null, size = 120, stage }: Props) {
  const s = stage ?? petStage(known);
  const look = STAGE_LOOKS[s]!;
  return (
    <div class={`pet ${mood ? `pet--${mood}` : ''} ${look.glow ? 'pet--glow' : ''}`}>
      {bubble && <div class="pet__bubble">{bubble}</div>}
      <div style={{ fontSize: `${Math.round(size * look.scale)}px`, position: 'relative' }}>
        <span class="pet__body" role="img" aria-label={kid.petName} style={{ filter: `hue-rotate(${PET_COLORS[kid.petColor].hue}deg)` }}>
          {look.emoji}
        </span>
        {kid.wearing && <span class="pet__hat">{kid.wearing}</span>}
      </div>
    </div>
  );
}
```

`src/ui/PinPad.tsx`:
```tsx
import { useState } from 'preact/hooks';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinPad({ onComplete, error = null }: { onComplete: (pin: string) => void; error?: string | null }) {
  const [digits, setDigits] = useState('');
  const press = (key: string) => {
    if (key === '⌫') return setDigits((d) => d.slice(0, -1));
    const next = (digits + key).slice(0, 4);
    if (next.length === 4) {
      setDigits('');
      onComplete(next);
    } else {
      setDigits(next);
    }
  };
  return (
    <div class="center" style={{ flex: 0 }}>
      <div class="pin-dots" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <span key={i} class={i < digits.length ? 'is-filled' : ''} />)}
      </div>
      {error && <p class="pin-error" role="alert">{error}</p>}
      <div class="pinpad">
        {KEYS.map((k, i) =>
          k ? (
            <button key={k} type="button" aria-label={k === '⌫' ? 'Delete' : k} onClick={() => press(k)}>
              {k}
            </button>
          ) : (
            <span key={`gap-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}
```

`src/test/renderWithApp.tsx`:
```tsx
import { render } from '@testing-library/preact';
import type { ComponentChild } from 'preact';
import { vi } from 'vitest';
import { AppContext, type AppData } from '../app/AppContext';
import { openAppDb } from '../store/db';
import { DEFAULT_KID, DEFAULT_SETTINGS } from '../types';

export async function makeAppData(over: Partial<AppData> = {}): Promise<AppData> {
  return {
    db: await openAppDb(`test-${crypto.randomUUID()}`),
    settings: { ...DEFAULT_SETTINGS, placementDone: true },
    kid: { ...DEFAULT_KID },
    voice: false,
    now: () => new Date(2026, 9, 2, 9, 0),
    go: vi.fn(),
    refresh: vi.fn(async () => {}),
    ...over,
  };
}

export function renderWithApp(ui: ComponentChild, app: AppData) {
  return render(<AppContext.Provider value={app}>{ui}</AppContext.Provider>);
}
```

- [ ] **Step 4: Replace `src/styles.css`** with the full stylesheet (light theme only; every later screen uses these classes)

```css
:root {
  --bg: #fff8ec;
  --surface: #ffffff;
  --surface-2: #fff1d6;
  --ink: #2d3436;
  --ink-soft: #636e72;
  --muted: #b2bec3;
  --line: #f1e3cc;
  --accent: #ff9f43;
  --accent-strong: #e67e22;
  --good: #00b894;
  --good-soft: #d5f5ec;
  --calm: #74b9ff;
  --calm-strong: #0984e3;
  --calm-soft: #e3f1ff;
  --gold: #fdcb6e;
  --radius: 20px;
  --shadow: 0 4px 0 rgba(45, 52, 54, 0.12);
  --font: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif;
  --hanzi: 'Kaiti SC', 'STKaiti', 'KaiTi', 'PingFang SC', serif;
  color-scheme: light;
}

* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 20px;
  -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; overscroll-behavior: none;
}
input, textarea, select { font: inherit; user-select: text; -webkit-user-select: text; }
button { font: inherit; color: inherit; cursor: pointer; touch-action: manipulation; }
#app { min-height: 100%; }

.screen {
  min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; gap: 16px;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
}
.loading { align-items: center; justify-content: center; font-size: 80px; }
.topbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.spacer { flex: 1; }
.chip { background: var(--surface); border-radius: 999px; padding: 8px 16px; font-weight: 700; box-shadow: var(--shadow); }
.center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; text-align: center; }
.row { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; align-items: center; }
.warning { background: #fff3cd; border-radius: 12px; padding: 12px 16px; margin: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Buttons */
.btn {
  min-height: 64px; min-width: 64px; padding: 12px 24px; border: none; border-radius: var(--radius);
  background: var(--surface); box-shadow: var(--shadow); font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
.btn:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(45, 52, 54, 0.12); }
.btn--primary { background: var(--accent); color: #fff; }
.btn--good { background: var(--good); color: #fff; }
.btn--ghost { background: transparent; box-shadow: none; }
.btn--big { font-size: 32px; padding: 20px 48px; min-height: 96px; }
.btn:disabled { opacity: 0.5; }
.link { background: none; border: none; color: var(--ink-soft); text-decoration: underline; min-height: 44px; }
.small-btn { min-height: 44px; padding: 6px 12px; border-radius: 10px; border: 1px solid var(--line); background: #fff; }

/* Text */
.label { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.15; }
.label__py { font-size: 0.55em; font-weight: 500; opacity: 0.8; }
.hanzi { font-family: var(--hanzi); }
.hanzi--xl { font-size: 140px; line-height: 1.1; }
.pinyin { color: var(--ink-soft); font-size: 24px; }
.meaning { color: var(--ink-soft); font-size: 18px; }
.speak { min-width: 64px; min-height: 64px; border-radius: 50%; border: none; background: var(--calm-soft); font-size: 28px; box-shadow: var(--shadow); }
.speak--big { min-width: 120px; min-height: 120px; font-size: 56px; }

/* Pet */
.pet { position: relative; display: inline-flex; flex-direction: column; align-items: center; line-height: 1; }
.pet--glow { filter: drop-shadow(0 0 18px var(--gold)); }
.pet__body { display: inline-block; }
.pet__hat { position: absolute; top: -0.3em; left: 50%; transform: translateX(-50%) rotate(-8deg); font-size: 0.45em; }
.pet__bubble {
  position: relative; background: var(--surface); border-radius: 18px; padding: 8px 16px; font-size: 22px; font-weight: 700;
  margin-bottom: 12px; box-shadow: var(--shadow); white-space: nowrap;
}
.pet__bubble::after {
  content: ''; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
  border: 10px solid transparent; border-top-color: var(--surface); border-bottom: 0;
}
.pet--happy .pet__body { animation: bounce 0.6s ease; }
.pet--munch .pet__body { animation: munch 0.5s ease 2; }
.pet--comfort .pet__body { animation: nod 0.8s ease; }
.pet-button { background: none; border: none; padding: 0; }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-24px); } 70% { transform: translateY(-8px); } }
@keyframes munch { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15, 0.9); } }
@keyframes nod { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-8deg); } 60% { transform: rotate(6deg); } }
@keyframes pop-in { from { transform: scale(0.4); opacity: 0; } }
@keyframes wobble { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

/* Session */
.stepbar { display: flex; align-items: center; gap: 12px; }
.stepbar__step { font-size: 28px; opacity: 0.35; padding: 6px 10px; border-radius: 14px; }
.stepbar__step.is-current { opacity: 1; background: var(--surface); box-shadow: var(--shadow); }
.stepbar__step.is-done { opacity: 1; }
.stepbar__step.is-done::after { content: '✓'; font-size: 16px; color: var(--good); margin-left: 2px; }
.combo { margin-left: auto; font-weight: 800; color: var(--accent-strong); }
.combo-banner {
  position: fixed; top: 20%; left: 50%; transform: translateX(-50%); z-index: 10; pointer-events: none;
  background: var(--accent); color: #fff; font-size: 40px; font-weight: 800; padding: 16px 32px; border-radius: 24px;
  animation: banner 1.6s ease forwards;
}
@keyframes banner {
  0% { transform: translateX(-50%) scale(0.3); opacity: 0; }
  15% { transform: translateX(-50%) scale(1.1); opacity: 1; }
  25% { transform: translateX(-50%) scale(1); }
  85% { opacity: 1; }
  100% { opacity: 0; }
}

/* Flashcards: feed the dragon */
.flash { flex: 1; display: grid; grid-template-columns: 1fr 1.4fr; gap: 24px; align-items: center; }
.flash__pet { display: flex; justify-content: center; }
.flash__main { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.flash__prompt { display: flex; justify-content: center; align-items: center; min-height: 160px; }
.choices { display: grid; grid-template-columns: repeat(2, minmax(140px, 1fr)); gap: 16px; width: 100%; max-width: 520px; }
.choice {
  min-height: 110px; border: 4px solid transparent; border-radius: 24px; background: var(--surface);
  box-shadow: var(--shadow); font-size: 30px; font-weight: 700;
}
.choices--hanzi .choice { font-family: var(--hanzi); font-size: 64px; font-weight: 400; }
.choice.is-eaten { animation: fly-to-pet 0.6s ease-in forwards; }
.choice.is-answer { border-color: var(--good); background: var(--good-soft); }
.choice.is-wrong { animation: wobble 0.4s; opacity: 0.6; }
.choice.is-dim { opacity: 0.35; }
@keyframes fly-to-pet { to { transform: translate(-50vw, -10vh) scale(0.2); opacity: 0; } }
.flash__next { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.answer-reveal { font-size: 28px; display: flex; align-items: center; gap: 12px; margin: 0; }
.intro { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.intro__card {
  background: var(--surface); border-radius: 28px; padding: 24px 40px; box-shadow: var(--shadow);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.parts { font-size: 28px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.part--radical { color: var(--accent-strong); }
.example { font-size: 26px; display: flex; align-items: center; gap: 8px; }
@media (orientation: portrait) { .flash { grid-template-columns: 1fr; } }

/* Writing */
.write { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.write__prompt { display: flex; align-items: center; gap: 16px; font-size: 36px; }
.tianzige {
  background-color: var(--surface); border: 4px solid #c0392b; border-radius: 8px; touch-action: none;
  background-image:
    linear-gradient(to right, transparent calc(50% - 1px), rgba(192, 57, 43, 0.35) calc(50% - 1px), rgba(192, 57, 43, 0.35) calc(50% + 1px), transparent calc(50% + 1px)),
    linear-gradient(to bottom, transparent calc(50% - 1px), rgba(192, 57, 43, 0.35) calc(50% - 1px), rgba(192, 57, 43, 0.35) calc(50% + 1px), transparent calc(50% + 1px));
}
.dots { display: flex; gap: 8px; }
.dot { width: 16px; height: 16px; border-radius: 50%; background: var(--line); }
.dot.is-done { background: var(--good); }
.praise { font-size: 40px; font-weight: 800; color: var(--good); animation: pop-in 0.4s ease; margin: 0; }

/* Components: fishing */
.pond-q { font-size: 28px; display: flex; align-items: center; gap: 12px; justify-content: center; flex-wrap: wrap; }
.pond { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; background: linear-gradient(#a8e6ff, var(--calm)); border-radius: 32px; padding: 24px; width: 100%; max-width: 760px; }
.fish { position: relative; min-height: 110px; border: none; background: none; animation: bob 2.4s ease-in-out infinite; }
.fish__body { font-size: 84px; display: block; }
.fish__char {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-family: var(--hanzi); font-size: 40px; color: #fff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}
.fish.is-caught { animation: none; transform: translateY(-12px) scale(1.08); filter: drop-shadow(0 0 10px #fff); }
.fish.is-right { animation: none; filter: drop-shadow(0 0 12px var(--good)); }
.fish.is-missed { animation: wobble 0.4s 2; }
.fish.is-oops { animation: none; opacity: 0.45; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.bubbles { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
.bubble-opt {
  width: 140px; height: 140px; border-radius: 50%; border: 4px solid #fff; font-family: var(--hanzi); font-size: 64px; box-shadow: var(--shadow);
  background: radial-gradient(circle at 30% 30%, #fff, var(--calm-soft) 60%, var(--calm));
}
.bubble-opt.is-right { border-color: var(--good); }
.bubble-opt.is-oops { opacity: 0.45; }

/* Speaking */
.speak-step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.speak-step img { max-width: min(90vw, 640px); max-height: 45vh; border-radius: 20px; box-shadow: var(--shadow); }
.helpers { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.helper { background: var(--surface-2); border-radius: 999px; padding: 8px 16px; font-size: 22px; }
.passage {
  background: var(--surface); border-radius: 24px; padding: 24px 32px; font-family: var(--hanzi); font-size: 34px; line-height: 1.8;
  max-width: 760px; box-shadow: var(--shadow); margin: 0;
}
.passage__py { font-family: var(--font); font-size: 18px; color: var(--ink-soft); margin: 0; max-width: 760px; }
.rec-dot { width: 20px; height: 20px; border-radius: 50%; background: #e17055; animation: pulse 1s infinite; display: inline-block; }
@keyframes pulse { 50% { opacity: 0.3; } }

/* Celebration */
.celebrate { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; text-align: center; }
.celebrate h1 { font-size: 56px; margin: 0; }
.stars { font-size: 72px; display: flex; gap: 8px; }
.stars span { animation: pop-in 0.5s ease backwards; }
.chest { font-size: 160px; background: none; border: none; animation: bounce 1.2s ease infinite; }
.prize { font-size: 140px; animation: pop-in 0.6s ease; }

/* Home */
.home__main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
.home__name { font-size: 28px; font-weight: 800; }
.home__known { font-size: 24px; color: var(--ink-soft); }
.goal {
  display: flex; align-items: center; gap: 16px; background: var(--surface); border-radius: 24px;
  padding: 12px 24px; box-shadow: var(--shadow); width: min(90vw, 480px);
}
.goal--reached { background: var(--good-soft); }
.goal__emoji { font-size: 48px; }
.goal__body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.progress { height: 16px; border-radius: 999px; background: var(--line); overflow: hidden; }
.progress__fill { height: 100%; background: var(--good); border-radius: 999px; transition: width 0.6s ease; }
.done-today { font-size: 32px; font-weight: 800; margin: 0; }

/* Sticker book & wardrobe */
.book { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.family {
  display: flex; flex-direction: column; align-items: center; gap: 6px; background: var(--surface); border: none;
  border-radius: 24px; padding: 16px; box-shadow: var(--shadow); min-height: 150px;
}
.family__icon { font-size: 40px; }
.family__name { font-size: 28px; font-family: var(--hanzi); }
.sticker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 16px; }
.sticker {
  aspect-ratio: 1; border-radius: 22px; border: 4px solid #fff; background: linear-gradient(135deg, #ffeaa7, #fab1a0);
  font-family: var(--hanzi); font-size: 52px; box-shadow: var(--shadow); transform: rotate(var(--tilt, 0deg));
  display: flex; align-items: center; justify-content: center;
}
.sticker--unknown { background: var(--line); color: var(--muted); border: 4px dashed var(--muted); }
.badges { display: flex; gap: 12px; flex-wrap: wrap; }
.badge { background: var(--gold); border-radius: 999px; padding: 6px 14px; font-weight: 700; }
.wardrobe { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 16px; width: 100%; max-width: 720px; }
.wardrobe button { min-height: 96px; font-size: 48px; border-radius: 22px; border: 4px solid transparent; background: var(--surface); box-shadow: var(--shadow); }
.wardrobe button.is-on { border-color: var(--accent); }

/* Setup */
.swatch { width: 96px; height: 96px; border-radius: 24px; border: 4px solid transparent; background: var(--surface); font-size: 56px; box-shadow: var(--shadow); }
.swatch.is-on { border-color: var(--accent); }
.name-input { font-size: 36px; text-align: center; padding: 12px 20px; border-radius: 16px; border: 3px solid var(--line); width: min(80vw, 320px); }

/* PIN pad */
.pinpad { display: grid; grid-template-columns: repeat(3, 80px); gap: 12px; justify-content: center; }
.pinpad button { height: 80px; border-radius: 20px; border: none; background: var(--surface); box-shadow: var(--shadow); font-size: 32px; font-weight: 700; }
.pin-dots { display: flex; gap: 16px; justify-content: center; }
.pin-dots span { width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--ink-soft); }
.pin-dots span.is-filled { background: var(--ink); border-color: var(--ink); }
.pin-error { color: #c0392b; margin: 0; }

/* Parent area */
.parent { font-size: 17px; }
.tabs { display: flex; gap: 4px; overflow-x: auto; }
.tab { border: none; background: none; padding: 12px 14px; border-radius: 12px; min-height: 48px; white-space: nowrap; }
.tab.is-active { background: var(--surface); font-weight: 700; box-shadow: var(--shadow); }
.parent__body { display: flex; flex-direction: column; gap: 16px; max-width: 980px; width: 100%; margin: 0 auto; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.tile { background: var(--surface); border-radius: 16px; padding: 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 6px; }
.tile__value { font-size: 32px; font-weight: 800; }
.tile__label { color: var(--ink-soft); font-size: 15px; }
.panel { background: var(--surface); border-radius: 16px; padding: 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 12px; }
.panel h2 { margin: 0; font-size: 20px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field input, .field textarea, .field select { padding: 10px 12px; border: 2px solid var(--line); border-radius: 10px; background: #fff; }
.table { width: 100%; border-collapse: collapse; font-size: 16px; }
.table th, .table td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.thumbs img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 12px; }

/* Chart (single series: one hue, no legend, hover tooltip, table view) */
.chart { margin: 0; display: flex; flex-direction: column; gap: 8px; }
.chart figcaption { font-weight: 700; }
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

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/ui && npx tsc --noEmit`
Expected: 4 tests pass. If pinyin-pro renders `你好` as `nǐ hǎo` with different spacing, match the test to its actual output. The point of the test is that pinyin appears.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: app context, kid UI widgets (Label, Pet, PinPad, SpeakButton) and stylesheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Flashcards step ("feed the dragon")

**Files:**
- Create: `src/activities/flashcards/FlashcardStep.tsx`
- Test: `src/activities/flashcards/FlashcardStep.test.tsx`

**Interfaces:**
- Consumes: distractors (Task 10); `getCharInfo`, `hanChars` (Task 4); `radicalMeaning` (Task 4); `CHEERS`, `COMFORTS`, `pickLine` (Task 14); `speak` and `playSfx` (Task 16); `Pet`, `Label`, `SpeakButton` (Task 17).
- Produces:
  - `FlashResult = { correct: boolean; responseMs: number; elapsedMs: number }`
  - `<FlashcardStep item word pool card? voice kid known onDone />`
- Behaviour:
  - New items show the intro first.
  - Listen mode (pick the character) is used when a voice exists, at least one look-alike exists, and `card.fsrs.reps` is even. Otherwise read mode (pick the pinyin).
  - `onDone` fires when the child taps 下一个 after the feedback.

- [ ] **Step 1: Write the failing test** in `src/activities/flashcards/FlashcardStep.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../../content';
import { DEFAULT_KID } from '../../types';
import { FlashcardStep } from './FlashcardStep';

vi.mock('../../audio/speech', () => ({ speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

const pool = builtinWords(0);
const he = pool.find((w) => w.text === '河')!;
const base = { word: he, pool, kid: DEFAULT_KID, known: 0 };
const review = { wordId: he.id, isNew: false, retry: false };

describe('FlashcardStep', () => {
  it('introduces a new word before quizzing it', () => {
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} voice={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('我记住了！'));
    expect(document.querySelectorAll('.choice')).toHaveLength(4);
  });

  it('read mode: a correct pinyin answer reports correct with timings', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    fireEvent.click(screen.getByText('下一个'));
    expect(onDone).toHaveBeenCalledWith({ correct: true, responseMs: expect.any(Number), elapsedMs: expect.any(Number) });
  });

  it('a wrong answer reveals the right one', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={onDone} />);
    const wrong = [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!;
    fireEvent.click(wrong);
    expect(document.querySelector('.answer-reveal')?.textContent).toContain(he.pinyin);
    fireEvent.click(screen.getByText('下一个'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });

  it('listen mode offers single characters including the answer', () => {
    render(<FlashcardStep {...base} item={review} voice onDone={vi.fn()} />);
    const options = [...document.querySelectorAll('.choice')].map((b) => b.textContent ?? '');
    expect(options).toContain('河');
    expect(options.every((o) => Array.from(o).length === 1)).toBe(true);
  });

  it('falls back to read mode when no same-length look-alikes exist', () => {
    const target = { ...he, id: 'p:x', text: '河马河', pinyin: 'hé mǎ hé' };
    render(<FlashcardStep {...base} word={target} item={{ ...review, wordId: 'p:x' }} voice onDone={vi.fn()} />);
    expect(document.querySelector('.hanzi--xl')?.textContent).toBe('河马河');
    expect(new Set([...document.querySelectorAll('.choice')].map((b) => b.textContent)).size).toBe(4);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/activities/flashcards/FlashcardStep.test.tsx`
Expected: FAIL, because `./FlashcardStep` is missing.

- [ ] **Step 3: Implement `src/activities/flashcards/FlashcardStep.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { getCharInfo, hanChars } from '../../content';
import { radicalMeaning } from '../../content/radicals';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32, shuffle } from '../../lib/random';
import type { CardRecord, FlashItem, KidState, Word } from '../../types';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import { pickCharacterDistractors, pickPinyinDistractors } from './distractors';

export interface FlashResult {
  correct: boolean;
  responseMs: number;
  elapsedMs: number;
}

interface Props {
  item: FlashItem;
  word: Word;
  pool: Word[];
  card?: CardRecord;
  voice: boolean;
  kid: KidState;
  known: number;
  onDone: (result: FlashResult) => void;
}

type Phase = 'intro' | 'quiz' | 'feedback';

export function FlashcardStep({ item, word, pool, card, voice, kid, known, onDone }: Props) {
  const quiz = useMemo(() => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    const lookAlikes = pickCharacterDistractors(word, pool, rng);
    const listen = voice && lookAlikes.length > 0 && (card?.fsrs.reps ?? 0) % 2 === 0;
    const answer = listen ? word.text : word.pinyin;
    const wrong = listen ? lookAlikes.map((w) => w.text) : pickPinyinDistractors(word, pool, rng);
    return { listen, answer, options: shuffle([answer, ...wrong], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) };
  }, [word.id]);
  const [phase, setPhase] = useState<Phase>(item.isNew && !item.retry ? 'intro' : 'quiz');
  const [choice, setChoice] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; responseMs: number } | null>(null);
  const shownAt = useRef(performance.now());
  const quizAt = useRef(performance.now());

  useEffect(() => {
    if (phase === 'intro') speak(word.text);
    if (phase === 'quiz') {
      quizAt.current = performance.now();
      if (quiz.listen) speak(word.text);
    }
  }, [phase]);

  const choose = (option: string) => {
    if (phase !== 'quiz') return;
    const correct = option === quiz.answer;
    setChoice(option);
    setResult({ correct, responseMs: Math.round(performance.now() - quizAt.current) });
    setPhase('feedback');
    if (correct) {
      playSfx('munch');
      setTimeout(() => playSfx('correct'), 250);
    } else {
      playSfx('wrong');
    }
    if (!quiz.listen || !correct) speak(word.text);
  };

  const optionState = (o: string) => {
    if (phase !== 'feedback') return '';
    if (o === quiz.answer) return o === choice ? 'is-eaten' : 'is-answer';
    return o === choice ? 'is-wrong' : 'is-dim';
  };

  const bubble =
    phase === 'intro' ? '新字来了！'
    : phase === 'feedback' ? (result!.correct ? quiz.cheer : quiz.comfort)
    : quiz.listen ? '我想吃这个字！' : '这个字怎么读？';
  const mood = phase === 'feedback' ? (result!.correct ? 'munch' : 'comfort') : null;

  return (
    <div class="flash">
      <div class="flash__pet">
        <Pet kid={kid} known={known} mood={mood} bubble={bubble} size={140} />
      </div>
      <div class="flash__main">
        {phase === 'intro' ? (
          <Intro word={word} onReady={() => setPhase('quiz')} />
        ) : (
          <>
            <div class="flash__prompt">
              {quiz.listen ? <SpeakButton text={word.text} big /> : <div class="hanzi hanzi--xl">{word.text}</div>}
            </div>
            <div class={`choices ${quiz.listen ? 'choices--hanzi' : 'choices--pinyin'}`}>
              {quiz.options.map((o) => (
                <button key={o} type="button" class={`choice ${optionState(o)}`} disabled={phase === 'feedback'} onClick={() => choose(o)}>
                  {o}
                </button>
              ))}
            </div>
            {phase === 'feedback' && result && (
              <div class="flash__next">
                {!result.correct && (
                  <p class="answer-reveal">
                    <span class="hanzi">{word.text}</span> {word.pinyin} <SpeakButton text={word.text} />
                  </p>
                )}
                <button
                  type="button"
                  class="btn btn--primary"
                  onClick={() => onDone({ ...result, elapsedMs: Math.round(performance.now() - shownAt.current) })}
                >
                  <Label zh="下一个" /> →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Intro({ word, onReady }: { word: Word; onReady: () => void }) {
  return (
    <div class="intro">
      <div class="intro__card">
        <div class="pinyin">{word.pinyin}</div>
        <div class="hanzi hanzi--xl">{word.text}</div>
        <SpeakButton text={word.text} />
        {word.meaning && <div class="meaning">{word.meaning}</div>}
        {hanChars(word.text).map((ch) => {
          const parts = getCharInfo(ch)?.components ?? [];
          if (parts.length < 2) return null;
          return (
            <div class="parts" key={ch}>
              {parts.map((p, i) => {
                const m = radicalMeaning(p);
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
        {word.examples?.map((e) => (
          <div class="example" key={e.text}>
            <span class="pinyin">{e.pinyin}</span>
            <span class="hanzi">{e.text}</span>
            <SpeakButton text={e.text} />
          </div>
        ))}
      </div>
      <button type="button" class="btn btn--primary" onClick={onReady}>
        <Label zh="我记住了！" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/activities/flashcards && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: feed-the-dragon flashcard step with intro, listen/read modes and feedback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Writing step (听写 with Hanzi Writer)

**Files:**
- Create: `src/activities/writing/WritingStep.tsx`
- Test: `src/activities/writing/WritingStep.test.tsx`

**Interfaces:**
- Consumes: `hanzi-writer` (default export `HanziWriter`); `loadStrokeData` (Task 7); `hanChars` (Task 4); `speak` and `playSfx` (Task 16); `Pet`, `Label`, `SpeakButton` (Task 17).
- Produces:
  - `WriteResult = { totalMisses: number; elapsedMs: number }`
  - `<WritingStep word kid known onDone />`, where `onDone(null)` means skip, because stroke data failed to load
- **Hanzi Writer 3 facts:**
  - `HanziWriter.create(el, char, { width, height, padding, showCharacter, showOutline, showHintAfterMisses, highlightOnComplete, drawingWidth, strokeColor, charDataLoader(char, onLoad, onError), onLoadCharDataError })`
  - `writer.quiz({ onComplete({ totalMistakes }) })`
  - `writer.cancelQuiz()`

- [ ] **Step 1: Write the failing test** in `src/activities/writing/WritingStep.test.tsx`

```tsx
import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { DEFAULT_KID } from '../../types';
import { WritingStep } from './WritingStep';

type QuizOpts = { onComplete: (s: { totalMistakes: number }) => void };
const quizzes: QuizOpts[] = [];
let loadError: (() => void) | undefined;

vi.mock('hanzi-writer', () => ({
  default: {
    create: vi.fn((_el: unknown, _ch: string, opts: { onLoadCharDataError?: () => void }) => {
      loadError = opts.onLoadCharDataError;
      return { quiz: (o: QuizOpts) => { quizzes.push(o); return Promise.resolve(); }, cancelQuiz: vi.fn() };
    }),
  },
}));
vi.mock('../../audio/speech', () => ({ speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

describe('WritingStep', () => {
  it('writes each character in turn and reports the total misses', () => {
    quizzes.length = 0;
    const onDone = vi.fn();
    render(<WritingStep word={makeWord('大人', { pinyin: 'dà rén' })} kid={DEFAULT_KID} known={0} onDone={onDone} />);
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 1 }));
    fireEvent.click(screen.getByText('下一个字'));
    act(() => quizzes.at(-1)!.onComplete({ totalMistakes: 2 }));
    fireEvent.click(screen.getByText('完成'));
    expect(onDone).toHaveBeenCalledWith({ totalMisses: 3, elapsedMs: expect.any(Number) });
  });

  it('skips the word when its stroke data cannot load', () => {
    const onDone = vi.fn();
    render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} known={0} onDone={onDone} />);
    act(() => loadError!());
    expect(onDone).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/activities/writing`
Expected: FAIL, because `./WritingStep` is missing.

- [ ] **Step 3: Implement `src/activities/writing/WritingStep.tsx`**

```tsx
import HanziWriter from 'hanzi-writer';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { hanChars } from '../../content';
import { loadStrokeData } from '../../content/strokes';
import type { KidState, Word } from '../../types';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';

export interface WriteResult {
  totalMisses: number;
  elapsedMs: number;
}

interface Props {
  word: Word;
  kid: KidState;
  known: number;
  onDone: (result: WriteResult | null) => void;
}

export function WritingStep({ word, kid, known, onDone }: Props) {
  const chars = useMemo(() => hanChars(word.text), [word.id]);
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [charMisses, setCharMisses] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const startedAt = useRef(performance.now());

  useEffect(() => {
    speak(word.text);
  }, [word.id]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = '';
    setCharMisses(null);
    let cancelled = false;
    const size = Math.min(320, window.innerWidth - 64);
    const writer = HanziWriter.create(el, chars[index]!, {
      width: size,
      height: size,
      padding: 16,
      showCharacter: false,
      showOutline: false,
      showHintAfterMisses: 2,
      highlightOnComplete: true,
      drawingWidth: 24,
      strokeColor: '#2d3436',
      charDataLoader: (ch, onLoad, onError) => {
        loadStrokeData(ch).then((data) => onLoad(data as never), onError);
      },
      onLoadCharDataError: () => {
        if (!cancelled) onDone(null);
      },
    });
    void writer.quiz({
      onComplete: (summary) => {
        if (cancelled) return;
        playSfx('star');
        setMisses((m) => m + summary.totalMistakes);
        setCharMisses(summary.totalMistakes);
      },
    });
    return () => {
      cancelled = true;
      writer.cancelQuiz();
    };
  }, [word.id, index]);

  const last = index === chars.length - 1;
  const next = () => {
    if (!last) setIndex(index + 1);
    else onDone({ totalMisses: misses, elapsedMs: Math.round(performance.now() - startedAt.current) });
  };
  const bubble = charMisses === null ? '写一写！' : charMisses === 0 ? '完美！' : '写得好！';

  return (
    <div class="write">
      <div class="row">
        <Pet kid={kid} known={known} size={80} mood={charMisses === null ? null : 'happy'} bubble={bubble} />
        <div class="write__prompt">
          <span class="pinyin">{word.pinyin}</span>
          <SpeakButton text={word.text} />
        </div>
      </div>
      <div class="dots">
        {chars.map((c, i) => (
          <span key={`${c}${i}`} class={`dot ${i < index || (i === index && charMisses !== null) ? 'is-done' : ''}`} />
        ))}
      </div>
      <div ref={host} class="tianzige" />
      {charMisses !== null && (
        <>
          <p class="praise">{charMisses === 0 ? '⭐ 完美 ⭐' : '⭐'}</p>
          <button type="button" class="btn btn--primary" onClick={next}>
            <Label zh={last ? '完成' : '下一个字'} />
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/activities/writing && npx tsc --noEmit`
Expected: 2 tests pass and there are no type errors. If `tsc` rejects an option name, check `node_modules/hanzi-writer/dist/types/HanziWriter.d.ts` for the exact name and use it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 听写 writing step with Hanzi Writer quiz in a 田字格

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Components step ("fishing")

**Files:**
- Create: `src/activities/components/ComponentsStep.tsx`
- Test: `src/activities/components/ComponentsStep.test.tsx`

**Interfaces:**
- Consumes: `ComponentQuestion` (Task 11), `radicalMeaning` (Task 4), `speak` and `playSfx` (Task 16), `Pet` and `Label` (Task 17).
- Produces: `<ComponentsStep questions kid known onDone />`. It runs every question and then calls `onDone()`. There's no scoring.

- [ ] **Step 1: Write the failing test** in `src/activities/components/ComponentsStep.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { ComponentsStep } from './ComponentsStep';
import type { ComponentQuestion } from './game';

vi.mock('../../audio/speech', () => ({ speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

const questions: ComponentQuestion[] = [
  { kind: 'tapAll', component: '氵', answers: ['河', '汉'], grid: ['河', '汉', '大', '人', '口', '一', '二', '三'] },
  { kind: 'whichPart', char: '妈', component: '女', options: ['马', '女'] },
];

describe('ComponentsStep', () => {
  it('runs a fishing question, then a which-part question, then finishes', () => {
    const onDone = vi.fn();
    render(<ComponentsStep questions={questions} kid={DEFAULT_KID} known={20} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '河' }));
    fireEvent.click(screen.getByRole('button', { name: '汉' }));
    fireEvent.click(screen.getByText('检查'));
    expect(screen.getByText('全对了！')).toBeTruthy();
    fireEvent.click(screen.getByText('下一题'));
    fireEvent.click(screen.getByRole('button', { name: '女' }));
    fireEvent.click(screen.getByText('完成'));
    expect(onDone).toHaveBeenCalled();
  });

  it('shows the fish that were missed', () => {
    render(<ComponentsStep questions={questions} kid={DEFAULT_KID} known={20} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '河' }));
    fireEvent.click(screen.getByText('检查'));
    expect(screen.getByText('看看绿色的！')).toBeTruthy();
    expect(screen.getByRole('button', { name: '汉' }).className).toContain('is-missed');
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/activities/components/ComponentsStep.test.tsx`
Expected: FAIL, because `./ComponentsStep` is missing.

- [ ] **Step 3: Implement `src/activities/components/ComponentsStep.tsx`**

```tsx
import { useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { radicalMeaning } from '../../content/radicals';
import type { KidState } from '../../types';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import type { ComponentQuestion, TapAllQuestion, WhichPartQuestion } from './game';

interface Props {
  questions: ComponentQuestion[];
  kid: KidState;
  known: number;
  onDone: () => void;
}

export function ComponentsStep({ questions, kid, known, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<boolean | null>(null); // null = not checked yet; true = all right
  const q = questions[index]!;
  const last = index + 1 >= questions.length;

  const report = (allRight: boolean) => {
    setChecked(allRight);
    if (allRight) {
      playSfx('correct');
      playSfx('star');
    } else {
      playSfx('wrong');
    }
  };
  const next = () => {
    setChecked(null);
    if (last) onDone();
    else setIndex(index + 1);
  };

  return (
    <div class="center">
      <Pet
        kid={kid}
        known={known}
        size={80}
        mood={checked === null ? null : checked ? 'happy' : 'comfort'}
        bubble={checked === null ? '钓鱼啦！' : checked ? '全对了！' : '看看绿色的！'}
      />
      {q.kind === 'tapAll' ? (
        <TapAll key={index} q={q} checked={checked !== null} onCheck={report} />
      ) : (
        <WhichPart key={index} q={q} checked={checked !== null} onCheck={report} />
      )}
      {checked !== null && (
        <button type="button" class="btn btn--primary" onClick={next}>
          <Label zh={last ? '完成' : '下一题'} />
        </button>
      )}
    </div>
  );
}

function TapAll({ q, checked, onCheck }: { q: TapAllQuestion; checked: boolean; onCheck: (allRight: boolean) => void }) {
  const [caught, setCaught] = useState<Set<string>>(new Set());
  const m = radicalMeaning(q.component);
  const toggle = (c: string) => {
    if (checked) return;
    const next = new Set(caught);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setCaught(next);
  };
  const state = (c: string) => {
    if (!checked) return caught.has(c) ? 'is-caught' : '';
    if (q.answers.includes(c)) return caught.has(c) ? 'is-right' : 'is-right is-missed';
    return caught.has(c) ? 'is-oops' : '';
  };
  const allRight = q.answers.length === caught.size && q.answers.every((a) => caught.has(a));
  return (
    <>
      <div class="pond-q">
        <Label zh="钓出有" />
        <span class="hanzi" style={{ fontSize: '56px' }}>{q.component}</span>
        {m && <span>{m.emoji} {m.zh}</span>}
        <Label zh="的字" />
      </div>
      <div class="pond">
        {q.grid.map((c, i) => (
          <button
            key={c}
            type="button"
            class={`fish ${state(c)}`}
            style={{ animationDelay: `${(i % 4) * 0.3}s` }}
            aria-label={c}
            aria-pressed={caught.has(c)}
            onClick={() => toggle(c)}
          >
            <span class="fish__body" aria-hidden="true">🐟</span>
            <span class="fish__char" aria-hidden="true">{c}</span>
          </button>
        ))}
      </div>
      {!checked && (
        <button type="button" class="btn btn--good" disabled={!caught.size} onClick={() => onCheck(allRight)}>
          <Label zh="检查" />
        </button>
      )}
    </>
  );
}

function WhichPart({ q, checked, onCheck }: { q: WhichPartQuestion; checked: boolean; onCheck: (allRight: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const m = radicalMeaning(q.component)!;
  return (
    <>
      <button type="button" class="hanzi hanzi--xl" style={{ border: 'none', background: 'none' }} onClick={() => speak(q.char)}>
        {q.char}
      </button>
      <div class="pond-q">
        <Label zh="哪个部分是" />
        <span>{m.emoji} {m.zh}</span>
        <Label zh="的意思？" />
      </div>
      <div class="bubbles">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            class={`bubble-opt ${checked ? (o === q.component ? 'is-right' : o === picked ? 'is-oops' : '') : ''}`}
            disabled={checked}
            onClick={() => {
              setPicked(o);
              onCheck(o === q.component);
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/activities/components && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: fishing components game step

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Speaking step (看图说话 and read-aloud recordings)

**Files:**
- Create: `src/activities/speaking/prompts.ts`, `src/activities/speaking/SpeakingStep.tsx`
- Test: `src/activities/speaking/prompts.test.ts`, `src/activities/speaking/SpeakingStep.test.tsx`

**Interfaces:**
- Consumes: `hanChars` (Task 4); the recorder, `speak` and `playSfx` (Task 16); `Label` (Task 17); `Passage`, `PicturePrompt` (Task 2).
- Produces:
  - `PASSAGE_KNOWN_RATIO = 0.9`, `HELPER_QUESTIONS`
  - `type SpeakingChoice = { kind: 'picture'; prompt: PicturePrompt } | { kind: 'passage'; passage: Passage } | null`
  - `eligiblePassages(passages, knownChars): Passage[]`
  - `chooseSpeakingPrompt({ pictures, passages, recordingCount, rng }): SpeakingChoice`
  - `<SpeakingStep choice onSave onSkip />`

- [ ] **Step 1: Write the failing tests**

`src/activities/speaking/prompts.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../lib/random';
import { chooseSpeakingPrompt, eligiblePassages } from './prompts';

const passages = [
  { id: 'a', title: 'A', text: '大人，大人。大人大人大人！' },
  { id: 'b', title: 'B', text: '大人大人大人大人大河' },
];

describe('speaking prompts', () => {
  it('offers passages only when at least 90% of their characters are known', () => {
    expect(eligiblePassages(passages, new Set(['大', '人'])).map((p) => p.id)).toEqual(['a', 'b']);
    expect(eligiblePassages(passages, new Set(['大']))).toEqual([]);
  });

  it('alternates pictures and passages, falling back when one kind is missing', () => {
    const pic = { id: 'p', createdAt: 0, blob: new Blob(), mime: 'image/png' };
    const rng = mulberry32(1);
    expect(chooseSpeakingPrompt({ pictures: [pic], passages, recordingCount: 0, rng })?.kind).toBe('picture');
    expect(chooseSpeakingPrompt({ pictures: [pic], passages, recordingCount: 1, rng })?.kind).toBe('passage');
    expect(chooseSpeakingPrompt({ pictures: [], passages, recordingCount: 0, rng })?.kind).toBe('passage');
    expect(chooseSpeakingPrompt({ pictures: [], passages: [], recordingCount: 0, rng })).toBeNull();
  });
});
```

`src/activities/speaking/SpeakingStep.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { SpeakingStep } from './SpeakingStep';

vi.mock('../../audio/recorder', () => ({
  MicDeniedError: class MicDeniedError extends Error {},
  recordingSupported: () => true,
  startRecording: vi.fn(),
}));
vi.mock('../../audio/speech', () => ({ speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

import { MicDeniedError, startRecording } from '../../audio/recorder';

const choice = { kind: 'passage' as const, passage: { id: 'p01', title: '我的家', text: '我家有五个人。' } };

describe('SpeakingStep', () => {
  it('records, lets the child listen back, and saves', async () => {
    vi.mocked(startRecording).mockResolvedValue({
      stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 3 }),
      cancel: vi.fn(),
    });
    const onSave = vi.fn(async () => {});
    render(<SpeakingStep choice={choice} onSave={onSave} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    fireEvent.click(await screen.findByText('保存'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mime: 'audio/mp4', durationSec: 3 })));
  });

  it('lets the child carry on when the microphone is blocked', async () => {
    vi.mocked(startRecording).mockRejectedValue(new MicDeniedError());
    const onSkip = vi.fn();
    render(<SpeakingStep choice={choice} onSave={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('继续'));
    expect(onSkip).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/activities/speaking`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Implement `src/activities/speaking/prompts.ts`**

```ts
import { hanChars } from '../../content';
import type { Rng } from '../../lib/random';
import type { Passage, PicturePrompt } from '../../types';

export const PASSAGE_KNOWN_RATIO = 0.9;
export const HELPER_QUESTIONS = ['谁？', '什么时候？', '在哪里？', '做什么？', '心情怎么样？'];

export type SpeakingChoice = { kind: 'picture'; prompt: PicturePrompt } | { kind: 'passage'; passage: Passage } | null;

export function eligiblePassages(passages: Passage[], knownChars: Set<string>): Passage[] {
  return passages.filter((p) => {
    const han = hanChars(p.text);
    return han.length > 0 && han.filter((c) => knownChars.has(c)).length / han.length >= PASSAGE_KNOWN_RATIO;
  });
}

export function chooseSpeakingPrompt(opts: {
  pictures: PicturePrompt[];
  passages: Passage[];
  recordingCount: number;
  rng: Rng;
}): SpeakingChoice {
  const pick = <T,>(list: T[]) => (list.length ? list[Math.floor(opts.rng() * list.length)]! : null);
  const prompt = pick(opts.pictures);
  const passage = pick(opts.passages);
  const picture: SpeakingChoice = prompt ? { kind: 'picture', prompt } : null;
  const reading: SpeakingChoice = passage ? { kind: 'passage', passage } : null;
  return opts.recordingCount % 2 === 0 ? (picture ?? reading) : (reading ?? picture);
}
```

- [ ] **Step 4: Implement `src/activities/speaking/SpeakingStep.tsx`**

```tsx
import { pinyin } from 'pinyin-pro';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { recordingSupported, startRecording, type ActiveRecording, type FinishedRecording } from '../../audio/recorder';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { Label } from '../../ui/Label';
import { HELPER_QUESTIONS, type SpeakingChoice } from './prompts';

type Phase = 'ready' | 'recording' | 'review' | 'blocked';

interface Props {
  choice: NonNullable<SpeakingChoice>;
  onSave: (recording: FinishedRecording) => Promise<void>;
  onSkip: () => void;
}

export function SpeakingStep({ choice, onSave, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>(recordingSupported() ? 'ready' : 'blocked');
  const [finished, setFinished] = useState<FinishedRecording | null>(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const active = useRef<ActiveRecording | null>(null);
  const pictureUrl = useMemo(() => (choice.kind === 'picture' ? URL.createObjectURL(choice.prompt.blob) : null), [choice]);
  const playbackUrl = useMemo(() => (finished ? URL.createObjectURL(finished.blob) : null), [finished]);

  useEffect(() => () => { if (pictureUrl) URL.revokeObjectURL(pictureUrl); }, [pictureUrl]);
  useEffect(() => () => { if (playbackUrl) URL.revokeObjectURL(playbackUrl); }, [playbackUrl]);
  useEffect(() => () => active.current?.cancel(), []);

  const stop = async () => {
    const rec = active.current;
    if (!rec) return;
    active.current = null;
    setFinished(await rec.stop());
    setPhase('review');
  };
  const start = async () => {
    try {
      active.current = await startRecording(() => void stop());
      setPhase('recording');
    } catch {
      setPhase('blocked'); // permission refused or no microphone: never block the session
    }
  };
  const save = async () => {
    if (!finished) return;
    playSfx('star');
    await onSave(finished);
  };

  return (
    <div class="speak-step">
      {choice.kind === 'picture' ? (
        <>
          <h2 style={{ margin: 0 }}><Label zh="看图说一说" /></h2>
          <img src={pictureUrl!} alt="" />
          <div class="helpers">
            {HELPER_QUESTIONS.map((h) => <span key={h} class="helper"><Label zh={h} /></span>)}
          </div>
        </>
      ) : (
        <>
          <h2 style={{ margin: 0 }}><Label zh={`读一读：${choice.passage.title}`} /></h2>
          <p class="passage">{choice.passage.text}</p>
          {showPinyin && <p class="passage__py">{pinyin(choice.passage.text)}</p>}
          <div class="row">
            <button type="button" class="btn" onClick={() => speak(choice.passage.text)}>🔊 <Label zh="听一听" /></button>
            <button type="button" class="btn btn--ghost" onClick={() => setShowPinyin(!showPinyin)}><Label zh="拼音" /></button>
          </div>
        </>
      )}

      {phase === 'ready' && (
        <button type="button" class="btn btn--primary btn--big" onClick={() => void start()}>🎙️ <Label zh="开始录音" /></button>
      )}
      {phase === 'recording' && (
        <button type="button" class="btn btn--big" onClick={() => void stop()}><span class="rec-dot" /> <Label zh="停止" /></button>
      )}
      {phase === 'review' && (
        <div class="row">
          <audio controls src={playbackUrl ?? undefined} />
          <button type="button" class="btn" onClick={() => { setFinished(null); setPhase('ready'); }}><Label zh="重录" /></button>
          <button type="button" class="btn btn--good" onClick={() => void save()}><Label zh="保存" /> ✓</button>
        </div>
      )}
      {phase === 'blocked' && (
        <div class="center" style={{ flex: 0 }}>
          <p class="warning">
            <Label zh="麦克风没有打开。我们下次再录！" />
            <br />
            <small>Ask a parent to allow the microphone for this app.</small>
          </p>
          <button type="button" class="btn btn--primary" onClick={onSkip}><Label zh="继续" /></button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/activities/speaking && npx tsc --noEmit`
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: speaking step — picture talk and read-aloud recordings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: Session screen and end-of-session celebration

**Files:**
- Create: `src/app/SessionScreen.tsx`, `src/app/Celebration.tsx`
- Test: `src/app/SessionScreen.test.tsx`

**Interfaces:**
- Consumes:
  - Activity steps (Tasks 18–21), runner, record and plan (Tasks 8–9), `loadKnowledge` (Task 13)
  - Fun rules (Task 14), repo (Task 6), `useApp` (Task 17), `celebrate` and `playSfx` (Task 16), `buildComponentRound` (Task 11), prompts (Task 21)
- Produces:
  - `<SessionScreen free />`: loads or resumes the session, runs the steps, saves after every answer (when not free play), and skips items or steps that can't run.
  - `<Celebration rec />`: stars, then the chest (first completed daily session of the day), then evolution, then new badges, then home.

- [ ] **Step 1: Write the failing test** in `src/app/SessionScreen.test.tsx`

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allCards, getSession, getWord, putWords, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));
const flashOnly = { ...DEFAULT_SETTINGS.activities, writing: false, components: false, speaking: false };

async function setup() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await updateSettings(app.db, { newPerDay: 2, activities: flashOnly });
  return app;
}

const introWord = () => document.querySelector('.intro .hanzi--xl')?.textContent ?? null;

async function learnCurrentWord() {
  fireEvent.click(await screen.findByText('我记住了！'));
  const shown = document.querySelector('.hanzi--xl')!.textContent!;
  fireEvent.click(screen.getByRole('button', { name: byText.get(shown)!.pinyin }));
  fireEvent.click(screen.getByText('下一个'));
}

describe('SessionScreen', () => {
  it('runs a short daily session to the celebration and saves progress', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await learnCurrentWord();
    await learnCurrentWord();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect(await allCards(app.db)).toHaveLength(2);
    expect((await getSession(app.db, '2026-10-02'))?.completed).toBe(true);
  });

  it('resumes where the child left off', async () => {
    const app = await setup();
    const first = renderWithApp(<SessionScreen free={false} />, app);
    await learnCurrentWord();
    await screen.findByText('我记住了！');
    const second = introWord();
    first.unmount();
    renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我记住了！');
    expect(introWord()).toBe(second);
  });

  it('skips a word that was paused after the plan was made', async () => {
    const app = await setup();
    const first = renderWithApp(<SessionScreen free={false} />, app);
    await screen.findByText('我记住了！');
    const paused = introWord()!;
    first.unmount();
    const w = (await getWord(app.db, byText.get(paused)!.id))!;
    await putWords(app.db, [{ ...w, paused: true }]);
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(introWord()).toBeTruthy());
    expect(introWord()).not.toBe(paused);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/app/SessionScreen.test.tsx`
Expected: FAIL, because `./SessionScreen` is missing.

- [ ] **Step 3: Implement `src/app/SessionScreen.tsx`**

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { ComponentsStep } from '../activities/components/ComponentsStep';
import { buildComponentRound, type ComponentQuestion } from '../activities/components/game';
import { FlashcardStep, type FlashResult } from '../activities/flashcards/FlashcardStep';
import { chooseSpeakingPrompt, eligiblePassages, type SpeakingChoice } from '../activities/speaking/prompts';
import { SpeakingStep } from '../activities/speaking/SpeakingStep';
import { WritingStep, type WriteResult } from '../activities/writing/WritingStep';
import type { FinishedRecording } from '../audio/recorder';
import { playSfx } from '../audio/sfx';
import { PASSAGES } from '../content';
import { comboMilestone } from '../fun/pet';
import { localDateKey } from '../lib/date';
import { mulberry32 } from '../lib/random';
import { buildFreePlayQueue } from '../session/plan';
import { recordRecognition, recordWriting, startOrResumeSession } from '../session/record';
import {
  addActiveTime, afterFlashAnswer, afterWriteWord, createFreePlayRecord, currentFlashItem, currentStep,
  currentWriteCandidate, finishStep, skipFlashItem,
} from '../session/runner';
import { addRecording, countRecordings, getKid, listPrompts, saveSession } from '../store/repo';
import { DEFAULT_KID, type KidState, type SessionRecord, type StepKind } from '../types';
import { useApp } from './AppContext';
import { Celebration } from './Celebration';
import { loadKnowledge, type Knowledge } from './knowledge';

const STEP_ICONS: Record<StepKind, string> = { flashcards: '🐲', writing: '✍️', components: '🎣', speaking: '🎤' };

interface Loaded {
  rec: SessionRecord;
  know: Knowledge;
  kid: KidState;
  round: ComponentQuestion[] | null;
  speaking: SpeakingChoice;
}

export function SessionScreen({ free }: { free: boolean }) {
  const { db, now, go, voice } = useApp();
  const [state, setState] = useState<Loaded | null>(null);
  const [combo, setCombo] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const stepStartedAt = useRef(performance.now());
  const busy = useRef(false);

  useEffect(() => {
    void (async () => {
      const rng = mulberry32(Date.now() >>> 0);
      const [know, kid, pictures, recordingCount] = await Promise.all([loadKnowledge(db), getKid(db), listPrompts(db), countRecordings(db)]);
      const today = now();
      const rec = free
        ? createFreePlayRecord(buildFreePlayQueue(know.cards, know.words, rng), localDateKey(today), today.getTime())
        : await startOrResumeSession(db, today);
      setState({
        rec,
        know,
        kid: kid ?? DEFAULT_KID,
        round: buildComponentRound([...know.knownChars], rng),
        speaking: chooseSpeakingPrompt({ pictures, passages: eligiblePassages(PASSAGES, know.knownChars), recordingCount, rng }),
      });
    })();
  }, []);

  const rec = state?.rec ?? null;
  const step = rec ? currentStep(rec) : null;
  const flashItem = rec ? currentFlashItem(rec) : null;
  const flashWord = flashItem ? state!.know.wordsById.get(flashItem.wordId) : undefined;
  const writeCandidate = rec ? currentWriteCandidate(rec) : null;
  const writeWord = writeCandidate ? state!.know.wordsById.get(writeCandidate.wordId) : undefined;

  const commit = async (next: SessionRecord) => {
    if (!next.free) await saveSession(db, next);
    stepStartedAt.current = performance.now();
    setState((s) => (s ? { ...s, rec: next } : s));
  };

  // Anything that cannot run is skipped silently: an empty step, or a word paused/deleted since planning.
  useEffect(() => {
    if (!state || !rec) return;
    if (step === 'flashcards' && !flashItem) void commit(finishStep(rec));
    else if (step === 'flashcards' && (!flashWord || flashWord.paused)) void commit(skipFlashItem(rec));
    else if (step === 'writing' && !writeCandidate) void commit(finishStep(rec));
    else if (step === 'writing' && (!writeWord || writeWord.paused)) void commit(afterWriteWord(rec, false, 0));
    else if (step === 'components' && !state.round) void commit(finishStep(rec));
    else if (step === 'speaking' && !state.speaking) void commit(finishStep(rec));
  }, [rec]);

  if (!state || !rec) return <div class="screen loading">🥚</div>;
  if (rec.completed) return <Celebration rec={rec} />;
  const { know, kid } = state;

  const once = (fn: () => Promise<void>) => async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await fn();
    } finally {
      busy.current = false;
    }
  };

  const finishTimedStep = once(() => commit(finishStep(addActiveTime(rec, Math.round(performance.now() - stepStartedAt.current)))));

  const onFlashDone = (r: FlashResult) =>
    once(async () => {
      const item = flashItem!;
      if (!item.retry && !rec.free) {
        const card = await recordRecognition(db, item.wordId, { correct: r.correct, responseMs: r.responseMs }, now());
        know.cardsById.set(card.id, card);
      }
      const nextCombo = r.correct ? combo + 1 : 0;
      setCombo(nextCombo);
      if (comboMilestone(nextCombo)) {
        playSfx('combo');
        setBanner(`连对 ${nextCombo} 个！🔥`);
        setTimeout(() => setBanner(null), 1600);
      }
      await commit(afterFlashAnswer(rec, r.correct, r.elapsedMs));
    })();

  const onWriteDone = (r: WriteResult | null) =>
    once(async () => {
      if (r && !rec.free) await recordWriting(db, writeCandidate!.wordId, r.totalMisses, now());
      await commit(afterWriteWord(rec, r !== null, r?.elapsedMs ?? 0));
    })();

  const onSpeakingSave = async (f: FinishedRecording) => {
    const s = state.speaking!;
    const prompt = s.kind === 'picture' ? { kind: 'picture' as const, promptId: s.prompt.id } : { kind: 'passage' as const, passageId: s.passage.id };
    await addRecording(db, { id: crypto.randomUUID(), createdAt: now().getTime(), prompt, ...f });
    await finishTimedStep();
  };

  return (
    <div class="screen">
      <header class="stepbar">
        <button type="button" class="btn btn--ghost" aria-label="回家" onClick={() => go({ name: 'home' })}>🏠</button>
        {rec.plan.steps.map((s, i) => (
          <span key={s} class={`stepbar__step ${i < rec.stepIndex ? 'is-done' : i === rec.stepIndex ? 'is-current' : ''}`}>
            {STEP_ICONS[s]}
          </span>
        ))}
        {combo >= 3 && <span class="combo">🔥 {combo}</span>}
      </header>
      {banner && <div class="combo-banner">{banner}</div>}

      {step === 'flashcards' && flashItem && flashWord && !flashWord.paused && (
        <FlashcardStep
          key={rec.flashIndex}
          item={flashItem}
          word={flashWord}
          pool={know.words}
          card={know.cardsById.get(`${flashWord.id}:recognise`)}
          voice={voice}
          kid={kid}
          known={know.known}
          onDone={(r) => void onFlashDone(r)}
        />
      )}
      {step === 'writing' && writeWord && !writeWord.paused && (
        <WritingStep key={rec.writeIndex} word={writeWord} kid={kid} known={know.known} onDone={(r) => void onWriteDone(r)} />
      )}
      {step === 'components' && state.round && (
        <ComponentsStep questions={state.round} kid={kid} known={know.known} onDone={() => void finishTimedStep()} />
      )}
      {step === 'speaking' && state.speaking && (
        <SpeakingStep choice={state.speaking} onSave={onSpeakingSave} onSkip={() => void finishTimedStep()} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/app/Celebration.tsx`**

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { BUILTIN } from '../content';
import { radicalMeaning } from '../content/radicals';
import { canOpenChest, openChest, petStage, type ChestResult } from '../fun/pet';
import { newBadges, stickerFamilies } from '../fun/stickers';
import { localDateKey } from '../lib/date';
import { getKid, saveKid } from '../store/repo';
import { DEFAULT_KID, type KidState, type SessionRecord } from '../types';
import { celebrate } from '../ui/confetti';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { useApp } from './AppContext';
import { loadKnowledge } from './knowledge';

type Phase = 'stars' | 'chest' | 'evolve' | 'badges';

interface Sequence {
  order: Phase[];
  stage: number;
  fromStage: number;
  badges: string[];
  known: number;
}

export function Celebration({ rec }: { rec: SessionRecord }) {
  const { db, now, go, refresh } = useApp();
  const today = localDateKey(now());
  const kidRef = useRef<KidState>(DEFAULT_KID);
  const [kid, setKid] = useState<KidState | null>(null);
  const [seq, setSeq] = useState<Sequence | null>(null);
  const [phase, setPhase] = useState<Phase>('stars');
  const [chest, setChest] = useState<ChestResult | null>(null);

  useEffect(() => {
    celebrate();
    playSfx('star');
    void (async () => {
      const k = (await getKid(db)) ?? DEFAULT_KID;
      const know = await loadKnowledge(db);
      const stage = petStage(know.known);
      const badges = newBadges(stickerFamilies(BUILTIN), know.knownChars, k.badgesSeen);
      const order: Phase[] = ['stars'];
      if (!rec.free && canOpenChest(k, today)) order.push('chest');
      if (stage > k.lastStageSeen) order.push('evolve');
      if (badges.length) order.push('badges');
      kidRef.current = k;
      setKid(k);
      setSeq({ order, stage, fromStage: k.lastStageSeen, badges, known: know.known });
    })();
  }, []);

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
    celebrate();
  };

  const isLast = seq.order.indexOf(phase) === seq.order.length - 1;
  const beforeEvolve = seq.order.includes('evolve') && seq.order.indexOf(phase) < seq.order.indexOf('evolve');
  const stars = rec.completedSteps.length;

  return (
    <div class="screen">
      <div class="celebrate">
        {phase === 'stars' && (
          <>
            <h1><Label zh={rec.free ? '练习得很好！' : '太棒了！'} /></h1>
            {!rec.free && (
              <>
                <div class="stars">
                  {Array.from({ length: stars }, (_, i) => <span key={i} style={{ animationDelay: `${i * 0.25}s` }}>⭐</span>)}
                </div>
                <p><Label zh={`你得到了 ${stars} 颗星`} /></p>
              </>
            )}
          </>
        )}
        {phase === 'chest' && !chest && (
          <>
            <h1><Label zh="宝箱！" /></h1>
            <button type="button" class="chest" aria-label="打开宝箱" onClick={() => void open()}>🎁</button>
            <p><Label zh="点一下打开宝箱！" /></p>
          </>
        )}
        {phase === 'chest' && chest && (
          <>
            <div class="prize">{chest.kind === 'accessory' ? chest.item : '⭐⭐⭐'}</div>
            <p><Label zh={chest.kind === 'accessory' ? `${kid.petName}有新东西了！` : `多了 ${chest.amount} 颗星！`} /></p>
          </>
        )}
        {phase === 'evolve' && <h1><Label zh={`${kid.petName}长大了！`} /></h1>}
        {phase === 'badges' && (
          <>
            <h1><Label zh="新徽章！" /></h1>
            <div class="badges">
              {seq.badges.map((b) => <span key={b} class="badge">🏅 {b} {radicalMeaning(b)?.emoji}</span>)}
            </div>
          </>
        )}
        <Pet key={phase} kid={kid} known={seq.known} stage={beforeEvolve ? seq.fromStage : seq.stage} mood="happy" size={phase === 'evolve' ? 200 : 140} />
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

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/app && npx tsc --noEmit`
Expected: 3 tests pass and there are no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: session screen orchestrating all steps, combo banner, celebration sequence

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: First-launch screens (parent PIN, pet setup, placement)

**Files:**
- Create: `src/app/SetupPin.tsx`, `src/app/PetSetup.tsx`, `src/app/PlacementScreen.tsx`
- Test: `src/app/setup.test.tsx`

**Interfaces:**
- Consumes: `PinPad`, `Pet`, `Label` (Task 17); `hashPin` (Task 2); `updateSettings`, `saveKid`, `allWords` (Task 6); placement (Task 12); `loadKnowledge` (Task 13); `PET_COLORS` (Task 14).
- Produces:
  - `<SetupPin onDone? />`: without `onDone` it goes to `petSetup` (the first-launch flow). With `onDone` it's reused by "Change PIN" and "Forgot PIN".
  - `<PetSetup />`, which saves the kid state and goes to `placement`.
  - `<PlacementScreen />`, which stops at the first 不认识, seeds cards, and goes `home` on 开始！.

- [ ] **Step 1: Write the failing test** in `src/app/setup.test.tsx`

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { hashPin } from '../lib/hash';
import { getKid, getSettings, putWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { PetSetup } from './PetSetup';
import { PlacementScreen } from './PlacementScreen';
import { SetupPin } from './SetupPin';

const type = (pin: string) => [...pin].forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));

describe('first launch', () => {
  it('SetupPin asks twice and saves a hashed PIN', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS } });
    renderWithApp(<SetupPin />, app);
    type('1234');
    await screen.findByText('Enter the same PIN again');
    type('9999');
    expect(await screen.findByText('The PINs did not match. Please start again.')).toBeTruthy();
    type('1234');
    await screen.findByText('Enter the same PIN again');
    type('1234');
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'petSetup' }));
    expect((await getSettings(app.db)).pinHash).toBe(await hashPin('1234'));
  });

  it('PetSetup saves the name and colour', async () => {
    const app = await makeAppData({ kid: null });
    renderWithApp(<PetSetup />, app);
    fireEvent.input(screen.getByLabelText('Pet name'), { target: { value: '豆豆' } });
    fireEvent.click(screen.getByRole('button', { name: '蓝色' }));
    fireEvent.click(screen.getByText('好了！'));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'placement' }));
    expect(await getKid(app.db)).toMatchObject({ petName: '豆豆', petColor: 'blue' });
  });

  it('Placement seeds everything ranked before the first unknown sample', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    renderWithApp(<PlacementScreen />, app);
    for (let i = 0; i < 3; i++) fireEvent.click(await screen.findByText('认识'));
    fireEvent.click(screen.getByText('不认识'));
    expect(await screen.findByText('你已经认识 45 个字了！')).toBeTruthy();
    expect((await getSettings(app.db)).placementDone).toBe(true);
    fireEvent.click(screen.getByText('开始！'));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'home' }));
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/app/setup.test.tsx`
Expected: FAIL, because the screens are missing.

- [ ] **Step 3: Implement**

`src/app/SetupPin.tsx`:
```tsx
import { useState } from 'preact/hooks';
import { hashPin } from '../lib/hash';
import { updateSettings } from '../store/repo';
import { PinPad } from '../ui/PinPad';
import { useApp } from './AppContext';

export function SetupPin({ onDone }: { onDone?: () => void }) {
  const { db, go, refresh } = useApp();
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = async (pin: string) => {
    if (first === null) {
      setFirst(pin);
      setError(null);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setError('The PINs did not match. Please start again.');
      return;
    }
    await updateSettings(db, { pinHash: await hashPin(pin) });
    await refresh();
    if (onDone) onDone();
    else go({ name: 'petSetup' });
  };

  return (
    <div class="screen parent">
      <div class="center">
        <h1>{first === null ? 'For parents: choose a 4-digit PIN' : 'Enter the same PIN again'}</h1>
        <p>The PIN keeps the parent area (progress, word lists, recordings) separate from your child's practice.</p>
        <PinPad key={first === null ? 'first' : 'confirm'} onComplete={(p) => void complete(p)} error={error} />
      </div>
    </div>
  );
}
```

`src/app/PetSetup.tsx`:
```tsx
import { useState } from 'preact/hooks';
import { PET_COLORS } from '../fun/pet';
import { saveKid } from '../store/repo';
import { DEFAULT_KID, type PetColor } from '../types';
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
      <div class="center">
        <h1><Label zh="这是你的龙蛋！" /></h1>
        <div style={{ fontSize: '140px' }}>🥚</div>
        <p><Label zh="给你的小龙起个名字" /></p>
        <input class="name-input" aria-label="Pet name" maxLength={6} value={name} onInput={(e) => setName(e.currentTarget.value)} />
        <p><Label zh="选一个颜色" /></p>
        <div class="row">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              class={`swatch ${c === color ? 'is-on' : ''}`}
              aria-label={PET_COLORS[c].zh}
              aria-pressed={c === color}
              onClick={() => setColor(c)}
            >
              <span style={{ filter: `hue-rotate(${PET_COLORS[c].hue}deg)` }}>🐲</span>
            </button>
          ))}
        </div>
        <button type="button" class="btn btn--primary btn--big" onClick={() => void done()}>
          <Label zh="好了！" />
        </button>
      </div>
    </div>
  );
}
```

`src/app/PlacementScreen.tsx`:
```tsx
import { useEffect, useState } from 'preact/hooks';
import { applyPlacement } from '../placement/apply';
import { pickPlacementSamples, placementCutoff } from '../placement/placement';
import { allWords } from '../store/repo';
import { DEFAULT_KID, type Word } from '../types';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { useApp } from './AppContext';
import { loadKnowledge } from './knowledge';

export function PlacementScreen() {
  const { db, now, go, refresh, kid } = useApp();
  const [samples, setSamples] = useState<Word[] | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [known, setKnown] = useState<number | null>(null);

  useEffect(() => {
    void allWords(db).then((w) => setSamples(pickPlacementSamples(w)));
  }, []);

  const answer = async (knows: boolean) => {
    if (!samples || known !== null) return;
    const next = [...answers, knows];
    setAnswers(next);
    if (!knows || next.length === samples.length) {
      await applyPlacement(db, placementCutoff(samples.slice(0, next.length), next), now());
      setKnown((await loadKnowledge(db)).known);
    }
  };

  const k = kid ?? DEFAULT_KID;
  if (!samples) return <div class="screen loading">🥚</div>;

  if (known !== null) {
    return (
      <div class="screen">
        <div class="center">
          <Pet kid={k} known={known} mood="happy" size={160} />
          <h1><Label zh={`你已经认识 ${known} 个字了！`} /></h1>
          <p><Label zh="我们每天学一点点。" /></p>
          <button type="button" class="btn btn--primary btn--big" onClick={async () => { await refresh(); go({ name: 'home' }); }}>
            <Label zh="开始！" />
          </button>
        </div>
      </div>
    );
  }

  const current = samples[answers.length];
  return (
    <div class="screen">
      <div class="center">
        <Pet kid={k} known={0} bubble="你认识这个字吗？" size={100} />
        <div class="hanzi hanzi--xl">{current?.text}</div>
        <div class="row">
          <button type="button" class="btn btn--good btn--big" onClick={() => void answer(true)}><Label zh="认识" /> ✓</button>
          <button type="button" class="btn btn--big" onClick={() => void answer(false)}><Label zh="不认识" /> 🤔</button>
        </div>
        <small>{answers.length + 1} / {samples.length}</small>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/app/setup.test.tsx && npx tsc --noEmit`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: first-launch screens — parent PIN, pet setup, placement check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24: Home, wardrobe and sticker book

**Files:**
- Create: `src/app/HomeScreen.tsx`, `src/app/Wardrobe.tsx`, `src/app/StickerBook.tsx`
- Test: `src/app/home.test.tsx`

**Interfaces:**
- Consumes: stats (Task 13), fun rules (Task 14), repo (Task 6), `primeSpeech`, `speak` and `celebrate` (Task 16), widgets (Task 17).
- Produces:
  - `<HomeScreen />`: streak, stars, sticker-book button, lock button, a pet that opens the wardrobe, the known count, a reward goal bar, and start / continue / free-play buttons.
  - `<Wardrobe />`
  - `<StickerBook />`

- [ ] **Step 1: Write the failing test** in `src/app/home.test.tsx`

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BUILTIN, builtinWords } from '../content';
import { stickerFamilies } from '../fun/stickers';
import { createSessionRecord } from '../session/runner';
import { getKid, putCards, putWords, saveKid, saveReward, saveSession } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type SessionPlan } from '../types';
import { HomeScreen } from './HomeScreen';
import { StickerBook } from './StickerBook';
import { Wardrobe } from './Wardrobe';

vi.mock('../audio/speech', () => ({ speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const emptyPlan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const done = (date: string, steps: SessionPlan['steps']) => ({ ...createSessionRecord(emptyPlan, date, 0), completed: true, completedSteps: steps });

describe('HomeScreen', () => {
  it("shows streak, stars and starts today's practice", async () => {
    const app = await makeAppData();
    await saveSession(app.db, done('2026-10-01', ['flashcards', 'writing']));
    renderWithApp(<HomeScreen />, app);
    expect(await screen.findByText('🔥 1')).toBeTruthy();
    expect(screen.getByText('⭐ 2')).toBeTruthy();
    fireEvent.click(screen.getByText('今天的练习'));
    expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false });
  });

  it('offers free play once today is done and shows the next reward goal', async () => {
    const app = await makeAppData();
    await saveSession(app.db, done('2026-10-02', ['flashcards']));
    await putCards(app.db, [makeCard('b:大', 'recognise', new Date(2026, 9, 5))]);
    await saveReward(app.db, { id: 'g', title: 'Ice cream', emoji: '🍦', metric: 'stars', target: 10, createdAt: 0, claimedAt: null });
    renderWithApp(<HomeScreen />, app);
    expect(await screen.findByText('今天完成了！')).toBeTruthy();
    expect(screen.getByText('Ice cream')).toBeTruthy();
    expect(screen.getByText('1 / 10 ⭐')).toBeTruthy();
    fireEvent.click(screen.getByText('再玩一会儿'));
    expect(app.go).toHaveBeenCalledWith({ name: 'session', free: true });
  });
});

describe('Wardrobe', () => {
  it('puts on an owned accessory', async () => {
    const kid = { ...DEFAULT_KID, ownedAccessories: ['🎩', '👑'] };
    const app = await makeAppData({ kid });
    await saveKid(app.db, kid);
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(await screen.findByRole('button', { name: '👑' }));
    await waitFor(async () => expect((await getKid(app.db))?.wearing).toBe('👑'));
  });
});

describe('StickerBook', () => {
  it('shows family progress and opens a family page', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    const water = stickerFamilies(BUILTIN).find((f) => f.component === '氵')!;
    await putCards(app.db, [makeCard(`b:${water.chars[0]}`, 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<StickerBook />, app);
    fireEvent.click(await screen.findByRole('button', { name: `氵 1/${water.chars.length}` }));
    expect(screen.getByRole('button', { name: water.chars[0] })).toBeTruthy();
    expect(document.querySelectorAll('.sticker--unknown')).toHaveLength(water.chars.length - 1);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/app/home.test.tsx`
Expected: FAIL, because the screens are missing.

- [ ] **Step 3: Implement**

`src/app/HomeScreen.tsx`:
```tsx
import { useEffect, useState } from 'preact/hooks';
import { primeSpeech } from '../audio/speech';
import { goalProgress, nextGoal } from '../fun/rewards';
import { localDateKey } from '../lib/date';
import { streak, totalStars } from '../stats/stats';
import { allSessions, listRewards } from '../store/repo';
import { DEFAULT_KID, type RewardGoal, type SessionRecord } from '../types';
import { celebrate } from '../ui/confetti';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { useApp } from './AppContext';
import { loadKnowledge, type Knowledge } from './knowledge';

interface HomeData {
  know: Knowledge;
  sessions: SessionRecord[];
  goals: RewardGoal[];
}

export function HomeScreen() {
  const { db, now, go, kid } = useApp();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    void Promise.all([loadKnowledge(db), allSessions(db), listRewards(db)]).then(([know, sessions, goals]) => setData({ know, sessions, goals }));
  }, []);

  const k = kid ?? DEFAULT_KID;
  const stars = data ? totalStars(data.sessions, k.bonusStars) : 0;
  const goal = data ? nextGoal(data.goals) : null;
  const progress = goal && data ? goalProgress(goal, { stars, known: data.know.known }) : null;
  useEffect(() => {
    if (progress?.reached) celebrate();
  }, [progress?.reached]);

  if (!data) return <div class="screen loading">🥚</div>;

  const today = localDateKey(now());
  const todaySession = data.sessions.find((s) => s.date === today);
  const hasCards = data.know.cards.some((c) => c.kind === 'recognise');
  const play = (free: boolean) => {
    primeSpeech();
    go({ name: 'session', free });
  };

  return (
    <div class="screen">
      <header class="topbar">
        <span class="chip">🔥 {streak(data.sessions, today)}</span>
        <span class="chip">⭐ {stars}</span>
        <span class="spacer" />
        <button type="button" class="btn btn--ghost" onClick={() => go({ name: 'stickers' })}>📒 <Label zh="贴纸本" /></button>
        <button type="button" class="btn btn--ghost" aria-label="Parent area" onClick={() => go({ name: 'parent' })}>🔒</button>
      </header>
      <main class="home__main">
        <button type="button" class="pet-button" aria-label="换装" onClick={() => go({ name: 'wardrobe' })}>
          <Pet kid={k} known={data.know.known} mood="happy" size={170} />
        </button>
        <div class="home__name">{k.petName}</div>
        <div class="home__known"><Label zh={`我认识 ${data.know.known} 个字`} /></div>
        {goal && progress && (
          <div class={`goal ${progress.reached ? 'goal--reached' : ''}`}>
            <span class="goal__emoji">{goal.emoji}</span>
            <div class="goal__body">
              <strong>{goal.title}</strong>
              {progress.reached ? (
                <span><Label zh="你做到了！" /> Ask your parent for {goal.emoji}</span>
              ) : (
                <>
                  <div class="progress"><div class="progress__fill" style={{ width: `${Math.round(progress.fraction * 100)}%` }} /></div>
                  <small>{progress.value} / {goal.target} {goal.metric === 'stars' ? '⭐' : '字'}</small>
                </>
              )}
            </div>
          </div>
        )}
        {todaySession?.completed ? (
          <>
            <p class="done-today"><Label zh="今天完成了！" /> 🎉</p>
            {hasCards && (
              <button type="button" class="btn btn--primary btn--big" onClick={() => play(true)}><Label zh="再玩一会儿" /></button>
            )}
          </>
        ) : (
          <>
            <button type="button" class="btn btn--primary btn--big" onClick={() => play(false)}>
              <Label zh={todaySession ? '继续' : '今天的练习'} />
            </button>
            {hasCards && (
              <button type="button" class="btn btn--ghost" onClick={() => play(true)}><Label zh="自由练习" /></button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
```

`src/app/Wardrobe.tsx`:
```tsx
import { useEffect, useState } from 'preact/hooks';
import { saveKid } from '../store/repo';
import { DEFAULT_KID } from '../types';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { useApp } from './AppContext';
import { loadKnowledge } from './knowledge';

export function Wardrobe() {
  const { db, go, refresh, kid } = useApp();
  const [k, setK] = useState(kid ?? DEFAULT_KID);
  const [known, setKnown] = useState(0);

  useEffect(() => {
    void loadKnowledge(db).then((x) => setKnown(x.known));
  }, []);

  const wear = async (item: string | null) => {
    const next = { ...k, wearing: item };
    setK(next);
    await saveKid(db, next);
    await refresh();
  };

  return (
    <div class="screen">
      <header class="topbar">
        <button type="button" class="btn btn--ghost" onClick={() => go({ name: 'home' })}>← <Label zh="回家" /></button>
      </header>
      <div class="center">
        <Pet kid={k} known={known} size={180} />
        <h1><Label zh="换装" /></h1>
        {k.ownedAccessories.length === 0 ? (
          <p><Label zh="完成练习就能打开宝箱，得到新东西！" /></p>
        ) : (
          <div class="wardrobe">
            <button type="button" class={k.wearing === null ? 'is-on' : ''} aria-label="不戴" onClick={() => void wear(null)}>🚫</button>
            {k.ownedAccessories.map((a) => (
              <button key={a} type="button" class={k.wearing === a ? 'is-on' : ''} aria-label={a} onClick={() => void wear(a)}>{a}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

`src/app/StickerBook.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'preact/hooks';
import { speak } from '../audio/speech';
import { BUILTIN } from '../content';
import { completedBadges, familyProgress, stickerFamilies } from '../fun/stickers';
import { Label } from '../ui/Label';
import { useApp } from './AppContext';
import { loadKnowledge, type Knowledge } from './knowledge';

const tilt = (text: string) => `--tilt:${(text.codePointAt(0)! % 7) - 3}deg`;

export function StickerBook() {
  const { db, go } = useApp();
  const families = useMemo(() => stickerFamilies(BUILTIN), []);
  const [know, setKnow] = useState<Knowledge | null>(null);
  const [open, setOpen] = useState<string | null>(null); // a family's component, or 'mine'

  useEffect(() => {
    void loadKnowledge(db).then(setKnow);
  }, []);

  if (!know) return <div class="screen loading">📒</div>;

  const family = families.find((f) => f.component === open);
  const badges = completedBadges(families, know.knownChars);
  const myWords = know.words.filter((w) => w.source === 'parent' && know.knownWordIds.has(w.id));
  const back = () => (open ? setOpen(null) : go({ name: 'home' }));

  return (
    <div class="screen">
      <header class="topbar">
        <button type="button" class="btn btn--ghost" onClick={back}>← <Label zh={open ? '贴纸本' : '回家'} /></button>
        <h1 style={{ margin: 0 }}>
          {family ? (
            <>{family.meaning.emoji} <span class="hanzi">{family.component}</span> <Label zh={`${family.meaning.zh}家族`} /></>
          ) : (
            <Label zh={open === 'mine' ? '我的词语' : '贴纸本'} />
          )}
        </h1>
      </header>

      {family ? (
        <div class="sticker-grid">
          {family.chars.map((c) =>
            know.knownChars.has(c) ? (
              <button key={c} type="button" class="sticker" style={tilt(c)} aria-label={c} onClick={() => speak(c)}>{c}</button>
            ) : (
              <div key={c} class="sticker sticker--unknown" aria-label="还没学">？</div>
            ),
          )}
        </div>
      ) : open === 'mine' ? (
        myWords.length === 0 ? (
          <p><Label zh="还没有。" /></p>
        ) : (
          <div class="sticker-grid">
            {myWords.map((w) => (
              <button key={w.id} type="button" class="sticker" style={`${tilt(w.text)};font-size:${w.text.length > 2 ? 28 : 40}px`} aria-label={w.text} onClick={() => speak(w.text)}>
                {w.text}
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <div class="badges">
            {badges.length ? badges.map((b) => <span key={b} class="badge">🏅 {b}</span>) : <Label zh="集齐一个家族就能得到徽章！" />}
          </div>
          <div class="book">
            {families.map((f) => {
              const p = familyProgress(f, know.knownChars);
              return (
                <button key={f.component} type="button" class="family" aria-label={`${f.component} ${p.known}/${p.total}`} onClick={() => setOpen(f.component)}>
                  <span class="family__icon">{f.meaning.emoji}</span>
                  <span class="family__name">{f.component}</span>
                  <span>{p.known} / {p.total}</span>
                  <div class="progress" style={{ width: '100%' }}>
                    <div class="progress__fill" style={{ width: `${(p.known / p.total) * 100}%` }} />
                  </div>
                </button>
              );
            })}
            <button type="button" class="family" aria-label="我的词语" onClick={() => setOpen('mine')}>
              <span class="family__icon">📝</span>
              <Label zh="我的词语" />
              <span>{myWords.length}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/app/home.test.tsx && npx tsc --noEmit`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: home screen, wardrobe and sticker book

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 25: Parent area, part 1 (PIN gate, dashboard, reward goals, credits)

**Files:**
- Create: `src/parent/PinGate.tsx`, `src/parent/ParentArea.tsx`, `src/parent/Dashboard.tsx`, `src/parent/MinutesChart.tsx`, `src/parent/RewardsPanel.tsx`, `src/parent/Credits.tsx`
- Test: `src/parent/parentA.test.tsx`

**Interfaces:**
- Consumes: `SetupPin` (Task 23), `PinPad` (Task 17), `hashPin` (Task 2), stats (Task 13), rewards (Task 14), repo (Task 6).
- Produces:
  - `type ParentTab = 'dashboard' | 'words' | 'recordings' | 'pictures' | 'rewards' | 'settings' | 'backup' | 'credits'`
  - `<ParentArea />` with tabs (Task 26 adds the rest), `<PinGate>`, `<Dashboard onNavigate />`, `<MinutesChart data />`, `<RewardsPanel />`, `<Credits />`
- **Chart rules** (dataviz skill):
  - It's a single series, so one hue with no legend; the caption names it.
  - Bars have 4px rounded tops sitting on the baseline, with 2px gaps between them.
  - Each column, at full height, has a hover tooltip (`data-tip`).
  - There's a "Show as table" view.

- [ ] **Step 1: Write the failing test** in `src/parent/parentA.test.tsx`

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { hashPin } from '../lib/hash';
import { createSessionRecord } from '../session/runner';
import { getSettings, listRewards, putCards, putWords, saveSession } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type SessionPlan } from '../types';
import { Dashboard } from './Dashboard';
import { PinGate } from './PinGate';
import { RewardsPanel } from './RewardsPanel';

const emptyPlan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const type = (pin: string) => [...pin].forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));

describe('PinGate', () => {
  it('unlocks with the right PIN only', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, pinHash: await hashPin('2468') } });
    renderWithApp(<PinGate><p>secret</p></PinGate>, app);
    type('1111');
    expect(await screen.findByText('That PIN is not right. Try again.')).toBeTruthy();
    type('2468');
    expect(await screen.findByText('secret')).toBeTruthy();
  });

  it('lets a grown-up reset a forgotten PIN', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, pinHash: await hashPin('2468') } });
    renderWithApp(<PinGate><p>secret</p></PinGate>, app);
    fireEvent.click(screen.getByText('Forgot PIN?'));
    const [, a, b] = document.body.textContent!.match(/(\d+) × (\d+)/)!;
    fireEvent.input(screen.getByLabelText('Answer'), { target: { value: String(Number(a) * Number(b)) } });
    fireEvent.click(screen.getByText('Check'));
    await screen.findByText('For parents: choose a 4-digit PIN');
    type('1357');
    await screen.findByText('Enter the same PIN again');
    type('1357');
    expect(await screen.findByText('secret')).toBeTruthy();
    expect((await getSettings(app.db)).pinHash).toBe(await hashPin('1357'));
  });
});

describe('Dashboard', () => {
  it('summarises progress and flags a missing voice and backup', async () => {
    const app = await makeAppData();
    await putWords(app.db, [makeWord('大')]);
    await putCards(app.db, [makeCard('b:大', 'recognise', new Date(2026, 9, 20), true)]);
    await saveSession(app.db, { ...createSessionRecord(emptyPlan, '2026-10-01', 0), completed: true, activeMs: 15 * 60_000 });
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, app);
    expect(await screen.findByText('1 / 500')).toBeTruthy();
    expect(screen.getByText('No Chinese voice found.')).toBeTruthy();
    expect(screen.getByText(/Last backup: never/)).toBeTruthy();
    expect(screen.getByRole('img', { name: '2026-10-01: 15 minutes' })).toBeTruthy();
  });
});

describe('RewardsPanel', () => {
  it('adds a goal and marks it given once reached', async () => {
    const app = await makeAppData();
    await saveSession(app.db, { ...createSessionRecord(emptyPlan, '2026-10-01', 0), completed: true, completedSteps: ['flashcards'] });
    renderWithApp(<RewardsPanel />, app);
    fireEvent.input(await screen.findByLabelText('Reward'), { target: { value: 'Ice cream' } });
    fireEvent.input(screen.getByLabelText('Target'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Add goal'));
    fireEvent.click(await screen.findByText('Mark as given'));
    await waitFor(async () => expect((await listRewards(app.db))[0]!.claimedAt).not.toBeNull());
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/parent`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Implement**

`src/parent/PinGate.tsx`:
```tsx
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { SetupPin } from '../app/SetupPin';
import { hashPin } from '../lib/hash';
import { PinPad } from '../ui/PinPad';

export function PinGate({ children }: { children: ComponentChildren }) {
  const { settings, go } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  if (unlocked) return <>{children}</>;
  if (forgot) return <ForgotPin onReset={() => { setForgot(false); setUnlocked(true); }} onCancel={() => setForgot(false)} />;

  const check = async (pin: string) => {
    if ((await hashPin(pin)) === settings.pinHash) setUnlocked(true);
    else setError('That PIN is not right. Try again.');
  };

  return (
    <div class="screen parent">
      <header class="topbar">
        <button type="button" class="btn btn--ghost" onClick={() => go({ name: 'home' })}>← Back</button>
      </header>
      <div class="center">
        <h1>Parents only</h1>
        <p>Enter your 4-digit PIN.</p>
        <PinPad onComplete={(p) => void check(p)} error={error} />
        <button type="button" class="link" onClick={() => setForgot(true)}>Forgot PIN?</button>
      </div>
    </div>
  );
}

function ForgotPin({ onReset, onCancel }: { onReset: () => void; onCancel: () => void }) {
  const [q] = useState(() => ({ a: 12 + Math.floor(Math.random() * 87), b: 3 + Math.floor(Math.random() * 7) }));
  const [answer, setAnswer] = useState('');
  const [ok, setOk] = useState(false);
  const [wrong, setWrong] = useState(false);

  if (ok) return <SetupPin onDone={onReset} />;
  return (
    <div class="screen parent">
      <div class="center">
        <h1>Reset PIN</h1>
        <p>To check you're a grown-up: what is {q.a} × {q.b}?</p>
        <div class="field" style={{ width: '200px' }}>
          <input inputMode="numeric" aria-label="Answer" value={answer} onInput={(e) => setAnswer(e.currentTarget.value)} />
        </div>
        <button type="button" class="btn btn--primary" onClick={() => (Number(answer) === q.a * q.b ? setOk(true) : setWrong(true))}>Check</button>
        {wrong && <p class="warning">Not quite — try again.</p>}
        <button type="button" class="link" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
```

`src/parent/ParentArea.tsx` (Task 26 extends `TABS`):
```tsx
import { useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { Credits } from './Credits';
import { Dashboard } from './Dashboard';
import { PinGate } from './PinGate';
import { RewardsPanel } from './RewardsPanel';

export type ParentTab = 'dashboard' | 'words' | 'recordings' | 'pictures' | 'rewards' | 'settings' | 'backup' | 'credits';

const TABS: [ParentTab, string][] = [
  ['dashboard', 'Overview'],
  ['rewards', 'Rewards'],
  ['credits', 'Credits'],
];

export function ParentArea() {
  const { go } = useApp();
  const [tab, setTab] = useState<ParentTab>('dashboard');
  return (
    <PinGate>
      <div class="screen parent">
        <header class="topbar">
          <button type="button" class="btn btn--ghost" onClick={() => go({ name: 'home' })}>← Done</button>
          <nav class="tabs">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" class={`tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </nav>
        </header>
        <main class="parent__body">
          {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
          {tab === 'rewards' && <RewardsPanel />}
          {tab === 'credits' && <Credits />}
        </main>
      </div>
    </PinGate>
  );
}
```

`src/parent/MinutesChart.tsx`:
```tsx
export function MinutesChart({ data }: { data: { date: string; minutes: number }[] }) {
  const max = Math.max(10, ...data.map((d) => d.minutes));
  return (
    <figure class="chart">
      <figcaption>Minutes practised, last {data.length} days</figcaption>
      <div class="chart__plot">
        <span class="chart__max">{max} min</span>
        <div class="chart__bars">
          {data.map((d) => (
            <div key={d.date} class="chart__col" role="img" aria-label={`${d.date}: ${d.minutes} minutes`} data-tip={`${d.date}: ${d.minutes} min`}>
              <div class="chart__bar" style={{ height: `${(d.minutes / max) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div class="chart__axis" aria-hidden="true">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data.at(-1)?.date.slice(5)}</span>
      </div>
      <details>
        <summary>Show as table</summary>
        <table class="table">
          <thead><tr><th>Date</th><th>Minutes</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.minutes}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
```

`src/parent/Dashboard.tsx`:
```tsx
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge, type Knowledge } from '../app/knowledge';
import { addDays, localDateKey } from '../lib/date';
import { dueTomorrow, minutesPerDay, streak, troubleWords, weeklyAccuracy } from '../stats/stats';
import { allSessions, countRecordings, logsSince } from '../store/repo';
import type { ReviewLog, SessionRecord } from '../types';
import { MinutesChart } from './MinutesChart';
import type { ParentTab } from './ParentArea';

const KEEP_RECORDINGS = 100;
const BACKUP_NUDGE_DAYS = 14;

interface Data {
  know: Knowledge;
  sessions: SessionRecord[];
  logs: ReviewLog[];
  recordings: number;
  micDenied: boolean;
}

export function Dashboard({ onNavigate }: { onNavigate: (tab: ParentTab) => void }) {
  const { db, now, settings, voice } = useApp();
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    void (async () => {
      const t = now();
      const [know, sessions, logs, recordings] = await Promise.all([
        loadKnowledge(db), allSessions(db), logsSince(db, addDays(t, -42).getTime()), countRecordings(db),
      ]);
      let micDenied = false;
      try {
        micDenied = (await navigator.permissions?.query({ name: 'microphone' as PermissionName }))?.state === 'denied';
      } catch {
        micDenied = false; // Safari versions without the microphone permission query
      }
      setD({ know, sessions, logs, recordings, micDenied });
    })();
  }, []);

  if (!d) return <p>Loading…</p>;

  const t = now();
  const today = localDateKey(t);
  const trouble = troubleWords(d.logs.filter((l) => l.at >= addDays(t, -30).getTime()));
  const backupDue = settings.lastBackupAt === null || t.getTime() - settings.lastBackupAt > BACKUP_NUDGE_DAYS * 86_400_000;
  const pct = (n: number, target: number) => `${Math.min(100, Math.round((n / target) * 100))}%`;

  return (
    <>
      {!voice && (
        <p class="warning">
          <strong>No Chinese voice found.</strong> Listening cards are off. On the iPad: Settings → Accessibility → Spoken Content →
          Voices → Chinese (China mainland), download a voice, then reopen the app.
        </p>
      )}
      {d.micDenied && (
        <p class="warning">
          <strong>Microphone is blocked.</strong> Speaking practice is skipped. On the iPad: Settings → Safari → Microphone → Ask or
          Allow, then reopen the app.
        </p>
      )}
      {backupDue && (
        <p class="warning">
          Last backup: {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleDateString() : 'never'}.{' '}
          <button type="button" class="small-btn" onClick={() => onNavigate('backup')}>Back up now</button>
        </p>
      )}
      {d.recordings > KEEP_RECORDINGS && (
        <p class="warning">
          There are {d.recordings} recordings.{' '}
          <button type="button" class="small-btn" onClick={() => onNavigate('recordings')}>Tidy up</button>
        </p>
      )}
      <div class="tiles">
        <div class="tile"><span class="tile__value">{streak(d.sessions, today)} 🔥</span><span class="tile__label">Day streak</span></div>
        <div class="tile">
          <span class="tile__value">{d.know.known} / {settings.targetRecognise}</span>
          <span class="tile__label">Characters recognised</span>
          <div class="progress"><div class="progress__fill" style={{ width: pct(d.know.known, settings.targetRecognise) }} /></div>
        </div>
        <div class="tile">
          <span class="tile__value">{d.know.written} / {settings.targetWrite}</span>
          <span class="tile__label">Characters written</span>
          <div class="progress"><div class="progress__fill" style={{ width: pct(d.know.written, settings.targetWrite) }} /></div>
        </div>
        <div class="tile"><span class="tile__value">{dueTomorrow(d.know.cards, d.know.words, t)}</span><span class="tile__label">Cards due tomorrow</span></div>
      </div>
      <section class="panel"><MinutesChart data={minutesPerDay(d.sessions, today)} /></section>
      <section class="panel">
        <h2>Weekly accuracy</h2>
        <table class="table">
          <thead><tr><th>Week starting</th><th>Correct</th></tr></thead>
          <tbody>
            {weeklyAccuracy(d.logs, t).map((w) => (
              <tr key={w.weekStart}><td>{w.weekStart}</td><td>{w.accuracy === null ? '—' : `${Math.round(w.accuracy * 100)}%`}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section class="panel">
        <h2>Trouble words (last 30 days)</h2>
        {trouble.length === 0 ? (
          <p>None yet. 🎉</p>
        ) : (
          <table class="table">
            <thead><tr><th>Word</th><th>Pinyin</th><th>Times missed</th></tr></thead>
            <tbody>
              {trouble.map((tw) => {
                const w = d.know.wordsById.get(tw.wordId);
                return (
                  <tr key={tw.wordId}>
                    <td class="hanzi" style={{ fontSize: '24px' }}>{w?.text ?? '?'}</td>
                    <td>{w?.pinyin}</td>
                    <td>{tw.misses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
```

`src/parent/RewardsPanel.tsx`:
```tsx
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge } from '../app/knowledge';
import { goalProgress } from '../fun/rewards';
import { totalStars } from '../stats/stats';
import { allSessions, deleteReward, getKid, listRewards, saveReward } from '../store/repo';
import type { RewardGoal } from '../types';

const EMOJIS = ['🍦', '🧸', '🎮', '📚', '🏊', '🍕', '🎬', '🧩', '🎨', '⚽'];

export function RewardsPanel() {
  const { db, now } = useApp();
  const [goals, setGoals] = useState<RewardGoal[]>([]);
  const [stats, setStats] = useState({ stars: 0, known: 0 });
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]!);
  const [metric, setMetric] = useState<RewardGoal['metric']>('stars');
  const [target, setTarget] = useState('100');

  const load = async () => {
    const [g, sessions, know, kid] = await Promise.all([listRewards(db), allSessions(db), loadKnowledge(db), getKid(db)]);
    setGoals(g);
    setStats({ stars: totalStars(sessions, kid?.bonusStars ?? 0), known: know.known });
  };
  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    const n = Math.round(Number(target));
    if (!title.trim() || !(n >= 1)) return;
    await saveReward(db, { id: crypto.randomUUID(), title: title.trim(), emoji, metric, target: n, createdAt: now().getTime(), claimedAt: null });
    setTitle('');
    await load();
  };
  const claim = async (g: RewardGoal) => {
    await saveReward(db, { ...g, claimedAt: now().getTime() });
    await load();
  };
  const remove = async (g: RewardGoal) => {
    if (!confirm(`Delete the goal "${g.title}"?`)) return;
    await deleteReward(db, g.id);
    await load();
  };

  return (
    <>
      <section class="panel">
        <h2>Add a reward goal</h2>
        <p>Your child sees the next unclaimed goal on the home screen with a progress bar. Stars are never spent — goals are milestones.</p>
        <div class="field">
          <label for="rw-title">Reward</label>
          <input id="rw-title" value={title} placeholder="e.g. Ice cream outing" onInput={(e) => setTitle(e.currentTarget.value)} />
        </div>
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          {EMOJIS.map((e) => (
            <button key={e} type="button" class={`swatch ${e === emoji ? 'is-on' : ''}`} style={{ width: '56px', height: '56px', fontSize: '30px' }} aria-label={e} onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          <div class="field">
            <label for="rw-metric">Measure</label>
            <select id="rw-metric" value={metric} onChange={(e) => setMetric(e.currentTarget.value as RewardGoal['metric'])}>
              <option value="stars">Stars ⭐ (now {stats.stars})</option>
              <option value="known">Characters known (now {stats.known})</option>
            </select>
          </div>
          <div class="field">
            <label for="rw-target">Target</label>
            <input id="rw-target" inputMode="numeric" value={target} onInput={(e) => setTarget(e.currentTarget.value)} />
          </div>
        </div>
        <button type="button" class="btn btn--primary" onClick={() => void add()}>Add goal</button>
      </section>
      <section class="panel">
        <h2>Goals</h2>
        {goals.length === 0 ? (
          <p>No goals yet.</p>
        ) : (
          <table class="table">
            <tbody>
              {goals.map((g) => {
                const p = goalProgress(g, stats);
                return (
                  <tr key={g.id}>
                    <td style={{ fontSize: '28px' }}>{g.emoji}</td>
                    <td>{g.title}</td>
                    <td>{p.value} / {g.target} {g.metric === 'stars' ? '⭐' : 'characters'}</td>
                    <td>
                      {g.claimedAt ? `Given ${new Date(g.claimedAt).toLocaleDateString()}`
                        : p.reached ? <button type="button" class="small-btn" onClick={() => void claim(g)}>Mark as given</button>
                        : 'In progress'}
                    </td>
                    <td><button type="button" class="small-btn" onClick={() => void remove(g)}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
```

`src/parent/Credits.tsx`:
```tsx
export function Credits() {
  return (
    <section class="panel">
      <h2>Credits</h2>
      <ul>
        <li>HSK 3.0 character and word lists — elkmovie/hsk30, MIT License, © 2021 Pleco Inc.</li>
        <li>Make Me a Hanzi dictionary (meanings, radicals, components) — GNU LGPL v3 or later.</li>
        <li>Hanzi Writer — MIT License. Stroke data (hanzi-writer-data) — Arphic Public License.</li>
        <li>pinyin-pro, ts-fsrs, Preact — MIT License. idb, canvas-confetti — ISC License.</li>
        <li>Read-aloud passages were written for this app.</li>
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/parent && npx tsc --noEmit`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: parent area — PIN gate with reset, dashboard with minutes chart, reward goals, credits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 26: Parent area, part 2 (words, recordings, pictures, settings, backup)

**Files:**
- Create: `src/parent/WordsPanel.tsx`, `src/parent/RecordingsPanel.tsx`, `src/parent/PicturesPanel.tsx`, `src/parent/SettingsPanel.tsx`, `src/parent/BackupPanel.tsx`
- Modify: `src/parent/ParentArea.tsx`, replacing `TABS`, the imports and the `<main>` body as shown in Step 4
- Test: `src/parent/parentB.test.tsx`

**Interfaces:**
- Consumes:
  - `parseWordList`, `makeParentWords` (Task 7), `strokeAvailability` (Task 7), `hanChars` (Task 4)
  - Repo (Task 6), backup (Task 15), `saveTextFile` (Task 16), `setSpeechRate`, `speak`, `setSfxEnabled` (Task 16)
  - `SetupPin` (Task 23), `isKnown` (Task 5), `PASSAGES` (Task 4)
- Produces: the five panels and all eight parent tabs.

- [ ] **Step 1: Write the failing test** in `src/parent/parentB.test.tsx`

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { allWords, getSettings, putWords } from '../store/repo';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { BackupPanel } from './BackupPanel';
import { SettingsPanel } from './SettingsPanel';
import { WordsPanel } from './WordsPanel';

vi.mock('../content/strokes', () => ({ strokeAvailability: vi.fn(async () => 'yes') }));
vi.mock('../lib/files', () => ({ saveTextFile: vi.fn(async () => {}) }));
vi.mock('../audio/speech', () => ({ speak: vi.fn(), setSpeechRate: vi.fn() }));
vi.mock('../audio/sfx', () => ({ setSfxEnabled: vi.fn() }));

import { saveTextFile } from '../lib/files';

describe('WordsPanel', () => {
  it('previews a pasted list, adds it, and pulls matching built-in words forward', async () => {
    const app = await makeAppData();
    await putWords(app.db, [makeWord('大', { rank: 3 })]);
    renderWithApp(<WordsPanel />, app);
    fireEvent.input(await screen.findByLabelText('List name'), { target: { value: '听写 7' } });
    fireEvent.input(screen.getByLabelText('Words'), { target: { value: '朋友\n大\nhello' } });
    fireEvent.click(screen.getByText('Preview'));
    expect(screen.getByText(/Skipped \(not 1–4 Chinese characters\): hello/)).toBeTruthy();
    fireEvent.click(screen.getByText('Add 2 words'));
    expect(await screen.findByText('Added 1 new word; moved 1 built-in to the front of the queue.')).toBeTruthy();
    const words = await allWords(app.db);
    expect(words.find((w) => w.text === '朋友')).toMatchObject({ source: 'parent', listName: '听写 7', writeable: true });
    expect(words.find((w) => w.text === '大')?.listName).toBe('听写 7');
  });
});

describe('SettingsPanel', () => {
  it('saves settings within sensible limits', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    fireEvent.change(screen.getByLabelText('New words per day (0–10)'), { target: { value: '15' } });
    await waitFor(async () => expect((await getSettings(app.db)).newPerDay).toBe(10));
    fireEvent.click(screen.getByLabelText('Speaking recordings'));
    await waitFor(async () => expect((await getSettings(app.db)).activities.speaking).toBe(false));
  });
});

describe('BackupPanel', () => {
  it('saves a backup file and records when it happened', async () => {
    const app = await makeAppData();
    renderWithApp(<BackupPanel />, app);
    fireEvent.click(screen.getByText('Save backup file'));
    expect(await screen.findByText('Backup saved.')).toBeTruthy();
    expect(saveTextFile).toHaveBeenCalledWith('hanzi-buddy-backup-2026-10-02.json', expect.stringContaining('hanzi-buddy-backup'));
    expect((await getSettings(app.db)).lastBackupAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/parent/parentB.test.tsx`
Expected: FAIL, because the panels are missing.

- [ ] **Step 3: Implement the panels**

`src/parent/WordsPanel.tsx`:
```tsx
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge, type Knowledge } from '../app/knowledge';
import { hanChars } from '../content';
import { makeParentWords, parseWordList, type ParseResult } from '../content/parseWordList';
import { strokeAvailability } from '../content/strokes';
import { localDateKey } from '../lib/date';
import { isKnown } from '../srs/scheduler';
import { deleteWord, putWords } from '../store/repo';
import type { Word } from '../types';

type Filter = 'lists' | 'level1' | 'level2' | 'level3' | 'paused';
const MAX_ROWS = 200;

export function WordsPanel() {
  const { db, now } = useApp();
  const [know, setKnow] = useState<Knowledge | null>(null);
  const [text, setText] = useState('');
  const [listName, setListName] = useState('');
  const [writeable, setWriteable] = useState(true);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('lists');
  const [query, setQuery] = useState('');

  const reload = async () => setKnow(await loadKnowledge(db));
  useEffect(() => {
    void reload();
  }, []);

  const add = async () => {
    if (!preview || !know) return;
    const { added, promoted, duplicates } = makeParentWords(preview.words, {
      listName: listName.trim() || `List ${localDateKey(now())}`,
      writeable,
      existing: know.words,
      now: now().getTime(),
    });
    const recogniseOnly: string[] = [];
    for (const w of added) {
      if (!w.writeable) continue;
      const results = await Promise.all(hanChars(w.text).map((c) => strokeAvailability(c)));
      if (results.includes('no')) {
        w.writeable = false;
        recogniseOnly.push(w.text);
      }
    }
    await putWords(db, [...added, ...promoted]);
    const parts = [`Added ${added.length} new word${added.length === 1 ? '' : 's'}`];
    if (promoted.length) parts.push(`moved ${promoted.length} built-in to the front of the queue`);
    if (duplicates.length) parts.push(`skipped ${duplicates.length} already on a list (${duplicates.join('、')})`);
    if (recogniseOnly.length) parts.push(`${recogniseOnly.join('、')} set to recognise-only (no stroke data)`);
    setMessage(`${parts.join('; ')}.`);
    setText('');
    setPreview(null);
    await reload();
  };

  const update = async (w: Word, patch: Partial<Word>) => {
    await putWords(db, [{ ...w, ...patch }]);
    await reload();
  };
  const remove = async (w: Word) => {
    if (!confirm(`Delete ${w.text}? Its progress is removed too.`)) return;
    await deleteWord(db, w.id);
    await reload();
  };
  const status = (w: Word) => {
    const c = know?.cardsById.get(`${w.id}:recognise`);
    return !c ? 'New' : isKnown(c.fsrs) ? 'Known' : 'Learning';
  };

  const shown = (know?.words ?? [])
    .filter((w) => {
      if (filter === 'lists' && w.listName === undefined) return false;
      if (filter === 'paused' && !w.paused) return false;
      if (filter.startsWith('level') && w.level !== Number(filter.slice(5))) return false;
      return !query || w.text.includes(query) || w.pinyin.includes(query);
    })
    .sort((a, b) => (a.listedAt ?? 0) - (b.listedAt ?? 0) || (a.rank ?? 0) - (b.rank ?? 0));

  return (
    <>
      <section class="panel">
        <h2>Add a school word list (听写)</h2>
        <p>Paste one word per line. These words come before built-in ones in your child's new-word queue.</p>
        <div class="field">
          <label for="wl-name">List name</label>
          <input id="wl-name" value={listName} placeholder="e.g. 听写 7" onInput={(e) => setListName(e.currentTarget.value)} />
        </div>
        <div class="field">
          <label for="wl-text">Words</label>
          <textarea id="wl-text" rows={6} value={text} onInput={(e) => setText(e.currentTarget.value)} />
        </div>
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          <label><input type="radio" name="wl-mode" checked={!writeable} onChange={() => setWriteable(false)} /> Recognise only</label>
          <label><input type="radio" name="wl-mode" checked={writeable} onChange={() => setWriteable(true)} /> Recognise + write</label>
        </div>
        <button type="button" class="btn" disabled={!text.trim()} onClick={() => setPreview(parseWordList(text))}>Preview</button>
        {preview && (
          <>
            {preview.rejected.length > 0 && <p class="warning">Skipped (not 1–4 Chinese characters): {preview.rejected.join(', ')}</p>}
            <table class="table">
              <thead><tr><th>Word</th><th>Pinyin (edit if needed)</th></tr></thead>
              <tbody>
                {preview.words.map((w, i) => (
                  <tr key={w.text}>
                    <td class="hanzi" style={{ fontSize: '24px' }}>{w.text}</td>
                    <td>
                      <input
                        aria-label={`Pinyin for ${w.text}`}
                        value={w.pinyin}
                        onInput={(e) => {
                          const words = [...preview.words];
                          words[i] = { ...w, pinyin: e.currentTarget.value };
                          setPreview({ ...preview, words });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" class="btn btn--primary" disabled={!preview.words.length} onClick={() => void add()}>
              Add {preview.words.length} words
            </button>
          </>
        )}
        {message && <p role="status">{message}</p>}
      </section>

      <section class="panel">
        <h2>All words</h2>
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          <div class="field">
            <label for="wl-filter">Show</label>
            <select id="wl-filter" value={filter} onChange={(e) => setFilter(e.currentTarget.value as Filter)}>
              <option value="lists">From your lists</option>
              <option value="level1">Built-in level 1</option>
              <option value="level2">Built-in level 2</option>
              <option value="level3">Built-in level 3</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div class="field">
            <label for="wl-q">Search</label>
            <input id="wl-q" value={query} onInput={(e) => setQuery(e.currentTarget.value)} />
          </div>
        </div>
        <table class="table">
          <thead><tr><th>Word</th><th>Pinyin</th><th>List</th><th>Status</th><th>Write</th><th>Paused</th><th /></tr></thead>
          <tbody>
            {shown.slice(0, MAX_ROWS).map((w) => (
              <tr key={w.id}>
                <td class="hanzi" style={{ fontSize: '24px' }}>{w.text}</td>
                <td>
                  {w.source === 'parent'
                    ? <input aria-label={`Pinyin for ${w.text}`} value={w.pinyin} onChange={(e) => void update(w, { pinyin: e.currentTarget.value })} />
                    : w.pinyin}
                </td>
                <td>{w.listName ?? `Level ${w.level}`}</td>
                <td>{status(w)}</td>
                <td><input type="checkbox" aria-label={`Write ${w.text}`} checked={w.writeable} onChange={(e) => void update(w, { writeable: e.currentTarget.checked })} /></td>
                <td><input type="checkbox" aria-label={`Pause ${w.text}`} checked={w.paused} onChange={(e) => void update(w, { paused: e.currentTarget.checked })} /></td>
                <td>{w.source === 'parent' && <button type="button" class="small-btn" onClick={() => void remove(w)}>Delete</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length > MAX_ROWS && <p>Showing the first {MAX_ROWS} of {shown.length}. Use search to narrow down.</p>}
      </section>
    </>
  );
}
```

`src/parent/RecordingsPanel.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { PASSAGES } from '../content';
import { deleteRecording, listRecordings } from '../store/repo';
import type { Recording } from '../types';

const KEEP = 100;

const describe = (r: Recording) =>
  r.prompt.kind === 'passage' ? `📖 ${PASSAGES.find((p) => p.id === r.prompt.passageId)?.title ?? 'Passage'}` : '📷 Picture talk';

export function RecordingsPanel() {
  const { db } = useApp();
  const [recs, setRecs] = useState<Recording[]>([]);
  const reload = async () => setRecs(await listRecordings(db));
  useEffect(() => {
    void reload();
  }, []);
  const urls = useMemo(() => recs.map((r) => URL.createObjectURL(r.blob)), [recs]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const remove = async (r: Recording) => {
    if (!confirm('Delete this recording?')) return;
    await deleteRecording(db, r.id);
    await reload();
  };
  const pruneOld = async () => {
    const old = recs.slice(KEEP);
    if (!confirm(`Delete the ${old.length} oldest recordings?`)) return;
    for (const r of old) await deleteRecording(db, r.id);
    await reload();
  };

  return (
    <section class="panel">
      <h2>Recordings</h2>
      {recs.length > KEEP && (
        <p class="warning">
          {recs.length} recordings saved.{' '}
          <button type="button" class="small-btn" onClick={() => void pruneOld()}>Delete the oldest {recs.length - KEEP}</button>
        </p>
      )}
      {recs.length === 0 ? (
        <p>No recordings yet. They appear here after the speaking step.</p>
      ) : (
        <table class="table">
          <tbody>
            {recs.map((r, i) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{describe(r)}</td>
                <td>{r.durationSec}s</td>
                <td><audio controls preload="none" src={urls[i]} /></td>
                <td><button type="button" class="small-btn" onClick={() => void remove(r)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
```

`src/parent/PicturesPanel.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { addPrompt, deletePrompt, listPrompts } from '../store/repo';
import type { PicturePrompt } from '../types';

export function PicturesPanel() {
  const { db, now } = useApp();
  const [items, setItems] = useState<PicturePrompt[]>([]);
  const reload = async () => setItems(await listPrompts(db));
  useEffect(() => {
    void reload();
  }, []);
  const urls = useMemo(() => items.map((p) => URL.createObjectURL(p.blob)), [items]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const add = async (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      await addPrompt(db, { id: crypto.randomUUID(), createdAt: now().getTime(), blob: file, mime: file.type });
    }
    await reload();
  };
  const remove = async (p: PicturePrompt) => {
    if (!confirm('Delete this picture?')) return;
    await deletePrompt(db, p.id);
    await reload();
  };

  return (
    <section class="panel">
      <h2>Pictures for 看图说话</h2>
      <p>Add photos, e.g. picture-composition pages from assessment books. The speaking step alternates between these and read-aloud passages.</p>
      <div class="field">
        <label for="pic-add">Add pictures</label>
        <input id="pic-add" type="file" accept="image/*" multiple onChange={(e) => void add(e.currentTarget.files)} />
      </div>
      <div class="thumbs">
        {items.map((p, i) => (
          <figure key={p.id} style={{ margin: 0 }}>
            <img src={urls[i]} alt="" />
            <button type="button" class="small-btn" onClick={() => void remove(p)}>Delete</button>
          </figure>
        ))}
      </div>
    </section>
  );
}
```

`src/parent/SettingsPanel.tsx`:
```tsx
import { useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { SetupPin } from '../app/SetupPin';
import { setSfxEnabled } from '../audio/sfx';
import { setSpeechRate, speak } from '../audio/speech';
import { updateSettings } from '../store/repo';
import type { Settings, StepKind } from '../types';

const ACTIVITY_LABELS: Record<StepKind, string> = {
  flashcards: 'Flashcards (feed the dragon)',
  writing: '听写 writing',
  components: 'Components game (fishing)',
  speaking: 'Speaking recordings',
};

const clampInt = (value: string, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function SettingsPanel() {
  const { db, settings, refresh, go } = useApp();
  const [s, setS] = useState(settings);
  const [changingPin, setChangingPin] = useState(false);

  const save = async (patch: Partial<Settings>) => {
    const next = await updateSettings(db, patch);
    setS(next);
    setSpeechRate(next.speechRate);
    setSfxEnabled(next.soundEffects);
    await refresh();
  };

  if (changingPin) return <SetupPin onDone={() => setChangingPin(false)} />;

  return (
    <section class="panel">
      <h2>Settings</h2>
      <div class="field">
        <label for="st-min">Session length in minutes (10–40)</label>
        <input id="st-min" type="number" min={10} max={40} step={5} value={s.sessionMinutes}
          onChange={(e) => void save({ sessionMinutes: clampInt(e.currentTarget.value, 10, 40, s.sessionMinutes) })} />
      </div>
      <div class="field">
        <label for="st-new">New words per day (0–10)</label>
        <input id="st-new" type="number" min={0} max={10} value={s.newPerDay}
          onChange={(e) => void save({ newPerDay: clampInt(e.currentTarget.value, 0, 10, s.newPerDay) })} />
      </div>
      <fieldset class="field">
        <legend>Activities</legend>
        {(Object.keys(ACTIVITY_LABELS) as StepKind[]).map((k) => (
          <label key={k}>
            <input type="checkbox" checked={s.activities[k]} onChange={(e) => void save({ activities: { ...s.activities, [k]: e.currentTarget.checked } })} />{' '}
            {ACTIVITY_LABELS[k]}
          </label>
        ))}
      </fieldset>
      <div class="field">
        <label for="st-rate">Speech speed ({s.speechRate.toFixed(2)})</label>
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          <input id="st-rate" type="range" min={0.5} max={1} step={0.05} value={s.speechRate} onChange={(e) => void save({ speechRate: Number(e.currentTarget.value) })} />
          <button type="button" class="small-btn" onClick={() => speak('你好，我们一起学汉字！')}>🔊 Test</button>
        </div>
      </div>
      <label>
        <input type="checkbox" checked={s.soundEffects} onChange={(e) => void save({ soundEffects: e.currentTarget.checked })} /> Sound effects
      </label>
      <div class="row" style={{ justifyContent: 'flex-start' }}>
        <div class="field">
          <label for="st-tr">Target: characters recognised</label>
          <input id="st-tr" type="number" min={1} value={s.targetRecognise} onChange={(e) => void save({ targetRecognise: clampInt(e.currentTarget.value, 1, 5000, s.targetRecognise) })} />
        </div>
        <div class="field">
          <label for="st-tw">Target: characters written</label>
          <input id="st-tw" type="number" min={1} value={s.targetWrite} onChange={(e) => void save({ targetWrite: clampInt(e.currentTarget.value, 1, 5000, s.targetWrite) })} />
        </div>
      </div>
      <div class="row" style={{ justifyContent: 'flex-start' }}>
        <button type="button" class="btn" onClick={() => go({ name: 'placement' })}>Re-run placement check</button>
        <button type="button" class="btn" onClick={() => setChangingPin(true)}>Change PIN</button>
      </div>
    </section>
  );
}
```

`src/parent/BackupPanel.tsx`:
```tsx
import { useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { localDateKey } from '../lib/date';
import { saveTextFile } from '../lib/files';
import { applyBackup, BackupError, exportBackup, readBackup, type BackupPreview } from '../store/backup';
import { updateSettings } from '../store/repo';

export function BackupPanel() {
  const { db, now, refresh } = useApp();
  const [includeMedia, setIncludeMedia] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doExport = async () => {
    try {
      const text = await exportBackup(db, { includeMedia, now: now().getTime() });
      await saveTextFile(`hanzi-buddy-backup-${localDateKey(now())}.json`, text);
      await updateSettings(db, { lastBackupAt: now().getTime() });
      await refresh();
      setStatus('Backup saved.');
    } catch (e) {
      setStatus(e instanceof DOMException && e.name === 'AbortError' ? 'Backup cancelled.' : `Backup failed: ${String(e)}`);
    }
  };
  const pick = async (file: File | undefined) => {
    setError(null);
    setPreview(null);
    if (!file) return;
    try {
      setPreview(readBackup(await file.text()));
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'Could not read that file.');
    }
  };
  const restore = async () => {
    if (!preview) return;
    await applyBackup(db, preview);
    setPreview(null);
    await refresh();
    setStatus('Backup restored.');
  };

  return (
    <>
      <section class="panel">
        <h2>Back up</h2>
        <p>Saves progress, word lists, settings and (optionally) recordings and pictures to one file. On iPad choose "Save to Files" and keep it in iCloud Drive.</p>
        <label>
          <input type="checkbox" checked={includeMedia} onChange={(e) => setIncludeMedia(e.currentTarget.checked)} /> Include recordings and pictures (larger file)
        </label>
        <button type="button" class="btn btn--primary" onClick={() => void doExport()}>Save backup file</button>
        {status && <p role="status">{status}</p>}
      </section>
      <section class="panel">
        <h2>Restore</h2>
        <div class="field">
          <label for="bk-file">Choose a backup file</label>
          <input id="bk-file" type="file" accept="application/json,.json" onChange={(e) => void pick(e.currentTarget.files?.[0])} />
        </div>
        {error && <p class="warning" role="alert">{error}</p>}
        {preview && (
          <div class="warning">
            <p>
              Backup from {new Date(preview.exportedAt).toLocaleString()}: {preview.counts.words} words, {preview.counts.cards} cards,{' '}
              {preview.counts.sessions} sessions, {preview.hasMedia ? `${preview.counts.recordings} recordings` : 'no recordings'}.
            </p>
            <p>Restoring replaces the current data of the same kinds. This cannot be undone.</p>
            <button type="button" class="btn btn--primary" onClick={() => void restore()}>Replace with this backup</button>
          </div>
        )}
      </section>
    </>
  );
}
```

- [ ] **Step 4: Extend `src/parent/ParentArea.tsx`** to all eight tabs. Replace the import block, `TABS` and the `<main>` body with:

```tsx
import { useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { BackupPanel } from './BackupPanel';
import { Credits } from './Credits';
import { Dashboard } from './Dashboard';
import { PicturesPanel } from './PicturesPanel';
import { PinGate } from './PinGate';
import { RecordingsPanel } from './RecordingsPanel';
import { RewardsPanel } from './RewardsPanel';
import { SettingsPanel } from './SettingsPanel';
import { WordsPanel } from './WordsPanel';

export type ParentTab = 'dashboard' | 'words' | 'recordings' | 'pictures' | 'rewards' | 'settings' | 'backup' | 'credits';

const TABS: [ParentTab, string][] = [
  ['dashboard', 'Overview'],
  ['words', 'Words'],
  ['recordings', 'Recordings'],
  ['pictures', 'Pictures'],
  ['rewards', 'Rewards'],
  ['settings', 'Settings'],
  ['backup', 'Backup'],
  ['credits', 'Credits'],
];
```
and inside `<main class="parent__body">`:
```tsx
          {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
          {tab === 'words' && <WordsPanel />}
          {tab === 'recordings' && <RecordingsPanel />}
          {tab === 'pictures' && <PicturesPanel />}
          {tab === 'rewards' && <RewardsPanel />}
          {tab === 'settings' && <SettingsPanel />}
          {tab === 'backup' && <BackupPanel />}
          {tab === 'credits' && <Credits />}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/parent && npx tsc --noEmit`
Expected: all parent tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: parent area — word lists, recordings, pictures, settings, backup/restore

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 27: App shell, bootstrap and first-launch flow

**Files:**
- Create: `src/bootstrap.ts`, `src/app/ErrorScreen.tsx`
- Modify: `src/App.tsx` (replace it entirely), `src/main.tsx` (unchanged in this task)
- Test: `src/App.test.tsx` (replace it entirely)

**Interfaces:**
- Consumes: every screen (Tasks 22–26), `openAppDb` and repo (Task 6), `builtinWords` (Task 4), `loadChineseVoice`, `setSpeechRate`, `setSfxEnabled` (Task 16), `exportRawBackup` (Task 15), `saveTextFile` (Task 16).
- Produces:
  - `bootstrap(dbName): Promise<Booted>`, which opens the DB, seeds built-in words, loads settings, kid and voice, applies the audio settings, and requests persistent storage
  - `firstRoute(booted): Route`
  - `<App dbName? now? />`

- [ ] **Step 1: Replace `src/App.test.tsx` with the failing flow test**

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./audio/speech', () => ({
  loadChineseVoice: vi.fn(async () => null),
  setSpeechRate: vi.fn(),
  speak: vi.fn(),
  primeSpeech: vi.fn(),
}));
vi.mock('./audio/sfx', () => ({ setSfxEnabled: vi.fn(), playSfx: vi.fn() }));
vi.mock('./ui/confetti', () => ({ celebrate: vi.fn() }));

const type = (pin: string) => [...pin].forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));

describe('App', () => {
  it('walks a first launch from PIN to pet to placement to home', async () => {
    render(<App dbName={`test-${crypto.randomUUID()}`} now={() => new Date(2026, 9, 2, 9)} />);
    await screen.findByText('For parents: choose a 4-digit PIN');
    type('1234');
    await screen.findByText('Enter the same PIN again');
    type('1234');
    fireEvent.click(await screen.findByText('好了！'));
    fireEvent.click(await screen.findByText('不认识'));
    fireEvent.click(await screen.findByText('开始！'));
    expect(await screen.findByText('今天的练习')).toBeTruthy();
    expect(screen.getByText('我认识 0 个字')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL. The placeholder `App` renders only the title.

- [ ] **Step 3: Implement**

`src/bootstrap.ts`:
```ts
import type { Route } from './app/AppContext';
import { setSfxEnabled } from './audio/sfx';
import { loadChineseVoice, setSpeechRate } from './audio/speech';
import { builtinWords } from './content';
import { openAppDb, type AppDb } from './store/db';
import { getKid, getSettings, seedBuiltinWords } from './store/repo';
import type { KidState, Settings } from './types';

export interface Booted {
  db: AppDb;
  settings: Settings;
  kid: KidState | null;
  voice: boolean;
}

export async function bootstrap(dbName: string): Promise<Booted> {
  const db = await openAppDb(dbName);
  await seedBuiltinWords(db, builtinWords(Date.now()));
  const [settings, kid, voice] = await Promise.all([getSettings(db), getKid(db), loadChineseVoice()]);
  setSpeechRate(settings.speechRate);
  setSfxEnabled(settings.soundEffects);
  // Ask Safari not to evict our data (home-screen apps are also exempt from its 7-day cleanup).
  void navigator.storage?.persist?.().catch(() => false);
  return { db, settings, kid, voice: voice !== null };
}

export function firstRoute(b: Pick<Booted, 'settings' | 'kid'>): Route {
  if (!b.settings.pinHash) return { name: 'setupPin' };
  if (!b.kid) return { name: 'petSetup' };
  if (!b.settings.placementDone) return { name: 'placement' };
  return { name: 'home' };
}
```

`src/app/ErrorScreen.tsx`:
```tsx
import { useState } from 'preact/hooks';
import { saveTextFile } from '../lib/files';
import { exportRawBackup } from '../store/backup';

export function ErrorScreen({ message, dbName }: { message: string; dbName: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const save = async () => {
    try {
      await saveTextFile('hanzi-buddy-emergency-copy.json', await exportRawBackup(dbName));
      setStatus('Saved.');
    } catch (e) {
      setStatus(`Could not save: ${String(e)}`);
    }
  };
  return (
    <div class="screen parent">
      <div class="center">
        <div style={{ fontSize: '80px' }}>🥚💤</div>
        <h1>Something went wrong opening the app</h1>
        <p>Your child's progress has not been deleted. Please don't remove the app. Save an emergency copy of the data, then try reopening.</p>
        <p><small>{message}</small></p>
        <button type="button" class="btn btn--primary" onClick={() => void save()}>Save emergency copy</button>
        {status && <p>{status}</p>}
      </div>
    </div>
  );
}
```

`src/App.tsx`:
```tsx
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AppContext, type AppData, type Route } from './app/AppContext';
import { ErrorScreen } from './app/ErrorScreen';
import { HomeScreen } from './app/HomeScreen';
import { PetSetup } from './app/PetSetup';
import { PlacementScreen } from './app/PlacementScreen';
import { SessionScreen } from './app/SessionScreen';
import { SetupPin } from './app/SetupPin';
import { StickerBook } from './app/StickerBook';
import { Wardrobe } from './app/Wardrobe';
import { bootstrap, firstRoute, type Booted } from './bootstrap';
import { ParentArea } from './parent/ParentArea';
import { DB_NAME } from './store/db';
import { getKid, getSettings } from './store/repo';

export function App({ dbName = DB_NAME, now = () => new Date() }: { dbName?: string; now?: () => Date }) {
  const [booted, setBooted] = useState<Booted | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'home' });

  useEffect(() => {
    bootstrap(dbName).then(
      (b) => {
        setBooted(b);
        setRoute(firstRoute(b));
      },
      (e) => setError(String(e)),
    );
  }, [dbName]);

  const db = booted?.db;
  const refresh = useCallback(async () => {
    if (!db) return;
    const [settings, kid] = await Promise.all([getSettings(db), getKid(db)]);
    setBooted((b) => (b ? { ...b, settings, kid } : b));
  }, [db]);

  if (error) return <ErrorScreen message={error} dbName={dbName} />;
  if (!booted) return <div class="screen loading">🥚</div>;

  const app: AppData = { ...booted, now, go: setRoute, refresh };
  return (
    <AppContext.Provider value={app}>
      <Screen route={route} />
    </AppContext.Provider>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'setupPin':
      return <SetupPin />;
    case 'petSetup':
      return <PetSetup />;
    case 'placement':
      return <PlacementScreen />;
    case 'session':
      return <SessionScreen key={String(route.free)} free={route.free} />;
    case 'parent':
      return <ParentArea />;
    case 'stickers':
      return <StickerBook />;
    case 'wardrobe':
      return <Wardrobe />;
    case 'home':
      return <HomeScreen />;
  }
}
```

- [ ] **Step 4: Run the whole suite, the type check and the build**

Run: `npm test && npm run build`
Expected: every test passes, `tsc` is clean, and `vite build` succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: app shell with bootstrap, routing and emergency error screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 28: Installable offline app (PWA, icons, stroke prefetch)

**Files:**
- Create: `public/icon.svg`, plus icons generated into `public/`
- Modify: `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx` (add one effect), `tsconfig.json` (add a types entry), `package.json` (one dev dependency)

**Interfaces:**
- Consumes: `prefetchStrokes` (Task 7), `hanChars` (Task 4), `allWords` (Task 6).
- Produces:
  - A service worker that precaches the app and caches stroke data CacheFirst for a year.
  - A web manifest with a standalone display.
  - Apple touch and PWA icons.
  - Stroke data for every active word, fetched in the background when online.

- [ ] **Step 1: Add the icon generator and the icon source**

Run: `npm install -D @vite-pwa/assets-generator@^1`

`public/icon.svg` (a 田字格 grid with a simple character drawn in strokes; shapes only, so it rasterises without fonts):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#ff9f43"/>
  <rect x="96" y="96" width="320" height="320" rx="24" fill="#fff8ec" stroke="#c0392b" stroke-width="16"/>
  <path d="M256 112v288M112 256h288" stroke="#e17055" stroke-width="8" stroke-dasharray="20 16"/>
  <path d="M176 196h160M256 150v220M180 352l76-92 76 92" fill="none" stroke="#2d3436" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Run: `npx pwa-assets-generator --preset minimal-2023 public/icon.svg`
Expected: it writes `favicon.ico`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` and `apple-touch-icon-180x180.png` into `public/`.

- [ ] **Step 2: Configure the PWA.** Replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '汉字小伙伴 Hanzi Buddy',
        short_name: '汉字小伙伴',
        description: 'Daily Chinese character practice with a pet dragon',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'any',
        background_color: '#fff8ec',
        theme_color: '#ff9f43',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/hanzi-writer-data@/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stroke-data',
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

In `tsconfig.json`, change `"types"` to `["vite/client", "node", "vite-plugin-pwa/client"]`.

In `index.html`, add these lines inside `<head>`, after the `apple-mobile-web-app-title` meta:
```html
    <meta name="theme-color" content="#ff9f43" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

Replace `src/main.tsx` with:
```tsx
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './styles.css';

registerSW({ immediate: true });
render(<App />, document.getElementById('app')!);
```

- [ ] **Step 3: Prefetch stroke data.** In `src/App.tsx`, add these imports:
```tsx
import { hanChars } from './content';
import { prefetchStrokes } from './content/strokes';
import { allWords } from './store/repo';
```
(merge `allWords` into the existing `./store/repo` import). Then add this effect directly after the `refresh` `useCallback`, before any `return`:
```tsx
  // Warm the stroke-data cache so 听写 works offline later.
  useEffect(() => {
    if (!db || import.meta.env.MODE === 'test' || !navigator.onLine) return;
    void allWords(db).then((ws) => prefetchStrokes(ws.filter((w) => !w.paused).flatMap((w) => hanChars(w.text))));
  }, [db]);
```

- [ ] **Step 4: Build and inspect the output**

Run: `npm test && npm run build && ls dist && grep -c "hanzi-writer-data" dist/sw.js && cat dist/manifest.webmanifest`
Expected:
- all tests pass
- `dist/` contains `sw.js`, `manifest.webmanifest`, `workbox-*.js` and the icons
- the grep prints at least `1`
- the manifest shows `"display":"standalone"` and `"short_name":"汉字小伙伴"`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: installable offline PWA with icons and stroke-data caching

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 29: Deployment workflow and README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: the `npm test` and `npm run build` scripts, and the `BASE_PATH` environment variable (Task 28).
- Produces:
  - A GitHub Actions workflow that tests, builds with `BASE_PATH=/hanzi-buddy/` and deploys to GitHub Pages.
  - Parent-facing README: install, iPad checklist, troubleshooting.

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          BASE_PATH: /hanzi-buddy/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write `README.md`**

````markdown
# 汉字小伙伴 Hanzi Buddy

A home-screen iPad app for daily Chinese character practice (P2 → P3), used by the child alone:
spaced-repetition flashcards ("feed the dragon"), 听写 writing, a components fishing game, and speaking recordings,
with a pet dragon that grows as more characters are learned. Parents use the 🔒 PIN-protected area for
progress, school word lists, recordings, reward goals, settings and backups. All data stays on the iPad.

Design: `docs/superpowers/specs/2026-10-02-hanzi-buddy-design.md` · Plan: `docs/superpowers/plans/2026-10-02-hanzi-buddy.md`

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN for testing on the iPad)
npm test
npm run build
npm run content    # regenerate src/content/builtin.json from HSK 3.0 + Make Me a Hanzi
```

## Put it on the iPad

1. Open the deployed URL in **Safari** on the iPad.
2. Tap **Share → Add to Home Screen**. Always open the app from that icon. Home-screen apps keep their data and work offline.
3. First launch: set the parent PIN, let your child name the dragon, then do the 5-minute placement check together.
4. For good audio, install a Chinese voice: **Settings → Accessibility → Spoken Content → Voices → Chinese (China mainland)**.
5. Back up from the parent area every couple of weeks (Backup → Save backup file → Save to Files / iCloud Drive).

## iPad checklist (only real hardware can confirm these)

- [ ] 🔊 buttons speak Mandarin (not silence or an English voice).
- [ ] Speaking step: allow the microphone, record, play back, save. The recording plays in Parent → Recordings.
- [ ] 听写: finger writing is accepted; after 2 wrong strokes a hint appears.
- [ ] Add to Home Screen works; the app opens full-screen with the orange icon.
- [ ] Turn on Airplane Mode after one full session online: the app still opens, and flashcards and writing still work.
- [ ] Swipe the app away mid-session and reopen: it continues at the same card.
- [ ] Rotate to portrait: everything still fits.
````

- [ ] **Step 3: Validate the workflow file locally**

Run: `npx --yes yaml-lint .github/workflows/deploy.yml || node -e "require('node:fs').readFileSync('.github/workflows/deploy.yml','utf8')"`
Expected: no syntax errors reported.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: GitHub Pages deploy workflow and parent-facing README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: STOP and ask the parent before publishing anything.** Send this message in chat and wait for an explicit yes:

> "The app is ready to publish. I'd create a **public** GitHub repo `hanzi-buddy` under your account (it contains only code, no data about your child), push it, and turn on GitHub Pages. It will then be at `https://<your-username>.github.io/hanzi-buddy/`. Shall I go ahead?"

Only after a yes, run:
```bash
gh repo create hanzi-buddy --public --source . --push
gh api -X POST "repos/{owner}/{repo}/pages" -f build_type=workflow
gh run watch --exit-status
```
Expected: the Deploy run succeeds. Report the Pages URL to the parent. If the parent says no, skip this step and say how to deploy later (the three commands above).

---

### Task 30: End-to-end verification in the browser pane

**Files:** none (verification only). Fix anything found in the task that owns the code, and commit it there.

- [ ] **Step 1: Serve the production build**

Run in the background: `npm run build && npx vite preview --port 4173 --strictPort`
Open `http://localhost:4173` in the built-in browser pane, then resize the tab to 1024×768 (landscape iPad).

- [ ] **Step 2: Walk the first launch**
- Set PIN `1234` twice, name the dragon, pick a colour, and do placement (answer 认识 a few times, then 不认识).
- Expected: home shows the pet, `我认识 N 个字` and 今天的练习.

- [ ] **Step 3: Do a full session**
- Tap 今天的练习. In the flashcards step, answer some right and some wrong.
  - Expected: wrong answers come back about 4 cards later, and the combo banner appears at 3.
- The writing step can't be traced well with a mouse. Check that the 田字格 renders and stroke data loads (network tab shows `hanzi-writer-data` 200s).
- In the browser pane, use the components and speaking steps as far as they allow. The microphone may be unavailable; the blocked path must offer 继续.
- Expected end screens: celebration stars → chest (opens to an accessory) → home with ⭐ count raised.

- [ ] **Step 4: Check the parent area**
- Sign in with the PIN. Check the dashboard numbers and the minutes chart (hover tooltip and table view).
- Paste a 听写 list (`朋友\n学校\n大`), add it, and confirm the message.
- Set a reward goal and see its bar on home.
- Change a setting, then save a backup file.

- [ ] **Step 5: Check portrait and the console**
- Resize to 768×1024 and look at home, flashcards, fishing and the parent area: nothing overflows.
- `read_console_messages` with `onlyErrors: true` returns nothing app-related.
- Reset the pane to `desktop` and stop the preview server.

- [ ] **Step 6: Final run and wrap-up**

Run: `npm test && npm run build`
Expected: all green. Give the parent a summary with the README's iPad checklist, since those items need the real device.

---

## Self-review notes (completed while writing)

- **Spec coverage:**
  - §1 goals → Tasks 18–27
  - §2 decisions → Tasks 1, 6, 16, 28, 29
  - §3 architecture → the File Map
  - §4 data model → Tasks 2 and 6
  - §5 session, rating and distractor rules → Tasks 5, 8–10 and 18–22
  - §5a fun features → Tasks 14, 17, 18, 20, 22 and 24, plus rewards in Task 25
  - §6 parent area → Tasks 25 and 26
  - §7 content and placement → Tasks 3, 4, 12 and 23
  - §8 edge cases:
    - voice → Tasks 16, 18 and 25
    - microphone → Tasks 21 and 25
    - storage persist → Task 27
    - resume → Task 22
    - backlog → Task 8
    - migrations and emergency dump → Tasks 6, 15 and 27
    - import validation → Task 15
  - §9 testing → each task, plus Task 30
- **Deliberate small deviation:** the spec lists `introduced` on card records. Cards are only created when a word is introduced, so the field would always be true and is left out.
- **Types:**
  - `Word.listedAt` is added in Task 2 and used in Tasks 7, 8 and 26.
  - `FlashResult` and `WriteResult` are defined in Tasks 18 and 19 and consumed in Task 22.
  - `ParentTab` is defined in Task 25 and reused in Task 26.
