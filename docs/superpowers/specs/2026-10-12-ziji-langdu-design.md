# ZiJi 朗读 back as a daily step: modelled repeated reading — design

Date: 2026-10-12 · Sub-project 4b of the lesson overhaul · Base: main at 9167ba0

## 1. Why

The research report (`reports/Primary Chinese outcomes strategy.md`) says that modelled repeated reading has the strongest evidence of anything ZiJi can do:

- fluency effect size 0.64 and comprehension 0.42;
- it works better with a model reading first and a cue to read for meaning;
- in Chinese, repeated reading with prosody modelling gave large gains in character reading.

**"The active ingredient is a good prosodic model."** The report's P0 sequence is listen → read along with highlighting → record → play back next to the model → re-read, plus one meaning question per passage, with no strict speech-recognition scoring.

The existing 朗读 step (`src/langdu/**`, `src/activities/langdu/LangduStep.tsx`) has been parked since 2026-10-05. It has passages, a 3-day cycle, a self-introduction warm-up, a loudness meter and parent misread marking. It falls short of the research in three ways:

- its model is the iPad voice reading chopped phrases;
- it has no highlighting, no model-versus-child comparison and no meaning question;
- the parent reviews in a separate tab.

**Success:**
- 朗读 is the last step of every lesson, about 3 minutes, inside the ~15-minute lesson.
- He hears whole sentences read by the iPad's best Chinese voice, with the sentence highlighted as it is read.
- He reads alone and is recorded, compares his take with the model, can re-read once, and answers one meaning question.
- The parent reviews passage takes in Listen & confirm, alongside Say takes.

## 2. Decisions (parent, 2026-10-12)

| Question | Decision |
|---|---|
| Model voice | **The iPad's Premium/Enhanced Chinese voice reading whole sentences.** Recorded clips stay off (parent, 2026-10-08) |
| Placement | **Every lesson**, as the 4th step. The other steps shrink so the lesson stays about 15 min |
| Parent review | **In Listen & confirm**: his passage take next to the model, tap misread characters, then Done |

## 3. The 朗读 step

The step runs in this order inside `LangduStep`. Parts that already exist are reused where they fit.

1. **Warm-up.** The self-introduction (「老师好！…」, `introLines`) runs **on day 1 of each passage only**, that is when `ReadingState.days === 0` for the current passage, instead of every lesson.
2. **Listen and follow.**
   - The passage is split into **sentences** at 。！？, and at a parent "/" mark only when it ends a sentence-length unit. Commas and 、 do not split. This is a new `splitSentences(text)`.
   - The model reads the sentences in order, one `speak()` utterance each, through the existing voice selection.
   - The current sentence is **highlighted**. The highlight starts when that utterance starts and clears when it ends, using the existing speaking start/end signals that move Truffle's mouth.
   - Tapping any sentence replays it.
   - A 「开始朗读」 button appears after the first full read-through.
3. **Read alone (recorded).**
   - The whole passage is shown, with the loudness meter and the 60 s auto-stop, as today.
   - Pinyin uses the **per-reading fading** from 4a (`PinyinFade` with known readings, tap to peek). This replaces the old `pinyinMode(warmups)`.
4. **Compare.**
   - Two large buttons: 「听我的」 plays his take, 「听老师的」 plays the model by sentence with highlighting.
   - 「再读一遍」 offers **one** re-read. The better take is kept, by the existing `earnsBonus` comparison: louder, or no more than 90% of the duration and at least half as long. The bonus star stays.
   - 「下一步」 continues.
5. **Meaning question.**
   - One question, 谁 / 哪里 / 什么 / 为什么, with 3 choices. It is written for each of the 20 built-in passages as content in `src/content/passageQuestions.ts`.
   - Parent passages get an optional question added in the Reading texts tab: a question plus three choices with the right one marked. There is no question when none is given.
   - A miss shows the right choice and replays the sentence that answers it. Each question names its answering sentence by index.
   - It is not graded on cards; it is logged for the parent only.
6. 「完成」 ends the step.

**Repeated reading across days:** the existing 3-day cycle (`CYCLE_DAYS`, `pickPassage`) keeps the same passage for 3 days. Parent passages come first. Built-ins come next, filtered to ones where he knows ≥90% of the characters.

**Microphone blocked or unavailable:** the step still runs Listen, then Read aloud *unrecorded* (with a 「读完了」 button), then Meaning. Compare is skipped. If the microphone was refused earlier in the lesson by a Say card, 朗读 does not ask again (`useRecorder(startBlocked)`).

**Extra reading (多读一遍)** on Home stays as an extra round (Listen, Read, Compare). It does not count as a cycle day and earns no stars.

## 4. Lesson budget

At the default 15 minutes:

