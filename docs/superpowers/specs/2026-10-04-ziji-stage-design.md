# 字己 ZiJi — the storybook stage and a living Truffle (design)

Date: 2026-10-04. Status: approved by the parent, 2026-10-04.
Builds on: `docs/superpowers/specs/2026-10-02-ziji-truffle-design.md` (§5 look, §15 journey worlds, §18 adaptive layouts, §20 lessons).
Mockups, approved in the brainstorm (visual companion, 2026-10-04):
- `docs/superpowers/mockups/2026-10-04-stage-worlds-paper.html`: the world art direction ("depth, light and story details", right-hand card).
- `docs/superpowers/mockups/2026-10-04-stage-layout.html`: stage layouts; **A, "the stage"**, was chosen.
- `docs/superpowers/mockups/2026-10-04-truffle-rig.html`: the living-Truffle demo (v4, open it in a browser and play).

## 1. Why, and what success looks like

The parent said the backgrounds "still feel a little amateurish". All four causes were named:
- clip-art drawing;
- too busy behind the lesson;
- not matching Truffle;
- flat colour and filter-like texture.

The paid-polish review (2026-10-04) found the same from the layout side:
- lesson content floats over busy world art, and Truffle changes position from activity to activity;
- the feedback bar changes width from screen to screen;
- Home is a stack of cards over wallpaper.

The parent liked the layered paper look and their son liked the bright, clean one. The parent wants the worlds to be **Truffle's own places, with signs of how he lives in them**, and Truffle **much more alive and expressive, with seamless transitions**.

Success, judged by the parent and their son on the iPad:
1. **The worlds** look like one illustrated storybook, a world Truffle belongs in, not clip art. They are bright enough for the child and crafted enough for the parent.
2. **Every lesson screen is the same stage.** The world sits behind, the lesson card is in one place, Truffle is in one place, and one feedback sheet slides up. Nothing in the art sits behind an answer.
3. **Truffle feels alive.** He breathes, blinks, watches, reacts with clear expressions that blend smoothly, and responds to touch. He never distracts while the child reads a question.
4. **Nothing regresses.**
   - Every child screen still fits one screen on iPhone SE through iPad landscape (the fit sweep stays at 0 problems).
   - Reduced motion is respected.
   - Animation stays smooth on an older iPad.

## 2. The look: storybook paper worlds

**Style: layered paper with light.** Each world is built from stacked paper layers:
- far, middle and near ground, then a foreground framing layer;
- each layer has a soft cast shadow on the one behind it;
- each layer has a light-to-dark vertical shade and a sunlit top edge (a 2px lighter line);
- far layers are paler and bluer, which gives depth.

**Colour:** colour sits halfway between the "warm" and "bright" mockups: clear sky blues, fresh greens, warm accents. One shared palette file holds all colours (§7).

**Drawing rules:**
- No black ink outlines on world art. Truffle keeps his ink outline, so he reads as the character on the page.
- Rounded, characterful shapes: trees built from leaf clusters in 2–3 greens with highlight dots, picket fences with pointed tops, two-tone clouds.
- Small things cast soft ground shadows.

**Texture:** one subtle paper grain over the whole scene. It is baked in as a small tiled image, not computed live by the browser (see §6).

**Composition: a calm stage zone.**
- The centre-right of landscape and the upper middle of portrait stay quiet: sky and soft ground only, because the lesson card sits there.
- Detail lives at the left and right edges and in the foreground.
- Grass tufts and flowers frame the bottom corners.

**Story details: Truffle's own places.** Every world holds two or three props that belong to Truffle and that he uses (§4.5). The props:

| World | Truffle's props (he uses them) | Other details |
|---|---|---|
| 后院 yard | his food bowl, his red ball, a birdhouse he watches | picket fence, sprinkler, tree |
| 草丛 grass | a cardboard box he hides in, a butterfly he chases | tall grass tufts, flowers, a fence post |
| 赛车山 race | his little go-kart with paw-print flag, a cone he knocks over | winding road, finish flag |
| 方块世界 blocks | a block "scratching post", a cat-shaped block statue | gem block, block trees |
| 恐龙谷 dino | the egg he guards (later the baby dino), a big leaf umbrella | volcano, ferns |
| 海底 sea | his fishbowl helmet / mini submarine, a curious fish | seaweed, shells, bubbles |
| 月球基地 space | a cat-ear rocket, a floating ball of yarn | moon rocks, base dome, stars |
| 海盗岛 pirate | a treasure chest with a paw print, a parrot friend | palm, sand, the X |

