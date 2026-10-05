# 字己 ZiJi — Lesson Redesign Phase A: new words first, one mixed round — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A lesson becomes 认新字 → 练一练 → 写一写 → 朗读 → 宝箱.
- **认新字:** today's new words, each introduced and then recalled at once.
- **练一练:** one mixed round in which new words and due revision climb a ladder of contexts (字 → 词语 → 句子).
- **Memory:** each word remembers its highest rung.
- **Pacing:** the number of new words a day adapts (3–8) to how many he keeps.

**Architecture:**
- **Round builder.** A pure round builder (`src/session/round.ts`) turns "which words, from which rung, how many times" into an interleaved, spaced queue of `PracticeItem`s. Each item says which question type to ask and which memory card its answer grades.
- **Wiring.** `src/session/practice.ts` decides who is in the round (today's plan, 认新字's misses, the rung memory). It also decides what can be asked of each word.
- **Runner and screen.** The runner keeps the queue on the `SessionRecord`, so a lesson resumes. `SessionScreen` renders each item with today's `FlashcardStep` (read, listen, 组词 gap) or `UseQuestion` (sentence gap, 用对了吗), through one `PracticeQuestion` component.
- **认新字** reuses the flash queue: intro cards, a recall, no retries.
- **Pacing** is computed once a day, from the review logs and saved sessions, and stored on `Settings`.

**Tech Stack:** Preact 10, TypeScript 5.9, idb (DB v3 → v4), ts-fsrs, Vitest 4 (jsdom + fake-indexeddb), Playwright-core WebKit (`npm run fit`).

**Spec:** `docs/superpowers/specs/2026-10-05-ziji-lesson-flow-design.md`. Phase A is spec §9 item A, covering:
- §2: the lesson, §2.1 认新字, §2.2 pacing;
- §3.1–3.3: the round, the ladder and its order;
- §3.5: memory;
- §7: the path and settings.

Rungs 4–5, the new question types, 钓鱼 as a look-alike check, English on the sheet, 成语 and the new writing are phases B–D.

**Prototype:** the round builder below was checked in a scratch harness over 500 random rounds.
- Never the same word back to back while another word still has items.
- In a typical lesson (4 new and 10 revision words), spacing always held, and 0.4% of neighbours shared a question type, only where nothing else could be asked.

## Global Constraints

**The lesson:**
- "认新字 → 练一练 → 写一写 → 朗读 → 宝箱". This replaces 认一认 (revision block plus new words), 选一选, 钓鱼 and 用一用 as separate steps.
- In phase A there is no 钓鱼 step. It comes back in phase B as a look-alike check inside 练一练.

**The ladder:**
- Phase A rungs: 1 字 (read: pick the pinyin; listen: hear it, find it), 2 词语 (the 组词 gap), 3 句子 (sentence gap-fill; 用对了吗).
- "New words start at rung 1." Each has at least three appearances in its first lesson.
- "Revision words start at the rung after the highest one they have answered right." Each gets one or two appearances.
- "After a miss, the word comes back later in the round at the same rung. The next lesson starts it one rung lower." At the top rung a word cycles through the upper rungs: 3 and 2 in phase A.

**Order:**
- "The same word never appears twice in a row."
- "A word's appearances are at least 2 items apart, then 4 or more."
- "Two items of the same question type never follow each other." Ruling built into the plan: when the word rule and the type rule conflict, the word rule wins.

**Memory (FSRS):**
- "A word's first appearance in the round grades it (recognise). For a new word, the 认新字 recall question does."
- "Rungs 2 and 5 grade the meaning card; rungs 3 and 4 grade the use record."
- Retries and free play never grade.

**Pacing (§2.2):**
- Start at 4. Look at how the last 5 days' new words did the first time they came back on a later day.
- Up one (max 8) at ≥ 85% when the last round didn't run out of time.
- Down one (min 3) below 70%, or when the last two rounds ran out of time.
- Unchanged with fewer than 8 measured words.
- The parent's "new words per day" setting is the ceiling. `BACKLOG_PAUSE` stays the hard stop.
- The Skills panel shows the number and the reason.

**Settings:** the activity switches become 新字 / 练一练 / 写一写 / 朗读. Existing installs map 认一认 → 新字 and 练一练, and 选一选 or 钓鱼 → 练一练. An old default of 4 (or 5) new words a day becomes the ceiling 8; a parent's own number stays.

**Unchanged:**
- In-progress sessions saved under the old steps finish in the old flow.
- Placement, the Skills panel, the importer, 听写 mistakes and 写一写 (phase D changes it).

**Stars (plan decision for the parent):**
- Stars stay one per stop, but 练一练 counts 2. It replaces three starred steps, so a full lesson stays at 5 stars and his reward goals keep their pace.
- The parent sees this in the handoff.

**Child screens:** Chinese only, no emoji, everything inside the stage layout with Truffle's calm and reactions.

**Shipping:** never merge or deploy without the parent's go-ahead in chat.

## Review Focus

1. **Resuming.** The app closes mid-练一练, or mid-认新字. Reopening continues at the same item of the same queue, with nothing re-graded. A lesson saved before this change (old steps) resumes and finishes in the old flow. Pinned in Task 3 ("the round is kept on the record") and Task 7 ("a lesson saved before the change finishes in the old flow").
2. **Double taps on 继续 in 练一练.** A double tap advances one item and grades once. Pinned in Task 7 ("a double tap on 继续 moves one item and grades once").
3. **Words paused or deleted after the round was built.** Their items are skipped, and the round still finishes. Pinned in Task 7 ("a paused word's items are skipped").
4. **Nothing to do.** No new words (none left, ceiling 0, or 新字 switched off), no revision due, or an empty round. The step is skipped and the lesson still reaches the chest. Pinned in Task 3 (empty queue finishes the step) and Task 7 ("with nothing new or due, the lesson still finishes").
5. **Pacing at the edges:**
   - **The first week:** too few words to judge, so it stays at 4.
   - **Gaps between lessons:** days without a lesson don't count.
   - **Free play:** never saved, never counted.
   - **A lowered ceiling:** the parent lowers it under today's pace, and the next pace respects it at once.

   Pinned in Task 4.

---
### Task 1: Each word remembers its rung

**Files:**
- Create: `src/session/ladder.ts`, `src/session/ladder.test.ts`
- Modify: `src/store/db.ts` (DB v4: a `ladder` store), `src/store/repo.ts` (`getRungs`, `noteRung`), `src/types.ts` (`LadderEntry`)

**Interfaces:**
- **Produces:**
  - `type Rung = 1 | 2 | 3` and `TOP_RUNG: Rung = 3`;
  - `nextRung(best: number, rung: Rung, correct: boolean): number`;
  - `startRung(best: number): Rung`;
  - `LadderEntry { wordId: string; rung: number; at: number }`;
  - `getRungs(db): Promise<Map<string, number>>`;
  - `noteRung(db, wordId: string, rung: Rung, correct: boolean, now: Date): Promise<number>`.

- [ ] **Step 1: Write the failing tests.** Create `src/session/ladder.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getRungs, noteRung } from '../store/repo';
import { openAppDb } from '../store/db';
import { nextRung, startRung } from './ladder';

describe('the context ladder (spec 2026-10-05 §3.2)', () => {
  it('a right answer raises his best rung; it never lowers it', () => {
    expect(nextRung(0, 1, true)).toBe(1);
    expect(nextRung(1, 2, true)).toBe(2);
    expect(nextRung(3, 2, true)).toBe(3);
  });
  it('a miss starts the word one rung lower next time', () => {
    expect(nextRung(3, 3, false)).toBe(2);
    expect(nextRung(2, 1, false)).toBe(0);
    expect(nextRung(1, 3, false)).toBe(1); // a miss above his best leaves it where it was
  });
  it('a revision word starts on the rung after his best, from 字, never past the top', () => {
    expect(startRung(0)).toBe(1);
    expect(startRung(1)).toBe(2);
    expect(startRung(2)).toBe(3);
    expect(startRung(3)).toBe(3);
  });
  it('the rung memory is kept per word in the database', async () => {
    const db = await openAppDb(`ladder-${Math.random()}`);
    expect(await noteRung(db, 'b:火', 1, true, new Date(2026, 9, 6))).toBe(1);
    expect(await noteRung(db, 'b:火', 2, true, new Date(2026, 9, 6))).toBe(2);
    expect(await noteRung(db, 'b:水', 1, false, new Date(2026, 9, 6))).toBe(0);
    expect(await getRungs(db)).toEqual(new Map([['b:火', 2], ['b:水', 0]]));
  });
});
```

- [ ] **Step 2: Run it.**
  - Command: `npx vitest run src/session/ladder.test.ts`.
  - Expected: FAIL. `./ladder` cannot be resolved, and `getRungs` is not exported.

- [ ] **Step 3: Implement.** Create `src/session/ladder.ts`:

```ts
/** The context ladder (spec 2026-10-05 §3.2). Phase A has its first three rungs: 字, 词语, 句子; 组句 and 成语 come later. */
export type Rung = 1 | 2 | 3;
export const TOP_RUNG: Rung = 3;

/** After an answer at `rung`: a right one raises his best to it; a miss puts the next start one rung below it. */
export function nextRung(best: number, rung: Rung, correct: boolean): number {
  return correct ? Math.max(best, rung) : Math.min(best, rung - 1);
}

/** Where a revision word starts: the rung after his best (a word never answered right starts at 字), at most the top. */
export function startRung(best: number): Rung {
  return Math.min(TOP_RUNG, Math.max(1, best + 1)) as Rung;
}
```

**`src/types.ts`:** add, after `AnswerLog`:

```ts
/** A word's place on the context ladder (spec 2026-10-05 §3.2): the highest rung he has answered right, lowered by a miss. */
export interface LadderEntry {
  wordId: string;
  rung: number;
  at: number;
}
```

**`src/store/db.ts`:**
- Import `LadderEntry`, and add `ladder: { key: string; value: LadderEntry };` to `HanziDB`.
- Set `DB_VERSION = 4`.
- Add `'ladder'` to `LIST_STORES`, so backups carry it.
- In `upgrade`, after the v3 line, add:

```ts
      if (oldVersion < 4) db.createObjectStore('ladder', { keyPath: 'wordId' }); // each word's rung on the context ladder
```

**`src/store/repo.ts`:** add, importing `nextRung` and `type Rung` from `../session/ladder`:

```ts
/** Every word's rung on the context ladder (words never practised in 练一练 have none: rung 0). */
export async function getRungs(db: AppDb): Promise<Map<string, number>> {
  return new Map((await db.getAll('ladder')).map((e) => [e.wordId, e.rung]));
}

/** Notes one answer at `rung` and returns the word's new rung. */
export async function noteRung(db: AppDb, wordId: string, rung: Rung, correct: boolean, now: Date): Promise<number> {
  const next = nextRung((await db.get('ladder', wordId))?.rung ?? 0, rung, correct);
  await db.put('ladder', { wordId, rung: next, at: now.getTime() });
  return next;
}
```

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/session/ladder.test.ts src/store && npx tsc --noEmit -p .`.
  - Expected: PASS.
  - **If a backup or restore test pins the store list or the DB version,** update it to include `ladder` and v4, and ledger a ruling. A backup must carry the rungs.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: each word remembers its rung on the context ladder (DB v4)"`

### Task 2: The round builder (pure)

**Files:**
- Create: `src/session/round.ts`, `src/session/round.test.ts`

**Interfaces:**
- **Consumes:** `Rung` and `TOP_RUNG` (Task 1); `shuffle` and `Rng` from `src/lib/random.ts`.
- **Produces:**
  - `type Ask = 'read' | 'listen' | 'word' | 'fit' | 'usage'` and `ASKS: Record<Rung, Ask[]>`;
  - `type Grades = 'recognise' | 'meaning' | 'use' | null`;
  - `PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean }`;
  - `RoundWord { wordId; isNew; from: Rung; appearances: number; gradesRecognise; gradesMeaning; early? }`;
  - `climb(from: Rung, n: number): Rung[]`;
  - `buildRound(words: RoundWord[], canAsk: (wordId: string, ask: Ask) => boolean, rng: Rng): PracticeItem[]`.

