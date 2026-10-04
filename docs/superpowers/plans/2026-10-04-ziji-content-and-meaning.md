# HSK 1–9 Content and Meaning Practice Implementation Plan (Plan 11)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The app knows every HSK 3.0 character (levels 1–9) and 11,000 HSK words. Every word gets separate reading and meaning memory. The lesson defaults to 30 minutes. 认一认 asks both "how is it read?", using the child's real pinyin traps, and "which fits?", a 组词 blank with same-sound choices.

**Architecture:**
- The content build keeps all seven HSK character sections, taking each character's HSK level as its `level`, and writes the HSK word list to a second bundled JSON.
- A new card kind `meaning` is scheduled by FSRS beside `recognise`. The session plan adds due meaning reviews and a few new meaning items. 认一认's queue carries a `mode` per item.
- Pinyin traps come from a pure module: phonetic-component readings, initial and final swaps, 轻声. Meaning questions come from another pure module: a 组词 cue with the character blanked, and same-sound distractors that don't form real words.

**Tech Stack:** Preact 10, TypeScript 5.9, ts-fsrs, pinyin-pro, idb, Vitest 4. The content build runs with tsx, from the cached elkmovie/hsk30 (MIT, Pleco) and makemeahanzi sources.

**Spec:** `docs/superpowers/specs/2026-10-02-ziji-truffle-design.md` §19, parts 1, 2 and 3 (认一认 only). Plans 12–14 cover the importer, 选一选/字辨/听写 and placement.

## Global Constraints

- Nothing from the Berries packs or the school textbook goes into the repo or the public site.
- Shipped content is the MIT-licensed HSK 3.0 lists, makemeahanzi (already used), and sentences written for this app.
- The meaning cue is "Never English. The parent chose Chinese examples so he thinks in Chinese."
- Child screens follow §13 (ink, no emoji: `src/childEmoji.test.ts`) and §18: one screen, and `npm run fit` must stay at 0 problems.
- The default `sessionMinutes` becomes 30, and the parent can still change it.
- "His progress is kept": existing cards and words keep their ids.
- Bundled content target: no more than 1.5 MB gzipped for the JSON.
- Never push or deploy without the parent's go-ahead in chat.

## Review Focus

1. **Existing installs.** A stored `sessionMinutes` of 20 (the old default) must become 30 once, and a parent's later choice must stick. Pinned by a test of `migrateSettings` in Task 2.
2. **The 600 words already on the iPad** change level and rank. Paused, listed and skipped flags must survive, and their cards must stay attached. Pinned in Task 1's seed test.
3. **A word with no meaning cue** must never get a meaning item. That includes most multi-character school words until plan 12/13 adds sentences. Pinned in Task 2's plan test.
4. **Polyphonic characters.** A trap reading that's actually another correct reading must never be offered as wrong (例: 觉 jué/jiào). Pinned in Task 3.
5. **Same-sound distractors that form a real word with the cue** (珍__: 稀 makes 珍稀) must be excluded, or a right answer would be marked wrong. Pinned in Task 4.

---

### Task 1: HSK 1–9 built-in content and the word dictionary

**Files:**
- Modify: `scripts/content-lib.ts`, `scripts/build-content.ts`, `src/types.ts` (`Level`), `src/content/index.ts`, `src/placement/placement.ts` (bands), `src/parent/WordsPanel.tsx` (level filter)
- Create (generated): `src/content/hskwords.json`; regenerate `src/content/builtin.json`
- Test: `scripts/content-lib.test.ts`, `src/content/index.test.ts`, `src/placement/placement.test.ts`, `src/store/repo.test.ts`

**Interfaces:**
- Produces:
  - `type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7` (7 = HSK 七—九级);
  - `BUILTIN` with about 3,000 characters, where `level` is the HSK level and up to 3 `examples` (组词);
  - `HSK_WORDS: ReadonlyMap<string, number>` (word → HSK level, 1–7);
  - `wordsWithChar(ch: string): string[]`;
  - `placementBands(words)` returning one band per HSK level, at most 7 bands.

- [ ] **Step 1: Write the failing tests**

In `scripts/content-lib.test.ts`, add:

