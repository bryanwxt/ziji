# The story engine (Word Thief 3c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapters 1–3 play around his daily lesson.
- **Before the lesson:** the setup pages and Granny Dragon's lines.
- **After the celebration:**
  - Granny's 听一听 scene;
  - the payoff pages, where the words he practised today fly home.
- **Word slots** show English, Chinese with small English beneath, or Chinese only, according to where he is with each word.

**Architecture:**
- **Content:** the chapters move into `src/content/story/` and are bundled with `import.meta.glob` (`src/story/chapters.ts`).
- **Pure logic lives in `src/story/`:**
  - `progress.ts`: which chapter is due, and marking setup and payoff;
  - `weave.ts`: slot state, word ids, and the cast on a page;
  - `today.ts`: the words practised today.
- **One screen,** `src/story/StoryScreen.tsx`, renders the setup and payoff parts.
- **Hooks:** HomeScreen's lesson start and Celebration's last step route through it.

**Tech Stack:** Preact + TypeScript, idb, vitest + jsdom + fake-indexeddb, playwright-core WebKit (stage cases + fit sweep).

**Spec:** `docs/superpowers/specs/2026-10-07-ziji-story-engine-design.md`, built on 3a (`docs/superpowers/specs/2026-10-06-ziji-story-bible-design.md`, `src/story/format.ts`, `src/story/check.ts`) and 3b (`docs/superpowers/specs/2026-10-07-ziji-story-art-design.md`, `GrannyDragon`, the repainted `Truffle`, `public/story/bg/*.webp`).

## Global Constraints

- **Story progress lives in `settings.storyProgress`,** not `settings.story`, which is already the 看图说话 switch:

```ts
{ chapter: number; readOn?: string; setupDone?: boolean; payoffDone?: boolean }
```

  - It defaults to `{ chapter: 0 }`.
  - `chapter` is the last finished chapter.
- **One new chapter a day:**
  - an extra lesson (`extra: true`) and free play (`free: true`) never start a chapter;
  - when there are no more written chapters, lessons are unchanged.
- **Slot states** (spec §5.5): **new** when Hear is not passed and the word is not owned (English shown); **learning** when Hear is passed but the word is not owned (Chinese with small English; tap to hear); **owned** (Chinese only; tap to hear).
- **Word ids:** one character is `b:<text>`, otherwise `w:<text>`.
- **Granny's English** shows only after a tap, once her line has played. With no voice it shows straight away.
- **听一听 needs a voice;** with no voice it's skipped. It is never graded and never touches his cards.
- **Rescued words:** up to 12 distinct words practised today, in the order first practised.
- **Reduced motion:** nothing slides or flies; chips simply appear.
- **His screens:** only the story text and Granny's English (after a tap) are English. Chinese shows with pinyin (`Label`) in Granny's lines and 听一听.
- **Before each commit:** `npx tsc --noEmit -p .` and `npx vitest run --maxWorkers=2` pass.
- **Layout:** stage cases plus `caffeinate -i npm run fit`, with 0 problems.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Push** to main after the final review; the parent gave standing approval on 2026-10-07.

## Review Focus

1. **A lesson abandoned halfway.** The payoff stays owed. The next completed lesson that day, or the next day's first lesson, shows the payoff before any new chapter. Test: Task 2, "an owed payoff comes before a new chapter, even the next day".
2. **The day rolls over at midnight between setup and payoff.** The payoff still belongs to the chapter he started, and no new chapter starts. Test: Task 2, "an owed payoff comes before a new chapter, even the next day".
3. **A slot word that isn't in his word list** (a ladder 词语 he has never met, or one missing from the content). It renders as its English and never crashes. Test: Task 3, "an unknown word is new: its English".
4. **No voice.** Granny's English shows at once, 听一听 is skipped, and the payoff still marks the chapter. Test: Task 4, "no voice: Granny's English shows at once and 听一听 is skipped".
5. **No words practised today** (he skipped straight to the end). The `[rescued]` page shows its line with no chips. Test: Task 4, "no words today: the rescued line alone".

---

## File map

