# Word ladder engine (Word Thief sub-project 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every 词语 in his range a ladder. Each word is **heard** before it is **read**, and read before it is **used**. A rung counts as passed only after a correct first try on two separate days. His progress is reported honestly as words heard, read, used and owned, and characters recognised against the MOE targets.

**Architecture:** The ladder reuses the cards ZiJi already has:
- The **Read** rung is the existing `recognise` card.
- The **Use** rung is the existing `meaning` card.
- **Hear** is a new card kind, `hear`.

Because the existing cards are reused, his progress carries over as it is, and an old build still reads every card. New pieces:
- **Multi-character ladder words** come from static content (`src/content/ladder.ts`). They are never stored as word records, and their ids are `w:<text>`.
- **A pure rung module** (`src/ladder/rungs.ts`) decides passing from the review logs. The time of a pass is recorded on the card (`CardRecord.passed`).
- **Recording an answer** reviews the card, then checks for a pass. A pass opens the next rung's card.
- **Session planning** introduces new words in ladder order and asks hear cards that are due. A word's Use card only starts once its Read rung is passed.
- **The Hear question** (audio → pick the English meaning) is a quiz mode of the existing `FlashcardStep`, alongside a new "read for meaning" mode for multi-character words.
- **A one-off migration** marks cards he has already earned as passed and queues listening checks for words he already reads.

**Tech Stack:** Preact + TypeScript, idb (IndexedDB), ts-fsrs, vitest with fake-indexeddb, pinyin-pro.

**Spec:** `docs/superpowers/specs/2026-10-06-ziji-word-thief-design.md` §3. This plan covers §3.1–3.4 and §3.6 for the Hear, Read and Use rungs. Later plans cover the rest:
- **Plan 2b:** the Understand rung and its sentences.
- **Plan 2c:** word-level placement (§3.5) and the early town map (§3.7).
- **Sub-project 5:** the Say rung.

## Global Constraints