```ts
describe('HSK 1–9', () => {
  const sections = (pairs: [string, string[]][]) => new Map(pairs);
  const mmah = (c: string) => ({ character: c, pinyin: [], decomposition: '？', radical: c, matches: [[0]], definition: 'x' });
  it('keeps every character section and takes the HSK level as the level', () => {
    const chars = sections([['一级汉字表', ['一']], ['二级汉字表', ['二']], ['三级汉字表', ['三']], ['四级汉字表', ['四']], ['五级汉字表', ['五']], ['六级汉字表', ['六']], ['七一九级汉字表', ['七']], ['初等手写字表', ['一']], ['高等手写字表', ['七']]]);
    const out = buildBuiltin({ hskChars: chars, hskWords: sections([['一级词汇表', ['一二']]]), dictionary: new Map([...'一二三四五六七'].map((c) => [c, mmah(c)])), pinyinOf: () => 'x' });
    expect(out.map((c) => [c.char, c.level])).toEqual([['一', 1], ['二', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['七', 7]]);
    expect(out.filter((c) => c.writeable).map((c) => c.char)).toEqual(['一', '七']); // any 手写字表
  });
  it('builds the word dictionary from every word section, cleaned, two characters or more', () => {
    const words = sections([['一级词汇表', ['爸爸｜爸', '白（形）']], ['七一九级词汇表', ['珍惜']]]);
    expect(buildWordDictionary(words)).toEqual([['爸爸', 1], ['珍惜', 7]]);
  });
});
```

In `src/content/index.test.ts`, add:

```ts
import { gzipSync } from 'node:zlib';
import builtinJson from './builtin.json';
import hskJson from './hskwords.json';
it('ships HSK 1–9: ~3,000 characters and ~11,000 words, small enough for an offline app', () => {
  expect(BUILTIN.length).toBeGreaterThan(2900);
  expect(new Set(BUILTIN.map((c) => c.level))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
  expect(HSK_WORDS.size).toBeGreaterThan(10000);
  expect(HSK_WORDS.get('珍惜')).toBeDefined();
  expect(wordsWithChar('惜')).toContain('珍惜');
  const gz = gzipSync(JSON.stringify(builtinJson)).length + gzipSync(JSON.stringify(hskJson)).length;
  expect(gz).toBeLessThan(1_500_000);
});
```

In `src/placement/placement.test.ts`, add:

```ts
it('with HSK 1–9 there is one band per HSK level, so the check stays under 60 questions', () => {
  const words = builtinWords(0);
  const bands = placementBands(words);
  expect(bands.length).toBe(7);
  expect(bands.every((b) => new Set(b.map((w) => w.level)).size === 1)).toBe(true);
  expect(bands.reduce((n, b) => n + bandSamples(b).length, 0)).toBeLessThanOrEqual(60);
});
```

In `src/store/repo.test.ts`, add:

```ts
it('re-seeding new built-in content keeps the parent\\'s and child\\'s state on existing words and their cards', async () => {
  const db = await freshDb();
  const now = new Date(2026, 9, 4);
  await seedBuiltinWords(db, [makeWord('他', { id: 'b:他', level: 1, rank: 5 })]);
  const old = (await allWords(db))[0]!;
  await putWords(db, [{ ...old, paused: true, listName: '听写 3', listedAt: 7, writeSkippedAt: 9 }]);
  await putCards(db, [makeCard('b:他', 'recognise', now)]);
  await seedBuiltinWords(db, [makeWord('他', { id: 'b:他', level: 1, rank: 40 })]);
  const w = (await allWords(db))[0]!;
  expect([w.rank, w.paused, w.listName, w.listedAt, w.writeSkippedAt]).toEqual([40, true, '听写 3', 7, 9]);
  expect((await allCards(db)).map((c) => c.id)).toEqual(['b:他:recognise']);
});
```