| File | Responsibility |
|---|---|
| `src/content/story/season-1/ch01–03.md` | Moved from `docs/story/season-1/` (git mv). The outline stays in docs |
| `src/content/story/story.test.ts` | Every shipped chapter passes the 3a checks and has its backgrounds |
| `src/story/format.ts` | Learns `@cast <ids…>` |
| `src/story/chapters.ts` | `CHAPTERS: Chapter[]`, sorted by number |
| `src/story/progress.ts` | `StoryProgress`, `storyStep`, `markSetup`, `markPayoff` |
| `src/story/today.ts` | `wordsPractisedToday(db, now)` |
| `src/story/weave.ts` | `wordIdFor`, `slotState`, `castFor` |
| `src/story/StoryScreen.tsx`, `.test.tsx` | The reader |
| `src/types.ts` | `Settings.storyProgress` |
| `src/app/AppContext.tsx`, `src/App.tsx` | The `story` route |
| `src/app/HomeScreen.tsx`, `src/app/Celebration.tsx` | The hooks |
| `src/styles.css` | `.story` layout (from the 3b test page) |
| `scripts/story/check.ts`, `scripts/story/words.ts`, `scripts/art/backgrounds.ts` | Point at `src/content/story` |
| `scripts/audio/inventory.ts` | Story Mandarin as clips |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` | The `story-*` cases |

---

### Task 1: Chapters in the app, `@cast`, the content test

**Files:**
- Move: `docs/story/season-1/ch0{1,2,3}.md` → `src/content/story/season-1/`
- Modify: `src/story/format.ts`, `src/story/format.test.ts`, `scripts/story/check.ts`, `scripts/story/words.ts` (the outline path stays in docs), `scripts/art/backgrounds.ts`
- Create: `src/story/chapters.ts`, `src/content/story/story.test.ts`

**Interfaces:**
- Produces:
  - the `Line` variant `{ kind: 'cast'; ids: string[] }`;
  - `export const CHAPTERS: Chapter[]`;
  - `export const chapterNumbered = (n: number): Chapter | undefined`.

- [ ] **Step 1: Write the failing tests.**
  - Add to `src/story/format.test.ts`:

```ts
  it('reads @cast as the characters standing in the scene', () => {
    const c = parseChapter(CH.replace('@scene hdb-morning', '@scene hdb-morning\n@cast truffle granny'));
    expect(c.setup[0]!.lines[1]).toEqual({ kind: 'cast', ids: ['truffle', 'granny'] });
  });
```

  - Create `src/content/story/story.test.ts`:

```ts
// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chapterProblems } from '../../story/check';
import { parseChapter, parseOutline } from '../../story/format';
import { sceneIds } from '../../story/art';
import { CHAPTERS } from '../../story/chapters';