- [ ] **Step 1: Write the failing tests.** Create `src/session/round.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { buildRound, climb, type Ask, type PracticeItem, type RoundWord } from './round';

const fresh = (id: string, early = false): RoundWord => ({ wordId: id, isNew: true, from: 1, appearances: 3, gradesRecognise: false, gradesMeaning: true, early });
const revision = (id: string, from: 1 | 2 | 3, appearances = 1, meaning = false): RoundWord => ({ wordId: id, isNew: false, from, appearances, gradesRecognise: true, gradesMeaning: meaning });
const all = () => true;
const lesson = (seed: number) => [
  ...['n0', 'n1', 'n2', 'n3'].map((id) => fresh(id)),
  ...Array.from({ length: 10 }, (_, i) => revision(`r${i}`, (1 + ((seed + i) % 3)) as 1 | 2 | 3, 1 + ((seed * 7 + i) % 2), i % 2 === 0)),
];
const positions = (r: PracticeItem[]) => {
  const at = new Map<string, number[]>();
  r.forEach((it, i) => at.set(it.wordId, [...(at.get(it.wordId) ?? []), i]));
  return at;
};

describe('练一练: one word, many contexts (spec 2026-10-05 §3)', () => {
  it('a word climbs one rung per appearance; past the top it goes round the upper rungs', () => {
    expect(climb(1, 3)).toEqual([1, 2, 3]);
    expect(climb(2, 1)).toEqual([2]);
    expect(climb(3, 2)).toEqual([3, 2]);
  });
  it('a new word appears three times, climbing 字 → 词语 → 句子', () => {
    const r = buildRound(lesson(1), all, mulberry32(1));
    for (const id of ['n0', 'n1', 'n2', 'n3']) expect(r.filter((x) => x.wordId === id).map((x) => x.rung), id).toEqual([1, 2, 3]);
  });
  it('a revision word starts on its own rung', () => {
    const r = buildRound([fresh('n0'), revision('r0', 3), revision('r1', 2)], all, mulberry32(2));
    expect(r.find((x) => x.wordId === 'r0')!.rung).toBe(3);
    expect(r.find((x) => x.wordId === 'r1')!.rung).toBe(2);
  });
  it('a rung he can’t be asked falls to the nearest one below (a word with no 组词 or sentence is read)', () => {
    const r = buildRound([fresh('n0'), fresh('n1')], (id, a) => id !== 'n1' || a === 'read' || a === 'listen', mulberry32(3));
    expect(r.filter((x) => x.wordId === 'n1').map((x) => x.rung)).toEqual([1, 1, 1]);
  });
  it('the same word never comes twice in a row while another word still has items', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const r = buildRound(lesson(seed), all, mulberry32(seed));
      for (let i = 1; i < r.length; i++) {
        const others = new Set(r.slice(i).map((x) => x.wordId)).size > 1;
        if (others) expect(r[i]!.wordId, `seed ${seed} at ${i}`).not.toBe(r[i - 1]!.wordId);
      }
    }
  });
  it("a word's appearances are at least 2 items apart, then at least 4 (a typical lesson)", () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const [id, at] of positions(buildRound(lesson(seed), all, mulberry32(seed)))) {
        for (let k = 1; k < at.length; k++) expect(at[k]! - at[k - 1]!, `seed ${seed} ${id}`).toBeGreaterThanOrEqual(k === 1 ? 3 : 5);
      }
    }
  });
  it('neighbours almost never share a question type (only where nothing else can be asked)', () => {
    let same = 0;
    let total = 0;
    const canAsk = (id: string, a: Ask) => !(a === 'usage' && id.endsWith('3'));
    for (let seed = 1; seed <= 60; seed++) {
      const r = buildRound(lesson(seed), canAsk, mulberry32(seed));
      total += r.length - 1;
      for (let i = 1; i < r.length; i++) if (r[i]!.ask === r[i - 1]!.ask) same++;
    }
    expect(same / total).toBeLessThan(0.02);
  });
  it('words missed in 认新字 come first; new words start before revision', () => {
    const r = buildRound([fresh('n0'), fresh('n1', true), revision('r0', 2), revision('r1', 3)], all, mulberry32(4));
    expect(r[0]!.wordId).toBe('n1');
    expect(r.findIndex((x) => x.wordId === 'n0')).toBeLessThan(r.findIndex((x) => x.wordId === 'r0'));
  });
  it('grading (spec §3.5): a revision word’s first appearance grades its reading; the first 词语 question grades meaning; sentences grade use; new words’ reading was graded in 认新字', () => {
    const r = buildRound([fresh('n0'), revision('r0', 1, 2, true)], all, mulberry32(5));
    expect(r.filter((x) => x.wordId === 'n0').map((x) => x.grades)).toEqual([null, 'meaning', 'use']);
    expect(r.filter((x) => x.wordId === 'r0').map((x) => x.grades)).toEqual(['recognise', 'meaning']);
    expect(r.every((x) => !x.retry)).toBe(true);
  });
  it('rung 1 asks read or listen, rung 2 the 组词 gap, rung 3 a sentence', () => {
    const r = buildRound(lesson(9), all, mulberry32(9));
    for (const x of r) expect({ 1: ['read', 'listen'], 2: ['word'], 3: ['fit', 'usage'] }[x.rung]).toContain(x.ask);
  });
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/session/round.test.ts`.
  - Expected: FAIL, because `./round` cannot be resolved.

- [ ] **Step 3: Implement.** Create `src/session/round.ts`:

```ts
// 练一练 (spec 2026-10-05 §3): today's new words and due revision in one mixed round, each word climbing the context
// ladder one rung per appearance, interleaved and spaced, with the question type changing from item to item.
import { shuffle, type Rng } from '../lib/random';
import { TOP_RUNG, type Rung } from './ladder';

/** read: pick the pinyin · listen: hear it, find it · word: the 组词 gap · fit: the sentence gap · usage: 用对了吗. */
export type Ask = 'read' | 'listen' | 'word' | 'fit' | 'usage';
export const ASKS: Record<Rung, Ask[]> = { 1: ['read', 'listen'], 2: ['word'], 3: ['fit', 'usage'] };
/** Which memory card an answer grades (spec §3.5); null = practice only (a retry, or already graded today). */
export type Grades = 'recognise' | 'meaning' | 'use' | null;

export interface PracticeItem { wordId: string; rung: Rung; ask: Ask; grades: Grades; retry: boolean }

export interface RoundWord {
  wordId: string;
  isNew: boolean; // introduced in today's 认新字
  from: Rung; // the rung of its first appearance
  appearances: number;
  gradesRecognise: boolean; // its reading card is due today: its first appearance grades it
  gradesMeaning: boolean; // its meaning card is due (or starts) today: its first 词语 question grades it
  early?: boolean; // missed in 认新字: it comes back first
}

const FIRST_GAP = 3; // a word's second appearance comes at least 2 items after its first
const LATER_GAP = 5; // then at least 4 items apart

/** The rungs a word climbs, one per appearance; past the top it goes round the upper rungs again (3, 2, 3…). */
export function climb(from: Rung, n: number): Rung[] {
  return Array.from({ length: n }, (_, i) => {
    let r = from + i;
    while (r > TOP_RUNG) r -= 2;
    return r as Rung;
  });
}

/** The question for a rung, or for the nearest rung below that can be asked of this word (rung 1's reading always can). */
function askFor(wordId: string, rung: Rung, canAsk: (wordId: string, ask: Ask) => boolean, avoid: Ask | null, rng: Rng): { rung: Rung; ask: Ask } {
  for (let r = rung; r >= 1; r--) {
    const options = shuffle(ASKS[r as Rung].filter((a) => canAsk(wordId, a)), rng);
    if (options.length) return { rung: r as Rung, ask: options.find((a) => a !== avoid) ?? options[0]! };
  }
  return { rung: 1, ask: 'read' };
}

export function buildRound(words: RoundWord[], canAsk: (wordId: string, ask: Ask) => boolean, rng: Rng): PracticeItem[] {
  type Slot = { w: RoundWord; rungs: Rung[]; next: number; readyAt: number; meaningDone: boolean };
  const slots: Slot[] = words.filter((w) => w.appearances > 0).map((w) => ({ w, rungs: climb(w.from, w.appearances), next: 0, readyAt: 0, meaningDone: false }));
  // first appearances: words missed in 认新字, then new and revision words taking turns (each in the order given)
  const early = slots.filter((s) => s.w.early);
  const news = slots.filter((s) => s.w.isNew && !s.w.early);
  const revs = slots.filter((s) => !s.w.isNew && !s.w.early);
  // words that need more appearances start sooner, so the round never ends on one word's last items crammed together
  const firsts: Slot[] = [...early, ...[...news, ...revs].sort((a, b) => b.rungs.length - a.rungs.length)];

  const out: PracticeItem[] = [];
  let lastWord: string | null = null;
  let lastAsk: Ask | null = null;
  const left = () => slots.filter((s) => s.next < s.rungs.length);
  while (left().length) {
    const p = out.length;
    const others = left().filter((s) => s.w.wordId !== lastWord);
    // in order of preference: a word already climbing that is due again, then the next first appearance, then whoever is
    // due soonest (spacing gives way before a word repeats back to back), and last of all the same word again
    const started = others.filter((s) => s.next > 0 && s.readyAt <= p).sort((a, b) => a.readyAt - b.readyAt);
    const fresh = firsts.filter((s) => s.next === 0 && s.w.wordId !== lastWord);
    const waiting = others.filter((s) => s.next > 0 && s.readyAt > p).sort((a, b) => a.readyAt - b.readyAt);
    const order = [...started, ...fresh, ...waiting, ...left()];
    const plans = order.map((s) => ({ s, ...askFor(s.w.wordId, s.rungs[s.next]!, canAsk, lastAsk, rng) }));
    // a different word always wins over a different question type; the type changes whenever another word allows it
    const notSame = plans.filter((x) => x.s.w.wordId !== lastWord);
    const pick = notSame.find((x) => x.ask !== lastAsk) ?? notSame[0] ?? plans[0]!;
    const { s, rung, ask } = pick;
    let grades: Grades = null;
    if (s.next === 0 && s.w.gradesRecognise) grades = 'recognise';
    else if (rung === 2 && s.w.gradesMeaning && !s.meaningDone) {
      grades = 'meaning';
      s.meaningDone = true;
    } else if (rung === 3) grades = 'use';
    out.push({ wordId: s.w.wordId, rung, ask, grades, retry: false });
    s.readyAt = p + (s.next === 0 ? FIRST_GAP : LATER_GAP);
    s.next += 1;
    lastWord = s.w.wordId;
    lastAsk = ask;
  }
  return out;
}
```

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/session/round.test.ts && npx tsc --noEmit -p .`.
  - Expected: PASS.

- [ ] **Step 5: Commit.** `git add -A src/session && git commit -m "feat: 练一练's round builder — words climb a ladder of contexts, interleaved and spaced"`

### Task 3: The runner — 认新字 on the flash queue, 练一练's queue on the record

**Files:**
- Modify:
  - `src/types.ts`;
  - `src/session/runner.ts`, `src/session/runner.test.ts`;
  - `src/session/progress.ts`, `src/session/progress.test.ts`;
  - `src/stats/stats.ts`, `src/stats/stats.test.ts`;
  - `src/ui/ProgressBar.tsx`, `src/app/TodayPath.tsx`.

**Interfaces:**
- **Consumes:** `PracticeItem` (Task 2).
- **Produces:**
  - `StepKind` gains `'newwords' | 'practice'`. Task 7 restructures the union.
  - `SessionPlan.practiceTimeBoxMs?: number`.
  - `SessionRecord.practiceQueue?: PracticeItem[]`, `practiceIndex?: number`, `practiceElapsedMs?: number`, `practiceLeft?: number`.
  - `createSessionRecord(plan, date, now, free?)`. Its flash queue is now only today's new words' intro items.
  - `startPractice(rec, queue: PracticeItem[]): SessionRecord`.
  - `currentPracticeItem(rec): PracticeItem | null`.
  - `afterPracticeAnswer(rec, correct: boolean, rawElapsedMs: number, inContext?: boolean): SessionRecord`.
  - `skipPracticeItem(rec): SessionRecord`.
  - `createFreePracticeRecord(queue: PracticeItem[], date: string, now: number): SessionRecord`.
  - `PRACTICE_RETRY_GAP = 4`.
  - `starsOf` counts `'practice'` as 2.

- [ ] **Step 1: Write the failing tests.** In `src/session/runner.test.ts`:
  - **Old queue tests.** Delete the tests of `createSessionRecord`'s old queue order: reading reviews leading, meaning interleaved, a new word met three times. That queue is gone; 认新字 and 练一练 replace it.
  - **Legacy tests.** Tests of a legacy `'flashcards'` record (retries, time box) build their record by hand: `{ ...createSessionRecord(plan, DAY, 0), flashQueue: [...] }`.
  - **New tests.** Append:

```ts
import { createFreePracticeRecord, currentPracticeItem, afterPracticeAnswer, skipPracticeItem, startPractice, PRACTICE_RETRY_GAP } from './runner';
import type { PracticeItem } from './round';

