# 字己 ZiJi — Sweep of deferred minors

**Goal:** fix the deferred minors from the lesson phases A–D and the stage phases A–E (build report, "Deferred minors" sections), after all phases were deployed (parent, 2026-10-05: "after all phases are complete, sweep for outstanding fixes minor or otherwise and fix them").

**Spec:** docs/superpowers/specs/2026-10-05-ziji-lesson-flow-design.md and docs/superpowers/specs/2026-10-04-ziji-stage-design.md; each item's source is its line in docs/superpowers/2026-10-03-truffle-build-report.md.

## Global Constraints
- Child screens: Chinese only, no emoji (English only on the 认字 card and the feedback sheet after a miss).
- Reduced motion: nothing moves.
- Every layout change is checked in WebKit (`npm run fit`, `scripts/stage-cases.ts`).
- Each fix is RED → GREEN with the whole suite green.

## Items
- **Lesson A:** retry adjacency; 认新字 with no new words; a double tap on the re-shown card; a restored backup's settings migration; pace on a day without new words.
- **Lesson B:** 组句 cuts and measure words; the 搭配 bank (~160); 钓鱼 retries and confusion order; the sheet's pinyin, 了, sentence-clue English; planning speed; pairing from either side; 组句 graded on 好了！.
- **Lesson C:** 'pick the 成语' window; a 成语 retry is the same 成语; re-added school 成语; SessionScreen tidy; near-level hear-and-find distractors.
- **Lesson D:** 写一写 order, skips, redo, a long due word, a single character's own reading.
- **Stage A:** placement 不知道 as the quiet button; the re-run placement's ✕; placement's short prompt data-q; the sweep covers the re-run placement.
- **Stage B / E (Truffle):** no snap between reactions; StoryStep calm; streak hearts, the new-word lean, a ground shadow, 对了！/嗯？ lines; paint skips unchanged values; the finger gaze expires; the last IntersectionObserver entry; sound wakes on the first touch; a touch line is cleared when a question comes up; fewer per-frame allocations; dayMood counts a started day, its dead branch goes; Home's daily save and a prop find use one transaction each (updateKid).
- **Stage C:** a world switch clears the last world's moment; reduced motion read each time; the parrot's hello as Truffle's line; self-started moments make no sound; a hidden-page test.
- **Stage D:** an older goal's icon, a Chinese title edited later, no box on a given goal; the chest's stars prize in the sweep; --surface; the chest-watching Truffle's size.
- **Older (plans 13–14):** a tap on the current stop's name; misread re-marks give one extra day; the chest hint keeps focus; Tab stays in the 字卡 dialog; misplaced comments; the 包子 test; the Skills baseline saves without a change event.

## Rulings
- Card lift at feedback (detail rows) stays: the card makes room for the sheet rather than being covered — cost if wrong: a small jump on two screens.
- Bubble max-width stays inert (nowrap): every bubble line is short — cost if wrong: a long future line overflows.
- Dead CSS overridden by the stage stays — cost if wrong: unused bytes.
- 地 after an adverbial 成语 stays dropped: 一心一意学习 reads naturally — cost if wrong: none.
- The tail tap's "looks at it": the pounce wind-up already leans him toward his tail — cost if wrong: a small missing glance.
- The blocks world's evening torch: the parent judges it from the screenshots.
- Deferred to after the parallel 认新字/beach fixes: the re-shown card's double-tap guard measured with performance.now (the sweep's frozen clock stalls on it); the yard spray origin and kit lift() fill="none".

## Review Focus
1. Reduced motion: the new lean, shadow, hearts and lines do nothing that moves.
2. Two saves of the kid at once (Home's daily save and a prop find): neither is lost.
3. A child's tap or a question arriving mid-reaction: no stuck paw, no stuck bubble, no stuck purr.
4. Parent goal editing for given goals and goals without a Chinese title.
5. The misread extra day across mark → unmark → mark, for recordings saved before the flag.
