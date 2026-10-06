# 字己 ZiJi — The Word Thief, sub-project 3a: the story bible and Season 1's first chapters (design)

**Date:** 2026-10-06
**Status:** draft for the parent's review
**Parent spec:** `docs/superpowers/specs/2026-10-06-ziji-word-thief-design.md` §5 (story), §5.9 (setting). This spec settles what that spec left to "a further spec of its own" for the story.

## 1. Where 3a sits

Sub-project 3 (story engine + Season 1) is split into four parts (parent, 2026-10-06):

| Part | Delivers | Notes |
|---|---|---|
| **3a** (this spec) | The story bible, the Season 1 outline, chapters 1–3 written in full | Writing only. No app code. |
| 3b | Art pipeline and style: a style sheet, prompts, one test location and Granny Dragon | The parent makes the backgrounds in the **Gemini app** (Google AI Pro), from prompts Claude writes. Claude crops, compresses and wires them in. |
| 3c | Story engine | Chapter format loader, page reader, word weave, Granny Dragon's lines with audio, a light hook (setup pages before today's lesson, payoff after), the painted town map |
| 3d | Season 1 complete | Chapters 4–18, the rest of the art, deploy |

3a and 3b can run side by side. 3c can start on chapters 1–3 with placeholder art.

## 2. Decisions (parent, 2026-10-06)

- **Seasons:**
  - Season 1 is a catch-up season built from **一上 to 二上**, so the story starts from his earliest class words.
  - Season 2 covers 二下, his current term.
  - Season 3 covers 三上 and starts in January. After that, one season per term.
  - The parent's aim: "all material covered".