const dir = 'src/content/story/season-1';
describe('the shipped story (spec 3c §2)', () => {
  it('every chapter passes the writing rules and matches the outline', () => {
    const rows = parseOutline(readFileSync('docs/story/season-1/outline.md', 'utf8'));
    for (const f of readdirSync(dir).filter((x) => /^ch\d+\.md$/.test(x))) {
      const c = parseChapter(readFileSync(`${dir}/${f}`, 'utf8'));
      expect(chapterProblems(c, rows.find((r) => r.chapter === c.chapter)), f).toEqual([]);
    }
  });
  it('the app bundles every chapter, in order, and every scene has its painting', () => {
    expect(CHAPTERS.map((c) => c.chapter)).toEqual([1, 2, 3]);
    for (const id of sceneIds(CHAPTERS)) expect(existsSync(`public/story/bg/${id}.webp`), id).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/story/format.test.ts src/content/story`
  Expected: FAIL. There is no `cast` line, and `../../story/chapters` doesn't exist.

- [ ] **Step 3: Implement.**
  - **Move the chapters:**
    ```bash
    mkdir -p src/content/story/season-1
    git mv docs/story/season-1/ch01.md docs/story/season-1/ch02.md docs/story/season-1/ch03.md src/content/story/season-1/
    ```
  - **In `format.ts`:**
    - add `| { kind: 'cast'; ids: string[] }` to `Line`;
    - in the page branch, before `@scene`, add `if (s.startsWith('@cast ')) { page.lines.push({ kind: 'cast', ids: s.slice(6).trim().split(/\s+/) }); continue; }`;
    - in `check.ts`, treat `cast` like `scene` wherever lines are filtered (`l.kind === 'scene' || l.kind === 'cast'`), so cast ids never count as English words.
  - **Create `src/story/chapters.ts`:**

```ts
// The story's chapters, bundled with the app (spec 2026-10-07 3c §2): src/content/story/season-*/chNN.md, parsed by the 3a format.
import { parseChapter, type Chapter } from './format';

const files = import.meta.glob('../content/story/season-*/ch*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const CHAPTERS: Chapter[] = Object.values(files).map(parseChapter).sort((a, b) => a.chapter - b.chapter);
export const chapterNumbered = (n: number): Chapter | undefined => CHAPTERS.find((c) => c.chapter === n);
```

  - **Point the scripts at the new folder:**
    - `scripts/story/check.ts` reads chapters from `src/content/story/season-1` and the outline from `docs/story/season-1/outline.md`;
    - `scripts/art/backgrounds.ts` reads chapters from `src/content/story/season-*`;
    - `scripts/story/words.ts` keeps reading the outline from docs.
  - Create `src/content/story/season-1/` with the moved files only.

- [ ] **Step 4: Run them to see them pass.**
  Run: `npx vitest run src/story src/content/story && npx tsx scripts/story/check.ts && npx tsx scripts/art/backgrounds.ts && npx tsc --noEmit -p .`
  Expected: PASS. The check script prints 0 problems and 3 chapters, and the backgrounds script prints "every scene has a painting".

- [ ] **Step 5: Commit.**

```bash
git add -A src/content/story src/story docs/story scripts/story scripts/art
git commit -m "story: chapters ship with the app; @cast; a content test for every shipped chapter (3c §2)"
```

### Task 2: Story progress

**Files:**
- Create: `src/story/progress.ts`, `src/story/progress.test.ts`, `src/story/today.ts`, `src/story/today.test.ts`
- Modify: `src/types.ts` (`Settings.storyProgress?`)

**Interfaces:**
- Produces:

```ts
export interface StoryProgress { chapter: number; readOn?: string; setupDone?: boolean; payoffDone?: boolean }
export const NO_STORY: StoryProgress = { chapter: 0 };
/** What the story owes before/after today's lesson: the chapter's setup, its payoff, or nothing. */
export function storyStep(p: StoryProgress | undefined, chapterCount: number, today: string): { part: 'setup' | 'payoff'; chapter: number } | null;
export function markSetup(p: StoryProgress | undefined, chapter: number, today: string): StoryProgress;
export function markPayoff(p: StoryProgress | undefined, chapter: number): StoryProgress;
export async function wordsPractisedToday(db: AppDb, now: Date, max?: number): Promise<string[]>; // word ids, first practised first
```

  The rules for `storyStep`:
  - **payoff:** when setup is done and payoff isn't. The chapter is `chapter + 1`, on any day.
  - **setup:** when nothing is owed, `readOn !== today`, and `chapter + 1 <= chapterCount`.
  - **null:** otherwise. That covers a chapter already finished today and no chapters left.

- [ ] **Step 1: Write the failing tests.**
  - `src/story/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { markPayoff, markSetup, storyStep } from './progress';

describe('story progress (spec 3c §3)', () => {
  it('the first chapter is due on the first day', () => {
    expect(storyStep(undefined, 3, '2026-10-07')).toEqual({ part: 'setup', chapter: 1 });
  });
  it('after the setup, the payoff is owed; after the payoff, nothing more today', () => {
    const s = markSetup(undefined, 1, '2026-10-07');
    expect(storyStep(s, 3, '2026-10-07')).toEqual({ part: 'payoff', chapter: 1 });
    const p = markPayoff(s, 1);
    expect(p.chapter).toBe(1);
    expect(storyStep(p, 3, '2026-10-07')).toBeNull(); // one new chapter a day
    expect(storyStep(p, 3, '2026-10-08')).toEqual({ part: 'setup', chapter: 2 });
  });
  it('an owed payoff comes before a new chapter, even the next day', () => {
    const s = markSetup({ chapter: 1 }, 2, '2026-10-07');
    expect(storyStep(s, 3, '2026-10-08')).toEqual({ part: 'payoff', chapter: 2 });
  });
  it('no chapters left: no story', () => {
    expect(storyStep({ chapter: 3 }, 3, '2026-10-09')).toBeNull();
  });
});
```

  - `src/story/today.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { freshDb } from '../test/fixtures';
import { addReviewLog } from '../store/repo';
import { wordsPractisedToday } from './today';

const now = new Date('2026-10-07T18:00:00');
const log = (wordId: string, at: Date) => ({ cardId: `${wordId}:hear`, wordId, kind: 'hear' as const, at: at.getTime(), rating: 3 as const, correct: true, responseMs: 1500 });

describe("today's practised words (spec 3c §4 [rescued])", () => {
  it('distinct, first practised first, today only, at most 12', async () => {
    const db = await freshDb();
    await addReviewLog(db, log('b:门', new Date('2026-10-06T18:00:00'))); // yesterday
    await addReviewLog(db, log('b:大', new Date('2026-10-07T09:00:00')));
    await addReviewLog(db, log('w:电梯', new Date('2026-10-07T09:01:00')));
    await addReviewLog(db, log('b:大', new Date('2026-10-07T09:02:00')));
    expect(await wordsPractisedToday(db, now)).toEqual(['b:大', 'w:电梯']);
    for (let i = 0; i < 20; i++) await addReviewLog(db, log(`b:${i}`, new Date(`2026-10-07T10:${String(i).padStart(2, '0')}:00`)));
    expect(await wordsPractisedToday(db, now)).toHaveLength(12);
  });
});
```

  If the `rating` type isn't a plain number, follow `ReviewLog` in `src/types.ts`, and record a Ruling only if the shape differs.

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/story/progress.test.ts src/story/today.test.ts`
  Expected: FAIL, because the modules don't exist.

- [ ] **Step 3: Implement.**

```ts
// src/story/progress.ts — which chapter part is owed (spec 2026-10-07 3c §3): one new chapter a day; an owed payoff first, any day.
export interface StoryProgress { chapter: number; readOn?: string; setupDone?: boolean; payoffDone?: boolean }
export const NO_STORY: StoryProgress = { chapter: 0 };

export function storyStep(p: StoryProgress | undefined, chapterCount: number, today: string): { part: 'setup' | 'payoff'; chapter: number } | null {
  const s = p ?? NO_STORY;
  const next = s.chapter + 1;
  if (s.setupDone && !s.payoffDone) return next <= chapterCount ? { part: 'payoff', chapter: next } : null;
  if (s.readOn === today) return null;
  return next <= chapterCount ? { part: 'setup', chapter: next } : null;
}
export const markSetup = (p: StoryProgress | undefined, chapter: number, today: string): StoryProgress =>
  ({ chapter: chapter - 1, readOn: today, setupDone: true, payoffDone: false });
export const markPayoff = (p: StoryProgress | undefined, chapter: number): StoryProgress =>
  ({ ...(p ?? NO_STORY), chapter, payoffDone: true });
```

```ts
// src/story/today.ts — the words he practised today, for the payoff's [rescued] page (spec 3c §4)
import { startOfLocalDay } from '../lib/date';
import type { AppDb } from '../store/db';
import { logsSince } from '../store/repo';

export async function wordsPractisedToday(db: AppDb, now: Date, max = 12): Promise<string[]> {
  const logs = (await logsSince(db, startOfLocalDay(now).getTime())).sort((a, b) => a.at - b.at);
  return [...new Set(logs.map((l) => l.wordId))].slice(0, max);
}
```

  - In `src/types.ts`, add to `Settings`:
    `storyProgress?: { chapter: number; readOn?: string; setupDone?: boolean; payoffDone?: boolean }; // the Word Thief chapters (spec 2026-10-07 3c §3)`.
    Import nothing from story; keep the shape inline.

- [ ] **Step 4: Run them to see them pass.**
  Run: `npx vitest run src/story && npx tsc --noEmit -p .`
  Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/story src/types.ts
git commit -m "story: chapter progress — one a day, an owed payoff first; today's practised words (3c §3)"
```

### Task 3: The word weave and the cast

**Files:**
- Create: `src/story/weave.ts`, `src/story/weave.test.ts`

**Interfaces:**
- Consumes: `Knowledge` (`passedRungs`, `wordsById`, `ladderById`) from `src/stats/stats.ts`, `isOwned` from `src/ladder/rungs.ts`, and `Page` and `Line` from `src/story/format.ts`.
- Produces:

```ts
export type SlotState = 'new' | 'learning' | 'owned';
export const wordIdFor = (text: string): string; // b:<one char> | w:<text>
export function slotState(know: Pick<Knowledge, 'passedRungs' | 'wordsById' | 'ladderById'>, zh: string): SlotState;
export type CastId = 'truffle' | 'granny';
export const DRAWN: ReadonlySet<CastId>; // characters with art (3b): truffle, granny
export function castFor(page: Page): CastId[]; // @cast if given (drawn ones only), else the page's drawn speakers, else truffle
```

  Speaker names map to cast ids case-insensitively: `Truffle` → `truffle`, `Granny Dragon` / `Granny` / `龙奶奶` → `granny`.

- [ ] **Step 1: Write the failing tests** (`src/story/weave.test.ts`):

```ts
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { parseChapter } from './format';
import { castFor, slotState, wordIdFor } from './weave';

const know = (passed: Record<string, string[]>) => ({
  passedRungs: new Map(Object.entries(passed).map(([id, rs]) => [id, new Set(rs as never[])])),
  wordsById: new Map([['b:门', makeWord('门')]]),
  ladderById: new Map([['w:电梯', { ...makeWord('电梯'), id: 'w:电梯' }]]),
});
const page = (body: string) => parseChapter(`---\nchapter: 1\ntitle: T\nplace: hdb\nslots: []\n---\n## Setup\n### Page 1\n${body}\n`).setup[0]!;

describe('the word weave (spec 3c §4, parent spec §5.5)', () => {
  it('one character is b:, a 词语 is w:', () => {
    expect(wordIdFor('门')).toBe('b:门');
    expect(wordIdFor('电梯')).toBe('w:电梯');
  });
  it('new until Hear passes; learning after; owned when every rung is passed', () => {
    expect(slotState(know({}), '门')).toBe('new');
    expect(slotState(know({ 'b:门': ['read', 'use'] }), '门')).toBe('new'); // read but never heard: still the English
    expect(slotState(know({ 'b:门': ['hear'] }), '门')).toBe('learning');
    expect(slotState(know({ 'w:电梯': ['hear', 'understand', 'read', 'use'] }), '电梯')).toBe('owned');
  });
  it('an unknown word is new: its English', () => {
    expect(slotState(know({}), '火箭')).toBe('new');
  });
  it('the cast: @cast first, else who speaks (drawn ones), else Truffle', () => {
    expect(castFor(page('@cast granny\nText.'))).toEqual(['granny']);
    expect(castFor(page('> Truffle: Hi!\n> Granny Dragon: Hello!'))).toEqual(['truffle', 'granny']);
    expect(castFor(page('> Dog: Woof!'))).toEqual(['truffle']); // Dog has no art yet (3d)
    expect(castFor(page('Just narration.'))).toEqual(['truffle']);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/story/weave.test.ts`
  Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement** `src/story/weave.ts`:

```ts
// The word weave (parent spec §5.5; 3c §4): a slot shows English, then Chinese with small English, then Chinese only, by his ladder.
import { isOwned } from '../ladder/rungs';
import type { Knowledge } from '../stats/stats';
import type { Page } from './format';

export type SlotState = 'new' | 'learning' | 'owned';
export const wordIdFor = (text: string): string => (Array.from(text).length === 1 ? `b:${text}` : `w:${text}`);

export function slotState(know: Pick<Knowledge, 'passedRungs' | 'wordsById' | 'ladderById'>, zh: string): SlotState {
  const id = wordIdFor(zh);
  const word = know.wordsById.get(id) ?? know.ladderById.get(id);
  const passed = know.passedRungs.get(id);
  if (!word || !passed) return 'new';
  if (isOwned(word, passed)) return 'owned';
  return passed.has('hear') ? 'learning' : 'new';
}

export type CastId = 'truffle' | 'granny';
export const DRAWN: ReadonlySet<CastId> = new Set<CastId>(['truffle', 'granny']);
const SPEAKER: Record<string, CastId> = { truffle: 'truffle', granny: 'granny', 'granny dragon': 'granny', 龙奶奶: 'granny' };

export function castFor(page: Page): CastId[] {
  const given = page.lines.find((l) => l.kind === 'cast');
  if (given && given.kind === 'cast') return given.ids.filter((x): x is CastId => DRAWN.has(x as CastId));
  const speakers = page.lines.flatMap((l) => (l.kind === 'speech' ? [SPEAKER[l.who.toLowerCase()]] : [])).filter((x): x is CastId => !!x);
  const out = [...new Set(speakers)];
  return out.length ? out : ['truffle'];
}
```

- [ ] **Step 4: Run them to see them pass.**
  Run: `npx vitest run src/story && npx tsc --noEmit -p .`
  Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/story/weave.ts src/story/weave.test.ts
git commit -m "story: the word weave by ladder state, and who stands in the scene (3c §4)"
```

### Task 4: The reader

**Files:**
- Create: `src/story/StoryScreen.tsx`, `src/story/StoryScreen.test.tsx`
- Modify: `src/app/AppContext.tsx` (Route), `src/App.tsx` (render), `src/styles.css` (`.story*`)

**Interfaces:**
- Consumes:
  - Tasks 1–3: `chapterNumbered`, `storyStep`, `markSetup`, `markPayoff`, `wordsPractisedToday`, `slotState`, `wordIdFor` and `castFor`;
  - `loadKnowledge` (`src/app/knowledge.ts`), `speak`/`stopSpeaking` (`src/audio/speech.ts`) and `onSpeaking` (`src/audio/speaking.ts`);
  - `Label` (`src/ui/Label.tsx`), `Truffle`, `GrannyDragon`, `reducedMotion`;
  - `updateSettings`/`getSettings` (`src/store/repo.ts`) and `localDateKey` (`src/lib/date.ts`).
- Produces:
  - the Route `{ name: 'story'; part: 'setup' | 'payoff'; chapter: number; then: Route }`;
  - `export function StoryScreen(props: { part: 'setup' | 'payoff'; chapter: number; then: Route })`.

**Screen structure:** a stepper over "beats".
- **Setup beats:** each setup page, then one `granny` beat holding all the Granny lines.
- **Payoff beats:**
  - a `listen` beat, only when `voice` and the chapter has listen lines;
  - then each payoff page.
- **Page beats:**
  - Each renders the 3b picture-book layout:
    - `.story__pic` (4:3, `background-image: url(${import.meta.env.BASE_URL}story/bg/<scene>.webp)`; the scene carries over from the last page that set one);
    - `.story__cast` with `<Truffle mood="pleased" label={null}/>` and/or `<GrannyDragon pose="smile" label={null}/>` (Granny is wrapped in a `<span>`, because 3b's minor 5 notes the mirror transform);
    - `.story__words` with narration `<p>` and speech `<p class="story__bubble"><b>{who}</b> …</p>`;
    - a `[rescued]` line rendered as its text plus `.story__rescued` chips.
  - Slots render by `slotState`:
    - **new:** `<span class="story__slot">{en}</span>`;
    - **learning:** `<button class="story__slot story__slot--learning" onClick={() => speak(zh)}><span lang="zh">{zh}</span><small>{en}</small></button>`;
    - **owned:** `<button class="story__slot story__slot--owned" lang="zh" onClick={() => speak(zh)}>{zh}</button>`.
- **The `granny` beat:**
  - For each line: `<GrannyDragon pose="smile" talking={speakingNow === i}/>`, `<Label zh={line.zh}/>`, and a 听 button that replays it.
  - With a voice, the lines play one after another on mount, using `onSpeaking` to step.
  - The English shows in `.story__en` after a tap on the line, once `heard[i]` is true. With no voice, `heard` starts all true and the English is shown.
  - → is enabled when every line has been heard.
- **The `listen` beat:**
  - "听一听！" as `<Label zh="听一听！"/>`, with Granny talking, plays the scene's lines in order, each shown with `Label`, plus a replay button.
  - Then each question: `<Label zh={q.zh}/>`, its own 听 button, and three choice buttons (`Label`, shuffled with `mulberry32(chapter)`).
  - Right: a cheer line ("对了！"). Wrong: the right choice gets `.is-answer` and the line "是这个！".
  - Either way, a → button moves to the next question or beat. Nothing is graded.
- **Navigation:**
  - ← (aria-label "上一页") and → (aria-label "下一页") under the words, and the current beat index in `data-beat` on `.story`.
  - The last beat's → finishes the part. A quiet "跳过" (`.story__skip`) also finishes it.
- **Finishing:**
  - setup: `updateSettings({ storyProgress: markSetup(…, chapter, today) })`;
  - payoff: `markPayoff`;
  - then `await refresh(); go(then)`.
- **Rescued chips** come from `wordsPractisedToday(db, now())`, loaded on mount when `part === 'payoff'`. Each chip is the word's text, and tapping it speaks it. The class `story__chip--fly` is applied only when `!reducedMotion()`.

- [ ] **Step 1: Write the failing tests** (`src/story/StoryScreen.test.tsx`):

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { getSettings, putCards } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { makeCard } from '../test/fixtures';
import { StoryScreen } from './StoryScreen';

vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn(), primeSpeech: vi.fn() }));

const next = () => screen.getByRole('button', { name: '下一页' });
const beat = () => Number(document.querySelector('.story')!.getAttribute('data-beat'));

describe('the story reader (spec 3c §4)', () => {
  it('setup: pages forward and back; the last beat is Granny; finishing marks the setup and goes on', async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'session', free: false }} />, app);
    await screen.findByText(/Saturday/);
    fireEvent.click(next());
    await waitFor(() => expect(beat()).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: '上一页' }));
    await waitFor(() => expect(beat()).toBe(0));
    for (let i = 0; i < 4; i++) fireEvent.click(next()); // 4 setup pages → Granny
    await waitFor(() => expect(document.querySelector('.story__granny')).toBeTruthy());
    fireEvent.click(next());
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false }));
    expect((await getSettings(app.db)).storyProgress).toMatchObject({ setupDone: true, payoffDone: false, chapter: 0 });
  });
  it("a slot shows English until he's heard the word, then Chinese with English", async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'home' }} />, app);
    await screen.findByText(/morning/);
    expect(document.querySelector('.story__slot--learning')).toBeNull();
    const app2 = await makeAppData({ voice: false });
    await putCards(app2.db, [{ ...makeCard('w:早上', 'hear', new Date(), true), passed: Date.now() }]);
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'home' }} />, app2);
    await waitFor(() => expect(document.querySelector('.story__slot--learning [lang="zh"]')?.textContent).toBe('早上'));
  });
  it("no voice: Granny's English shows at once and 听一听 is skipped", async () => {
    const app = await makeAppData({ voice: false });
    renderWithApp(<StoryScreen part="setup" chapter={1} then={{ name: 'home' }} />, app);
    await screen.findByText(/Saturday/);
    for (let i = 0; i < 4; i++) fireEvent.click(next());
    await screen.findByText('Little cat! Where are you?');
    const pay = await makeAppData({ voice: false, settings: { storyProgress: { chapter: 0, readOn: '2026-10-07', setupDone: true, payoffDone: false } } });
    renderWithApp(<StoryScreen part="payoff" chapter={1} then={{ name: 'home' }} />, pay);
    await screen.findByText(/said what they were/); // straight to the payoff pages
    expect(document.querySelector('.story__listen')).toBeNull();
  });
  it("with a voice, Granny's English needs a tap after hearing; 听一听 asks and shows the answer after a miss", async () => {
    const app = await makeAppData({ voice: true });
    renderWithApp(<StoryScreen part="payoff" chapter={1} then={{ name: 'home' }} />, app);
    await waitFor(() => expect(document.querySelector('.story__listen')).toBeTruthy());
    const { setSpeaking } = await import('../audio/speaking');
    for (let i = 0; i < 6; i++) { setSpeaking(true); setSpeaking(false); await new Promise((r) => setTimeout(r, 30)); }
    const wrong = await screen.findByRole('button', { name: /小狗/ });
    fireEvent.click(wrong);
    await waitFor(() => expect(document.querySelector('.is-answer')?.textContent).toContain('小猫'));
  });
  it('no words today: the rescued line alone; finishing the payoff marks the chapter', async () => {
    const app = await makeAppData({ voice: false, settings: { storyProgress: { chapter: 0, readOn: '2026-10-07', setupDone: true, payoffDone: false } } });
    renderWithApp(<StoryScreen part="payoff" chapter={1} then={{ name: 'home' }} />, app);
    await screen.findByText(/Words burst out/);
    expect(document.querySelectorAll('.story__chip')).toHaveLength(0);
    fireEvent.click(next());
    fireEvent.click(next());
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'home' }));
    expect((await getSettings(app.db)).storyProgress).toMatchObject({ chapter: 1, payoffDone: true });
  });
});
```

  - Check `makeAppData`'s options (`src/test/renderWithApp.tsx`). If it doesn't take `voice` or a `settings` patch, extend it minimally (pass through to the context and `updateSettings`), and record a Ruling.
  - Chapter 1's setup has 4 pages and its payoff 2. The first test's loop counts on that, and the content test pins it.

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/story/StoryScreen.test.tsx`
  Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement** `StoryScreen.tsx` as described above.
  - Add the route to `AppContext.tsx`'s `Route` union, and `case 'story': return <StoryScreen key={`${route.part}:${route.chapter}`} part={route.part} chapter={route.chapter} then={route.then} />;` to `App.tsx`.
  - **CSS** (`styles.css`), carried over from 3b's test page:
    - `.story` is a full-height cream column;
    - `.story__pic` is `width: min(100%, calc(50dvh * 4 / 3)); aspect-ratio: 4/3; background-size: cover; border-radius: 0 0 18px 18px; position: relative`;
    - `.story__cast` is absolute, `bottom: 6%`, `height: 34%`, centred with a gap;
    - `.story__words` is `font-size: clamp(18px, 2.6dvh, 24px); line-height: 1.4`;
    - bubbles, slots (`--learning` as an inline column with small English), chips (`.story__chip--fly` animates in from the top-right, and under `prefers-reduced-motion` there is no animation), `.story__nav` (← and → at least 64px), `.story__skip` (quiet, top-right), `.story__en` (small and grey), and `.story__choice` buttons (64px).
  - No emoji anywhere.

