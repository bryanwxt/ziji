# 字己 ZiJi lesson redesign phase D: 写一写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 写一写 writes 8–10 characters a lesson (6 at 20 minutes), from memory. Characters are chosen at or below his level, traced only once when never written before, and mixed so the same character never comes twice in a row. Two-character words are split and interleaved.

**Architecture:**
- **The item list.** A new pure module, `src/session/writing.ts`, picks the words and turns them into an ordered list of write items, one character and one pass each. `buildSessionPlan` stores the list as `plan.writeItems`.
- **The runner.** It walks the items. When `writeItems` is absent, a lesson saved before this phase finishes the old way.
- **Writing a character.** `WritingStep` writes one character of a word when it is given `at`. Its cue blanks only that character.
- **Grading.** It stays per word: the word's write card is rated on the item that finishes it (`last`), with the misses from all its recall items.

**Tech Stack:** Vite 7, Preact 10, TS 5.9, Vitest 4, hanzi-writer, playwright-core WebKit.

**Spec:** docs/superpowers/specs/2026-10-05-ziji-lesson-flow-design.md (§5, §10)

## Global Constraints
- **Count:** 8–10 characters a lesson, and 6 in a 20-minute lesson. A two-character word counts as two.
- **Order of choice:**
  1. writing due today;
  2. today's and recent lesson words he can now read;
  3. characters he can read, at his level first and going down.
- **Never a character he hasn't learned to read.** Words from 听写 mistakes join the due list, as now (§7).
- **From memory.** The hint stroke and the outline behave as now.
- **Tracing only once,** for a character never written, early in the round. The same character comes back later from memory.
- **Never the same character twice in a row.** A two-character word's characters are split and interleaved with others.
- **Child screens:** Chinese only, no emoji.

## Rulings this plan makes
- **Write cards stay per word, not per character.** Splitting the FSRS model would change placement, the Skills panel and backups.
  - *Cost if wrong:* a two-character word with one hard character is rated as one word.
- **A 30-minute lesson writes 9 characters** (`writeCharTarget`: under 25 min → 6, under 30 → 8, under 40 → 9, otherwise 10).
- **The 'hint' pass is retired** for new lessons, since tracing happens only once. The redo-at-the-end for a hinted or 4+-miss recall stays, and is kept from landing beside the same character.
- **Level** comes from `learnerLevel` (phase C).

## Review Focus
1. A lesson with only due writing (a long 听写-mistake list): only the first 8–10 characters, the rest tomorrow; due ones never pushed out by new ones.
2. A three-character word (新加坡) at the edge of the count: never more than 10 characters, and never half a word.
3. A character whose strokes fail to load: its later items are skipped, the word isn't rated, and it goes to the back next time (`markWriteSkipped`).
4. An old saved lesson (no `writeItems`): finishes in the old trace → hint → recall flow.
5. A lesson where everything is one word (only one candidate): it still never repeats back to back unless there is no other way (one character traced then recalled), and then not at all if avoidable.

---

### Task 1: Choosing and ordering the characters

**Files:**
- Create: `src/session/writing.ts`
- Test: `src/session/writing.test.ts`

**Interfaces:**
- Produces:
  - `writeCharTarget(minutes: number): number`;
  - `interface WriteUnit { wordId: string; chars: string[]; isNew: boolean }`;
  - `interface WriteItem { wordId: string; at: number; pass: 'trace' | 'recall'; isNew: boolean; last?: boolean }`;
  - `pickWriteUnits(input: { cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number; cutoff: number; target: number }): WriteUnit[]`;
  - `orderWriteItems(units: WriteUnit[]): WriteItem[]`.

- [ ] **Step 1: Failing tests.**

