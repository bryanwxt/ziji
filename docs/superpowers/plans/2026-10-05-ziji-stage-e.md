# 字己 ZiJi — Stage Phase E: Paws and personality — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Truffle's front paws become parts of their own, so he can do these things:
- wave hello;
- knead when content;
- cover his eyes at a hard question;
- raise a paw or clap at a right answer;
- swat when he pounces.

His mouth moves while the iPad speaks. He greets the child at the start of a lesson. On Home he sulks briefly after missed days and is extra bouncy on streak days. His idle life follows his mood.

**Architecture:**
- **Art:** `parts.ts` cuts the two front paws out of `BODY` (`PAW_L`, `PAW_R`, `TORSO`). `Truffle.tsx` draws them in front of the head, so he can cover his eyes.
- **Paw tracks:** `timelines.ts` gains paw tracks (`PawPose`), and reactions name the paw track that goes with them. `useRig` paints the paws each frame, next to the body track.
- **Talking:** `speech.ts` tells listeners when speech starts and ends, and the rig opens and closes the mouth while it speaks.
- **Greeting:** a tiny `greeting.ts` asks the next live `Pet` to greet once.
- **Daily mood:** Home decides the day's greeting (sulk or bounce) once a day from the sessions, and remembers it on the kid.

**Tech Stack:** Preact 10, TS 5.9, Vitest 4, playwright-core WebKit.

**Spec:** docs/superpowers/specs/2026-10-04-ziji-stage-design.md (§4.6, plus §4.1 for parts, §4.3 the calm rule, §4.8 reduced motion, §6 performance)

## Global Constraints
- **Paws:** "wave hello at the start; knead when content; cover his eyes when a question is hard; clap or raise a paw on a right answer; swat a tile."
- **Talking:** "his mouth moves while the iPad speaks."
- **Greeting and memory:** "He greets the child at the start of a lesson. He sulks briefly if days were missed, and is extra bouncy on streak days. His idle choices follow his mood."
- **Reduced motion:** nothing moves. Paws stay down and the mouth doesn't flap.
- **Calm rule:** while a question is up, no idle kneading. A reaction sent during calm still plays (spec §4.3).
- **Performance:** at most 8 ms of script and layout per frame, idle and reacting (the stage case).
- **Child screens:** Chinese only, no emoji. No recorded meows.

## Rulings this plan makes
- **The paws sit in front of the head** (drawn after it), so covering his eyes works. At rest they sit at his feet, where they are now.
- **A "hard question"** is one that comes back after a miss (a retry), so he covers his eyes and peeks when it appears. *Cost if wrong:* he never covers his eyes on a first try.
- **"Swat a tile"** rides on his pounce: the tail tap, and the prop moments that pounce.
- **The greeting** is a one-shot request that the next live Pet picks up, so no lesson screen needs a new prop. *Cost if wrong:* if the first screen's Truffle mounts late, the greeting can land on the second.
- **The day's mood greeting** (a sulk or a bounce) happens once a day on Home, remembered as `kid.greetedOn`.

## Review Focus
1. **Reduced motion:** no paw moves, no mouth flapping, no idle kneading. Greetings and the daily mood show only as a bubble line.
2. **A paw move cut short by another reaction:** the paws end at rest, never stuck raised.
3. **A costume with a cape or dress:** the paws draw over it, not hidden.
4. **Speech that errors or is cancelled:** the mouth stops; nothing is stuck open.
5. **A day with no sessions before** (a new child): no sulk.

---

### Task 1: The paws are parts

**Files:** `src/ui/truffle/parts.ts`, `src/ui/truffle/Truffle.tsx`, `src/ui/truffle/Truffle.test.tsx`

- [ ] **Step 1: Failing test.**
  - Truffle renders `[data-part="paw-l"]` and `[data-part="paw-r"]` after `[data-part="headpos"]` in document order.
  - `[data-part="body"]` no longer contains the paw paths.
  - Each paw keeps its mitten shape (`M122 262…`, `M198 262…`).
- [ ] **Step 2: Run it.**
  - Run: `npx vitest run src/ui/truffle/Truffle.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Add `PAW_L`, `PAW_R` and `TORSO` to `parts.ts` (TORSO is BODY minus the two paw paths; `BODY` stays as before for other users).
  - Truffle draws `TORSO` as the body.
  - After the head, it draws `<g data-part="paw-l" style="transform-origin:138px 266px">` and the same for `paw-r` at 182px 266px.
- [ ] **Step 4: Run it.**
  - Run: `npx vitest run src/ui/truffle`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: Truffle's front paws are parts of their own`

### Task 2: Paw tracks and which reaction uses which

**Files:** `src/ui/truffle/timelines.ts`, `src/ui/truffle/timelines.test.ts`

**Interfaces:**
- `PawPose { lx, ly, lr, rx, ry, rr }` (offsets in svg units and degrees), with `PAW_REST`.
- `PAW_TRACKS: wave, raise, clap, knead, cover, swat`. Each is `(t) => PawPose | null` and ends at rest.
- `REACTIONS[kind].paws?: keyof typeof PAW_TRACKS`.
- New kinds:
  - `hello`: happy, a hop, wave;
  - `peek`: embarrassed, no body track, cover;
  - `huff`: grumpy, shake (the sulk);
  - `bouncy`: joy, bigHop, wave.