The table is a starting brief. Each world is reviewed by the parent in WebKit screenshots before it ships, and props can change. The existing world-tap fun (§15: animals, gems, egg, dig) moves onto these props.

**Time of day:** morning and afternoon share the art. Evening adds:
- a warm light layer;
- lamps or stars that suit the world;
- a sleepier Truffle (§4).

The evening light is strong enough to see. The review found the current evening barely visible.

**Every world in every place:** each world has one composition that works at 4:3 landscape, 3:4 portrait and phone portrait:
- The art is drawn on a wide canvas.
- It is cropped from the centre-bottom.
- Edge props are placed so that each orientation keeps at least one Truffle prop on screen.

## 3. The stage: one layout for every lesson (option A)

The world fills the screen. On top of it, every lesson activity uses the same four regions:
- 认一认, 选一选, 字辨, 写一写, 用一用, 朗读, and the placement check.

| Region | What | Where (iPad landscape / iPad portrait / phone) |
|---|---|---|
| Top bar | close ✕ and the lesson progress bar with activity icons | top, full width, on a light paper strip |
| Lesson card | the activity's content on a cream paper card (rounded, soft drop shadow, raised paper tiles) | right ~55% / upper middle, full width minus margins / full width |
| Truffle's spot | Truffle and his speech bubble, always here | lower left third, standing on the ground / lower left, beside the sheet / small, lower left above the sheet |
| Feedback sheet | after an answer: one sheet slides up from the bottom, full content width, fixed minimum height; message on the left, 继续 on the right | bottom, full width, same in every activity |