```ts
import { describe, expect, it } from 'vitest';
import { makeCard, makeWord } from '../test/fixtures';
import { orderWriteItems, pickWriteUnits, writeCharTarget, type WriteUnit } from './writing';

const now = new Date(2026, 9, 6, 10);
const day = 86_400_000;
const base = { newWordIds: [] as string[], practised: new Map<string, number>(), level: 2, cutoff: now.getTime() + day, target: 9 };

describe('how many characters (spec 2026-10-05 §5)', () => {
  it('8–10 a lesson, 6 at 20 minutes', () => {
    expect(writeCharTarget(20)).toBe(6);
    expect(writeCharTarget(25)).toBe(8);
    expect(writeCharTarget(30)).toBe(9);
    expect(writeCharTarget(45)).toBe(10);
  });
});

describe('which characters (spec §5)', () => {
  const ch = (t: string, level: 1 | 2 | 3, rank: number) => makeWord(t, { id: `b:${t}`, level, rank });
  it('due writing first, then today\'s and recent lesson words, then what he reads at his level going down — never above it, never unread', () => {
    const words = [ch('一', 1, 1), ch('二', 1, 2), ch('三', 1, 3), ch('四', 2, 50), ch('五', 2, 60), ch('高', 3, 400), ch('新', 2, 70), ch('未', 1, 4)];
    const cards = [
      makeCard('b:一', 'write', new Date(now.getTime() - 3600_000)), // due
      ...['b:二', 'b:三', 'b:四', 'b:五', 'b:高'].map((id) => makeCard(id, 'recognise', new Date(now.getTime() + 9 * day), true)),
      makeCard('b:二', 'recognise', new Date(now.getTime() + 9 * day), true),
    ];
    const units = pickWriteUnits({ ...base, cards, words, newWordIds: ['b:新'], practised: new Map([['b:三', now.getTime()]]) });
    expect(units.map((u) => u.wordId)).toEqual(['b:一', 'b:新', 'b:三', 'b:五', 'b:四', 'b:二']); // 高 is above his level; 未 he can't read
    expect(units[0]!.isNew).toBe(false);
    expect(units.slice(1).every((u) => u.isNew)).toBe(true);
  });
  it('counts characters, never splitting a word across lessons or passing 10', () => {
    const words = [makeWord('新加坡', { id: 'p:1', source: 'parent', level: null, rank: null }), ...['一', '二', '三', '四', '五', '六', '七'].map((t, i) => ch(t, 1, i))];
    const cards = [makeCard('p:1', 'write', now), ...['一', '二', '三', '四', '五', '六', '七'].map((t) => makeCard(`b:${t}`, 'recognise', new Date(now.getTime() + 9 * day), true))];
    const units = pickWriteUnits({ ...base, cards, words, target: 9 });
    expect(units.reduce((n, u) => n + u.chars.length, 0)).toBe(9);
    expect(units[0]!.chars).toEqual(['新', '加', '坡']);
  });
  it('leaves out paused and not-writeable words', () => {
    const words = [makeWord('一', { id: 'b:一', paused: true }), makeWord('二', { id: 'b:二', writeable: false })];
    const cards = words.map((w) => makeCard(w.id, 'recognise', new Date(now.getTime() + 9 * day), true));
    expect(pickWriteUnits({ ...base, cards, words })).toEqual([]);
  });
});

describe('the order (spec §5: mixed, traced once, from memory)', () => {
  const unit = (wordId: string, chars: string, isNew: boolean): WriteUnit => ({ wordId, chars: Array.from(chars), isNew });
  const key = (i: { wordId: string; at: number }) => `${i.wordId}#${i.at}`;
  it('a never-written character is traced once early, then written from memory later; others from memory only', () => {
    const items = orderWriteItems([unit('a', '一', false), unit('b', '二', true), unit('c', '三', false), unit('d', '四', false)]);
    expect(items.filter((i) => i.wordId === 'b').map((i) => i.pass)).toEqual(['trace', 'recall']);
    expect(items.filter((i) => i.wordId !== 'b').every((i) => i.pass === 'recall')).toBe(true);
    const at = items.map((i) => i.wordId).indexOf('b');
    expect(at).toBeLessThanOrEqual(1); // early
    expect(items.map((i) => i.wordId).lastIndexOf('b') - at).toBeGreaterThanOrEqual(3); // at least 2 others between
  });
  it('never the same character twice in a row; a two-character word is split and interleaved', () => {
    const items = orderWriteItems([unit('w', '朋友', true), unit('a', '一', true), unit('b', '二', false), unit('c', '三', false)]);
    for (let i = 1; i < items.length; i++) expect(key(items[i]!)).not.toBe(key(items[i - 1]!));
    for (let i = 1; i < items.length; i++) expect(items[i]!.wordId === 'w' && items[i - 1]!.wordId === 'w').toBe(false);
    expect(items.filter((i) => i.wordId === 'w').map((i) => i.at).sort()).toEqual([0, 0, 1, 1]);
  });
  it('marks the item that finishes each word (its rating)', () => {
    const items = orderWriteItems([unit('w', '朋友', false), unit('a', '一', true)]);
    expect(items.filter((i) => i.last).map((i) => i.wordId).sort()).toEqual(['a', 'w']);
    const lastW = items.map((i) => i.wordId).lastIndexOf('w');
    expect(items[lastW]!.last).toBe(true);
  });
});
```

- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/session/writing.test.ts`
  - Expected: FAIL (the module is missing).
