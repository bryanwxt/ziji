# Hanzi Buddy Bold & Flat Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the kid-facing app in the spec's "bold & flat" language, with three structural changes:
- a today's-path home screen
- a bottom feedback sheet in lessons
- a bottom tab bar

The fishing game is rebuilt for readability.

**Architecture:**
- **Reusable chrome:** two new presentational components, `BottomBar` (lesson actions and feedback) and `TabBar` (kid navigation).
- **Home:** a pure `pathNodes()` function plus a `TodayPath` component.
- **Activities:** each now returns its content plus a `BottomBar`, inside the existing `.screen` flex column. The bar is sticky at the bottom.
- **Stylesheet:** rewritten around flat surfaces and the "pressable" edge style. The dragon and scene blocks from the previous plan are carried over unchanged.

**Tech Stack:** As before, plus `lucide-preact` (ISC) icons.

**Spec:** `docs/superpowers/specs/2026-10-02-hanzi-buddy-design.md`, §5c. §5b still governs motion, the mascot and rewards.

## Global Constraints

- Project root: `/Users/bryantan/apps/ziji`, branch `build/v1`.
- All earlier Global Constraints still apply, including:
  - reduced motion
  - no `hue-rotate`
  - the confetti rule
  - commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **Colours** (from spec §5c):

  | Role | Fill | Edge | Soft |
  |---|---|---|---|
  | Green | `#2fbf71` | `#22995a` | `#e3f8ec` |
  | Blue | `#2f9bf2` | `#1f78c4` | `#e5f2fe` |
  | Orange | `#ff9b3d` | `#e07a17` | `#fff1e3` |
  | Gold | `#ffc845` | `#e0a51f` | `#fff6dc` |

  Page `#f7f8fa`, line `#e5e7eb`, ink `#2d3340`.
- **Pressable rule:**
  - at rest: 2px border plus `box-shadow: 0 5px 0 <edge>`
  - when pressed: `translateY(4px)`, shadow 1px
- **Icons:** every app control uses `lucide-preact`; emoji only appear as content.
- **Lesson actions:** these labels always appear in the `BottomBar`:
  - 我记住了！
  - 检查
  - 继续
  - 下一个字
  - 完成
  - 保存

## Review Focus

1. **Portrait iPad:**
   - The bottom bar stacks its message above a full-width button.
   - The path and tab bar fit at 768 wide.
   - Checked in Task 6.
2. **Long sessions on Home:**
   - The path scrolls, and the current node is scrolled into view on load.
   - Checked in Task 6. jsdom has no `scrollIntoView`, so the call is optional-chained.
3. **A parent switches off activities:**
   - The path shows only the enabled steps plus the chest.
   - Covered by the Task 2 unit test (`pathNodes` with 2 steps).
4. **Double tap on 继续:**
   - It advances only once. The parent handlers already have the `busy` guard (SessionScreen `once`).
   - Covered by Task 3's existing double-tap test.
5. **Today is done but the chest wasn't opened** (app closed mid-celebration):
   - The chest node is current.
   - Tapping it opens the session, which shows the celebration with the chest.
   - Covered by Task 2 unit and component tests.

---

### Task 1: (D1) Flat design system, BottomBar and TabBar

**Files:**
- Create: `src/ui/BottomBar.tsx`, `src/ui/TabBar.tsx`, `src/ui/bars.test.tsx`, `scripts/assemble-styles.py`
- Modify:
  - `src/styles.css`: rebuilt by the script
  - `src/main.tsx`: add Nunito 900
  - `src/ui/SpeakButton.tsx`
  - `src/ui/PinPad.tsx`
  - `package.json` (`lucide-preact`)

**Interfaces:**
- Produces:
  - `type BarTone = 'neutral' | 'good' | 'oops'`
  - `<BottomBar tone? title? detail? actionLabel onAction disabled? />`
  - `type Tab = 'home' | 'stickers' | 'wardrobe' | 'parent'`
  - `<TabBar active />`, which navigates with `useApp().go`
  - New CSS classes:
    - `.press`, `.btn--secondary`, `.btn--oops`, `.btn--block`, `.icon-btn`, `.card`, `.stat*`
    - `.bottombar*`, `.tabbar*`, `.lessonbar`, `.fishtile*`, `.whichpart__char`, `.mic-btn`
    - `.path*`, `.home__*`, `.done-card`, `.scene--band`

- [ ] **Step 1: Write the failing test** `src/ui/bars.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { BottomBar } from './BottomBar';
import { TabBar } from './TabBar';

describe('BottomBar', () => {
  it('shows just the action when neutral', () => {
    const onAction = vi.fn();
    const { container } = render(<BottomBar actionLabel="检查" onAction={onAction} />);
    expect(container.querySelector('.bottombar--neutral')).toBeTruthy();
    expect(container.querySelector('[role="status"]')).toBeNull();
    fireEvent.click(screen.getByText('检查'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
  it('does nothing while disabled', () => {
    const onAction = vi.fn();
    render(<BottomBar actionLabel="继续" onAction={onAction} disabled />);
    fireEvent.click(screen.getByText('继续'));
    expect(onAction).not.toHaveBeenCalled();
  });
  it('becomes a feedback sheet with a title and detail', () => {
    const { container } = render(<BottomBar tone="oops" title="没关系，再来！" detail={<span>正确答案：河</span>} actionLabel="继续" onAction={vi.fn()} />);
    expect(container.querySelector('.bottombar--oops')).toBeTruthy();
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    expect(screen.getByText('没关系，再来！')).toBeTruthy();
    expect(screen.getByText('正确答案：河')).toBeTruthy();
    expect(container.querySelector('.btn--oops')).toBeTruthy();
  });
});

describe('TabBar', () => {
  it('marks the active tab and navigates', async () => {
    const app = await makeAppData();
    renderWithApp(<TabBar active="home" />, app);
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByText('首页').closest('button')!.getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByText('贴纸'));
    expect(app.go).toHaveBeenCalledWith({ name: 'stickers' });
    fireEvent.click(screen.getByText('家长'));
    expect(app.go).toHaveBeenCalledWith({ name: 'parent' });
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/ui/bars.test.tsx`
Expected: FAIL, because `./BottomBar` and `./TabBar` can't be resolved.

- [ ] **Step 3: Implement the components**

Run: `npm install lucide-preact@^1`

`src/ui/BottomBar.tsx`:
```tsx
import { Check, Lightbulb } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { Label } from './Label';

export type BarTone = 'neutral' | 'good' | 'oops';

interface Props {
  tone?: BarTone;
  title?: string;
  detail?: ComponentChildren;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}

/** The lesson's single action spot; after an answer it becomes a coloured feedback sheet. */
export function BottomBar({ tone = 'neutral', title, detail, actionLabel, onAction, disabled = false }: Props) {
  return (
    <div class={`bottombar bottombar--${tone}`} role={tone === 'neutral' ? undefined : 'status'}>
      {tone === 'neutral' ? (
        <span class="spacer" />
      ) : (
        <div class="bottombar__msg">
          <span class="bottombar__badge" aria-hidden="true">
            {tone === 'good' ? <Check size={34} strokeWidth={3.5} /> : <Lightbulb size={30} strokeWidth={3} />}
          </span>
          <div>
            {title && <div class="bottombar__title"><Label zh={title} /></div>}
            {detail && <div class="bottombar__detail">{detail}</div>}
          </div>
        </div>
      )}
      <button type="button" class={`btn btn--big ${tone === 'oops' ? 'btn--oops' : 'btn--primary'}`} disabled={disabled} onClick={onAction}>
        <Label zh={actionLabel} />
      </button>
    </div>
  );
}
```

`src/ui/TabBar.tsx`:
```tsx
import { Home, Lock, Shirt, Sticker } from 'lucide-preact';
import { useApp, type Route } from '../app/AppContext';

export type Tab = 'home' | 'stickers' | 'wardrobe' | 'parent';

const TABS: { id: Tab; zh: string; Icon: typeof Home }[] = [
  { id: 'home', zh: '首页', Icon: Home },
  { id: 'stickers', zh: '贴纸', Icon: Sticker },
  { id: 'wardrobe', zh: '小龙', Icon: Shirt },
  { id: 'parent', zh: '家长', Icon: Lock },
];

export function TabBar({ active }: { active: Tab }) {
  const { go } = useApp();
  return (
    <nav class="tabbar" aria-label="主菜单">
      {TABS.map(({ id, zh, Icon }) => (
        <button
          key={id}
          type="button"
          class={`tabbar__item ${id === active ? 'is-active' : ''}`}
          aria-current={id === active ? 'page' : undefined}
          onClick={() => go({ name: id } as Route)}
        >
          <Icon size={30} strokeWidth={2.5} />
          <span>{zh}</span>
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Swap emoji controls for icons**

In `src/ui/SpeakButton.tsx`:
- Add `import { Volume2 } from 'lucide-preact';`.
- Replace the button's `🔊` content with:
```tsx
      <Volume2 size={big ? 60 : 30} strokeWidth={2.5} />