| Step | Before | After |
|---|---|---|
| 认新字 | ~3 min | ~3 min |
| 练一练 | 6 min box (share 0.4) | **5 min box** (`PRACTICE_SHARE` → 1/3) |
| 写一写 | 5 characters | **4 characters** at < 20 min (`writeCharTarget`) |
| 朗读 | — | **~3 min** (last step, not time-boxed) |

The other lengths keep their proportions: the practice share is 1/3, and the writing targets are 20→5, 25→7, 30→8, 40+→9.

## 5. Voice

- **Selection:** the existing voice selection prefers Premium, then Enhanced. A new `voiceTier(): 'premium' | 'enhanced' | 'default' | 'none'` reports what is in use.
- **Overview warning:** when the tier is `default` or `none`, the Overview shows: "朗读 uses the iPad's voice as the model. For natural reading, download a better Chinese voice: Settings → Accessibility → Spoken Content → Voices → Chinese (China mainland) → 婷婷 (Enhanced) or Lili (Premium), then reopen the app."
- **Settings:** shows the voice in use and its tier.
- **Speech rate:** the model uses the parent's speech rate (default 0.8).

## 6. Parent review in Listen & confirm

- **Which takes join the queue:** passage takes (`prompt.kind === 'passage'`), **the newest take per passage per day**. When a newer take of the same passage arrives, older *unreviewed* takes of that passage leave the queue; they are not deleted.
- **A passage row shows:**
  - the title;
  - the passage text with tappable characters, reusing today's misread marking (`applyMisreads`, `addExtraDay`, `extraDayGiven`);
  - his take;
  - 「听老师的」, which plays the model by sentence;
  - **Done**.
- **What Done does:** it sets `review: 'ok'` (meaning "listened") and saves the marks. Marked characters become priority words, as today.
- **Badge:** counts Say takes plus passage takes waiting.
- **Tidy:** reviewed passage takes older than 14 days are deleted, keeping each passage's newest take. Passage takes count toward the Recordings warning as they do today.
- **Self-introduction recordings** do not join the queue. They stay in the Recordings tab.

## 7. Settings, existing data

- **Switch:** `settings.langdu` is the existing flag. Settings gains a **「朗读 Read aloud」** switch.
- **One-off move:** `lessonVersion` 7 turns `langdu` on once for existing installs. A new install defaults to on. `settings.story` (看图说话) stays off.
- **The Activities "speaking" checkbox** appears again because 朗读 is on.
- **Saved lessons** from before the move have no speaking step and load as they are.
- **No migration** of recordings or `ReadingState`.

## 8. Testing

- **Unit tests:**
  - `splitSentences`: 。！？, commas don't split, "/" handling;
  - the warm-up shown only on day 1;
  - budgets: `PRACTICE_SHARE` and `writeCharTarget` values;
  - the `lessonVersion` 7 migration, run once only, and a later parent "off" sticks;
  - `voiceTier`;
  - the queue: newest take per passage per day, older unreviewed takes dropped from the queue, the tidy rule;
  - the meaning-question content check: every built-in passage has one, the right answer is among the choices, and the answering sentence index is valid.
- **Rendered tests:**
  - the full flow: warm-up on day 1 only, listen with highlight following speak start/end, read, compare, one re-read keeping the better take, meaning question right and wrong;
  - microphone blocked;
  - a microphone refused earlier, not asked again;
  - the review row: marks plus Done;
  - the Overview voice warning;
  - the Settings switch.
- **WebKit:** each 朗读 part and the passage review row at iPad and phone sizes.

## 9. Out of scope

Recorded or neural voice clips. Per-character karaoke timing. Speech-recognition scoring. 看图说话 (`settings.story`). New built-in passages (the 20 stay). A passage generator from known characters.

## 10. Amendment 2026-10-17: the bonus star rewards accuracy, and the question comes first

Parent decision, 2026-10-17, from the learning-rules review. A star for reading quicker or louder teaches rushing (Kuhn & Stahl 2003). §3's `earnsBonus` is replaced by the rules in `src/langdu/stars.ts`.

- **Complete read:** a take is complete when both of these hold:
  - it lasts at least the passage's Han characters ÷ 4 seconds, since no P2 child reads aloud faster than that;
  - it ended at least 1 s before the recorder's own limit (`readLimitMs`), so he stopped it himself.
- **When the bonus star is earned:** only on a re-read of a passage, meaning a later lesson's take of it, and only when that take is complete.
  - **The parent reviewed the last take:** the new take stores that take's misread count as `misreadsBefore`. The star comes at the parent's Done in Listen & confirm, once, when the new take has fewer misreads, or none both times.
  - **The last take was never reviewed:** the star comes at once.
  - **Never** for speed or loudness.
- **The kept take of a lesson:** the re-read (再读一遍) when it is complete, else the first take. He has just compared his read with the model's.
- **Purpose cue:** Listen shows the meaning question as 「读的时候想一想：…」 before he reads (Therrien 2004). It is asked after reading, as before. An extra round (多读一遍) has no question, so it shows none.