- Card ids stay `${wordId}:${kind}`. The new kind is `hear`. `recognise` (Read) and `meaning` (Use) keep their names and stored data, so an old build still reads every card.
- Multi-character ladder word ids are `w:<text>`. Single characters stay `b:<char>`. Ladder words are static content and are never written to the `words` store.
- A rung passes after **two different local days** on which that card's **first answer of the day** was right and not implausibly fast. The pass time is stored as `CardRecord.passed` (epoch ms).
- An answer is "implausibly fast" when it is quicker than `max(400 ms, 0.25 × his median right answer)` for that card kind, over his last 40 right answers. Below 10 answers, the 400 ms floor applies alone.
- Rungs open in order Hear → Read → Use. A rung the word can't be asked is skipped: Use needs a meaning cue (`meaningCue(word) !== null`). A newly opened card is first due at the start of the next local day.
- A word is **owned** when every rung it can be asked has passed.
- A character is **recognised** when any word containing it (a single-character word or a ladder word) has passed Read.
- Migration runs once (flag `settings.ladderMigrated`). It never deletes or rewrites old FSRS state. It adds only `passed` fields and new `hear` cards.
- Lessons and placement keep working with no voice: Hear items are skipped, never failed.
- His screens use no emoji (`childEmoji.test.ts`); meanings are shown in English.
- Before each push, `npx tsc --noEmit -p .` and `npx vitest run --maxWorkers=2` must pass. Then push to `main` (the parent's deploy-when-done rule). Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A lesson saved before the update** (its `SessionRecord.plan` has no `hearReviewIds`) resumes and finishes without errors. Its new words still get introduced. → Task 7 test "a lesson planned before the ladder resumes".
2. **Migration interrupted or run twice** (the iPad closes mid-way, or a backup is restored after migrating) leaves no duplicate hear cards and never changes FSRS state. → Task 9 tests "runs once" and "a second run changes nothing".
3. **No voice at all** (no clips and no iPad Chinese voice): new words are still introduced and lessons still finish. Hear items are skipped and graded nowhere. → Task 7 test "no voice: hear items are skipped, the lesson finishes".
4. **Two right answers among the meaning choices** (a distractor whose meaning matches the target, like "to look" against "to look"): every choice's first sense must differ from the target's, with no duplicates. → Task 5 test "no choice shares the answer's first sense".
5. **A ladder word missing from the content after an update** (a reading fix removes a 组词): its cards and logs must not crash planning, the counts or the parent view. They are skipped. → Task 6 test "a card whose word no longer exists is skipped" and Task 8 test "counts skip unknown words".

---

## File map

| File | Responsibility |
|---|---|
| `src/content/ladder.ts` (new) | Multi-character ladder words in order (`ladderWords`, `ladderWord`, `ladderId`) |
| `src/content/index.ts` (modify) | Export `EXAMPLE_FIXES` (already exported), `MOE_TERMS` and `moeTargets(term, course)` |
| `src/ladder/rungs.ts` (new) | Rungs, rung↔card mapping, pass rule, fast limit, next rung, owned |
| `src/ladder/words.ts` (new) | `findWord(db, id)`: a stored word or a ladder word |
| `src/ladder/migrate.ts` (new) | One-off migration, and `queueHearChecks` (also used by placement) |
| `src/types.ts` (modify) | `CardKind` adds `'hear'`; `CardRecord.passed?`; `Settings.ladderMigrated?`, `Settings.grade?`; `SessionPlan.hearReviewIds?`; `Skill` adds `'listening'` |
| `src/stats/skills.ts`, `src/parent/SkillsPanel.tsx` (modify) | Listening as a skill |
| `src/store/repo.ts` (modify) | `deleteWord` also deletes `:hear`; `logsForCard(db, cardId)` |
| `src/session/record.ts` (modify) | `recordHear`; `settleRung` after every rung review; writing passes too |
| `src/activities/flashcards/distractors.ts` (modify) | `meaningChoices(word, pool, rng)` |
| `src/activities/flashcards/FlashcardStep.tsx` (modify) | Quiz modes `hear` and `meaningRead` |
| `src/session/plan.ts` (modify) | Ladder words in the new-word order; `hearReviewIds`; Use starts only after Read has passed |
| `src/session/round.ts`, `src/session/practice.ts` (modify) | `hear` / `meaningRead` asks; hear-graded first appearances |
| `src/app/SessionScreen.tsx` (modify) | 认新字 asks Hear; grading `hear`; ladder words in `wordsById` and the meaning pool |
| `src/stats/stats.ts` (modify) | Honest counts: recognised characters, heard/read/used/owned words, written |
| `src/bootstrap.ts`, `src/store/backup.ts` (modify) | Run the migration |
| `src/placement/apply.ts`, `src/session/pace.ts`, `src/placement/journey.ts`, `src/parent/Dashboard.tsx` (modify) | Read passes, hear checks and hear logs where reading cards were used |
| `src/parent/ProgressPanel.tsx`, `src/parent/ParentArea.tsx` (new / modify) | The parent's Progress tab |

---

### Task 1: Ladder words (content)

**Files:**
- Create: `src/content/ladder.ts`
- Test: `src/content/ladder.test.ts`

**Interfaces:**
- Consumes: `builtinWords(now, course)`, `HSK_WORDS`, `schoolTerm`, `EXAMPLE_FIXES` (src/content/index.ts); `glossFor` (src/content/glossary.ts).
- Produces:
  - `ladderId(text: string): string` (returns `w:${text}`)
  - `ladderWords(now?: number): Word[]` (memoised for `now = 0`)
  - `ladderWord(id: string): Word | undefined`
  - `isLadderId(id: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/content/ladder.test.ts
import { describe, expect, it } from 'vitest';
import { builtinWords, schoolTerm } from './index';
import { isLadderId, ladderId, ladderWord, ladderWords } from './ladder';

const chars = builtinWords(0).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text));
const rankOf = new Map(chars.map((w) => [w.text, w.rank!]));
const words = ladderWords();

describe('ladder words (spec 2026-10-06 §3.1)', () => {
  it('multi-character 词语 only, each with an id, pinyin for every character, and an English meaning', () => {
    expect(words.length).toBeGreaterThan(1500);
    expect(words.length).toBeLessThan(8000);
    for (const w of words) {
      expect(Array.from(w.text).length, w.text).toBeGreaterThan(1);
      expect(w.id).toBe(ladderId(w.text));
      expect(isLadderId(w.id)).toBe(true);
      expect(w.pinyin.split(/\s+/).length, w.text).toBe(Array.from(w.text).length);
      expect(w.meaning, w.text).toBeTruthy();
    }
  });
  it('a word arrives just after the last of its characters in school order, never before', () => {
    for (const w of words) for (const c of Array.from(w.text)) expect(w.rank!, `${w.text} after ${c}`).toBeGreaterThan(rankOf.get(c)!);
    const ranks = words.map((w) => w.rank!);
    expect(new Set(ranks).size).toBe(ranks.length);
  });
  it("a school character's 组词 is a ladder word, at the card's own reading", () => {
    const withExample = chars.find((c) => (c.examples ?? []).some((e) => Array.from(e.text).every((x) => rankOf.has(x))))!;
    const e = withExample.examples!.find((x) => Array.from(x.text).every((c) => rankOf.has(c)))!;
    expect(ladderWord(ladderId(e.text))?.pinyin).toBe(e.pinyin);
  });
  it('the same list every time, and no word twice', () => {
    expect(ladderWords().map((w) => w.id)).toEqual(words.map((w) => w.id));
    expect(new Set(words.map((w) => w.text)).size).toBe(words.length);
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/content/ladder.test.ts`
Expected: FAIL. Cannot find module `./ladder`.

- [ ] **Step 3: Write the implementation**

```ts
// src/content/ladder.ts
// The 词语 of his word ladder beyond single characters (spec 2026-10-06 §3.1): each in-range character's 组词 and the HSK 1–3
// words, each arriving just after the last of its characters in school order. Static content: never stored or paused; a
// word's progress lives on its cards (ids `w:<text>:<kind>`).
import { pinyin } from 'pinyin-pro';
import type { Level, Word } from '../types';
import { glossFor } from './glossary';
import { builtinWords, EXAMPLE_FIXES, HSK_WORDS, schoolTerm } from './index';

export const ladderId = (text: string): string => `w:${text}`;
export const isLadderId = (id: string): boolean => id.startsWith('w:');

let cache: { words: Word[]; byId: Map<string, Word> } | null = null;

function build(now: number): Word[] {
  const chars = builtinWords(now).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text));
  const rankOf = new Map(chars.map((w) => [w.text, w.rank!]));
  const levelOf = new Map(chars.map((w) => [w.text, w.level ?? 7]));
  const found = new Map<string, string>(); // text → pinyin
  for (const c of chars) for (const e of c.examples ?? []) if (Array.from(e.text).length > 1 && !found.has(e.text)) found.set(e.text, e.pinyin);
  for (const [text, level] of HSK_WORDS) if (level <= 3 && Array.from(text).length > 1 && !found.has(text)) found.set(text, EXAMPLE_FIXES[text] ?? pinyin(text));
  const rows: { text: string; py: string; last: number; meaning: string }[] = [];
  for (const [text, py] of found) {
    const cs = Array.from(text);
    if (!cs.every((c) => rankOf.has(c))) continue; // a character outside his range
    if (py.trim().split(/\s+/).length !== cs.length) continue; // pinyin that doesn't line up can't be checked or said
    const meaning = glossFor(text);
    if (!meaning) continue; // a word with no meaning can't be heard or read for meaning
    rows.push({ text, py, last: Math.max(...cs.map((c) => rankOf.get(c)!)), meaning });
  }
  rows.sort((a, b) => a.last - b.last || (HSK_WORDS.get(a.text) ?? 9) - (HSK_WORDS.get(b.text) ?? 9) || a.text.length - b.text.length || (a.text < b.text ? -1 : 1));
  let prev = -1;
  let k = 0;
  return rows.map(({ text, py, last, meaning }) => {
    k = last === prev ? k + 1 : 1;
    prev = last;
    const level = (HSK_WORDS.get(text) ?? Math.max(...Array.from(text).map((c) => levelOf.get(c)!))) as Level;
    return { id: ladderId(text), text, pinyin: py, meaning, level, rank: last + k / 1000, source: 'builtin', writeable: false, paused: false, createdAt: now };
  });
}

/** The ladder words in order (now = 0: the shared, cached list). */
export function ladderWords(now = 0): Word[] {
  if (now !== 0) return build(now);
  if (!cache) {
    const words = build(0);
    cache = { words, byId: new Map(words.map((w) => [w.id, w])) };
  }
  return cache.words;
}

export function ladderWord(id: string): Word | undefined {
  if (!cache) ladderWords();
  return cache!.byId.get(id);
}
```

- [ ] **Step 4: Run the test to check that it passes**

Run: `npx vitest run src/content/ladder.test.ts`
Expected: PASS. Note the word count in the ledger. If the 8000 ceiling fails, report the count to the parent rather than raising it.

- [ ] **Step 5: Commit**

```bash
git add src/content/ladder.ts src/content/ladder.test.ts
git commit -m "feat(ladder): the 词语 of his word ladder — 组词 and HSK 1–3 words, each just after its last character in school order"
```

---

### Task 2: Rungs and the pass rule

**Files:**
- Create: `src/ladder/rungs.ts`
- Test: `src/ladder/rungs.test.ts`
- Modify: `src/types.ts:61-81` (`CardKind`, `CardRecord`)

**Interfaces:**
- Consumes: `ReviewLog`, `CardKind`, `Word` (types); `meaningCue` (src/activities/flashcards/meaning.ts); `localDateKey` (src/lib/date.ts).
- Produces:
  - `type RungKind = 'hear' | 'read' | 'use'`
  - `RUNGS: RungKind[]`
  - `RUNG_CARD: Record<RungKind, CardKind>`
  - `rungOf(kind: CardKind): RungKind | null`
  - `PASS_DAYS = 2`
  - `FAST_FLOOR_MS = 400`
  - `fastLimit(logs: ReviewLog[], kind: CardKind): number`
  - `passedAt(logs: ReviewLog[], cardId: string, fastMs: number): number | null`
  - `canAskRung(word: Word, rung: RungKind): boolean`
  - `nextRung(word: Word, rung: RungKind): RungKind | null`
  - `isOwned(word: Word, passed: ReadonlySet<RungKind>): boolean`
  - `CardKind` gains `'hear'`; `CardRecord` gains `passed?: number`

- [ ] **Step 1: Write the failing test**

```ts
// src/ladder/rungs.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { ReviewLog } from '../types';
import { canAskRung, FAST_FLOOR_MS, fastLimit, isOwned, nextRung, passedAt, RUNG_CARD, rungOf } from './rungs';

const log = (date: string, hour: number, correct: boolean, responseMs = 2000, cardId = 'b:门:hear'): ReviewLog =>
  ({ cardId, wordId: 'b:门', kind: 'hear', at: new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime(), rating: correct ? 3 : 1, correct, responseMs });

describe('rungs', () => {
  it('Read is the reading card and Use the meaning card, so his progress carries over', () => {
    expect(RUNG_CARD).toEqual({ hear: 'hear', read: 'recognise', use: 'meaning' });
    expect(rungOf('recognise')).toBe('read');
    expect(rungOf('write')).toBeNull();
  });
});

describe('passing (spec 2026-10-06 §3.2)', () => {
  it('passes on the second day whose first answer was right', () => {
    const at = passedAt([log('2026-10-01', 9, true), log('2026-10-02', 9, true)], 'b:门:hear', FAST_FLOOR_MS);
    expect(at).toBe(new Date('2026-10-02T09:00:00').getTime());
  });
  it('one day is never enough, however many right answers', () => {
    expect(passedAt([log('2026-10-01', 9, true), log('2026-10-01', 10, true), log('2026-10-01', 11, true)], 'b:门:hear', FAST_FLOOR_MS)).toBeNull();
  });
  it("only a day's first answer counts: a wrong first try and a right retry is not a passing day", () => {
    expect(passedAt([log('2026-10-01', 9, false), log('2026-10-01', 10, true), log('2026-10-02', 9, true)], 'b:门:hear', FAST_FLOOR_MS)).toBeNull();
  });
  it('an implausibly fast answer does not count', () => {
    expect(passedAt([log('2026-10-01', 9, true, 150), log('2026-10-02', 9, true)], 'b:门:hear', FAST_FLOOR_MS)).toBeNull();
  });
  it("other cards' answers are not this card's", () => {
    expect(passedAt([log('2026-10-01', 9, true), log('2026-10-02', 9, true, 2000, 'b:大:hear')], 'b:门:hear', FAST_FLOOR_MS)).toBeNull();
  });
  it("the fast limit is a quarter of his usual right answer, never under the floor", () => {
    const many = Array.from({ length: 20 }, (_, i) => log('2026-10-01', 9, true, 4000 + i));
    expect(fastLimit(many, 'hear')).toBeGreaterThanOrEqual(1000);
    expect(fastLimit(many.slice(0, 5), 'hear')).toBe(FAST_FLOOR_MS); // too few answers to know his pace
  });
});

describe('opening and owning', () => {
  const withCue = makeWord('门', { examples: [{ text: '门口', pinyin: 'mén kǒu' }] });
  const noCue = makeWord('口', { examples: [] });
  it('Hear → Read → Use; Use only when the word can be used in a question', () => {
    expect(nextRung(withCue, 'hear')).toBe('read');
    expect(nextRung(withCue, 'read')).toBe('use');
    expect(nextRung(noCue, 'read')).toBeNull();
    expect(canAskRung(noCue, 'use')).toBe(false);
  });
  it('owned: every rung it can be asked has passed', () => {
    expect(isOwned(noCue, new Set(['hear', 'read']))).toBe(true);
    expect(isOwned(withCue, new Set(['hear', 'read']))).toBe(false);
    expect(isOwned(withCue, new Set(['hear', 'read', 'use']))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/ladder/rungs.test.ts`
Expected: FAIL. Cannot find module `./rungs`.

- [ ] **Step 3: Write the implementation**

In `src/types.ts`:
- Change `export type CardKind = 'recognise' | 'write' | 'meaning';` to:

```ts
export type CardKind = 'recognise' | 'write' | 'meaning' | 'hear'; // hear: he understands it by ear (spec 2026-10-06 §3.2)
```

- Add to `CardRecord` (after `fsrs`):

```ts
  passed?: number; // when its rung passed: two days' right first answers (spec 2026-10-06 §3.2), or earned before the ladder
```

```ts
// src/ladder/rungs.ts
// The word ladder's rungs (spec 2026-10-06 §3.2): heard, read, used. Read and Use are the reading and meaning cards he
// already had, so nothing he has learned is lost; Hear is new. A rung passes on two different days' right first answers.
import { meaningCue } from '../activities/flashcards/meaning';
import { localDateKey } from '../lib/date';
import type { CardKind, ReviewLog, Word } from '../types';

export type RungKind = 'hear' | 'read' | 'use';
export const RUNGS: RungKind[] = ['hear', 'read', 'use'];
export const RUNG_CARD: Record<RungKind, CardKind> = { hear: 'hear', read: 'recognise', use: 'meaning' };
export const rungOf = (kind: CardKind): RungKind | null => RUNGS.find((r) => RUNG_CARD[r] === kind) ?? null;

export const PASS_DAYS = 2;
export const FAST_FLOOR_MS = 400;
const FAST_SHARE = 0.25;
const FAST_SAMPLE = 40;
const FAST_MIN_SAMPLE = 10;

/** Quicker than this is a guess, not an answer: a quarter of his usual right answer for this kind, never under 400 ms. */
export function fastLimit(logs: ReviewLog[], kind: CardKind): number {
  const times = logs.filter((l) => l.kind === kind && l.correct && typeof l.responseMs === 'number').slice(-FAST_SAMPLE).map((l) => l.responseMs!);
  if (times.length < FAST_MIN_SAMPLE) return FAST_FLOOR_MS;
  const sorted = [...times].sort((a, b) => a - b);
  return Math.max(FAST_FLOOR_MS, Math.round(FAST_SHARE * sorted[Math.floor(sorted.length / 2)]!));
}

/** When the card passed: the answer that made the second day whose first answer was right and not too fast; else null. */
export function passedAt(logs: ReviewLog[], cardId: string, fastMs: number): number | null {
  const firsts = new Map<string, ReviewLog>();
  for (const l of [...logs].filter((x) => x.cardId === cardId).sort((a, b) => a.at - b.at)) {
    const day = localDateKey(new Date(l.at));
    if (!firsts.has(day)) firsts.set(day, l);
  }
  let days = 0;
  for (const l of firsts.values()) {
    if (!l.correct || (typeof l.responseMs === 'number' && l.responseMs < fastMs)) continue;
    if (++days >= PASS_DAYS) return l.at;
  }
  return null;
}

/** Whether a rung can be asked of this word: hearing and reading always; using needs a question to use it in. */
export function canAskRung(word: Word, rung: RungKind): boolean {
  return rung !== 'use' || meaningCue(word) !== null;
}

/** The rung that opens when this one passes: the next one the word can be asked, or none. */
export function nextRung(word: Word, rung: RungKind): RungKind | null {
  return RUNGS.slice(RUNGS.indexOf(rung) + 1).find((r) => canAskRung(word, r)) ?? null;
}

export function isOwned(word: Word, passed: ReadonlySet<RungKind>): boolean {
  return RUNGS.every((r) => !canAskRung(word, r) || passed.has(r));
}
```

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/ladder/rungs.test.ts && npx tsc --noEmit -p .`
Expected: PASS. tsc then reports every `Record<CardKind, …>` that is now missing `hear`, for example `src/stats/skills.ts` `LOG_SKILL`. Task 3 fixes those. If tsc lists any file Task 3 doesn't cover, add `hear` there in this task and record it in the ledger.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/ladder/rungs.ts src/ladder/rungs.test.ts
git commit -m "feat(ladder): rungs — heard, read, used — passing on two days' right first answers"
```

---

### Task 3: Hear as a skill; stores know hear cards

**Files:**
- Modify:
  - `src/types.ts:84` (`Skill` adds `'listening'`)
  - `src/stats/skills.ts:3-8`
  - `src/parent/SkillsPanel.tsx:11` (`LABEL`)
  - `src/store/repo.ts:96-105` (`deleteWord`) and `repo.ts:115-148` (add `logsForCard`)
- Test: `src/stats/skills.test.ts` (add a case), `src/store/repo.test.ts` (add cases)

**Interfaces:**
- Produces:
  - `Skill` includes `'listening'`
  - `SKILLS` starts `['listening', 'reading', …]`
  - `logsForCard(db: AppDb, cardId: string): Promise<ReviewLog[]>`

- [ ] **Step 1: Write the failing tests**

Append to `src/stats/skills.test.ts`:

```ts
describe('listening (spec 2026-10-06 §3.2)', () => {
  it('hear answers are counted as listening', () => {
    const logs = [{ cardId: 'b:门:hear', wordId: 'b:门', kind: 'hear' as const, at: 1, rating: 3 as const, correct: true }];
    expect(skillAccuracy(logs, []).listening).toEqual({ right: 1, total: 1 });
  });
});
```

Append to `src/store/repo.test.ts` (it already imports `freshDb`, `makeWord`, `makeCard`, `putWords`, `putCards`, `allCards`, `addReviewLog`, `deleteWord`; add `logsForCard` to the import from `./repo`):

```ts
describe('hear cards', () => {
  it('deleting a word deletes its hear card too', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('门')]);
    await putCards(db, [makeCard('b:门', 'hear', new Date())]);
    await deleteWord(db, 'b:门');
    expect(await allCards(db)).toEqual([]);
  });
  it("a card's own answers", async () => {
    const db = await freshDb();
    await addReviewLog(db, { cardId: 'b:门:hear', wordId: 'b:门', kind: 'hear', at: 1, rating: 3, correct: true });
    await addReviewLog(db, { cardId: 'b:大:hear', wordId: 'b:大', kind: 'hear', at: 2, rating: 3, correct: true });
    expect((await logsForCard(db, 'b:门:hear')).map((l) => l.wordId)).toEqual(['b:门']);
  });
});
```

- [ ] **Step 2: Run the tests to check that they fail**

Run: `npx vitest run src/stats/skills.test.ts src/store/repo.test.ts`
Expected: FAIL. `listening` is undefined, and `logsForCard` is not exported.

- [ ] **Step 3: Write the implementation**

- `src/types.ts`: `export type Skill = 'listening' | 'reading' | 'meaning' | 'use' | 'zibian' | 'writing';`
- `src/stats/skills.ts`:

```ts
export const SKILLS: Skill[] = ['listening', 'reading', 'meaning', 'use', 'zibian', 'writing'];
export const SKILL_CARD: Record<Skill, CardKind> = { listening: 'hear', reading: 'recognise', meaning: 'meaning', use: 'meaning', zibian: 'write', writing: 'write' };
const LOG_SKILL: Record<CardKind, Skill> = { hear: 'listening', recognise: 'reading', meaning: 'meaning', write: 'writing' };
```

- `src/parent/SkillsPanel.tsx`: add `listening: 'Listening (understands the word when he hears it)'` to `LABEL`. Its type is `Record<Skill, string>`, so tsc enforces the entry.
- `src/store/repo.ts` `deleteWord`: add `tx.objectStore('cards').delete(\`${id}:hear\`),` beside the other three. Then add:

```ts
/** Every answer on one card, oldest first (a rung's pass is worked out from them). */
export async function logsForCard(db: AppDb, cardId: string): Promise<ReviewLog[]> {
  return (await db.getAll('reviewLogs')).filter((l) => l.cardId === cardId).sort((a, b) => a.at - b.at);
}
```

Import `ReviewLog` from `../types` if it isn't already.

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/stats src/store src/parent && npx tsc --noEmit -p .`
Expected: PASS. tsc is clean.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/stats/skills.ts src/stats/skills.test.ts src/parent/SkillsPanel.tsx src/store/repo.ts src/store/repo.test.ts
git commit -m "feat(ladder): listening is a skill; hear cards are deleted with their word; a card's own answers"
```

---

### Task 4: Recording an answer passes rungs and opens the next

**Files:**
- Create: `src/ladder/words.ts`
- Modify: `src/session/record.ts` (`recordRecognition`, `recordMeaning`, `recordWriting`; add `recordHear` and `settleRung`)
- Test: `src/session/recordRung.test.ts`

**Interfaces:**
- Consumes: `passedAt`, `fastLimit`, `rungOf`, `nextRung`, `RUNG_CARD` (Task 2); `logsForCard` (Task 3); `ladderWord`, `isLadderId` (Task 1).
- Produces:
  - `findWord(db: AppDb, id: string): Promise<Word | undefined>`
  - `recordHear(db, wordId, outcome: { correct: boolean; responseMs: number }, now: Date): Promise<CardRecord>`
  - `settleRung(db, wordId: string, kind: CardKind, now: Date): Promise<CardRecord | undefined>`: sets `passed` and opens the next rung's card, due at the start of the next local day

- [ ] **Step 1: Write the failing test**

```ts
// src/session/recordRung.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import { allCards, getCard, putWords } from '../store/repo';
import { recordHear, recordMeaning, recordRecognition } from './record';
import { ladderWords } from '../content/ladder';

const day = (d: string, h = 9) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`);
const right = { correct: true, responseMs: 2500 };