```

In `src/ui/PinPad.tsx`:
- Add `import { Delete } from 'lucide-preact';`.
- Inside the key `button`, render `{k === '⌫' ? <Delete size={30} strokeWidth={2.5} /> : k}` instead of `{k}`.

In `src/main.tsx`, add `import '@fontsource/nunito/900.css';` after the 800 import.

- [ ] **Step 5: Rebuild the stylesheet**

`scripts/assemble-styles.py` keeps the dragon and scene blocks from the current `src/styles.css` and wraps them in the new design:
```python
import pathlib, re
p = pathlib.Path('src/styles.css')
s = p.read_text()
dragon = s[s.index('.dragon__all, .dragon__sway'):s.index('/* Scenes */')]
scenes = s[s.index('/* Scenes */'):s.index('/* Session header & progress */')]
head = pathlib.Path('scripts/styles-head.css').read_text()
tail = pathlib.Path('scripts/styles-tail.css').read_text()
p.write_text(head + '\n/* Dragon */\n.dragon { display: block; overflow: visible; }\n' + dragon + scenes + tail)
print('assembled', len(p.read_text().splitlines()), 'lines')
```

Create `scripts/styles-head.css`:
```css
:root {
  --page: #f7f8fa;
  --surface: #ffffff;
  --ink: #2d3340;
  --ink-soft: #6b7280;
  --muted: #9ca3af;
  --line: #e5e7eb;
  --line-strong: #d1d5db;
  --green: #2fbf71;
  --green-edge: #22995a;
  --green-soft: #e3f8ec;
  --green-ink: #15803d;
  --blue: #2f9bf2;
  --blue-edge: #1f78c4;
  --blue-soft: #e5f2fe;
  --blue-ink: #1d4ed8;
  --orange: #ff9b3d;
  --orange-edge: #e07a17;
  --orange-soft: #fff1e3;
  --orange-ink: #c2410c;
  --gold: #ffc845;
  --gold-edge: #e0a51f;
  --gold-soft: #fff6dc;
  --radius-sm: 14px;
  --radius: 18px;
  --radius-lg: 24px;
  --edge: 5px;
  --font: 'Nunito', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', sans-serif;
  --hanzi: 'WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', 'PingFang SC', serif;
  --dur-fast: 120ms;
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
  background: var(--page); color: var(--ink); font-family: var(--font); font-size: 20px; font-weight: 700;
  -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-weight: 900; }
input, textarea, select { font: inherit; font-weight: 600; user-select: text; -webkit-user-select: text; }
button { font: inherit; color: inherit; cursor: pointer; touch-action: manipulation; }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid var(--blue); outline-offset: 3px; }
#app { min-height: 100%; }

.screen {
  --pad-x: max(20px, env(safe-area-inset-left), env(safe-area-inset-right));
  --pad-b: max(16px, env(safe-area-inset-bottom));
  position: relative; z-index: 1; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; gap: 16px;
  padding: max(16px, env(safe-area-inset-top)) var(--pad-x) var(--pad-b);
}
.loading { align-items: center; justify-content: center; font-size: 80px; }
.topbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.spacer { flex: 1; }
.center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; }
.row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; align-items: center; }
.warning { background: var(--gold-soft); border: 2px solid #ffe6a3; border-radius: var(--radius-sm); padding: 12px 16px; margin: 0; }
.card { background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius-lg); box-shadow: 0 var(--edge) 0 var(--line); }
.chip {
  display: inline-flex; align-items: center; gap: 6px; background: var(--surface); border: 2px solid var(--line);
  border-radius: 999px; padding: 6px 16px; font-weight: 900;
}
.chip.is-bumping { animation: bump var(--dur-slow) var(--spring-bouncy); }
@keyframes bump { 30% { transform: scale(1.25); } }
.stat {
  display: inline-flex; align-items: center; gap: 6px; font-weight: 900; font-size: 22px; padding: 6px 16px 6px 12px;
  border-radius: 999px; background: var(--surface); border: 2px solid var(--line);
}
.stat--fire { color: var(--orange-edge); }
.stat--star { color: var(--gold-edge); }