- [ ] **Step 3: Implement `src/session/writing.ts`.**

```ts
// 写一写 (spec 2026-10-05 §5): 8–10 characters from memory, at or below his level, traced only once, never back to back.
import { hanChars } from '../content';
import { isKnown } from '../srs/scheduler';
import type { CardRecord, Word } from '../types';

export const MAX_WRITE_CHARS = 10;
export const writeCharTarget = (minutes: number): number => (minutes < 25 ? 6 : minutes < 30 ? 8 : minutes < 40 ? 9 : 10);

export interface WriteUnit { wordId: string; chars: string[]; isNew: boolean }
export interface WriteItem { wordId: string; at: number; pass: 'trace' | 'recall'; isNew: boolean; last?: boolean }

export function pickWriteUnits({ cards, words, newWordIds, practised, level, cutoff, target }: {
  cards: CardRecord[]; words: Word[]; newWordIds: string[]; practised: ReadonlyMap<string, number>; level: number; cutoff: number; target: number;
}): WriteUnit[] {
  const byId = new Map(words.filter((w) => !w.paused && w.writeable).map((w) => [w.id, w]));
  const write = new Map(cards.filter((c) => c.kind === 'write').map((c) => [c.wordId, c]));
  const reads = new Map(cards.filter((c) => c.kind === 'recognise').map((c) => [c.wordId, c]));
  const due = [...write.values()].filter((c) => byId.has(c.wordId) && c.fsrs.due.getTime() <= cutoff).sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());
  const unwritten = (w: Word) => !write.has(w.id);
  const skippedLast = (a: Word, b: Word) => (a.writeSkippedAt ?? 0) - (b.writeSkippedAt ?? 0);
  const today = newWordIds.map((id) => byId.get(id)).filter((w): w is Word => !!w && unwritten(w));
  const recent = [...byId.values()].filter((w) => unwritten(w) && reads.has(w.id) && practised.has(w.id)).sort((a, b) => skippedLast(a, b) || practised.get(b.id)! - practised.get(a.id)!);
  const readable = [...byId.values()]
    .filter((w) => unwritten(w) && !practised.has(w.id) && isKnown(reads.get(w.id)?.fsrs ?? null) && (w.level ?? 0) <= level)
    .sort((a, b) => skippedLast(a, b) || (b.level ?? 0) - (a.level ?? 0) || (b.rank ?? -1) - (a.rank ?? -1));
  const out: WriteUnit[] = [];
  const seen = new Set<string>();
  let n = 0;
  const add = (w: Word, isNew: boolean) => {
    const chars = hanChars(w.text);
    if (seen.has(w.id) || !chars.length || n + chars.length > Math.max(target, Math.min(MAX_WRITE_CHARS, target))) return;
    seen.add(w.id); out.push({ wordId: w.id, chars, isNew }); n += chars.length;
  };
  for (const c of due) { if (n >= target) break; add(byId.get(c.wordId)!, c.fsrs.reps === 0); }
  for (const w of [...today, ...recent, ...readable]) { if (n >= target) break; add(w, true); }
  return out;
}
```

  - Notes on `pickWriteUnits`:
    - `isKnown(null)` must return false. If `isKnown` doesn't accept null, guard with `!!c && isKnown(c.fsrs)` and ledger it.
    - The add guard: a unit is added only if `n + chars.length <= target`. A word that doesn't fit is skipped (the loop goes on to a shorter one).
    - **Ruling:** the target is a ceiling (≤ 10), never exceeded.