describe('recording a rung answer (spec 2026-10-06 §3.2)', () => {
  it('a hear card passes on its second right day and opens the reading card, due the next morning', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('门', { examples: [{ text: '门口', pinyin: 'mén kǒu' }] })]);
    await recordHear(db, 'b:门', right, day('2026-10-01'));
    expect((await getCard(db, 'b:门:hear'))?.passed).toBeUndefined();
    await recordHear(db, 'b:门', right, day('2026-10-02'));
    expect((await getCard(db, 'b:门:hear'))?.passed).toBe(day('2026-10-02').getTime());
    const read = await getCard(db, 'b:门:recognise');
    expect(read?.fsrs.due.getTime()).toBe(new Date('2026-10-03T00:00:00').getTime());
  });
  it('reading passed opens Use only for a word that can be used in a question', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('门', { examples: [{ text: '门口', pinyin: 'mén kǒu' }] }), makeWord('口', { examples: [] })]);
    for (const id of ['b:门', 'b:口']) {
      await recordRecognition(db, id, right, day('2026-10-01'));
      await recordRecognition(db, id, right, day('2026-10-02'));
    }
    const kinds = (await allCards(db)).map((c) => c.id).sort();
    expect(kinds).toContain('b:门:meaning');
    expect(kinds).not.toContain('b:口:meaning');
  });
  it('an opened card never replaces one he already has', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('门', { examples: [{ text: '门口', pinyin: 'mén kǒu' }] })]);
    await recordRecognition(db, 'b:门', right, day('2026-09-20')); // a reading card from before the ladder
    const before = (await getCard(db, 'b:门:recognise'))!.fsrs;
    await recordHear(db, 'b:门', right, day('2026-10-01'));
    await recordHear(db, 'b:门', right, day('2026-10-02'));
    expect((await getCard(db, 'b:门:recognise'))!.fsrs).toEqual(before);
  });
  it('ladder words (not stored) open their rungs too', async () => {
    const db = await freshDb();
    const w = ladderWords()[0]!;
    await recordHear(db, w.id, right, day('2026-10-01'));
    await recordHear(db, w.id, right, day('2026-10-02'));
    expect(await getCard(db, `${w.id}:recognise`)).toBeDefined();
  });
  it('a meaning answer passes the Use rung', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('门', { examples: [{ text: '门口', pinyin: 'mén kǒu' }] })]);
    await recordMeaning(db, 'b:门', right, day('2026-10-01'));
    await recordMeaning(db, 'b:门', right, day('2026-10-02'));
    expect((await getCard(db, 'b:门:meaning'))?.passed).toBe(day('2026-10-02').getTime());
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/session/recordRung.test.ts`
Expected: FAIL. `recordHear` is not exported.

- [ ] **Step 3: Write the implementation**

```ts
// src/ladder/words.ts
// A word by id: one he has stored (built-in characters, the parent's words) or a ladder word (static content, spec §3.1).
import { isLadderId, ladderWord } from '../content/ladder';
import type { AppDb } from '../store/db';
import { getWord } from '../store/repo';
import type { Word } from '../types';

export async function findWord(db: AppDb, id: string): Promise<Word | undefined> {
  return isLadderId(id) ? ladderWord(id) : getWord(db, id);
}
```

In `src/session/record.ts`:
1. Add these imports:

```ts
import { addDays, endOfLocalDay, localDateKey, startOfLocalDay } from '../lib/date';
import { fastLimit, nextRung, passedAt, RUNG_CARD, rungOf } from '../ladder/rungs';
import { findWord } from '../ladder/words';
```

- `logsForCard` comes from `../store/repo`; add it to the existing import there.
- If `startOfLocalDay` doesn't exist in `src/lib/date.ts`, use `addDays(endOfLocalDay(now), 0)` plus 1 ms instead, and add `startOfLocalDay` to `src/lib/date.ts` as `(d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())`, with a test in `src/lib/date.test.ts`.

2. Add:

```ts
/**
 * After a rung's answer (spec 2026-10-06 §3.2): if this card has now had two days of right first answers, it passes, and the
 * word's next rung opens (due the next morning). A card already passed stays passed; an opened card never replaces one he has.
 */
export async function settleRung(db: AppDb, wordId: string, kind: CardKind, now: Date): Promise<CardRecord | undefined> {
  const card = await getCard(db, `${wordId}:${kind}`);
  if (!card || card.passed) return card;
  const logs = await logsForCard(db, card.id);
  const recent = (await logsSince(db, now.getTime() - 60 * 86_400_000)).filter((l) => l.kind === kind);
  const at = passedAt(logs, card.id, fastLimit(recent, kind));
  if (at === null) return card;
  const passed = { ...card, passed: at };
  await putCards(db, [passed]);
  const rung = rungOf(kind);
  const word = rung && (await findWord(db, wordId));
  const next = word ? nextRung(word, rung!) : null;
  if (next) {
    const id = `${wordId}:${RUNG_CARD[next]}`;
    if (!(await getCard(db, id))) {
      const due = addDays(startOfLocalDay(now), 1);
      await putCards(db, [{ id, wordId, kind: RUNG_CARD[next], fsrs: { ...newCard(now), due } }]);
    }
  }
  return passed;
}

