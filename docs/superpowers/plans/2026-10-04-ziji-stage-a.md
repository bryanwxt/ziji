# The Stage and the Paper Yard Implementation Plan (Phase A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every lesson activity uses one stage layout: the world behind, a fixed paper lesson card, Truffle in one fixed spot, and one feedback sheet. The 后院 yard is redrawn in the storybook-paper style with Truffle's props.

**Architecture:**
- `src/ui/stage/` gains `FeedbackSheet` (replaces `BottomBar`) and `Stage`. `Stage` is a pure layout component with three named slots (truffle, card, sheet) placed by one CSS grid per size class.
- Each activity renders its own content inside `Stage`. This is the existing pattern: activities already own their Pet and bar.
- A small paper art kit (`src/ui/worlds/kit/`) draws the new yard on today's 360×480 world canvas. Home's tap layer and the other seven worlds keep working unchanged.

**Tech Stack:** Preact 10, TypeScript 5.9, Vitest 4 (jsdom), plain CSS in `src/styles.css`, inline SVG strings, Playwright-core 1.52 WebKit sweep (`npm run fit`).

**Spec:** `docs/superpowers/specs/2026-10-04-ziji-stage-design.md` (phase A row of §8; §2, §3, §6, §7, §9). Mockups: `docs/superpowers/mockups/2026-10-04-stage-layout.html` (option A) and `docs/superpowers/mockups/2026-10-04-stage-worlds-paper.html` ("Depth, light and story details").

## Global Constraints

