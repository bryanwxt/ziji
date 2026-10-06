# 字己 ZiJi — The Word Thief: a listening-first word ladder inside a story (design)

**Date:** 2026-10-06
**Status:** draft for the parent's review
**Replaces:** the reward system of the Truffle spec (`2026-10-02-ziji-truffle-design.md`: worlds, costumes, stickers, finds, powers, stars, chest) and the lesson shape of `2026-10-05-ziji-lesson-flow-design.md`.
**Keeps:** school order (《欢乐伙伴2.0》 lists, CL/HCL), the importer and 听写, FSRS scheduling, stroke-order writing, the stage layout (`2026-10-04-ziji-stage-design.md`).
**Background:** `531/reports/Primary Chinese outcomes strategy.md` (research report, 2026-10-06).

## 1. Why, and what success looks like

**What the parent said (2026-10-06):**
- His speaking gap comes from limited vocabulary and character understanding.
- When spoken to in simple Mandarin, he **doesn't understand much**. The gap starts with listening.
- Gamification should become an immersive story with Truffle as the main character. His learning moves the plot and helps Truffle reach his goals.
- He likes *The Bad Guys*, *The 13-Storey Treehouse* and *Charlie and the Chocolate Factory*. The parent likes Sanderson-style plots.
- The current reward system does not need to be kept.
- Practice time should go up, not down.

**What the research says** (see the report for sources):
- Listening comprehension caps both speaking and reading. It grows from lots of input that is mostly understood (about 95% known words).
- Apps reliably move constrained skills (characters, words, pinyin). Vocabulary the child can use is the bridge an app can build towards speaking.
- Retrieval on separate days is the honest test of learning. App self-measures overstate gains by about 0.42 SD.
- Morphology (组词 families, character parts) is backed by L1 trials.
- Game narrative helps only when the learning *is* the mechanic ("intrinsic integration"). A story bolted on as a reward is a distraction.

**Success:**
- He understands, by ear, words he has learned in ZiJi, and follows short Mandarin scenes built from them.
- Progress counts words he understands by ear, reads, uses and says, each checked on two separate days. It does not count cards cleared.
- He meets the end-P2 targets (about 750 characters recognised, about 350 written) on production and on school 听写 by Nov 2026.
- He asks for the next chapter.

## 2. Five sub-projects, in order

Each sub-project gets its own plan, build and deploy. This spec covers all five at design level. Sub-projects 3 and 5 get a further spec of their own: the story bible and Season 1, and the speaking details.

| # | Sub-project | Delivers | Depends on |
|---|---|---|---|
| 1 | Audio pipeline | Neural TTS clips for every word, 组词, sentence and story line in range, each checked automatically | — |
| 2 | Word ladder | Words as the unit, five rungs, honest progress, word-level placement, migration, an early plain town map | 1 |
| 3 | Story engine + Season 1 | Chapter format, the cast and painted town, word weave, Granny Dragon, town map, Season 1 | 2 |
| 4 | Session rebuild | The chapter-wrapped lesson (20 minutes of active practice); old rewards and home replaced | 2, 3 |
| 5 | Speaking | The Say rung (record and replay), and 看图说话 inside the story | 3, 4 |

**Why this order:** the story renders words by their ladder state, and its Mandarin needs good audio. Building the story first would tie it to character counts that are about to go.

## 3. The word ladder (sub-project 2)

### 3.1 The unit: a 词语

- A word is any 词语, including single-character words (门, 大). The existing `Word` record already holds multi-character words (from imported lists), so the model is extended, not replaced.
- A new generated content file lists each word's text, annotated pinyin, meaning, an optional emoji and 1–3 spoken sentences. Every sentence uses only characters taught up to the word's own term.
- **Where words come from:**
  - each school character's 组词
  - HSK 1–3 words
  - imported lists
- **Order:** a word becomes available once all of its characters have been taught in school order. After the school lists come the remaining words, in HSK order.