- **Crew in Season 1:** Dog, Ox and Pig. Dragon stays out of the crew, because Granny Dragon is a dragon.
- **Greek myths** (he's really into them) appear as Dog's running gag, not in the plot.
- **He reads the English pages himself.** There is no English narration. Write for a confident Year 2 reader.
- **Approach B:** the bible, the outline and chapters 1–3 in full, so the tone and reading level can be judged on real pages before chapters 4–18 are written.
- **Word coverage, through three channels** (§5).

## 3. The bible (`docs/story/bible.md`)

### 3.1 Cast

- **The Word-Keeper:**
  - This is him.
  - He is unnamed in the story, because the repo is public. He never appears on a page.
  - Characters look out of the page and talk to him ("Word-Keeper, what does this sign say?").
  - His answers in lessons are his actions in the plot.
- **Truffle:**
  - The hero and the crew's leader.
  - He keeps the personality the app already has: proud, a bit grumpy (哼！), secretly soft.
  - Running gag: he claims every plan was his idea, especially the ones that weren't.
- **Dog:**
  - Loyal and over-excited.
  - The crew's self-appointed Greek-myth expert, who compares every disaster to a myth and always gets it slightly wrong ("This is just like Heracles and the… Hydra-cat?").
  - He gives the Word-Keeper something to recognise and correct.
- **Ox:**
  - Takes everything literally. Told to "hold your horses", he goes looking for horses.
  - He carries the tone misfires of rule 2 (买/卖).
- **Pig:**
  - Always hungry.
  - She smells trouble before anyone else, literally.
  - She's the reason half the missions start at the hawker centre.
- **Granny Dragon (龙奶奶):**
  - Runs the kopitiam.
  - Speaks **only Mandarin**, slowly and kindly. She orders kopi and asks about school.
  - She knows more about Hush than she says, and is Season 1's mystery thread.
- **Professor Hush:**
  - A theatrical, vain inventor. His machine, the Hush-o-Matic, sucks the words out of things.
  - He is funny and never frightening, at *Bad Guys* level.
  - His secret: as a boy, he was laughed at for stumbling over his grandmother's language. It is hinted at in Season 1 and revealed only in the series finale.
- **Townsfolk:** 2–3 recurring neighbours from a multiracial town (parent spec §5.9). For example, the drinks-stall uncle and the vegetable auntie.

### 3.2 字己镇

- A Singapore neighbourhood: the nine places of parent spec §5.9, with tropical weather and light.
- Season 1 uses five of them:
  - the HDB block and its void deck (Truffle's home)
  - the hawker centre
  - the wet market
  - the school
  - the playground
- A place that loses its words stops working: a 门 won't open, a 鱼 forgets how to swim. It turns grey and its signs go blank.
- Restored places come back in colour. This matches the town map: 2c's plain map now, 3c's painted one later.

### 3.3 The magic (hard rules, parent spec §5.2)

1. A word works only if it is understood. Seeing it is not enough.
2. Tones change the spell: 买/卖, 猫/毛, 汤/糖 cause comic misfires.
3. Parts combine: 木+木 → 林, 日+月 → 明.

- Each rule is first shown by a scene in Season 1, never explained as a lecture.
- The magic never solves a problem with a rule the reader hasn't been shown.

### 3.4 Arc and hints

- The bible holds the series arc across seasons: the crew grows to 12, and the finale is the Word-Keeper teaching Hush.
- It also holds the schedule of Hush's secret hints:
  - Season 1 plants two;
  - each later season adds one;
  - the finale pays them all off.

## 4. Season 1, *The Silent Street* (`docs/story/season-1/outline.md`)

The season has 18 chapters, one a day. Each line of the outline gives the chapter's place, its problem, the rule or gag it uses, its planned slot words, and any hint.

| Chapters | Beat |
|---|---|
| 1–3 | **The arrival.** Hush's machine hits Truffle's HDB block: the lift button, the 门 and the letterbox stop working. Truffle meets the Word-Keeper, the only one who can still see words. Granny Dragon feeds them and gives the first clue. |
| 4–5 | **Dog** is stuck outside a playground gate that has lost its word, and joins the crew. |
| 6–7 | **Pig** is at the hawker centre, where the dishes have lost their names, and joins the crew. |
| 8 | **Ox** is at the wet market. 买 and 卖 get swapped, and he sells the stall to himself. He joins the crew. |
| 9–14 | **Chasing Hush.** The crew restores the school, the market and the hawker centre, one problem per chapter. Rule 3 is discovered when the school garden needs a forest (木+木+木). **Hint 1:** Hush flinches when Granny Dragon speaks. |
| 15–17 | **The trap.** The crew finds Hush's word-store under the void deck. Ox's literal thinking accidentally opens the lock. **Hint 2:** an old photo of a boy with his grandmother. |
| 18 | **Finale.** The block's words come home. Hush escapes with the machine towards the MRT station, setting up Season 2. |

## 5. Word coverage

一上 to 二上 has about **1,509 words he can learn by ear**: 564 single characters and about 945 两字词 and longer words. All of them are practised by the word ladder whatever the story does. The story makes them appear in context through three channels:

1. **Written slots:**
   - About 150 across the season, 6–10 per chapter.
   - They are spread so that 一上 words come first, then 一下, then 二上.
   - No slot word repeats within a chapter.
2. **Granny Dragon's Mandarin:**
   - Her 1–3 lines per chapter and each chapter's 听一听 scene (3–5 lines) together use about 120 different words across the season.
   - These are mostly words that are not slot words.
3. **Rescued words:**
   - Each chapter's payoff has a `[rescued]` marker. There, the words he actually practised that day pop back into the place ("The 门 opens! 鱼 swim again!").
   - They are filled in from his own lesson on the day, not written ahead, so every word he learns appears in the story at least once.
   - The 3c engine renders them; 3a only places the marker and writes the line around it.

## 6. Chapter format (`docs/story/season-1/chNN.md`)

These files are for the parent to read, and the 3c engine will load the same format. The format is Markdown with a small fixed vocabulary:

```markdown
---
chapter: 1
title: The Silent Street
place: hdb
slots: [门, 电梯, 信]
---

## Setup

### Page 1
@scene hdb-morning
Truffle stretched on the void deck bench. It was a perfect, boring Saturday.
> Truffle: Nothing ever happens here.

### Page 2
...

## Granny
龙奶奶: 你们饿了吗？ | Are you hungry?

## Listen
龙奶奶: 小猫在门口等我。 | The little cat is waiting for me at the door.
龙奶奶: 他说门不开了。 | He says the door won't open.
? 谁在门口？ | Who is at the door? = 小猫 | 小狗 | 龙奶奶

## Payoff

### Page 1
[rescued] The words pour out of the machine and fly home.
...
```

- **Slots:**
  - Written as `{门|door}`: the word's Chinese text, then the English that reads naturally in the sentence.
  - The 3c engine shows English, Chinese with small English beneath, or Chinese only, according to his ladder state (parent spec §5.5).
- **Speech:** written as `> Name: line`.
- **Pages:** each `### Page` holds about 40–60 English words, with at most 4 speech bubbles.
- **Mandarin lines:** `龙奶奶: <中文> | <English>`.
- **Questions:**
  - Written as `? <question> | <English> = <right answer> | <wrong> | <wrong>`.
  - 谁 and 什么 questions come first; 为什么 questions start from chapter 10.
- **`@scene <id>`:** names a background for 3b. It is a placeholder until the art exists.

## 7. Writing rules and checks

A script (`scripts/story/check.ts`) checks every chapter file. Each one must pass before the parent sees it.

- Every Chinese character in Granny Dragon's lines and the 听一听 lines must be taught by **二上** (`moe2024.json` school order).
- Every slot word must be a real word in the app (a `b:` character or `w:` ladder word) taught from 一上 to 二上.
- A chapter has 6–10 slots, and no slot word repeats within it.
- Each page has at most 60 English words and at most 4 speech bubbles.
- Each 听一听 has 3–5 lines and 1–2 questions. Every answer choice must appear in, or be clearly ruled out by, the scene.
- No real brand names, logos or businesses.
- All story text and Mandarin is written fresh for the app, never taken from the textbook or class material (the parent's standing rule). It is written in Singapore Mandarin (组屋, 巴刹, 小贩中心, 食阁…).
- The script also reports season totals: the count of distinct slot words and of Granny/听一听 words, and a breakdown of slot words by term.

## 8. Review

1. **The bible and outline first:** the parent reviews them, and changes are cheap at this stage.
2. **Chapters 1–3 next:**
   - The parent judges tone, reading level and the Chinese/English mix.
   - The parent is invited to watch him read chapter 1 and see whether the reading level holds.
3. **After that:** changes asked for in the chapters go back into the bible's notes on voice, so chapters 4–18 (3d) follow them.

## 9. Testing

- `scripts/story/check.ts` has unit tests (vitest) covering:
  - each rule in §7 on small fixtures;
  - the format parser for slots, speech, Mandarin lines, questions and `[rescued]`.
- The same parser becomes the 3c loader, so its tests carry over.
- `npx tsc --noEmit -p .` and the full suite must pass before anything is committed to main.

## 10. Out of scope for 3a

- **3b:** art (the style sheet, Gemini prompts, backgrounds, cast drawings).
- **3c:** the app screens and the engine: the reader, word weave rendering, rescued words, audio for story lines, the painted town map.
- **3d:** chapters 4–18.
- Seasons 2 and onward (only their place in the bible's arc).
