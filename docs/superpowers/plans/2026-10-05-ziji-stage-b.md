# A Living Truffle Implementation Plan (Phase B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Truffle becomes a rigged puppet. He breathes, blinks and watches; he reacts to answers with clear, smoothly blended expressions; he responds to touch; and he stays still while the child reads a question.

**Architecture:**
- A pure face model (`rig.ts`) holds continuous parameters, expression presets, spring maths and the part geometry.
- `Truffle.tsx` keeps its API but draws the split parts (eyes with lids, brows, mouth, separate ears, tail, rounded body) from those parameters.
- One `requestAnimationFrame` loop per live Truffle (`useRig`) springs the parameters and paints through refs, without re-rendering.
- `timelines.ts` plays body moves anchored at his feet.
- `behaviour.ts` schedules idle life and classifies touch.
- `Pet` gains `calm`, `react` and touch, and the activities pass them.

**Tech Stack:** Preact 10 (hooks, refs), TypeScript 5.9, Web Audio (purr), Vitest 4 (jsdom, fake timers), Playwright-core WebKit (`npm run fit`, `scripts/stage-cases.ts`).

**Spec:** `docs/superpowers/specs/2026-10-04-ziji-stage-design.md` (phase B row of §8; §4.1–4.5, §4.7, §4.8, §6, §9). The approved demo is `docs/superpowers/mockups/2026-10-04-truffle-rig.html` (v4): its rig code is the reference for the geometry below.

## Global Constraints

- No new character art. Truffle is his existing drawing cut into parts (spec §4).
- **Head tilt is limited to ±8°.** The body has a rounded top tucked under the head, so no seam shows (spec §4.1).
- **Question-calm (spec §4.3).** From the moment a question appears until the child answers, Truffle only breathes, blinks and looks at the card: no ear flicks, bubbles, sounds or reactions.
- **Reduced motion (spec §4.8).** Expressions and the bubble still change. There are no hops, squashes, shakes, ear flicks or swishes, and gaze does not follow the finger.
- **No live SVG filters on moving parts (spec §6).** Truffle's grain filter goes.
- Child screens: no emoji (`src/childEmoji.test.ts`; hearts are drawn as SVG, never ♥) and no English.
- Every existing caller of `Truffle`/`Pet` keeps working. The moods `sulk | neutral | pleased | side | content | wow | cheer | sleepy` map onto presets (spec §4.1).
- Placement shows no right or wrong (spec §14). Truffle stays calm there.
- The parent's decisions (spec §10): no recorded meows (the purr is synthesised) and no sleeping Truffle on Home.
- Never push or deploy without the parent's go-ahead.

## Review Focus