### 3.2 Rungs

Each rung is an FSRS card of its own (`CardKind`), keyed per word.

| Rung | Kind | Check |
|---|---|---|
| 1 Hear | `hear` | Audio only, then pick the meaning: an emoji or picture where unambiguous, otherwise English |
| 2 Understand | `understand` | Hears a short sentence containing the word, then answers a meaning question about it |
| 3 Read | `read` | Characters only, no pinyin, then pick the meaning, or hear the word and match it |
| 4 Use | `use` | 搭配, filling a sentence's blank, choosing the right word (the existing practice formats) |
| 5 Say | `say` | A prompt, then he records his answer. Switched on in sub-project 5 |

**Writing:**
- Writing stays per character (`write`, trace → recall).
- Its sources are the course's 识写字 and the importer's 听写 lists.

**Introduction and opening:**
- A new word is introduced once, with sound, characters and meaning together.
- The **Hear** card opens on that day.
- Each later rung's card opens only when the rung before it is **passed**.

**Passing:**
- A rung is passed when it has a correct **first attempt** on **two different local days**.
- The pass is worked out from review logs; nothing new is stored.
- Answers that are implausibly fast don't count towards a pass. The threshold is per format, set from his own median response time.
- Answers given after a hint don't count either.
- Passed rungs keep coming back for spaced review as FSRS schedules them.

**Owning a word:**
- A word is **owned** once Hear, Understand, Read and Use are all passed, plus Say once that rung is on.
- A lapse on an owned word's card does not take ownership away. FSRS brings the card back sooner, and the parent view shows lapses.

### 3.3 Characters

- A character counts as **recognised** once any word containing it has passed Read. This keeps the MOE 识读字 count honest without a separate recognition card per character.
- A character counts as **written** once its `write` card has passed (two days without misses beyond the current threshold).

### 3.4 Parent progress view

- Words: understood by ear, read, used and owned.
- Characters recognised against the course's 识读字 target to date (about 750 by end-P2), and written against its 识写字 target (350 CL / 435 HCL).
- A weekly trend.
- A monthly cold check: an unseen 60–100 character passage built from his range. He reads it aloud, the parent marks errors, and the result is logged.

### 3.5 Placement

- Placement moves to words and audio: he hears a word and picks its meaning.
- It walks school order to find his listening level.
- The 不知道 handling and banding stay as they are.
- Words placed as known get their Hear rung marked as a placement guess. The first real recheck confirms it, as now.

### 3.6 Migration

1. Old cards are left untouched. New cards are created alongside, so a rollback is just a reload.
2. Each character with a recognise card in review becomes its single-character word, with Read **passed**.
3. Hear cards for those words are queued gradually: at most 15 a day, before new words.
4. Meaning cards become Use cards for the same word, keeping their FSRS state.
5. Write cards carry over unchanged.
6. The migration is run first against an exported backup of his data and checked before it ships.

### 3.7 Early town map

Sub-project 2 ships a plain map of 字己镇 on Home. A building lights partly when one of its words passes Hear, and fully when he owns it. This gives him visible progress before the story exists. Sub-project 3 replaces it with the illustrated town.

## 4. Audio pipeline (sub-project 1)

**Choosing the voice:**
- CosyVoice 2, Kokoro and MeloTTS each read the same 20 hard items: 多音字, 一/不 sandhi, third-tone sandhi, 儿化 and a story paragraph.
- The parent listens and picks one voice for all clips.
- Granny Dragon may get a second voice from the same engine.

**Generation:**
- Done once, outside the app, in GitHub Actions (the Mac has too little disk and memory for CosyVoice 2, and the parent is often away from it). Scripts live in `scripts/audio/`. Clips are kept in a GitHub release asset, not in git.
- The input is pinyin-annotated text, so 多音字 are read as the card teaches. It reuses the reading fixes and the say-as table.
- Output is mono AAC (`.m4a`), about 4 KB per word.
- Clips are keyed by a hash of text plus reading, so a fixed reading gets a new clip.