const planOf = (over: Partial<SessionPlan> = {}): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: ['b:a'], newWordIds: ['b:x', 'b:y'], flashTimeBoxMs: 0, practiceTimeBoxMs: 60_000, writeCandidates: [], writeCount: 0, ...over });
const p = (wordId: string, over: Partial<PracticeItem> = {}): PracticeItem => ({ wordId, rung: 1, ask: 'read', grades: 'recognise', retry: false, ...over });

describe('认新字 (spec 2026-10-05 §2.1)', () => {
  it("the lesson's flash queue is today's new words, each introduced once, nothing else", () => {
    expect(createSessionRecord(planOf(), '2026-10-06', 0).flashQueue).toEqual([
      { wordId: 'b:x', isNew: true, retry: false },
      { wordId: 'b:y', isNew: true, retry: false },
    ]);
  });
  it('a miss adds no retry (the word comes first in 练一练 instead), and 认新字 ends after its last word', () => {
    let rec = createSessionRecord(planOf(), '2026-10-06', 0);
    rec = afterFlashAnswer(rec, false, 1000);
    expect(rec.flashQueue).toHaveLength(2);
    expect(rec.recalls?.['b:x']?.missed).toBe(true);
    rec = afterFlashAnswer(rec, true, 1000);
    expect(currentStep(rec)).toBe('practice');
  });
});