**Rules:**
- **This replaces two older rules:** §18's lesson placements and its "middle band" rule for lessons. Home keeps world taps at the edges until phase D.
- **One box per activity.** Within one size, the lesson card has the same position and size for every question of an activity. The size can differ between activities (writing needs a taller card), but each activity's box is fixed, so nothing jumps between questions. This extends the placement-box fix to all activities.
- **Truffle never moves between activities,** only within his spot when he reacts. The current per-activity placements (top-centre in 字辨, top-left in 写一写, missing in 朗读) all go.
- **The feedback sheet is one component everywhere.** It replaces the per-activity bottom bars. Explanations (字辨's 银 = 钅 + 艮) use a fixed row grid inside it, with one icon size. The sheet never covers the answer that was marked; the card lifts if needed.
- **Hanzi sizing:** the question's hanzi is larger than the answer tiles' (the review found the reverse in 选一选 and 用一用):
  - at least 64px on iPad and 48px on phone;
  - answer tiles 40–48px.
- **Sentences:** in 选一选 and 用对了吗 they get at least 28px text on iPad, a speaker button, and pinyin over every character, as everywhere else on child screens.
- **The world stays still during a question.** No world effects play behind the card. The world taps that already exist stay on Home.

**Home** uses the same stage idea:
- **Top strip:** the streak, stars and week dots merge into one top strip.
- **Journey stops:** they sit on the world's own path or ground, drawn per world, instead of floating above it.
- **Truffle:** he stands in his spot.
- **Cards:** 今日一字, the goal and 多读一遍 sit in the stage zone as paper cards.
- **The parent's reward goal** is shown with a Chinese title and an ink icon. The parent area asks for these, which fixes the English and emoji on the child's Home.

**Celebrations** keep their own screens. They switch from full-bleed red to a sunburst in the current world's colours, with Truffle centre stage (§4).

## 4. A living Truffle

Truffle becomes a rigged puppet built from his existing drawing, as in the v4 demo. No new character art is needed for parts 1–4 below.

### 4.1 The rig

**Parts:** body, head, tail, left and right ears, and two eyes. Each eye has a white, an iris and pupil group, and upper and lower lids. Then eyebrows, mouth, blush and whiskers.

**Seams:** the body has a rounded top tucked under the head, so no seam shows when he leans. Head tilt is limited to ±8°.

**Face parameters:** his face is driven by continuous values:

| Parameter | What it does |
|---|---|
| `lidTop`, `lidBottom` | upper and lower eyelid positions |
| `lidArc` | bends a closed lid into ^ (happy) or a soft dip (sleepy) |
| `pupil` | pupil size |
| `browY`, `browAngle`, `browShow`, `browAsym` | eyebrow height, angle, visibility, and one brow raised |
| `smile` | −1 frown … 1 smile |
| `mouthOpen` | how far the mouth opens |
| `earL`, `earR` | ear angles |
| `blush` | blush strength |
| gaze x/y | where he looks |
| head tilt | head angle |

**Blending:** every parameter springs toward its target, so any expression blends smoothly into any other. Nothing is swapped out mid-move.

**Expression presets:** neutral, happy, overjoyed (^^), surprised, curious, grumpy, content, sleepy, plus proud, embarrassed and determined.

**Today's moods:** the current moods (`sulk`, `neutral`, `pleased`, `side`, `content`, `wow`, `cheer`, `sleepy`) map onto the presets, so every existing caller keeps working.

**Body motion:** whole-body movement plays as short timelines anchored at his feet:
- crouch to wind up, stretch on the way up, squash on landing, then settle;
- the head lags slightly behind the body;
- the ground shadow scales with height.

**What he wears moves with him:** onesies, outfits, accessories and power marks ride on the right parts. Head items move with the head, and hoods hide the ears as they do today. Every costume and accessory is checked in the sweep.

### 4.2 Idle life (always, unless reduced motion)

- **Breathing:** slow.
- **Blinking:** every 2–5 s, sometimes a double blink.
- **Small movements:** a gentle tail swish, an ear flick every few seconds.
- **Watching:** his gaze follows the finger on the screen, and otherwise rests on the lesson card.
- **Moods over time:** he starts a lesson a little grumpy (哼) and warms up as answers go right (today's `restingMood`). He is sleepier in the evening.

### 4.3 The question-calm rule

From the moment a question appears until the child answers, Truffle only breathes, blinks and looks at the card. There are no ear flicks, bubbles, sounds or reactions; motion during reading pulls attention off the character.

### 4.4 Reactions (after an answer, and at lesson moments)

| Moment | Reaction |
|---|---|
| Right answer | happy face, hop with anticipation and squash, ears up, bubble 对了！ (or variety: 真棒！, 好厉害！) |
| Hard word right | overjoyed ^^, a bigger hop, the existing close-up (face only) when due |
| Wrong answer | curious: head tilt, one brow up, one ear down, bubble 嗯？. Never sad, never scolding. |
| 3+ in a row | content purr: eyes closed in ^, hearts, gentle body shimmer |
| New word card | surprised then curious; he leans toward the card |
| Writing stroke done | small nod; a whole character done: happy |
| Lesson complete | overjoyed hop, then he stands proud in the celebration |
| Chest | he watches the chest and wiggles with excitement, then pounces when it opens |

### 4.5 Touch, and Truffle in his world

Touch works on Home and between questions, never during the question-calm window:
- **Stroke** him: eyes close, he purrs, hearts float up, and he says 呼噜～ after.
- **Tap his head:** a flinch with ears flat, a grumpy 哼！, then a small head shake.
- **Tap his tail:** he looks at it, crouches and pounces, and says 喵！

**Prop moments, which replace and extend the world taps:**
- Truffle reacts to his own props without walking across the screen. Each world has 2–3 such moments, e.g. in the yard:
  - he bats the red ball, which rolls and bounces back;
  - he eats from his bowl, and the bowl shows a nibble;
  - he watches the bird at the birdhouse.
- Some moments start themselves on Home (every so often when idle). Others start when the child taps the prop.
- The daily finds (animals, gems, egg, dig) stay as they are, hosted by the props.

### 4.6 Paws and personality (phase E)

**Paws:** front paws become separate parts, so he can:
- wave hello at the start;
- knead when content;
- cover his eyes when a question is hard;
- clap or raise a paw on a right answer;
- swat a tile.

**Talking:** his mouth moves while the iPad speaks.

**Personality and memory:**
- He greets the child at the start of a lesson.
- He sulks briefly if days were missed, and is extra bouncy on streak days.
- His idle choices follow his mood.

### 4.7 Sound

The current synthesised effects stay for now. A purr loop is added for petting and streaks. Recorded meows would add the most charm; see open question 2.

### 4.8 Reduced motion

Expressions and the bubble still change, with short cross-fades. There are no hops, squashes, shakes, ear flicks or swishes, and gaze does not follow the finger.

## 5. Out of scope

- **Walking and turning:** side and three-quarter views need new drawings; a later phase.
- **A professional animation rig:** Rive or an animator.
- **Recorded audio for pronunciation:** a separate item from the review.
- **Parent-area redesign:** a separate item from the review.
- **Changes to lesson content or to the SRS.**

## 6. Performance and quality bars

**Smooth animation:** Truffle and the world animate smoothly on an older iPad (A12-class). Playwright's WebKit can't throttle the CPU, so there are two checks:
- **In the sweep, on the Mac:** script and layout stay at or under 8 ms per frame during idle and during each reaction. This leaves headroom for a device about three times slower.
- **On the parent's iPad:** confirmed by eye at the end of phases A and B.

**No live SVG filters on moving parts:** drop shadows on world layers are drawn as offset shapes. The paper grain is one static tiled image over the scene.

**Truffle redraws only what changes:** one animation loop drives all his parameters, and it pauses when he is off screen or the app is hidden.

**Bundle:** the world art can grow, but must stay within what the app downloads up front today plus 300 KB gzip. Worlds load as separate chunks, fetched when the world is reached.

## 7. How it is built (units)

**`src/ui/stage/` (new): the stage layout.**
- `Stage` takes the world, the time of day, Truffle's state, the card and the feedback sheet.
- It is pure layout: CSS grid regions per size class.
- `FeedbackSheet` replaces `BottomBar` for lessons.

**`src/ui/truffle/` (reworked): the rigged Truffle.**
- `rig.ts`: the parameter model, presets and the spring maths. Pure and unit-tested.
- `TruffleRig.tsx`: renders the parts from the parameters.
- `timelines.ts`: hop, flinch, pounce, purr.
- `behaviour.ts`: idle scheduling, the question-calm rule, the mood mapping, and touch gesture detection.
- `Pet` keeps its props and API; callers change only where they gain new reactions.

**`src/ui/worlds/` (reworked): the world art.**
- `kit/`: shared paper primitives (layer with shade and sunlit edge, cloud, tree, tuft, flower, fence, shadow) and the palette.
- One file per world composing them, with named prop anchors.
- `WorldTaps` becomes `WorldProps`: props with positions and the moments Truffle plays with them.

**The fit sweep (`scripts/fit-check.ts`) gains:**
- stage invariants: lesson card and Truffle boxes identical across questions and activities for each size, and feedback sheet width identical across activities;
- every world at every size with the stage zone checked empty of props;
- a frame-time probe.

## 8. Phasing (each phase is its own plan, reviewed and shipped on its own)

| Phase | Delivers | Proves |
|---|---|---|
| **A. Stage + yard** | Stage layout and `FeedbackSheet` for every lesson activity; the 后院 yard redrawn in the new style with its props; the hanzi and sentence sizing rules; the other 7 worlds keep their current art behind the new stage. | The layout and the look, on the real device. |
| **B. Living Truffle** | The rig, idle life, the question-calm rule, reactions, touch, reduced motion; moods mapped; all costumes, accessories and powers riding on the rig. | Truffle's personality. |
| **C. The other worlds** | 草丛 → 海盗岛 redrawn with props, prop moments, evening light. | Consistency across the journey. |
| **D. Home on the stage** | Home rebuilt on the stage; journey stops on each world's path; one top strip; goal title in Chinese with an ink icon; celebration sunburst. | The daily first impression. |
| **E. Paws and personality** | Front paws, talking mouth, greeting and mood memory. | The extra delight. |

## 9. Testing

**Unit tests:**
- rig presets and blending: springs converge, and limits hold (tilt ±8°, lids 0–1);
- the mood → preset mapping covers every existing mood;
- the behaviour scheduler: question-calm suppresses idle extras, and reduced motion drops body motion;
- gesture detection: stroke, tap and tail tap;
- stage region maths per size class.

**Component tests:**
- every activity renders inside `Stage`;
- `FeedbackSheet` is the only bottom bar;
- Truffle keeps one spot across activities.

**Contract tests:**
- no emoji or English on child screens (the existing tests), extended to world kit files;
- no SVG filters inside the Truffle rig or on moving world parts.

**Fit sweep in WebKit at all 6 sizes:**
- 0 problems;
- the new stage invariants and frame-time budget;
- screenshots of every world and every costume reviewed by eye.

**On the iPad:** the parent and their son try phase A and phase B before the next phase starts.

## 10. Decisions from the parent's review (2026-10-04)

The spec was approved.
1. **World props:** the proposed props are fine (§2 table).
2. **Recorded meows:** none. Synthesised effects stay, plus a purr loop (§4.7).
3. **Evening:** Truffle does not fall asleep on Home. Evening only adds light and a sleepier idle mood (§4.2).