/** He heard the word and picked its meaning (the Hear rung, spec 2026-10-06 §3.2). */
export async function recordHear(db: AppDb, wordId: string, outcome: { correct: boolean; responseMs: number }, now: Date): Promise<CardRecord> {
  const rating = toRating({ kind: 'recognise', ...outcome }); // same rule: wrong Again, slow Hard, else Good
  const card = await reviewCard(db, wordId, 'hear', rating, now);
  await addReviewLog(db, { cardId: card.id, wordId, kind: 'hear', at: now.getTime(), rating, ...outcome });
  return (await settleRung(db, wordId, 'hear', now)) ?? card;
}
```

3. At the end of `recordRecognition` and `recordMeaning`, replace `return card;` with:

```ts
  return (await settleRung(db, wordId, 'recognise', now)) ?? card;
```

(use `'meaning'` in `recordMeaning`). At the end of `recordWriting`, before `return card;`, add `await settleRung(db, wordId, 'write', now);` and return the fresh card: `return (await getCard(db, card.id))!;`. A write card isn't a rung (`rungOf('write')` is null), so it gets `passed` and opens nothing.

4. `reviewCard` keeps a card's `passed` field. Change its body to spread `existing`:

```ts
  const rec: CardRecord = { ...(existing ?? {}), id, wordId, kind, fsrs: review(existing?.fsrs ?? newCard(now), rating, now) };
```

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/session/recordRung.test.ts src/session/record.test.ts && npx tsc --noEmit -p .`
Expected: PASS.

If `record.test.ts` cases that compare whole card objects now fail on an extra `passed` field, change those assertions to `toMatchObject`. Don't change behaviour, and record each edited test in the ledger.

- [ ] **Step 5: Commit**

```bash
git add src/ladder/words.ts src/session/record.ts src/session/recordRung.test.ts src/lib/date.ts src/lib/date.test.ts src/session/record.test.ts
git commit -m "feat(ladder): an answer passes its rung on the second right day and opens the next rung's card"
```

---

### Task 5: Hear and read-for-meaning questions

**Files:**
- Modify:
  - `src/activities/flashcards/distractors.ts` (add `meaningChoices`)
  - `src/activities/flashcards/FlashcardStep.tsx` (quiz modes; `FlashResult.asked`)
  - `src/styles.css` (`.choices--english`)
- Test: `src/activities/flashcards/meaningChoices.test.ts`, `src/activities/flashcards/hearQuiz.test.tsx`

**Interfaces:**
- Consumes: `cardMeaning` (src/content/glossary.ts), `shuffle` and `Rng` (src/lib/random.ts).
- Produces:
  - `meaningChoices(word: Word, pool: Word[], rng: Rng): string[] | null`: the answer plus 3 others, shuffled; null if fewer than 3 others exist
  - `FlashcardStep` prop `ask` accepts `'hear' | 'meaningRead'`
  - `FlashResult.asked` adds `'hear'`. `meaningRead` reports `'read'`. A hear quiz that can't play falls back to `meaningRead` and reports `'read'`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/activities/flashcards/meaningChoices.test.ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../lib/random';
import { makeWord } from '../../test/fixtures';
import { meaningChoices } from './distractors';

const firstSense = (m: string) => m.split(/[;,]/)[0]!.trim().toLowerCase();

describe('meaning choices (the Hear rung)', () => {
  const target = makeWord('看', { meaning: 'to look; to see' });
  const pool = [
    target, makeWord('瞧', { meaning: 'to look' }), makeWord('大', { meaning: 'big' }), makeWord('小', { meaning: 'small' }),
    makeWord('门', { meaning: 'door' }), makeWord('水', { meaning: 'water' }), makeWord('火', { meaning: 'fire' }),
  ];
  it("the answer and three others, no two alike, none sharing the answer's first sense", () => {
    const c = meaningChoices(target, pool, mulberry32(1))!;
    expect(c).toHaveLength(4);
    expect(c).toContain('to look; to see');
    expect(new Set(c.map(firstSense)).size).toBe(4);
    expect(c.filter((x) => firstSense(x) === 'to look')).toHaveLength(1);
  });
  it('null when there are not three other meanings to choose from', () => {
    expect(meaningChoices(target, [target, makeWord('大', { meaning: 'big' })], mulberry32(1))).toBeNull();
  });
});
```

```tsx
// src/activities/flashcards/hearQuiz.test.tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
import { speak } from '../../audio/speech';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';
import { FlashcardStep } from './FlashcardStep';

const words = ['门:door', '大:big', '小:small', '水:water', '火:fire'].map((s) => { const [t, m] = s.split(':'); return makeWord(t!, { meaning: m! }); });

describe('the Hear question', () => {
  it('says the word, shows no characters, and he picks its meaning in English', async () => {
    const onDone = vi.fn();
    render(<FlashcardStep item={{ wordId: 'b:门', isNew: false, retry: false }} word={words[0]!} pool={words} voice kid={DEFAULT_KID} resting="neutral" combo={0} closeupReady={false} onDone={onDone} ask="hear" />);
    expect(speak).toHaveBeenCalledWith('门', expect.anything());
    expect(screen.queryByText('门')).toBeNull();
    fireEvent.click(screen.getByText('door'));
    fireEvent.click(await screen.findByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'hear' }));
  });
  it('with no voice it reads for meaning instead, and says so', async () => {
    const onDone = vi.fn();
    render(<FlashcardStep item={{ wordId: 'b:门', isNew: false, retry: false }} word={words[0]!} pool={words} voice={false} kid={DEFAULT_KID} resting="neutral" combo={0} closeupReady={false} onDone={onDone} ask="hear" />);
    fireEvent.click(screen.getByText('door'));
    fireEvent.click(await screen.findByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'read' }));
  });
});
```

- [ ] **Step 2: Run the tests to check that they fail**

Run: `npx vitest run src/activities/flashcards/meaningChoices.test.ts src/activities/flashcards/hearQuiz.test.tsx`
Expected: FAIL. `meaningChoices` is not exported, and FlashcardStep doesn't accept `ask="hear"`.

- [ ] **Step 3: Write the implementation**

In `src/activities/flashcards/distractors.ts` add:

```ts
import { cardMeaning } from '../../content/glossary';

const sense = (m: string) => m.split(/[;,]/)[0]!.trim().toLowerCase();

/** Hear / read-for-meaning (spec 2026-10-06 §3.2): its English meaning and three others whose first sense differs, near its place in his order. */
export function meaningChoices(word: Word, pool: Word[], rng: Rng): string[] | null {
  const answer = cardMeaning(word);
  if (!answer) return null;
  const seen = new Set([sense(answer)]);
  const near = [...pool]
    .filter((w) => w.id !== word.id && !w.paused)
    .sort((a, b) => Math.abs((a.rank ?? 1e9) - (word.rank ?? 0)) - Math.abs((b.rank ?? 1e9) - (word.rank ?? 0)))
    .slice(0, 60);
  const others: string[] = [];
  for (const w of shuffle(near, rng)) {
    const m = cardMeaning(w);
    if (!m || seen.has(sense(m))) continue;
    seen.add(sense(m));
    others.push(m);
    if (others.length === 3) break;
  }
  return others.length === 3 ? shuffle([answer, ...others], rng) : null;
}
```

Use the file's existing imports for `shuffle`, `Rng` and `Word`, adding any that are missing.

In `src/activities/flashcards/FlashcardStep.tsx`:
1. Widen the props: `ask?: 'read' | 'listen' | 'word' | 'hear' | 'meaningRead';`. Widen `FlashResult.asked` to `'read' | 'meaning' | 'hear'`.
2. In the `quiz` memo, before the `lookAlikes` line, add the meaning modes. Extend the memo's return type with `mode: 'hear' | 'meaningRead' | null` and set `mode: null` on the existing returns:

```ts
    if (ask === 'hear' || ask === 'meaningRead') {
      const options = meaningChoices(word, pool, rng);
      if (options) {
        const hear = ask === 'hear' && voice; // no voice: he reads it for meaning instead (asked 'read', never graded as hearing)
        return { listen: hear, cue: null, answer: cardMeaning(word)!, options, cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: hear ? 'hear' : 'meaningRead' };
      }
    }
```

3. Make `next` report what was really asked:

```ts
  const next = () => {
    if (result) onDone({ ...result, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: quiz.cue?.kind === 'sentence', asked: quiz.cue ? 'meaning' : quiz.mode === 'hear' ? 'hear' : 'read', picked: choice ?? undefined });
  };
```

4. In the quiz prompt, a meaning mode shows the speak button (hear) or the word (meaningRead). The choices are English.
   - The existing `{quiz.listen ? <SpeakButton text={word.text} big /> : <div class="hanzi hanzi--q" data-q>{word.text}</div>}` already covers both, because `listen` is true only for hear.
   - Change the choices class expression to ``class={`choices stagger ${quiz.mode ? 'choices--english' : quiz.listen || quiz.cue ? 'choices--hanzi' : 'choices--pinyin'}`}``.
   - Give each English option `lang="en"`.
5. Bubble line: when `quiz.mode === 'hear'`, the quiz bubble reads `'听一听，是什么意思？'`. When `quiz.mode === 'meaningRead'` it reads `'这个词是什么意思？'`.
6. Feedback on a miss: `MeaningNote` already shows the right word, `word.text` and `word.pinyin`. For meaning modes, set its `picked` to `null`; the English is the option itself.
7. `src/styles.css`: add

```css
.choices--english .choice { font-size: clamp(17px, 2.3vh, 22px); line-height: 1.25; padding: 10px 12px; text-wrap: balance; }
```

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/activities/flashcards && npx tsc --noEmit -p .`
Expected: PASS, including the existing FlashcardStep tests.

- [ ] **Step 5: Layout check in WebKit**

Run: `npm run build && FIT_ONLY=flash npx tsx scripts/fit-check.ts`. If the sweep has no case for a hear quiz, add one to `scripts/stage-cases.ts` beside the existing flash cases: `ask: 'hear'`, the word 门 with meaning "door", 4 English choices. Run `npx tsx scripts/stage-cases.ts`.
Expected: no clipping or overflow at any size, including `iphone-safari` 390×664. Choices are at least 46 px tall.

- [ ] **Step 6: Commit**

```bash
git add src/activities/flashcards src/styles.css scripts/stage-cases.ts
git commit -m "feat(ladder): the Hear question — he hears the word and picks its meaning — and reading for meaning"
```

---

### Task 6: Planning a lesson on the ladder

**Files:**
- Modify:
  - `src/session/plan.ts:36-86` (`buildSessionPlan`)
  - `src/types.ts` (`SessionPlan.hearReviewIds?: string[]`)
  - `src/session/record.ts:101-104` (`planNow`)