```ts
export function orderWriteItems(units: WriteUnit[]): WriteItem[] {
  type Slot = { u: WriteUnit; at: number; key: string; passes: ('trace' | 'recall')[]; next: number; readyAt: number };
  const slots: Slot[] = units.flatMap((u) => u.chars.map((ch, at) => ({ u, at, key: `${u.wordId}#${at}`, passes: u.isNew ? ['trace', 'recall'] : ['recall'], next: 0, readyAt: 0 })));
  const fresh = [...slots.filter((s) => s.u.isNew), ...slots.filter((s) => !s.u.isNew)]; // traces early
  const out: WriteItem[] = [];
  let last: Slot | null = null;
  const left = () => slots.filter((s) => s.next < s.passes.length);
  while (left().length) {
    const p = out.length;
    const other = (s: Slot) => !last || (s.key !== last.key && s.u.wordId !== last.u.wordId);
    const notSame = (s: Slot) => !last || s.key !== last.key;
    const ready = left().filter((s) => s.next > 0 && s.readyAt <= p).sort((a, b) => a.readyAt - b.readyAt);
    const unstarted = fresh.filter((s) => s.next === 0);
    const waiting = left().filter((s) => s.next > 0 && s.readyAt > p).sort((a, b) => a.readyAt - b.readyAt);
    const order = [...ready, ...unstarted, ...waiting];
    const s = order.find(other) ?? order.find(notSame) ?? order[0]!;
    out.push({ wordId: s.u.wordId, at: s.at, pass: s.passes[s.next]!, isNew: s.u.isNew });
    s.next += 1;
    s.readyAt = p + 3;
    last = s;
  }
  // the item that finishes each word rates its write card
  const seen = new Set<string>();
  for (let i = out.length - 1; i >= 0; i--) if (!seen.has(out[i]!.wordId)) { seen.add(out[i]!.wordId); out[i] = { ...out[i]!, last: true }; }
  return out;
}
```

- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/session/writing.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: 写一写 picks 8–10 characters at or below his level and mixes them, traced once`

### Task 2: The plan carries the items

**Files:**
- Modify: `src/types.ts` (`SessionPlan.writeItems?: WriteItem[]`), `src/session/plan.ts`
- Test: `src/session/plan.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `buildSessionPlan` sets `writeItems` and `writeCount: writeItems.length`;
  - `writeCandidates` keeps the chosen words (`{ wordId, isNew }` per unit), for display and backups.

- [ ] **Step 1: Failing tests.**
  - Replace the phase-20 writing tests ("at most 2 new", "writeCount 3/4"; ledger it) with:
    - a 30-minute plan has `writeItems` covering 9 characters (via the units);
    - a 20-minute plan covers 6;
    - the 写一写 words are today's new words first after due ones;
    - a word above his level isn't chosen.
- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/session/plan.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - In `buildSessionPlan`:
    - compute `level = learnerLevel(words, started)`;
    - compute `units = pickWriteUnits({ cards, words: active, newWordIds: newWords.map(w => w.id), practised, level, cutoff, target: writeCharTarget(settings.sessionMinutes) })`;
    - set `writeItems = orderWriteItems(units)`, `writeCandidates = units.map(u => ({ wordId: u.wordId, isNew: u.isNew }))` and `writeCount = writeItems.length`.
  - With writing turned off, the items are `[]`.
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/session`
  - Expected: PASS, after updating tests that pinned the old counts (ledger them).