1. **Many Truffles on one screen** (the Wardrobe's 20 costume tiles, Celebration, the room). Only live Truffles (`Pet`) animate; plain `<Truffle>` previews render once and run no loop. A live Truffle off screen, or with the page hidden, pauses its loop. Pinned in Task 3 ("a static Truffle never starts a loop" and "pauses when the page is hidden").
2. **A reaction arriving while another is playing** (a child tapping 继续 fast, two answers in a row) must not stack timelines or leave him squashed. The newest reaction replaces the old one and the body returns to rest. Pinned in Task 4 ("a new reaction replaces a running one and he ends at rest").
3. **Touch during the question-calm window** does nothing, and does not open the wardrobe by accident. Pinned in Task 6 ("touch is ignored while calm").
4. **A onesie or outfit with the face rig.** Hoods still hide his ears. The lid colour matches his fur under every outfit. Face accessories (glasses) move with the head. Pinned in Task 2 ("hood hides the ears…", "glasses ride in the head group") and by the stage-cases costume sheet in Task 8.
5. **Gaze to the card when there is no card** (Home, Celebration). He looks ahead, never at a stale or zero-size rectangle. Pinned in Task 5 ("no card: he looks ahead").

---

## File map

| File | Responsibility |
|---|---|
| `src/ui/truffle/rig.ts` (new) | `Face` parameters, expression presets, mood → expression map, extras, spring step, part geometry (pure). |
| `src/ui/truffle/rig.test.ts` (new) | Its tests. |
| `src/ui/truffle/Truffle.tsx` | Draws the split parts from a `Face`; the grain filter goes; same props plus `alive`, `expression`, `calm`, `react`, `onPart`. |
| `src/ui/truffle/parts.ts` | `BODY` gets the rounded top; the ears split into `EAR_L` and `EAR_R`; `HEAD_SHAPE` without ears. `FACES` stays for the face class names only. |
| `src/ui/truffle/useRig.ts` (new) | The animation loop hook: springs, gaze, idle, timelines; paints through refs; pauses when hidden or off screen. |
| `src/ui/truffle/timelines.ts` (new) | Body moves (hop, bigHop, flinch, shake, pounce, nod, wiggle, purr) as sampled tracks. |
| `src/ui/truffle/behaviour.ts` (new) | Idle scheduler, calm rule, gaze target, gesture classifier (pure). |
| `src/audio/sfx.ts` | `startPurr()` / `stopPurr()`. |
| `src/ui/Pet.tsx` | `alive` (default true), `calm`, `react`, touch (stroke/head/tail) with bubbles and hearts. |
| `src/activities/**`, `src/app/PlacementScreen.tsx`, `src/app/Celebration.tsx`, `src/app/HomeScreen.tsx` | Pass `calm` and `react`. |
| `src/styles.css` | Hearts; pet touch target; reduced-motion cross-fade for the face. |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts` | Expression × costume sheet and bounding checks. |

---

### Task 1: The face model

**Files:**
- Create: `src/ui/truffle/rig.ts`, `src/ui/truffle/rig.test.ts`

**Interfaces:**
- Produces:
  - `export type Expression = 'neutral' | 'happy' | 'joy' | 'surprised' | 'curious' | 'grumpy' | 'content' | 'sleepy' | 'proud' | 'embarrassed' | 'determined'`
  - `export interface Face { lidTop: number; lidBottom: number; lidArc: number; pupil: number; browY: number; browAngle: number; browShow: number; browAsym: number; smile: number; mouthOpen: number; earL: number; earR: number; blush: number; tilt: number }`
  - `export const PRESETS: Record<Expression, Face>`
  - `export const MOOD_EXPRESSION: Record<TruffleMood, Expression>`
  - `export const EXTRAS: Partial<Record<Expression, string>>`: the "?", "!", "zz" and confetti marks.
  - `export function springStep(cur: number, vel: number, target: number, stiffness?: number, damping?: number): [number, number]`
  - `export function clampFace(f: Face): Face`
  - Geometry, all returning SVG path data or a transform string:
    - `upperLid(cx: number, lidTop: number, lidArc: number): { fill: string; edge: string; edgeOn: boolean; closed: string; closedOn: number }`
    - `lowerLid(cx: number, lidBottom: number): { fill: string; edge: string; edgeOn: boolean }`
    - `mouthPath(smile: number, open: number): { d: string; fillOpacity: number }`
    - `browTransform(side: 'L' | 'R', f: Face): string`
  - Constants `EYE_L = 118`, `EYE_R = 202`, `EYE_Y = 118`, `FUR = '#b8b3b6'`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/ui/truffle/rig.test.ts
import { describe, expect, it } from 'vitest';
import { TRUFFLE_MOODS } from './parts';
import { clampFace, EXTRAS, lowerLid, mouthPath, MOOD_EXPRESSION, PRESETS, springStep, upperLid, type Expression } from './rig';

describe("Truffle's face model (spec 2026-10-04 §4.1)", () => {
  it('has the eleven expressions', () => {
    expect(Object.keys(PRESETS).sort()).toEqual(['content', 'curious', 'determined', 'embarrassed', 'grumpy', 'happy', 'joy', 'neutral', 'proud', 'sleepy', 'surprised']);
  });
  it('every old mood maps onto a preset, so every caller keeps working', () => {
    for (const m of TRUFFLE_MOODS) expect(PRESETS[MOOD_EXPRESSION[m]], m).toBeTruthy();
    expect(MOOD_EXPRESSION.side).toBe('curious'); // after a wrong answer he is curious, never sad
    expect(MOOD_EXPRESSION.cheer).toBe('joy');
  });
  it('keeps every value in range: tilt within ±8°, lids 0–1, smile −1…1', () => {
    const wild = clampFace({ ...PRESETS.neutral, tilt: 30, lidTop: 2, lidBottom: -1, smile: 4, mouthOpen: 3, blush: 9 });
    expect(wild.tilt).toBe(8);
    expect([wild.lidTop, wild.lidBottom, wild.smile, wild.mouthOpen, wild.blush]).toEqual([1, 0, 1, 1, 1]);
    for (const [name, f] of Object.entries(PRESETS)) expect(clampFace(f), name).toEqual(f);
  });
  it('a spring settles on its target without overshooting wildly', () => {
    let [x, v] = [0, 0];
    let peak = 0;
    for (let i = 0; i < 120; i++) { [x, v] = springStep(x, v, 1); peak = Math.max(peak, x); }
    expect(x).toBeCloseTo(1, 3);
    expect(peak).toBeLessThan(1.25);
  });
  it('a fully closed upper lid covers the eye and shows only the closed line', () => {
    const open = upperLid(118, 0, 0);
    expect(open.edgeOn).toBe(false);
    expect(open.closedOn).toBe(0);
    const shut = upperLid(118, 1, 1);
    expect(shut.closedOn).toBe(1);
    expect(Number(/L144 ([\d.]+) Q/.exec(shut.fill)![1])).toBeGreaterThanOrEqual(142); // the lid's lower edge reaches the bottom of the eye (y 140)
    expect(shut.closed).toMatch(/^M99 /); // a ^ line across the eye
  });
  it('a happy lower lid rises in the middle (a smile squint)', () => {
    const l = lowerLid(118, 0.5);
    expect(l.edgeOn).toBe(true);
    expect(l.fill).toContain('Q118 ');
  });
  it('the mouth only fills when it opens', () => {
    expect(mouthPath(1, 0).fillOpacity).toBe(0);
    expect(mouthPath(1, 0.6).fillOpacity).toBe(1);
  });
  it('curious shows a question mark, sleepy shows zz, and none of the marks is an emoji', () => {
    expect(EXTRAS.curious).toContain('?');
    expect(EXTRAS.sleepy).toContain('z');
    for (const e of Object.values(EXTRAS)) expect(e).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it('the presets read as their names: joy closes the eyes into ^, surprised shrinks the pupils, grumpy frowns', () => {
    const p = (e: Expression) => PRESETS[e];
    expect(p('joy').lidTop).toBe(1);
    expect(p('joy').lidArc).toBeGreaterThan(0.5);
    expect(p('surprised').pupil).toBeLessThan(0.8);
    expect(p('grumpy').smile).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run them.** `npx vitest run src/ui/truffle/rig.test.ts`. Expected: FAIL (no `./rig`).
- [ ] **Step 3: Implement** (ported from the v4 demo):

```ts
// src/ui/truffle/rig.ts
import type { TruffleMood } from './parts';

/** Truffle's face as continuous values (spec 2026-10-04 §4.1): every part springs toward a preset, so expressions blend. */
export type Expression = 'neutral' | 'happy' | 'joy' | 'surprised' | 'curious' | 'grumpy' | 'content' | 'sleepy' | 'proud' | 'embarrassed' | 'determined';
export interface Face {
  lidTop: number; lidBottom: number; lidArc: number; pupil: number;
  browY: number; browAngle: number; browShow: number; browAsym: number;
  smile: number; mouthOpen: number; earL: number; earR: number; blush: number; tilt: number;
}
export const EYE_L = 118;
export const EYE_R = 202;
export const EYE_Y = 118;
export const FUR = '#b8b3b6';

const base: Face = { lidTop: 0, lidBottom: 0, lidArc: 0, pupil: 1, browY: 0, browAngle: 0, browShow: 0, browAsym: 0, smile: 0.25, mouthOpen: 0, earL: 0, earR: 0, blush: 0.45, tilt: 0 };
export const PRESETS: Record<Expression, Face> = {
  neutral: { ...base },
  happy: { ...base, lidBottom: 0.28, pupil: 1.2, smile: 1, mouthOpen: 0.3, earL: -6, earR: 6, blush: 0.85 },
  joy: { ...base, lidTop: 1, lidArc: 1, pupil: 1.1, smile: 1, mouthOpen: 0.6, earL: -10, earR: 10, blush: 1 },
  surprised: { ...base, pupil: 0.6, browShow: 1, browY: -9, smile: 0, mouthOpen: 0.62, earL: -12, earR: 12, blush: 0.4 },
  curious: { ...base, pupil: 1.28, browShow: 1, browY: -3, browAsym: 1, smile: 0.05, mouthOpen: 0.18, earL: -4, earR: 24, blush: 0.5, tilt: -6 },
  grumpy: { ...base, lidTop: 0.42, lidBottom: 0.06, pupil: 0.9, browShow: 1, browY: 5, browAngle: 1, smile: -0.6, earL: 18, earR: -18, blush: 0.25 },
  content: { ...base, lidTop: 1, lidArc: 0.7, smile: 0.85, earL: -3, earR: 3, blush: 0.9 },
  sleepy: { ...base, lidTop: 1, lidArc: -0.25, smile: 0.1, earL: 8, earR: -8, blush: 0.5 },
  proud: { ...base, lidTop: 0.5, lidArc: 0.4, browShow: 1, browY: -4, smile: 0.8, earL: -8, earR: 8, blush: 0.6, tilt: 4 },
  embarrassed: { ...base, lidTop: 0.3, lidBottom: 0.3, pupil: 1.1, smile: 0.4, earL: 14, earR: -14, blush: 1, tilt: -5 },
  determined: { ...base, lidTop: 0.3, pupil: 1.15, browShow: 1, browY: 3, browAngle: 0.6, smile: 0.2, earL: -10, earR: 10, blush: 0.5 },
};
/** The moods every screen already passes, as presets (spec §4.1). */
export const MOOD_EXPRESSION: Record<TruffleMood, Expression> = { sulk: 'grumpy', neutral: 'neutral', pleased: 'happy', side: 'curious', content: 'content', wow: 'surprised', cheer: 'joy', sleepy: 'sleepy' };

const INK = '#2a2630';
/** Small marks that come with some expressions (faded in and out with them). Drawn, never emoji. */
export const EXTRAS: Partial<Record<Expression, string>> = {
  curious: `<g transform="translate(236 40)"><rect width="34" height="34" rx="12" fill="#fffdf7" stroke="${INK}" stroke-width="2.4"/><text x="17" y="26" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="24" fill="${INK}">?</text></g>`,
  surprised: `<path d="M70 52 L80 64 M58 70 L72 76 M250 52 L240 64 M262 70 L248 76" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
  sleepy: `<text x="236" y="70" font-family="Nunito" font-weight="900" font-size="26" fill="${INK}">z</text><text x="256" y="48" font-family="Nunito" font-weight="900" font-size="18" fill="${INK}">z</text>`,
  joy: `<circle cx="44" cy="70" r="5" fill="#7fdc7a"/><rect x="266" y="60" width="9" height="9" rx="2" fill="#ffc94a" transform="rotate(20 270 64)"/><circle cx="282" cy="106" r="4" fill="#ff7f6a"/><rect x="30" y="104" width="8" height="8" rx="2" fill="#7fb8ff" transform="rotate(-15 34 108)"/>`,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export function clampFace(f: Face): Face {
  return {
    ...f,
    lidTop: clamp(f.lidTop, 0, 1), lidBottom: clamp(f.lidBottom, 0, 1), lidArc: clamp(f.lidArc, -1, 1), pupil: clamp(f.pupil, 0.4, 1.6),
    browShow: clamp(f.browShow, 0, 1), browAsym: clamp(f.browAsym, 0, 1), smile: clamp(f.smile, -1, 1), mouthOpen: clamp(f.mouthOpen, 0, 1),
    blush: clamp(f.blush, 0, 1), tilt: clamp(f.tilt, -8, 8), earL: clamp(f.earL, -30, 30), earR: clamp(f.earR, -30, 30),
  };
}

/** One frame of a damped spring (60 fps): soft, a little bounce, settles in about half a second. */
export function springStep(cur: number, vel: number, target: number, stiffness = 0.16, damping = 0.7): [number, number] {
  const v = (vel + (target - cur) * stiffness) * damping;
  return [cur + v, v];
}

/** The upper lid: bows down when relaxed, up into a ^ when happy; fully closed it covers the eye and a curved ink line remains. */
export function upperLid(cx: number, lidTop: number, lidArc: number) {
  const cl = Math.max(0, (lidTop - 0.86) / 0.14);
  const eT = 95 + lidTop * 47 + cl * 6;
  const curve = (6 - lidTop * 3 - lidArc * 22) * (1 - cl);
  const yy = 127 - lidArc * 3;
  const bend = 4 - lidArc * 18;
  return {
    fill: `M${cx - 26} 90 L${cx + 26} 90 L${cx + 26} ${eT} Q${cx} ${eT + curve} ${cx - 26} ${eT}Z`,
    edge: `M${cx - 26} ${eT} Q${cx} ${eT + curve} ${cx + 26} ${eT}`,
    edgeOn: lidTop > 0.06 && lidTop < 0.9,
    closed: `M${cx - 19} ${yy} Q${cx} ${yy + bend} ${cx + 19} ${yy}`,
    closedOn: cl,
  };
}
/** The lower lid rises in the middle: a smile squint. */
export function lowerLid(cx: number, lidBottom: number) {
  const eB = 141 - lidBottom * 20;
  const up = lidBottom * 12;
  return { fill: `M${cx - 26} 146 L${cx + 26} 146 L${cx + 26} ${eB} Q${cx} ${eB - up} ${cx - 26} ${eB}Z`, edge: `M${cx - 26} ${eB} Q${cx} ${eB - up} ${cx + 26} ${eB}`, edgeOn: lidBottom > 0.05 };
}
/** The mouth: corners rise with the smile; it opens into a pink shape. */
export function mouthPath(smile: number, open: number) {
  const cy = 165 - smile * 3;
  const u = 165 + smile * 6;
  const low = u + 2 + open * 16;
  const w = 10 + open * 2;
  return { d: `M${160 - w} ${cy} C${156 - w * 0.2} ${u} ${164 + w * 0.2} ${u} ${160 + w} ${cy} C${164 + w * 0.3} ${low} ${156 - w * 0.3} ${low} ${160 - w} ${cy}Z`, fillOpacity: Math.min(1, open * 3) };
}
/** Brows: lift, angle (grumpy: inner ends down), and one brow raised for curious. */
export function browTransform(side: 'L' | 'R', f: Face): string {
  return side === 'L'
    ? `translate(0 ${f.browY + f.browAsym * 2}) rotate(${f.browAngle * 14} 116 87)`
    : `translate(0 ${f.browY - f.browAsym * 9}) rotate(${-f.browAngle * 14 - f.browAsym * 8} 204 87)`;
}
```

- [ ] **Step 4: Run them.** `npx vitest run src/ui/truffle/rig.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/ui/truffle/rig.ts src/ui/truffle/rig.test.ts && git commit -m "feat: Truffle's face model (expressions, springs, lids, mouth, brows)"`

### Task 2: Truffle drawn from the rig

**Files:**
- Modify: `src/ui/truffle/parts.ts` (rounded body top; split ears; `HEAD_SHAPE`), `src/ui/truffle/Truffle.tsx`, `src/ui/truffle/Truffle.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`PRESETS`, `MOOD_EXPRESSION`, `EXTRAS`, `upperLid`, `lowerLid`, `mouthPath`, `browTransform`, `EYE_L`, `EYE_R`, `FUR`).
- Produces: `Truffle` with props `{ mood?, accessory?, size?, lookAt?, label?, bounce?, power?, powerTier?, outfit?, expression?: Expression, alive?: boolean, calm?: boolean, react?: Reaction | null, onPart?: (part: 'head' | 'body' | 'tail', e: PointerEvent) => void }`. The props `alive`, `calm` and `react` are only accepted in this task; Tasks 3–4 use them.

  The markup keeps:
  - classes `truffle`, `truffle__body`, `truffle__head`, `truffle__face truffle__face--{mood}`, and the outfit, accessory and power classes;
  - data attributes `data-mood`, `data-outfit`, `data-accessory`, `data-power`, `data-tier`, plus a new `data-expression`.

  The structure, from the outside in:
  - `<g class="truffle__rig">`: whole-body motion, anchored at the feet;
  - `<g class="truffle__tail">`: origin (214, 246);
  - `<g class="truffle__body">`: origin (160, 276);
  - `<g class="truffle__headpos">` (translate) wrapping `<g transform="rotate(a 160 190)">`, which holds `.truffle__head` (ears in `.truffle__ear--l`/`--r` unless hooded, then the head shape), the face rig, the outfit head, face accessories and the power head.

  Every face part carries a `data-part` attribute (`iris-l`, `lid-top-l`, `brow-l`, `mouth`, `ear-l`, …) for the paint loop in Task 3.
- Produces: `export type Reaction = { kind: ReactionKind; key: number }` and `export type ReactionKind = 'right' | 'hard' | 'wrong' | 'streak' | 'newWord' | 'nod' | 'done' | 'excited' | 'pounce' | 'flinch' | 'purr'` (exported from `timelines.ts` in Task 4; declare them in `rig.ts` now and re-export later).

- [ ] **Step 1: Write the failing tests.** In `Truffle.test.tsx`:
  - Replace the test `gives each instance its own grain filter id` with the first new test below. The spec §6 bans live filters on moving parts; record this in the ledger.
  - Add the rest.

```tsx
  it('has no live filters (spec §6): the grain is gone from the moving parts', () => {
    const { container } = render(<Truffle mood="neutral" />);
    expect(container.querySelector('filter, [filter]')).toBeNull();
  });
  it('is built from parts: separate ears, lidded eyes, brows, a mouth, a tail, and a rounded body top', () => {
    const { container } = render(<Truffle mood="neutral" />);
    for (const part of ['ear-l', 'ear-r', 'iris-l', 'iris-r', 'lid-top-l', 'lid-top-r', 'lid-bottom-l', 'brow-l', 'brow-r', 'mouth', 'blush-l', 'tail']) {
      expect(container.querySelector(`[data-part="${part}"]`), part).toBeTruthy();
    }
    expect(container.querySelector('.truffle__body path')!.getAttribute('d')).toMatch(/^M110 186 C112 158 208 158 210 186/); // rounded top under the head: no seam when he leans
  });
  it('shows the preset for its mood (sulk → grumpy, side → curious) and an explicit expression overrides the mood', () => {
    expect(render(<Truffle mood="side" />).container.querySelector('svg')!.getAttribute('data-expression')).toBe('curious');
    expect(render(<Truffle mood="sulk" expression="joy" />).container.querySelector('svg')!.getAttribute('data-expression')).toBe('joy');
  });
  it('joy draws closed ^ eyes; neutral draws open ones', () => {
    const joy = render(<Truffle expression="joy" />).container;
    expect(joy.querySelector('[data-part="lid-closed-l"]')!.getAttribute('opacity')).toBe('1');
    const neutral = render(<Truffle expression="neutral" />).container;
    expect(neutral.querySelector('[data-part="lid-closed-l"]')!.getAttribute('opacity')).toBe('0');
  });
  it('curious brings its question mark; neutral has no marks', () => {
    expect(render(<Truffle expression="curious" />).container.querySelector('[data-part="extra-curious"]')!.getAttribute('opacity')).toBe('1');
    expect(render(<Truffle expression="neutral" />).container.querySelector('[data-part="extra-curious"]')!.getAttribute('opacity')).toBe('0');
  });
  it('the lids are his fur colour under every outfit (review focus 4)', async () => {
    const { COSTUMES } = await import('../../fun/costumes');
    for (const c of COSTUMES) {
      const { container, unmount } = render(<Truffle outfit={c.id} />);
      expect(container.querySelector('[data-part="lid-top-l"]')!.getAttribute('fill'), c.id).toBe('#b8b3b6');
      unmount();
    }
  });
  it('glasses ride in the head group, and a hood still hides his ears (review focus 4)', () => {
    const g = render(<Truffle accessory="sunglasses" />).container;
    expect(g.querySelector('g[transform^="rotate"] .truffle__accessory--face')).toBeTruthy();
    const hood = render(<Truffle outfit="rabbit" />).container;
    expect(hood.querySelector('[data-part="ear-l"]')).toBeNull();
  });
```

  Keep every other existing test. The `.truffle__head` innerHTML check for `M74 92` still works, because the ears live inside `.truffle__head`. `g[transform^="rotate"] .truffle__power-head` still works, because the rotate group is inside the `headpos` translate.

- [ ] **Step 2: Run them.** `npx vitest run src/ui/truffle`. Expected: FAIL (filter present, no parts, no `data-expression`).
- [ ] **Step 3: Split the drawing.** In `src/ui/truffle/parts.ts`:
  - `BODY`: replace the body's second path `d` with `M110 186 C112 158 208 158 210 186 C230 200 234 238 216 258 C200 276 120 276 104 258 C86 238 90 200 110 186Z`, the rounded top from the demo. Keep the belly and feet.
  - Split `BODY`'s first path (the tail) into `export const TAIL = '<path d="M212 252 …Z" fill="#b8b3b6" stroke=… />'` and remove it from `BODY`.
  - `HEAD` currently draws both ears in one path, plus their pink insides. Define `EAR_L` (the left outer ear `M74 92 C64 66 66 42 76 30 C94 36 112 48 122 60 Z` plus the inner `M82 76 …Z` in `#ffc4c0`), `EAR_R` (`M246 92 …Z` plus `M238 76 …Z`) and `HEAD_SHAPE` (the head silhouette, top shade, stripe, muzzle, nose, whiskers and the static blush removed, because the rig draws blush). `HEAD` and `HEAD_EARLESS` stay exported for compatibility: `HEAD = EAR_L + EAR_R + HEAD_SHAPE`.
  - Copy the exact path strings from the current `HEAD` constant. Don't redraw anything.

- [ ] **Step 4: Draw from the rig.** In `Truffle.tsx`:
  - Remove the `<defs><filter …>` and `filter=` attribute.
  - Compute `const expr = expression ?? MOOD_EXPRESSION[mood]; const f = PRESETS[expr];`.
  - Render:

```tsx
<g class="truffle__rig" data-part="rig">
  {layer && <g class="truffle__power-back" dangerouslySetInnerHTML={{ __html: layer.back }} />}
  {wear?.back && <g class="truffle__outfit-back" dangerouslySetInnerHTML={{ __html: wear.back }} />}
  {acc?.back && <g class="truffle__accessory truffle__accessory--back" dangerouslySetInnerHTML={{ __html: acc.back }} />}
  <g class="truffle__tail" data-part="tail" style="transform-origin:214px 246px" dangerouslySetInnerHTML={{ __html: TAIL }} />
  <g class="truffle__body" data-part="body" style="transform-origin:160px 276px" dangerouslySetInnerHTML={{ __html: BODY }} />
  {wear && <g class="truffle__outfit-body" dangerouslySetInnerHTML={{ __html: wear.body }} />}
  {acc?.under && <g class="truffle__accessory truffle__accessory--under" dangerouslySetInnerHTML={{ __html: acc.under }} />}
  <g class="truffle__headpos" data-part="headpos">
    <g transform={`rotate(${tilt} 160 190)`} data-part="headrot">
      <g class="truffle__head">
        {!wear?.hidesEars && <g class="truffle__ear--l" data-part="ear-l" style="transform-origin:100px 78px" dangerouslySetInnerHTML={{ __html: EAR_L }} />}
        {!wear?.hidesEars && <g class="truffle__ear--r" data-part="ear-r" style="transform-origin:220px 78px" dangerouslySetInnerHTML={{ __html: EAR_R }} />}
        <g dangerouslySetInnerHTML={{ __html: HEAD_SHAPE }} />
      </g>
      <g class={`truffle__face truffle__face--${mood}`}>{faceRig(f, expr, idPrefix)}</g>
      {wear && <g class="truffle__outfit-head" dangerouslySetInnerHTML={{ __html: wear.head }} />}
      {acc?.face && <g class="truffle__accessory truffle__accessory--face" dangerouslySetInnerHTML={{ __html: acc.face }} />}
      {layer?.head && <g class="truffle__power-head" dangerouslySetInnerHTML={{ __html: layer.head }} />}
    </g>
  </g>
  {layer?.front && <g class="truffle__power-front" dangerouslySetInnerHTML={{ __html: layer.front }} />}
  {acc?.over && <g class="truffle__accessory truffle__accessory--over" dangerouslySetInnerHTML={{ __html: acc.over }} />}
</g>
```

  `tilt` is `clamp(f.tilt + lookAt * 4, -8, 8)`. The hood's outfit-head layer draws the hood around the face as today.

  `faceRig(f, expr, id)` returns JSX:
  - blush ellipses (`data-part="blush-l"`/`"blush-r"`, opacity `f.blush * 0.6`);
  - each eye:
    - a clip `<clipPath id={`${id}-cl`}><circle cx=118 cy=118 r=21/></clipPath>` and a wider lid clip of r=23.8;
    - the white circle;
    - an iris group `data-part="iris-l"` (iris, pupil `data-part="pupil-l"` with rx 7·pupil and ry 11·pupil, shine) clipped by r21;
    - the outline circle;
    - lid fills `data-part="lid-top-l"`/`"lid-bottom-l"` (fill `FUR`) clipped by r23.8;
    - lid edges `data-part="lid-edge-l"`/`"lid-bedge-l"` clipped by r21;
    - the closed line `data-part="lid-closed-l"` (stroke 3.6, opacity `upperLid(...).closedOn`);
  - the brows (`data-part="brow-l"`, `d="M100 90 Q116 83 132 89"`; right `d="M188 89 Q204 83 220 90"`, transform `browTransform`, opacity `browShow`);
  - the mouth (`data-part="mouth"`, `fill="#8a3d4c"`, stroke ink, `d` and `fill-opacity` from `mouthPath`);
  - one `<g data-part={`extra-${e}`} opacity={e === expr ? 1 : 0}>` per key of `EXTRAS`.

  Use `useId()` for the clip ids, as the grain filter did.

  Set `data-expression={expr}` on the `<svg>`. The ear `transform` is `rotate(-earL)` / `rotate(earR)` via `style="transform: rotate(…deg)"`.

- [ ] **Step 5: Run them.** `npx vitest run src/ui/truffle src/app src/activities src/ui` and `npx tsc --noEmit -p .`. Expected: PASS. Any older test that asserted face markup by mood (e.g. counting circles in `FACES[mood]`): update it to `data-expression`, recording a `Ruling:`.
- [ ] **Step 6: Look at it.**
  - Extend `scripts/stage-cases/page.tsx` with `case=faces`: a grid of `<Truffle expression={e} size={120} />` for every expression, and the same for `outfit="rabbit"`, `outfit="chef"`, `accessory="sunglasses"` and `power="fire" powerTier={3}`.
  - In `scripts/stage-cases.ts`, open it at 1024×768, screenshot it to `fit-shots/stage-cases/faces.png`, and assert every `svg.truffle`'s child bounding box stays inside the svg's box ±4px.
  - Run `npx tsx scripts/stage-cases.ts` and read the screenshot. Each expression must read as its name, with no seams and the ears hidden under the hood.
- [ ] **Step 7: Commit.** `git commit -am "feat: Truffle is drawn from his face rig (parts, lids, brows, mouth; no live filter)"`

### Task 3: The animation loop

**Files:**
- Create: `src/ui/truffle/useRig.ts`, `src/ui/truffle/useRig.test.tsx`
- Modify: `src/ui/truffle/Truffle.tsx` (use it when `alive`)

**Interfaces:**
- Consumes: Task 1 springs and geometry; Task 2's `data-part` elements.
- Produces: `useRig(svgRef: RefObject<SVGSVGElement>, opts: { alive: boolean; target: Face; expr: Expression; reduced: boolean }): { setGaze(x: number, y: number): void; play(track: Track): void; blink(): void }`. It owns `cur`/`vel` per `Face` key and gaze springs. When `alive`, it runs one `requestAnimationFrame` loop that:
  1. springs each value toward `target`;
  2. paints the parts through `svg.querySelector('[data-part=…]')` cached once;
  3. stops when `!alive`, when `document.hidden`, or when an `IntersectionObserver` reports the svg off screen, and resumes on return.

  It exposes `paint(face, motion)` for Tasks 4–5. Under reduced motion, values still spring but with `stiffness` 0.3 and no overshoot (`damping` 0.5): the cross-fade.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/truffle/useRig.test.tsx
import { act, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Truffle } from './Truffle';

let frames: FrameRequestCallback[] = [];
beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
const run = (n: number) => { for (let i = 0; i < n; i++) { const f = frames; frames = []; f.forEach((cb) => cb(performance.now() + i * 16)); } };

describe('the animation loop (spec §4.1, review focus 1)', () => {
  it('a static Truffle never starts a loop', () => {
    render(<Truffle mood="neutral" />);
    expect(frames).toHaveLength(0);
  });
  it('a live Truffle blends from one expression to the next instead of jumping', () => {
    const { container, rerender } = render(<Truffle alive expression="neutral" />);
    rerender(<Truffle alive expression="joy" />);
    act(() => run(3));
    const mid = Number(container.querySelector('[data-part="lid-closed-l"]')!.getAttribute('opacity'));
    act(() => run(80));
    const end = Number(container.querySelector('[data-part="lid-closed-l"]')!.getAttribute('opacity'));
    expect(mid).toBeLessThan(1); // on the way
    expect(end).toBeCloseTo(1, 1); // arrived
  });
  it('pauses while the page is hidden', () => {
    render(<Truffle alive expression="neutral" />);
    act(() => run(2));
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    act(() => run(2));
    expect(frames).toHaveLength(0);
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run them.** `npx vitest run src/ui/truffle/useRig.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement `useRig`.**
  - Keep `cur`, `vel`, `motion` and `gaze` in refs.
  - Cache the part elements in a `Map` on first paint.
  - Painting sets the following (geometry from Task 1, values as in the v4 demo):
    - `transform` on `iris-l`/`-r` (`translate(gx*6 gy*5)`);
    - `rx`/`ry` on `pupil-*`;
    - `d` and `opacity` on the lid parts;
    - `transform` and `opacity` on the brows;
    - `d` and `fill-opacity` on the mouth;
    - `style.transform` on the ears;
    - `opacity` on the blush;
    - `transform` on `headpos` (`translate(gx*3, gy*2 + lag)`) and `headrot` (`rotate(clamp(tilt + gx*5, -8, 8) 160 190)`);
    - `transform` on `body`, `tail` and `rig`, from `motion` (Task 4).
  - The loop uses `requestAnimationFrame` and listens for `visibilitychange`. Where `IntersectionObserver` exists it observes the svg; in jsdom it doesn't, so it is guarded.
  - `Truffle` calls `useRig(ref, { alive, target: PRESETS[expr], expr, reduced: reducedMotion() })` and attaches `ref` to the `<svg>`.
- [ ] **Step 4: Run them.** `npx vitest run src/ui/truffle` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat: a live Truffle springs between expressions in one loop that pauses when hidden"`

### Task 4: Body moves and reactions

**Files:**
- Create: `src/ui/truffle/timelines.ts`, `src/ui/truffle/timelines.test.ts`
- Modify: `src/ui/truffle/useRig.ts` (play tracks, reaction handling), `src/ui/truffle/Truffle.tsx` (`react` prop), `src/ui/truffle/rig.ts` (move `Reaction` types to `timelines.ts` and re-export)

**Interfaces:**
- Produces:
  - `export interface Motion { y: number; squash: number; shake: number; lean: number }`.
  - `export type Track = (t: number) => Motion | null`: `t` in ms; it returns `null` when finished.
  - `export const TRACKS: Record<'hop' | 'bigHop' | 'flinch' | 'shake' | 'pounce' | 'nod' | 'wiggle' | 'purr', Track>`.
  - `export const REACTIONS: Record<ReactionKind, { expr: Expression; track: keyof typeof TRACKS | null; holdMs: number; then?: Expression }>`.
  - `export const REST: Motion`.
- The meaning of the motion fields:
  - `squash` is positive for a crouch or landing and negative for a stretch, applied as `scale(1 + s*0.6, 1 - s)` about the feet (160, 276).
  - `y` is the jump height (negative is up).
  - `shake` is a head rotation in degrees.
  - `lean` is a body x-offset.

- [ ] **Step 1: Write the failing tests**

```ts
// src/ui/truffle/timelines.test.ts
import { describe, expect, it } from 'vitest';
import { REACTIONS, REST, TRACKS } from './timelines';

describe('body moves (spec §4.1, §4.4)', () => {
  it('a hop crouches first, rises with a stretch, lands with a squash and ends at rest', () => {
    const at = (t: number) => TRACKS.hop(t)!;
    expect(at(80).squash).toBeGreaterThan(0); // wind-up crouch
    expect(at(260).y).toBeLessThan(-10); // in the air
    expect(at(260).squash).toBeLessThan(0.01); // stretched or neutral while rising
    expect(TRACKS.hop(5000)).toBeNull(); // finished
  });
  it('every track ends exactly at rest (no stuck squash)', () => {
    for (const [name, tr] of Object.entries(TRACKS)) {
      let last = REST;
      for (let t = 0; t < 4000; t += 16) { const m = tr(t); if (!m) break; last = m; }
      expect(Math.abs(last.y) + Math.abs(last.squash) + Math.abs(last.shake) + Math.abs(last.lean), name).toBeLessThan(0.05);
    }
  });
  it('a wrong answer is curious, never sad: no squash-down sulk', () => {
    expect(REACTIONS.wrong.expr).toBe('curious');
  });
  it('the table of reactions matches the spec moments', () => {
    expect(REACTIONS.right).toMatchObject({ expr: 'happy', track: 'hop' });
    expect(REACTIONS.hard).toMatchObject({ expr: 'joy', track: 'bigHop' });
    expect(REACTIONS.streak).toMatchObject({ expr: 'content', track: 'purr' });
    expect(REACTIONS.newWord).toMatchObject({ expr: 'surprised', then: 'curious' });
    expect(REACTIONS.done).toMatchObject({ expr: 'joy', track: 'bigHop', then: 'proud' });
    expect(REACTIONS.excited.track).toBe('wiggle');
    expect(REACTIONS.pounce.track).toBe('pounce');
  });
});
```

Add to `useRig.test.tsx`:

```tsx
  it('a new reaction replaces a running one and he ends at rest (review focus 2)', () => {
    const { container, rerender } = render(<Truffle alive expression="neutral" react={{ kind: 'right', key: 1 }} />);
    act(() => run(5));
    rerender(<Truffle alive expression="neutral" react={{ kind: 'right', key: 2 }} />);
    act(() => run(5));
    rerender(<Truffle alive expression="neutral" react={{ kind: 'wrong', key: 3 }} />);
    act(() => run(400));
    expect(container.querySelector('[data-part="rig"]')!.getAttribute('transform') ?? '').toMatch(/translate\(0(\.0+)? 0(\.0+)?\)|^$/); // back at rest
    expect(container.querySelector('svg')!.getAttribute('data-expression')).toBe('neutral'); // back to his own expression after the hold
  });
  it('reduced motion: the expression still changes, the body never moves', () => {
    vi.doMock('../motion', () => ({ reducedMotion: () => true }));
    const { container } = render(<Truffle alive expression="neutral" react={{ kind: 'right', key: 1 }} />);
    act(() => run(10));
    expect(container.querySelector('[data-part="rig"]')!.getAttribute('transform') ?? '').not.toMatch(/scale\(1\.0[1-9]/);
  });
```

  If `vi.doMock` can't apply to an already-imported module, inject `reduced` through a test-only prop `reducedOverride?: boolean` on `Truffle` and record a `Ruling:`.

- [ ] **Step 2: Run them.** `npx vitest run src/ui/truffle`. Expected: FAIL.
- [ ] **Step 3: Implement `timelines.ts`.** Write the tracks as keyframe lists sampled with easing:

```ts
// src/ui/truffle/timelines.ts
import type { Expression } from './rig';

export interface Motion { y: number; squash: number; shake: number; lean: number }
export const REST: Motion = { y: 0, squash: 0, shake: 0, lean: 0 };
export type Track = (t: number) => Motion | null;
export type ReactionKind = 'right' | 'hard' | 'wrong' | 'streak' | 'newWord' | 'nod' | 'done' | 'excited' | 'pounce' | 'flinch' | 'purr';
export type Reaction = { kind: ReactionKind; key: number };

const easeOut = (k: number) => 1 - (1 - k) ** 3;
const easeIn = (k: number) => k ** 3;
const back = (k: number) => { const c = 1.7; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
type Key = [ms: number, m: Partial<Motion>, ease?: (k: number) => number];
/** A track from keyframes (each key: time from the start, the values reached, the easing into them). */
function track(keys: Key[]): Track {
  const end = keys[keys.length - 1]![0];
  return (t) => {
    if (t > end) return null;
    let prev: Motion = REST;
    let prevT = 0;
    for (const [ms, m, ease = easeOut] of keys) {
      const next = { ...prev, ...m };
      if (t <= ms) {
        const k = ms === prevT ? 1 : ease((t - prevT) / (ms - prevT));
        return { y: prev.y + (next.y - prev.y) * k, squash: prev.squash + (next.squash - prev.squash) * k, shake: prev.shake + (next.shake - prev.shake) * k, lean: prev.lean + (next.lean - prev.lean) * k };
      }
      prev = next;
      prevT = ms;
    }
    return prev;
  };
}
export const TRACKS = {
  hop: track([[130, { squash: 0.09 }], [250, { squash: -0.07, y: -30 }], [360, { squash: 0, y: -46 }], [570, { y: 0 }, easeIn], [650, { squash: 0.08 }], [910, { squash: 0 }, back]]),
  bigHop: track([[150, { squash: 0.12 }], [280, { squash: -0.1, y: -44 }], [420, { squash: 0, y: -70 }], [660, { y: 0 }, easeIn], [740, { squash: 0.1 }], [1040, { squash: 0 }, back]]),
  flinch: track([[90, { squash: 0.06, y: 3 }], [390, { squash: 0, y: 0 }, back]]),
  shake: track([[110, { shake: -6 }], [250, { shake: 6 }], [390, { shake: -3 }], [550, { shake: 0 }]]),
  pounce: track([[450, { lean: 6 }], [710, { squash: 0.1, lean: 8 }], [830, { squash: -0.08, y: -30, lean: 12 }], [1030, { squash: 0, y: 0, lean: 4 }, easeIn], [1100, { squash: 0.06 }], [1400, { squash: 0, lean: 0 }, back]]),
  nod: track([[120, { y: 2, shake: 0 }], [260, { y: 0 }, back]]),
  wiggle: track([[150, { lean: -4 }], [300, { lean: 4 }], [450, { lean: -3 }], [600, { lean: 3 }], [760, { lean: 0 }]]),
  purr: track([[2200, {}]]), // the body shimmer comes from the loop's purr flag; the track only holds the time
} satisfies Record<string, Track>;

/** What each moment does (spec 2026-10-04 §4.4): an expression, a body move, how long it holds, and what follows. */
export const REACTIONS: Record<ReactionKind, { expr: Expression; track: keyof typeof TRACKS | null; holdMs: number; then?: Expression }> = {
  right: { expr: 'happy', track: 'hop', holdMs: 1200 },
  hard: { expr: 'joy', track: 'bigHop', holdMs: 1500 },
  wrong: { expr: 'curious', track: null, holdMs: 1600 },
  streak: { expr: 'content', track: 'purr', holdMs: 2200 },
  newWord: { expr: 'surprised', track: null, holdMs: 700, then: 'curious' },
  nod: { expr: 'happy', track: 'nod', holdMs: 500 },
  done: { expr: 'joy', track: 'bigHop', holdMs: 1400, then: 'proud' },
  excited: { expr: 'surprised', track: 'wiggle', holdMs: 900 },
  pounce: { expr: 'joy', track: 'pounce', holdMs: 1500 },
  flinch: { expr: 'grumpy', track: 'flinch', holdMs: 1300 },
  purr: { expr: 'content', track: 'purr', holdMs: 900 },
};
```

  In `useRig`:
  - When `react.key` changes, clear any running track and hold.
  - Set the held expression to `REACTIONS[kind].expr` for `holdMs`, then to `then ?? own expr`.
  - If not reduced, start `TRACKS[track]` from the current time.
  - Each frame:
    - samples the track into `motion`, with head lag (spring `lagY` toward `-motion.y * 0.18`);
    - paints `rig` as `translate(lean, y) translate(160 276) scale(1+s*.6, 1-s) translate(-160 -276)`;
    - adds `shake` to the head tilt;
    - under the `purr` track, shimmers `rig` x by `sin(t*95)*0.5`.

  `data-expression` follows the held expression, so tests and the sweep can read it. This is set through the DOM attribute; no re-render is needed.
- [ ] **Step 4: Run them.** `npx vitest run src/ui/truffle` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat: Truffle reacts with expressions and body moves anchored at his feet"`

### Task 5: Idle life, gaze and the question-calm rule

**Files:**
- Create: `src/ui/truffle/behaviour.ts`, `src/ui/truffle/behaviour.test.ts`
- Modify: `src/ui/truffle/useRig.ts`, `src/ui/truffle/Truffle.tsx` (`calm` prop)

**Interfaces:**
- Produces:
  - `export function nextBlinkMs(rng: () => number): number`: 2000–5000.
  - `export function isDoubleBlink(rng: () => number): boolean`: about 20%.
  - `export function nextEarFlickMs(rng: () => number): number`: 3000–7500.
  - `export function idleExtras(calm: boolean, reduced: boolean): { blink: boolean; breathe: boolean; earFlicks: boolean; tailSwish: boolean; followPointer: boolean }`.
  - `export function gazeToward(from: DOMRect, to: { x: number; y: number } | null): { x: number; y: number }`: returns −1…1 per axis, or `{0, 0}` when `to` is null or zero-size.
  - `export function cardCentre(): { x: number; y: number } | null`: the centre of `.stage__card`, or null.

- [ ] **Step 1: Write the failing tests**

```ts
// src/ui/truffle/behaviour.test.ts
import { describe, expect, it } from 'vitest';
import { gazeToward, idleExtras, isDoubleBlink, nextBlinkMs, nextEarFlickMs } from './behaviour';

describe('idle life and the question-calm rule (spec §4.2, §4.3, §4.8)', () => {
  it('blinks every 2–5 s, sometimes twice; flicks an ear every 3–7.5 s', () => {
    expect(nextBlinkMs(() => 0)).toBe(2000);
    expect(nextBlinkMs(() => 0.999)).toBeLessThanOrEqual(5000);
    expect(isDoubleBlink(() => 0.1)).toBe(true);
    expect(isDoubleBlink(() => 0.5)).toBe(false);
    expect(nextEarFlickMs(() => 0)).toBe(3000);
  });
  it('calm: only breathing, blinking and looking at the card', () => {
    expect(idleExtras(true, false)).toEqual({ blink: true, breathe: true, earFlicks: false, tailSwish: false, followPointer: false });
  });
  it('free: everything', () => {
    expect(idleExtras(false, false)).toEqual({ blink: true, breathe: true, earFlicks: true, tailSwish: true, followPointer: true });
  });
  it('reduced motion: no flicks, swishes, breathing or following; blinking stays', () => {
    expect(idleExtras(false, true)).toEqual({ blink: true, breathe: false, earFlicks: false, tailSwish: false, followPointer: false });
  });
  it('looks toward a point, limited to −1…1; with no card he looks ahead (review focus 5)', () => {
    const me = { left: 100, top: 100, width: 100, height: 100, right: 200, bottom: 200, x: 100, y: 100, toJSON() {} } as DOMRect;
    expect(gazeToward(me, { x: 1000, y: 150 })).toEqual({ x: 1, y: expect.any(Number) });
    expect(gazeToward(me, null)).toEqual({ x: 0, y: 0 });
  });
});
```

Add to `useRig.test.tsx`:

```tsx
  it('calm: no ear flicks while a question is up', () => {
    const { container } = render(<Truffle alive calm expression="neutral" />);
    const ear = () => (container.querySelector('[data-part="ear-l"]') as SVGGElement).style.transform;
    const before = ear();
    act(() => run(60 * 9)); // nine seconds of frames
    expect(ear()).toBe(before);
  });
```

  This test assumes the idle scheduler is frame-driven, not on timers, so `run` advances it. Use frame time from the rAF timestamp.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **`behaviour.ts`:** pure functions as specified. `gazeToward` divides the offset from the centre of `from` by 1.1 × its width/height and clamps.
  - **`useRig`:**
    - schedule blinks and ear flicks by frame time (`nextBlinkMs`/`nextEarFlickMs`);
    - blinking adds a 170 ms `blinkK` 0→1→0 to `lidTop` when painting;
    - ear flicks briefly add ±16° to the target ear;
    - breathing gives the body `translate(0, -sin(t*2.1)*0.24) scale(1, 1+sin*0.004)` and the head a −0.7·sin offset;
    - the tail swishes as `rotate(sin(t*2.3)*8deg)`, or `sin(t*1.1)*3` while purring.
  - **Gaze:**
    - when `followPointer`, the latest `pointermove` on `document` (one shared listener per Truffle, removed on unmount) feeds `gazeToward(svg rect, pointer)`;
    - otherwise, while calm, gaze goes toward `cardCentre()`, recomputed every 500 ms;
    - otherwise gaze returns to centre.
  - `Truffle` takes `calm?: boolean` and passes it in. The `lookAt` prop still adds to the tilt.
- [ ] **Step 4: Run them.** `npx vitest run src/ui/truffle` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat: Truffle breathes, blinks, flicks an ear and watches; calm while a question is up"`

### Task 6: Touch

**Files:**
- Modify: `src/ui/truffle/behaviour.ts` (gesture classifier), `src/ui/truffle/Truffle.tsx` (`onPart`), `src/ui/Pet.tsx`, `src/audio/sfx.ts`, `src/styles.css`, `src/app/HomeScreen.tsx`
- Test: `src/ui/truffle/behaviour.test.ts`, `src/ui/pet.test.tsx` (create)

**Interfaces:**
- Produces:
  - `export function classifyGesture(g: { part: 'head' | 'body' | 'tail'; travelled: number; ms: number }): 'stroke' | 'tapHead' | 'tapTail' | null`. A stroke is `travelled ≥ 50` on the head or body; a tap is `ms < 350 && travelled < 12`.
  - `startPurr(): void` and `stopPurr(): void` in `sfx.ts`. These are a synthesised purr: a 27 Hz sawtooth through a 170 Hz low-pass, with gain wobbling at 0.9 Hz, as in the demo. They respect `setSfxEnabled`.
  - `Pet` props: `{ kid, mood?, bubble?, size?, lookAt?, bounce?, alive?: boolean (default true), calm?: boolean, react?: Reaction | null, touch?: boolean (default true) }`.

- [ ] **Step 1: Write the failing tests**

```ts
// append to behaviour.test.ts
import { classifyGesture } from './behaviour';
describe('touch (spec §4.5)', () => {
  it('a drag across him is a stroke; a quick touch is a tap on the part touched', () => {
    expect(classifyGesture({ part: 'head', travelled: 80, ms: 600 })).toBe('stroke');
    expect(classifyGesture({ part: 'head', travelled: 4, ms: 120 })).toBe('tapHead');
    expect(classifyGesture({ part: 'tail', travelled: 3, ms: 150 })).toBe('tapTail');
    expect(classifyGesture({ part: 'body', travelled: 20, ms: 900 })).toBeNull(); // a press that went nowhere
  });
});
```

```tsx
// src/ui/pet.test.tsx
import { fireEvent, render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../types';
import { Pet } from './Pet';

vi.mock('../audio/sfx', () => ({ playSfx: vi.fn(), startPurr: vi.fn(), stopPurr: vi.fn() }));
import { startPurr } from '../audio/sfx';

const tap = (el: Element) => { fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: 10, clientY: 10, pointerId: 1 }); };

describe('touching Truffle (spec §4.5)', () => {
  it('a tap on his head: a grumpy 哼！', () => {
    const { container } = render(<Pet kid={DEFAULT_KID} />);
    tap(container.querySelector('[data-part="headpos"]')!);
    expect(container.querySelector('.pet__bubble')!.textContent).toContain('哼');
  });
  it('a tap on his tail: 喵！', () => {
    const { container } = render(<Pet kid={DEFAULT_KID} />);
    tap(container.querySelector('[data-part="tail"]')!);
    expect(container.querySelector('.pet__bubble')!.textContent).toContain('喵');
  });
  it('stroking him: he purrs and hearts float up (drawn, not emoji)', () => {
    const { container } = render(<Pet kid={DEFAULT_KID} />);
    const head = container.querySelector('[data-part="headpos"]')!;
    fireEvent.pointerDown(head, { clientX: 0, clientY: 0, pointerId: 1 });
    for (let x = 10; x <= 90; x += 10) fireEvent.pointerMove(head, { clientX: x, clientY: 0, pointerId: 1 });
    expect(startPurr).toHaveBeenCalled();
    expect(container.querySelector('.pet__heart svg')).toBeTruthy();
  });
  it('touch is ignored while calm (review focus 3)', () => {
    const { container } = render(<Pet kid={DEFAULT_KID} calm />);
    tap(container.querySelector('[data-part="headpos"]')!);
    expect(container.querySelector('.pet__bubble')).toBeNull();
  });
});
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **`Truffle`:** `onPart` attaches `onPointerDown` to the `headpos`, `body` and `tail` groups (all with `pointer-events: all` via CSS `.truffle--touchable [data-part="headpos"], …`). It calls `onPart(part, e)`.
  - **`Pet`:**
    - track pointer-down (part, start time, last position, travelled) on the `.pet` element with pointer capture;
    - on move, if `classifyGesture(...) === 'stroke'` and not calm: purr. Call `startPurr()`, set an internal `react` to `{ kind: 'purr', key }`, re-arm a 800 ms timer that calls `stopPurr()` and shows the bubble 呼噜～ for 1.2 s, and spawn an SVG heart `<span class="pet__heart"><svg viewBox="0 0 24 24"><path d="M12 21 C5 15 2 11 2 7.5 C2 4.5 4.5 2 7.5 2 C9.5 2 11 3 12 4.5 C13 3 14.5 2 16.5 2 C19.5 2 22 4.5 22 7.5 C22 11 19 15 12 21Z" fill="#ef6f6c"/></svg></span>` about every 6th move;
    - on up, a `tapHead` plays `react: { kind: 'flinch' }` then `TRACKS.shake` (`react` key +1 after 140 ms; `REACTIONS.flinch` holds grumpy) and shows the bubble 哼！ for 1.1 s; a `tapTail` plays `react: { kind: 'pounce' }` and shows 喵！ after 450 ms;
    - when `calm` or `touch === false`, do nothing;
    - the touch bubble overrides `bubble` while showing.
  - **Combining reactions:** the parent's `react` prop wins over the touch reaction when its key changes; keep an internal key counter offset, e.g. `1e6 + n`.
  - **CSS:**
    - `.pet__heart { position: absolute; width: 22px; animation: heart-up 1.4s ease-out forwards; pointer-events: none }`;
    - `@keyframes heart-up { from { transform: translateY(0) scale(.6); opacity: 0 } 20% { opacity: 1 } to { transform: translateY(-90px) scale(1.1); opacity: 0 } }`;
    - hearts are hidden under `prefers-reduced-motion`.
  - **Home:**
    - spec §4.5 has touch on Home, but a tap on Truffle opened the wardrobe. Change `HomeScreen`'s `.pet-button` to a plain `div.home__pet-touch` with no `onClick`. The wardrobe stays one tap away on the 松露 tab bar button. Record this as a `Ruling:` and tell the parent in the final message;
    - update the home test that clicks `换装` to click the 松露 tab, keeping its intent (the room is reachable from Home).
- [ ] **Step 4: Run them.** `npx vitest run src/ui src/app` and `npx tsc --noEmit -p .`. Expected: PASS. The `childEmoji` contract passes (the heart is a path).
- [ ] **Step 5: Commit.** `git commit -am "feat: stroke Truffle and he purrs; a tap on his head gets a 哼, a tap on his tail a pounce"`

### Task 7: Truffle in the lessons, placement, celebration and Home

**Files:**
- Modify:
  - `src/activities/flashcards/FlashcardStep.tsx`, `src/activities/choose/UseQuestion.tsx`, `src/activities/components/ComponentsStep.tsx`, `src/activities/writing/WritingStep.tsx`, `src/activities/langdu/LangduStep.tsx`;
  - `src/app/PlacementScreen.tsx`, `src/app/Celebration.tsx`, `src/app/HomeScreen.tsx`;
  - their tests.

**Interfaces:**
- Consumes: `Pet` `calm`/`react` (Task 6); `ReactionKind` (Task 4).
- Produces: per screen, the moments in spec §4.4.

| Screen | calm while | react |
|---|---|---|
| 认一认 | `phase === 'quiz'` | after an answer: `hard` (correct and hard), `right` (correct), `wrong` (missed); `streak` when the combo reaches 3+ after a correct answer; `newWord` when the intro shows |
| 选一选 / 用一用 | `!done` | `right` / `wrong` |
| 字辨 | `!done` | `right` / `wrong` |
| 写一写 | while a character is being written (`charMisses === null`) | `nod` on each correct stroke (hanzi-writer `onCorrectStroke`); `right` when a character is done; `hard` when a new word is finished from memory with no misses |
| 朗读 | while recording | none |
| placement | always (no right or wrong, spec §14) | none |
| Celebration | — | `done` on the stars phase; `excited` once when the chest phase shows; `pounce` when the chest opens |
| Home | never | none (idle and touch only) |

`key` increments per moment, e.g. `useRef` counters or the answer count.

- [ ] **Step 1: Write the failing tests** (one per screen, in each screen's test file, using that file's fixtures). They read `data-expression` and `data-calm`; add `data-calm={calm ? 'true' : undefined}` on the svg in Task 7's Truffle change. Example for 认一认, in `FlashcardStep.test.tsx`:

```tsx
describe('Truffle in 认一认 (spec 2026-10-04 §4.3–4.4)', () => {
  it('is calm while the question is up, and reacts after the answer', () => {
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-calm')).toBe('true');
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    const svg = document.querySelector('.stage__truffle svg.truffle')!;
    expect(svg.getAttribute('data-calm')).toBeNull();
    expect(svg.getAttribute('data-expression')).toBe('curious'); // a wrong answer: curious, never sad
  });
});
```

  The other screens get the same pattern:
  - **选一选 and 字辨:** calm before the answer; `happy` after a right one; `curious` after a wrong one.
  - **写一写:** calm while writing (simulate `quizzes.at(-1)!.onCorrectStroke?.({})`, then `data-expression` is `happy` for the nod); `happy` after `onComplete`.
  - **Placement:** `data-calm` is `true` on every question.
  - **Celebration:** `data-expression` is `joy` at the stars.
  - **朗读:** `data-calm` is `true` while recording.

  The hanzi-writer mock in `WritingStep.test.tsx` must pass `onCorrectStroke` through. Its `quiz` mock stores the options object, so tests can call `onCorrectStroke`.
- [ ] **Step 2: Run them.** `npx vitest run src/activities src/app`. Expected: FAIL.
- [ ] **Step 3: Implement** per the table. In each activity, pass `calm` and `react` to the existing `<Pet …>`:
  - Keep the activity's own `mood` (resting or reaction) as today. `react` drives the motion and the held expression, and `mood` is what he returns to.
  - In `FlashcardStep`, remove the 1-second `reactionOver` timer that cleared the reaction mood. `REACTIONS.*.holdMs` now handles the length, so pass `mood={resting}` during feedback.
  - Record a `Ruling:` that this keeps the old ~1 s behaviour inside the rig.
- [ ] **Step 4: Run them.** `npx vitest run` and `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat: Truffle is calm during questions and reacts after answers, in every lesson, placement and the celebration"`

### Task 8: Check him in WebKit

**Files:**
- Modify: `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts`, `scripts/fit-check.ts` (signature markers)

**Interfaces:**
- Consumes: everything above.
- Produces:
  - stage-cases `case=faces` (from Task 2): every expression × {plain, rabbit, chef, sunglasses, fire tier 3}, with bounding checks.
  - stage-cases `case=alive`: one live `Pet` on a stage. Checks:
    - **Frame time:** the p95 frame interval over 120 frames while idle, then during `react: right`, must be ≤ 20 ms (the same proxy as phase A's ruling).
    - **Rest:** after the reaction ends, the rig transform is at rest.
    - **Calm:** with `calm`, the ears don't move over 4 s.

- [ ] **Step 1:** Add `case=alive` to `page.tsx`: a stage with `<Pet kid={DEFAULT_KID} alive react={{ kind: 'right', key: Number(new URLSearchParams(location.search).get('k') ?? 0) }} />`, and a `calm` variant at `case=alive-calm`. Add the checks to `stage-cases.ts`. Run `npx tsx scripts/stage-cases.ts` and expect a failure only if the loop is janky or stuck. If it is green on the first run, prove the check can fail: temporarily add a busy loop of 30 ms per frame in `useRig`, then remove it.
- [ ] **Step 2:** In `fit-check.ts`, change `signature()` to use `[data-stage]` instead of the stale `.flash`, `.write` and `.components` markers (phase A deferred minor), so screens still dedupe correctly.
- [ ] **Step 3: Run the full sweep and cases.** `npm run fit`. Expected: 0 problems, and stage cases ok. Read `fit-shots/stage-cases/faces.png` and these lesson screenshots at each size:
  - `flashcards-01` (calm);
  - `flashcards-02` (a reaction);
  - `home-yard-00` (idle).
- [ ] **Step 4: Run the suite.** `npx vitest run` and `npx tsc --noEmit -p .`. Expected: all pass.
- [ ] **Step 5: Commit.** `git commit -am "test: WebKit checks Truffle's faces, costumes, frame time and calm"`

---

## Self-review notes

**Spec coverage:**

| Spec item | Task |
|---|---|
| §4.1 rig, parts, seams, parameters, presets, mood map, body motion, costumes riding | 1, 2, 4 |
| §4.2 idle life and gaze | 5 |
| §4.3 calm | 5, 7 |
| §4.4 reaction table | 4, 7 |
| §4.5 touch | 6 |
| §4.7 purr | 6 |
| §4.8 reduced motion | 3–5 |
| §6 no live filters | 2 |
| §6 frame time | 8 |
| §9 tests | throughout |

The paws, talking mouth and personality memory (§4.6) are phase E. Prop moments (§4.5's second half) are phase C.

**Interfaces:** `Reaction` and `ReactionKind` are declared in `timelines.ts` (Task 4); Task 2 accepts the prop but has no behaviour. `Truffle`'s props (`alive`, `expression`, `calm`, `react`, `onPart`) and `Pet`'s props (`alive`, `calm`, `react`, `touch`) are the same names in Tasks 2–7.

**Home touch:** the wardrobe stops opening on a tap of Truffle. This is a visible behaviour change that the parent hears about in the final message (Task 6 ruling).