- Child screens: no emoji (`src/childEmoji.test.ts`); no English except the English meanings on the 认字 new-word card. Pinyin over Chinese on child labels via `Label`.
- Every child screen fits one screen at all six sweep sizes (iphone-se 375×667, iphone-15 390×844, ipad-portrait 768×1024, ipad-landscape 1024×768, ipad-air-landscape 1180×820, iphone-sideways shows only the rotate prompt). `npm run fit` must report 0 problems.
- Reduced motion is respected (no new motion in this phase beyond the sheet's existing slide-up).
- No live SVG filters on world art (spec §6): shadows are offset shapes, and the paper grain stays the existing static tiled background (`.world-scene::after`).
- World art has no black ink outlines (spec §2); Truffle keeps his.
- One box per activity (spec §3): for one screen size, the lesson card has the same position and size on every question.
- Question hanzi ≥ 64px on iPad and ≥ 48px on phone; answer-tile hanzi 40–48px; sentences ≥ 28px on iPad with pinyin over every character and a speaker button (spec §3).
- Never push or deploy without the parent's go-ahead in chat. Nothing from the school worksheets/textbook goes into the repo.

## Review Focus

1. **A long feedback detail on a phone** (字辨's two explanation rows plus a title, or a long 用对了吗 sentence in the comfort detail) must not push 继续 off screen or hide the marked answer. Expected: the sheet grows upward, the card shrinks, and everything stays on screen. Pinned by the sweep's cut-off and overlap checks on `components` and `wrapup` at iphone-se (Task 10). Task 1 also tests that the sheet keeps the button with `flex: none`.
2. **Rotating the iPad mid-question** (portrait ↔ landscape) must re-flow the stage with no stale sizes. The writing box is the one size computed in JS. Expected: the box re-measures on resize. Pinned by Task 6's "re-measures when the card resizes" test.
3. **Truffle's bubble with a long line** (e.g. 用一用！ or 看提示写！) in the phone's beside-him layout must not run off the right edge. Expected: the bubble wraps inside the screen. Pinned by the sweep at iphone-se (Task 10). Task 2 also has a contract that `.stage__truffle .pet__bubble` has a max-width.
4. **Placement after rotation, and its 回家 button**, must keep the fixed box (the parent's earlier report). Expected: placement's prompt and choices stay the same size across questions inside the stage. Pinned by the existing placement steadiness check (Task 8 keeps it green) plus the new stage-invariant check (Task 10).
5. **The new yard at every size and time of day**:
   - its props (bowl, red ball, sprinkler) are on screen in portrait;
   - Home's sprinkler tap still lands on the sprinkler;
   - evening still adds the moon, stars and lanterns.

   Pinned by Task 9's tests (the sprinkler's position equals the tap target, and props are inside the visible portrait band) and the sweep's world-tap probe (Task 10).

---

## File map

| File | Responsibility |
|---|---|
| `src/ui/stage/FeedbackSheet.tsx` (new) | The lesson's one action spot and feedback sheet (replaces `src/ui/BottomBar.tsx`). |
| `src/ui/stage/Stage.tsx` (new) | Layout: three slots, `data-stage` marker, no logic. |
| `src/ui/stage/stage.test.tsx` (new) | Tests for both. |
| `src/styles.css` | New "Stage" section at the end; dead per-activity layout rules removed in each migration task. |
| `src/activities/flashcards/FlashcardStep.tsx` | 认一认 on the stage; sentence cue with pinyin and a speaker. |
| `src/activities/choose/UseQuestion.tsx` | 选一选 and 用一用 on the stage; sentences with pinyin and speakers. |
| `src/activities/components/ComponentsStep.tsx` | 字辨 on the stage. |
| `src/activities/writing/WritingStep.tsx`, `src/activities/writing/size.ts` | 写一写 on the stage; box sized from the card. |
| `src/activities/langdu/LangduStep.tsx` | 朗读 on the stage (all four parts). |
| `src/app/PlacementScreen.tsx` | Placement on the stage. |
| `src/ui/worlds/kit/paper.ts`, `src/ui/worlds/kit/props.ts` (new) | Paper art primitives and Truffle's yard props (SVG strings, no filters). |
| `src/ui/worlds/yard.ts` (new) | The paper 后院, composed from the kit. |
| `src/ui/worlds/scenes.ts` | `SCENES.yard` becomes the paper yard. |
| `scripts/fit-check.ts` | `.sheet` selectors; stage invariants; sizing probe; frame-time probe. |
| tests touching `.bottombar` (`src/ui/bars.test.tsx`, `src/app/SessionScreen.test.tsx`, `src/app/PlacementScreen.test.tsx`, `src/activities/flashcards/FlashcardStep.test.tsx`, `src/activities/components/ComponentsStep.test.tsx`, `src/styles.test.ts`) | Selector updates in Task 1. |

`src/activities/kantu/StoryStep.tsx` (看图说话, parked behind `settings.story`) switches to `FeedbackSheet` in Task 1 but is otherwise not moved onto the stage. It stays parked and is not in the sweep.

---

### Task 1: FeedbackSheet replaces BottomBar

**Files:**
- Create: `src/ui/stage/FeedbackSheet.tsx`, `src/ui/stage/stage.test.tsx`
- Modify:
  - `src/activities/flashcards/FlashcardStep.tsx`, `src/activities/choose/UseQuestion.tsx`, `src/activities/components/ComponentsStep.tsx`, `src/activities/writing/WritingStep.tsx`, `src/activities/langdu/LangduStep.tsx`, `src/activities/kantu/StoryStep.tsx`: import swap;
  - `src/styles.css`: rename the `.bottombar*` rules to `.sheet*`;
  - `scripts/fit-check.ts`, and the tests listed in the file map: selectors.
- Delete: `src/ui/BottomBar.tsx`. Move its tests from `src/ui/bars.test.tsx` into `src/ui/stage/stage.test.tsx`, keeping any non-BottomBar tests in `bars.test.tsx`.

**Interfaces:**
- Produces: `FeedbackSheet(props: { tone?: 'neutral' | 'good' | 'oops'; title?: string; detail?: ComponentChildren; actionLabel: string; actionIcon?: ComponentChildren; onAction: () => void; disabled?: boolean })`. Renders `<div class="sheet sheet--{tone}" role={tone === 'neutral' ? undefined : 'status'}>`. Inside: `.sheet__msg` (badge, `.sheet__title`, `.sheet__detail`) when not neutral, and one `button.btn.btn--big` (`btn--primary`, or `btn--oops` for oops) whose content is `<Label zh={actionLabel} />` followed by `actionIcon`.
- Produces: `export type SheetTone = 'neutral' | 'good' | 'oops'`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/stage/stage.test.tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackSheet } from './FeedbackSheet';

describe('FeedbackSheet (spec 2026-10-04 §3)', () => {
  it('neutral: only the action button, no message', () => {
    render(<FeedbackSheet actionLabel="继续" disabled onAction={vi.fn()} />);
    expect(document.querySelector('.sheet.sheet--neutral')).toBeTruthy();
    expect(document.querySelector('.sheet__msg')).toBeNull();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
  it('good / oops: a status message with title and detail, and the action', () => {
    const go = vi.fn();
    render(<FeedbackSheet tone="oops" title="再想想" detail={<span class="hanzi">银行</span>} actionLabel="继续" onAction={go} />);
    const sheet = document.querySelector('.sheet.sheet--oops')!;
    expect(sheet.getAttribute('role')).toBe('status');
    expect(sheet.querySelector('.sheet__title')!.textContent).toContain('再想想');
    expect(sheet.querySelector('.sheet__detail .hanzi')!.textContent).toBe('银行');
    fireEvent.click(screen.getByRole('button'));
    expect(go).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button').className).toContain('btn--oops');
  });
  it('a disabled action never fires', () => {
    const go = vi.fn();
    render(<FeedbackSheet actionLabel="继续" disabled onAction={go} />);
    fireEvent.click(screen.getByRole('button'));
    expect(go).not.toHaveBeenCalled();
  });
  it('an optional icon sits after the label (placement\'s 不知道)', () => {
    render(<FeedbackSheet actionLabel="不知道" actionIcon={<i class="probe" />} onAction={vi.fn()} />);
    expect(screen.getByRole('button').querySelector('.probe')).toBeTruthy();
  });
});
```

Add to `src/styles.test.ts`, inside the last `describe`:

```ts
  it('the feedback sheet keeps 继续 on the bar: the text column can shrink, the button cannot (review focus 1)', () => {
    expect(css).toMatch(/\.sheet__msg \{[^}]*min-width: 0/);
    expect(css).toMatch(/\.sheet \.btn \{[^}]*flex: none/);
    expect(css).not.toMatch(/\.bottombar/);
  });
```

- [ ] **Step 2: Run them.** `npx vitest run src/ui/stage/stage.test.tsx src/styles.test.ts`. Expected: FAIL, because `./FeedbackSheet` does not exist and `.sheet__msg` is not in the CSS.

- [ ] **Step 3: Implement FeedbackSheet** (a rename of BottomBar, plus `actionIcon`):

```tsx
// src/ui/stage/FeedbackSheet.tsx
import { Check, Lightbulb } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { Label } from '../Label';

export type SheetTone = 'neutral' | 'good' | 'oops';

interface Props {
  tone?: SheetTone;
  title?: string;
  detail?: ComponentChildren;
  actionLabel: string;
  actionIcon?: ComponentChildren;
  onAction: () => void;
  disabled?: boolean;
}

/** The lesson's one action spot (spec 2026-10-04 §3): docked under the stage; after an answer it slides up as the feedback sheet. */
export function FeedbackSheet({ tone = 'neutral', title, detail, actionLabel, actionIcon, onAction, disabled = false }: Props) {
  return (
    <div class={`sheet sheet--${tone}`} role={tone === 'neutral' ? undefined : 'status'}>
      {tone === 'neutral' ? (
        <span class="spacer" />
      ) : (
        <div class="sheet__msg">
          <span class="sheet__badge" aria-hidden="true">
            {tone === 'good' ? <Check size={34} strokeWidth={3.5} /> : <Lightbulb size={30} strokeWidth={3} />}
          </span>
          <div class="sheet__text">
            {title && <div class="sheet__title"><Label zh={title} /></div>}
            {detail && <div class="sheet__detail">{detail}</div>}
          </div>
        </div>
      )}
      <button type="button" class={`btn btn--big ${tone === 'oops' ? 'btn--oops' : 'btn--primary'}`} disabled={disabled} onClick={() => { if (!disabled) onAction(); }}>
        <Label zh={actionLabel} />{actionIcon}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Swap every caller.** In each activity file listed above, replace `import { BottomBar } from '…/ui/BottomBar';` with `import { FeedbackSheet } from '…/ui/stage/FeedbackSheet';` (relative path `../../ui/stage/FeedbackSheet`). Replace `<BottomBar` with `<FeedbackSheet`, keeping the props as they are. Delete `src/ui/BottomBar.tsx`.

- [ ] **Step 5: Rename the CSS.** In `src/styles.css`, rename every selector `.bottombar` → `.sheet`, `.bottombar--` → `.sheet--`, `.bottombar__` → `.sheet__`. There are about 20 rules, at lines ~176–189, 476–477, 807–810, 1041 and any media blocks. Run `grep -n bottombar src/styles.css` until it prints nothing. Then add these rules at the end of the file (under a new header comment `/* ===== Stage (spec 2026-10-04 §3) ===== */`):

```css
/* ===== Stage (spec 2026-10-04 §3) ===== */
.sheet__msg { min-width: 0; flex: 1; display: flex; align-items: center; gap: 12px; }
.sheet__text { min-width: 0; }
.sheet__detail { display: grid; gap: 2px; justify-items: start; }
.sheet .btn { flex: none; }
```

- [ ] **Step 6: Update the selectors in tests and the sweep.** Replace `.bottombar` with `.sheet` (and `bottombar--`/`bottombar__` likewise) in:
  - `src/app/SessionScreen.test.tsx`, `src/app/PlacementScreen.test.tsx`, `src/activities/flashcards/FlashcardStep.test.tsx`, `src/activities/components/ComponentsStep.test.tsx`;
  - `src/styles.test.ts`, except the new assertion that `.bottombar` is gone;
  - `scripts/fit-check.ts` lines 28, 109, 123 (`MAIN`, the tone query, the walker's 继续 tap).

  Move the BottomBar tests from `src/ui/bars.test.tsx` into the new file. They are covered by Step 1's tests; delete duplicates. Keep any non-BottomBar tests where they are.

- [ ] **Step 7: Run the tests.** `npx vitest run` and `npx tsc --noEmit -p .`. Expected: all pass, with the same count plus the new tests. No `BottomBar` imports remain (`grep -rn BottomBar src scripts` prints nothing).

- [ ] **Step 8: Commit.**

```bash
git add -A src scripts
git commit -m "refactor: FeedbackSheet replaces BottomBar (the stage's feedback sheet)"
```

### Task 2: The Stage layout

**Files:**
- Create: `src/ui/stage/Stage.tsx`
- Modify: `src/ui/stage/stage.test.tsx`, `src/styles.css` (Stage section), `src/styles.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 except co-location.
- Produces: `export type StageActivity = 'flash' | 'use' | 'zibian' | 'write' | 'langdu' | 'placement'` and `Stage(props: { activity: StageActivity; truffle: ComponentChildren; sheet: ComponentChildren; children: ComponentChildren })`. Markup:

```
<div class="stage stage--{activity}" data-stage={activity}>
  <div class="stage__truffle">{truffle}</div>
  <section class="stage__card">{children}</section>
  <div class="stage__sheet">{sheet}</div>
</div>
```

- Produces (CSS custom properties, used by later tasks):
  - `--stage-pet`: Truffle's width on the stage.
  - `--q-hanzi`: question hanzi size.
  - `--tile-hanzi`: answer-tile hanzi size.
  - `--sentence`: sentence task text size.
- Produces: the `data-q` attribute convention. The element holding the question's hanzi gets `data-q` so the sweep can measure it (Task 10).

- [ ] **Step 1: Write the failing tests**

```tsx
// append to src/ui/stage/stage.test.tsx
import { Stage } from './Stage';

describe('Stage (spec 2026-10-04 §3)', () => {
  it('puts Truffle, the card and the sheet in their own regions, marked by activity', () => {
    render(<Stage activity="flash" truffle={<i class="t" />} sheet={<i class="s" />}><i class="c" /></Stage>);
    const stage = document.querySelector('.stage.stage--flash[data-stage="flash"]')!;
    expect(stage.querySelector(':scope > .stage__truffle > .t')).toBeTruthy();
    expect(stage.querySelector(':scope > section.stage__card > .c')).toBeTruthy();
    expect(stage.querySelector(':scope > .stage__sheet > .s')).toBeTruthy();
  });
});
```

Append to `src/styles.test.ts` (inside the last `describe`):

```ts
  it('the stage: one grid, card / Truffle / sheet regions, a sideways layout on a landscape iPad (spec 2026-10-04 §3)', () => {
    expect(css).toMatch(/\.stage \{[^}]*display: grid;[^}]*grid-template-areas: "card" "truffle" "sheet"/);
    expect(css).toMatch(/@media \(orientation: landscape\) and \(min-height: 600px\) \{[^@]*\.stage \{[^}]*grid-template-areas: "truffle card" "sheet sheet"/);
    expect(css).toMatch(/\.stage__card \{[^}]*min-height: 0;[^}]*overflow: hidden/);
    expect(css).toMatch(/\.stage__truffle \.pet__bubble \{[^}]*max-width:/); // review focus 3
  });
  it('question hanzi ≥ 64px on an iPad and ≥ 48px on a phone; tiles 40–48px; sentences ≥ 28px on an iPad (spec §3)', () => {
    expect(css).toMatch(/:root \{[^}]*--q-hanzi: 48px;[^}]*--tile-hanzi: 40px;[^}]*--sentence: 22px;/);
    expect(css).toMatch(/@media \(min-width: 600px\) \{\s*:root \{ --q-hanzi: clamp\(64px, [^)]*\); --tile-hanzi: clamp\(40px, [^)]*, 48px\); --sentence: clamp\(28px, [^)]*\); \}/);
  });
```

- [ ] **Step 2: Run them.** `npx vitest run src/ui/stage/stage.test.tsx src/styles.test.ts`. Expected: FAIL (no `./Stage`; CSS missing).

- [ ] **Step 3: Implement Stage**

```tsx
// src/ui/stage/Stage.tsx
import type { ComponentChildren } from 'preact';

export type StageActivity = 'flash' | 'use' | 'zibian' | 'write' | 'langdu' | 'placement';

/**
 * One layout for every lesson activity (spec 2026-10-04 §3): the world behind, Truffle in one spot, the lesson on a paper
 * card that fills its region (so its box is the same on every question), and the feedback sheet docked underneath.
 */
export function Stage({ activity, truffle, sheet, children }: { activity: StageActivity; truffle: ComponentChildren; sheet: ComponentChildren; children: ComponentChildren }) {
  return (
    <div class={`stage stage--${activity}`} data-stage={activity}>
      <div class="stage__truffle">{truffle}</div>
      <section class="stage__card">{children}</section>
      <div class="stage__sheet">{sheet}</div>
    </div>
  );
}
```

- [ ] **Step 4: Add the stage CSS** to the Stage section at the end of `src/styles.css`:

```css
:root { --stage-pet: clamp(64px, 10dvh, 96px); --q-hanzi: 48px; --tile-hanzi: 40px; --sentence: 22px; }
@media (min-width: 600px) {
  :root { --q-hanzi: clamp(64px, 11dvh, 128px); --tile-hanzi: clamp(40px, 6dvh, 48px); --sentence: clamp(28px, 3.6dvh, 34px); }
}
@media (max-width: 599px) {
  :root { --q-hanzi: clamp(48px, 9dvh, 88px); }
}
.stage { flex: 1; min-height: 0; display: grid; gap: clamp(8px, 1.4dvh, 14px); grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto; grid-template-areas: "card" "truffle" "sheet"; }
.stage__card {
  grid-area: card; min-height: 0; position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(8px, 1.6dvh, 18px);
  padding: clamp(12px, 2dvh, 24px); background: #fffaf0; border-radius: 22px; box-shadow: 0 8px 22px rgba(43, 58, 42, 0.18);
}
.stage__truffle { grid-area: truffle; min-height: 0; display: flex; align-items: flex-end; justify-content: flex-start; }
.stage__truffle .pet { flex-direction: row-reverse; align-items: center; gap: 8px; }
.stage__truffle .truffle { width: var(--stage-pet); height: auto; }
.stage__truffle .pet__bubble { margin-bottom: 0; max-width: calc(100vw - var(--stage-pet) - 3 * var(--pad-x, 20px)); }
.stage__sheet { grid-area: sheet; min-width: 0; }
.stage__sheet .sheet { position: static; margin: 0; }
@media (orientation: portrait) and (min-width: 600px) {
  :root { --stage-pet: clamp(110px, 13dvh, 150px); }
}
@media (orientation: landscape) and (min-height: 600px) {
  :root { --stage-pet: clamp(150px, 24dvh, 210px); }
  .stage { grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); grid-template-rows: minmax(0, 1fr) auto; grid-template-areas: "truffle card" "sheet sheet"; column-gap: clamp(16px, 3vw, 40px); }
  .stage__truffle { justify-content: center; padding-bottom: 8px; }
  .stage__truffle .pet { flex-direction: column; } /* his bubble above him */
}
```

- [ ] **Step 5: Run the tests.** `npx vitest run src/ui/stage src/styles.test.ts`. Expected: PASS.
- [ ] **Step 6: Commit.** `git add src/ui/stage src/styles.css src/styles.test.ts && git commit -m "feat: the stage layout (Truffle, lesson card, feedback sheet)"`

### Task 3: 认一认 on the stage

**Files:**
- Modify: `src/activities/flashcards/FlashcardStep.tsx` (render, around lines 128–190), `src/styles.css` (remove `.flash` grid and `.flash__pet` rules), `src/activities/flashcards/FlashcardStep.test.tsx`

**Interfaces:**
- Consumes: `Stage` (activity `'flash'`) and `FeedbackSheet`.
- Produces: the prompt hanzi carries `data-q`. A sentence cue renders through `Label` (pinyin over every character) with a `SpeakButton` that reads around the blank before the answer and the full sentence after.

- [ ] **Step 1: Write the failing tests** (append to `FlashcardStep.test.tsx`):

```tsx
describe('认一认 on the stage (spec 2026-10-04 §3)', () => {
  it('renders inside the stage: Truffle in his spot, the question on the card, the sheet underneath', () => {
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    const stage = document.querySelector('.stage[data-stage="flash"]')!;
    expect(stage.querySelector('.stage__truffle .pet svg.truffle')).toBeTruthy();
    expect(stage.querySelector('.stage__card [data-q]')!.textContent).toBe(he.text);
    expect(stage.querySelector('.stage__card .choices')).toBeTruthy();
    expect(stage.querySelector('.stage__sheet .sheet')).toBeTruthy();
  });
  it('the new-word card is on the stage too', () => {
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.stage .stage__card .intro')).toBeTruthy();
  });
  it('a sentence cue shows pinyin over its characters and has a speaker that does not give the word away', () => {
    vi.mocked(speak).mockClear();
    const w = makeWord('保持', { id: 'p:1', pinyin: 'bǎo chí', source: 'parent', level: null, sentences: [{ text: '教室里要保持安静。', pinyin: '' }] });
    render(<FlashcardStep {...base} word={w} pool={[...pool, w]} item={{ wordId: w.id, isNew: false, retry: false, mode: 'meaning' }} voice={false} onDone={vi.fn()} />);
    const cue = document.querySelector('.meaning-cue--sentence')!;
    expect(cue.querySelector('.label__py')).toBeTruthy();
    fireEvent.click(cue.parentElement!.querySelector('.speak')!);
    expect(vi.mocked(speak).mock.calls.at(-1)![0]).not.toContain('保持');
  });
});
```

If `makeWord` with `mode: 'meaning'` does not produce a sentence cue in this pool, use the existing test helper in the same file that renders a sentence cue (search `meaning-cue--sentence` in `FlashcardStep.test.tsx`) and copy its setup.

- [ ] **Step 2: Run it.** `npx vitest run src/activities/flashcards/FlashcardStep.test.tsx`. Expected: FAIL (no `.stage`; no pinyin in the sentence cue).

- [ ] **Step 3: Implement.** In `FlashcardStep`'s return:

```tsx
  const sheet =
    phase === 'intro' ? <FeedbackSheet actionLabel="我记住了！" onAction={() => setPhase('quiz')} />
    : phase === 'quiz' ? <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
    : result ? (
        <FeedbackSheet
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? quiz.cheer : quiz.comfort}
          detail={result.correct ? undefined : (
            <>
              正确答案：<span class="hanzi">{quiz.cue ? quiz.cue.full : word.text}</span>
              <span>{quiz.cue ? quiz.cue.pinyin : word.pinyin}</span>
              <SpeakButton text={quiz.cue ? quiz.cue.full : word.text} />
            </>
          )}
          actionLabel="继续"
          onAction={next}
        />
      ) : null;
  return (
    <>
      <Stage
        activity="flash"
        truffle={<div ref={petRef}><Pet kid={kid} mood={mood} bubble={bubble} size={180} lookAt={phase === 'quiz' ? 0.8 : 0} bounce={phase === 'feedback' && !!result?.correct} /></div>}
        sheet={sheet}
      >
        {phase === 'intro' ? <Intro word={word} /> : (
          <>
            <div class="flash__prompt">
              {quiz.cue ? (
                <div class="meaning-prompt">
                  {quiz.cue.kind === 'sentence' ? (
                    <div class="meaning-cue meaning-cue--sentence" lang="zh">
                      <Label zh={`${quiz.cue.before}${phase === 'feedback' ? word.text : '＿'.repeat(Array.from(word.text).length)}${quiz.cue.after}`} />
                      <SpeakButton text={phase === 'feedback' ? quiz.cue.full : `${quiz.cue.before}，，${quiz.cue.after}`} />
                    </div>
                  ) : (
                    <div class="hanzi meaning-cue" lang="zh" data-q style={`--len:${Array.from(quiz.cue.full).length}`}>
                      {quiz.cue.before}
                      <span class="meaning-cue__blank" aria-label="空格">{phase === 'feedback' ? word.text : '？'}</span>
                      {quiz.cue.after}
                    </div>
                  )}
                  {quiz.cue.kind === 'word' && <div class="pinyin">{quiz.cue.pinyin}</div>}
                </div>
              ) : (
                <>
                  {quiz.listen ? <SpeakButton text={word.text} big /> : <div class="hanzi hanzi--q" data-q>{word.text}</div>}
                  {phase === 'feedback' && <UsageLine word={word} />}
                </>
              )}
            </div>
            <div class={`choices stagger ${quiz.listen || quiz.cue ? 'choices--hanzi' : 'choices--pinyin'}`}>
              {/* the existing option buttons, unchanged */}
            </div>
          </>
        )}
      </Stage>
      {showCloseup && <Closeup kid={kid} />}
    </>
  );