(Adjust the imports to the file's existing ones: `allCards`, `allWords`, `putCards`, `putWords`, `seedBuiltinWords`, `freshDb`, `makeCard`, `makeWord`.)

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run scripts/content-lib.test.ts src/content/index.test.ts src/placement/placement.test.ts src/store/repo.test.ts`
Expected: FAIL. `buildWordDictionary`, `HSK_WORDS`, `wordsWithChar` and `hskwords.json` don't exist, the levels stop at 3, and there are 10 bands. The seed test may already pass, since it pins existing behaviour; keep it.

- [ ] **Step 3: Implement the build**

`scripts/content-lib.ts`:

```ts
export const CHAR_SECTIONS = ['一级汉字表', '二级汉字表', '三级汉字表', '四级汉字表', '五级汉字表', '六级汉字表', '七一九级汉字表'] as const;
export const WORD_SECTIONS = ['一级词汇表', '二级词汇表', '三级词汇表', '四级词汇表', '五级词汇表', '六级词汇表', '七一九级词汇表'] as const;
export const HANDWRITING_SECTIONS = ['初等手写字表', '中等手写字表', '高等手写字表'] as const;
export const MAX_EXAMPLES = 3;

/** word → HSK level (1–7), cleaned, two characters or more, first (lowest) level wins. */
export function buildWordDictionary(hskWords: Map<string, string[]>): [string, number][] {
  const out = new Map<string, number>();
  WORD_SECTIONS.forEach((section, s) => {
    for (const raw of hskWords.get(section) ?? []) {
      const w = cleanHskWord(raw);
      if (w.length >= 2 && !out.has(w)) out.set(w, s + 1);
    }
  });
  return [...out];
}
```

In `buildBuiltin`:
- `handwriting` is the union of `HANDWRITING_SECTIONS`.
- Iterate all `CHAR_SECTIONS` with `hsk: s + 1`. If a section is missing, throw as now. If a character has no makemeahanzi entry, **skip it and count it** (`skipped.push(char)`) instead of throwing, and have the build print the count.
- Delete `LEVEL_SIZE` and the rank-based `levelOf`. `levelOf` is now `p.hsk`.
- Examples: words from `buildWordDictionary(input.hskWords)` of length 2–4 that contain the character, where every character's level is no higher than this character's level. Take up to `MAX_EXAMPLES`.
- `level: p.hsk as Level`.

`scripts/build-content.ts`:
- Also write `src/content/hskwords.json` as `{ "version": 1, "words": [["爸爸",1], …] }`.
- Print the per-level counts for levels 1–7, plus the skipped count.

Run the build (the sources are cached in `scripts/.cache/`):

```bash
npm run content
```

Expected: about 3,000 characters across levels 1–7, about 11,000 words. Check the gzipped size; if it's over 1.5 MB, shorten `meaning` to one sense and drop `components` duplicates of `radical`, and ledger it.

`src/types.ts`: `export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;`

`src/content/index.ts`:

```ts
import hsk from './hskwords.json';
/** HSK 3.0 words (two characters or more) → HSK level 1–7 (7 = 七—九级). */
export const HSK_WORDS: ReadonlyMap<string, number> = new Map((hsk as { words: [string, number][] }).words);
const byChar = new Map<string, string[]>();
for (const w of HSK_WORDS.keys()) for (const ch of new Set(w)) (byChar.get(ch) ?? byChar.set(ch, []).get(ch)!).push(w);
export const wordsWithChar = (ch: string): string[] => byChar.get(ch) ?? [];
```

`src/placement/placement.ts`: one band per HSK level, until plan 14's adaptive check.

```ts
/** One band per HSK level (built-in characters, rank order). Plan 14 replaces this with the adaptive check. */
export function placementBands(words: Word[]): Word[][] {
  const ranked = builtinByRank(words);
  const levels = [...new Set(ranked.map((w) => w.level))].sort((a, b) => a! - b!);
  return levels.map((l) => ranked.filter((w) => w.level === l));
}
```

Remove `BAND_SIZE` if nothing else uses it (`grep -rn BAND_SIZE src`).

`src/parent/WordsPanel.tsx`: the level filter options become HSK 1 … HSK 6 and "HSK 7–9" (`level7`). The table's `Level ${w.level}` reads `HSK ${w.level === 7 ? '7–9' : w.level}`.

- [ ] **Step 4: Run the tests and fix existing expectations**

Run: `npx vitest run`
Expected: the new tests pass. Existing tests that pinned 600 characters or levels 1–3 fail. Read each one, and update it to the new content where its intent is unchanged. For example, the collection's rarity test uses whatever `level === 1` means now, and placement-flow tests answer 7 bands. Ledger each changed test.

- [ ] **Step 5: Commit**

```bash
git add scripts src
git commit -m "feat: HSK 1–9 built-in content (~3,000 characters), the HSK word dictionary and 组词"
```

---

### Task 2: Meaning cards, the plan and the 30-minute lesson

**Files:**
- Modify: `src/types.ts`, `src/srs/scheduler.ts`, `src/session/record.ts`, `src/session/plan.ts`, `src/session/runner.ts`, `src/app/SessionScreen.tsx`, `src/bootstrap.ts`, `src/store/repo.ts` (`DEFAULT_SETTINGS` lives in types)
- Create: `src/activities/flashcards/meaning.ts` (only `meaningCue` in this task)
- Test: `src/session/plan.test.ts`, `src/session/runner.test.ts`, `src/session/record.test.ts`, `src/store/settings.test.ts` (new), `src/activities/flashcards/meaning.test.ts` (new)

**Interfaces:**
- Produces:
  - `CardKind = 'recognise' | 'write' | 'meaning'`;
  - `FlashItem.mode?: 'read' | 'meaning'` (absent = read);
  - `SessionPlan.meaningReviewIds?: string[]` and `SessionPlan.newMeaningIds?: string[]`;
  - `Settings.lessonVersion?: number`;
  - `recordMeaning(db, wordId, outcome, now): Promise<CardRecord>`;
  - `meaningCue(word: Word): MeaningCue | null`, where `MeaningCue = { full: string; pinyin: string; before: string; after: string }`;
  - `migrateSettings(s: Settings): Partial<Settings> | null`;
  - constants `NEW_MEANING_PER_DAY = 6`, `MEANING_REVIEW_CAP = 30`, `FLASH_SHARE = 7 / 30`.

- [ ] **Step 1: Write the failing tests**

`src/activities/flashcards/meaning.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { meaningCue } from './meaning';

describe('meaningCue', () => {
  it('blanks the character inside one of its 组词 words', () => {
    const w = makeWord('惜', { examples: [{ text: '珍惜', pinyin: 'zhēn xī' }, { text: '可惜', pinyin: 'kě xī' }] });
    expect(meaningCue(w)).toEqual({ full: '珍惜', pinyin: 'zhēn xī', before: '珍', after: '' });
  });
  it('has no cue when no example contains the word (a two-character school word without sentences yet)', () => {
    expect(meaningCue(makeWord('保持', { examples: [] }))).toBeNull();
    expect(meaningCue(makeWord('保持'))).toBeNull();
  });
});
```

Add to `src/session/plan.test.ts`:

```ts
describe('meaning practice', () => {
  const later = new Date(2026, 9, 20);
  const withCue = (i: number) => makeWord(`字${i}`, { id: `b:${i}`, rank: i, examples: [{ text: `字${i}好`, pinyin: 'x' }] });
  it('adds due meaning reviews, and starts meaning practice for words he has begun, never for words without a cue', () => {
    const ws = [withCue(0), withCue(1), makeWord('保持', { id: 'p:1', rank: null, examples: [] }), withCue(3)];
    const cards = [
      makeCard('b:0', 'recognise', later), makeCard('b:0', 'meaning', hoursAgo(2)), // due meaning review
      makeCard('b:1', 'recognise', later), // begun, no meaning card yet → new meaning
      makeCard('p:1', 'recognise', later), // begun, but no cue → nothing
    ];
    const plan = buildSessionPlan({ cards, words: ws, settings: settings(), now });
    expect(plan.meaningReviewIds).toEqual(['b:0']);
    expect(plan.newMeaningIds).toEqual(['b:1']);
  });
  it('the 认一认 time box is 7 of 30 minutes', () => {
    expect(buildSessionPlan({ cards: [], words: [], settings: settings({ sessionMinutes: 30 }), now }).flashTimeBoxMs).toBe(7 * 60_000);
  });
});
```

Update the existing time-box assertion: for 20 minutes it is now `Math.round(20 * 60_000 * 7 / 30)`.

Add to `src/session/runner.test.ts`:

```ts
it('interleaves reading and meaning reviews, then new words, then new meaning items', () => {
  const plan = { ...emptyPlan, steps: ['flashcards' as const], reviewWordIds: ['a', 'b'], meaningReviewIds: ['c'], newWordIds: ['n'], newMeaningIds: ['m'] };
  const q = createSessionRecord(plan, '2026-10-04', 0).flashQueue.map((i) => `${i.wordId}:${i.mode ?? 'read'}${i.isNew ? '+new' : ''}`);
  expect(q).toEqual(['a:read', 'c:meaning', 'b:read', 'n:read+new', 'm:meaning']);
});
```

(Use the file's existing empty-plan helper, or define `emptyPlan` as in `src/app/home.test.tsx`.)

Add to `src/session/record.test.ts`:

```ts
it('a meaning answer reviews the meaning card, not the reading one', async () => {
  const db = await freshDb();
  await putWords(db, [makeWord('他', { id: 'b:他' })]);
  await recordRecognition(db, 'b:他', { correct: true, responseMs: 900 }, now);
  await recordMeaning(db, 'b:他', { correct: false, responseMs: 900 }, now);
  const cards = await allCards(db);
  expect(cards.map((c) => c.kind).sort()).toEqual(['meaning', 'recognise']);
  expect((await logsSince(db, 0)).map((l) => l.kind)).toEqual(['recognise', 'meaning']);
});
```

Create `src/store/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { migrateSettings } from './settings';

describe('migrateSettings', () => {
  it('moves an install on the old 20-minute default to 30 minutes, once', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined })).toEqual({ sessionMinutes: 30, lessonVersion: 2 });
  });
  it('keeps a longer lesson the parent chose, and never runs again', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 40, lessonVersion: undefined })).toEqual({ sessionMinutes: 40, lessonVersion: 2 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: 2 })).toBeNull();
  });
  it('a fresh install starts at 30 minutes', () => {
    expect(DEFAULT_SETTINGS.sessionMinutes).toBe(30);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/activities/flashcards/meaning.test.ts src/session src/store/settings.test.ts`
Expected: FAIL. The modules and fields don't exist.

- [ ] **Step 3: Implement**

`src/types.ts`:
- `CardKind` adds `'meaning'`.
- `FlashItem` adds `mode?: 'read' | 'meaning'; // absent = read`.
- `SessionPlan` adds `meaningReviewIds?: string[]; newMeaningIds?: string[]; // optional: sessions saved before plan 11 have none`.
- `Settings` adds `lessonVersion?: number`.
- `DEFAULT_SETTINGS.sessionMinutes = 30` and `lessonVersion: 2`.

`src/srs/scheduler.ts`: `toRating` treats `'meaning'` like `'recognise'`. Extend the `Outcome` union.

`src/session/record.ts`:

```ts
export async function recordMeaning(db: AppDb, wordId: string, outcome: { correct: boolean; responseMs: number }, now: Date): Promise<CardRecord> {
  const rating = toRating({ kind: 'meaning', ...outcome });
  const card = await reviewCard(db, wordId, 'meaning', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'meaning', at: now.getTime(), rating, ...outcome });
  return card;
}
```

Check `reviewCard` creates a card of the given kind when missing; read it and extend it if it hard-codes `recognise`.

`src/activities/flashcards/meaning.ts`:

```ts
import type { Word } from '../../types';

export interface MeaningCue { full: string; pinyin: string; before: string; after: string }

/** 组词 as the meaning cue: the first longer example containing the word, with the word blanked. Never English. */
export function meaningCue(word: Word): MeaningCue | null {
  const ex = (word.examples ?? []).find((e) => e.text.length > word.text.length && e.text.includes(word.text));
  if (!ex) return null;
  const at = ex.text.indexOf(word.text);
  return { full: ex.text, pinyin: ex.pinyin, before: ex.text.slice(0, at), after: ex.text.slice(at + word.text.length) };
}
```

`src/session/plan.ts`:

```ts
export const FLASH_SHARE = 7 / 30; // 认一认's share of the lesson (spec §19: 7 of 30 minutes)
export const NEW_MEANING_PER_DAY = 6;
export const MEANING_REVIEW_CAP = 30;
// in buildSessionPlan:
const meaning = ofKind('meaning');
const hasMeaning = new Set(meaning.map((c) => c.wordId));
const meaningOrder = (a: Word, b: Word) => (practised.get(b.id) ?? -1) - (practised.get(a.id) ?? -1) || newWordOrder(a, b);
// returned fields:
flashTimeBoxMs: Math.round(settings.sessionMinutes * 60_000 * FLASH_SHARE),
meaningReviewIds: dueOf(meaning).slice(0, MEANING_REVIEW_CAP).map((c) => c.wordId),
newMeaningIds: active.filter((w) => started.has(w.id) && !hasMeaning.has(w.id) && meaningCue(w) !== null).sort(meaningOrder).slice(0, NEW_MEANING_PER_DAY).map((w) => w.id),
```

`src/session/runner.ts` (`createSessionRecord`):

```ts
const read = plan.reviewWordIds.map((wordId): FlashItem => ({ wordId, isNew: false, retry: false }));
const mean = (plan.meaningReviewIds ?? []).map((wordId): FlashItem => ({ wordId, isNew: false, retry: false, mode: 'meaning' }));
const reviews: FlashItem[] = [];
for (let i = 0; i < Math.max(read.length, mean.length); i++) { if (read[i]) reviews.push(read[i]!); if (mean[i]) reviews.push(mean[i]!); }
const flashQueue: FlashItem[] = [
  ...reviews,
  ...plan.newWordIds.map((wordId) => ({ wordId, isNew: true, retry: false })),
  ...(plan.newMeaningIds ?? []).map((wordId): FlashItem => ({ wordId, isNew: false, retry: false, mode: 'meaning' })),
];
```

`src/app/SessionScreen.tsx` `onFlashDone`: when the current item's `mode === 'meaning'`, call `recordMeaning` instead of `recordRecognition`. A retry is a re-show, as now: no scheduler review.

Create `src/store/settings.ts`:

```ts
import type { Settings } from '../types';
/** One-off moves for existing installs. Plan 11: the lesson grows to 30 minutes (a longer choice is kept). */
export function migrateSettings(s: Settings): Partial<Settings> | null {
  if ((s.lessonVersion ?? 1) >= 2) return null;
  return { sessionMinutes: Math.max(30, s.sessionMinutes), lessonVersion: 2 };
}
```

`src/bootstrap.ts`: after `getSettings`, if `migrateSettings(settings)` returns a patch, `updateSettings(db, patch)` and use the result.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`
Expected: PASS. Existing tests that pin the 20-minute default or the old time box get updated (ledger each).

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: separate meaning memory per word; a 30-minute lesson; meaning items in 认一认's queue"
```

---

### Task 3: Pinyin traps — the child's real mistakes as wrong choices

**Files:**
- Create: `src/activities/flashcards/pinyinTraps.ts`, `src/activities/flashcards/pinyinTraps.test.ts`
- Modify: `src/activities/flashcards/distractors.ts` (`pickPinyinDistractors`), `src/activities/flashcards/distractors.test.ts`

**Interfaces:**
- Consumes: `syllableTone`, `withTone`, `toneless` from `distractors.ts`; `getCharInfo` and `BUILTIN` from `src/content`.
- Produces:
  - `trapReadings(word: Word): string[]`, with candidates in priority order (component readings, initial swaps, final swaps, 轻声 full tone);
  - `pickPinyinDistractors` that uses at most one tone-only variant.

- [ ] **Step 1: Write the failing tests**

`src/activities/flashcards/pinyinTraps.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../../content';
import { makeWord } from '../../test/fixtures';
import { trapReadings } from './pinyinTraps';

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;

describe('trapReadings (his worksheet mistakes)', () => {
  it('offers the reading of the phonetic part: 静 → qīng (青)', () => {
    expect(trapReadings(w('静'))).toContain('qīng');
  });
  it('swaps j/q/x with z/c/s and zh/ch/sh: 群 qún → cún', () => {
    expect(trapReadings(w('群'))).toContain('cún');
  });
  it('swaps close finals: 街 jiē → jiā', () => {
    expect(trapReadings(w('街'))).toContain('jiā');
  });
  it('gives a 轻声 syllable its full tone: 认识 rèn shi → rèn shí', () => {
    expect(trapReadings(makeWord('认识', { pinyin: 'rèn shi' }))).toContain('rèn shí');
  });
  it('only makes real syllables', () => {
    for (const t of ['静', '群', '街', '想', '捡']) for (const p of trapReadings(w(t))) expect(p).toMatch(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü ]+$/);
  });
});
```

Add to `src/activities/flashcards/distractors.test.ts`:

```ts
it('uses his traps first and at most one tone-only change', () => {
  const pool = builtinWords(0);
  const target = pool.find((x) => x.text === '静')!;
  for (let seed = 1; seed < 20; seed++) {
    const out = pickPinyinDistractors(target, pool, mulberry32(seed));
    expect(out).toHaveLength(3);
    expect(out.filter((p) => toneless(p) === toneless(target.pinyin)).length).toBeLessThanOrEqual(1);
    expect(out).toContain('qīng');
  }
});
it('never offers another correct reading of a polyphonic character as wrong', () => {
  const pool = builtinWords(0);
  const jue = pool.find((x) => x.text === '觉')!;
  for (let seed = 1; seed < 20; seed++) {
    const out = pickPinyinDistractors(jue, pool, mulberry32(seed));
    expect(out).not.toContain('jiào');
    expect(out).not.toContain('jué');
  }
});
```

Existing tests that pinned "two tone variants first" are updated to the new rule; ledger it.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/activities/flashcards`
Expected: FAIL. `pinyinTraps` doesn't exist, and the current picker gives two tone variants and no qīng.

- [ ] **Step 3: Implement**

`src/activities/flashcards/pinyinTraps.ts`:

```ts
import { pinyin } from 'pinyin-pro';
import { BUILTIN, getCharInfo, hanChars } from '../../content';
import type { Word } from '../../types';
import { syllableTone, withTone } from './distractors';

const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
const INITIAL_SWAPS: Record<string, string[]> = { j: ['z', 'zh'], q: ['c', 'ch'], x: ['s', 'sh'], z: ['j', 'zh'], c: ['q', 'ch'], s: ['x', 'sh'], zh: ['z', 'j'], ch: ['c', 'q'], sh: ['s', 'x'] };
const FINAL_SWAPS: [string, string][] = [['ie', 'ia'], ['uo', 'ou'], ['in', 'ing'], ['an', 'ang'], ['en', 'eng'], ['ian', 'iang'], ['un', 'ong']];
/** Every toneless syllable the app knows: a swap must land on a real syllable. */
const VALID = new Set(BUILTIN.flatMap((c) => c.pinyin.split(' ').map((s) => syllableTone(s).base)));

function split(base: string): [string, string] {
  const ini = INITIALS.find((i) => base.startsWith(i) && base.length > i.length) ?? '';
  return [ini, base.slice(ini.length)];
}

function swaps(syl: string): string[] {
  const { base, tone } = syllableTone(syl);
  const [ini, fin] = split(base);
  const out: string[] = [];
  for (const i of INITIAL_SWAPS[ini] ?? []) {
    // j/q/x take ü written as u; after z/c/s the u is a real u: only keep real syllables
    if (VALID.has(i + fin)) out.push(withTone(i + fin, tone));
  }
  for (const [a, b] of FINAL_SWAPS) {
    for (const [from, to] of [[a, b], [b, a]] as const) {
      if (fin.endsWith(from) && VALID.has(ini + fin.slice(0, -from.length) + to)) out.push(withTone(ini + fin.slice(0, -from.length) + to, tone));
    }
  }
  return out;
}

/** His worksheet traps, in priority order: the phonetic part's reading, initial swaps, final swaps, 轻声 given full tone. */
export function trapReadings(word: Word): string[] {
  const syllables = word.pinyin.split(' ');
  const out: string[] = [];
  const chars = hanChars(word.text);
  if (chars.length === 1) {
    const info = getCharInfo(chars[0]!);
    for (const part of info?.components ?? []) {
      if (part === chars[0] || !/\p{Script=Han}/u.test(part)) continue;
      const p = pinyin(part);
      if (p && p !== word.pinyin) out.push(p);
    }
  }
  syllables.forEach((s, i) => {
    for (const alt of swaps(s)) out.push(syllables.map((x, j) => (j === i ? alt : x)).join(' '));
    if (syllableTone(s).tone === 5 && chars[i]) {
      const full = pinyin(chars[i]!);
      if (full && full !== s) out.push(syllables.map((x, j) => (j === i ? full : x)).join(' '));
    }
  });
  return [...new Set(out)].filter((p) => p !== word.pinyin);
}
```

In `distractors.ts`, `pickPinyinDistractors`:
- **Tier 0:** up to 2 from `shuffle(trapReadings(target), rng)`.
- **Tier 1:** one tone variant.
- **Then** look-alike pinyin, then same length, as now.
- **Only if still short:** remaining traps, then tone variants.

The `used` set still starts with every reading of a polyphonic single character plus `TONE_CHANGE`, so traps that are real readings are skipped.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/activities/flashcards`, then `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/activities/flashcards
git commit -m "feat: 认一认's wrong pinyin choices are his real traps (phonetic part, j/q/x vs z/c/s, close finals, 轻声)"
```

---

### Task 4: The meaning question in 认一认

**Files:**
- Modify: `src/activities/flashcards/meaning.ts` (add `pickSoundAlikes`), `src/activities/flashcards/FlashcardStep.tsx`, `src/styles.css` (adaptive section)
- Test: `src/activities/flashcards/meaning.test.ts`, `src/activities/flashcards/FlashcardStep.test.tsx`, `src/app/SessionScreen.test.tsx`

**Interfaces:**
- Consumes: `meaningCue` (Task 2), `HSK_WORDS` (Task 1), `toneless` (distractors), `FlashItem.mode` (Task 2), `recordMeaning` (Task 2).
- Produces:
  - `pickSoundAlikes(word: Word, cue: MeaningCue, pool: Word[], rng: Rng, n = 3): string[]`;
  - the meaning quiz UI: `.meaning-cue` with `.meaning-cue__blank`.

- [ ] **Step 1: Write the failing tests**

Add to `meaning.test.ts`:

```ts
import { builtinWords, HSK_WORDS } from '../../content';
import { mulberry32 } from '../../lib/random';
import { pickSoundAlikes } from './meaning';

describe('pickSoundAlikes', () => {
  const pool = builtinWords(0);
  const xi = pool.find((w) => w.text === '惜')!;
  const cue = { full: '珍惜', pinyin: 'zhēn xī', before: '珍', after: '' };
  it('offers characters that sound like the answer, so sound alone can\\'t give it away', () => {
    const out = pickSoundAlikes(xi, cue, pool, mulberry32(3));
    expect(out).toHaveLength(3);
    expect(out.every((c) => pool.find((w) => w.text === c)!.pinyin.replace(/[^a-z]/g, '').startsWith('x'))).toBe(true);
  });
  it('never offers a character that also makes a real word with the cue (珍稀 is a word)', () => {
    for (let seed = 1; seed < 30; seed++) {
      for (const c of pickSoundAlikes(xi, cue, pool, mulberry32(seed))) expect(HSK_WORDS.has(cue.before + c + cue.after)).toBe(false);
    }
  });
});
```

Add to `FlashcardStep.test.tsx` (use the file's existing render helpers and mocks):

```tsx
it('a meaning item asks which character fits the 组词 word, reads the word aloud, and shows no English', async () => {
  const word = { ...makeWord('惜', { id: 'b:惜', pinyin: 'xī', meaning: 'to cherish' }), examples: [{ text: '珍惜', pinyin: 'zhēn xī' }] };
  const onDone = vi.fn();
  render(<FlashcardStep item={{ wordId: 'b:惜', isNew: false, retry: false, mode: 'meaning' }} word={word} pool={builtinWords(0)} voice kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={onDone} />);
  expect(document.querySelector('.meaning-cue')?.textContent).toContain('珍');
  expect(document.querySelector('.meaning-cue__blank')).toBeTruthy();
  expect(speak).toHaveBeenCalledWith('珍惜');
  expect(document.body.textContent).not.toContain('cherish');
  fireEvent.click(screen.getByRole('button', { name: '惜' }));
  fireEvent.click(await screen.findByText('继续'));
  expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
});
it('a new word\\'s intro shows its 组词, never an English meaning', () => {
  const word = { ...makeWord('惜', { id: 'b:惜', pinyin: 'xī', meaning: 'to cherish' }), examples: [{ text: '珍惜', pinyin: 'zhēn xī' }] };
  render(<FlashcardStep item={{ wordId: 'b:惜', isNew: true, retry: false }} word={word} pool={builtinWords(0)} voice kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={vi.fn()} />);
  expect(document.body.textContent).toContain('珍惜');
  expect(document.body.textContent).not.toContain('cherish');
});
```

Add to `SessionScreen.test.tsx`: a session whose plan has `newMeaningIds: ['b:惜']`, where answering records a `meaning` card. Use the file's existing setup that seeds words and cards; seed 惜 with a recognise card and an example.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/activities/flashcards src/app/SessionScreen.test.tsx`
Expected: FAIL. There's no `pickSoundAlikes`, the step has no meaning UI, and the intro shows the English meaning.

- [ ] **Step 3: Implement**

`meaning.ts`:

```ts
import { HSK_WORDS } from '../../content';
import { shuffle, type Rng } from '../../lib/random';
import { toneless } from './distractors';

/** Same-sound choices (same syllable first, then same initial), minus any that would make a real word with the cue. */
export function pickSoundAlikes(word: Word, cue: MeaningCue, pool: Word[], rng: Rng, n = 3): string[] {
  const sound = toneless(word.pinyin);
  const initial = sound.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?/)![0];
  const fits = (t: string) => HSK_WORDS.has(cue.before + t + cue.after);
  const eligible = pool.filter((w) => w.text.length === word.text.length && w.text !== word.text && !fits(w.text));
  const tiers = [eligible.filter((w) => toneless(w.pinyin) === sound), eligible.filter((w) => toneless(w.pinyin).startsWith(initial || '\u0000')), eligible];
  const out: string[] = [];
  for (const tier of tiers) for (const w of shuffle(tier, rng)) { if (out.length >= n) return out; if (!out.includes(w.text)) out.push(w.text); }
  return out;
}
```

`FlashcardStep.tsx`:
- **The quiz's `useMemo`:** when `item.mode === 'meaning'` and `meaningCue(word)` is non-null, build `{ kind: 'meaning', cue, answer: word.text, options: shuffle([word.text, ...pickSoundAlikes(word, cue, pool, rng)], rng) }`. Otherwise, keep the current read/listen logic. A meaning item without a cue falls back to reading.
- **Prompt for meaning:** `<div class="hanzi meaning-cue" lang="zh">{cue.before}<span class="meaning-cue__blank" aria-label="空格">？</span>{cue.after}</div>`, with the cue's pinyin under it. The choices use `choices--hanzi`.
- **On entering the quiz** for a meaning item, `speak(cue.full)`.
- **Truffle's bubble:** "哪个字对？".
- **Feedback** shows the full word (珍惜) and its pinyin.
- **The intro card:** remove the English `word.meaning` line. The examples (组词) already show and become the meaning cue (spec §19: never English). The parent area still shows English in Words.

`styles.css` (adaptive section):

```css
/* 认一认 meaning question: the 组词 word with the character blanked */
.meaning-cue { font-size: var(--hanzi-xl); line-height: 1.05; background: var(--surface); border: var(--panel-border); border-radius: 22px; box-shadow: var(--panel-shadow); padding: 0.04em 0.2em 0.08em; }
.meaning-cue__blank { color: var(--muted); border-bottom: 4px dashed var(--ink); padding: 0 0.05em; }
```

- [ ] **Step 4: Run the tests and the sweep**

Run: `npx vitest run`, then `npm run fit > .superpowers/sdd/2026-10-04-ziji-content-and-meaning/fit.txt 2>&1; tail -1 .superpowers/sdd/2026-10-04-ziji-content-and-meaning/fit.txt`
Expected: all tests pass, and `… 0 with problems`. The fit profile has 80 begun words, so the flashcards flow now shows meaning items. Look at `fit-shots/iphone-se/flashcards-*.png` and `ipad-landscape/flashcards-*.png` for a meaning question.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: 认一认 asks which character fits its 组词 word, with same-sound choices; no English on child screens"
```