- [ ] **Step 4: Run them to see them pass.**
  Run: `npx vitest run src/story && npx tsc --noEmit -p .`
  Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/story src/app/AppContext.tsx src/App.tsx src/styles.css src/test
git commit -m "story: the reader — picture-book pages, the word weave, Granny's lines, 听一听, rescued words (3c §4)"
```

### Task 5: The hooks into the lesson

**Files:**
- Modify: `src/app/HomeScreen.tsx` (`play`), `src/app/Celebration.tsx` (`advance`)
- Test: `src/app/home.test.tsx`, `src/app/celebration.test.tsx` (or wherever Celebration's exit is tested: grep `Celebration` in `src/app/*.test.tsx`)

**Interfaces:**
- Consumes: `storyStep` (Task 2) and `CHAPTERS` (Task 1).

- [ ] **Step 1: Write the failing tests.**
  - In `home.test.tsx`:

```tsx
  it('with a chapter due, 开始 opens its setup first, then the lesson (spec 3c §5)', async () => {
    const app = await makeAppData();
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    fireEvent.click(document.querySelector('.path__node--current')!);
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'story', part: 'setup', chapter: 1, then: { name: 'session', free: false } }));
  });
  it('a chapter already read today: 开始 goes straight to the lesson', async () => {
    const today = localDateKey(new Date());
    const app = await makeAppData({ settings: { storyProgress: { chapter: 1, readOn: today, setupDone: true, payoffDone: true } } });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    fireEvent.click(document.querySelector('.path__node--current')!);
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false }));
  });
```

  - In Celebration's test, add one where `storyProgress` has `setupDone: true, payoffDone: false`. Finishing the celebration goes `{ name: 'story', part: 'payoff', chapter: 1, then: { name: 'home' } }`. Without an owed payoff, it goes home as now.
  - Use `localDateKey` from `../lib/date`.
  - If the path node isn't the start control in tests, use whatever the existing "starts today's path" test clicks.

- [ ] **Step 2: Run them to see them fail.**
  Run: `npx vitest run src/app/home.test.tsx src/app/celebration.test.tsx`
  Expected: FAIL. The new expectations aren't met.

- [ ] **Step 3: Implement.**
  - **HomeScreen `play(free)`:** if `!free`, compute `const owed = storyStep(settings.storyProgress, CHAPTERS.length, localDateKey(now()))`.
    - If `owed?.part === 'setup'`, `go({ name: 'story', part: 'setup', chapter: owed.chapter, then: { name: 'session', free } })`.
    - Otherwise, `go({ name: 'session', free })`.
    - An owed **payoff** does not block the lesson; it comes after the celebration.
    - The 再学一课 button keeps its own `go` and never starts a chapter.
  - **Celebration `advance()`** at the end: read `settings` from `useApp`.
    - If `storyStep(…)?.part === 'payoff'`, `go({ name: 'story', part: 'payoff', chapter, then: { name: 'home' } })`.
    - Otherwise, go home.
    - Read it after `await refresh()` with `await getSettings(db)`, so it's never stale.

- [ ] **Step 4: Run them to see them pass.**
  Run: `npx vitest run src/app && npx tsc --noEmit -p .`
  Expected: PASS, including the existing SessionScreen walk-through and lesson tests. A lesson test that expected `{ name: 'home' }` after the celebration must now give a state with no owed payoff. If one breaks, give it `storyProgress` with no owed payoff, and record a Ruling.

- [ ] **Step 5: Commit.**

```bash
git add src/app
git commit -m "story: a due chapter's setup before the lesson, its payoff after the celebration (3c §5)"
```

### Task 6: Audio clips, stage cases, full check, review, push

- [ ] **Step 1: Audio.**
  - In `scripts/audio/inventory.ts`, for every chapter in `src/content/story/season-*/ch*.md` (read with fs + `parseChapter`), add each Granny line and each listen line, both with `sentence(m.zh)`, and each question and its choices, with `sentence(q.zh)` and `add(choice, pinyin(choice), 'word')`.
  - Run `npx tsx scripts/audio/inventory.ts --count` or the script's existing dry-run mode. Expected: the count rises by the story lines.
  - If the script has no dry run, run its tests (`npx vitest run scripts/audio`).
- [ ] **Step 2: Stage cases.** Add `story-setup`, `story-granny`, `story-listen` and `story-rescued` to `scripts/stage-cases/page.tsx`, rendering `StoryScreen` inside a minimal `AppContext` (as other cases do), with `voice` false or true as each needs. In `scripts/stage-cases.ts`:
  - copy `public/story/bg/*.webp` into `${dir}/story/bg/`, with `BASE_URL` defined as `"/"`;
  - screenshot each case at `ipad-portrait`, `ipad-landscape` and `iphone`;
  - check that the words and nav fit inside the viewport (nav bottom ≤ innerHeight);
  - check that `.story__pic` is 4:3 within 3%;
  - check that the cast is inside the picture.

  Run `npx tsx scripts/stage-cases.ts`. Expected: `stage cases: ok`. Look at the screenshots.
- [ ] **Step 3: Full check.**
  - Run `npx tsc --noEmit -p . && npx vitest run --maxWorkers=2`. Expected: all pass.
  - Run `caffeinate -i npm run fit`. Expected: 0 problems, with the lesson flows walked. The sweep's `startLesson` clicks the path node, which now opens a story setup first. Teach `startLesson` to tap 跳过 when `.story` shows, then wait for `.lessonbar`, and add a `story` flow that walks the setup pages for the sweep.
- [ ] **Step 4:** Do the final whole-branch review on the most capable model, then one fix pass, each fix RED→GREEN.
- [ ] **Step 5:** Rebase onto `origin/main` and run the suite again. Push `HEAD:main` (the parent's standing approval), watch the Deploy and the Audio build, then report.