- [ ] **Step 5: Commit.** `feat: the lesson plan writes characters, not words`

### Task 3: The runner walks the items

**Files:**
- Modify: `src/session/runner.ts`, `src/types.ts` (`SessionRecord.writeMisses?: Record<string, number>`, `writeSkipped?: string[]`)
- Test: `src/session/runner.test.ts`

**Interfaces:**
- Produces:
  - `WriteTask` gains `at?: number` and `last?: boolean`;
  - `currentWriteTask(rec)`:
    - with `plan.writeItems`, gives `writeItems[writeIndex]`, skipping words in `writeSkipped`;
    - after the items, gives the redo list, which now holds `{ wordId, at }` keys as `"id#at"` strings.
  - `afterWriteWord(rec, done, ms, outcome)` in the new flow:
    - a recall adds its misses to `writeMisses[wordId]`;
    - `done = false` adds the word to `writeSkipped`;
    - each item advances `writeIndex`, and `writeDone` counts items;
    - a recall that needed a hint or had more than 3 misses is redone at the end, but never right after the same character.
  - `wordMisses(rec, wordId): number`.

- [ ] **Step 1: Failing tests.**
  - The old flow is unchanged for a plan without `writeItems`: the existing tests stay.
  - The new flow:
    - walks the items in order, with trace then recall for a new character;
    - adds misses per word;
    - a failed item skips that word's later items;
    - redo items come at the end, never beside the same character;
    - the step finishes after the last item and redo.
- [ ] **Step 2: Run them.**
  - Run: `npx vitest run src/session/runner.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement** as above. `mainWritingDone` is `writeIndex >= writeItems.length` in the new flow.
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/session`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: 写一写 walks characters, mixed; old lessons finish the old way`

### Task 4: One character on the stage; rated when the word is done

**Files:**
- Modify: `src/activities/writing/WritingStep.tsx`, `src/activities/writing/cue.ts`, `src/app/SessionScreen.tsx`
- Test: `src/activities/writing/WritingStep.test.tsx`, `src/activities/writing/cue.test.ts` (or the existing cue tests), `src/app/SessionScreen.test.tsx`

**Interfaces:**
- **WritingStep:** a new `at?: number` prop. With it, it writes `hanChars(word.text)[at]` only, and its cue comes from `writingCue(word, at)`.
- **`writingCue(word, at?)`:** for a word of more than one character, only that character is blanked; the others show (朋＿ for 友).
- **SessionScreen:** on a recall item with `last`, it calls `recordWriting(db, wordId, wordMisses(rec, wordId) + r.totalMisses)`. It passes `at` to `WritingStep`, and keys the step by `writeIndex` and the redo index.

- [ ] **Step 1: Failing tests.**
  - `writingCue(朋友, 1).sentence` has 朋 and one `＿`.
  - `WritingStep` with `at={1}` renders one dot.
  - SessionScreen's writing walk (existing test harness) rates a two-character word once, after both characters.
- [ ] **Step 2: Run them.**
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/activities/writing src/app`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: write one character at a time, the word rated once all its characters are written`

### Task 5: WebKit

- [ ] **Step 1: Run the sweep.**
  - Run: `npm run fit > <workspace>/fit.log 2>&1; tail -3 <workspace>/fit.log`
  - Expected: 0 problems. The 'writing' flow walks the new items.
- [ ] **Step 2: Run the suite.**
  - Run: `npx vitest run`
  - Expected: all pass.
- [ ] **Step 3: Commit** any fit-script updates.