**Checking:**
- Each clip is transcribed back by ASR and compared with the expected pinyin.
- Mismatches are regenerated once, then listed for the parent to spot-listen.
- Every word, sentence or story line in range without a clip is listed on the parent's report page. The iPad voice says it meanwhile, so a content push never waits for audio (clips for new content are generated automatically after the push).

**Size and serving:**
- Roughly 60–80 MB for school order plus HSK 1–3, plus each season's lines.
- Served from GitHub Pages under `audio/`.

**Loading:**
- The next lesson's clips are fetched in the background after each lesson.
- Recent clips are cached by the service worker.
- If a clip is missing, the iPad voice speaks it (the current `speak()`), so nothing ever goes silent.

**Speech code:** `speak()` gains a clip-first path. The cancel, deferral and watchdog logic stays for the fallback.

## 5. Story: *The Word Thief* (sub-project 3)

### 5.1 Premise and roles

- Professor Hush's machine is stealing the words of 字己镇, and anything that loses its word stops working: a 门 won't open, a 鱼 forgets how to swim.
- **Truffle** is the hero and leader of a crew of the 12 zodiac animals, recruited over the seasons.
- **He** is the **Word-Keeper**, the only human who can still see words.
  - Characters talk to him directly ("Word-Keeper, what does this sign say?").
  - His answers in the lesson are his actions in the plot.

**Tone:**
- Episodic, physical comedy (*Treehouse*).
- Lovable rogues and a crew with running gags (*The Bad Guys*).
- A theatrical, slightly mad inventor (*Charlie*).
- Sanderson's structure: clues planted early that pay off, a season-long mystery, and a finale where they converge.

### 5.2 Magic system (hard rules, stated in-story)

1. **A word works only if it is understood.** Seeing it is not enough.
2. **Tones change the spell.** 买/卖, 猫/毛 and 汤/糖 cause comic misfires.
3. **Parts combine.** 木+木 grows 林, and 日+月 gives 明. The crew discover this over the seasons, which teaches character structure.

The magic never solves a problem with a rule the reader hasn't been shown.

### 5.3 Series arc

- **Hush's secret, planted from Season 1:** as a boy, Hush was laughed at for stumbling over his grandmother's language. He decided that if no one had words, no one could be laughed at.
- **Finale:** the Word-Keeper teaches Hush.
- **Theme:** struggling with a language is normal and worth it. The story shows this and never preaches it.

### 5.4 Seasons and chapters

**Seasons:**
- One season per school term, 15–20 chapters long.
- A season's word slots and Mandarin lines are drawn from that term's textbook words, plus words he already owns.
- Season 1 starts at his placed level.
- Each season recruits 2–3 crew members, each with one personality trait and one running gag. For example, Ox takes everything literally and Monkey breaks everything.

**Each chapter has three parts:**
1. **Setup** (about 1 minute): 3–6 illustrated pages, with a problem Hush has caused.
2. **Mission:** the lesson (§6).
   - Hush's machine holds today's words, and each correct answer pops one back into the scene.
   - The chapter's goal, such as fixing the bakery, fills as he works.
   - The animation is generic but shows his actual words.
3. **Payoff and cliffhanger** (about 1 minute).

**Pacing:**
- One new chapter per day.
- Extra sessions that day are **patrols**: practice that restores more of the town, with no new chapter. A setting can allow two chapters a day.
- Missed days cost nothing. In the story, Hush is "recharging", and nothing in the town gets worse.

### 5.5 Word weave (language in the story)

- Story text is written in English with word slots: `{面包|bread}`.
- Each slot renders by its ladder state:

| State | Shown as |
|---|---|
| Not met | English |
| In progress (Hear passed, not owned) | Chinese, with the English small beneath; tap to hear it |
| Owned | Chinese only; tap to hear it |