- Test: `src/session/planLadder.test.ts`

**Interfaces:**
- Consumes: `ladderWords()` (Task 1); `passed` on cards (Task 4).
- Produces:
  - `SessionPlan.hearReviewIds?: string[]`: due hear cards, at most `HEAR_REVIEW_CAP = 40`
  - New words include ladder words in rank order
  - A word counts as started once it has a hear or reading card
  - `newMeaningIds` only takes words whose reading card has passed

- [ ] **Step 1: Write the failing test**

```ts
// src/session/planLadder.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { makeCard, makeWord } from '../test/fixtures';
import { buildSessionPlan, HEAR_REVIEW_CAP } from './plan';
import { ladderWord, ladderWords } from '../content/ladder';

const now = new Date('2026-10-06T09:00:00');
const settings = { ...DEFAULT_SETTINGS, newPerDay: 8 };

describe('planning on the word ladder (spec 2026-10-06 §3)', () => {
  it('ladder words come in their order, right after their characters', () => {
    const lw = ladderWords()[0]!;
    const chars = Array.from(lw.text).map((c, i) => makeWord(c, { rank: lw.rank! - 1 - i }));
    const started = chars.map((w) => makeCard(w.id, 'hear', new Date('2026-10-10'))); // his characters are begun
    const plan = buildSessionPlan({ cards: started, words: [...chars, lw], settings, now, newPerDay: 1 });
    expect(plan.newWordIds).toEqual([lw.id]);
  });
  it('due hear cards are reviewed', () => {
    const w = makeWord('门');
    const plan = buildSessionPlan({ cards: [makeCard('b:门', 'hear', new Date('2026-10-06T08:00:00'))], words: [w], settings, now });
    expect(plan.hearReviewIds).toEqual(['b:门']);
  });
  it('a word with a hear card is begun: never new again', () => {
    const w = makeWord('门');
    const plan = buildSessionPlan({ cards: [makeCard('b:门', 'hear', new Date('2026-10-20'))], words: [w], settings, now });
    expect(plan.newWordIds).toEqual([]);
  });
  it('Use (meaning practice) starts only once Read has passed', () => {
    const a = makeWord('门', { examples: [{ text: '门口', pinyin: 'mén kǒu' }] });
    const b = makeWord('口', { examples: [{ text: '口水', pinyin: 'kǒu shuǐ' }] });
    const cards = [{ ...makeCard('b:门', 'recognise', new Date('2026-10-20')), passed: 1 }, makeCard('b:口', 'recognise', new Date('2026-10-20'))];
    const plan = buildSessionPlan({ cards, words: [a, b], settings, now });
    expect(plan.newMeaningIds).toEqual(['b:门']);
  });
  it('a card whose word no longer exists is skipped', () => {
    const plan = buildSessionPlan({ cards: [makeCard('w:没有了', 'hear', new Date('2026-10-01'))], words: [], settings, now });
    expect(plan.hearReviewIds).toEqual([]);
  });
  it('at most HEAR_REVIEW_CAP hear reviews a lesson', () => {
    const ws = Array.from({ length: HEAR_REVIEW_CAP + 5 }, (_, i) => makeWord(`字${i}`));
    const cards = ws.map((w) => makeCard(w.id, 'hear', new Date('2026-10-01')));
    expect(buildSessionPlan({ cards, words: ws, settings, now }).hearReviewIds).toHaveLength(HEAR_REVIEW_CAP);
  });
});
```

`ladderWord` is imported so the test fails loudly if Task 1's export changes.

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/session/planLadder.test.ts`
Expected: FAIL. `HEAR_REVIEW_CAP` is not exported, and `hearReviewIds` is undefined.

- [ ] **Step 3: Write the implementation**

In `src/types.ts` `SessionPlan`, add `hearReviewIds?: string[]; // due Hear cards (spec 2026-10-06 §3.2)`.

In `src/session/plan.ts`:
1. Add `export const HEAR_REVIEW_CAP = 40;`.
2. Change `started` to count a hear card or a reading card:

```ts
  const recognise = ofKind('recognise');
  const hear = ofKind('hear');
  const started = new Set([...recognise, ...hear].map((c) => c.wordId));
```

3. Add the hear reviews, and gate meaning starts on Read having passed:

```ts
  const readPassed = new Set(recognise.filter((c) => c.passed).map((c) => c.wordId));
```

In the `newMeaningIds` filter, replace the "begun" test (`started.has(w.id)`) with `readPassed.has(w.id)`. Leave the rest of that filter unchanged.

4. In the returned plan add:

```ts
    hearReviewIds: dueOf(hear).slice(0, HEAR_REVIEW_CAP).map((c) => c.wordId),
```

`dueOf` already drops cards whose word isn't active (`activeIds`), which is what skips a vanished word.

In `src/session/record.ts` `planNow`, pass the ladder words too:

```ts
  return buildSessionPlan({ cards, words: [...words, ...ladderWords()], settings, now, practised, newPerDay: await todaysPace(db, now, settings) });
```

Add `import { ladderWords } from '../content/ladder';`.

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/session && npx tsc --noEmit -p .`
Expected: `planLadder.test.ts` passes. Existing `plan.test.ts` cases that assume a word with only a reading card starts meaning practice, or that read `newMeaningIds` from begun words, now fail by design. Update each one to give the reading card `passed: 1`, and note it in the ledger as an intended change from spec §3.2. Fix no other failures this way: investigate them.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/session/plan.ts src/session/record.ts src/session/planLadder.test.ts src/session/plan.test.ts
git commit -m "feat(ladder): lessons bring new words in ladder order, review due hear cards, and start Use once Read has passed"
```

---

### Task 7: 认新字 asks Hear; 练一练 asks and grades the ladder

**Files:**
- Modify:
  - `src/session/round.ts`: `Ask` adds `'hear' | 'meaningRead'`; `ASKS[1]`; `Grades` adds `'hear'`; `RoundWord.gradesHear`; first-appearance grading
  - `src/session/practice.ts`: `practiceWords` adds hear-due words; `canAsk` for the new asks
  - `src/activities/practice/PracticeQuestion.tsx`: `PracticeResult.asked` adds `'hear'`; FlashcardStep gets `ask` for the new asks
  - `src/app/SessionScreen.tsx`: line 388 `ask` for 认新字 becomes `'hear'`; `onFlashDone` and `onPracticeDone` grading; ladder words in `wordsById` and the meaning pool
- Test: `src/session/roundLadder.test.ts`, `src/app/sessionLadder.test.tsx`

**Interfaces:**
- Consumes: `recordHear` (Task 4); `hearReviewIds` (Task 6); FlashcardStep `ask: 'hear' | 'meaningRead'` (Task 5); `ladderWords`, `ladderWord` (Task 1).
- Produces:
  - `Ask` includes `'hear' | 'meaningRead'`
  - `Grades` includes `'hear'`
  - `RoundWord.gradesHear?: boolean`
  - A first appearance with `gradesHear` is asked as `'hear'` and graded `'hear'`

- [ ] **Step 1: Write the failing tests**

```ts
// src/session/roundLadder.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { buildRound } from './round';

const all = () => true;

describe('练一练 on the ladder', () => {
  it("a word whose hear card is due is first asked by ear, and that answer grades its hear card", () => {
    const items = buildRound([{ wordId: 'b:门', isNew: false, from: 1, appearances: 2, gradesRecognise: false, gradesMeaning: false, gradesHear: true, due: true }], all, mulberry32(1));
    expect(items[0]).toMatchObject({ wordId: 'b:门', ask: 'hear', grades: 'hear' });
    expect(items[1]?.grades).toBeNull();
  });
  it('rung 1 can be asked by ear or read for meaning, as well as read aloud', () => {
    const asks = new Set<string>();
    for (let s = 1; s < 40; s++) {
      const items = buildRound([{ wordId: 'w:门口', isNew: true, from: 1, appearances: 1, gradesRecognise: false, gradesMeaning: false }], (_id, a) => a === 'hear' || a === 'meaningRead', mulberry32(s));
      asks.add(items[0]!.ask);
    }
    expect([...asks].sort()).toEqual(['hear', 'meaningRead']);
  });
});
```

```tsx
// src/app/sessionLadder.test.tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
import { allCards, putWords, saveSession } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { builtinWords } from '../content';
import { SessionScreen } from './SessionScreen';
import { createSessionRecord } from '../session/runner';

describe('a lesson on the ladder', () => {
  it('认新字 asks a new word by ear, and the answer opens its hear card', async () => {
    const app = await makeAppData({ voice: true });
    await putWords(app.db, builtinWords(0).slice(0, 40));
    renderWithApp(<SessionScreen />, app);
    fireEvent.click(await screen.findByText('我记住了！'));
    expect(await screen.findByText('听一听，是什么意思？')).toBeTruthy();
    const choice = (await screen.findAllByRole('button')).find((b) => b.classList.contains('choice'))!;
    fireEvent.click(choice);
    await waitFor(async () => expect((await allCards(app.db)).some((c) => c.kind === 'hear')).toBe(true));
  });
  it('no voice: hear items are skipped, the lesson finishes', async () => {
    const app = await makeAppData({ voice: false });
    await putWords(app.db, builtinWords(0).slice(0, 10));
    renderWithApp(<SessionScreen />, app);
    fireEvent.click(await screen.findByText('我记住了！'));
    expect(await screen.findByText('这个词是什么意思？')).toBeTruthy(); // read for meaning, never graded as hearing
  });
  it('a lesson planned before the ladder resumes', async () => {
    const app = await makeAppData({ voice: true });
    await putWords(app.db, builtinWords(0).slice(0, 10));
    const old = createSessionRecord({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [builtinWords(0)[0]!.id], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, '2026-10-02', app.now().getTime());
    await saveSession(app.db, old); // no hearReviewIds
    renderWithApp(<SessionScreen />, app);
    expect(await screen.findByText('我记住了！')).toBeTruthy();
  });
});
```

`makeAppData` sets `now` to 2026-10-02 09:00. Check its exact option names in `src/test/renderWithApp.tsx` (e.g. `voice`) and match them.

- [ ] **Step 2: Run the tests to check that they fail**

Run: `npx vitest run src/session/roundLadder.test.ts src/app/sessionLadder.test.tsx`
Expected: FAIL. `gradesHear` isn't honoured, the asks don't exist, and 认新字 still asks 'listen'.

- [ ] **Step 3: Write the implementation**

