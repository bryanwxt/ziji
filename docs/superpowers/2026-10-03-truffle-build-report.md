# 字己 Truffle redesign — build report (plans 1–3)

Branch `redesign/truffle`; 271 tests passing; each plan had a fresh whole-branch review and one fix pass.

## Plan 1-look

### Rulings
- Task 2: Ruling: parts.ts generated from the approved reference geometry before the failing test (generated data — TDD generated-code exception); component itself was test-first — cost if wrong: none
- Task 2: Ruling: Step 5 visual check folded into Task 5's in-app check (a scratch page would only re-render the reference markup) — cost if wrong: a visual issue found one task later
- Task 4: Ruling: added on*pointer handler props to jsdom in src/test/setup.ts — Preact picks event-name casing from 'onpointerdown' in element; jsdom lacks it, browsers have it — cost if wrong: none (test-only)
- Task 4: Ruling: celebration tests hold with real timers (1.3 s waits) instead of fake timers — fake timers stall fake-indexeddb — cost if wrong: ~3 s slower suite
- Task 5: Ruling: FlashResult shape test updated to include hard:false — plan's interface adds `hard` — cost if wrong: none
- Task 5: Ruling: PetSetup temporary Truffle keeps the name input until Task 6; old test drops the colour assertions — PET_COLORS removed per plan — cost if wrong: none (Task 6 replaces)
- Task 5: Ruling: DEFAULT_KID.petName '小龙'→'松露' for new kids; Home shows 松露 fixed; path step renamed 认一认 with 字 icon — dragon wording gone — cost if wrong: copy only
- Task 5: Ruling: Celebration seq no longer carries `known` (only the evolve phase used it) — cost if wrong: none
- Task 8: Ruling: reduced motion not emulatable in the browser pane — covered by closeupAllowed unit test + @media rules for .truffle--bounce/.closeup; hold ring still fills (spec) — cost if wrong: a motion effect showing under reduced motion
- Task 8: Ruling: hard-one close-up not triggered live (needs a relearning card) — covered by FlashcardStep test — cost if wrong: overlay layout untested visually
- Final: Ruling: word-of-the-day pinyin context finding — not reproducible: built-in readings were generated with pinyin-pro (0 of 600 differ); the test passed before any fix so it was dropped — cost if wrong: a parent single-character word's custom reading could differ on the card
- Final: Ruling: hanzi vs swash overlap (declined: not rendered) — walkthrough at 768×1024 and 1024×768 showed swashes behind content with hanzi on clean panels — cost if wrong: a swash under a heading on some screen
- Final: Ruling: grain filter per Truffle instance vs spec "one shared definition" (declined: perf) — ≤2 Truffles on screen; per-instance ids avoid the hidden-def clipping bug seen with the dragon — cost if wrong: jank on an old iPad during the close-up
- Final: Ruling: iOS long-press / haptic touch on HoldButton (declined: needs device) — contextmenu prevented, touch-action none — check on the real iPad — cost if wrong: hold cancelled by a system gesture
- Final: Ruling: same-session retries count as hard (declined: matches spec) — stands; cooldown limits it — cost if wrong: a few extra 咦！
- Final: Ruling: word of the day changes once a session starts (declined: plan-defined) — stands — cost if wrong: mild surprise
- Final: Ruling: pre-existing white-on-orange in .combo-banner/.mic-btn (declined: not changed here) — stands — cost if wrong: low-contrast banner text
- Final: Ruling: Vite chunk-size warning (declined) — pre-existing (pinyin-pro dictionary, precached) — cost if wrong: none

### Fixed in the final review
- reduced-motion hold ring jumps full — styles.test "the hold ring still fills over 1.2 s with reduced motion" RED→GREEN, suite 244/244
- parent reward emoji picker unstyled/no selected state — parentA "marks the chosen emoji as pressed" + styles.test swatch rules RED→GREEN, suite 244/244
- small paper text on red fails contrast — styles.test "small text on the red celebration block gets an ink shadow" RED→GREEN, suite 244/244
- side-eye bubble said 再想想 with the answer already shown → 记住它！ — FlashcardStep "says remember it…" RED→GREEN, suite 244/244
- writing mixed message & per-char wow — WritingStep "stays kind after a messy character…", "never side-eyes a hard character" RED→GREEN, suite 244/244
- bubbles had no pinyin — widgets "shows pinyin above the bubble words" RED→GREEN, suite 244/244
- reached-goal green + radical highlight lost — styles.test "keeps the highlights…" RED→GREEN, suite 244/244
- leftover dragon copy + old theme colour — styles.test "manifest, theme colour and settings copy" RED→GREEN, suite 244/244

### Deferred minors
- reactions last the whole feedback phase (REACTION_MS unused; spec says ~1 s)
- 哼，来吧！/喵！ bubbles never shown; close-up for a hard writing word not wired; close-up shows whole Truffle not just face
- ink-cascade leftovers — sticker gold/dashed (replaced in plan 2), speak--big/fishtile blue-edge shadows, pale press shadows, parent links now ink, dead .choice.is-right/.is-oops selectors, Scene band prop no-op
- HoldButton — no onBlur cancel for keyboard, multi-touch lift cancels, ring CSS ignores holdMs
- test gaps — 1199 ms release, keyup cancel, Closeup auto-hide, SessionScreen cooldown wiring
- built-in single-char readings 了 liǎo / 得 dé (dictionary citation readings) vs the everyday le/de a P2 child meets — content question
- a tap on the chest art does nothing (children used to tapping); consider a shake + hold hint

## Plan 2-powers

### Rulings
- Task 3: Ruling: the power character moved from the cape (hidden behind the body) to a chest emblem on the front layer; test asserts .truffle__cape in back and .truffle__emblem in front — spec §5 "cape or pattern" satisfied, character visible — cost if wrong: art placement only
- Task 3: Ruling: 💧 mark moved off the cheek (read as a tear in the visual check) to above the ear; only 💗 sits on the cheek — cost if wrong: none
- Task 5: Ruling: home.test edit initially duplicated a Wardrobe block (anchor matched an earlier describe) — repaired before commit; obsolete StickerBook tests removed (replaced by CollectionScreen tests) — cost if wrong: none
- Task 7: Ruling: powers earned before this release unlock at the next completed session's celebration (not retroactively on Home) — keeps one celebratory moment per tier — cost if wrong: an existing child waits one session to see powers
- Final: Ruling: spec §6 "power mastered" badge not added — power mastery is already celebrated by the tier-3 power-up (full form + 新能力); radical-family badges stay as collection badges — cost if wrong: no separate 🏅 for mastering a power
- Final: Ruling: 600-card collection paint/scroll perf on an older iPad (declined: no device) — no stagger animation, memoised list; check on the real iPad — cost if wrong: janky scrolling on the collection
- Final: Ruling: grain filter covers the whole Truffle at tier ≥ 2 (declined) — Truffle ≤ 360px, not a large screen area per spec §12 — cost if wrong: slower Truffle render on an old iPad
- Final: Ruling: mark/aura/cape placement vs accessories (declined: not rendered) — walkthrough + costume gallery rendered tiers with outfits and accessories; no clipping seen — cost if wrong: an overlap on some combination
- Final: Ruling: fire/metal go 0 → tier 2 at 3 known (declined: plan rule) — stands — cost if wrong: tier 1 skipped for tiny families
- Final: Ruling: example word only in the big card view, not on the small card (declined: plan decision) — small cards stay legible at 104px — cost if wrong: one extra tap to see the example
- Final: Ruling: uncaught no-power cards show ？ (declined: cosmetic) — stands — cost if wrong: none
- Final: Ruling: walkthrough landscape/reduced-motion/tier-in-lesson not ledgered (declined: process) — tiers 1–3 checked on Home/room; landscape + reduced motion re-checked in plan 3's walkthrough — cost if wrong: an unseen layout issue