- **Granny Dragon (龙奶奶) speaks only Mandarin.**
  - Her lines use only characters taught up to the season's term, and words he has at least met.
  - Her audio plays first. The English is revealed on tap, and only after he has heard the line.
  - She is the story's comprehensible-input channel, and the character who grows more understandable as he grows.
- Each chapter also has one short Mandarin scene for 听一听 (§6, step 5).

### 5.6 Town map (Home)

- 字己镇 is a painted scene (§5.7).
- Restored places are in colour; places still missing words are grey and blank-signed.
- The crew stand in the square.
- The next chapter's location pulses.
- Tapping a restored place lists the words that restored it, with audio.

### 5.7 Art

**Direction (parent, 2026-10-06): Ghibli-inspired.** The look, not their characters.
- **Backgrounds:** hand-painted-looking watercolour scenes (soft light, big skies, lived-in streets) for 字己镇 and its 8–10 locations. They are generated once per location as images, checked by the parent, and shipped as files.
- **Characters:** drawn as SVG in a soft, painted style that matches the backgrounds (gentle shading, rounded shapes, no hard black outline). Characters stay in code because 14 characters across hundreds of poses can't be kept consistent with generated images, and SVG keeps them animatable and light.
- Sub-project 3's spec settles how the images are generated, their size budget, and a style sheet both layers follow.
- **Cast:** Truffle (redrawn in the painted style), Granny Dragon, Hush, 2–3 townsfolk, and the zodiac crew drawn season by season. Each has 6–8 poses or expressions.
- **Locations:** 8–10 town locations as scene backgrounds.
- Pages are portrait chapter-book layouts with large English text, speech bubbles and sound effects.
- Pages are checked in WebKit at iPad and iPhone sizes, using the fit sweep and stage cases.

### 5.8 Content process and rules

- **Writing:**
  - Claude drafts the story bible, then each season, a term ahead.
  - The parent reviews both before anything ships.
  - Seasons are static content. Nothing is generated on the device.
- **Content tests:**
  - every Chinese line uses only characters taught up to that term
  - every slot's word exists in the word list
  - every line and slot has a clip
  - the content hash is pinned
- The repo is public. The story is original fiction, so it can be public. (Separately, the MOE lists are still public; that decision is still open.)

### 5.9 Setting: a Singapore neighbourhood (parent, 2026-10-06)

His textbook 《欢乐伙伴》 is set in Singapore, so the story is too: it reuses the places and words he meets at school.

- **字己镇 is a Singapore neighbourhood**, painted in the Ghibli-inspired style (§5.7). Hush strikes these places:
  - an HDB block and its void deck
  - the hawker centre
  - the wet market (巴刹)
  - the MRT station
  - his school and its canteen (食阁)
  - the playground
  - the community garden
  - the park by the sea
  - Chinatown at festival time

  The weather and light are tropical: thunderstorms, rain trees, the glow after rain, laundry on bamboo poles. Truffle lives in an HDB flat.
- **Singapore Mandarin:** word slots and Granny Dragon's lines use the everyday Singapore words he hears and reads, such as 组屋, 巴刹, 小贩中心, 食阁, 德士, 巴士, 红毛丹, 榴梿, 咖椰吐司 and 鸡饭. Granny Dragon runs the kopitiam, and her lines are everyday talk: ordering kopi, asking about school.
- **Seasons follow the Singapore year:** each season's finale falls on a festival in its school term. Chinese New Year (the zodiac crew's big moment), Hari Raya, National Day, Mid-Autumn lanterns and Deepavali. This covers the MOE culture-and-values outcomes as story, not lessons.
- **A multiracial town:** Malay, Indian and Eurasian neighbours and classmates (the drinks-stall uncle, the vegetable auntie, friends at school), as in his school and textbook.
- **Generic places only:** an MRT station, supertree-like gardens. No real brand names, logos or businesses.

