# 字己 ZiJi — The Word Thief, sub-project 3c: the story engine (design)

**Date:** 2026-10-07
**Status:** decided under the parent's standing instruction (2026-10-07): "accept all recommended decisions; will fix post deployment". Each decision below is the recommended option, and the alternatives are noted.
**Parent specs:**
- `2026-10-06-ziji-word-thief-design.md` §5.4–5.6 (chapters, word weave, Granny Dragon);
- `2026-10-06-ziji-story-bible-design.md` (3a: format, chapters 1–3);
- `2026-10-07-ziji-story-art-design.md` (3b: picture-book page, backgrounds, Truffle, Granny Dragon).

## 1. What he sees

1. **Home → 开始:**
   - If today's chapter hasn't been read, the **setup pages** come first: picture-book pages with a painted scene, the cast in front and the words below. After the last setup page, Granny Dragon's 1–3 lines play.
   - Then the lesson starts, unchanged.
2. **After the lesson's celebration:**
   - **听一听:** Granny Dragon's Mandarin scene and its 1–2 questions. This step needs a voice; with none, it's skipped.
   - Then the **payoff pages**. The `[rescued]` page shows the words he practised today flying home.
   - The last page ends on the cliffhanger, then Home.
3. **One new chapter a day.**
   - A second lesson that day (再学一课) is a patrol: no new chapter.
   - Missed days cost nothing; the next lesson brings the next chapter.
   - When the written chapters run out (only 1–3 until 3d ships), lessons run as they do now, with no story.

**Rejected alternatives:**
- A separate "Story" tab he opens himself. It's optional, so the story stops being the frame around the lesson.
- Putting 听一听 inside the lesson's own steps. That changes the lesson flow, which is sub-project 4's job.

## 2. Content in the app

- **The chapters move** from `docs/story/season-1/*.md` to `src/content/story/season-1/*.md`. They are bundled with the app (`import.meta.glob('./season-*/ch*.md', { query: '?raw', eager: true })`) and parsed by 3a's `parseChapter`.
  - The move puts them under `src/content/**`, so the Audio build picks up their Mandarin automatically.
  - `docs/story/` keeps the bible, the outline, the style sheet and the prompts.
  - The 3a check script points at the new folder.
- **A content test** (`src/content/story/story.test.ts`) runs the 3a checks on every shipped chapter (0 problems). It also checks that every `@scene` has a WebP in `public/story/bg/`.
- **Audio:** `scripts/audio/inventory.ts` adds every Granny line and 听一听 line, and each question and its choices, as clips. Until the Audio build makes them, the iPad voice plays them (the existing fallback).

## 3. Story progress

`settings.story`:

```ts
{ chapter: number; readOn?: string; setupDone?: boolean; payoffDone?: boolean }
```

- `chapter` is the last chapter **finished**: 0 at the start.
- `readOn` is the local day the current one started.
- A chapter is **due** when it exists, and `readOn` is not today or the chapter isn't finished.
- **Setup:** opening the setup sets `readOn = today` and `setupDone`.
- **Payoff:** finishing the payoff sets `chapter + 1` and `payoffDone`.
- **If the lesson is abandoned:** the payoff stays owed and comes after the next completed lesson that day, or the next day before a new chapter.

## 4. The page reader (`src/story/StoryScreen.tsx`)

- **Route:** `{ name: 'story'; part: 'setup' | 'payoff'; then?: Route }`.
- **The 3b picture-book page:**
  - **Picture:** 4:3 on top. `bg/<id>.webp` comes from `@scene`, and the last scene carries forward.
  - **Cast:** standing in the lower-middle third.
  - **Words:** below, on paper.
  - **Navigation:** a big → button under the words, and a ← to go back. The page index sits in `data-page` for tests.
- **Who stands in the scene:**
  - the speakers on the page who have art (Truffle and Granny Dragon now; Dog, Pig, Ox and Hush when 3d draws them);
  - if nobody speaks, Truffle;
  - an optional `@cast truffle granny` line on a page overrides this. It is a new format word, and the 3a parser learns it.
- **Speech:** a bubble with the speaker's name. Narration is plain paragraphs.
- **Word slots** render by his ladder state (spec §5.5). The word is `b:<text>` for one character, else `w:<text>`. Its passed rungs come from `Knowledge.passedRungs`.

| State | Shown as |
|---|---|
| **Not met** (Hear not passed) | the slot's English |
| **Learning** (Hear passed, not owned) | Chinese with the English small beneath; tap to hear |
| **Owned** | Chinese only; tap to hear |

- **Granny's lines** (end of setup):
  - Each is shown with Granny Dragon talking while it plays.
  - The Chinese shows with pinyin. The English appears only after a tap, and only once the line has been heard (spec §5.5).
  - → moves on once every line has played. With no voice, the English is shown straight away.
- **听一听** (start of payoff, voice only):
  - "听一听！" Granny Dragon plays the scene's lines in order, each shown with pinyin, while she talks. He can replay them.
  - Then each question, as Chinese with pinyin and a speaker button, offers three choices (Chinese with pinyin, each tappable to hear).
  - A right answer brings a cheer. A wrong one gently shows the right choice, never twice in a row, and moves on.
  - **Not graded:** the story never touches his ladder cards. It's comprehension practice.
- **`[rescued]`:** the line, then up to 12 of the words he practised today, as chips flying from Hush's machine into the scene. Each is tappable to hear. Under reduced motion they simply appear. With no practised words, the line alone.
- **Reduced motion:** page turns don't slide; nothing moves except what the child taps.
- **Skip:** a quiet "跳过" on setup and payoff skips straight on. The chapter still counts as read, because a parent's day shouldn't be blocked.

## 5. The hook into the lesson

- **Home's 开始:** if the chapter is due and its setup isn't done today, go to `{ name: 'story', part: 'setup', then: { name: 'session', … } }`.
- **Celebration's final →:** if today's setup is done and its payoff isn't, go to `{ name: 'story', part: 'payoff', then: { name: 'home' } }`.
- **Unchanged:** extra lessons (再学一课), free play and placement.

## 6. Not in 3c (moved to 3d)

- **The painted town map:** it needs its own painting from the parent. The 2c plain map stays on Home until then.
- **Drawings of Dog, Pig, Ox and Hush.** Their pages show only the cast that has art.
- **Chapters 4–18.**

## 7. Testing

- **Unit:**
  - story progress: due, setup, payoff, abandoned lessons, days;
  - the slot state per ladder state;
  - the rescued words of today;
  - the `@cast` parse.
- **Screens** (jsdom):
  - setup pages advance and back;
  - Granny's English needs a tap after hearing;
  - 听一听 choices and the wrong-answer reveal;
  - no voice skips 听一听;
  - payoff marks the chapter;
  - Home routes through setup;
  - Celebration routes to payoff;
  - no chapter → no story.
- **Content:** every shipped chapter passes the 3a checks and has its backgrounds.
- **Layout:** WebKit stage cases for a setup page, the Granny page, 听一听 and the rescued page, at iPad portrait, iPad landscape and iPhone, plus the full fit sweep.
