# School 听写 Mistakes Implementation Plan (Plan 15, part 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When he writes a word wrong in a school 听写 (often with a same-sound character: 新家坡 for 新加坡), the parent marks it, and the word comes back first in 写一写.

**Architecture:**
- `applyDictationMistakes(db, texts, now)` lives in `src/session/dictation.ts`. Each word becomes writeable, and its write card comes due now; one is created if there is none. A word the app doesn't have is added as a school word (list "听写 mistakes"), through `makeParentWords`.
- The Words panel gains a "School 听写 mistakes" box: paste one word per line, then "Bring back".
- `buildSessionPlan` already puts due write cards first.

**Tech Stack:** Preact 10, TypeScript 5.9, idb, ts-fsrs, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-02-ziji-truffle-design.md` §19 part 3 (写一写 → 听写): "A word he wrote with a same-sound character comes back sooner. The parent marks these, as with 朗读 misreads, or 字辨 misses do it automatically."

**Already in place, and not repeated here:**
- the whole word said by Truffle, with its sentence;
- no character shown;
- pinyin plus a sentence cue;
- hint strokes after 2 misses;
- 字辨 misses bringing writing forward (plans 13–14).

Tatoeba (the optional part of plan 15) needs a download the parent must approve first, so it is not in this plan.

## Global Constraints

- The parent area may scroll, and keeps its English labels. Child screens are unchanged.
- Words the parent types stay on the iPad. Nothing from class material goes into the repo.
- Never push or deploy without the parent's go-ahead in chat.

## Review Focus

1. **A line that isn't 1–4 Chinese characters** (pinyin, a note, a blank line) is skipped and reported; it is never saved. Pinned in Task 1 ("skips lines…").
2. **A word marked twice** stays one word, with one write card due now. Pinned in Task 1 ("twice…").
3. **A word he has paused** is unpaused, because the parent asked for it. Pinned in Task 1 ("a paused word…").
4. **A built-in character** keeps its id and its reading progress. Only its write card changes. Pinned in Task 1 ("keeps the reading card…").
5. **The next lesson writes the marked words first,** ahead of the day's other write candidates. Pinned in Task 1 ("comes first…").

---

### Task 1: `applyDictationMistakes`

**Files:**
- Create: `src/session/dictation.ts`
- Test: `src/session/dictation.test.ts`

**Interfaces:**
- Produces: `applyDictationMistakes(db: AppDb, text: string, now: Date): Promise<{ marked: string[]; added: string[]; skipped: string[] }>`
  - `text` is the parent's pasted lines.
  - `marked`: every word brought back.
  - `added`: the new school words among them.
  - `skipped`: lines that aren't words.

- [ ] **Step 1: Write the failing tests**

```ts
// src/session/dictation.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { allCards, allWords, getSettings, putCards, putWords } from '../store/repo';
import { freshDb, makeCard } from '../test/fixtures';
import { buildSessionPlan } from './plan';
import { applyDictationMistakes } from './dictation';

const now = new Date(2026, 9, 5, 18);