/* Pressables */
.press {
  background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius); box-shadow: 0 var(--edge) 0 var(--line);
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-base), border-color var(--dur-base), opacity var(--dur-base);
}
.press:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 1px 0 var(--line); }
.btn {
  min-height: 60px; min-width: 60px; padding: 12px 28px; border-radius: var(--radius); font-weight: 900; font-size: 20px; letter-spacing: 0.02em;
  color: var(--ink); background: var(--surface); border: 2px solid var(--line); box-shadow: 0 var(--edge) 0 var(--line);
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 1px 0 var(--line); }
.btn--primary, .btn--good { background: var(--green); border-color: var(--green); color: #fff; box-shadow: 0 var(--edge) 0 var(--green-edge); }
.btn--primary:active:not(:disabled), .btn--good:active:not(:disabled) { box-shadow: 0 1px 0 var(--green-edge); }
.btn--secondary { background: var(--blue); border-color: var(--blue); color: #fff; box-shadow: 0 var(--edge) 0 var(--blue-edge); }
.btn--secondary:active:not(:disabled) { box-shadow: 0 1px 0 var(--blue-edge); }
.btn--oops { background: var(--orange); border-color: var(--orange); color: #fff; box-shadow: 0 var(--edge) 0 var(--orange-edge); }
.btn--oops:active:not(:disabled) { box-shadow: 0 1px 0 var(--orange-edge); }
.btn--ghost { background: transparent; border-color: transparent; box-shadow: none; color: var(--blue); }
.btn:disabled { background: var(--line); border-color: var(--line); color: var(--muted); box-shadow: 0 var(--edge) 0 var(--line-strong); cursor: default; }
.btn--big { min-height: 70px; font-size: 26px; padding: 14px 40px; }
.btn--block { width: 100%; }
.link { background: none; border: none; color: var(--blue); font-weight: 800; min-height: 44px; }
.small-btn { min-height: 44px; padding: 6px 14px; border-radius: 12px; border: 2px solid var(--line); background: #fff; font-weight: 800; box-shadow: 0 3px 0 var(--line); }
.icon-btn {
  width: 56px; height: 56px; border-radius: 16px; border: none; background: transparent; color: var(--muted);
  display: inline-flex; align-items: center; justify-content: center; transition: transform var(--dur-fast) var(--ease-out);
}
.icon-btn:active { transform: scale(0.92); }

/* Text */
.label { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.15; }
.label__py { font-size: 0.55em; font-weight: 800; opacity: 0.7; letter-spacing: 0.01em; }
.hanzi { font-family: var(--hanzi); font-weight: 400; }
.hanzi--xl { font-family: var(--hanzi); font-size: 150px; line-height: 1.05; font-weight: 400; }
.pinyin { color: var(--ink-soft); font-size: 24px; font-weight: 800; }
.meaning { color: var(--ink-soft); font-size: 18px; font-weight: 600; }
.speak {
  width: 64px; height: 64px; flex: none; border-radius: 50%; border: none; background: var(--blue-soft); color: var(--blue);
  display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 0 #bfdcfb;
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast);
}
.speak:active { transform: translateY(3px); box-shadow: 0 1px 0 #bfdcfb; }
.speak--big { width: 136px; height: 136px; background: var(--blue); color: #fff; box-shadow: 0 8px 0 var(--blue-edge); }
.speak--big:active { transform: translateY(6px); box-shadow: 0 2px 0 var(--blue-edge); }

/* Pet */
.pet { position: relative; display: inline-flex; flex-direction: column; align-items: center; line-height: 1; }
.pet-button { background: none; border: none; padding: 0; transition: transform var(--dur-fast) var(--ease-out); }
.pet-button:active { transform: scale(0.96); }
.pet__bubble {
  position: relative; background: #fff; border: 2px solid var(--line); border-radius: 16px; padding: 8px 16px; font-size: 20px; font-weight: 900;
  margin-bottom: 12px; white-space: nowrap; transform-origin: 50% 100%; animation: bubble-in var(--dur-slow) var(--spring-bouncy) backwards;
}
.pet__bubble::after {
  content: ''; position: absolute; bottom: -9px; left: 50%; width: 14px; height: 14px; background: #fff;
  border-right: 2px solid var(--line); border-bottom: 2px solid var(--line); transform: translateX(-50%) rotate(45deg);
}
@keyframes bubble-in { from { transform: scale(0.5) translateY(10px); opacity: 0; } }
```

Create `scripts/styles-tail.css`:
```css
.scene--band { position: absolute; inset: 0 0 auto 0; height: 280px; background: linear-gradient(180deg, #bfe3ff 0%, #e6f3ff 60%, var(--page) 100%); }

/* Lesson bar & progress */
.lessonbar { display: flex; align-items: center; gap: 14px; }
.progressbar { position: relative; flex: 1; height: 48px; display: flex; align-items: center; margin-right: 22px; }
.progressbar__track { width: 100%; height: 18px; border-radius: 999px; background: var(--line); overflow: hidden; }
.progressbar__fill { height: 100%; border-radius: 999px; background: var(--green); box-shadow: inset 0 5px 0 rgba(255, 255, 255, 0.3); transition: width var(--dur-slow) var(--spring); }
.progressbar__cp {
  position: absolute; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; background: #fff;
  border: 2px solid var(--line); display: flex; align-items: center; justify-content: center; font-size: 18px; filter: grayscale(1); opacity: 0.8;
}
.progressbar__cp.is-current { filter: none; opacity: 1; border-color: var(--green); }
.progressbar__cp.is-done { filter: none; opacity: 1; background: var(--gold-soft); border-color: var(--gold); animation: cp-pop var(--dur-slow) var(--spring-bouncy); }
@keyframes cp-pop { from { transform: scale(0.5); } }
.combo { display: inline-flex; align-items: center; gap: 4px; font-weight: 900; color: var(--orange-ink); background: var(--orange-soft); border: 2px solid #ffd7b0; border-radius: 999px; padding: 4px 12px; }
.combo-banner {
  position: fixed; top: 18%; left: 50%; z-index: 30; pointer-events: none; background: var(--orange); color: #fff; font-size: 38px; font-weight: 900;
  padding: 14px 32px; border-radius: 22px; box-shadow: 0 6px 0 var(--orange-edge); animation: banner 1.6s var(--ease-out) forwards;
}
@keyframes banner {
  0% { transform: translateX(-50%) scale(0.3); opacity: 0; }
  18% { transform: translateX(-50%) scale(1.08); opacity: 1; }
  28% { transform: translateX(-50%) scale(1); }
  85% { opacity: 1; }
  100% { transform: translateX(-50%) translateY(-20px); opacity: 0; }
}

/* Bottom bar and tab bar */
.bottombar, .tabbar {
  position: sticky; bottom: 0; z-index: 5; margin: auto calc(-1 * var(--pad-x)) calc(-1 * var(--pad-b));
  background: var(--surface); border-top: 2px solid var(--line);
}
.bottombar { display: flex; align-items: center; gap: 18px; padding: 18px var(--pad-x) max(18px, var(--pad-b)); }
.bottombar .btn { min-width: 240px; }
.bottombar--good, .bottombar--oops { border-top-color: transparent; animation: sheet-up var(--dur-slow) var(--spring); }
.bottombar--good { background: var(--green-soft); }
.bottombar--oops { background: var(--orange-soft); }
@keyframes sheet-up { from { transform: translateY(100%); } }
.bottombar__msg { flex: 1; display: flex; align-items: center; gap: 16px; }
.bottombar__badge { width: 58px; height: 58px; flex: none; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; }
.bottombar--good .bottombar__msg { color: var(--green-ink); }
.bottombar--oops .bottombar__msg { color: var(--orange-ink); }
.bottombar__title { font-size: 28px; font-weight: 900; }
.bottombar__detail { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; margin-top: 4px; }
.bottombar__detail .hanzi { font-size: 38px; }
.tabbar { display: flex; justify-content: space-around; gap: 8px; padding: 8px var(--pad-x) max(10px, var(--pad-b)); }
.tabbar__item {
  flex: 1; max-width: 170px; min-height: 66px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  border: 2px solid transparent; border-radius: 16px; background: none; color: var(--muted); font-weight: 900; font-size: 15px;
}
.tabbar__item.is-active { color: var(--blue); background: var(--blue-soft); border-color: #bfdcfb; }
@media (orientation: portrait) {
  .bottombar { flex-direction: column; align-items: stretch; }
  .bottombar .btn { width: 100%; }
}

/* Flashcards */
.flash { flex: 1; display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; align-items: center; }
.flash__pet { display: flex; justify-content: center; }
.flash__main { display: flex; flex-direction: column; align-items: center; gap: 22px; }
.flash__prompt { display: flex; justify-content: center; align-items: center; min-height: 168px; }
.choices { display: grid; grid-template-columns: repeat(2, minmax(150px, 1fr)); gap: 16px; width: 100%; max-width: 560px; }
.choice { position: relative; min-height: 112px; font-size: 30px; font-weight: 900; color: var(--ink); }
.choices--hanzi .choice { font-family: var(--hanzi); font-size: 70px; font-weight: 400; }
.choice:disabled { cursor: default; }
.choice.is-answer { background: var(--green-soft); border-color: var(--green); box-shadow: 0 var(--edge) 0 var(--green); color: var(--green-ink); }
.choice.is-wrong { background: var(--orange-soft); border-color: var(--orange); box-shadow: 0 var(--edge) 0 var(--orange); color: var(--orange-ink); animation: wobble 0.45s; }
.choice.is-dim { opacity: 0.4; }
.choice.is-eaten { pointer-events: none; z-index: 20; }
@keyframes wobble { 25% { transform: translateX(-7px) rotate(-2deg); } 75% { transform: translateX(7px) rotate(2deg); } }
.intro { display: flex; flex-direction: column; align-items: center; }
.intro__card {
  background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius-lg); box-shadow: 0 6px 0 var(--line);
  padding: 22px 44px; display: flex; flex-direction: column; align-items: center; gap: 8px; animation: rise-in var(--dur-slow) var(--spring) backwards;
}
.parts { font-size: 28px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; font-family: var(--hanzi); }
.part--radical { color: var(--blue); }
.example { font-size: 26px; display: flex; align-items: center; gap: 10px; }
@media (orientation: portrait) { .flash { grid-template-columns: 1fr; } }

/* Writing */
.write { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.write__head { gap: 24px; }
.write__prompt { display: flex; align-items: center; gap: 16px; font-size: 36px; }
.tianzige {
  background-color: #fffdf8; border: 3px solid var(--orange); border-radius: 16px; touch-action: none; box-shadow: 0 6px 0 var(--line);
  background-image:
    linear-gradient(to right, transparent calc(50% - 1px), rgba(255, 155, 61, 0.4) calc(50% - 1px), rgba(255, 155, 61, 0.4) calc(50% + 1px), transparent calc(50% + 1px)),
    linear-gradient(to bottom, transparent calc(50% - 1px), rgba(255, 155, 61, 0.4) calc(50% - 1px), rgba(255, 155, 61, 0.4) calc(50% + 1px), transparent calc(50% + 1px));
}
.dots { display: flex; gap: 8px; }
.dot { width: 16px; height: 16px; border-radius: 50%; background: var(--line); transition: background var(--dur-base); }
.dot.is-done { background: var(--green); animation: cp-pop var(--dur-slow) var(--spring-bouncy); }

/* Components: fishing */
.components { gap: 14px; }
.pond-q { font-size: 28px; font-weight: 900; display: flex; align-items: center; gap: 10px; justify-content: center; flex-wrap: wrap; }
.pond-q__part { font-size: 54px; color: var(--blue); }
.pond-q__meaning { background: var(--blue-soft); color: var(--blue-ink); border-radius: 999px; padding: 4px 14px; font-size: 22px; }
.pond { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: 100%; max-width: 760px; }
.fishtile {
  position: relative; min-height: 110px; background: #eef7ff; border-color: #cfe6fb; box-shadow: 0 var(--edge) 0 #cfe6fb;
  animation: rise-in var(--dur-slow) var(--spring) backwards, bob 3s ease-in-out infinite;
}
.fishtile__char { font-size: 58px; color: var(--ink); }
.fishtile__badge { position: absolute; right: 8px; bottom: 6px; font-size: 22px; }
.fishtile.is-caught { background: var(--blue); border-color: var(--blue); box-shadow: 0 var(--edge) 0 var(--blue-edge); animation: none; transform: translateY(-6px); }
.fishtile.is-caught .fishtile__char { color: #fff; }
.fishtile.is-right { background: var(--green-soft); border-color: var(--green); box-shadow: 0 var(--edge) 0 var(--green); animation: none; }
.fishtile.is-missed { animation: wobble 0.45s 2; }
.fishtile.is-oops { background: var(--orange-soft); border-color: var(--orange); box-shadow: 0 var(--edge) 0 var(--orange); animation: none; }
@keyframes bob { 50% { transform: translateY(-4px); } }
.whichpart__char { font-size: 140px; border: none; background: none; line-height: 1; padding: 0; }
.bubbles { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
.bubble-opt { width: 140px; height: 140px; border-radius: 50%; font-family: var(--hanzi); font-size: 66px; }
.bubble-opt.is-right { background: var(--green-soft); border-color: var(--green); box-shadow: 0 var(--edge) 0 var(--green); }
.bubble-opt.is-oops { background: var(--orange-soft); border-color: var(--orange); box-shadow: 0 var(--edge) 0 var(--orange); }

/* Speaking */
.speak-step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.speak-step img { max-width: min(90vw, 640px); max-height: 42vh; border-radius: var(--radius); border: 2px solid var(--line); }
.helpers { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.helper { background: var(--surface); border: 2px solid var(--line); border-radius: 999px; padding: 6px 16px; font-size: 22px; }
.passage { background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius-lg); padding: 22px 32px; font-family: var(--hanzi); font-size: 36px; line-height: 1.8; max-width: 780px; margin: 0; }
.passage__py { font-size: 18px; color: var(--ink-soft); margin: 0; max-width: 780px; }
.mic-btn {
  display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 190px; padding: 18px 28px; border: none; border-radius: 28px;
  background: var(--orange); color: #fff; box-shadow: 0 7px 0 var(--orange-edge); font-weight: 900; font-size: 22px;
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast);
}
.mic-btn:active { transform: translateY(5px); box-shadow: 0 2px 0 var(--orange-edge); }
.mic-btn.is-recording { background: var(--surface); color: var(--ink); border: 2px solid var(--line); box-shadow: 0 7px 0 var(--line); }
.rec-dot { width: 22px; height: 22px; border-radius: 50%; background: #ef4444; animation: pulse 1s infinite; display: inline-block; }
@keyframes pulse { 50% { opacity: 0.3; transform: scale(0.8); } }

/* Celebration */
.celebrate { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; text-align: center; }
.celebrate h1 { font-size: 56px; margin: 0; }
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
.home__who { display: flex; align-items: center; gap: 10px; font-size: 22px; }
.home__main { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.home__title { margin: 6px 0 0; font-size: 30px; }
.goal { display: flex; align-items: center; gap: 16px; padding: 12px 22px; width: min(92vw, 520px); background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius-lg); box-shadow: 0 var(--edge) 0 var(--line); }
.goal--reached { background: var(--green-soft); border-color: var(--green); box-shadow: 0 var(--edge) 0 var(--green); }
.goal__emoji { font-size: 46px; }
.goal__body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.progress { height: 14px; border-radius: 999px; background: var(--line); overflow: hidden; }
.progress__fill { height: 100%; background: var(--green); border-radius: 999px; box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.3); transition: width var(--dur-slow) var(--spring); }
.done-card { display: flex; align-items: center; gap: 18px; padding: 12px 22px; }
.done-today { font-size: 28px; font-weight: 900; margin: 0; }

/* Today's path */
.path { list-style: none; margin: 0 auto; padding: 56px 0 24px; width: 100%; max-width: 520px; display: flex; flex-direction: column; align-items: center; gap: 26px; position: relative; }
.path::before { content: ''; position: absolute; top: 90px; bottom: 70px; left: 50%; border-left: 6px dotted var(--line-strong); transform: translateX(-50%); }
.path__row { position: relative; display: flex; flex-direction: column; align-items: center; transform: translateX(var(--x, 0px)); }
.path__node {
  position: relative; width: 88px; height: 82px; border-radius: 50%; border: none; font-size: 40px; color: #fff;
  display: flex; align-items: center; justify-content: center; background: var(--line); box-shadow: 0 7px 0 var(--line-strong);
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast);
}
.path__node--done { background: var(--gold); box-shadow: 0 7px 0 var(--gold-edge); }
.path__node--current {
  width: 104px; height: 96px; background: var(--green); box-shadow: 0 8px 0 var(--green-edge), 0 0 0 10px rgba(47, 191, 113, 0.18);
  animation: node-bounce 1.8s ease-in-out infinite;
}
.path__node--current:active { animation: none; transform: translateY(6px); box-shadow: 0 2px 0 var(--green-edge), 0 0 0 10px rgba(47, 191, 113, 0.18); }
.path__node--upcoming .path__icon { filter: grayscale(1); opacity: 0.55; }
.path__node--upcoming:active, .path__node--done:active { animation: wobble 0.4s; }
@keyframes node-bounce { 50% { transform: translateY(-6px); } }
.path__name { margin-top: 12px; font-weight: 900; color: var(--ink-soft); font-size: 18px; }
.path__bubble {
  position: absolute; top: -50px; z-index: 2; background: #fff; border: 2px solid var(--line); border-radius: 14px; padding: 4px 14px;
  color: var(--green-ink); font-weight: 900; font-size: 20px; white-space: nowrap; animation: node-bounce 1.8s ease-in-out infinite;
}
.path__pet { position: absolute; left: calc(50% + 74px); top: -54px; }

/* Sticker book & wardrobe */
.book { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.family { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px; min-height: 150px; }
.family__icon { font-size: 40px; }
.family__name { font-size: 30px; font-family: var(--hanzi); }
.sticker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 16px; }
.sticker {
  aspect-ratio: 1; border-radius: 22px; border: 3px solid #fff; background: var(--gold); box-shadow: 0 0 0 2px var(--gold-edge), 0 6px 0 var(--gold-edge);
  font-family: var(--hanzi); font-size: 54px; transform: rotate(var(--tilt, 0deg)); display: flex; align-items: center; justify-content: center; color: var(--ink);
}
.sticker--unknown { background: var(--surface); color: var(--muted); border: 3px dashed var(--line-strong); box-shadow: none; }
.badges { display: flex; gap: 12px; flex-wrap: wrap; }
.badge { background: var(--gold); border-radius: 999px; padding: 6px 16px; font-weight: 900; box-shadow: 0 4px 0 var(--gold-edge); color: var(--ink); }
.wardrobe { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 16px; width: 100%; max-width: 720px; }
.wardrobe button { min-height: 96px; font-size: 48px; border-radius: var(--radius); border: 2px solid var(--line); background: var(--surface); box-shadow: 0 var(--edge) 0 var(--line); }
.wardrobe button.is-on { border-color: var(--blue); background: var(--blue-soft); box-shadow: 0 var(--edge) 0 var(--blue); }

/* Setup */
.setup { flex: 1; display: grid; grid-template-columns: 1fr 1.1fr; gap: 28px; align-items: center; }
.setup__pet { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.setup__form { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 14px; background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius-lg); box-shadow: 0 var(--edge) 0 var(--line); }
.setup__form p { margin: 0; }
@media (orientation: portrait) { .setup { grid-template-columns: 1fr; } }
.swatch { width: 84px; height: 84px; border-radius: var(--radius); border: 2px solid var(--line); background: #fff; box-shadow: 0 var(--edge) 0 var(--line); display: flex; align-items: center; justify-content: center; padding: 4px; }
.swatch.is-on { border-color: var(--blue); background: var(--blue-soft); box-shadow: 0 var(--edge) 0 var(--blue); }
.name-input { font-size: 34px; text-align: center; padding: 10px 20px; border-radius: var(--radius); border: 2px solid var(--line); width: min(80vw, 300px); background: var(--page); font-weight: 800; }

/* PIN pad */
.pinpad { display: grid; grid-template-columns: repeat(3, 80px); gap: 14px; justify-content: center; }
.pinpad button { height: 76px; border-radius: 20px; border: 2px solid var(--line); background: #fff; box-shadow: 0 var(--edge) 0 var(--line); font-size: 32px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.pinpad button:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--line); }
.pin-dots { display: flex; gap: 16px; justify-content: center; }
.pin-dots span { width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--line-strong); transition: background var(--dur-fast); }
.pin-dots span.is-filled { background: var(--blue); border-color: var(--blue); animation: pop-in var(--dur-base) var(--spring-bouncy); }
.pin-error { color: var(--orange-ink); margin: 0; }
@keyframes pop-in { from { transform: scale(0.4); opacity: 0; } }

/* Parent area */
.parent { font-size: 17px; font-weight: 600; }
.tabs { display: flex; gap: 4px; background: var(--line); padding: 4px; border-radius: 16px; overflow-x: auto; }
.tab { display: inline-flex; align-items: center; gap: 6px; border: none; background: none; padding: 10px 14px; border-radius: 12px; min-height: 44px; white-space: nowrap; font-weight: 800; color: var(--ink-soft); }
.tab.is-active { background: #fff; color: var(--ink); box-shadow: 0 2px 0 var(--line-strong); }
.parent__body { display: flex; flex-direction: column; gap: 16px; max-width: 980px; width: 100%; margin: 0 auto; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.tile, .panel { background: #fff; border: 2px solid var(--line); border-radius: var(--radius); padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.tile__value { font-size: 32px; font-weight: 900; }
.tile__label { color: var(--ink-soft); font-size: 15px; }
.panel h2 { margin: 0; font-size: 20px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field input, .field textarea, .field select { padding: 10px 12px; border: 2px solid var(--line); border-radius: 12px; background: #fff; }
.table { width: 100%; border-collapse: collapse; font-size: 16px; }
.table th, .table td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.thumbs img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 12px; }

/* Chart (single series: one hue, no legend, hover tooltip, table view) */
.chart { margin: 0; display: flex; flex-direction: column; gap: 8px; }
.chart figcaption { font-weight: 900; }
.chart__plot { position: relative; height: 140px; border-bottom: 1px solid var(--muted); padding-top: 18px; }
.chart__max { position: absolute; top: 0; left: 0; font-size: 12px; color: var(--ink-soft); }
.chart__bars { display: flex; align-items: flex-end; gap: 2px; height: 100%; }
.chart__col { flex: 1; height: 100%; display: flex; align-items: flex-end; position: relative; }
.chart__bar { width: 100%; background: var(--blue); border-radius: 4px 4px 0 0; }
.chart__col:hover .chart__bar { background: var(--blue-edge); }
.chart__col:hover::after {
  content: attr(data-tip); position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); z-index: 2;
  background: var(--ink); color: #fff; font-size: 12px; padding: 4px 8px; border-radius: 6px; white-space: nowrap;
}
.chart__axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-soft); }

/* Particles & entrances */
.particles { position: fixed; width: 0; height: 0; pointer-events: none; z-index: 60; }
.particle {
  position: absolute; left: 0; top: 0; width: 1em; height: 1em; margin: -0.5em 0 0 -0.5em; text-align: center; line-height: 1;
  font-size: 20px; color: var(--gold); text-shadow: 0 0 8px rgba(255, 200, 69, 0.8);
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

Run: `python3 scripts/assemble-styles.py`
Expected: `assembled N lines`, where N is about 520. The file contains `/* Dragon */`, `/* Scenes */` and `/* Today's path */`.

- [ ] **Step 6: Run the tests and the build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: everything passes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: bold & flat design system, BottomBar and TabBar, icon controls

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: (D2) Today's path home, scene band, tab bar on kid screens

**Files:**
- Create: `src/fun/path.ts`, `src/fun/path.test.ts`, `src/app/TodayPath.tsx`
- Modify:
  - `src/app/HomeScreen.tsx` (replace entirely)
  - `src/ui/Scene.tsx` (`band` prop)
  - `src/app/StickerBook.tsx`, `src/app/Wardrobe.tsx` (tab bar)
  - `src/app/home.test.tsx`, `src/App.test.tsx` (updated expectations)

**Interfaces:**
- Produces:
  - `type PathKind = StepKind | 'chest'`
  - `type NodeState = 'done' | 'current' | 'upcoming'`
  - `pathNodes(steps, completedSteps, chestOpened, todayCompleted): PathNode[]`, where `PathNode = { kind: PathKind; state: NodeState }`
  - `<TodayPath nodes started onStart pet />`
  - `<Scene kind band? />`

- [ ] **Step 1: Write the failing tests**

`src/fun/path.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { pathNodes } from './path';

const ALL = ['flashcards', 'writing', 'components', 'speaking'] as const;
const states = (n: ReturnType<typeof pathNodes>) => n.map((x) => `${x.kind}:${x.state}`);

describe('pathNodes', () => {
  it('starts at the first step, chest last', () => {
    expect(states(pathNodes([...ALL], [], false, false))).toEqual([
      'flashcards:current', 'writing:upcoming', 'components:upcoming', 'speaking:upcoming', 'chest:upcoming',
    ]);
  });
  it('moves the current node past finished steps', () => {
    expect(states(pathNodes([...ALL], ['flashcards'], false, false))[1]).toBe('writing:current');
  });
  it('makes the chest current when the day is done but it is still closed', () => {
    expect(states(pathNodes([...ALL], [...ALL], false, true))).toEqual([
      'flashcards:done', 'writing:done', 'components:done', 'speaking:done', 'chest:current',
    ]);
  });
  it('is all done once the chest is opened', () => {
    expect(pathNodes([...ALL], [...ALL], true, true).every((n) => n.state === 'done')).toBe(true);
  });
  it('only shows switched-on steps', () => {
    expect(states(pathNodes(['flashcards', 'speaking'], [], false, false))).toEqual(['flashcards:current', 'speaking:upcoming', 'chest:upcoming']);
  });
});
```

Replace the `HomeScreen` describe block in `src/app/home.test.tsx` (the first two `it`s) with:
```tsx
describe('HomeScreen', () => {
  it("shows streak and stars and starts today's path", async () => {
    const app = await makeAppData();
    await saveSession(app.db, done('2026-10-01', ['flashcards', 'writing']));
    renderWithApp(<HomeScreen />, app);
    expect(await screen.findByLabelText('连续 1 天')).toBeTruthy();
    expect(screen.getByLabelText('2 颗星')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '开始：喂小龙' }));
    expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false });
  });

  it('offers free play once today is done and shows the next reward goal', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, lastChestDate: '2026-10-02' } });
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

  it('reopens the session to claim an unopened chest', async () => {
    const app = await makeAppData();
    await saveSession(app.db, done('2026-10-02', ['flashcards']));
    renderWithApp(<HomeScreen />, app);
    fireEvent.click(await screen.findByRole('button', { name: '继续：宝箱' }));
    expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false });
  });
});
```

In `src/App.test.tsx`, change `expect(screen.getByText('我认识 0 个字')).toBeTruthy();` to `expect(screen.getByText('认识 0 个字')).toBeTruthy();`.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/fun/path.test.ts src/app/home.test.tsx src/App.test.tsx`
Expected:
- FAIL: `./path` is missing
- the home tests fail on the missing labels
- the App test fails on `认识 0 个字`

- [ ] **Step 3: Implement**

`src/fun/path.ts`:
```ts
import type { StepKind } from '../types';

export type PathKind = StepKind | 'chest';
export type NodeState = 'done' | 'current' | 'upcoming';

export interface PathNode {
  kind: PathKind;
  state: NodeState;
}

/** Today's path: one node per planned step, then the chest. Exactly one node is current until all are done. */
export function pathNodes(steps: StepKind[], completedSteps: StepKind[], chestOpened: boolean, todayCompleted: boolean): PathNode[] {
  const done = new Set(completedSteps);
  const nodes: PathNode[] = steps.map((kind) => ({ kind, state: done.has(kind) || todayCompleted ? 'done' : 'upcoming' }));
  nodes.push({ kind: 'chest', state: chestOpened ? 'done' : 'upcoming' });
  const current = todayCompleted ? (chestOpened ? undefined : nodes[nodes.length - 1]) : nodes.find((n) => n.kind !== 'chest' && n.state === 'upcoming');
  if (current) current.state = 'current';
  return nodes;
}
```

`src/app/TodayPath.tsx`:
```tsx
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { PathKind, PathNode } from '../fun/path';
import { Label } from '../ui/Label';

const ICON: Record<PathKind, string> = { flashcards: '🐲', writing: '✍️', components: '🎣', speaking: '🎤', chest: '🎁' };
const NAME: Record<PathKind, string> = { flashcards: '喂小龙', writing: '写一写', components: '钓鱼', speaking: '说一说', chest: '宝箱' };

interface Props {
  nodes: PathNode[];
  started: boolean;
  onStart: () => void;
  pet: ComponentChildren;
}

export function TodayPath({ nodes, started, onStart, pet }: Props) {
  const ref = useRef<HTMLOListElement>(null);
  const currentIndex = nodes.findIndex((n) => n.state === 'current');
  const verb = started ? '继续' : '开始';

  useEffect(() => {
    (ref.current?.querySelector('[aria-current="step"]') as HTMLElement | null)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, []);

  return (
    <ol class="path" ref={ref} aria-label="今天的练习">
      {nodes.map((n, i) => {
        const isCurrent = n.state === 'current';
        const icon = n.state === 'done' ? (n.kind === 'chest' ? '🎉' : <Check size={38} strokeWidth={3.5} />) : ICON[n.kind];
        return (
          <li key={n.kind} class="path__row" style={`--x:${Math.round(Math.sin(i * 1.15) * 80)}px`}>
            {isCurrent && <div class="path__bubble"><Label zh={verb} /></div>}
            <button
              type="button"
              class={`path__node path__node--${n.state}`}
              aria-label={isCurrent ? `${verb}：${NAME[n.kind]}` : NAME[n.kind]}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={isCurrent ? onStart : undefined}
            >
              <span class="path__icon">{icon}</span>
            </button>
            <span class="path__name"><Label zh={NAME[n.kind]} /></span>
            {i === Math.max(0, currentIndex) && <div class="path__pet">{pet}</div>}
          </li>
        );
      })}
    </ol>
  );
}
```

In `src/ui/Scene.tsx`:
- Change the signature to `export function Scene({ kind, band = false }: { kind: SceneKind; band?: boolean })`.
- Change the root class to ``class={`scene scene--${kind}${band ? ' scene--band' : ''}`}``.
- Render the hills only when `kind === 'home' && !band`.

`src/app/HomeScreen.tsx`:
```tsx
import { Flame, Star } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { primeSpeech } from '../audio/speech';
import { pathNodes } from '../fun/path';
import { goalProgress, nextGoal } from '../fun/rewards';
import { localDateKey } from '../lib/date';
import { STEP_ORDER } from '../session/plan';
import { streak, totalStars } from '../stats/stats';
import { allSessions, listRewards } from '../store/repo';
import { DEFAULT_KID, type RewardGoal, type SessionRecord } from '../types';
import { celebrate } from '../ui/confetti';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { Scene } from '../ui/Scene';
import { TabBar } from '../ui/TabBar';
import { useApp } from './AppContext';
import { loadKnowledge, type Knowledge } from './knowledge';
import { TodayPath } from './TodayPath';

interface HomeData {
  know: Knowledge;
  sessions: SessionRecord[];
  goals: RewardGoal[];
}

const SLEEP_AFTER_MS = 20_000;

export function HomeScreen({ sleepAfterMs = SLEEP_AFTER_MS }: { sleepAfterMs?: number }) {
  const { db, now, go, kid, settings } = useApp();
  const [data, setData] = useState<HomeData | null>(null);
  const [sleepy, setSleepy] = useState(false);

  useEffect(() => {
    void Promise.all([loadKnowledge(db), allSessions(db), listRewards(db)]).then(([know, sessions, goals]) => setData({ know, sessions, goals }));
  }, []);

  // The dragon dozes off when nobody is around; any tap wakes it.
  useEffect(() => {
    let timer = setTimeout(() => setSleepy(true), sleepAfterMs);
    const wake = () => {
      setSleepy(false);
      clearTimeout(timer);
      timer = setTimeout(() => setSleepy(true), sleepAfterMs);
    };
    window.addEventListener('pointerdown', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', wake);
    };
  }, [sleepAfterMs]);

  const k = kid ?? DEFAULT_KID;
  const stars = data ? totalStars(data.sessions, k.bonusStars) : 0;
  const goal = data ? nextGoal(data.goals) : null;
  const progress = goal && data ? goalProgress(goal, { stars, known: data.know.known }) : null;
  useEffect(() => {
    if (progress?.reached) celebrate();
  }, [progress?.reached]);

  if (!data) return <div class="screen loading">🥚</div>;

  const today = localDateKey(now());
  const todaySession = data.sessions.find((s) => s.date === today && !s.free);
  const doneToday = !!todaySession?.completed;
  const chestOpened = k.lastChestDate === today;
  const steps = todaySession?.plan.steps ?? STEP_ORDER.filter((s) => settings.activities[s]);
  const nodes = pathNodes(steps, todaySession?.completedSteps ?? [], chestOpened, doneToday);
  const hasCards = data.know.cards.some((c) => c.kind === 'recognise');
  const days = streak(data.sessions, today);
  const play = (free: boolean) => {
    primeSpeech();
    go({ name: 'session', free });
  };

  return (
    <div class="screen home">
      <Scene kind="home" band />
      <header class="topbar">
        <span class="stat stat--fire" aria-label={`连续 ${days} 天`}><Flame size={24} strokeWidth={2.75} /> {days}</span>
        <span class="stat stat--star" aria-label={`${stars} 颗星`}><Star size={24} strokeWidth={2.75} /> {stars}</span>
        <span class="spacer" />
        <span class="home__who">
          <strong>{k.petName}</strong>
          <Label zh={`认识 ${data.know.known} 个字`} />
        </span>
      </header>
      <main class="home__main">
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
        {doneToday && chestOpened && (
          <div class="card done-card">
            <p class="done-today"><Label zh="今天完成了！" /> 🎉</p>
            {hasCards && (
              <button type="button" class="btn btn--secondary" onClick={() => play(true)}><Label zh="再玩一会儿" /></button>
            )}
          </div>
        )}
        <h2 class="home__title"><Label zh="今天的练习" /></h2>
        <TodayPath
          nodes={nodes}
          started={!!todaySession}
          onStart={() => play(false)}
          pet={
            <button type="button" class="pet-button" aria-label="换装" onClick={() => go({ name: 'wardrobe' })}>
              <Pet kid={k} known={data.know.known} mood={sleepy ? 'sleepy' : 'happy'} size={150} />
            </button>
          }
        />
      </main>
      <TabBar active="home" />
    </div>
  );
}
```

In `src/app/StickerBook.tsx`:
- Add `import { ChevronLeft } from 'lucide-preact';` and `import { TabBar } from '../ui/TabBar';`.
- Delete the `back` constant.
- Replace the header's back button with:
```tsx
        {open && (
          <button type="button" class="icon-btn" aria-label="返回" onClick={() => setOpen(null)}>
            <ChevronLeft size={34} strokeWidth={3} />
          </button>
        )}
```
- Add `<TabBar active="stickers" />` as the last child of the outer `.screen`.

In `src/app/Wardrobe.tsx`:
- Add `import { TabBar } from '../ui/TabBar';`.
- Delete the `<header class="topbar">…</header>` element.
- Add `<TabBar active="wardrobe" />` as the last child of the outer `.screen`.

- [ ] **Step 4: Run all tests**

Run: `npm test && npx tsc --noEmit`
Expected: all pass, including the existing sticker, wardrobe, sleepy and App flow tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: today's path home screen with tab bar and sky band

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: (D3) Lesson bar and flashcard feedback sheet

**Files:**
- Modify:
  - `src/app/SessionScreen.tsx`: lesson bar, no scene
  - `src/activities/flashcards/FlashcardStep.tsx` (replace the component's return and its intro)
  - `src/activities/flashcards/FlashcardStep.test.tsx`, `src/app/SessionScreen.test.tsx` (updated expectations)

**Interfaces:**
- Consumes: `BottomBar` (Task 1).
- Produces:
  - `FlashcardStep` renders `.flash` plus one `BottomBar`:
    - intro: 我记住了！
    - quiz: 继续, disabled
    - feedback: a good or oops sheet with 继续
  - The same `FlashResult` contract as before.

- [ ] **Step 1: Update the tests first**

In `src/activities/flashcards/FlashcardStep.test.tsx`:
- Replace every `screen.getByText('下一个')` with `screen.getByText('继续')`.
- In `'a wrong answer reveals the right one'`, replace `document.querySelector('.answer-reveal')` with `document.querySelector('.bottombar__detail')`.
- Append:
```tsx
describe('feedback sheet', () => {
  it('slides up green with a cheer when right, orange with the answer when wrong', () => {
    const { unmount } = render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.bottombar--neutral button')!.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(document.querySelector('.bottombar--good')).toBeTruthy();
    unmount();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    expect(document.querySelector('.bottombar--oops')!.textContent).toContain('正确答案');
  });
});
```

In `src/app/SessionScreen.test.tsx`, inside `learnCurrentWord`, replace `screen.getByText('下一个')` with `screen.getByText('继续')`.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/activities/flashcards src/app/SessionScreen.test.tsx`
Expected: FAIL. There's no 继续 button and no `.bottombar`.

- [ ] **Step 3: Implement**

In `src/activities/flashcards/FlashcardStep.tsx`:
- Add `import { BottomBar } from '../../ui/BottomBar';`.
- Remove the `Label` import if it's no longer used.
- Replace the `bubble` definition with:
```tsx
  const bubble = phase === 'intro' ? '新字来了！' : phase === 'quiz' ? (quiz.listen ? '我想吃这个字！' : '这个字怎么读？') : null;
  const next = () => {
    if (result) onDone({ ...result, elapsedMs: Math.round(performance.now() - shownAt.current) });
  };
```
- Replace the entire `return (...)` of `FlashcardStep` with:
```tsx
  return (
    <>
      <div class="flash">
        <div class="flash__pet" ref={petRef}>
          <Pet kid={kid} known={known} mood={mood} bubble={bubble} size={180} lookAt={phase === 'quiz' ? 0.8 : 0} />
        </div>
        <div class="flash__main">
          {phase === 'intro' ? (
            <Intro word={word} />
          ) : (
            <>
              <div class="flash__prompt">
                {quiz.listen ? <SpeakButton text={word.text} big /> : <div class="hanzi hanzi--xl">{word.text}</div>}
              </div>
              <div class={`choices stagger ${quiz.listen ? 'choices--hanzi' : 'choices--pinyin'}`}>
                {quiz.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    class={`choice press ${optionState(o)}`}
                    disabled={phase === 'feedback'}
                    onClick={() => choose(o)}
                    ref={(el) => {
                      if (el) optionRefs.current.set(o, el);
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {phase === 'intro' && <BottomBar actionLabel="我记住了！" onAction={() => setPhase('quiz')} />}
      {phase === 'quiz' && <BottomBar actionLabel="继续" disabled onAction={() => {}} />}
      {phase === 'feedback' && result && (
        <BottomBar
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? quiz.cheer : quiz.comfort}
          detail={
            result.correct ? undefined : (
              <>
                正确答案：<span class="hanzi">{word.text}</span>
                <span>{word.pinyin}</span>
                <SpeakButton text={word.text} />
              </>
            )
          }
          actionLabel="继续"
          onAction={next}
        />
      )}
    </>
  );
```
- In `Intro`, change the signature to `function Intro({ word }: { word: Word })`. Replace its outer wrapper with `<div class="intro">` containing only the existing `.intro__card`; delete the 我记住了！ button.

In `src/app/SessionScreen.tsx`:
- Remove the `Scene`/`SceneKind` import and the `SCENES` constant.
- Add `import { Flame, X } from 'lucide-preact';`.
- Replace the `<Scene …/>` line and the `<header class="stepbar">…</header>` block with:
```tsx
      <header class="lessonbar">
        <button type="button" class="icon-btn" aria-label="回家" onClick={() => go({ name: 'home' })}>
          <X size={34} strokeWidth={3} />
        </button>
        <ProgressBar steps={rec.plan.steps} stepIndex={rec.stepIndex} fraction={sessionProgress(rec)} />
        {combo >= 3 && <span class="combo"><Flame size={20} strokeWidth={2.75} /> {combo}</span>}
      </header>
```

- [ ] **Step 4: Run all tests**

Run: `npm test && npx tsc --noEmit`
Expected: all pass, including the double-tap test (one `onDone`) and the session flow tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: lesson bar and bottom feedback sheet for flashcards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: (D4) Fishing tiles, writing and speaking on the bottom bar

**Files:**
- Modify:
  - `src/activities/components/ComponentsStep.tsx` (replace entirely)
  - `src/activities/writing/WritingStep.tsx` (replace the return)
  - `src/activities/speaking/SpeakingStep.tsx` (replace the return, plus icons)
- Test: `src/activities/components/ComponentsStep.test.tsx` (updated labels)

**Interfaces:**
- Consumes: `BottomBar` (Task 1).
- Unchanged: the props of all three steps.

- [ ] **Step 1: Update the tests first**

In `src/activities/components/ComponentsStep.test.tsx`, in `'runs a fishing question, then a which-part question, then finishes'`:
- replace `screen.getByText('下一题')` with `screen.getByText('继续')`
- replace `screen.getByText('完成')` with `screen.getByText('继续')`

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/activities/components/ComponentsStep.test.tsx`
Expected: FAIL. `继续` isn't found after 检查.

- [ ] **Step 3: Implement**

`src/activities/components/ComponentsStep.tsx`:
```tsx
import { useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { radicalMeaning } from '../../content/radicals';
import type { KidState } from '../../types';
import { BottomBar } from '../../ui/BottomBar';
import { Label } from '../../ui/Label';
import { burst } from '../../ui/motion';
import { Pet } from '../../ui/Pet';
import type { ComponentQuestion } from './game';

const splash = (el: Element | null | undefined, count = 8) => {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, { count, glyphs: ['💧', '✦', '•'] });
};

interface Props {
  questions: ComponentQuestion[];
  kid: KidState;
  known: number;
  onDone: () => void;
}

export function ComponentsStep({ questions, kid, known, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<boolean | null>(null); // null = not checked yet; true = all right
  const [caught, setCaught] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<string | null>(null);
  const fishRefs = useRef(new Map<string, HTMLButtonElement>());
  const q = questions[index]!;
  const last = index + 1 >= questions.length;
  const m = radicalMeaning(q.component);

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
    setCaught(new Set());
    setPicked(null);
    if (last) onDone();
    else setIndex(index + 1);
  };
  const toggle = (c: string) => {
    if (checked !== null) return;
    const nextSet = new Set(caught);
    if (nextSet.has(c)) nextSet.delete(c);
    else {
      nextSet.add(c);
      splash(fishRefs.current.get(c), 6);
    }
    setCaught(nextSet);
  };
  const check = () => {
    if (q.kind !== 'tapAll') return;
    const allRight = q.answers.length === caught.size && q.answers.every((a) => caught.has(a));
    if (allRight) q.answers.forEach((a) => splash(fishRefs.current.get(a)));
    report(allRight);
  };
  const pick = (o: string, el: Element) => {
    if (checked !== null || q.kind !== 'whichPart') return;
    setPicked(o);
    if (o === q.component) splash(el, 10);
    report(o === q.component);
  };
  const fishState = (c: string) => {
    if (q.kind !== 'tapAll') return '';
    if (checked === null) return caught.has(c) ? 'is-caught' : '';
    if (q.answers.includes(c)) return caught.has(c) ? 'is-right' : 'is-right is-missed';
    return caught.has(c) ? 'is-oops' : '';
  };

  return (
    <>
      <div class="center components">
        <Pet
          kid={kid}
          known={known}
          size={110}
          mood={checked === null ? 'determined' : checked ? 'happy' : 'comfort'}
          bubble={checked === null ? (q.kind === 'tapAll' ? '钓鱼啦！' : '找一找！') : null}
        />
        {q.kind === 'tapAll' ? (
          <>
            <div class="pond-q">
              <Label zh="钓出有" />
              <span class="pond-q__part hanzi">{q.component}</span>
              {m && <span class="pond-q__meaning">{m.emoji} {m.zh}</span>}
              <Label zh="的字" />
            </div>
            <div class="pond">
              {q.grid.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  class={`fishtile press ${fishState(c)}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  aria-label={c}
                  aria-pressed={caught.has(c)}
                  onClick={() => toggle(c)}
                  ref={(el) => {
                    if (el) fishRefs.current.set(c, el);
                  }}
                >
                  <span class="fishtile__char hanzi">{c}</span>
                  <span class="fishtile__badge" aria-hidden="true">🐟</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button type="button" class="whichpart__char hanzi" onClick={() => speak(q.char)}>{q.char}</button>
            <div class="pond-q">
              <Label zh="哪个部分是" />
              {m && <span class="pond-q__meaning">{m.emoji} {m.zh}</span>}
              <Label zh="的意思？" />
            </div>
            <div class="bubbles stagger">
              {q.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  class={`bubble-opt press ${checked !== null ? (o === q.component ? 'is-right' : o === picked ? 'is-oops' : '') : ''}`}
                  disabled={checked !== null}
                  onClick={(e) => pick(o, e.currentTarget)}
                >
                  {o}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {checked === null ? (
        q.kind === 'tapAll' ? (
          <BottomBar actionLabel="检查" disabled={!caught.size} onAction={check} />
        ) : (
          <BottomBar actionLabel="继续" disabled onAction={() => {}} />
        )
      ) : (
        <BottomBar
          tone={checked ? 'good' : 'oops'}
          title={checked ? '全对了！' : q.kind === 'tapAll' ? '看看绿色的！' : '是这个！'}
          detail={
            !checked && q.kind === 'whichPart' ? (
              <>
                <span class="hanzi">{q.component}</span> {m?.emoji} {m?.zh}
              </>
            ) : undefined
          }
          actionLabel="继续"
          onAction={next}
        />
      )}
    </>
  );
}
```

In `src/activities/writing/WritingStep.tsx`:
- Add `import { BottomBar } from '../../ui/BottomBar';` and remove the now-unused `Label` import.
- Replace the `bubble` constant and the whole `return (...)` with:
```tsx
  return (
    <>
      <div class="write">
        <div class="row write__head">
          <Pet kid={kid} known={known} size={130} mood={charMisses === null ? 'determined' : 'happy'} bubble={charMisses === null ? '写一写！' : null} />
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
      </div>
      {charMisses === null ? (
        <BottomBar actionLabel={last ? '完成' : '下一个字'} disabled onAction={() => {}} />
      ) : (
        <BottomBar tone="good" title={charMisses === 0 ? '完美！' : '写得好！'} actionLabel={last ? '完成' : '下一个字'} onAction={next} />
      )}
    </>
  );
```

In `src/activities/speaking/SpeakingStep.tsx`:
- Add `import { Mic, Volume2 } from 'lucide-preact';` and `import { BottomBar } from '../../ui/BottomBar';`.
- Replace the 听一听 button's `🔊` with `<Volume2 size={24} strokeWidth={2.5} />`.
- Replace everything from `{phase === 'ready' && (` to the end of the returned JSX with:
```tsx
        {phase === 'ready' && (
          <button type="button" class="mic-btn" onClick={() => void start()}>
            <Mic size={52} strokeWidth={2.5} />
            <Label zh="开始录音" />
          </button>
        )}
        {phase === 'recording' && (
          <button type="button" class="mic-btn is-recording" onClick={() => void stop()}>
            <span class="rec-dot" />
            <Label zh="停止" />
          </button>
        )}
        {phase === 'review' && (
          <div class="row">
            <audio controls src={playbackUrl ?? undefined} />
            <button type="button" class="btn" onClick={() => { setFinished(null); setPhase('ready'); }}><Label zh="重录" /></button>
          </div>
        )}
        {phase === 'blocked' && (
          <p class="warning">
            <Label zh="麦克风没有打开。我们下次再录！" />
            <br />
            <small>Ask a parent to allow the microphone for this app.</small>
          </p>
        )}
      </div>
      {phase === 'blocked' ? (
        <BottomBar actionLabel="继续" onAction={onSkip} />
      ) : (
        <BottomBar actionLabel="保存" disabled={phase !== 'review'} onAction={() => void save()} />
      )}
    </>
  );
```
- Wrap the component's outer `<div class="speak-step">` in a fragment `<>…</>` so the `BottomBar` is its sibling. The `</div>` above closes `.speak-step`.

- [ ] **Step 4: Run all tests**

Run: `npm test && npx tsc --noEmit`
Expected: all pass. That includes the writing tests (下一个字 and 完成 appear in the bar once a character is done) and the speaking tests (开始录音, 停止, 保存, 继续).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: readable fishing tiles and bottom-bar actions for fishing, writing and speaking

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: (D5) Icons and flat styling on the remaining screens

**Files:**
- Modify: `src/parent/ParentArea.tsx` (tab icons), `src/parent/PinGate.tsx` (back icon), `src/app/PlacementScreen.tsx` (button variants)

**Interfaces:** No API changes.

- [ ] **Step 1: Write the failing test**

Append to `src/parent/parentB.test.tsx`:
```tsx
import { ParentArea } from './ParentArea';
import { hashPin } from '../lib/hash';
import { DEFAULT_SETTINGS } from '../types';

describe('ParentArea tabs', () => {
  it('shows icon tabs as a segmented control', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, pinHash: await hashPin('1111') } });
    renderWithApp(<ParentArea />, app);
    for (const d of '1111') fireEvent.click(screen.getByRole('button', { name: d }));
    await screen.findByText('Overview');
    expect(document.querySelectorAll('.tabs .tab svg').length).toBe(8);
  });
});
```
Merge these imports with the existing ones at the top of the file.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/parent/parentB.test.tsx`
Expected: FAIL. There are 0 tab icons.

- [ ] **Step 3: Implement**

In `src/parent/ParentArea.tsx`:
- Add `import { BookOpen, ChevronLeft, Gift, Image, Info, LayoutDashboard, Mic, Save, Settings } from 'lucide-preact';`.
- Replace `TABS` with:
```tsx
const TABS: [ParentTab, string, typeof Info][] = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['words', 'Words', BookOpen],
  ['recordings', 'Recordings', Mic],
  ['pictures', 'Pictures', Image],
  ['rewards', 'Rewards', Gift],
  ['settings', 'Settings', Settings],
  ['backup', 'Backup', Save],
  ['credits', 'Credits', Info],
];
```
- Render each tab as:
```tsx
              <button key={id} type="button" class={`tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>
                <Icon size={18} strokeWidth={2.5} /> {label}
              </button>
```
  with the map destructuring `([id, label, Icon])`.
- Replace the `← Done` button with:
```tsx
          <button type="button" class="btn btn--ghost" onClick={() => go({ name: 'home' })}><ChevronLeft size={22} strokeWidth={3} /> Done</button>
```

In `src/parent/PinGate.tsx`:
- Add `import { ChevronLeft } from 'lucide-preact';`.
- Replace `← Back` with `<ChevronLeft size={22} strokeWidth={3} /> Back`.

In `src/app/PlacementScreen.tsx`:
- Change the 认识 button class to `btn btn--primary btn--big`. Leave 不认识 as `btn btn--big`.

- [ ] **Step 4: Run all tests**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all pass and the build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: icon tabs and flat styling on parent and placement screens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: (D6) Visual walkthrough at iPad sizes

**Files:** none planned. Fix layout issues in the file that owns them, and commit with a short message.

- [ ] **Step 1: Start fresh**
- Rebuild.
- In the preview tab: unregister the service worker, clear caches, delete the `hanzi-buddy` IndexedDB and reload.
- Set the viewport to 1024×768.

- [ ] **Step 2: Walk every screen and screenshot each one.** Drive with DOM clicks; trace characters with stroke medians.
  - PIN setup
  - pet setup
  - placement
  - **home path:** the current node bounces and the dragon sits beside it
  - **flashcards:**
    - intro bar
    - a correct answer gives the green sheet
    - a wrong answer gives the orange sheet with the answer
    - the combo
  - **writing:** the bar after a character
  - **fishing:**
    - all 8 tiles are visible and readable
    - caught tiles turn blue
    - the 检查 sheet
  - **speaking:** the blocked path shows 继续
  - **celebration:** star flight and the chest
  - **home again:** the path is all gold and the done card shows
  - **sticker book and wardrobe:** the tab bar
  - **parent area:** the segmented tabs

- [ ] **Step 3: Portrait, 768×1024**
- Check home, flashcards (sheet stacked), fishing and parent.
- `document.documentElement.scrollWidth <= innerWidth` must hold on every screen.

- [ ] **Step 4: Check the console and reset**
- `read_console_messages` with `onlyErrors` shows nothing app-related.
- Reset the viewport to `desktop` and stop the preview.
- Run `npm test && npm run build`. Everything must be green.