`src/session/round.ts`:
- `export type Ask = 'read' | 'listen' | 'hear' | 'meaningRead' | 'word' | …` (keep the rest).
- `ASKS[1] = ['read', 'listen', 'hear', 'meaningRead']`.
- `export type Grades = 'recognise' | 'meaning' | 'use' | 'hear' | null;`
- Add `gradesHear?: boolean; // its hear card is due (or opens) today: its first appearance is asked by ear and grades it` to `RoundWord`.
- In `buildRound`, before choosing `pick` for a first appearance whose `s.w.gradesHear` is set and which `canAsk(id, 'hear')`, force `{ rung: 1, ask: 'hear' }`. In the grades chain, add a first branch: `if (s.next === 0 && s.w.gradesHear && ask === 'hear') grades = 'hear'; else if …`. Concretely, replace the line `const plans = order.map(…)` with:

```ts
    const plans = order.map((s) => (s.next === 0 && s.w.gradesHear && canAsk(s.w.wordId, 'hear') ? { s, rung: 1 as Rung, ask: 'hear' as Ask } : { s, ...askFor(s.w.wordId, s.rungs[s.next]!, canAsk, lastAsk, rng) }));
```

and the start of the grades chain with:

```ts
    let grades: Grades = null;
    if (s.next === 0 && s.w.gradesHear && ask === 'hear') grades = 'hear';
    else if (s.next === 0 && s.w.gradesRecognise) grades = 'recognise';
```

(the remaining `else if` lines stay as they are).

`src/session/practice.ts`:
- In `practiceWords`, add hear-due words. Introduced new words' first practice appearance grades hear only if 认新字 didn't (it does), so they keep `gradesHear: false`. Add after the `reading` set:

```ts
  const hearing = new Set(rec.plan.hearReviewIds ?? []); // a lesson planned before the ladder has none
```

  Then include `...(rec.plan.hearReviewIds ?? [])` first in the revision id list. Give each revision word `gradesHear: hearing.has(wordId)`, and add `|| hearing.has(wordId)` to its `due`.
- In `canAsk`:

```ts
    case 'hear': return voice && meaningChoices(word, pool, mulberry32(1)) !== null;
    case 'meaningRead': return meaningChoices(word, pool, mulberry32(1)) !== null;
    case 'read': return Array.from(word.text).length === 1 || word.source === 'parent'; // reading aloud: characters, and his own lists as before
    case 'listen': return voice && Array.from(word.text).length === 1;
```

  `read` used to be always true. Ladder 词语 are read for meaning instead. Import `meaningChoices` from `../activities/flashcards/distractors`.
- The `planPractice` filter `askable(...)('read')` becomes `['read', 'meaningRead'].some((a) => askable(...)(a as Ask))`, so ladder words aren't dropped.

`src/activities/practice/PracticeQuestion.tsx`:
- `PracticeResult.asked` adds `'hear'`.
- Where it renders `FlashcardStep` for rung-1 asks, pass `ask={item.ask === 'hear' || item.ask === 'meaningRead' || item.ask === 'listen' || item.ask === 'read' ? item.ask : undefined}`. Check the existing branch and extend it, not duplicate it. Map the FlashResult `asked` through unchanged.

`src/app/SessionScreen.tsx`:
1. Line 388: `ask={step === 'newwords' ? 'hear' : undefined}`.
2. `onFlashDone`: a new word's 认新字 answer grades hear only when it was asked by ear. Replace the grading lines with:

```ts
      if (!item.retry && !rec.free) {
        const outcome = { correct: r.correct, responseMs: r.responseMs };
        if (r.asked === 'hear') know.cardsById.set(`${item.wordId}:hear`, await recordHear(db, item.wordId, outcome, now()));
        else if (!item.isNew) {
          const card = r.asked === 'meaning' ? await recordMeaning(db, item.wordId, outcome, now()) : await recordRecognition(db, item.wordId, outcome, now());
          know.cardsById.set(card.id, card);
        }
      }
```

   A new word read with no voice grades nothing. Its reading card opens through the ladder.
3. `onPracticeDone`: add first in the grades chain `if (item.grades === 'hear' && r.asked === 'hear') know.cardsById.set(\`${item.wordId}:hear\`, await recordHear(db, item.wordId, outcome, now()));`, and turn the following `if` into `else if`. Import `recordHear`.
4. Ladder words in lookups. Where state is built (`setState({ rec, know, … })`), extend `know.wordsById` with the ladder words the lesson uses:

```ts
      for (const w of ladderWords()) if (!know.wordsById.has(w.id)) know.wordsById.set(w.id, w);
```

   For the meaning pool, pass `[...state.know.words, ...ladderWords()]` wherever `planPractice` and `PracticeQuestion`/`FlashcardStep` receive `pool`, so ladder words get English distractors. Leave the zibian and character pools as they are. Import `ladderWords`.

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/session src/app src/activities --maxWorkers=2 && npx tsc --noEmit -p .`
Expected: the new tests pass.

Existing screen tests that walk 认新字 expecting the character listen quiz (`听一听，我想吃哪个字？`) or a recognise card after the first lesson now fail by design. For each one:
- Update it to the Hear flow, i.e. the English meaning choice and a hear card.
- Note it in the ledger.

Investigate any other failure with superpowers:systematic-debugging. Don't edit the test to make it pass.

- [ ] **Step 5: Layout check**

Run: `npm run build && npx tsx scripts/stage-cases.ts`
Expected: the 认新字 hear quiz fits at every size.

- [ ] **Step 6: Commit**

```bash
git add src/session src/activities/practice src/app src/types.ts
git commit -m "feat(ladder): 认新字 asks a new word by ear; 练一练 reviews due hear cards by ear and reads 词语 for meaning"
```

---

### Task 8: Honest counts

**Files:**
- Modify: `src/stats/stats.ts` (`Knowledge`, `summarize`), `src/app/knowledge.ts` (`loadKnowledge`)
- Test: `src/stats/ladderCounts.test.ts`

**Interfaces:**
- Consumes: `isOwned`, `rungOf` (Task 2); `ladderWords` (Task 1); `CardRecord.passed`.
- Produces: `Knowledge` gains:
  - `knownChars` and `known` now mean characters recognised (Read passed in any word containing them)
  - `heard`, `read`, `used`, `owned` (word counts)
  - `written` (write cards passed)
  - `ladderById: Map<string, Word>`

- [ ] **Step 1: Write the failing test**

```ts
// src/stats/ladderCounts.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import { summarize } from './stats';
import { ladderWords } from '../content/ladder';

const card = (wordId: string, kind: 'hear' | 'recognise' | 'meaning' | 'write', passed?: number) => ({ ...makeCard(wordId, kind, new Date('2026-10-20')), ...(passed ? { passed } : {}) });