- Mapping: right raise, hard clap, streak knead, purr knead, pounce swat, done clap.

- [ ] **Step 1: Failing tests.**
  - Every paw track starts and ends at rest and returns null after it ends.
  - `cover` brings both paws to the eyes (`ly` and `ry` ≤ −140).
  - `wave` moves only the right paw.
  - The mapping: `REACTIONS.right.paws === 'raise'`, `hello.paws === 'wave'`, `peek.paws === 'cover'`, `pounce.paws === 'swat'`, `streak.paws === 'knead'`, and so on.
- [ ] **Step 2: Run them.**
  - Expected: FAIL.
- [ ] **Step 3: Implement** with keyframes, like `track()`.
- [ ] **Step 4: Run them.**
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: paw moves — wave, raise, clap, knead, cover, swat — with the reactions that use them`

### Task 3: The rig paints the paws

**Files:** `src/ui/truffle/useRig.ts`, `src/ui/truffle/useRig.test.tsx`

- [ ] **Step 1: Failing tests.**
  - After a `hello` reaction, the right paw's transform moves during the wave and is back to rest (empty) after it.
  - With reduced motion the paws never move.
  - A reaction that replaces a paw move mid-way leaves the paws at rest once the new one ends.
- [ ] **Step 2: Run them.**
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - A `paws` ref of `{ fn, start }`, set from `REACTIONS[k].paws` (not under reduced motion).
  - Each frame, `paint` sets `paw-l` and `paw-r` to `translate(dx dy) rotate(r)` around each paw's origin, or clears them at rest.
- [ ] **Step 4: Run them.**
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: the rig moves Truffle's paws with his reactions`

### Task 4: Talking

**Files:** `src/audio/speech.ts`, `src/audio/speech.test.ts`, `src/ui/truffle/useRig.ts`, `src/ui/truffle/useRig.test.tsx`

**Interfaces:**
- `onSpeaking(fn: (on: boolean) => void): () => void`.
- An utterance's `onstart` sets on; `onend` and `onerror` set off; `stopSpeaking` and `cancel` set off.

- [ ] **Step 1: Failing tests.**
  - `speak()` fires on then off with the utterance events.
  - `stopSpeaking()` fires off.
  - In the rig, while speaking the mouth opens and closes (the `mouth` d changes between frames). After the end it settles. Not with reduced motion.
- [ ] **Step 2: Run them.**
  - Expected: FAIL.
- [ ] **Step 3: Implement.** While speaking: `mouthOpen = max(face, 0.12 + 0.38 * |sin(t · 13)|)`.
- [ ] **Step 4: Run them.**
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: Truffle's mouth moves while the iPad speaks`

### Task 5: Personality and memory

**Files:** create `src/ui/truffle/greeting.ts`; modify `src/ui/Pet.tsx`, `src/app/SessionScreen.tsx`, `src/app/HomeScreen.tsx`, `src/types.ts` (`KidState.greetedOn?: string`), `src/ui/truffle/useRig.ts` (idle knead by mood); tests in `src/ui/Pet.test.tsx` (or the existing Pet test), `src/app/home.test.tsx`, `src/app/SessionScreen.test.tsx`

**Interfaces:**
- `requestGreeting(line: string)`;
- `takeGreeting(): string | null`;
- `dayMood(sessions, today): 'missed' | 'streak' | 'plain'`. It returns:
  - `missed` when the last completed session is before yesterday;
  - `streak` when yesterday was completed;
  - `plain` otherwise, and for a new child.

- [ ] **Step 1: Failing tests.**
  - **Lesson start:** a fresh lesson's first Truffle waves (`data-react="hello"`) and says `你好！我们开始吧！`. A resumed lesson does not.
  - **Missed days:** Home after missed days shows a huff and `你去哪儿了？` once that day (not again after a re-render or the next visit that day).
  - **Streak:** Home on a streak day shows `bouncy` and `又见面了！`.
  - **New child:** a new child gets neither.
  - **Idle kneading:** with a pleased mood, an idle knead plays after the idle interval (fake timers), not while calm and not with reduced motion.
- [ ] **Step 2: Run them.**
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them.**
  - Run: `npx vitest run src/ui src/app`
  - Expected: PASS.
- [ ] **Step 5: Commit.** `feat: Truffle greets him, sulks after missed days, bounces on streak days, kneads when content`

### Task 6: WebKit

- [ ] **Step 1: Faces sheet.** Add a paw row (each paw track at its peak) to the `faces` stage case, and check that the paws stay inside his box.
- [ ] **Step 2: Frame budget.** The `alive` case also plays `hello` and `peek` and checks ≤ 8 ms of work per frame.
- [ ] **Step 3: Run the stage cases and the sweep.**
  - Run: `npx tsx scripts/stage-cases.ts`
  - Run: `npm run fit`
  - Expected: 0 problems.
- [ ] **Step 4: Run the suite.**
  - Run: `npx vitest run`
  - Expected: green.
- [ ] **Step 5: Commit.** `test: paws and talking checked in WebKit`