describe('school 听写 mistakes (spec §19 part 3)', () => {
  it('a built-in character keeps its id and reading card; its write card comes due now', async () => {
    const db = await freshDb();
    const ws = builtinWords(0);
    await putWords(db, ws);
    const jia = ws.find((w) => w.text === '加')!;
    await putCards(db, [makeCard(jia.id, 'recognise', new Date(2026, 9, 20), true), makeCard(jia.id, 'write', new Date(2026, 9, 25), true)]);
    const r = await applyDictationMistakes(db, '加', now);
    expect(r).toEqual({ marked: ['加'], added: [], skipped: [] });
    const cards = new Map((await allCards(db)).map((c) => [c.id, c]));
    expect(cards.get(`${jia.id}:write`)!.fsrs.due.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(cards.get(`${jia.id}:recognise`)!.fsrs.due).toEqual(new Date(2026, 9, 20)); // keeps the reading card as it was
  });
  it('a word the app does not have is added as a writeable school word with a write card due now', async () => {
    const db = await freshDb();
    const r = await applyDictationMistakes(db, '新加坡\n', now);
    expect(r.added).toEqual(['新加坡']);
    const w = (await allWords(db)).find((x) => x.text === '新加坡')!;
    expect([w.source, w.writeable, w.listName]).toEqual(['parent', true, '听写 mistakes']);
    expect((await allCards(db)).find((c) => c.id === `${w.id}:write`)!.fsrs.due.getTime()).toBeLessThanOrEqual(now.getTime());
  });
  it('skips lines that are not 1–4 Chinese characters, and reports them', async () => {
    const db = await freshDb();
    const r = await applyDictationMistakes(db, 'xin jia po\n\n市区\nmum says 加油', now);
    expect(r.marked).toEqual(['市区']);
    expect(r.skipped).toEqual(['xin jia po', 'mum says 加油']);
  });
  it('a word marked twice stays one word with one write card', async () => {
    const db = await freshDb();
    await applyDictationMistakes(db, '市区', now);
    await applyDictationMistakes(db, '市区\n市区', new Date(now.getTime() + 1000));
    expect((await allWords(db)).filter((w) => w.text === '市区')).toHaveLength(1);
    expect((await allCards(db)).filter((c) => c.kind === 'write')).toHaveLength(1);
  });
  it('a paused word is unpaused and made writeable', async () => {
    const db = await freshDb();
    const ws = builtinWords(0);
    await putWords(db, ws.map((w) => (w.text === '区' ? { ...w, paused: true, writeable: false } : w)));
    await applyDictationMistakes(db, '区', now);
    const w = (await allWords(db)).find((x) => x.text === '区')!;
    expect([w.paused, w.writeable]).toEqual([false, true]);
  });
  it("comes first in the next lesson's 写一写", async () => {
    const db = await freshDb();
    const ws = builtinWords(0);
    await putWords(db, ws);
    const other = ws[3]!;
    await putCards(db, [makeCard(other.id, 'recognise', new Date(2026, 9, 20), true), makeCard(other.id, 'write', new Date(2026, 9, 4), true)]);
    await applyDictationMistakes(db, '市区', now);
    const plan = buildSessionPlan({ cards: await allCards(db), words: await allWords(db), settings: await getSettings(db), now: new Date(2026, 9, 6, 9) });
    expect((await allWords(db)).find((w) => w.id === plan.writeCandidates[0]!.wordId)!.text).toBe('市区');
  });
});
```

- [ ] **Step 2: Run it.** `npx vitest run src/session/dictation.test.ts`. Expected: FAIL (no module).
- [ ] **Step 3: Implement**

```ts
// src/session/dictation.ts
import { makeParentWords, parseWordList } from '../content/parseWordList';
import { newCard } from '../srs/scheduler';
import type { AppDb } from '../store/db';
import { allWords, getCard, putCards, putWords } from '../store/repo';

export const DICTATION_LIST = '听写 mistakes';

/**
 * Words he wrote wrong in a school 听写 (spec §19 part 3): each becomes writeable and unpaused, and its write card is due now
 * (created if he has none), so 写一写 brings it back first. A word the app doesn't have is added as a school word.
 */
export async function applyDictationMistakes(db: AppDb, text: string, now: Date) {
  const { words: parsed, rejected } = parseWordList(text);
  const existing = await allWords(db);
  const { added } = makeParentWords(parsed.filter((p) => !existing.some((w) => w.text === p.text)), { listName: DICTATION_LIST, writeable: true, existing, now: now.getTime() });
  await putWords(db, added);
  const byText = new Map([...existing, ...added].map((w) => [w.text, w]));
  const marked: string[] = [];
  for (const p of parsed) {
    const w = byText.get(p.text);
    if (!w) continue;
    if (w.paused || !w.writeable) await putWords(db, [{ ...w, paused: false, writeable: true }]);
    const id = `${w.id}:write`;
    const card = await getCard(db, id);
    await putCards(db, [card ? { ...card, fsrs: { ...card.fsrs, due: now } } : { id, wordId: w.id, kind: 'write', fsrs: { ...newCard(now), due: now } }]);
    marked.push(w.text);
  }
  return { marked, added: added.map((w) => w.text), skipped: rejected };
}
```

If `parseWordList` already drops blank lines (it does) and pinyin-only lines go to `rejected`, the test's `skipped` matches. If its `rejected` keeps lines differently trimmed, compare after `trim()`.

- [ ] **Step 4: Run it.** Expected: PASS. Then run `npx vitest run`.
- [ ] **Step 5: Commit.** `git commit -m "feat: school 听写 mistakes come back first in 写一写"`

### Task 2: The parent box

**Files:**
- Modify: `src/parent/WordsPanel.tsx`
- Test: `src/parent/parentA.test.tsx` (or the existing Words panel test file; find it with `grep -rln WordsPanel src/parent`)

- [ ] **Step 1: Write the failing test**

```tsx
it('marks school 听写 mistakes: they come back first in 写一写', async () => {
  const app = await makeAppData();
  renderWithApp(<WordsPanel />, app);
  fireEvent.input(await screen.findByLabelText('Words he wrote wrong'), { target: { value: '新加坡\nxyz' } });
  fireEvent.click(screen.getByRole('button', { name: 'Bring back' }));
  expect(await screen.findByText(/新加坡 comes back first in 写一写/)).toBeTruthy();
  expect(screen.getByText(/Skipped: xyz/)).toBeTruthy();
  expect((await allCards(app.db)).some((c) => c.kind === 'write')).toBe(true);
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.** Add a `<section class="panel">` after the word-list section:
  - **Heading:** "School 听写 mistakes".
  - **Explanation:** "Words he wrote wrong in a school 听写 — often with a same-sound character (新家坡 for 新加坡). Type the right word, one per line. Each comes back first in 写一写."
  - **A textarea** labelled "Words he wrote wrong".
  - **A "Bring back" button**, disabled when empty. It calls `applyDictationMistakes(db, text, now())`, clears the box and shows a `role="status"` message:
    - `${marked.join('、')} comes back first in 写一写.`;
    - plus `Skipped: …` when lines were skipped.

  Reload the panel's word list afterwards, as `add()` does.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: a parent box for school 听写 mistakes"`