describe('honest counts (spec 2026-10-06 §3.3–3.4)', () => {
  it('a character is recognised when any word with it has passed Read: a single character or a ladder word', () => {
    const lw = ladderWords()[0]!;
    const k = summarize([makeWord('门')], [card('b:门', 'recognise', 1), card(lw.id, 'recognise', 1)]);
    expect([...k.knownChars].sort()).toEqual([...new Set(['门', ...Array.from(lw.text)])].sort());
    expect(k.known).toBe(k.knownChars.size);
  });
  it('a reading card not yet passed recognises nothing', () => {
    expect(summarize([makeWord('门')], [card('b:门', 'recognise')]).known).toBe(0);
  });
  it('heard, read, used and owned words, and characters written', () => {
    const w = makeWord('口', { examples: [] }); // no question to use it in: owned once heard and read
    const k = summarize([w], [card('b:口', 'hear', 1), card('b:口', 'recognise', 1), card('b:口', 'write', 1)]);
    expect(k).toMatchObject({ heard: 1, read: 1, used: 0, owned: 1, written: 1 });
  });
  it('counts skip unknown words', () => {
    expect(summarize([], [card('w:没有了', 'recognise', 1)]).known).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/stats/ladderCounts.test.ts`
Expected: FAIL. `heard` is undefined, and the ladder word's characters aren't counted.

- [ ] **Step 3: Write the implementation**

In `src/stats/stats.ts`, replace `Knowledge` and `summarize` with:

```ts
export interface Knowledge {
  words: Word[];
  cards: CardRecord[];
  wordsById: Map<string, Word>;
  cardsById: Map<string, CardRecord>;
  ladderById: Map<string, Word>;
  knownWordIds: Set<string>; // words whose Read rung has passed
  knownChars: Set<string>; // characters recognised: in any word whose Read has passed (spec 2026-10-06 §3.3)
  known: number; // = knownChars.size
  heard: number;
  read: number;
  used: number;
  owned: number;
  written: number; // characters whose writing has passed
}

export function summarize(words: Word[], cards: CardRecord[]): Knowledge {
  const wordsById = new Map(words.map((w) => [w.id, w]));
  const ladderById = new Map(ladderWords().map((w) => [w.id, w]));
  const word = (id: string) => wordsById.get(id) ?? ladderById.get(id);
  const passedRungs = new Map<string, Set<RungKind>>();
  for (const c of cards) {
    const r = rungOf(c.kind);
    if (!r || !c.passed || !word(c.wordId)) continue;
    (passedRungs.get(c.wordId) ?? passedRungs.set(c.wordId, new Set()).get(c.wordId)!).add(r);
  }
  const count = (r: RungKind) => [...passedRungs.values()].filter((s) => s.has(r)).length;
  const knownWordIds = new Set([...passedRungs].filter(([, s]) => s.has('read')).map(([id]) => id));
  const knownChars = new Set<string>();
  for (const id of knownWordIds) for (const ch of Array.from(word(id)!.text)) if (/\p{Script=Han}/u.test(ch)) knownChars.add(ch);
  return {
    words, cards, wordsById, ladderById,
    cardsById: new Map(cards.map((c) => [c.id, c])),
    knownWordIds, knownChars, known: knownChars.size,
    heard: count('hear'), read: count('read'), used: count('use'),
    owned: [...passedRungs].filter(([id, s]) => isOwned(word(id)!, s)).length,
    written: cards.filter((c) => c.kind === 'write' && c.passed).length,
  };
}
```

Add these imports: `ladderWords` from `../content/ladder`; `isOwned`, `rungOf`, `type RungKind` from `../ladder/rungs`. `isEarned` may become unused here; remove it if so.

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/stats src/app src/parent --maxWorkers=2 && npx tsc --noEmit -p .`
Expected: the new tests pass.

Tests that seed `isEarned` reading cards with no `passed` and expect them counted as known now fail by design. Update them to set `passed`, and note each one in the ledger.

- [ ] **Step 5: Commit**

```bash
git add src/stats src/app/knowledge.ts src/app src/parent
git commit -m "feat(ladder): honest counts — characters recognised from passed reading, and words heard, read, used and owned"
```

---

### Task 9: The one-off migration

**Files:**
- Create: `src/ladder/migrate.ts`
- Modify:
  - `src/types.ts` (`Settings.ladderMigrated?: boolean`)
  - `src/bootstrap.ts:27` (after `applySettingsMigration`)
  - `src/store/backup.ts:164` (after the settings migration in `applyBackup`)
- Test: `src/ladder/migrate.test.ts`

**Interfaces:**
- Consumes: `isEarned` (src/srs/scheduler.ts); `newCard`; `allCards`, `putCards`, `allWords`, `getSettings`, `updateSettings`.
- Produces:
  - `migrateToLadder(db: AppDb, now: Date): Promise<boolean>` (true when it ran)
  - `queueHearChecks(db: AppDb, now: Date): Promise<number>` (hear cards made)
  - `HEAR_CHECKS_PER_DAY = 15`

- [ ] **Step 1: Write the failing test**

```ts
// src/ladder/migrate.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import { allCards, getSettings, putCards, putWords } from '../store/repo';
import { seededKnownCard } from '../srs/scheduler';
import { HEAR_CHECKS_PER_DAY, migrateToLadder } from './migrate';

const now = new Date('2026-10-06T09:00:00');

async function setup(n = 20) {
  const db = await freshDb();
  const words = Array.from({ length: n }, (_, i) => makeWord(`字${i}`, { rank: i }));
  await putWords(db, words);
  await putCards(db, [
    ...words.map((w) => ({ id: `${w.id}:recognise`, wordId: w.id, kind: 'recognise' as const, fsrs: seededKnownCard(now, 20) })),
    { id: 'b:字0:meaning', wordId: 'b:字0', kind: 'meaning', fsrs: seededKnownCard(now, 20) },
    makeCard('b:字1', 'write', new Date('2026-10-10')), // learning, not earned: never passed
  ]);
  return db;
}

describe('moving his progress onto the ladder (spec 2026-10-06 §3.6)', () => {
  it('earned reading and meaning cards are passed; nothing about their memory changes', async () => {
    const db = await setup();
    const before = new Map((await allCards(db)).map((c) => [c.id, c.fsrs]));
    expect(await migrateToLadder(db, now)).toBe(true);
    const after = await allCards(db);
    for (const c of after) if (before.has(c.id)) expect(c.fsrs, c.id).toEqual(before.get(c.id));
    expect(after.find((c) => c.id === 'b:字0:recognise')?.passed).toBe(now.getTime());
    expect(after.find((c) => c.id === 'b:字0:meaning')?.passed).toBe(now.getTime());
    expect(after.find((c) => c.id === 'b:字1:write')?.passed).toBeUndefined();
  });
  it('words he reads get a listening check, at most 15 a day, from tomorrow, in his order', async () => {
    const db = await setup(20);
    await migrateToLadder(db, now);
    const hear = (await allCards(db)).filter((c) => c.kind === 'hear').sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());
    expect(hear).toHaveLength(20);
    const days = new Map<string, number>();
    for (const c of hear) days.set(c.fsrs.due.toDateString(), (days.get(c.fsrs.due.toDateString()) ?? 0) + 1);
    expect(Math.max(...days.values())).toBeLessThanOrEqual(HEAR_CHECKS_PER_DAY);
    expect(hear[0]!.wordId).toBe('b:字0');
    expect(hear[0]!.fsrs.due.getTime()).toBeGreaterThan(now.getTime());
  });
  it('runs once; a second run changes nothing', async () => {
    const db = await setup();
    await migrateToLadder(db, now);
    const once = await allCards(db);
    expect(await migrateToLadder(db, now)).toBe(false);
    expect(await allCards(db)).toEqual(once);
    expect((await getSettings(db)).ladderMigrated).toBe(true);
  });
  it('a hear card he already has is never replaced', async () => {
    const db = await setup(2);
    await putCards(db, [makeCard('b:字0', 'hear', new Date('2026-10-30'))]);
    await migrateToLadder(db, now);
    expect((await allCards(db)).filter((c) => c.id === 'b:字0:hear')[0]!.fsrs.due.toISOString()).toBe(new Date('2026-10-30').toISOString());
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/ladder/migrate.test.ts`
Expected: FAIL. Cannot find module `./migrate`.

- [ ] **Step 3: Write the implementation**

```ts
// src/ladder/migrate.ts
// Moving his progress onto the word ladder, once (spec 2026-10-06 §3.6): cards he has earned count as passed, and every word he
// reads gets a listening check, a few a day. Old cards are never rewritten: an older build still reads everything.
import { addDays } from '../lib/date';
import { isEarned, newCard } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allCards, allWords, getSettings, putCards, updateSettings } from '../store/repo';
import { ladderWord } from '../content/ladder';
import type { CardRecord } from '../types';

export const HEAR_CHECKS_PER_DAY = 15;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Listening checks for words he reads with no hear card yet: in his order, at most 15 a day, from tomorrow. */
export async function queueHearChecks(db: AppDb, now: Date): Promise<number> {
  const [cards, words] = await Promise.all([allCards(db), allWords(db)]);
  const rank = new Map(words.map((w) => [w.id, w.rank ?? 1e9]));
  const hasHear = new Set(cards.filter((c) => c.kind === 'hear').map((c) => c.wordId));
  const reads = cards
    .filter((c) => c.kind === 'recognise' && !hasHear.has(c.wordId) && (rank.has(c.wordId) || ladderWord(c.wordId)))
    .sort((a, b) => (rank.get(a.wordId) ?? ladderWord(a.wordId)?.rank ?? 1e9) - (rank.get(b.wordId) ?? ladderWord(b.wordId)?.rank ?? 1e9));
  const made: CardRecord[] = reads.map((c, i) => ({
    id: `${c.wordId}:hear`, wordId: c.wordId, kind: 'hear',
    fsrs: { ...newCard(now), due: addDays(startOfDay(now), 1 + Math.floor(i / HEAR_CHECKS_PER_DAY)) },
  }));
  await putCards(db, made);
  return made.length;
}

export async function migrateToLadder(db: AppDb, now: Date): Promise<boolean> {
  if ((await getSettings(db)).ladderMigrated) return false;
  const cards = await allCards(db);
  const passed = cards.filter((c) => !c.passed && (c.kind === 'recognise' || c.kind === 'meaning' || c.kind === 'write') && isEarned(c.fsrs)).map((c) => ({ ...c, passed: now.getTime() }));
  await putCards(db, passed);
  await queueHearChecks(db, now);
  await updateSettings(db, { ladderMigrated: true });
  return true;
}
```

`src/types.ts` `Settings`: add `ladderMigrated?: boolean; // his cards moved onto the word ladder (spec 2026-10-06 §3.6)`.

`src/bootstrap.ts`, after `await applySettingsMigration(db);`:

```ts
  await migrateToLadder(db, new Date()); // once: earned cards pass, words he reads get listening checks
```

`src/store/backup.ts` `applyBackup`, after the settings migration call:

```ts
  await migrateToLadder(db, new Date()); // a backup from before the ladder moves over too (it checks its own flag)
```

Import `migrateToLadder` from `../ladder/migrate` in each file.

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/ladder src/bootstrap.test.ts src/store --maxWorkers=2 && npx tsc --noEmit -p .`
Expected: PASS.

`bootstrap.test.ts` cases that compare settings exactly may need `ladderMigrated: true`; update them and note each one in the ledger.

- [ ] **Step 5: Commit**

```bash
git add src/ladder/migrate.ts src/ladder/migrate.test.ts src/types.ts src/bootstrap.ts src/store/backup.ts src/bootstrap.test.ts src/store/backup.test.ts
git commit -m "feat(ladder): his progress moves onto the ladder once — earned cards pass, words he reads get listening checks"
```

---

### Task 10: Placement, pace, worlds and the dashboard on the ladder

**Files:**
- Modify:
  - `src/placement/apply.ts`: seeded cards pass; queue hear checks
  - `src/session/pace.ts:18`: kept = hear answers
  - `src/placement/journey.ts:9,13`: a passed Read counts
  - `src/parent/Dashboard.tsx:47`: trouble words include hear answers
- Test: `src/placement/applyLadder.test.ts`, plus an added case in `src/session/pace.test.ts`

**Interfaces:**
- Consumes: `queueHearChecks` (Task 9); `passed`.
- Produces: no new exports.

- [ ] **Step 1: Write the failing tests**

```ts
// src/placement/applyLadder.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { freshDb, makeWord } from '../test/fixtures';
import { allCards, putWords } from '../store/repo';
import { applyPlacement } from './apply';

describe('placement on the ladder', () => {
  it('words placed as read are passed for reading and get listening checks', async () => {
    const db = await freshDb();
    const ws = [makeWord('门', { rank: 0 }), makeWord('大', { rank: 1 })];
    await putWords(db, ws);
    await applyPlacement(db, { readingIds: ws.map((w) => w.id), understandingIds: [], missed: [], reading: 0, understanding: -1 }, new Date('2026-10-06T09:00:00'));
    const cards = await allCards(db);
    expect(cards.filter((c) => c.kind === 'recognise').every((c) => c.passed)).toBe(true);
    expect(cards.filter((c) => c.kind === 'hear').map((c) => c.wordId).sort()).toEqual(['b:大', 'b:门']);
  });
});
```

Append to `src/session/pace.test.ts` (it already defines `log(wordId, date, correct)` producing recognise logs; add a hear variant):

```ts
describe('pace on the ladder', () => {
  it('a new word is kept when he hears it right on a later day', () => {
    const hearLog = (wordId: string, date: string, correct: boolean) => ({ ...log(wordId, date, correct), cardId: `${wordId}:hear`, kind: 'hear' as const });
    const sessions = [{ date: '2026-10-01', plan: { newWordIds: ['b:门'] } }] as never;
    expect(keptRecent(sessions, [hearLog('b:门', '2026-10-02', true)], '2026-10-03')).toMatchObject({ kept: 1 });
  });
});
```

Match `keptRecent`'s real return shape: read pace.ts first, and if it returns a number, assert `toBe(1)` instead.

- [ ] **Step 2: Run the tests to check that they fail**

Run: `npx vitest run src/placement/applyLadder.test.ts src/session/pace.test.ts`
Expected: FAIL. The placement cards have no `passed` and there are no hear cards, and pace ignores hear logs.

- [ ] **Step 3: Write the implementation**

- `src/placement/apply.ts`, at the end of `applyPlacement` before saving settings: mark the reading cards it seeded as known with `passed: now.getTime()` (placement guesses count as passed, as migration does). Then `await queueHearChecks(db, now);`. Seeded understanding (meaning) cards get `passed` too.
- `src/session/pace.ts:18`: `const reads = logs.filter((l) => l.kind === 'recognise' || l.kind === 'hear').sort((a, b) => a.at - b.at);`. A new word is first answered by ear now.
- `src/placement/journey.ts`:
  - line 9: `const knownReading = (cards: CardRecord[]) => cards.filter((c) => c.kind === 'recognise' && (c.passed !== undefined || isEarned(c.fsrs)));`. A passed Read counts; earned keeps the count steady before migration.
  - line 13: leave as is.
- `src/parent/Dashboard.tsx:47`: `const readingLogs = d.logs.filter((l) => l.kind === 'recognise' || l.kind === 'hear');`

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/placement src/session src/parent --maxWorkers=2 && npx tsc --noEmit -p .`
Expected: PASS. For existing placement tests that compare the full card list, update them for the extra `passed` field and the hear cards, and note each one in the ledger.

- [ ] **Step 5: Commit**

```bash
git add src/placement src/session/pace.ts src/session/pace.test.ts src/parent/Dashboard.tsx
git commit -m "feat(ladder): placement passes what he reads and queues listening checks; pace, worlds and the dashboard count hearing"
```

---

### Task 11: The parent's Progress tab

**Files:**
- Modify: `src/content/index.ts` (add `MOE_TERMS`, `moeTargets`), `src/types.ts` (`Settings.grade?`), `src/parent/ParentArea.tsx:17-30`
- Create: `src/parent/ProgressPanel.tsx`, `src/parent/progress.ts`
- Test: `src/content/moeTargets.test.ts`, `src/parent/progress.test.ts`, `src/parent/progressPanel.test.tsx`

**Interfaces:**
- Consumes: `Knowledge` (Task 8).
- Produces:
  - `MOE_TERMS = ['一上', '一下', '二上', '二下', '三上', '三下']`
  - `moeTargets(term: string, course: Course): { read: number; write: number } | null`
  - `currentTerm(grade: number, now: Date): string | null`
  - `weeklyTrend(cards: CardRecord[], kind: CardKind, now: Date, weeks?: number): { week: string; count: number }[]`

- [ ] **Step 1: Write the failing tests**

```ts
// src/content/moeTargets.test.ts
import { describe, expect, it } from 'vitest';
import { moeTargets } from './index';

describe('MOE targets to date', () => {
  it('end of P2 is 746 to read, 350 to write (CL), 435 (HCL)', () => {
    expect(moeTargets('二下', 'cl')).toEqual({ read: 746, write: 350 });
    expect(moeTargets('二下', 'hcl')?.write).toBe(435);
  });
  it('the targets only grow, term by term', () => {
    const r = ['一上', '一下', '二上', '二下', '三上', '三下'].map((t) => moeTargets(t, 'cl')!.read);
    expect(r).toEqual([...r].sort((a, b) => a - b));
  });
  it('beyond the lists: none', () => {
    expect(moeTargets('四上', 'cl')).toBeNull();
  });
});
```

```ts
// src/parent/progress.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { currentTerm, weeklyTrend } from './progress';
import { makeCard } from '../test/fixtures';

describe('progress', () => {
  it('the school term: 上 to May, 下 from June; P1–P3 have lists', () => {
    expect(currentTerm(2, new Date('2026-03-01'))).toBe('二上');
    expect(currentTerm(2, new Date('2026-10-06'))).toBe('二下');
    expect(currentTerm(4, new Date('2026-10-06'))).toBeNull();
  });
  it('a weekly count of rungs passed by the end of each week', () => {
    const c = (passed: string) => ({ ...makeCard(`b:${passed}`, 'recognise', new Date()), passed: new Date(passed).getTime() });
    const t = weeklyTrend([c('2026-09-20'), c('2026-10-01'), c('2026-10-05')], 'recognise', new Date('2026-10-06T09:00:00'), 3);
    expect(t.map((x) => x.count)).toEqual([1, 2, 3]);
  });
});
```

```tsx
// src/parent/progressPanel.test.tsx
import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { ProgressPanel } from './ProgressPanel';
import { summarize } from '../stats/stats';
import { DEFAULT_SETTINGS } from '../types';
import { makeCard, makeWord } from '../test/fixtures';

describe('the Progress tab', () => {
  it('shows characters recognised against the MOE target to date, and words heard, read, used, owned', () => {
    const know = summarize([makeWord('门')], [{ ...makeCard('b:门', 'recognise', new Date()), passed: 1 }, { ...makeCard('b:门', 'hear', new Date()), passed: 1 }]);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2 }} now={new Date('2026-10-06')} />);
    expect(screen.getByText(/1 of 746/)).toBeTruthy();
    expect(screen.getByText(/Heard/)).toBeTruthy();
    expect(screen.getByText(/Owned/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to check that they fail**

Run: `npx vitest run src/content/moeTargets.test.ts src/parent/progress.test.ts src/parent/progressPanel.test.tsx`
Expected: FAIL. None of these exports exist yet.

- [ ] **Step 3: Write the implementation**

In `src/content/index.ts` (after `MOE_WRITE`):

```ts
/** His textbook's terms in order (P1 上 … P3 下). */
export const MOE_TERMS = ['一上', '一下', '二上', '二下', '三上', '三下'];
/** The MOE lists to date: characters to recognise and to write by the end of a term (spec 2026-10-06 §3.4). */
export function moeTargets(term: string, course: Course): { read: number; write: number } | null {
  const upTo = MOE_TERMS.indexOf(term);
  if (upTo < 0) return null;
  const lessons = MOE_LESSONS.filter((l) => MOE_TERMS.indexOf(l.term) <= upTo);
  const read = new Set(lessons.flatMap((l) => Array.from(l.read)));
  const write = new Set(lessons.flatMap((l) => Array.from(course === 'hcl' ? l.writeHcl : l.write)));
  return { read: read.size, write: write.size };
}
```

If the end-P2 numbers don't come out at exactly 746/350/435, read how the earlier school-order tests in `readingFixes.test.ts` count (they pinned 746/350). Match that count, e.g. de-duplicating across lessons, and don't change the test numbers.

```ts
// src/parent/progress.ts
// The parent's view of his progress against school (spec 2026-10-06 §3.4).
import { MOE_TERMS } from '../content';
import type { CardKind, CardRecord } from '../types';

const NUMERAL = ['一', '二', '三', '四', '五', '六'];

/** His textbook term now: 上 from January to May, 下 from June; null past the lists (P4 on). */
export function currentTerm(grade: number, now: Date): string | null {
  const term = `${NUMERAL[grade - 1] ?? ''}${now.getMonth() < 5 ? '上' : '下'}`;
  return MOE_TERMS.includes(term) ? term : null;
}

/** Rungs of one kind passed by the end of each of the last `weeks` weeks, oldest first. */
export function weeklyTrend(cards: CardRecord[], kind: CardKind, now: Date, weeks = 8): { week: string; count: number }[] {
  const passed = cards.filter((c) => c.kind === kind && c.passed).map((c) => c.passed!);
  return Array.from({ length: weeks }, (_, i) => {
    const end = new Date(now.getTime() - (weeks - 1 - i) * 7 * 86_400_000);
    return { week: end.toISOString().slice(5, 10), count: passed.filter((t) => t <= end.getTime()).length };
  });
}
```

```tsx
// src/parent/ProgressPanel.tsx
// What he can really do (spec 2026-10-06 §3.4): words heard, read, used and owned, characters against the MOE target to date.
import { moeTargets } from '../content';
import type { Knowledge } from '../stats/stats';
import type { Settings } from '../types';
import { currentTerm, weeklyTrend } from './progress';

export function ProgressPanel({ know, settings, now }: { know: Knowledge; settings: Settings; now: Date }) {
  const term = currentTerm(settings.grade ?? 2, now);
  const target = term ? moeTargets(term, settings.course ?? 'cl') : null;
  const trend = weeklyTrend(know.cards, 'recognise', now);
  return (
    <section class="panel progress">
      <h2>Progress</h2>
      <p class="muted">A step counts only after he gets it right on two different days.</p>
      <dl class="progress__counts">
        <dt>Characters recognised</dt><dd>{target ? `${know.known} of ${target.read} by the end of ${term}` : know.known}</dd>
        <dt>Characters written</dt><dd>{target ? `${know.written} of ${target.write}` : know.written}</dd>
        <dt>Heard (understands it by ear)</dt><dd>{know.heard}</dd>
        <dt>Read</dt><dd>{know.read}</dd>
        <dt>Used in a sentence</dt><dd>{know.used}</dd>
        <dt>Owned (every step passed)</dt><dd>{know.owned}</dd>
      </dl>
      <h3>Reading, week by week</h3>
      <ol class="progress__trend">{trend.map((w) => <li key={w.week}><span>{w.week}</span> <strong>{w.count}</strong></li>)}</ol>
    </section>
  );
}
```

`src/types.ts` `Settings`: add `grade?: number; // his school year (P1 = 1): which MOE term's targets apply`.

`src/parent/ParentArea.tsx`:
- Add `'progress'` to `ParentTab`.
- Add `['progress', 'Progress', TrendingUp]` as the second entry in `TABS`, importing `TrendingUp` from `lucide-preact`.
- Render `<ProgressPanel know={know} settings={settings} now={now()} />` for it, using the same data the dashboard tab already loads; match how `Dashboard` gets `know` and `settings`.

In `src/parent/SettingsPanel.tsx`, add a "School year" select (P1–P6) that saves `grade`, beside the course select, following the course select's pattern.

`src/styles.css`: `.progress__counts { display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; } .progress__trend { display: flex; gap: 10px; flex-wrap: wrap; list-style: none; padding: 0; }`

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/content src/parent --maxWorkers=2 && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/index.ts src/content/moeTargets.test.ts src/types.ts src/parent src/styles.css
git commit -m "feat(ladder): a Progress tab — characters against the MOE target to date, and words heard, read, used and owned"
```

---

### Task 12: Ship and check on the iPad

**Files:** none (verification only).

- [ ] **Step 1: Full check**

Run: `npx tsc --noEmit -p . && npx vitest run --maxWorkers=2 && npm run build && npx tsx scripts/stage-cases.ts`
Expected: everything passes, and the stage cases fit in WebKit.

- [ ] **Step 2: Migration dry run on a copy of his data**

Ask the parent to export a backup: Settings → Backup → Export. Keep it as `/private/tmp/…/scratchpad/backup.json`, never in the repo.

Then run a script in the scratchpad (not committed) that:
1. Opens a fresh fake-indexeddb.
2. Applies the backup with `applyBackup`, which runs `migrateToLadder`.
3. Prints:
   - characters recognised before (earned reading cards) and after (`summarize(...).known`)
   - hear cards created and their days
   - checks that no FSRS state changed

Expected: the counts before and after agree to within the not-yet-earned learning cards, and hear checks number at most 15 a day.

If the parent can't export a backup now, record that in the ledger, ship anyway (migration never rewrites FSRS state and is covered by tests), and ask the parent to check the Progress tab numbers.

- [ ] **Step 3: Push**

```bash
git fetch origin main && git rebase origin/main && git push origin HEAD:main
```

- [ ] **Step 4: Parent check on the iPad**

Ask the parent to:
1. Reopen ZiJi.
2. Open Parent → Progress and note the numbers.
3. Do a lesson: 认新字 should say each new word and ask its meaning in English. 练一练 should include listening checks for words he already reads.
4. Report anything confusing to a P2 child in the English choices.