### Fixed in the final review
- review-focus 4 untested — celebration "saves every new tier, shows the highest, and only then offers 继续" added; GREEN on first run (behaviour already correct; coverage gap only), suite 266/266
- failed save strands the child — celebration "never strands the child if saving fails" + "still lets the child continue if the chest cannot be saved" RED→GREEN, suite 266/266
- gold-card stars invisible — styles.test "stars on gold cards are ink" RED→GREEN, suite 266/266
- 金卡 chip off-screen — home "puts the 金卡 filter right after 全部" RED→GREEN, suite 266/266
- close-up drops his power — FlashcardStep "shows his power in the close-up" RED→GREEN, suite 266/266
- "金 = 金" — radicals "has a meaning for 金" RED→GREEN, suite 266/266

### Deferred minors
- 400 of 600 cards are "rare" (levels 2 and 3); rare frame hard to see
- card dialog lacks aria-modal / focus management / Escape
- ~525 disabled 未收集 buttons are noisy for VoiceOver; tapping a face-down card gives no feedback
- room tabs lack aria-controls/arrow keys; power row label omits tier/ready state
- power mark drawn outside the head tilt group (drifts ~6px on lookAt)
- dead sticker-book CSS (.book, .family*, .sticker*)
- test gaps — newTiers with seen > computed, zero-known collection, gold filter, tapping a caught card, unknown activePower

## Plan 3-costumes