describe('练一练 on the record (spec 2026-10-05 §3)', () => {
  const inPractice = () => {
    const rec = createSessionRecord(planOf({ newWordIds: [] }), '2026-10-06', 0);
    expect(currentStep(rec)).toBe('newwords');
    return finishStep(rec);
  };
  it('an empty round ends the step at once (review focus 4)', () => {
    expect(currentStep(startPractice(inPractice(), []))).toBeNull();
  });
  it('items come in order; a right answer moves on', () => {
    const rec = startPractice(inPractice(), [p('b:a'), p('b:b')]);
    expect(currentPracticeItem(rec)?.wordId).toBe('b:a');
    expect(currentPracticeItem(afterPracticeAnswer(rec, true, 2000))?.wordId).toBe('b:b');
  });
  it('a miss brings the item back once, about 4 items later, at the same rung, as an ungraded retry', () => {
    const queue = ['b:a', 'b:b', 'b:c', 'b:d', 'b:e', 'b:f'].map((w) => p(w, { rung: 2, ask: 'word', grades: 'meaning' }));
    const rec = afterPracticeAnswer(startPractice(inPractice(), queue), false, 2000);
    const again = rec.practiceQueue!.filter((x) => x.wordId === 'b:a');
    expect(again).toHaveLength(2);
    expect(again[1]).toEqual({ wordId: 'b:a', rung: 2, ask: 'word', grades: null, retry: true });
    expect(rec.practiceQueue!.findIndex((x, i) => i > 0 && x.wordId === 'b:a')).toBe(1 + PRACTICE_RETRY_GAP);
    expect(afterPracticeAnswer({ ...rec, practiceIndex: 1 + PRACTICE_RETRY_GAP }, false, 100).practiceQueue).toHaveLength(7); // a retry never adds another
  });
  it('the time box ends the round and notes what was left for tomorrow (pacing reads it)', () => {
    const rec = afterPracticeAnswer(startPractice(inPractice(), [p('b:a'), p('b:b'), p('b:c')]), true, 60_000);
    expect(currentStep(rec)).toBeNull();
    expect(rec.practiceLeft).toBe(2);
  });
  it('finishing every item leaves nothing over', () => {
    const rec = afterPracticeAnswer(startPractice(inPractice(), [p('b:a')]), true, 1000);
    expect(currentStep(rec)).toBeNull();
    expect(rec.practiceLeft ?? 0).toBe(0);
  });
  it('a skipped item (a paused word) moves on without a recall', () => {
    const rec = skipPracticeItem(startPractice(inPractice(), [p('b:a'), p('b:b')]));
    expect(currentPracticeItem(rec)?.wordId).toBe('b:b');
    expect(rec.recalls?.['b:a']).toBeUndefined();
  });
  it('the round is kept on the record, so a lesson resumes at the same item (review focus 1)', () => {
    const rec = afterPracticeAnswer(startPractice(inPractice(), [p('b:a'), p('b:b'), p('b:c')]), true, 1000);
    const back = structuredClone(rec);
    expect(currentPracticeItem(back)).toEqual(p('b:b'));
  });
  it('free play is one 练一练 round, never time-boxed', () => {
    const rec = createFreePracticeRecord([p('b:a', { grades: null, retry: true })], '2026-10-06', 0);
    expect(rec.free).toBe(true);
    expect(currentStep(rec)).toBe('practice');
    expect(currentStep(afterPracticeAnswer(rec, true, 10 * 60_000))).toBeNull(); // ended by its last item, not by time
  });
});
```

Append to `src/stats/stats.test.ts`:

```ts
it('练一练 counts two stars (it replaces three starred steps), so a full lesson stays at 5', () => {
  expect(starsOf(['newwords', 'practice', 'writing', 'speaking'])).toBe(5);
});
```

Append to `src/session/progress.test.ts`:

```ts
it('练一练 shows how far through its round he is (items or time, whichever is further)', () => {
  const plan = { steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 100_000, writeCandidates: [], writeCount: 0 } as SessionPlan;
  const rec = { ...createSessionRecord(plan, '2026-10-06', 0), stepIndex: 1, practiceQueue: new Array(10).fill({ wordId: 'b:a', rung: 1, ask: 'read', grades: null, retry: false }), practiceIndex: 5, practiceElapsedMs: 20_000 };
  expect(sessionProgress(rec)).toBeCloseTo(0.75); // step 2 of 2, halfway through it
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/session src/stats`.
  - Expected: FAIL. The runner functions aren't exported, the new record still builds the old queue, and `starsOf` counts practice as 1.

- [ ] **Step 3: Implement.**

**`src/types.ts`:**
- Import `type PracticeItem` from `./session/round`.
- Change `StepKind` to `export type StepKind = ActivityKind | 'wrapup' | 'newwords' | 'practice';`.
- Add `practiceTimeBoxMs?: number; // 练一练's time box (spec 2026-10-05 §2)` to `SessionPlan`.
- Add to `SessionRecord`:

```ts
  practiceQueue?: PracticeItem[]; // 练一练's round, built when the step starts (spec 2026-10-05 §3)
  practiceIndex?: number;
  practiceElapsedMs?: number;
  practiceLeft?: number; // items the time box left for tomorrow (pacing reads it, spec §2.2)
```

**`src/session/runner.ts`:**
- **New lesson record.** Replace the body of `createSessionRecord` with:

```ts
export function createSessionRecord(plan: SessionPlan, date: string, now: number, free = false): SessionRecord {
  // 认新字 (spec 2026-10-05 §2.1): each new word's card, then its recall. 练一练 builds its own round when it starts.
  const flashQueue: FlashItem[] = plan.newWordIds.map((wordId) => ({ wordId, isNew: true, retry: false }));
  return {
    date, startedAt: now, activeMs: 0, free, plan, stepIndex: 0,
    flashQueue, flashIndex: 0, flashElapsedMs: 0, writeIndex: 0, writeDone: 0,
    completedSteps: [], completed: plan.steps.length === 0,
  };
}
```

- **Remove dead code.** Delete `REPEAT_GAP` and its comment. Keep `RETRY_GAPS`, which the legacy flow still uses.
- **Flash item by step.** `currentFlashItem`:

```ts
export function currentFlashItem(rec: SessionRecord): FlashItem | null {
  const step = currentStep(rec);
  return step === 'flashcards' || step === 'newwords' ? (rec.flashQueue[rec.flashIndex] ?? null) : null;
}
```

- **Legacy-only rules.** In `afterFlashAnswer`, only a legacy `'flashcards'` step re-queues misses and has a time box:

```ts
  const legacy = currentStep(rec) === 'flashcards'; // a lesson saved before 2026-10-05: its own retries and time box
  const flashQueue = [...rec.flashQueue];
  if (legacy && !correct && !item.retry) {
```

  and:

```ts
  const done = next.flashIndex >= flashQueue.length || (legacy && next.flashElapsedMs >= rec.plan.flashTimeBoxMs);
```

- **New functions.** Add, after `skipFlashItem`:

```ts
/** A missed 练一练 item comes back once, about 4 items later, at the same rung, as practice only (spec 2026-10-05 §3.2). */
export const PRACTICE_RETRY_GAP = 4;

/** 练一练's round, built when the step starts (it needs today's 认新字 answers and his rungs); an empty round ends the step. */
export function startPractice(rec: SessionRecord, queue: PracticeItem[]): SessionRecord {
  const next: SessionRecord = { ...rec, practiceQueue: queue, practiceIndex: 0, practiceElapsedMs: 0 };
  return queue.length ? next : finishStep(next);
}

export function currentPracticeItem(rec: SessionRecord): PracticeItem | null {
  return currentStep(rec) === 'practice' ? (rec.practiceQueue?.[rec.practiceIndex ?? 0] ?? null) : null;
}

export function afterPracticeAnswer(rec: SessionRecord, correct: boolean, rawElapsedMs: number, inContext = false): SessionRecord {
  const item = currentPracticeItem(rec);
  if (!item) return rec;
  const elapsedMs = Math.min(rawElapsedMs, MAX_CARD_MS);
  const index = rec.practiceIndex ?? 0;
  const queue = [...rec.practiceQueue!];
  if (!correct && !item.retry) queue.splice(Math.min(index + 1 + PRACTICE_RETRY_GAP, queue.length), 0, { ...item, grades: null, retry: true });
  const next: SessionRecord = {
    ...rec,
    practiceQueue: queue,
    practiceIndex: index + 1,
    practiceElapsedMs: (rec.practiceElapsedMs ?? 0) + elapsedMs,
    activeMs: rec.activeMs + elapsedMs,
    recalls: noteRecall(rec.recalls, item.wordId, correct, inContext),
  };
  if (next.practiceIndex! >= queue.length) return finishStep(next);
  if (next.practiceElapsedMs! >= (rec.plan.practiceTimeBoxMs ?? Number.POSITIVE_INFINITY)) return finishStep({ ...next, practiceLeft: queue.length - next.practiceIndex! });
  return next;
}

export function skipPracticeItem(rec: SessionRecord): SessionRecord {
  const next: SessionRecord = { ...rec, practiceIndex: (rec.practiceIndex ?? 0) + 1 };
  return next.practiceIndex! >= (rec.practiceQueue?.length ?? 0) ? finishStep(next) : next;
}

/** 再玩一会儿 (spec 2026-10-05 §7): one 练一练 round of words he knows; never saved, never graded, no time box. */
export function createFreePracticeRecord(queue: PracticeItem[], date: string, now: number): SessionRecord {
  const plan: SessionPlan = {
    steps: ['practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: Number.POSITIVE_INFINITY,
    writeCandidates: [], writeCount: 0,
  };
  return { ...createSessionRecord(plan, date, now, true), practiceQueue: queue, practiceIndex: 0, practiceElapsedMs: 0 };
}
```

  Import `type PracticeItem` from `./round`. `createFreePlayRecord` and `buildFreePlayQueue` stay until Task 7 switches free play over.

**`src/session/progress.ts`:** handle the two new steps before the `writing` branch:

```ts
  } else if (step === 'newwords') {
    within = rec.flashQueue.length ? rec.flashIndex / rec.flashQueue.length : 0;
  } else if (step === 'practice') {
    const n = rec.practiceQueue?.length ?? 0;
    const box = rec.plan.practiceTimeBoxMs ?? 0;
    within = Math.max(n ? (rec.practiceIndex ?? 0) / n : 0, Number.isFinite(box) && box > 0 ? (rec.practiceElapsedMs ?? 0) / box : 0);
```

**`src/stats/stats.ts`:**

```ts
/** One star per finished activity; 用一用 closes the lesson but isn't a star of its own; 练一练 counts two (it replaces 选一选, 钓鱼 and 用一用, spec 2026-10-05). */
export const starsOf = (steps: readonly string[]) => steps.reduce((n, s) => n + (s === 'wrapup' ? 0 : s === 'practice' ? 2 : 1), 0);
```

**`src/ui/ProgressBar.tsx`:** `ICONS` gains `newwords: null, practice: 'speech'`.

**`src/app/TodayPath.tsx`:**
- `ICON` gains `newwords: null, practice: 'speech'`.
- `NAME` gains `newwords: '认新字', practice: '练一练'`.

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/session src/stats src/app/home.test.tsx && npx tsc --noEmit -p .`.
  - Expected: PASS.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: 认新字 runs on the flash queue; 练一练's round lives on the session record"`

### Task 4: New words per day adapt to how many he keeps

**Files:**
- Create: `src/session/pace.ts`, `src/session/pace.test.ts`
- Modify:
  - `src/types.ts` (`Settings.pace`, `DEFAULT_SETTINGS.newPerDay`);
  - `src/session/plan.ts` (`PlanInput.newPerDay`);
  - `src/session/record.ts` (`startOrResumeSession` computes today's pace);
  - `src/parent/SkillsPanel.tsx`, `src/parent/SettingsPanel.tsx`;
  - their tests.

**Interfaces:**
- **Consumes:** `introducedNewWords` (runner); `SessionRecord.practiceLeft` (Task 3).
- **Produces:**
  - `PACE_START = 4`, `PACE_MIN = 3`, `PACE_MAX = 8`;
  - `keptRecent(sessions: SessionRecord[], logs: ReviewLog[], today: string): { right: number; total: number }`;
  - `ranOut(rec: SessionRecord): boolean`;
  - `nextPace(i: { prev: number | null; ceiling: number; kept: { right: number; total: number }; ranOut: [boolean, boolean] }): { perDay: number; reason: string }`;
  - `Settings.pace?: { day: string; perDay: number; reason: string }`;
  - `PlanInput.newPerDay?: number`.

- [ ] **Step 1: Write the failing tests.** Create `src/session/pace.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ReviewLog, SessionPlan, SessionRecord } from '../types';
import { keptRecent, nextPace, ranOut } from './pace';
import { createSessionRecord } from './runner';

const plan = (newWordIds: string[]): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds, flashTimeBoxMs: 0, practiceTimeBoxMs: 1, writeCandidates: [], writeCount: 0 });
/** A lesson on `date` that introduced every one of `ids` in 认新字. */
const lesson = (date: string, ids: string[], over: Partial<SessionRecord> = {}): SessionRecord => ({ ...createSessionRecord(plan(ids), date, 0), flashIndex: ids.length, ...over });
const log = (wordId: string, date: string, correct: boolean): ReviewLog => ({ cardId: `${wordId}:recognise`, wordId, kind: 'recognise', at: new Date(`${date}T16:00:00`).getTime(), rating: correct ? 3 : 1, correct });

describe('how many new words he keeps (spec 2026-10-05 §2.2)', () => {
  it("counts the last 5 days' new words by the first time each came back on a later day", () => {
    const sessions = [lesson('2026-10-03', ['b:a', 'b:b']), lesson('2026-10-05', ['b:c'])];
    const logs = [
      log('b:a', '2026-10-03', true), // its intro day: not counted
      log('b:a', '2026-10-04', true), // first return: kept
      log('b:a', '2026-10-05', false), // later returns don't count
      log('b:b', '2026-10-05', false), // first return: missed
      log('b:c', '2026-10-05', true), // introduced today… of the lesson on 10-05, no later day yet: not measured
    ];
    expect(keptRecent(sessions, logs, '2026-10-06')).toEqual({ right: 1, total: 2 });
  });
  it('ignores lessons older than 5 days, and today’s', () => {
    const sessions = [lesson('2026-09-30', ['b:a']), lesson('2026-10-06', ['b:b'])];
    const logs = [log('b:a', '2026-10-01', true), log('b:b', '2026-10-07', true)];
    expect(keptRecent(sessions, logs, '2026-10-06')).toEqual({ right: 0, total: 0 });
  });
  it('a round that ran out of time left items over', () => {
    expect(ranOut(lesson('2026-10-05', [], { practiceLeft: 3 }))).toBe(true);
    expect(ranOut(lesson('2026-10-05', []))).toBe(false);
  });
});

describe('today’s number of new words (spec §2.2)', () => {
  const base = { prev: 5, ceiling: 8, ranOut: [false, false] as [boolean, boolean] };
  it('starts at 4', () => expect(nextPace({ ...base, prev: null, kept: { right: 0, total: 0 } }).perDay).toBe(4));
  it('goes up one when he keeps at least 85% and the last round finished', () => {
    expect(nextPace({ ...base, kept: { right: 9, total: 10 } })).toEqual({ perDay: 6, reason: 'kept 9 of 10 recent new words' });
    expect(nextPace({ ...base, kept: { right: 9, total: 10 }, ranOut: [true, false] }).perDay).toBe(5); // not while revision ran out yesterday
  });
  it('goes down one when he keeps under 70%, or when the last two rounds both ran out of time', () => {
    expect(nextPace({ ...base, kept: { right: 6, total: 10 } }).perDay).toBe(4);
    expect(nextPace({ ...base, kept: { right: 10, total: 10 }, ranOut: [true, true] })).toEqual({ perDay: 4, reason: 'revision is piling up (the last two rounds ran out of time)' });
  });
  it('stays put in between, and with too few words to judge (the first week, review focus 5)', () => {
    expect(nextPace({ ...base, kept: { right: 8, total: 10 } }).perDay).toBe(5);
    expect(nextPace({ ...base, kept: { right: 7, total: 7 } })).toEqual({ perDay: 5, reason: 'too few recent new words to judge yet (7)' });
  });
  it('stays within 3–8 and under the parent’s ceiling, even when the ceiling drops below today’s number (review focus 5)', () => {
    expect(nextPace({ ...base, prev: 8, kept: { right: 10, total: 10 } }).perDay).toBe(8);
    expect(nextPace({ ...base, prev: 3, kept: { right: 0, total: 10 } }).perDay).toBe(3);
    expect(nextPace({ ...base, prev: 7, ceiling: 5, kept: { right: 10, total: 10 } }).perDay).toBe(5);
    expect(nextPace({ ...base, prev: 4, ceiling: 2, kept: { right: 0, total: 10 } }).perDay).toBe(2); // a ceiling under 3 is the parent's word
    expect(nextPace({ ...base, ceiling: 0, kept: { right: 9, total: 10 } })).toEqual({ perDay: 0, reason: 'new words are switched off' });
  });
});
```

Append to `src/session/record.test.ts`. Use the file's own imports; add `logsSince`, `getSettings`, `updateSettings`, `saveSession`, `createSessionRecord` and `localDateKey` where missing:

```ts
describe('pacing in the lesson plan (spec 2026-10-05 §2.2)', () => {
  it('a new install starts at 4 new words a day, under a ceiling of 8, and saves why', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    const rec = await startOrResumeSession(app.db, new Date(2026, 9, 6, 16));
    expect(rec.plan.newWordIds).toHaveLength(4);
    const s = await getSettings(app.db);
    expect(s.newPerDay).toBe(8);
    expect(s.pace).toMatchObject({ day: '2026-10-06', perDay: 4 });
  });
  it('the pace is worked out once a day', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await updateSettings(app.db, { pace: { day: '2026-10-06', perDay: 6, reason: 'kept 9 of 10 recent new words' } });
    expect((await startOrResumeSession(app.db, new Date(2026, 9, 6, 16))).plan.newWordIds).toHaveLength(6);
  });
});
```

Append to the Skills panel's test file (`src/parent/parentA.test.tsx` or wherever `SkillsPanel` is tested; find it with `grep -rln SkillsPanel src --include=*.test.tsx`):

```tsx
it("shows today's number of new words and why (spec 2026-10-05 §2.2)", async () => {
  const app = await makeAppData();
  await updateSettings(app.db, { newPerDay: 8, pace: { day: '2026-10-06', perDay: 5, reason: 'kept 9 of 10 recent new words' } });
  renderWithApp(<SkillsPanel />, app);
  expect(await screen.findByText('New words: 5 a day — kept 9 of 10 recent new words (most 8)')).toBeTruthy();
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/session src/parent`.
  - Expected: FAIL. `./pace` is missing, the default ceiling is 4, and the Skills line is absent.

- [ ] **Step 3: Implement.** Create `src/session/pace.ts`:

```ts
// How many new words a day (spec 2026-10-05 §2.2): found from how many he keeps, not fixed. A child's acquisition rate is his
// own (Burns et al.), and too many new words crowd revision out of 练一练.
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import type { ReviewLog, SessionRecord } from '../types';
import { introducedNewWords } from './runner';

export const PACE_START = 4;
export const PACE_MIN = 3;
export const PACE_MAX = 8;
const UP = 0.85;
const DOWN = 0.7;
const MIN_MEASURED = 8;
export const LOOKBACK_DAYS = 5;

/** Of the new words his lessons introduced in the last few days (not today), how many he recalled the first time each came back on a later day. */
export function keptRecent(sessions: SessionRecord[], logs: ReviewLog[], today: string): { right: number; total: number } {
  const since = localDateKey(addDays(parseDateKey(today), -LOOKBACK_DAYS));
  const reads = logs.filter((l) => l.kind === 'recognise').sort((a, b) => a.at - b.at);
  let right = 0;
  let total = 0;
  for (const s of sessions) {
    if (s.free || s.date < since || s.date >= today) continue;
    for (const id of introducedNewWords(s)) {
      const back = reads.find((l) => l.wordId === id && localDateKey(new Date(l.at)) > s.date);
      if (!back) continue;
      total += 1;
      if (back.correct) right += 1;
    }
  }
  return { right, total };
}

/** Did this lesson's 练一练 run out of time with items left for tomorrow? */
export const ranOut = (rec: SessionRecord): boolean => (rec.practiceLeft ?? 0) > 0;

/** Today's number: one up when he keeps most of them, one down when he doesn't or revision piles up; within 3–8 and the parent's ceiling. */
export function nextPace(i: { prev: number | null; ceiling: number; kept: { right: number; total: number }; ranOut: [boolean, boolean] }): { perDay: number; reason: string } {
  if (i.ceiling <= 0) return { perDay: 0, reason: 'new words are switched off' };
  const hi = Math.min(PACE_MAX, i.ceiling);
  const lo = Math.min(PACE_MIN, hi);
  const clamp = (n: number) => Math.max(lo, Math.min(hi, n));
  const base = clamp(i.prev ?? PACE_START);
  if (i.ranOut[0] && i.ranOut[1]) return { perDay: clamp(base - 1), reason: 'revision is piling up (the last two rounds ran out of time)' };
  if (i.kept.total < MIN_MEASURED) return { perDay: base, reason: `too few recent new words to judge yet (${i.kept.total})` };
  const rate = i.kept.right / i.kept.total;
  const reason = `kept ${i.kept.right} of ${i.kept.total} recent new words`;
  if (rate >= UP && !i.ranOut[0]) return { perDay: clamp(base + 1), reason };
  if (rate < DOWN) return { perDay: clamp(base - 1), reason };
  return { perDay: base, reason };
}
```

**`src/types.ts`:**
- Add `pace?: { day: string; perDay: number; reason: string }; // today's new words per day and why (spec 2026-10-05 §2.2)` to `Settings`.
- In `DEFAULT_SETTINGS` set `newPerDay: 8`. It is now the ceiling the app paces under.

**`src/session/plan.ts`:**
- Add `newPerDay?: number; // today's pace (spec 2026-10-05 §2.2); without one, the pace's start under the ceiling` to `PlanInput`.
- Take it in the destructuring.
- Replace the `newLimit` line with:

```ts
  const perDay = newPerDay ?? Math.min(settings.newPerDay, PACE_START);
  const newLimit = backlog > BACKLOG_PAUSE ? 0 : perDay;
```

  Import `PACE_START` from `./pace`.

**`src/session/record.ts`:** add, before `startOrResumeSession`:

```ts
/** Today's number of new words, worked out once a day from the last few lessons and saved for the Skills panel (spec 2026-10-05 §2.2). */
async function todaysPace(db: AppDb, now: Date, settings: Settings): Promise<number> {
  const today = localDateKey(now);
  if (settings.pace?.day === today) return settings.pace.perDay;
  const sessions = (await allSessions(db)).filter((s) => !s.free && s.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const logs = await logsSince(db, addDays(now, -(LOOKBACK_DAYS + 1)).getTime());
  const rounds = sessions.filter((s) => s.completedSteps.includes('practice')).slice(0, 2).map(ranOut);
  const pace = nextPace({ prev: settings.pace?.perDay ?? null, ceiling: settings.newPerDay, kept: keptRecent(sessions, logs, today), ranOut: [rounds[0] ?? false, rounds[1] ?? false] });
  await updateSettings(db, { pace: { day: today, ...pace } });
  return pace.perDay;
}
```

In `startOrResumeSession`, pass `newPerDay: await todaysPace(db, now, settings)` into `buildSessionPlan({ … })`. Import as needed:
- `addDays` from `../lib/date`;
- `allSessions`, `logsSince`, `updateSettings` from `../store/repo`;
- `keptRecent`, `nextPace`, `ranOut`, `LOOKBACK_DAYS` from `./pace`;
- `type Settings`.

**`src/parent/SkillsPanel.tsx`:** after the placement paragraph, add:

```tsx
      {d.settings.pace && <p>New words: {d.settings.pace.perDay} a day — {d.settings.pace.reason} (most {d.settings.newPerDay})</p>}
```

**`src/parent/SettingsPanel.tsx`:** the label becomes `New words per day: the most (the app finds his number, from 3 up to this)`.

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/session src/parent src/app && npx tsc --noEmit -p .`.
  - Expected: PASS.
  - **Tests expecting the old default.** A test that relied on `newPerDay` defaulting to 4 still gets 4 new words: the pace starts there. A test asserting `DEFAULT_SETTINGS.newPerDay === 4`, or the settings field showing 4, changes to 8, with a ruling.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: new words per day adapt (3–8) to how many he keeps; the parent's number is the ceiling"`

### Task 5: The card asks what the round wants; 认新字 shows a missed word again

**Files:**
- Modify:
  - `src/activities/flashcards/meaning.ts` (export `wordCue`);
  - `src/activities/flashcards/FlashcardStep.tsx` (`ask`, `reintroOnMiss`);
  - `src/activities/flashcards/meaning.test.ts`, `src/activities/flashcards/FlashcardStep.test.tsx`.

**Interfaces:**
- **Consumes:** nothing new.
- **Produces:**
  - `wordCue(word: Word): MeaningCue | null`: the 组词 cue alone;
  - `FlashcardStep` props `ask?: 'read' | 'listen' | 'word'` and `reintroOnMiss?: boolean`. Without them, it behaves exactly as today.

- [ ] **Step 1: Write the failing tests.** Append to `src/activities/flashcards/meaning.test.ts` (import `wordCue` and `bankFor`):

```ts
describe('wordCue: the 词语 rung (spec 2026-10-05 §3.2)', () => {
  it('is the 组词 cue alone, even for a word that has a sentence', () => {
    const w = builtinWords(0).find((x) => bankFor(x.text) && wordCue(x))!;
    expect(meaningCue(w)!.kind).toBe('sentence'); // meaningCue still puts the sentence first
    expect(wordCue(w)!.kind).toBe('word');
  });
  it('is null without a usable 组词', () => {
    expect(wordCue(makeWord('欺负', { examples: [] }))).toBeNull();
  });
});
```

Append to `src/activities/flashcards/FlashcardStep.test.tsx`. Import `wordCue` and `bankFor`, plus `act` and `screen` if missing:

```tsx
describe('asked by the round (spec 2026-10-05 §3.2)', () => {
  it("ask 'word': the 组词 gap, even for a word that has a sentence", () => {
    const w = pool.find((x) => bankFor(x.text) && wordCue(x))!;
    const cue = wordCue(w)!;
    render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: false, retry: false, mode: 'meaning' }} ask="word" voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.stage__card')!.textContent).toContain(cue.before || cue.after);
    expect(screen.getByRole('button', { name: w.text })).toBeTruthy();
  });
  it("ask 'read': pick the pinyin, even with the voice on and an even review count", () => {
    render(<FlashcardStep {...base} item={review} ask="read" voice onDone={vi.fn()} />);
    expect(screen.getByRole('button', { name: he.pinyin })).toBeTruthy();
  });
  it("ask 'listen': hear it, find the character", () => {
    const w = pool.find((x) => x.text === '他')!;
    render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: false, retry: false }} ask="listen" voice onDone={vi.fn()} />);
    expect(screen.getByRole('button', { name: '他' })).toBeTruthy();
  });
});

describe('认新字: a missed word is shown again (spec 2026-10-05 §2.1)', () => {
  it('after a miss, 继续 shows the card again; 我记住了！ then moves on, once', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} ask="read" reintroOnMiss voice={false} onDone={onDone} />);
    fireEvent.click(screen.getByText('我记住了！'));
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText('我记住了！')).toBeTruthy(); // the card again
    fireEvent.click(screen.getByText('我记住了！'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0]).toMatchObject({ correct: false, asked: 'read' });
  });
  it('a right answer moves straight on', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} ask="read" reintroOnMiss voice={false} onDone={onDone} />);
    fireEvent.click(screen.getByText('我记住了！'));
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/activities/flashcards`.
  - Expected: FAIL. `wordCue` isn't exported, the `ask` prop is ignored, and a miss calls `onDone` at once.

- [ ] **Step 3: Implement.**

**`src/activities/flashcards/meaning.ts`:**
- Move the `for (const ex of word.examples ?? [])` loop at the end of `meaningCue` into a new exported function, placed above `meaningCue`:

```ts
/** The 组词 cue alone, for the 词语 rung (spec 2026-10-05 §3.2): a longer word that uses this one once, at its reading, whose other part is not a glue character. */
export function wordCue(word: Word): MeaningCue | null {
  for (const ex of word.examples ?? []) {
    if (ex.text.length <= word.text.length) continue;
    const at = ex.text.indexOf(word.text);
    if (at < 0 || ex.text.indexOf(word.text, at + 1) >= 0) continue; // once only: 妈妈 would give it away
    if (!sameReading(ex.pinyin, Array.from(ex.text.slice(0, at)).length, word)) continue;
    const before = ex.text.slice(0, at);
    const after = ex.text.slice(at + word.text.length);
    const rest = before + after;
    if (Array.from(rest).length === 1 && GLUE.has(rest)) continue;
    return { kind: 'word', source: 'word', full: ex.text, pinyin: ex.pinyin, before, after };
  }
  return null;
}
```

- End `meaningCue` with `return wordCue(word);` in place of the loop and its `return null`.

**`src/activities/flashcards/FlashcardStep.tsx`:**
- Import `wordCue`.
- Add to `Props`:

```ts
  /** what 认新字 or 练一练 asks (spec 2026-10-05 §3.2): read (pinyin), listen (find the character), word (the 组词 gap). Without it the card decides, as before. */
  ask?: 'read' | 'listen' | 'word';
  /** 认新字: after a miss the card shows again before moving on (spec 2026-10-05 §2.1) */
  reintroOnMiss?: boolean;
```

- Destructure both.
- In the `quiz` memo, the cue and the listen choice become:

```ts
    const cue = ask === 'word' ? wordCue(word) : ask ? null : item.mode === 'meaning' ? meaningCue(word) : null;
```

  and:

```ts
    const listen = voice && lookAlikes.length >= 3 && (ask ? ask === 'listen' : (card?.fsrs.reps ?? 0) % 2 === 0);
```

- Add state `const [again, setAgain] = useState(false);`.
- Add, after `next`:

```ts
  // 认新字: a miss shows the card again before he moves on; the word comes first in 练一练 too
  const proceed = () => {
    if (reintroOnMiss && result && !result.correct && !again) {
      setAgain(true);
      setPhase('intro');
    } else next();
  };
```

- The intro sheet's action becomes `onAction={() => (again ? next() : setPhase('quiz'))}`.
- The feedback sheet's `onAction={next}` becomes `onAction={proceed}`.

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/activities src/app && npx tsc --noEmit -p .`.
  - Expected: PASS. Every existing `FlashcardStep` test still passes, because without `ask` nothing changes.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: the card asks what the round wants (read, listen, 组词); a word missed in 认新字 is shown again"`

### Task 6: Who is in the round, what each word can be asked, and the question on screen

**Files:**
- Create:
  - `src/session/practice.ts`, `src/session/practice.test.ts`;
  - `src/activities/practice/PracticeQuestion.tsx`, `src/activities/practice/PracticeQuestion.test.tsx`.

**Interfaces:**
- **Consumes:**
  - `buildRound`, `RoundWord`, `PracticeItem`, `Ask` (Task 2);
  - `startRung` (Task 1);
  - `introducedNewWords` (runner);
  - `wordCue` and `ask`/`reintroOnMiss` (Task 5);
  - `meaningCue`; `fitItem`, `usageItem` (`src/practice/useItems.ts`); `bankFor` (`src/content/sentenceBank.ts`).
- **Produces:**
  - `practiceWords(rec: SessionRecord, rungs: ReadonlyMap<string, number>): RoundWord[]`;
  - `askable(word: Word | undefined, pool: Word[], voice: boolean): (ask: Ask) => boolean`;
  - `planPractice(rec, rungs, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng): PracticeItem[]`;
  - `planFreePlay(cards: CardRecord[], words: Word[], rungs, voice: boolean, rng: Rng, n?: number): PracticeItem[]`;
  - `PracticeResult { correct; hard; responseMs; elapsedMs; inContext; asked: 'read' | 'meaning' | 'use' }`;
  - `PracticeQuestion` props `{ item: PracticeItem; word: Word; pool: Word[]; card?: CardRecord; voice: boolean; kid: KidState; resting: TruffleMood; combo: number; closeupReady: boolean; onDone: (r: PracticeResult | null) => void }`.

- [ ] **Step 1: Write the failing tests.** Create `src/session/practice.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { wordCue } from '../activities/flashcards/meaning';
import { builtinWords } from '../content';
import { bankFor } from '../content/sentenceBank';
import { mulberry32 } from '../lib/random';
import { makeCard } from '../test/fixtures';
import type { SessionPlan } from '../types';
import { askable, planFreePlay, planPractice, practiceWords } from './practice';
import { createSessionRecord } from './runner';

const words = builtinWords(0);
const byId = new Map(words.map((w) => [w.id, w]));
const id = (t: string) => words.find((w) => w.text === t)!.id;
const plan = (over: Partial<SessionPlan> = {}): SessionPlan => ({ steps: ['newwords', 'practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 1, writeCandidates: [], writeCount: 0, ...over });

describe('who is in 练一练 (spec 2026-10-05 §3.1)', () => {
  it('the new words 认新字 introduced, from 字, three times; a word missed there comes back first', () => {
    const rec = { ...createSessionRecord(plan({ newWordIds: [id('河'), id('他')] }), '2026-10-06', 0), flashIndex: 2, recalls: { [id('他')]: { right: 0, inContext: 0, missed: true } } };
    const ws = practiceWords(rec, new Map());
    expect(ws.map((w) => [w.wordId, w.isNew, w.from, w.appearances, !!w.early])).toEqual([[id('河'), true, 1, 3, false], [id('他'), true, 1, 3, true]]);
    expect(ws.every((w) => !w.gradesRecognise && w.gradesMeaning)).toBe(true); // reading was graded in 认新字
  });
  it('a new word 认新字 never reached (its time ran out) is not in the round', () => {
    const rec = { ...createSessionRecord(plan({ newWordIds: [id('河'), id('他')] }), '2026-10-06', 0), flashIndex: 1 };
    expect(practiceWords(rec, new Map()).map((w) => w.wordId)).toEqual([id('河')]);
  });
  it('due revision starts on the rung after his best: once from 词语 or 句子, twice from 字', () => {
    const rec = createSessionRecord(plan({ reviewWordIds: [id('很'), id('火')], meaningReviewIds: [id('很')], newMeaningIds: [id('山')] }), '2026-10-06', 0);
    const ws = practiceWords(rec, new Map([[id('很'), 2], [id('山'), 1]]));
    expect(ws.map((w) => [w.wordId, w.from, w.appearances, w.gradesRecognise, w.gradesMeaning])).toEqual([
      [id('很'), 3, 1, true, true],
      [id('火'), 1, 2, true, false],
      [id('山'), 2, 1, false, true],
    ]);
  });
});

describe('what a word can be asked', () => {
  it('reading always; listening only with the voice on; 组词 only with a 组词; a sentence only with a sentence; 用对了吗 only for bank words', () => {
    const w = words.find((x) => bankFor(x.text) && wordCue(x))!;
    const can = askable(w, words, true);
    expect(['read', 'listen', 'word', 'fit', 'usage'].every((a) => can(a as never))).toBe(true);
    expect(askable(w, words, false)('listen')).toBe(false);
    const plain = words.find((x) => !bankFor(x.text) && !wordCue(x) && !(x.sentences?.length))!;
    expect(['word', 'fit', 'usage'].some((a) => askable(plain, words, true)(a as never))).toBe(false);
    expect(askable(undefined, words, true)('read')).toBe(false); // a word deleted since the plan
  });
  it('the round leaves out paused and deleted words', () => {
    const paused = { ...byId.get(id('火'))!, paused: true };
    const rec = createSessionRecord(plan({ reviewWordIds: [id('火'), 'b:gone', id('山')] }), '2026-10-06', 0);
    const items = planPractice(rec, new Map(), new Map([...byId, [paused.id, paused]]), words, false, mulberry32(1));
    expect(new Set(items.map((x) => x.wordId))).toEqual(new Set([id('山')]));
  });
  it('free play: words he knows, never graded', () => {
    const cards = ['河', '他', '山', '火', '很'].map((t) => makeCard(id(t), 'recognise', new Date(2026, 9, 1), true));
    const items = planFreePlay(cards, words, new Map(), false, mulberry32(2));
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((x) => x.grades === null && x.retry)).toBe(true);
    expect(new Set(items.map((x) => x.wordId)).size).toBe(5);
  });
});
```

Create `src/activities/practice/PracticeQuestion.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../../content';
import { bankFor } from '../../content/sentenceBank';
import { DEFAULT_KID } from '../../types';
import { PracticeQuestion } from './PracticeQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));

const pool = builtinWords(0);
const he = pool.find((w) => w.text === '河')!;
const bankWord = pool.find((w) => bankFor(w.text))!;
const base = { pool, voice: false, kid: DEFAULT_KID, resting: 'sulk' as const, combo: 0, closeupReady: false };

describe('a 练一练 question (spec 2026-10-05 §3.2)', () => {
  it('字: asks straight away (no intro card) and reports what it asked', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={he} item={{ wordId: he.id, rung: 1, ask: 'read', grades: 'recognise', retry: false }} onDone={onDone} />);
    expect(screen.queryByText('我记住了！')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'read' }));
  });
  it('句子: 用对了吗 on the stage; the answer comes back as a use answer after 继续', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={bankWord} item={{ wordId: bankWord.id, rung: 3, ask: 'usage', grades: 'use', retry: false }} onDone={onDone} />);
    fireEvent.click(document.querySelector<HTMLButtonElement>('.usage-opts .choice')!);
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'use', inContext: true }));
  });
  it('a sentence question that can no longer be made is skipped', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={he} item={{ wordId: he.id, rung: 3, ask: 'usage', grades: 'use', retry: false }} onDone={onDone} />);
    expect(onDone).toHaveBeenCalledWith(null);
  });
});
```

(`河` is not in the bank, so its `usage` item can't be built.) The executor checks this with `bankFor('河')` before relying on it. If 河 is in the bank, use a word that `bankFor` misses.

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/session/practice.test.ts src/activities/practice`.
  - Expected: FAIL. `./practice` and `./PracticeQuestion` cannot be resolved.

- [ ] **Step 3: Implement.** Create `src/session/practice.ts`:

```ts
// Who is in 练一练 and what each word can be asked (spec 2026-10-05 §3.1–3.2). The order and the climbing are round.ts's.
import { meaningCue, wordCue } from '../activities/flashcards/meaning';
import { bankFor } from '../content/sentenceBank';
import { mulberry32, shuffle, type Rng } from '../lib/random';
import { fitItem } from '../practice/useItems';
import type { CardRecord, SessionRecord, Word } from '../types';
import { startRung } from './ladder';
import { buildRound, type Ask, type PracticeItem, type RoundWord } from './round';
import { introducedNewWords } from './runner';

/** Words in a free-play round (two questions each). */
export const FREE_PLAY_WORDS = 10;

/** Today's new words that 认新字 introduced (three climbs from 字; a miss there comes back first), then due revision, most due first. */
export function practiceWords(rec: SessionRecord, rungs: ReadonlyMap<string, number>): RoundWord[] {
  const introduced = introducedNewWords(rec);
  const fresh: RoundWord[] = introduced.map((wordId) => ({
    wordId, isNew: true, from: 1, appearances: 3, gradesRecognise: false, gradesMeaning: true, early: rec.recalls?.[wordId]?.missed ?? false,
  }));
  const reading = new Set(rec.plan.reviewWordIds);
  const meaning = new Set([...(rec.plan.meaningReviewIds ?? []), ...(rec.plan.newMeaningIds ?? [])]);
  const seen = new Set(introduced);
  const revision: RoundWord[] = [];
  for (const wordId of [...rec.plan.reviewWordIds, ...(rec.plan.meaningReviewIds ?? []), ...(rec.plan.newMeaningIds ?? [])]) {
    if (seen.has(wordId)) continue;
    seen.add(wordId);
    const from = startRung(rungs.get(wordId) ?? 0);
    revision.push({ wordId, isNew: false, from, appearances: from === 1 ? 2 : 1, gradesRecognise: reading.has(wordId), gradesMeaning: meaning.has(wordId) });
  }
  return [...fresh, ...revision];
}

/** Whether a question type can be asked of this word: reading always, listening with the voice on, the rest when their content exists. */
export function askable(word: Word | undefined, pool: Word[], voice: boolean): (ask: Ask) => boolean {
  return (ask) => {
    if (!word || word.paused) return false;
    switch (ask) {
      case 'read': return true;
      case 'listen': return voice;
      case 'word': return wordCue(word) !== null;
      case 'fit': return meaningCue(word)?.kind === 'sentence' && fitItem(word, pool, mulberry32(1)) !== null;
      case 'usage': return !!bankFor(word.text);
    }
  };
}

export function planPractice(rec: SessionRecord, rungs: ReadonlyMap<string, number>, wordsById: ReadonlyMap<string, Word>, pool: Word[], voice: boolean, rng: Rng): PracticeItem[] {
  const words = practiceWords(rec, rungs).filter((w) => askable(wordsById.get(w.wordId), pool, voice)('read'));
  return buildRound(words, (id, ask) => askable(wordsById.get(id), pool, voice)(ask), rng);
}

/** 再玩一会儿: a round of words he has begun, from their own rungs, twice each; practice only. */
export function planFreePlay(cards: CardRecord[], words: Word[], rungs: ReadonlyMap<string, number>, voice: boolean, rng: Rng, n = FREE_PLAY_WORDS): PracticeItem[] {
  const byId = new Map(words.filter((w) => !w.paused).map((w) => [w.id, w]));
  const ids = shuffle([...new Set(cards.filter((c) => c.kind === 'recognise' && byId.has(c.wordId)).map((c) => c.wordId))], rng).slice(0, n);
  const round = buildRound(
    ids.map((wordId) => ({ wordId, isNew: false, from: startRung(rungs.get(wordId) ?? 0), appearances: 2, gradesRecognise: false, gradesMeaning: false })),
    (id, ask) => askable(byId.get(id), words, voice)(ask),
    rng,
  );
  return round.map((x) => ({ ...x, grades: null, retry: true }));
}
```

Create `src/activities/practice/PracticeQuestion.tsx`:

```tsx
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { mulberry32 } from '../../lib/random';
import { fitItem, usageItem } from '../../practice/useItems';
import type { PracticeItem } from '../../session/round';
import type { CardRecord, KidState, Word } from '../../types';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import { UseQuestion } from '../choose/UseQuestion';
import { FlashcardStep } from '../flashcards/FlashcardStep';

export interface PracticeResult {
  correct: boolean;
  hard: boolean;
  responseMs: number;
  elapsedMs: number;
  inContext: boolean;
  asked: 'read' | 'meaning' | 'use';
}

interface Props {
  item: PracticeItem;
  word: Word;
  pool: Word[];
  card?: CardRecord;
  voice: boolean;
  kid: KidState;
  resting: TruffleMood;
  combo: number;
  closeupReady: boolean;
  onDone: (r: PracticeResult | null) => void; // null: this question can't be made any more (skip it)
}

/** One 练一练 question (spec 2026-10-05 §3.2): 字 and 词语 on the card, a sentence on the 选一选 stage. */
export function PracticeQuestion({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone }: Props) {
  const sentence = item.ask === 'fit' || item.ask === 'usage';
  const use = useMemo(
    () => (item.ask === 'fit' ? fitItem(word, pool, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0), 0) : item.ask === 'usage' ? usageItem(word.text, word.id) : null),
    [item, word.id],
  );
  const answer = useRef<{ correct: boolean; ms: number } | null>(null);
  const shownAt = useRef(performance.now());
  useEffect(() => {
    if (sentence && !use) onDone(null);
  }, []);

  if (!sentence) {
    return (
      <FlashcardStep
        item={{ wordId: word.id, isNew: false, retry: item.retry, mode: item.ask === 'word' ? 'meaning' : 'read' }}
        ask={item.ask as 'read' | 'listen' | 'word'}
        word={word} pool={pool} card={card} voice={voice} kid={kid} resting={resting} combo={combo} closeupReady={closeupReady}
        onDone={(r) => onDone(r)}
      />
    );
  }
  if (!use) return null;
  return (
    <UseQuestion
      item={use}
      kid={kid}
      resting={resting}
      onAnswer={(correct, ms) => {
        answer.current = { correct, ms };
      }}
      onNext={() => {
        const a = answer.current;
        if (a) onDone({ correct: a.correct, hard: false, responseMs: a.ms, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: true, asked: 'use' });
      }}
    />
  );
}
```

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run src/session src/activities && npx tsc --noEmit -p .`.
  - Expected: PASS.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: who is in 练一练 and what each word can be asked; one PracticeQuestion for every rung"`

### Task 7: The switch — the new lesson in SessionScreen, plan, settings and path

**Files:**
- Modify:
  - `src/types.ts`;
  - `src/session/plan.ts`, `src/session/plan.test.ts`;
  - `src/store/settings.ts`, `src/store/settings.test.ts`;
  - `src/parent/SettingsPanel.tsx`;
  - `src/app/SessionScreen.tsx`, `src/app/SessionScreen.test.tsx`;
  - `src/session/runner.ts` (drop the old free play);
  - every test that sets `activities` with the old keys: `src/app/langduSession.test.tsx`, `src/app/homeOnlyReading.test.tsx`, `src/app/kantuSession.test.tsx`, `src/app/celebration.test.tsx`, `src/content/readingFixes.test.ts`, `src/parent/parentB.test.tsx`, `src/session/record.test.ts`.

**Interfaces:**
- **Consumes:** everything from Tasks 1–6.
- **Produces:**
  - `ActivityKind = 'newwords' | 'practice' | 'writing' | 'speaking'`;
  - `LegacyStep = 'flashcards' | 'choose' | 'components' | 'wrapup'`;
  - `StepKind = ActivityKind | LegacyStep`;
  - `STEP_ORDER = ['newwords', 'practice', 'writing', 'speaking']`;
  - `PRACTICE_SHARE = 12 / 30`;
  - settings `lessonVersion: 4`.

- [ ] **Step 1: Write the failing tests.**

**`src/session/plan.test.ts`:**
- Replace the tests about step order, 用一用 and `flashTimeBoxMs` with these.
- Delete the `newWordMeaningIds` tests: new words' meaning is now graded in 练一练.

```ts
describe('the lesson (spec 2026-10-05 §2)', () => {
  it('认新字 → 练一练 → 写一写 → 朗读, with no separate 用一用', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).steps).toEqual(['newwords', 'practice', 'writing', 'speaking']);
  });
  it('练一练 has about 12 of 30 minutes', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).practiceTimeBoxMs).toBe(12 * 60_000);
  });
  it('with 新字 switched off there are no new words', () => {
    const settings = { ...DEFAULT_SETTINGS, activities: { ...DEFAULT_SETTINGS.activities, newwords: false } };
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings, now: new Date(2026, 9, 6) }).newWordIds).toEqual([]);
  });
});
```

**`src/store/settings.test.ts`:** append:

```ts
describe('lessonVersion 4 (spec 2026-10-05 §7)', () => {
  const old = (activities: Record<string, boolean>, newPerDay = 4) => ({ ...DEFAULT_SETTINGS, lessonVersion: 3, newPerDay, activities: activities as never });
  it('maps the old switches: 认一认 → 新字 and 练一练; 选一选 or 钓鱼 → 练一练', () => {
    expect(migrateSettings(old({ flashcards: true, choose: true, components: true, writing: true, speaking: false }))!.activities).toEqual({ newwords: true, practice: true, writing: true, speaking: false });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: true, writing: false, speaking: true }))!.activities).toEqual({ newwords: false, practice: true, writing: false, speaking: true });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: false, writing: true, speaking: true }))!.activities).toEqual({ newwords: false, practice: false, writing: true, speaking: true });
  });
  it('the old default 4 new words a day becomes the ceiling 8; a parent’s own number stays', () => {
    expect(migrateSettings(old({}, 4))!.newPerDay).toBe(8);
    expect(migrateSettings(old({}, 6))!.newPerDay).toBe(6);
    expect(migrateSettings(old({}, 4))!.lessonVersion).toBe(4);
  });
  it('a settings object already on 4 is left alone', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS })).toBeNull();
  });
});
```

**`src/app/SessionScreen.test.tsx`:**
- `flashOnly` becomes `const lessonOnly = { newwords: true, practice: true, writing: false, speaking: false };`, used by `setup()`.
- Add `getRungs`, `noteRung` and `saveSession` to the repo import.
- Add `createSessionRecord` from `../session/runner`.
- Replace the test `'runs a short daily session to the celebration and saves progress'` with:

```tsx
  it('runs 认新字 then 练一练 to the celebration (spec 2026-10-05 §2)', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    const stages: string[] = [];
    for (let i = 0; i < 40 && !screen.queryByText('太棒了！'); i++) {
      await waitFor(() => expect(screen.queryByText('太棒了！') ?? screen.queryByText('我记住了！') ?? document.querySelector('.choice:not([disabled])')).toBeTruthy());
      if (screen.queryByText('太棒了！')) break;
      stages.push(document.querySelector('[data-stage]')!.getAttribute('data-stage')!);
      if (screen.queryByText('我记住了！')) {
        fireEvent.click(screen.getByText('我记住了！'));
        continue;
      }
      fireEvent.click(document.querySelector<HTMLButtonElement>('.choice:not([disabled])')!);
      fireEvent.click(screen.getByText('继续'));
    }
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    const rec = (await getSession(app.db, '2026-10-02'))!;
    expect(rec.completed).toBe(true);
    expect(rec.completedSteps).toEqual(['newwords', 'practice']);
    expect(rec.practiceQueue!.filter((x) => !x.retry).length).toBeGreaterThanOrEqual(6); // two new words, three climbs each
    expect((await allCards(app.db)).filter((c) => c.kind === 'recognise')).toHaveLength(2);
    expect((await getRungs(app.db)).size).toBe(2);
  });
```

- **Meaning test.** In `'a begun word with a 组词 cue gets a meaning question…'`:
  - use `lessonOnly`;
  - answer through to `太棒了！` with the same generic loop;
  - keep its assertion that `b:惜:meaning` exists;
  - add `expect((await getRungs(app.db)).get('b:惜')).toBeGreaterThanOrEqual(0);`.
- **Sentence test.** Rewrite `'选一选 in the lesson'` as `'句子 questions for words he already climbed'`:
  - same words 很 在 和 跟, with due recognise cards;
  - before rendering, seed their rungs with `noteRung(app.db, id, 2, true, new Date(2026, 9, 1))`, so they start at 句子;
  - use `lessonOnly`, with the generic loop;
  - assertions: a meaning card exists, and `answersSince` holds `skill: 'use'` answers.
- **New tests.** Append:

```tsx
describe('the lesson at its edges (review focus)', () => {
  it('a lesson saved before the change finishes in the old flow (review focus 1)', async () => {
    const app = await setup();
    const he = byText.get('河')!;
    const legacy = { ...createSessionRecord({ steps: ['flashcards'], reviewWordIds: [], newWordIds: [he.id], flashTimeBoxMs: 600_000, writeCandidates: [], writeCount: 0 }, '2026-10-02', 0), activeMs: 1 };
    await saveSession(app.db, legacy);
    renderWithApp(<SessionScreen free={false} />, app);
    for (let i = 0; i < 12 && !screen.queryByText('太棒了！'); i++) {
      await waitFor(() => expect(screen.queryByText('太棒了！') ?? screen.queryByText('我记住了！') ?? document.querySelector('.choice:not([disabled])')).toBeTruthy());
      if (screen.queryByText('太棒了！')) break;
      if (screen.queryByText('我记住了！')) { fireEvent.click(screen.getByText('我记住了！')); continue; }
      fireEvent.click(document.querySelector<HTMLButtonElement>('.choice:not([disabled])')!);
      fireEvent.click(screen.getByText('继续'));
    }
    expect((await getSession(app.db, '2026-10-02'))!.completedSteps).toEqual(['flashcards']);
  });
  it('with nothing new or due, the lesson still finishes (review focus 4)', async () => {
    const app = await setup();
    await updateSettings(app.db, { newPerDay: 0 });
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('太棒了！')).toBeTruthy();
  });
  it('a double tap on 继续 moves one item and grades once (review focus 2)', async () => {
    const app = await setup();
    await updateSettings(app.db, { newPerDay: 0 });
    await putCards(app.db, ['山', '火', '水'].map((t) => makeCard(byText.get(t)!.id, 'recognise', new Date(2026, 9, 1), true)));
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(document.querySelector('.choice:not([disabled])')).toBeTruthy());
    fireEvent.click(document.querySelector<HTMLButtonElement>('.choice:not([disabled])')!);
    const next = screen.getByText('继续');
    fireEvent.click(next);
    fireEvent.click(next);
    await waitFor(async () => expect((await getSession(app.db, '2026-10-02'))!.practiceIndex).toBe(1));
    expect((await logsSince(app.db, 0)).filter((l) => l.kind === 'recognise')).toHaveLength(1);
  });
  it("a paused word's items are skipped and the round still finishes (review focus 3)", async () => {
    const app = await setup();
    await updateSettings(app.db, { newPerDay: 0 });
    await putCards(app.db, ['山', '火'].map((t) => makeCard(byText.get(t)!.id, 'recognise', new Date(2026, 9, 1), true)));
    const first = renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(async () => expect((await getSession(app.db, '2026-10-02'))?.practiceQueue?.length).toBeGreaterThan(0));
    first.unmount();
    const fire = (await getWord(app.db, byText.get('火')!.id))!;
    await putWords(app.db, [{ ...fire, paused: true }]);
    renderWithApp(<SessionScreen free={false} />, app);
    for (let i = 0; i < 12 && !screen.queryByText('太棒了！'); i++) {
      await waitFor(() => expect(screen.queryByText('太棒了！') ?? document.querySelector('.choice:not([disabled])')).toBeTruthy());
      if (screen.queryByText('太棒了！')) break;
      fireEvent.click(document.querySelector<HTMLButtonElement>('.choice:not([disabled])')!);
      fireEvent.click(screen.getByText('继续'));
    }
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await getRungs(app.db)).has(byText.get('火')!.id)).toBe(false);
  });
});
```

Add `logsSince` to the repo import.

- [ ] **Step 2: Run them.**
  - Command: `npx vitest run src/session src/store src/app/SessionScreen.test.tsx`.
  - Expected: FAIL. The steps are still the old ones, the migration stops at v3, and SessionScreen renders nothing for `newwords`/`practice`.

- [ ] **Step 3: Implement.**

**`src/types.ts`:**

```ts
/** The parent can switch each of these on or off (spec 2026-10-05 §7). */
export type ActivityKind = 'newwords' | 'practice' | 'writing' | 'speaking';
/** Steps of lessons saved before the 2026-10-05 redesign; such a lesson finishes in its own flow. */
export type LegacyStep = 'flashcards' | 'choose' | 'components' | 'wrapup';
export type StepKind = ActivityKind | LegacyStep;
```

  In `DEFAULT_SETTINGS`: `activities: { newwords: true, practice: true, writing: true, speaking: true }` and `lessonVersion: 4`.

**`src/session/plan.ts`:**
- `STEP_ORDER` becomes `['newwords', 'practice', 'writing', 'speaking']; // spec 2026-10-05 §2`.
- Replace `FLASH_SHARE` with `export const PRACTICE_SHARE = 12 / 30; // 练一练's share of the lesson (spec 2026-10-05 §2)`.
- `newLimit` becomes `backlog > BACKLOG_PAUSE || !settings.activities.newwords ? 0 : perDay`.
- `steps` is `STEP_ORDER.filter((s) => settings.activities[s])`, with no 用一用 push.
- In the returned plan:
  - `flashTimeBoxMs: 0, // only lessons saved before 2026-10-05 time-boxed 认一认`;
  - `practiceTimeBoxMs: Math.round(settings.sessionMinutes * 60_000 * PRACTICE_SHARE)`;
  - drop `newWordMeaningIds`.

**`src/store/settings.ts`:**

```ts
/**
 * One-off moves for existing installs; only an old default moves, a parent's own choice stays.
 * Plan 11 (v2): a 20-minute lesson grows to 30. Plan 13 (v3): 5 new words a day becomes 4 (spec §20 part 2).
 * Lesson redesign (v4, spec 2026-10-05 §7): the activity switches become 新字 / 练一练 / 写一写 / 朗读, and the old default
 * number of new words becomes the ceiling 8 the app paces under (§2.2).
 */
export function migrateSettings(s: Settings): Partial<Settings> | null {
  const v = s.lessonVersion ?? 1;
  if (v >= 4) return null;
  const patch: Partial<Settings> = {};
  if (v < 2) patch.sessionMinutes = s.sessionMinutes === 20 ? 30 : s.sessionMinutes;
  const perDay = v < 3 && s.newPerDay === 5 ? 4 : s.newPerDay;
  patch.newPerDay = perDay === 4 ? 8 : perDay;
  const was = s.activities as unknown as Partial<Record<'flashcards' | 'choose' | 'components' | 'writing' | 'speaking', boolean>>;
  const on = (k: keyof typeof was) => was[k] ?? true;
  patch.activities = { newwords: on('flashcards'), practice: on('flashcards') || on('choose') || on('components'), writing: on('writing'), speaking: on('speaking') };
  patch.lessonVersion = 4;
  return patch;
}
```

  In `applySettingsMigration`, pass the stored switches, not today's defaults merged over them:

```ts
  const patch = migrateSettings({ ...(await getSettings(db)), lessonVersion: raw.lessonVersion, activities: raw.activities ?? DEFAULT_SETTINGS.activities });
```

  (import `DEFAULT_SETTINGS`).
  - **Old keys in storage.** `updateSettings` merges a patch. If it merges `activities` key by key, make the migration's patch replace the whole `activities` object so the old keys don't linger; check `updateSettings` in `src/store/repo.ts`.
  - **`getSettings`.** It fills `activities` from `DEFAULT_SETTINGS.activities`, which now carries the new keys.

**`src/parent/SettingsPanel.tsx`:**

```ts
const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  newwords: '认新字: new words, first',
  practice: '练一练: practice and revision (reading, 词语, sentences)',
  writing: '听写 writing',
  speaking: '朗读 reading aloud',
};
```

**`src/session/runner.ts`:** delete `createFreePlayRecord`.

**`src/session/plan.ts`:** delete `buildFreePlayQueue` and `FREE_PLAY_SIZE`, and remove their tests.

**`src/app/SessionScreen.tsx`:**
- **Imports.** Add:
  - `PracticeQuestion`, `type PracticeResult` from `../activities/practice/PracticeQuestion`;
  - `planFreePlay`, `planPractice` from `../session/practice`;
  - `startPractice`, `currentPracticeItem`, `afterPracticeAnswer`, `skipPracticeItem`, `createFreePracticeRecord` from `../session/runner`;
  - `getRungs`, `noteRung` from `../store/repo`;
  - `USE_READING_MS` with the other `../session/record` imports.

  Remove `buildFreePlayQueue` and `createFreePlayRecord`.
- **Free play.** In the load effect, free play becomes:

```ts
      const rec = free
        ? createFreePracticeRecord(planFreePlay(know.cards, know.words, await getRungs(db), voice, rng), localDateKey(today), today.getTime())
        : await startOrResumeSession(db, today);
```

- **Current item.** After `writeWord`:

```ts
  const practiceItem = rec ? currentPracticeItem(rec) : null;
  const practiceWord = practiceItem ? state!.know.wordsById.get(practiceItem.wordId) : undefined;
  const planning = useRef(false); // 练一练's round is being built (it reads his rungs)
```

  Place the `useRef` with the other hooks at the top, before any early return.
- **Skip effect.** The first two flash lines cover 认新字 too:

```ts
    if ((step === 'flashcards' || step === 'newwords') && !flashItem) void commit(finishStep(cur));
    else if ((step === 'flashcards' || step === 'newwords') && (!flashWord || flashWord.paused)) void commit(skipFlashItem(cur));
```

  and, before the `speaking` line:

```ts
    else if (step === 'practice' && !rec.practiceQueue) {
      if (!planning.current) {
        planning.current = true;
        void (async () => {
          const queue = planPractice(cur, await getRungs(db), state.know.wordsById, state.know.words, voice, mulberry32(Date.now() >>> 0));
          planning.current = false;
          await commit(startPractice(latest.current ?? cur, queue));
        })();
      }
    } else if (step === 'practice' && practiceItem && (!practiceWord || practiceWord.paused)) void commit(skipPracticeItem(cur));
```

- **The answer handler.** Add after `onFlashDone`:

```ts
  /** A 练一练 answer (spec 2026-10-05 §3.5): grade the card the item grades (never a retry or free play), note his rung, move on. */
  const onPracticeDone = (r: PracticeResult | null) =>
    once(async () => {
      const item = practiceItem!;
      if (!r) {
        await commit(skipPracticeItem(latest.current ?? rec));
        return;
      }
      if (!rec.free && !item.retry) {
        // a sentence takes reading time first: that doesn't make a right answer slow (as in 选一选)
        const outcome = { correct: r.correct, responseMs: r.asked === 'use' ? Math.max(0, r.responseMs - USE_READING_MS) : r.responseMs };
        if (item.grades === 'recognise') know.cardsById.set(`${item.wordId}:recognise`, await recordRecognition(db, item.wordId, outcome, now()));
        else if (item.grades === 'meaning' && r.asked === 'meaning') know.cardsById.set(`${item.wordId}:meaning`, await recordMeaning(db, item.wordId, outcome, now()));
        else if (item.grades === 'use' && r.asked === 'use') know.cardsById.set(`${item.wordId}:meaning`, await recordUse(db, item.wordId, r.correct, now(), r.responseMs));
        if (r.asked === 'use') await addAnswer(db, { at: now().getTime(), wordId: item.wordId, skill: 'use', correct: r.correct }); // every sentence answer, for the Skills panel
        await noteRung(db, item.wordId, item.rung, r.correct, now());
      }
      const ready = closeupAllowed(cardsSinceCloseup.current, reducedMotion());
      cardsSinceCloseup.current = r.correct && r.hard && ready ? 0 : cardsSinceCloseup.current + 1;
      if (r.correct) setCorrect((n) => n + 1);
      const nextCombo = r.correct ? combo + 1 : 0;
      setCombo(nextCombo);
      if (comboMilestone(nextCombo)) {
        playSfx('combo');
        setBanner(nextCombo);
        setTimeout(() => setBanner(null), 1600);
      }
      await commit(afterPracticeAnswer(latest.current ?? rec, r.correct, r.elapsedMs, r.inContext));
    })();
```

  This matches the existing `onFlashDone` call shape, `once(async () => { … })()`. If `onFlashDone` is written differently, follow it.
- **The 认新字 card.** The flash render covers 认新字:

```tsx
      {(step === 'flashcards' || step === 'newwords') && flashItem && flashWord && !flashWord.paused && (
        <FlashcardStep
          key={rec.flashIndex}
          item={flashItem}
          ask={step === 'newwords' ? 'listen' : undefined}
          reintroOnMiss={step === 'newwords'}
          …the existing props…
        />
      )}
```

  With the voice off, `listen` falls back to reading the pinyin, as `FlashcardStep` decides.
- **The round.** Add the 练一练 render after it:

```tsx
      {step === 'practice' && practiceItem && practiceWord && !practiceWord.paused && (
        <PracticeQuestion
          key={`p${rec.practiceIndex}`}
          item={practiceItem}
          word={practiceWord}
          pool={know.words}
          card={know.cardsById.get(`${practiceWord.id}:recognise`)}
          voice={voice}
          kid={kid}
          resting={resting}
          combo={combo}
          closeupReady={closeupAllowed(cardsSinceCloseup.current, reducedMotion())}
          onDone={(r) => void onPracticeDone(r)}
        />
      )}
```

- **Legacy steps stay.** The `choose`, `wrapup` and `components` branches stay for lessons saved under the old steps.

**The other tests that set `activities`:**
- Map the old keys to the new ones: `flashcards` → `newwords` and `practice`; `choose`/`components` → `practice`; drop `wrapup`.
- A test whose point was a legacy step at screen level (one that only runs 选一选 or 钓鱼) is rewritten for 练一练 or deleted. Each deletion gets a ruling naming what now covers it.
- `parentB.test.tsx` clicks the new labels.

- [ ] **Step 4: Run them.**
  - Command: `npx vitest run && npx tsc --noEmit -p .`.
  - Expected: PASS, the whole suite.
  - Note the count: the deleted legacy tests are replaced by the tests above.

- [ ] **Step 5: Commit.** `git add -A src && git commit -m "feat: the lesson is 认新字 → 练一练 → 写一写 → 朗读; old lessons finish in their own flow"`

### Task 8: Check the new lesson in WebKit

**Files:**
- Modify: `scripts/fit-check.ts` (lesson flows)

**Interfaces:**
- **Consumes:** the whole lesson from Tasks 1–7.
- **Produces:** sweep flows `newwords`, `practice` and `practice-evening`. The legacy `flashcards`, `flashcards-evening`, `choose`, `wrapup` and `components` flows are gone, because new lessons never reach those steps.

- [ ] **Step 1: Point the sweep at the new lesson.**
  - In `scripts/fit-check.ts`, `only()` becomes:

```ts
  const only = (...ks: ActivityKind[]): Record<ActivityKind, boolean> => ({ newwords: ks.includes('newwords'), practice: ks.includes('practice'), writing: ks.includes('writing'), speaking: ks.includes('speaking') });
```

  - The lesson flows become:

```ts
  await run('newwords', AFTERNOON, { activities: only('newwords') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'newwords'); });
  await run('practice', AFTERNOON, { activities: only('newwords', 'practice') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'practice'); });
  await run('practice-evening', EVENING, { activities: only('newwords', 'practice') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'practice-evening'); });
  await run('writing', AFTERNOON, { activities: only('writing') }, async (p) => { await startLesson(p); await walkLesson(p, size, 'writing', { firstOnly: true }); });
  await run('writing-sentence', AFTERNOON, { activities: only('writing'), writeSentence: true }, async (p) => { await startLesson(p); await walkLesson(p, size, 'writing-sentence'); });
  await run('langdu', AFTERNOON, { activities: only('speaking'), speakingLast: 'story' }, async (p) => { await startLesson(p); await walkLesson(p, size, 'langdu'); });
```

  - Keep any other flow lines in that block, such as one guarded by a fixture option, with `only(…)` updated to the new keys.
  - `advance()` already taps 我记住了, 继续 and `.choice`. Those cover every 练一练 question in phase A.
- [ ] **Step 2: Run the sweep and the stage cases.**
  - Command: `npm run fit`.
  - Expected: 0 problems and `stage cases: ok`.
  - **If the practice walk ends early** because the fit fixture has no due revision: give the fixture three or four begun words with recognise cards due today. Follow how the fixture already seeds cards, so 练一练 has revision to mix in. Ledger the change.
- [ ] **Step 3: Look at it.**
  - **Screens.** Read `fit-shots/<size>/newwords-*.png` and `practice-*.png` at `iphone-se`, `ipad-landscape` and `ipad-portrait`.
  - **What to check:**
    - the 认新字 card comes first;
    - its recall is a hear-and-find or read question;
    - 练一练 alternates 字, 词语 and sentence questions on the same stage;
    - Truffle stays in one spot;
    - the sheet is docked;
    - nothing is clipped.
- [ ] **Step 4: Run the suite.**
  - Command: `npx vitest run && npx tsc --noEmit -p .`.
  - Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "test: the WebKit sweep walks 认新字 and 练一练"`

---

## Self-review notes

**Spec coverage (phase A, spec §9 item A):**

| Spec | Task |
|---|---|
| §2: lesson order, minutes (练一练 12 of 30), skip 认新字 when there are no new words | 3, 7 |
| §2.1: 认字 card, then recall; a miss shows the card again and comes back early | 3, 5, 6, 7 |
| §2.2: adaptive pacing, ceiling, Skills line | 4 |
| §3.1: who is in the round; time box; leftovers wait | 3, 6 |
| §3.2: the ladder (rungs 1–3), start rungs, retry at the same rung, next start one lower, top cycles | 1, 2, 3, 6 |
| §3.3: interleaved, spaced, varied | 2 |
| §3.5: grading per rung | 2, 7 |
| §7: path, settings migration, free play as 练一练 | 3, 6, 7 |
| §10: unit, component and sweep tests | every task, 8 |

**Phases B–D, not here:**
- rungs 4–5 (组句, 成语);
- 组词 and 搭配 pairing;
- English on the sheet;
- 钓鱼 as a look-alike check: until then, phase A lessons have no 钓鱼;
- the 成语 on the 认字 card;
- the new 写一写.

**Type names used across tasks:**
- `Rung`, `PracticeItem`, `Ask`, `Grades`, `RoundWord`;
- `startPractice`, `currentPracticeItem`, `afterPracticeAnswer`, `skipPracticeItem`, `createFreePracticeRecord`;
- `planPractice`, `planFreePlay`, `askable`, `practiceWords`;
- `PracticeQuestion`, `PracticeResult`;
- `getRungs`, `noteRung`;
- `keptRecent`, `nextPace`, `ranOut`, `PACE_START`.

Each is defined in the task named in its Interfaces block and used under the same name after.