```

Keep the existing `quiz.options.map(...)` button block exactly as it is inside `.choices`. Add the imports `Stage` and `Label`. Remove the old outer `<div class="flash">`, `.flash__pet` and `.flash__main` wrappers.

In `src/styles.css`:
- Delete the now-unused rules for `.flash` (line ~205 grid and ~817), `.flash__pet` (including the phone and landscape media variants; `grep -n "flash__pet\|\.flash\b\|flash__main" src/styles.css`), and `.hanzi--lg`/`.hanzi--xl` usages inside `.flash__prompt` if any.
- Add to the Stage section:

```css
.hanzi--q { font-family: var(--hanzi); font-size: var(--q-hanzi); line-height: 1.05; }
.stage--flash .choices--hanzi .choice, .stage--use .choices--hanzi .choice { font-size: var(--tile-hanzi); }
.meaning-cue.meaning-cue--sentence { font-size: var(--sentence); display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.stage__card .choices { width: min(100%, 560px); }
```

- [ ] **Step 4: Run it.** `npx vitest run src/activities/flashcards src/app` and `npx tsc --noEmit -p .`. Expected: PASS. Older tests that asserted `.flash__pet` or `hanzi--xl` on the prompt: update them to `.stage__truffle` and `[data-q]`, keeping their intent. Record each one as `Ruling:` in the ledger.
- [ ] **Step 5: Look at it.** `FIT_ONLY='^(flashcards|lesson)$' npm run fit`. Expected: 0 problems. Read `fit-shots/ipad-landscape/flashcards-01.png`, `fit-shots/ipad-portrait/flashcards-01.png` and `fit-shots/iphone-se/flashcards-01.png`, and check Truffle lower left, card right/top, and the sheet docked.
- [ ] **Step 6: Commit.** `git add -A src && git commit -m "feat: 认一认 on the stage; sentence cues with pinyin and a speaker"`

### Task 4: 选一选 and 用一用 on the stage

**Files:**
- Modify: `src/activities/choose/UseQuestion.tsx` (used by both `ChooseStep` and `WrapupStep`), `src/styles.css` (remove `.flash.use` leftovers, `.usage-opts` width rules move into the Stage section), `src/activities/choose/ChooseStep.test.tsx`

**Interfaces:**
- Consumes: `Stage` (activity `'use'`), `FeedbackSheet`, `Label`, `SpeakButton`.
- Produces: the fit sentence is rendered as `<div class="meaning-cue meaning-cue--sentence" data-q>` containing a `Label` and a speaker. Each 用对了吗 option is `<div class="usage-row"><button class="choice usage-opt …"><Label zh={s} /></button><SpeakButton text={s} /></div>`.

- [ ] **Step 1: Write the failing tests** (append to `ChooseStep.test.tsx`). Reuse that file's existing `fit` and `usage` item fixtures; search it for `kind: 'usage'`.

```tsx
describe('选一选 / 用一用 on the stage (spec 2026-10-04 §3)', () => {
  it('a fit question: Truffle in his spot, the sentence with pinyin and a speaker on the card', () => {
    render(<ChooseStep items={[fitFixture]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={vi.fn()} />);
    const card = document.querySelector('.stage[data-stage="use"] .stage__card')!;
    expect(card.querySelector('.meaning-cue--sentence .label__py')).toBeTruthy();
    expect(card.querySelector('.meaning-cue--sentence .speak')).toBeTruthy();
    expect(document.querySelector('.stage__truffle .pet')).toBeTruthy();
  });
  it('用对了吗: each sentence has pinyin and its own speaker, outside the answer button', () => {
    render(<ChooseStep items={[usageFixture]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={vi.fn()} />);
    const rows = [...document.querySelectorAll('.usage-row')];
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.querySelector('button.usage-opt .label__py')).toBeTruthy();
      expect(r.querySelector(':scope > .speak')).toBeTruthy();
    }
  });
});
```

If the fixtures are named differently, use the file's existing names. If none exist, build them with `fitItem`/`usageItem` from `src/practice/useItems.ts` (use the item shapes in `UseQuestion`: `kind: 'fit'` with `before`, `after`, `word`, `options`; `kind: 'usage'` with `right`, `wrong`, `word`).

- [ ] **Step 2: Run it.** `npx vitest run src/activities/choose`. Expected: FAIL.
- [ ] **Step 3: Implement.** In `UseQuestion`'s return, wrap in `Stage`:
  - **Truffle slot:** `truffle={<Pet kid={kid} mood={done ? (correct ? 'pleased' : 'side') : resting} bubble={done ? (closing ? '明天再来！' : null) : (bubble ?? ask)} size={180} bounce={done && correct} />}`.
  - **Sheet slot:** the existing two `FeedbackSheet`s (disabled 继续 before an answer, feedback after).
  - **Fit content:**

```tsx
<div class="flash__prompt">
  <div class="meaning-cue meaning-cue--sentence" lang="zh" data-q>
    <Label zh={`${item.before}${done ? item.word : '＿'.repeat(Array.from(item.word).length)}${item.after}`} />
    <SpeakButton text={done ? fullSentence(item) : `${item.before}，，${item.after}`} />
  </div>
</div>
<div class={`choices stagger choices--hanzi${multi ? ' choices--words' : ''}`}>{/* existing option buttons, unchanged */}</div>
```

  - **用对了吗 content:**

```tsx
<div class="usage-opts stagger" lang="zh">
  {lines.order.map((s) => (
    <div class="usage-row" key={s}>
      <button type="button" class={`choice usage-opt press ${state(s)}`} disabled={done} onClick={(e) => choose(s, e.currentTarget)}>
        <Label zh={s} />
      </button>
      <SpeakButton text={s} />
    </div>
  ))}
</div>
```

  Remove the old `<div class="flash use">`, `.flash__pet` and `.flash__main` wrappers. Add the `Stage`, `Label` and `SpeakButton` imports.

  CSS: add to the Stage section

```css
.usage-opts { display: grid; gap: 12px; width: min(100%, 640px); }
.usage-row { display: flex; align-items: center; gap: 10px; }
.usage-row .usage-opt { flex: 1; min-width: 0; font-size: var(--sentence); text-align: left; }
```

  Then delete the older `.usage-opts` and `.usage-opt.choice` rules (lines ~1027–1028), and any `.use` rules that only served the old layout.
- [ ] **Step 4: Run it.** `npx vitest run src/activities/choose src/app` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Look at it.** `FIT_ONLY='^(choose|wrapup)$' npm run fit`. Expected: 0 problems. Read the ipad-landscape, ipad-portrait and iphone-se `choose-01` and `wrapup` screenshots that show a 用对了吗 question.
- [ ] **Step 6: Commit.** `git commit -am "feat: 选一选 and 用一用 on the stage; sentences with pinyin and speakers"`

### Task 5: 字辨 on the stage

**Files:**
- Modify: `src/activities/components/ComponentsStep.tsx`, `src/styles.css` (remove `.components > .pet` rules and the components phone/landscape Pet placements), `src/activities/components/ComponentsStep.test.tsx`

**Interfaces:**
- Consumes: `Stage` (activity `'zibian'`), `FeedbackSheet`.
- Produces: `.pond-q` carries `data-q`.

- [ ] **Step 1: Write the failing test** (append to `ComponentsStep.test.tsx`, reusing the file's `items` fixture):

```tsx
it('字辨 on the stage: Truffle in his spot, the word with its gap on the card, the fish tiles below it (spec 2026-10-04 §3)', () => {
  render(<ComponentsStep items={items} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={vi.fn()} />);
  const stage = document.querySelector('.stage[data-stage="zibian"]')!;
  expect(stage.querySelector('.stage__truffle .pet')).toBeTruthy();
  expect(stage.querySelector('.stage__card .pond-q[data-q]')).toBeTruthy();
  expect(stage.querySelector('.stage__card .pond')).toBeTruthy();
});
```

- [ ] **Step 2: Run it.** `npx vitest run src/activities/components`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Replace the outer `<div class="center components">` and its first child `<Pet …/>` with `<Stage activity="zibian" truffle={<Pet kid={kid} mood={!done ? resting : correct ? 'pleased' : 'side'} bubble={!done ? '钓鱼啦！' : null} size={180} />} sheet={…}>`.
  - The sheet is the existing `FeedbackSheet` pair (disabled 继续, then the feedback with the `.zibian__why` rows).
  - The card holds `.pond-q` (add `data-q`) and `.pond`.
  - In CSS, delete `.components { … }` (lines ~250, ~875), `.components > .pet …` and the phone `.components > .pet` rules. Then add:

```css
.stage--zibian .pond-q { font-size: var(--q-hanzi); }
.stage--zibian .fishtile__char { font-size: var(--tile-hanzi); }
```

- [ ] **Step 4: Run it.** `npx vitest run src/activities/components src/app` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Look at it.** `FIT_ONLY='^(components)$' npm run fit`. Expected: 0 problems. Read `ipad-landscape` and `iphone-se` components screenshots after a wrong answer: the two explanation rows and 继续 are inside the sheet (review focus 1).
- [ ] **Step 6: Commit.** `git commit -am "feat: 字辨 on the stage"`

### Task 6: 写一写 on the stage; the box fits the card

**Files:**
- Modify: `src/activities/writing/WritingStep.tsx`, `src/activities/writing/size.ts`, `src/activities/writing/size.test.ts` (create if missing), `src/styles.css` (remove `.write__head` Pet rules), `src/activities/writing/WritingStep.test.tsx`

**Interfaces:**
- Consumes: `Stage` (activity `'write'`), `FeedbackSheet`.
- Produces: `writingBoxFor(card: { width: number; height: number }, aboveBox: number): number`. It returns the tianzige size in px: at most 400 and at least 200. It fits inside the card's inner width minus 32 and the card's height minus `aboveBox` (the cue and dots) minus 32. `writingBoxSize` is deleted.

- [ ] **Step 1: Write the failing tests**

```ts
// src/activities/writing/size.test.ts
import { describe, expect, it } from 'vitest';
import { writingBoxFor } from './size';

describe('writingBoxFor (the box fits the stage card)', () => {
  it('fills a roomy card up to 400px', () => expect(writingBoxFor({ width: 620, height: 640 }, 150)).toBe(400));
  it('is limited by the card height left under the cue', () => expect(writingBoxFor({ width: 620, height: 420 }, 150)).toBe(238));
  it('is limited by the card width on a phone', () => expect(writingBoxFor({ width: 343, height: 520 }, 130)).toBe(311));
  it('never smaller than 200', () => expect(writingBoxFor({ width: 200, height: 200 }, 150)).toBe(200));
});
```

Append to `WritingStep.test.tsx`:

```tsx
it('写一写 on the stage: Truffle in his spot, cue and box on the card (spec 2026-10-04 §3)', () => {
  render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
  const stage = document.querySelector('.stage[data-stage="write"]')!;
  expect(stage.querySelector('.stage__truffle .pet')).toBeTruthy();
  expect(stage.querySelector('.stage__card .write__cue')).toBeTruthy();
  expect(stage.querySelector('.stage__card .tianzige')).toBeTruthy();
});
it('re-measures the box when the card resizes (an iPad rotated mid-character; review focus 2)', () => {
  quizzes.length = 0;
  render(<WritingStep word={makeWord('大')} kid={DEFAULT_KID} resting="sulk" isNew={false} pass="recall" onDone={vi.fn()} />);
  const creates = vi.mocked(HanziWriter.create).mock.calls.length;
  window.dispatchEvent(new Event('resize'));
  expect(vi.mocked(HanziWriter.create).mock.calls.length).toBeGreaterThan(creates); // the writer is rebuilt at the new size
});
```

- [ ] **Step 2: Run them.** `npx vitest run src/activities/writing`. Expected: FAIL.
- [ ] **Step 3: Implement.**

```ts
// src/activities/writing/size.ts
/** The 田字格 size: as big as the stage card allows under the cue (spec 2026-10-04 §3), between 200 and 400px. */
export function writingBoxFor(card: { width: number; height: number }, aboveBox: number): number {
  const fit = Math.min(400, card.width - 32, card.height - aboveBox - 32);
  return Math.max(200, Math.round(fit));
}
```

  In `WritingStep`:
  - Add `const [resized, setResized] = useState(0);` and `useEffect(() => { const on = () => setResized((n) => n + 1); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);`.
  - Add `resized` to the writer effect's dependencies (`[word.id, index, pass, resized]`). In jsdom, measured sizes are 0, so the 200 floor applies. That's fine for tests.
  - In the writer effect, replace the `writingBoxSize(...)` call with:

```ts
    const card = el.closest('.stage__card') as HTMLElement | null;
    const cue = card?.querySelector('.write__cue') as HTMLElement | null;
    const size = writingBoxFor({ width: card?.clientWidth ?? window.innerWidth, height: card?.clientHeight ?? window.innerHeight }, (cue?.offsetHeight ?? 120) + 24);
```

  - Render with `<Stage activity="write" truffle={<Pet … size={180} />} sheet={…the existing FeedbackSheets…}>`. The card holds `.write__cue`, `.dots` and `.tianzige`, so remove the `.row.write__head` wrapper. Keep `{showCloseup && <Closeup kid={kid} />}` after the Stage.
  - CSS: delete the `.write__head` rules and the `.write { … }` grid rules that placed the Pet (lines ~233, ~850, and any media variants). Add `.stage--write .stage__card { justify-content: flex-start; }`.
- [ ] **Step 4: Run it.** `npx vitest run src/activities/writing src/app` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Look at it.** `FIT_ONLY='^(writing|writing-sentence)$' npm run fit`. Expected: 0 problems. Read the ipad-landscape and iphone-se screenshots, and check the box is large and fully inside the card.
- [ ] **Step 6: Commit.** `git commit -am "feat: 写一写 on the stage; the writing box fits the card and re-fits on rotation"`

### Task 7: 朗读 on the stage

**Files:**
- Modify: `src/activities/langdu/LangduStep.tsx` (all four parts: warm-up, echo, read, listen), `src/styles.css` (remove `.langdu > .pet` and per-device Pet placements), `src/activities/langdu/LangduStep.test.tsx`

**Interfaces:**
- Consumes: `Stage` (activity `'langdu'`), `FeedbackSheet`.

- [ ] **Step 1: Write the failing test** (append to `LangduStep.test.tsx`, using the file's existing render helper):

```tsx
it('every part of 朗读 is on the stage with Truffle in his spot (he was missing from three of them)', async () => {
  // render as the file's other tests do, then step through warm-up → echo → read → listen using their helpers
  // at each part:
  expect(document.querySelector('.stage[data-stage="langdu"] .stage__truffle .pet')).toBeTruthy();
  expect(document.querySelector('.stage__card .langdu')).toBeTruthy();
});
```

Write it as one test per part, copying the existing setup that reaches each part (search the file for `setPart`-driving clicks: 继续, 下一句, 开始朗读, 完成). Each test ends with the two assertions above.

- [ ] **Step 2: Run it.** `npx vitest run src/activities/langdu`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Each part returns `<Stage activity="langdu" truffle={pet} sheet={…its FeedbackSheet…}><div class="langdu">…its content…</div></Stage>`.
  - Define at the top of the component body: `const pet = <Pet kid={kid} mood="neutral" size={180} bubble={part === 'warmup' ? '你好！' : part === 'echo' ? '听一听，说一说' : part === 'read' ? '大声读！' : '听听你自己'} />;`.
  - Remove the existing warm-up `<Pet …>` from the content.
  - CSS: delete `.langdu > .pet …` rules (lines ~925–934 and media variants). Keep `.langdu` as a plain column inside the card: `.stage .langdu { width: 100%; min-height: 0; display: flex; flex-direction: column; align-items: center; gap: clamp(8px, 1.6dvh, 18px); }`.
- [ ] **Step 4: Run it.** `npx vitest run src/activities/langdu src/app` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Look at it.** `FIT_ONLY='^(langdu|langdu-extra)$' npm run fit`. Expected: 0 problems. The long passage still scrolls inside its box; the long self-introduction still scrolls in its card.
- [ ] **Step 6: Commit.** `git commit -am "feat: 朗读 on the stage; Truffle stays with him through every part"`

### Task 8: Placement on the stage

**Files:**
- Modify: `src/app/PlacementScreen.tsx` (question render, around lines 118–164), `src/styles.css` (`.placement .center` rules become stage-card rules), `src/app/PlacementScreen.test.tsx`

**Interfaces:**
- Consumes: `Stage` (activity `'placement'`), `FeedbackSheet` with `actionIcon`.
- Produces: the placement screen root keeps `class="screen placement"` with `data-ready` and `data-asked`. `.placement__prompt` and `.placement__choices` stay as they are (the sweep's steadiness check uses them). 不知道 becomes the sheet's action button, so `.placement .btn--big` still matches it.

- [ ] **Step 1: Write the failing test** (append to `PlacementScreen.test.tsx`, reusing its render setup with a fixed `seed`):

```tsx
it('placement is on the stage: Truffle in his spot, the question on the card, 不知道 in the sheet', async () => {
  // render <PlacementScreen tapGuardMs={0} seed={1} /> as the other tests do and wait for the first question
  const stage = document.querySelector('.stage[data-stage="placement"]')!;
  expect(stage.querySelector('.stage__truffle .pet')).toBeTruthy();
  expect(stage.querySelector('.stage__card .placement__prompt')).toBeTruthy();
  expect(stage.querySelector('.stage__sheet .sheet button')!.textContent).toContain('不知道');
});
```

- [ ] **Step 2: Run it.** `npx vitest run src/app/PlacementScreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Inside the question screen, replace `<div class="center">…</div>` with:

```tsx
<Stage
  activity="placement"
  truffle={<Pet kid={k} mood="neutral" bubble={q ? BUBBLE[q.style] : undefined} size={180} />}
  sheet={<FeedbackSheet actionLabel="不知道" actionIcon={<InkIcon name="think" size={30} />} onAction={() => void answer(false)} />}
>
  {/* the existing .placement__prompt and .placement__choices blocks, unchanged */}
</Stage>
```

  - Keep `<Scene kind="home" />` and the 回家 button outside the Stage, as now. Keep the result screen as it is (it is not a question).
  - CSS: replace `.placement .center { justify-content: flex-start; padding-top: …; gap: … }` with `.stage--placement .stage__card { justify-content: center; }`.
  - Make sure `.placement__prompt` and `.placement__choices` keep their fixed sizes (`width: min(100%, 560px)` and the fixed heights). Their rules stay.
- [ ] **Step 4: Run it.** `npx vitest run src/app` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Look at it.** `FIT_ONLY='^placement$' npm run fit`. Expected: 0 problems, including the existing "question size changed between questions" check (review focus 4).
- [ ] **Step 6: Commit.** `git commit -am "feat: placement on the stage"`

### Task 9: The paper art kit and the new 后院

**Files:**
- Create: `src/ui/worlds/kit/paper.ts`, `src/ui/worlds/kit/props.ts`, `src/ui/worlds/yard.ts`, `src/ui/worlds/yard.test.ts`
- Modify: `src/ui/worlds/scenes.ts` (`SCENES.yard` and the header comment)

**Interfaces:**
- Produces:
  - `paper.ts`:
    - `grad(id: string, top: string, bottom: string): string`: a vertical `<linearGradient>`.
    - `layer(id: string, d: string, top: string, bottom: string, edge: string, edgeD: string): string`: a paper layer. It draws the path with its gradient fill, an offset shadow copy behind it (`translate(0 3)`, `#2b3a2a`, opacity .14), and a 2px sunlit top edge along `edgeD`.
    - `shadowed(markup: string, d?: string): string`: wraps a prop. It draws a soft ground ellipse when `d` is given, then the markup.
    - `cloud(x, y, s)`, `leafyTree(x, y, s)`, `tuft(x, y, color, s)`, `flower(x, y, color)`, `picketFence(x, y, count)`: each returns an SVG string.
  - `props.ts`: `bowl(x, y)`, `ball(x, y)`, `birdhouse(x, y)`, `sprinkler(x, y)`. Each returns `<g data-prop="{name}" transform="translate(x y)">…</g>`.
  - `yard.ts`: `YARD_PAPER: string`, the full scene on the 360×480 canvas (ground at y ≥ 300).
  - The sprinkler is at `(68, 392)`, the yard tap target in `WorldTaps.tsx`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/ui/worlds/yard.test.ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { YARD_PAPER } from './yard';
import { SCENES } from './scenes';

const anchor = (prop: string) => {
  const m = new RegExp(`data-prop="${prop}" transform="translate\\(([\\d.]+) ([\\d.]+)\\)"`).exec(YARD_PAPER);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
};

describe('the paper 后院 (spec 2026-10-04 §2)', () => {
  it('is the yard the app draws', () => expect(SCENES.yard).toBe(YARD_PAPER));
  it("holds Truffle's props: his bowl, his red ball, the birdhouse, the sprinkler", () => {
    for (const p of ['bowl', 'ball', 'birdhouse', 'sprinkler']) expect(anchor(p), p).not.toBeNull();
  });
  it("the sprinkler sits on Home's sprinkler tap target (68, 392), so a tap still sprays it", () => {
    expect(anchor('sprinkler')).toEqual({ x: 68, y: 392 });
  });
  it('the bowl and the ball sit in the ground band every screen shows (y 330–470), clear of the middle', () => {
    for (const p of ['bowl', 'ball']) {
      const a = anchor(p)!;
      expect(a.y, p).toBeGreaterThanOrEqual(330);
      expect(a.y, p).toBeLessThanOrEqual(470);
    }
  });
  it('no live filters and no ink outlines on the world (spec §2, §6)', () => {
    expect(YARD_PAPER).not.toMatch(/<filter|filter=|feDropShadow|feGaussianBlur|feTurbulence/);
    expect(YARD_PAPER).not.toMatch(/stroke="#2a2630"/);
  });
  it('every gradient id is defined once and prefixed, so other scenes on the page never clash', () => {
    const ids = [...YARD_PAPER.matchAll(/id="([^"]+)"/g)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('yp-')).toBe(true);
  });
});
```

- [ ] **Step 2: Run them.** `npx vitest run src/ui/worlds/yard.test.ts`. Expected: FAIL (no `./yard`).
- [ ] **Step 3: Implement the kit.** Write `src/ui/worlds/kit/paper.ts` and `src/ui/worlds/kit/props.ts` by porting the shapes from `docs/superpowers/mockups/2026-10-04-stage-worlds-paper.html` (the "Depth, light and story details" card; its source generator is reproduced below). Translate `feDropShadow` into offset shadow shapes and blurs into radial-gradient ellipses. The core of `paper.ts`:

```ts
// src/ui/worlds/kit/paper.ts
/** Storybook paper primitives for the worlds (spec 2026-10-04 §2): layers with a shade and a sunlit top edge, soft shadows
 *  drawn as shapes (never live filters, spec §6), no ink outlines. Every id is passed in, prefixed by the world. */
const SHADOW = '#2b3a2a';
export const grad = (id: string, top: string, bottom: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
export function layer(id: string, d: string, top: string, bottom: string, edge: string, edgeD: string): string {
  return `<defs>${grad(id, top, bottom)}</defs><path d="${d}" transform="translate(0 3)" fill="${SHADOW}" opacity=".14"/><path d="${d}" fill="url(#${id})"/><path d="${edgeD}" fill="none" stroke="${edge}" stroke-width="2" stroke-linecap="round"/>`;
}
export function groundShadow(id: string, cx: number, cy: number, rx: number, ry = 5): string {
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${SHADOW}" stop-opacity=".22"/><stop offset="1" stop-color="${SHADOW}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`;
}
export const lift = (markup: string) => `<g transform="translate(0 2.5)" fill="${SHADOW}" opacity=".14">${markup.replace(/fill="[^"]*"/g, '')}</g>${markup}`;
export function cloud(x: number, y: number, s = 1): string {
  const top = `<path d="M${x} ${y} a${18 * s} ${18 * s} 0 0 1 ${34 * s} ${-6 * s} a${14 * s} ${14 * s} 0 0 1 ${26 * s} ${8 * s} a${11 * s} ${11 * s} 0 0 1 ${-2 * s} ${22 * s} h${-58 * s} a${12 * s} ${12 * s} 0 0 1 0 ${-24 * s}Z" fill="#ffffff"/>`;
  const under = `<path d="M${x - 8 * s} ${y + 16 * s} h${70 * s} a${8 * s} ${8 * s} 0 0 1 ${-6 * s} ${8 * s} h${-58 * s} a${8 * s} ${8 * s} 0 0 1 ${-6 * s} ${-8 * s}Z" fill="#dcebf5"/>`;
  return lift(top) + under;
}
export function leafyTree(x: number, y: number, s = 1): string {
  const c = (dx: number, dy: number, r: number, f: string) => `<circle cx="${x + dx * s}" cy="${y + dy * s}" r="${r * s}" fill="${f}"/>`;
  const trunk = `<path d="M${x - 6 * s} ${y + 110 * s} C${x - 4 * s} ${y + 84 * s} ${x - 8 * s} ${y + 58 * s} ${x - 2 * s} ${y + 28 * s} L${x + 4 * s} ${y + 28 * s} C${x} ${y + 58 * s} ${x + 4 * s} ${y + 84 * s} ${x + 6 * s} ${y + 110 * s}Z" fill="#9c6a40"/>`;
  const crown = c(-22, 20, 24, '#4f9f55') + c(26, 20, 22, '#4f9f55') + c(0, -8, 30, '#5fb262') + c(-22, -2, 20, '#5fb262') + c(22, -4, 22, '#6cbd6a') + c(4, 16, 24, '#6cbd6a');
  const lights = `<g fill="#8fd486" opacity=".85">${c(-6, -18, 9, '#8fd486')}${c(18, -12, 7, '#8fd486')}${c(-26, -8, 6, '#8fd486')}</g>`;
  return lift(trunk) + lift(crown) + lights;
}
export function tuft(x: number, y: number, color: string, s = 1): string {
  return `<path d="M${x} ${y} q${-4 * s} ${-14 * s} ${-10 * s} ${-18 * s} q${8 * s} ${6 * s} ${10 * s} ${12 * s} q${1 * s} ${-12 * s} ${6 * s} ${-20 * s} q${2 * s} ${12 * s} ${2 * s} ${20 * s} q${4 * s} ${-8 * s} ${12 * s} ${-12 * s} q${-6 * s} ${8 * s} ${-8 * s} ${18 * s}Z" fill="${color}"/>`;
}
export function flower(x: number, y: number, color: string, r = 4.5): string {
  const petals = [0, 1, 2, 3, 4].map((k) => { const a = (k * 2 * Math.PI) / 5; return `<circle cx="${(x + r * Math.cos(a)).toFixed(1)}" cy="${(y + r * Math.sin(a)).toFixed(1)}" r="${(r * 0.75).toFixed(1)}" fill="${color}"/>`; }).join('');
  return `<path d="M${x} ${y + 3} q1 9 -1 16" stroke="#4f9a4a" stroke-width="1.6" fill="none"/>${petals}<circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="#ffd166"/>`;
}
export function picketFence(x: number, y: number, count: number): string {
  const posts = Array.from({ length: count }, (_, i) => `<path d="M${x + 4 + i * 15} ${y + 30} V${y} l5 -7 l5 7 V${y + 30}Z" fill="#fffaf0"/>`).join('');
  const rails = `<rect x="${x}" y="${y + 6}" width="${count * 15 + 4}" height="6" rx="2" fill="#f4ead2"/><rect x="${x}" y="${y + 20}" width="${count * 15 + 4}" height="6" rx="2" fill="#f4ead2"/>`;
  return lift(posts + rails);
}
```

`props.ts`, from the mockup: the bowl is a pink ellipse dish, the ball is red with a white seam arc, the birdhouse is a post with a roof and hole, and the sprinkler is a small green sprinkler. Each is wrapped as `<g data-prop="NAME" transform="translate(X Y)">…</g>` and drawn around its own origin (the origin is where it touches the ground):

```ts
// src/ui/worlds/kit/props.ts
import { lift } from './paper';
const g = (name: string, x: number, y: number, art: string) => `<g data-prop="${name}" transform="translate(${x} ${y})">${art}</g>`;
/** Truffle's own things in the yard (spec 2026-10-04 §2): drawn around the point where each touches the ground. */
export const bowl = (x: number, y: number) => g('bowl', x, y, lift('<path d="M-13 -4 q13 9 26 0 l-3 4 q-10 5 -20 0Z" fill="#f2b8c6"/><ellipse cx="0" cy="-4" rx="13" ry="3.5" fill="#f6cbd6"/><ellipse cx="0" cy="-4.5" rx="8" ry="2" fill="#c98a5a"/>'));
export const ball = (x: number, y: number) => g('ball', x, y, lift('<circle cx="0" cy="-9" r="9" fill="#ef6f6c"/>') + '<path d="M-8 -11 q8 -4 16 0" stroke="#ffffff" stroke-width="2" fill="none"/>');
export const birdhouse = (x: number, y: number) => g('birdhouse', x, y, lift('<rect x="-2" y="-34" width="4" height="34" fill="#b8804c"/><path d="M-12 -34 l12 -12 l12 12Z" fill="#e2725b"/><rect x="-9" y="-34" width="18" height="14" rx="2" fill="#f6d28b"/>') + '<circle cx="0" cy="-27" r="3" fill="#7a5233"/>');
export const sprinkler = (x: number, y: number) => g('sprinkler', x, y, lift('<rect x="-3" y="-14" width="6" height="14" rx="2" fill="#5aa86a"/><path d="M-10 -14 h20 l-4 -6 h-12Z" fill="#7cc48a"/><circle cx="0" cy="-22" r="3" fill="#ffd166"/>'));
```

- [ ] **Step 4: Compose the yard**:

```ts
// src/ui/worlds/yard.ts
import { cloud, flower, grad, groundShadow, layer, leafyTree, picketFence, tuft } from './kit/paper';
import { ball, birdhouse, bowl, sprinkler } from './kit/props';

/**
 * 后院 in storybook paper (spec 2026-10-04 §2) on the 360×480 world canvas (ground at y ≥ 300). Detail sits at the edges and
 * in the low ground band; the middle stays calm for the lesson card. The sprinkler is Home's tap target (68, 392).
 */
export const YARD_PAPER = [
  `<defs>${grad('yp-sky', '#a9dcf6', '#f6f1df')}</defs><rect width="360" height="480" fill="url(#yp-sky)"/>`,
  cloud(40, 150, 1), cloud(250, 120, 0.8),
  layer('yp-far', 'M0 258 C60 238 120 242 180 252 C240 262 300 238 360 244 V480 H0Z', '#c9e6cf', '#b9dcbf', '#e2f2e3', 'M0 258 C60 238 120 242 180 252 C240 262 300 238 360 244'),
  layer('yp-h1', 'M0 290 C80 262 170 270 250 288 C300 300 340 282 360 284 V480 H0Z', '#b4e28e', '#93cf70', '#d6f0b4', 'M0 290 C80 262 170 270 250 288 C300 300 340 282 360 284'),
  picketFence(214, 284, 9),
  leafyTree(46, 196, 1),
  birdhouse(118, 310),
  layer('yp-h2', 'M0 330 C90 310 190 322 280 332 C320 336 345 326 360 328 V480 H0Z', '#97d474', '#72bd55', '#bfe79a', 'M0 330 C90 310 190 322 280 332 C320 336 345 326 360 328'),
  groundShadow('yp-s1', 68, 393, 16), sprinkler(68, 392),
  groundShadow('yp-s2', 150, 431, 18), bowl(150, 430),
  groundShadow('yp-s3', 262, 445, 12), ball(262, 444),
  layer('yp-h3', 'M0 448 C100 436 220 446 320 452 C340 453 352 450 360 451 V480 H0Z', '#6fbd52', '#56a442', '#93d070', 'M0 448 C100 436 220 446 320 452 C340 453 352 450 360 451'),
  flower(22, 440, '#ff8fa3'), flower(38, 452, '#fff2f2'), flower(330, 444, '#ffd166'), flower(344, 456, '#ff8fa3'),
  tuft(6, 480, '#4a9e4a', 1.4), tuft(190, 480, '#57ad52', 1), tuft(352, 480, '#4a9e4a', 1.3),
].join('');
```

  In `src/ui/worlds/scenes.ts`:
  - `import { YARD_PAPER } from './yard';`
  - Set `yard: YARD_PAPER,` in `SCENES`.
  - Change the header comment to: "the yard is in the storybook-paper style (spec 2026-10-04 §2: gradients and shape-drawn shadows, no ink outlines or live filters); the other worlds keep their ink art until phase C".
- [ ] **Step 5: Run the tests.** `npx vitest run src/ui/worlds src/app src/childEmoji.test.ts` and `npx tsc --noEmit -p .`. Expected: PASS. `worlds.test.tsx`'s evening test still finds the moon, stars and lanterns, because `timeLayers` is unchanged.
- [ ] **Step 6: Look at it.** `FIT_ONLY='^(home|home-yard|home-done-yard|flashcards|lesson)$' npm run fit`. Expected: 0 problems, and the world-tap probe still finds the sprinkler target uncovered on Home. Read these screenshots:
  - `fit-shots/ipad-landscape/home-yard-00.png`, `fit-shots/ipad-portrait/home-yard-00.png`, `fit-shots/iphone-se/home-yard-00.png`;
  - a lesson screenshot per size (the yard behind the stage).

  Check that it matches the mockup's look: depth, the sunlit edges, the props in the ground band, and nothing busy behind the card. Adjust shapes and coordinates (not the anchors the tests pin) until it reads well at all three sizes.
- [ ] **Step 7: Commit.** `git add -A src && git commit -m "feat: the storybook-paper 后院 with Truffle's bowl, ball and birdhouse"`

### Task 10: The sweep checks the stage

**Files:**
- Modify: `scripts/fit-check.ts`, `scripts/fit-profile.test.ts` (only if a profile option is added)

**Interfaces:**
- Consumes: `.stage`, `.stage__card`, `.stage__truffle`, `.stage__sheet`, `[data-q]`, `.choices--hanzi .choice`, `.meaning-cue--sentence`, `.usage-opt`.
- Produces: three new problem kinds in the sweep report:
  - `stage moved: …` when a size's card, Truffle or sheet box differs (more than 2px) between lesson screens;
  - `too small: …` when a question hanzi is under 64px on an iPad or under 48px on a phone, a tile hanzi is outside 40–48px on an iPad, or a sentence is under 28px on an iPad;
  - `slow frames: …` when the p95 frame interval over 90 frames exceeds 20ms on a lesson screen.

- [ ] **Step 1: Record the stage boxes per screen.** In `check(p, size, flow, i)`, after the existing probes, evaluate:

```ts
const stage = await p.evaluate(() => {
  const box = (sel: string) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
  const fontPx = (sel: string) => { const el = document.querySelector(sel); return el ? parseFloat(getComputedStyle(el).fontSize) : null; };
  const isQuestion = !document.querySelector('.sheet--good, .sheet--oops');
  return document.querySelector('.stage') ? {
    activity: document.querySelector('.stage')!.getAttribute('data-stage'),
    card: box('.stage__card'), truffle: box('.stage__truffle .truffle'), sheet: box('.stage__sheet'),
    q: fontPx('[data-q]'), tile: fontPx('.choices--hanzi .choice'), sentence: fontPx('.meaning-cue--sentence, .usage-opt'), isQuestion,
  } : null;
});
```

  Store it with the result: `stageBoxes[size.name].push({ flow, step: i, ...stage })` in a module-level map.
- [ ] **Step 2: Check the boxes when a size's run finishes.** For each size, over all question-state entries (`isQuestion`):
  - **Card:** group by `activity`. Within each group, the `card` box must be identical (±2px) across entries.
  - **Truffle and sheet:** across all groups, the `truffle` box and the `sheet` box's left edge and width must be identical (±2px). The sheet's height may grow in feedback, but question entries only have neutral sheets.
  - **Push** `stage moved: <activity> card <a> vs <b>` (or `Truffle …`, `sheet …`) as a problem on the first offending screen.
- [ ] **Step 3: Check the sizes per screen.** On an iPad size (width ≥ 600):
  - flag `q < 64`;
  - flag `tile < 40 || tile > 48` when `tile` is not null;
  - flag `sentence < 28` when `sentence` is not null.

  On a phone, flag `q < 48`. Push `too small: question 40px (needs ≥ 64)` and so on.
- [ ] **Step 4: Probe frame times.** For the first lesson screen of each size in each lesson flow:

```ts
const p95 = await p.evaluate(() => new Promise<number>((done) => {
  const t: number[] = []; let last = performance.now(); let n = 0;
  const tick = (now: number) => { t.push(now - last); last = now; if (++n < 90) requestAnimationFrame(tick); else { t.sort((a, b) => a - b); done(t[Math.floor(t.length * 0.95)]!); } };
  requestAnimationFrame(tick);
}));
if (p95 > 20) problems.push(`slow frames: p95 ${p95.toFixed(1)}ms over 90 frames`);
```

  Record `Ruling:` in the ledger: WebKit cannot throttle the CPU. A p95 frame interval of 20ms or less on the Mac is the proxy for spec §6's 8ms budget, and the parent confirms on the iPad at the end of the phase.
- [ ] **Step 5: Run the full sweep.** `npm run fit` (about 5 minutes). Expected: 0 problems. For any `stage moved`, `too small` or `slow frames` result, fix the CSS (or the activity markup) at its cause and re-run that flow with `FIT_ONLY`. Record each fix in the ledger.
- [ ] **Step 6: Run the full suite.** `npx vitest run` and `npx tsc --noEmit -p .`. Expected: all pass.
- [ ] **Step 7: Commit.** `git commit -am "test: the sweep checks the stage (one box per activity, sizes, frame time)"`

---

## Self-review notes

**Spec coverage (phase A row):**

| Spec item | Task |
|---|---|
| Stage + `FeedbackSheet` for every lesson activity | 1–8 |
| The 后院 redrawn with props | 9 |
| Hanzi and sentence sizing rules | 2–5, checked in 10 |
| Other worlds keep their art | 9 (only `SCENES.yard` changes) |
| §6 no live filters | 9's test |
| §6 frame time | 10 |
| §9 stage invariants | 10 |

Celebrations, Home and Truffle's rig are phases D and B. They are not in this plan.

**Interfaces:**
- `FeedbackSheet`'s props are BottomBar's props plus `actionIcon`.
- `Stage` uses the activities `flash`, `use`, `zibian`, `write`, `langdu`, `placement`, consistently through Tasks 3–8 and 10.
- `writingBoxFor` replaces `writingBoxSize`, which is only used in `WritingStep`.