### Rulings
- Task 1: Ruling: chest logic moved from pet.ts to costumes.ts; pet.test chest cases deleted (superseded by costumes.test); celebration prize test now expects the first-chest zodiac onesie (龙 default) — spec §7 first-chest rule — cost if wrong: none
- Task 2: Ruling: costumeLayer gained `back` (hero cape behind the body) and `hidesEars` (Truffle's ears hidden under onesie hoods — gallery showed grey ear tips poking through; test RED→GREEN) — cost if wrong: none
- Task 2: Ruling: rabbit ears drawn as lop ears down the sides — Truffle's viewBox top is y=20, upright ears would clip — cost if wrong: art only
- Task 3: Ruling: styles.test 'no dragon' contract narrowed to pet-dragon wording — the zodiac option 'Dragon 龙' is legitimate — cost if wrong: none
- Task 4: Ruling: all 16 accessories shown (locked ones greyed + disabled) instead of owned-only — consistent with locked costume silhouettes (spec §7 room) — cost if wrong: a longer grid
- Task 5: Ruling: reduced motion still not emulatable in the pane; landscape room check skipped (same grid CSS as the collection checked in plan 2) — cost if wrong: an unseen layout issue in landscape
- Final: Ruling: outfits hide head-top accessories (spec only says onesies hide the slot) — every outfit has its own head piece; a 🎩 over the chef hat looked broken — cost if wrong: a child can't combine e.g. explorer + 👑
- Final: Ruling: locked costumes shown as a 🔒 swatch + name, not Truffle silhouettes (spec §7) — 20 thumbnail Truffles would mean 20 grain filters on an old iPad — cost if wrong: the child can't preview a locked costume's look
- Final: Ruling: newly won costumes are not auto-worn (declined: UX) — the prize shows Truffle wearing it; the child chooses in his room — cost if wrong: he must visit the room to wear it
- Final: Ruling: zodiac label after the first chest still describes the gift (declined: UX) — stands — cost if wrong: a parent changes it expecting a new onesie
- Final: Ruling: default 龙 on the existing install unless Zodiac is set first (declined) — parent asked to set it before release — cost if wrong: the one-time gift is the wrong animal
- Final: Ruling: power marks overlap hats / tier-3 emblem covers the hero 字 (declined: spec "power always shows") — stands — cost if wrong: a busy-looking combination
- Final: Ruling: tier-2 aura/cape past the viewBox, Wardrobe save without error handling, room tabs without aria-controls (declined: pre-existing) — stand — cost if wrong: minor
- Final: Ruling: reduced motion and landscape room not exercised (declined) — not emulatable / same grid CSS as collection — cost if wrong: an unseen layout issue
- Final: Ruling: art taste (squat wizard hat, band bicorne, lop rabbit) (declined) — stands — cost if wrong: art polish

### Fixed in the final review
- power-up drops the costume and shows the hidden accessory — celebration "keeps the onesie on and the hidden accessory hidden" RED→GREEN, suite 271/271
- costume names without pinyin — home "shows pinyin on costume names, toggles accessories, and explains…" RED→GREEN, suite 271/271
- accessory tap toggle + aria-pressed, note moved into 小东西 — same test RED→GREEN, suite 271/271
- hat on a hat — costumes "a onesie hides the accessory" (now also: outfits hide head-top accessories; glasses/scarf still show) RED→GREEN, suite 271/271
- unknown zodiac / unknown owned ids skipping or corrupting the first-chest gift — costumes "ignores an unknown zodiac or unknown owned ids" RED→GREEN, suite 271/271

### Deferred minors
- owned costumes show a colour dot, not a preview of the look
- monkey ears / dragon & horse tips a few units past the 260×270 viewBox (visible only because overflow is visible; grain trims the outer half-stroke)
- pixel outfit lacks the planned square glasses
- types.ts imports ZodiacId from fun/costumes (type-only cycle); ChestResult costume id typed as string
- plan 3 text says first chest needs "no lastChestDate" — contradicts its own Review Focus; code follows the spec
- test gaps — same-seed replay after first chest, 👑 reappearing after the onesie comes off, backup asserting ownedCostumes/outfit defaults, locked accessories disabled

## Plan 4 — ink icons + accessories v2

### Rulings
- Task 1: Ruling: tests written for emoji accessories / onesie-hiding / no-hat-on-hat updated to the v2 rules (spec §13 supersedes); room accessory buttons now show the Chinese name with pinyin (art arrives in Task 2) — cost if wrong: none
- Task 2: Ruling: accessory layers split into back/under/face/over (plan said back/front) — neck items must sit under the chin, held items over everything, face items tilt with the head — cost if wrong: none
- Task 3: Ruling: icon test checks the plan's 25 named icons (my first draft asserted ≥26, a miscount) — cost if wrong: none
- Task 4: Ruling: burst particle glyph ★ swapped for ✧ (★ counts as emoji); accessory chest prize now shows Truffle wearing it (covered by a new celebration test, green on first run — the raw-id text window existed only between T1 and T4 on this branch); emoji-text assertions in older tests repointed to the icons — cost if wrong: none
- Task 5: Ruling: InkIcon gained data-icon so tests can assert which icon shows (replacing emoji text assertions) — cost if wrong: none
- Task 6: Ruling: stored kid data keeps legacy emoji until the next save (normalizeKid migrates on every read) — no write-on-read — cost if wrong: none (reads are always normalized)
- Final: Ruling: back items (wings/jetpack/backpack) drawn over the power and hero capes (plan text contradicted itself) — the accessory he chose stays fully visible; the cape hem still shows — cost if wrong: less cape visible
- Final: Ruling: reward-goal emoji on Home (declined: spec §13 keeps parent-chosen emoji) — stands — cost if wrong: one emoji on a child screen
- Final: Ruling: parent-entered words containing emoji (declined) — parent content, out of scope — cost if wrong: an emoji in a word list
- Final: Ruling: one accessory at a time across slots (declined: spec silent) — stands; room note says 一次戴一个小东西 — cost if wrong: a child wanting glasses + scarf together
- Final: Ruling: art taste — bow tie under the chin, backpack size (declined) — parent reviewed the gallery — cost if wrong: art polish
- Final: Ruling: downgrade to main after ids are saved (declined) — forward-only rollout (prompt-mode SW) — cost if wrong: emoji-era code showing ids as text after a rollback
- Final: Ruling: plan-5 WIP on the branch (declined: out of range) — plan 5 tasks 1–2 since committed green; branch builds — cost if wrong: none

### Fixed in the final review
- medal hidden by the tier-3 emblem — Truffle.test "the gold medal and the tier-3 power emblem do not overlap" RED→GREEN, suite 290/290
- balloon/kite hide the power mark — "the power mark sits on the left, clear of held items" RED→GREEN, suite 290/290
- unreadable room thumbnails — "room thumbnails are cropped tightly to each accessory, without the paw" RED→GREEN, suite 290/290
- normalizeKid crash on malformed data — repo "does not crash on a malformed accessory list" RED→GREEN, suite 290/290
- 不戴 in the face row — home "shows each accessory as its own ink drawing…" (不戴 outside slot sections) RED→GREEN, suite 290/290

### Deferred minors
- dash/wind mark lands on a left wing / jetpack tank
- AccessoryDef.py unused (Label derives pinyin; 星星 shows xīng xīng not xīngxing)
- emoji contract test scans .ts/.tsx only (JSON/CSS/index.html clean today but unguarded)
- leftover CSS (.loading font-size, .fishtile__badge font-size, .zika__stars letter-spacing, .prize 130px line box)
- wings / jetpack room thumbnails are two separate small shapes
- 一 offers yí as a wrong pinyin option though tone sandhi makes yí a real reading (fixed in plan 5)

## Plan 5 — fairer placement, writing cues, pinyin over each character

### Rulings
- Task 1: Ruling: committed with PlacementScreen still on the old API (fixed in Task 2, the next commit) — task test is the placement suite — cost if wrong: one non-building intermediate commit
- Parent request: Ruling: per-character pinyin in Label (one 1.3em slot per character, sr-only full text for multi-cell labels) and 松露 labelled so the home corner lines up — added at the parent's request ("align the pinyin with the words", "top right corner is off") — cost if wrong: one CSS/markup revert; five-letter syllables (chéng) still widen their slot slightly
- Parent request: Ruling: placement-seeded cards get first rechecks spread over days 7–28 (hardest first) instead of all at day 14 — a 75-word placement otherwise lands 75 reviews on one day and pauses new words; raised in the SRS answer, parent replied "ok" — cost if wrong: easy words wait up to 4 weeks for a recheck
- Task 3: Ruling: added blankedPy + Label py prop — 子 alone reads zǐ but in 儿子 it is zi, so the blank line takes the example's own syllables (falls back to auto when counts differ) — cost if wrong: one optional prop
- Final: Ruling: KID_MEANING curates only the top ~300 characters; ranks 301–600 rely on the grammar/length filter — the cue is a hint beside pinyin and the spoken example — cost if wrong: a few odd English words on rarer characters

### Fixed in the final review
- misleading first-sense meanings (他 "other", 呢 "wool") — curated KID_MEANING + grammar/length filter, tests 'uses kid meanings…' + 'drops grammar labels…' RED→GREEN, suite 312/312
- doubled example blanks — 'prefers a word where the character appears once' + 'a doubled word is still said aloud…' RED→GREEN, suite 312/312
- example with a different reading — 'skips a word that uses a different reading…' RED→GREEN (neutral tone of the same syllable still counts), suite 312/312
- placement double tap — 'a double tap answers once…' RED→GREEN (350 ms tap guard, data-ready; tests pass tapGuardMs=0 or wait for ready), suite 312/312

### Deferred minors
- the readable copy of a blanked word says '＿半' to screen readers (underscore)
- neutral-tone distractors (爸 offered "ba", 妈 "ma") can make him hesitate
- parent-entered meanings with full-width separators — now handled by the split, kept as a note since parents can't enter meanings yet
- with 300+ seeded characters, two skipped days can push dues past the 40 pause (pause design, predates this plan)
- builtin.json data errors — 了 liǎo, 包子 bāo zǐ
- "你已经认识 0 个字了！" for a child who knows nothing could be kinder; no exit from a placement re-run started in Settings

## Plan 6 — the journey: ink worlds

### Rulings
- Task 1: Ruling: repo.test needed normalizeKid added to its import (brief's test assumed it) — test-only — cost if wrong: none
- Task 2: Ruling: styles contract for .world-scene split into two order-independent matches — the brief's regex required pointer-events before z-index, contradicting the brief's own CSS — cost if wrong: none
- Task 2: Ruling: gallery found a seam (wash stopped at y=300), flat strips (bottom 89 units = plain grass) and lanterns/moon over the moon base — fixed: washes cover the full canvas, evening sky has a wavy two-tone edge, per-world STRIP_VIEW (120-unit band, xMidYMid slice) replaces the brief's single '0 300 360 180', timeLayers(t, world?) gives space stars only (tests added RED→GREEN) — cost if wrong: art tweaks
- Task 2: Ruling: dino redrawn with a head (eye, smile, cheek, spots) per the brief; other scenes ported from the mockup unchanged — cost if wrong: art polish
- Task 3: Ruling: Home keeps the journey-updated kid in local state (journeyKid) until the app refresh lands — the update is saved before the card shows, and tests' refresh is a no-op — cost if wrong: none
- Task 3: Ruling: browser check found the world stretched over the whole scrolling page (1462px) and Truffle's bubble wrapping mid-word — .world-scene is position: fixed (bottom 80px on Home, above the sticky tab bar) and bubble label cells don't wrap (styles contracts RED→GREEN) — cost if wrong: none
- Task 3: Ruling: at iPad width the 360-unit scene scales ~2.1×, so scenery reads bigger next to the panels than in the small mockups; kept (bold, readable; text sits on panels/plain paper) — cost if wrong: parent may want the scenery smaller (would need wider canvases)
- Task 4: Ruling: stats test used the file's existing `session()` helper instead of the brief's `makeSession` — same shape — cost if wrong: none
- Task 4: Ruling: example-word speaker uses lucide Volume2 like SpeakButton; the brief's "InkIcon speaker" doesn't exist (the `speech` icon is a talk bubble) — cost if wrong: none
- Task 4: Ruling: WeekStrip is role=img with aria-label 这个星期练了 N 天 — cost if wrong: none
- Task 6: Ruling: strip uses the session's own kid (read from the db), not the app context; the brief's test set only the context kid, so it now saves the kid to the db first — cost if wrong: none
- Task 6: Ruling: browser check showed the strip almost fully hidden by the opaque bottom bar (flashcards leave no room above it) — the waiting (neutral) bottom bar is see-through on lesson screens (`.screen:has(.world-strip) .bottombar--neutral`), so the ground sits under 继续; feedback bars stay solid (styles contract RED→GREEN); answers near the bottom still take taps — cost if wrong: the disabled 继续 button is slightly see-through over the ground
- Task 7: Ruling: landscape scales the scene ~2.8× and the race loop ran under 认识 75 个字 — text that sits straight on the page (corner count, 今天的练习, path labels) gets a paper backing (styles contract RED→GREEN) instead of shrinking the scenery — cost if wrong: small paper pills on Home
- Final: Ruling: scene bottom offset is a fixed 80px over the tab bar; safe-area insets may differ by a few px (declined: visual polish, checked in the browser) — cost if wrong: a sliver of paper or overlap at the tab bar
- Final: Ruling: spec §15 says the lesson strip sits above the bottom bar; it sits behind a see-through waiting bar (Task 6 ruling stands) — cost if wrong: none
- Final: Ruling: world name 草丛 in code vs 草丛探险 in the spec table (declined) — 草丛 matches the spec's own 到草丛了 line — cost if wrong: none
- Final: Ruling: :has() needs iPadOS 15.4+; older iPads keep an opaque bar (safe fallback) — cost if wrong: no ground under the button on old iPads
- Final: Ruling: arrival dialog has no focus trap / aria-modal (declined: a11y polish) — cost if wrong: VoiceOver can reach Home behind the card

### Fixed in the final review
- tap-swallowing see-through bar — styles contract 'see-through must also mean tap-through' RED→GREEN (pointer-events none on the bar, auto on its button), suite 347/347
- word-of-the-day reading mismatch — home 'shows the content reading, so it matches the example word' RED→GREEN, suite 347/347

### Deferred minors
- 八 offers bá as a wrong option though 八 can be read bá before a 4th tone (like 一/不, optional sandhi)
- journeyKid local state is never cleared and would override a later context kid while Home stays open (harmless today: nothing on Home saves the kid)
- the journey save builds from the context kid without re-reading the db — could overwrite a just-saved kid if Home mounts before a Wardrobe refresh lands and a new world is due
- with a null kid, Home's journey effect would save DEFAULT_KID (unreachable: firstRoute sends a kid-less app to pet setup)
- restoring a pre-plan-6 backup shows the arrival card once more

## Plan 8 — 朗读 coach + exam-etiquette warm-up

### Rulings
- Pre-flight: Ruling: plan ships the ASR spike as a parent-run test (Task 8), not auto-hints — the spike can only be judged on the iPad with the child's voice; spec §16's hints wait for the parent's result (told to parent at handoff) — cost if wrong: hints come one follow-up later
- Task 1: Ruling: backup test uses the real exportBackup/readBackup/applyBackup names; RecordingsPanel describe() gained the intro kind now (planned for Task 4) because the union widened — cost if wrong: none
- Task 2: Ruling: brief's cycle test fixture R0 needed a ReadingState annotation for tsc (caught after the task commit; fixed in the next commit) — cost if wrong: none
- Task 4: Ruling: Label gained `pinyinFor`; hidden-pinyin Han cells keep their slot (`zh` flag) so punctuation never merges into them and data-py omits them — cost if wrong: none
- Task 4: Ruling: session test lives in its own file (src/app/langduSession.test.tsx) so its recorder mock can't touch the other session tests; "same day doesn't raise days" is covered by the cycle unit test (a daily session can't run twice) — cost if wrong: none
- Task 4: Ruling: the bonus-star session test was written after the wiring (coverage add; never watched it fail) — the earnsBonus rule itself was TDD'd in Task 2 — cost if wrong: weaker evidence for the wiring
- Task 4: Ruling: the session saves the kid by re-reading it from the db before writing (reading + warmups + bonusStars) so it can't clobber a concurrent save — cost if wrong: none
- Task 4: Ruling: HELPER_QUESTIONS and the .speak-step/.helpers CSS are kept for the picture story builder (next plan); SpeakingStep + chooseSpeakingPrompt deleted — cost if wrong: a little unused CSS until then
- Task 4: Ruling: the bonus star shows as a star sound + burst at screen centre (no new toast text) — cost if wrong: he may not know why the extra star came
- Task 5: Ruling: test lives in src/app/langduExtra.test.tsx (recorder mock isolation); LangduScreen shows the world strip like lessons and returns Home if there is nothing to read — cost if wrong: none
- Task 6: Ruling: the activity toggle label is now '朗读 reading aloud' and the parent area has 9 tabs; two parentB tests updated to match — cost if wrong: none
- Task 6: Ruling: oral fields save as typed through a ref of the latest details — the first version merged into a stale render's copy and lost earlier fields when typing quickly (caught by the new test) — cost if wrong: none
- Task 6: Ruling: tests in src/parent/langdu.test.tsx; preview text shows hello+body+'…… '+thanks — cost if wrong: none
- Task 7: Ruling: marking is per character value (tapping one 大 marks every 大 in the text) — a misread character is a character to practise, not a position — cost if wrong: the parent can't mark only one occurrence
- Task 7: Ruling: misread marking sits behind a 'Mark misreads' toggle per passage recording (keeps the list compact); a deleted text lists as '📖 (deleted text)' with nothing to mark; test stubs URL.createObjectURL (fake-indexeddb returns blobs as plain objects) — cost if wrong: none
- Task 8: Ruling: the ASR test lives under an 'Advanced' disclosure in Settings, shows the Apple notice before Start, and on error hints that iPad needs Siri & Dictation — cost if wrong: none
- Task 9: Ruling: the recorder's AudioContext is created during the tap, before the mic prompt (iPad Safari only starts audio in a gesture), and the meter/大声一点 appear only after a real level (>0.002) arrives, so a suspended meter never nags (tests RED→GREEN) — cost if wrong: a working-but-silent mic shows no meter until he speaks
- Task 9: Ruling: the lesson path calls the step 朗读 (was 说一说), and the Home extra-round button is 多读一遍 (two identical 朗读 buttons on one screen would confuse him; spec §16 said "a 朗读 button") — cost if wrong: a label
- Task 9: Ruling: browser-pane limits meant MediaRecorder and the mic had to be stubbed for the meter check; LOUD_ENOUGH (0.05) still needs tuning on the real iPad — cost if wrong: the green/quiet threshold is off until tuned
- Final: Ruling: TTS after mic use on iPad (declined: device-dependent) — needs the parent's iPad check — cost if wrong: quiet or earpiece TTS after recording
- Final: Ruling: no blocked/versionchange handler for the db upgrade (declined) — home-screen apps have separate storage from Safari tabs — cost if wrong: an upgrade waits while another tab of the site is open
- Final: Ruling: a session finished after midnight counts the cycle day on the finishing date (declined: unspecified) — cost if wrong: none for a child who stops before bedtime
- Final: Ruling: misreads marked after today's session started come up tomorrow (declined) — consistent with daily plans — cost if wrong: one day's delay
- Final: Ruling: a re-record after the mic is later refused discards the first recording (declined: edge case) — cost if wrong: one lost reading

### Fixed in the final review
- double tap on 开始录音 starting two recordings with one left hot (and unmount while the mic opens) — LangduStep 'a double tap on 开始录音 starts one recording…' RED→GREEN, suite 389/389
- bonus star for stopping straight away — stars 'stopping straight away is not "quicker"…' RED→GREEN (a read must last ≥ half the previous one), suite 389/389
- misreads not jumping ahead of school lists — misreads 'a misread character with no card jumps ahead…' RED→GREEN (listedAt = −now), suite 389/389
- stop() hanging after iOS ended the recording — recorder 'if iOS already ended the recording…' RED→GREEN, suite 389/389

### Deferred minors
- the 'Saved: N characters' message counts characters that had no built-in word to update
- saving misreads again on the same recording adds another extra day (capped at 2); unmarking doesn't undo priority
- a double tap on 完成 in an extra round saves the recording twice
- PassagesPanel uses crypto.randomUUID directly (fails on plain-http dev hosts; the live site is https)
- if new MediaRecorder()/start() throws, the stream and meter context aren't released
- an older oral-field save resolving late can briefly revert a just-typed character
- leaving Settings mid speech-recognition test doesn't stop recognition (it times out)

## Plan 9 — 看图说话 story builder + Truffle asks

### Rulings
- Task 1: Ruling: gallery found the canteen worker standing on the counter and the shared sandwich floating — counter now drawn in front of a taller worker, sandwich in the boy's hand; the wallet owner's '?' is SVG text — cost if wrong: art polish
- Task 2: Ruling: model stories use Chinese quotation marks “…” (the plan wrote ASCII quotes); RecordingsPanel labels story/answer recordings '🖼️ Picture story' until Task 6 groups them — cost if wrong: none
- Task 4: Ruling: the 讲一讲 whole-story screen also offers 听松露说 (the full model story) after he tries — plan only specified it for parts and answers — cost if wrong: he may lean on the model; the parts already gave it piecewise
- Task 4: Ruling: the 听松露说 button uses the speech-bubble ink icon; each screen is keyed so it gets a fresh recorder; onDone is ref-guarded — cost if wrong: none
- Task 5: Ruling: story recordings get createdAt = base + index so they sort and group in order; the langdu session test's kid now starts with speakingLast 'story' — cost if wrong: none
- Task 6: Ruling: recording URLs keyed by id (not list index) now that rows are grouped; a story row shows total seconds and 'N parts' — cost if wrong: none
- Task 7: Ruling: the path names the speaking node by today's activity (看图说话 / 朗读, via nextSpeaking on Home); the picture is height-capped (min(34vh, 420px)) so the model sentence stays above the bottom bar; Truffle-asks screens keep a small copy of the picture beside him (tests RED→GREEN) — cost if wrong: none
- Final: Ruling: art look, the scraped knee/tears in 'fall', lunch in the classroom (declined) — the parent sees the gallery before release — cost if wrong: a redraw
- Final: Ruling: iPad mic re-prompting and how the iPad voice reads 还给 (declined: device-only) — cost if wrong: an iPad-only quirk
- Final: Ruling: Home vs session disagreeing past midnight (declined: negligible) — cost if wrong: one mislabelled path node

### Fixed in the final review
- wrong pinyin (还给 hái, 得 dé, 了 liǎo, 地 dì) — kantu 'pinyin above the stories reads them right…' RED→GREEN (narrow customPinyin phrases in src/content/pinyinFixes.ts, loaded by Label), suite 419/419
- content — kantu 'every theme word is used…' + '打翻 always takes what was knocked over…' RED→GREEN (vase/spill events and spill opening rewritten, 她很饿, 等一等 and 红绿灯 added), suite 419/419
- the finished day's path label — 'names the activity he actually did today…' RED→GREEN, suite 419/419
- refused mic per screen — StoryStep 'a refused microphone is remembered…' RED→GREEN (blocked carried with the 继续 tap, not a deferred effect), suite 419/419
- Truffle's voice in recordings — recording 'starting a recording silences Truffle first…' RED→GREEN (stopSpeaking on record start; StoryStep also stops speech on unmount), suite 419/419

### Deferred minors
- a failed save (storage full) leaves 完成 dead on the last screen; partial parts saved
- KEEP=100 counts parts, so the 'too many recordings' warning shows after ~12 stories; pruneOld can split a story group
- test gaps — leaving mid-story (focus 3) and a double tap on 继续 aren't tested (both hold by construction)

## Plan 7 — world tap fun

### Rulings
- Task 1: Ruling: normalizeFinds lives in fun/finds.ts (with the rules) and repo calls it; types.ts imports DEFAULT_FINDS from fun/finds (a value import into types, like DEFAULT_READING lives in types) — cost if wrong: none
- Task 2: Ruling: gallery showed the goat's pale horns vanishing on cream — horns darkened to #8f8a93 — cost if wrong: art polish
- Task 3: Ruling: drawings baked into the scene can't move, so the race lap is a second car zooming round the track, the submarine's tap is bubbles + a fish swimming past (spec: "it dives; fish follow"), and the rocket launch covers the drawn rocket with sky while a copy lifts off — cost if wrong: effects differ from the spec wording
- Task 3: Ruling: browser check found every SVG animation already finished on tap (SMIL times from the <svg>'s load) — the layer rewinds its clock (setCurrentTime(0)) per effect (test RED→GREEN) — cost if wrong: none
- Task 3: Ruling: browser check found the gem block, egg nest, sprinkler and pirate X under Home's path and Truffle (scene x 110–290) — those drawings moved to the open sides (sprinkler by the pool, gems to the right hill, nest under the mother dino, submarine left, X on the island's left) and the race starts from the chequered flag; a test pins every target outside x 110–290 (RED→GREEN) — cost if wrong: scenery layout differs from the approved mockup
- Task 3: Ruling: Home content (topbar, week, main) is raised to z-index 1 with pass-through on its layout boxes; the tap layer is a fixed SVG at z-index 0 (CSS contract RED→GREEN); verified path tiles, word card and tab bar still win their taps — cost if wrong: none
- Task 4: Ruling: the animals page is a 字卡 filter chip (动物, aria 找到的动物) that swaps the card grid for a 12-slot grid with the note 在草丛里找一找！; the gem jar sits at the top of the room's 地方 tab — cost if wrong: placement
- Task 5: Ruling: the hatch runs in SessionScreen.commit when a daily record first becomes completed (re-reading the kid first), before Celebration mounts — cost if wrong: none
- Final: Ruling: on-iPad SMIL check (Important 2) — can't be done here; the fresh-layer fix removes the setCurrentTime dependency, and the parent is asked to tap grass/blocks/space once on the iPad after release — cost if wrong: taps show only Truffle's bubble until fixed
- Final: Ruling: face recognisability at 48 px, mockup layout drift, iOS double-tap zoom, Truffle overlapping the right gem block, millisecond save races (declined) — visual or negligible — cost if wrong: polish

### Fixed in the final review
- the day's gem wiped by a 5th tap — 'the popped gem stays up…' RED→GREEN (guard held 1400 ms after a pop), suite 446/446
- reliance on setCurrentTime for SMIL — 'each effect plays in a fresh animation layer…' RED→GREEN (a keyed <svg> per effect starts its own clock; the setCurrentTime test removed), suite 446/446; Chromium-verified (rocket mid-flight)
- egg over the hatched baby — 'once hatched, tapping the nest makes the baby hop…' RED→GREEN, suite 446/446
- rocket leaving before 一 — 'the rocket waits for the countdown…' RED→GREEN (lift-off begins at 1.5 s; sky patch stops above the pad), suite 446/446
- the red car not starting the race — 'tapping the red car starts the race too' RED→GREEN (second hit rect over the car's near half, x 86–110), suite 446/446

### Deferred minors
- gemTaps counter doesn't reset if Home stays open past midnight (first tap next day pops at once)
- reduced-motion fish fades in mostly off-screen
- the moved pirate X/dig puffs sit a few units above the sand edge
- the gem jar's top row overflows the rim at 29–30 gems
- spec flavour not built — yard: Truffle flinch-then-laugh (only the 哇！ bubble); pirate: Truffle digging
- SessionScreen's `!rec?.completed` hatch guard is always true (harmless)

## Minor fixes (branch fix/minors)

Fixed, each with a test that failed first:
- the 字己 seal's characters slid out of the red in Safari (vertical text plus the WenKai font): now stacked spans, no writing-mode
- the gem jar's top rows overflowed the rim: it draws at most 24 gems (the label keeps the real count)
- gem taps carried over past midnight: the counter belongs to one day
- the dig puffs overlapped the island's outline: they sit on the sand around the X
- the "too many recordings" warning counted story parts: a story counts as one and is pruned as a whole
- a full storage froze 完成 on the last story screen (and the 朗读 step): the recording is lost, the lesson goes on

Still deferred: reduced-motion fish fades in mostly off-screen; yard/pirate Truffle flavour; the always-true hatch guard; plan 8's recorder/oral-field/ASR minors.

## Plan 10 — adaptive layouts (spec §18) and 看图说话 parked

Every child screen fits one screen, with no page scrolling, on an upright iPhone (from SE size) and an iPad either way round. A sideways phone shows Truffle asking for upright. 看图说话 is parked behind `settings.story` (off). `npm run fit` walks every child screen and lesson step in WebKit at 375×667, 390×844, 768×1024, 1024×768, 1180×820 and 667×375. It fails on page scroll, controls off screen or under 44px (main actions under 64/52px), Chinese under 16px, overlapping solid elements, and covered world taps. Final sweep: 221 screens, 0 problems.

### Rulings
- Plan: Ruling: Task 0 added (park 看图说话) at the parent's request in the message that chose Native — not in spec §18; settings.story (default false) keeps the code switchable — cost if wrong: one setting to remove
- Plan: Ruling: 看图说话 dropped from the fit sweep and from Task 6's acceptance (parked; its flow will be redesigned) — Task 6's .kantu CSS still lands so the parked screen isn't broken if switched on — cost if wrong: kantu layout unchecked on phones until the rethink
- Task 2: Ruling: tsx/esbuild wraps functions in __name(), which page.evaluate can't see — an init script defines window.__name — cost if wrong: none
- Task 2: Ruling: seed waits for '.screen:not(.loading)' (the loading screen appeared before the DB existed) — cost if wrong: none
- Task 2: Ruling: walker checks each distinct screen once (seen-set), walks through repeats up to 150 taps at 450ms, sizes run in parallel — the plan's "stop after 5 repeats" quit 朗读 after 3 of 20 phrases; sweep now ~4 min — cost if wrong: a state seen once per flow, not per word
- Task 2: Ruling: LONG_PASSAGE extended to ≥160 chars (plan's text was 126) and playwright-core pinned exactly to 1.52.0 (caret could pull a WebKit build that isn't installed) — cost if wrong: none
- Task 3: Ruling: the path is a row of stops (two rows were never needed), not the plan's vertical zigzag — 5 vertical stops + labels can't fit an SE or iPad landscape beside the cards; the mockup's vertical zigzag is gone — cost if wrong: parent may prefer the vertical path on iPad upright
- Task 3: Ruling: everything on the ground stays inside --band (the middle half of the scene, 50vw) because the world taps sit in the scene's outer quarters — iPad landscape keeps ONE centred column (spec's two-column Home dropped), cards/path ≤ band — cost if wrong: landscape Home is narrower than it could be
- Task 3: Ruling: .world-scene height is min(100%, 133.33vw), anchored at the bottom with a soft top fade, so a tall phone never crops the world's sides (the race flag and gem block were off screen on iPhone 15) — cost if wrong: the very top of a tall phone shows plain paper sky
- Task 3: Ruling: phone Home: the week strip sits in the top bar; the seal, 松露认识N个字 and the 今天的练习 title are hidden; the path is one full-width row in the sky (above the ground's targets); once today is done (.home--done) the all-ticked path is hidden — cost if wrong: the known-count isn't on a phone's Home (still in the parent area)
- Task 3: Ruling: the reward goal is a single row everywhere; 多读一遍 sits beside the word card; the 今日一字 tag is a corner sticker; iPad landscape hides the 今天的练习 title — cost if wrong: none (layout only)
- Task 3: Ruling: sweep gained an overlap check (solid elements incl. headings) and a FIT_ONLY filter, and world-tap reports carry coordinates — the eye caught a path drawn over the cards that no size/scroll check saw — cost if wrong: none
- Task 4: Ruling: removed WorldStrip, STRIP_VIEW and their tests (strip-framing, see-through-strip-bar, grain selector), and the old `.home .world-scene { bottom: 80px }` test now pins var(--nav-h) — no users left; the full scene replaces them — cost if wrong: none
- Task 4: Ruling: the sweep skips `.is-eaten` (the answer shrinking into Truffle mid-animation looked like a 54×15 button) — cost if wrong: none
- Task 4: Ruling: phone feedback card: no badge, nowrap labels, fixed-width 继续, smaller 🔊; dimmed answers stay solid paper (opacity 1, muted ink) so scenery doesn't show through — cost if wrong: dimmed answers look slightly less faded
- Task 5: Ruling: the 开始/继续 bubble on the current path stop let taps through (`.home .path__row > .path__bubble { pointer-events: none }`) — the sweep found it intercepting the tap on 钓鱼's stop; a child tapping the bubble now starts the step — cost if wrong: none
- Task 5: Ruling: 钓鱼 on phones gets the 认一认 treatment (small Truffle top-left, bubble beside, smaller big character); the writing cue gets a paper card (it sat on bare scenery in landscape) — cost if wrong: layout only
- Task 5: Ruling: sweep crash messages keep 900 chars (160 hid the intercepting element) — cost if wrong: none
- Task 6: Ruling: 朗读 text that sits on the scene gets paper (the warm-up script as a card; title/step/ok/thanks as paper chips) and the phone warm-up gets the small-Truffle row — the landscape warm-up had the flag running through 我叫小明 — cost if wrong: layout only
- Task 7: Ruling: the overlap probe clips each element to the scroll panel it sits in (cards scrolled out of 字卡's panel read as overlapping the tab bar) — cost if wrong: none
- Task 7: Ruling: PetSetup's Truffle is 1.5× --pet (tiny on the SE with room to spare) — cost if wrong: none
- Task 8: Ruling: 再玩一会儿 and 今天完成了 keep to one line (nowrap; smaller on phones) — the tall-iPhone screenshot showed 儿 on its own line — cost if wrong: none

### Final review (fresh Opus reviewer): with fixes → fixed

- 多读一遍 完成 dead on full storage — 'a full storage still lets 完成 go home' RED→GREEN, suite src/app 67/67
- parked-speaking path disagreeing with the lesson (stop reappearing after start; a skipped step ticked as 看图说话) — '看图说话 parked: the path matches what the lesson does' (2 tests) RED→GREEN, suite src/app+src/kantu 79/79; the existing "names the activity he did today" test now switches the story on (it describes the unparked behaviour)
- the sweep could not see clipped content (.screen clips its own overflow) — probe now flags any text or solid element past the screen's edges, and all Chinese text nodes under 16px; RED: the next sweep found the costume-prize screen cutting off 继续 on phones (and 今日一字 13px); GREEN after the fixes below; full sweep 266/266
- the walker stopping at the first celebration phase — it now presses and holds the chest and taps 继续/回家; RED: prize screens newly reached and failing on phones; GREEN: prize Truffle min(1.6×--pet, 22dvh), smaller chest and one-line headline on phones; full sweep 266/266
- big character and 钓鱼 question sitting on busy ground in iPad landscape — paper card behind .flash__prompt .hanzi--xl, .whichpart__char, .pond-q; feedback card centred on tablet portrait (spec §18); 今日一字 tag and 按住 at 16px — contract test 'the review fixes…' RED→GREEN, suite 483/483, sweep 266/266

### Final rulings
- Final: Ruling: Truffle is centred on Home (spec §18 says bottom-right on phone/portrait) — follows from the middle-band ruling: the right quarter holds the gem-block target — cost if wrong: Truffle's spot differs from the mockup
- Final: Ruling: fixed the reviewer's Minor 9 (harness: per-flow try around open(), exitCode instead of exit, a 3-minute per-flow cap, progress lines) — a full sweep hung 2 hours on one flow and blocked verification — cost if wrong: none

### Deferred minors
- the PIN gate, Forgot PIN and the error screen clip on a sideways phone (no overlay on the parent route; parent can turn the phone upright)
- world-tap probe samples only each target's centre; done-Home swept in the race world only
- a long parent-written self-introduction has no overflow guard on an SE
- with only 朗读 enabled and nothing to read, Home shows a lone chest with no 开始 (rare settings)
- small leftovers — unused --stops, an orphaned JSDoc in scenes.ts, the rotate test checks SetupPin not a session, evening lanterns across the iPad-landscape progress bar

## Plan 11 — HSK 1–9 content and meaning practice (spec §19 parts 1–3)

Built-in content is every HSK 3.0 character (3,000; levels 1–6 and 七—九级) plus 9,424 HSK words for 组词. Every word has separate reading and meaning memory. The lesson defaults to 30 minutes (an install on the old 20-minute default moves once). 认一认 asks how a word is read, with his real worksheet traps as wrong choices, and which character fits its 组词 word, with same-sound choices. 531 tests; fit sweep 281 screens, 0 problems.

### Rulings
- Task 1: Ruling: HSK_WORDS holds 9,424 words (two characters or more), not the plan's "~11,000" (which counted single-character words) — the index test asserts > 9,000 — cost if wrong: none
- Task 1: Ruling: placement's first rechecks spread from day 7 at most 30 a day (MAX_FIRST_CHECKS_PER_DAY), still days 7–28 for small placements — with up to 3,000 placed words, 7–28 meant >100 reviews a day and the 40-review backlog pause would stop new words for weeks — cost if wrong: big placements take longer to recheck
- Task 1: Ruling: power families count HSK 1–2 characters only — HSK 1–9 families would make tier 2/3 five times slower than tuned; earned tiers are unchanged — cost if wrong: rare characters never count toward powers
- Task 1: Ruling: 字卡 shows every caught card plus backs up to one HSK level past his highest caught level (at least HSK 1–2) — rendering 3,000 cards (2,400 backs) would be slow and discouraging — cost if wrong: the count reads e.g. "80 / 900" not "80 / 3000"
- Task 1: Ruling: updated tests that pinned the 600-character content (index 600→3000, placement bands of 60→per HSK level incl. setup's "认识 60"→300, check-content level counts 200→300/1200 and 澡→惜 as the out-of-level example, collection and home 1/N counts) — intent unchanged — cost if wrong: none
- Task 1: Ruling: only the HSK level-1 section is required by buildBuiltin; missing higher sections are skipped — the existing content-lib fixtures supply levels 1–2 only (the file failed to load, hidden by a passing 'Tests' count) — cost if wrong: a truncated download would build fewer levels silently (the build prints per-level counts)
- Task 2: Ruling: added applySettingsMigration(db), which reads the raw stored settings — getSettings merges today's defaults (lessonVersion 2), so an existing 20-minute install would never have migrated; bootstrap calls it after seeding — cost if wrong: none
- Task 2: Ruling: toRating branches on 'write' first (TS would not narrow the 'recognise' | 'meaning' member) — same ratings — cost if wrong: none
- Task 2: Ruling: updated repo.test's default sessionMinutes 20→30 and plan.test's 20-minute time box to 7/30 — intent unchanged — cost if wrong: none
- Task 3: Ruling: tone helpers (MARKS, syllableTone, toneless, withTone) moved to tones.ts and re-exported from distractors.ts — pinyinTraps ↔ distractors was a circular import (UNMARK used before initialisation) — cost if wrong: none
- Task 3: Ruling: the top trap (the sounding part's reading) always appears; the second trap is random — the plan's "2 random traps" sometimes dropped qīng for 静, his most common error type — cost if wrong: less variety in the first wrong choice
- Task 3: Ruling: radical side forms (扌氵亻讠…) are never offered as readings — sample output showed 捡/摊 → shǒu (扌) and 建 → yǐn (廴); skipping the dictionary radical instead broke 静 (its radical is 青, his real trap) — test '捡 never offers shǒu' — cost if wrong: a rare real reading-from-a-side-form trap is lost
- Task 4: Ruling: the new-word intro card shows its first two 组词 (all of them still feed meaning questions), and on phones its speak buttons are 48px with tighter rows — HSK 1–9 gives more examples (他 → 他们, 他人), which pushed the SE intro card under 我记住了 (fit sweep overlap) — cost if wrong: a third example only appears in practice
- Task 4: Ruling: same-sound choices come from around the word's own level first (≤ level + 1), then any level — the sweep showed 溢 (HSK 7–9) as a choice for 一半 — test 'draws the same-sound choices from around the word's own HSK level' RED→GREEN — cost if wrong: fewer same-sound options for rare sounds
- Final-prep: Ruling: .screen uses overflow: clip (overflow: hidden as the fallback) — the full sweep found 松露's room scrolled 117px by a scroll-into-view (Playwright clicking mid-animation); a clipped screen must never be scrollable by focus or the browser either — contract test 'a screen clips with overflow: clip' RED→GREEN; the sweep now also reports any scrolled screen — cost if wrong: Safari < 16 falls back to hidden
- Final-prep: Ruling: 组词 examples allow characters up to one level up and prefer short, then easier words — 四's only example had become the HSK 7–9 idiom 四面八方 (all its characters are HSK 1), which pushed the SE 写一写 grid under 完成 — test 'prefer short, easy words' RED→GREEN — cost if wrong: a few examples use one-level-harder characters
- Final-prep: Ruling: 写一写's cue card is compact on phones (48px speak button, tighter rows), keeping the 田字格 full size — cost if wrong: none
- Final-prep: Ruling: the sweep's "content cut off" message names the element and its box (it printed an empty name for Truffle's svg) — cost if wrong: none
- Final: Ruling: same-sound choices can still form a rare real word outside the HSK list (读数 for 读__) — no offline word list beyond HSK's 9,424; the glue filter removes most cases — cost if wrong: an occasional right answer marked wrong
- Final: Ruling: declined-to-judge items stand — placement stays one band per HSK level until plan 14; the lesson runs under 30 minutes until 选一选/字辨 arrive (plans 12–13); spec's "same kind of word" choices are plan 13's sentence bank — cost if wrong: none for this plan
- Final: Ruling: pre-existing issues noted, not fixed here — seedBuiltinWords overwrites the parent's 写 (writeable) checkbox every launch; 了 stored as liǎo; ranks within a level are by stroke count, not frequency — each worth its own small fix — cost if wrong: they persist until fixed

### Fixed in the final review
- traps offering glyphs (⺊ ⺍) and stroke names (piě, jiōng) as pinyin — 'across every built-in character, traps are real pinyin syllables…' RED (儿 → piě) → GREEN, suite flashcards 40/40
- real words marked wrong in meaning questions (不懂 for 不__, 别让…) and cues that gave the answer away or used another reading (妈妈, 班长 for 长 cháng) — meaningCue now needs the character once, the same reading, and no single glue character as the rest — 'meaningCue picks a fair 组词' (3 tests) RED→GREEN, suite 526/526 (reviewer Minor 1 regraded Important: same selection rule, trivial items waste his practice)
- meaning reviews crowding out reading reviews and new words — queue: one meaning per two reading reviews, new words next, leftover meaning after — 'meaning reviews take at most one slot in three…' RED→GREEN, suite 527/527
- sticker badges becoming near-impossible (families grew 18→159 with HSK 1–9) — families count HSK 1–2 only, like powers — 'families count HSK 1–2 characters only…' RED→GREEN, suite 528/528
- the migration overriding a shorter lesson the parent chose (reviewer Minor 4 regraded Important: it silently changes a parent's setting) — only 20 → 30 — 'keeps a shorter lesson the parent chose' RED→GREEN, suite 529/529
- a four-character 组词 cue (四面八方 for 八) wrapping and pushing the choices off portrait screens — the cue sizes to its length on one line — tests 'a long 组词 stays on one line' + 'the meaning cue never wraps' RED→GREEN, suite 531/531

### Deferred minors
- a meaning item whose word has no cue falls back to a reading question but records on the meaning card (FlashResult should carry the mode asked)
- meaning answers make a placed word "practised", so a placement re-run keeps its guessed reading card
- every launch rewrites all 3,000 built-in word records (measure on the iPad; gate on a content version)
- deleting a parent word leaves its meaning card behind
- the parent's weekly accuracy, trouble words and due-tomorrow mix meaning with reading
- wordsWithChar is built at startup but unused until plan 12
- 写一写 still shows a short English gloss (plan 13's 听写 replaces the cue); the commit message overstated "no English on child screens"
- a 轻声 trap can be a real alternative reading for multi-character words (东西 dōng xī)
- tidy-ups — the module-level skipped array in content-lib, a duplicated getBoundingClientRect in fit-check, two phone media blocks at the end of styles.css