## 6. The daily session (sub-project 4)

**Lesson length = active practice time** (parent, 2026-10-06): the default is **20 minutes**, and the parent can change it. Story pages, Truffle's reactions, restoration animations and celebrations don't count towards it.

- Only time spent on practice counts: from a question appearing until it is answered, plus intros and writing.
- The time-box counts this practice time and nothing else.
- The four practice blocks scale with the setting.
- **Migration:** a saved length of 30 (the old default) becomes 20. Any other value the parent set is kept, and from now on means practice time.

| # | Block | About | What happens |
|---|---|---|---|
| 1 | Chapter setup | ~1 min, not counted | Story pages |
| 2 | New words | 4 min | Each word escapes Hush's machine and Truffle catches it. He sees sound, characters and meaning together, then recalls the word straight away |
| 3 | Ladder practice | 10 min | Reviews due across all rungs, interleaved; Hear and Understand are weighted up. Correct answers restore the scene |
| 4 | Writing | 4 min | Trace → recall on due characters, framed as repainting a sign |
| 5 | 听一听 | 2 min | Granny Dragon's Mandarin scene, then 1–2 questions (谁/什么 → 为什么) |
| 6 | Payoff and cliffhanger | ~1 min, not counted | Story pages |

- Unfinished reviews carry over to the next day.
- The backlog pause that stops new words stays.
- Truffle reacts **after** answers, not during them: no popups mid-question.
- **Retired:** worlds, costumes, wardrobe, stickers, finds, powers, stars, chest, word of the day and today's path. Their code and tests are removed in sub-project 4. Their saved data is kept but no longer read.

## 7. Speaking (sub-project 5)

- **Say rung:** Granny Dragon asks a question. He records his answer and plays it back next to her model.
- **看图说话:** "Report to the crew what you saw." He gets a picture and a question ladder (谁, 什么时候, 在哪里, 做什么, 结果怎样, 心情), and connective cards.
- **Scoring:** no strict ASR scoring. A Say rung passes when he records an answer and the parent confirms it. This is lenient by design.
- **Parent summary:** a weekly summary with his best recording, three conversation prompts, English glosses and sample answers.
- 朗读 returns here as listen → read along → record → replay, using passages from the season.

## 8. Testing

- **Ladder** (unit tests):
  - rung opening
  - two-day passing from logs
  - excluding fast answers and answers after a hint
  - owning a word
  - character recognised and written rules
  - every migration case
- **Session:** block timing (only practice time counts towards the length; story and animation time don't), carry-over, chapter versus patrol, and missed days.
- **Content:** the rules in §5.8, plus the existing reading and level checks.
- **Audio:** every clip present, and the ASR check passing.
- **Layout:** the WebKit fit sweep and stage cases, for story pages, the town and every new practice format.
- **On device:** after each deploy, the parent plays through two chapters on the iPad.

## 9. Risks

| Risk | Mitigation |
|---|---|
| The story pulls time away from practice | Story time sits outside the 20 practice minutes and is capped at about 2–3 minutes; the mission *is* the lesson |
| Racing through answers to see the plot | Fast answers don't pass rungs; one chapter a day |
| Granny Dragon is too hard to follow | Only taught characters and met words; audio first; English on tap |
| Writing seasons is slow | Story bible first; seasons drafted a term ahead |
| TTS teaches wrong tones | Pinyin-annotated input, the ASR check, the parent's spot-listen list |
| Migration loses progress | Old cards kept untouched; a dry run on a backup |
| 60–80 MB of audio | Lazy fetch per lesson, a rolling cache, the iPad-voice fallback |

## 10. Out of scope (later)

- 造句 and 写话 builders
- pinyin typing
- video 会话
- 书面互动
- graded reading passages beyond 听一听
- the timed PSLE-format practice planned for P5–6 in the report
