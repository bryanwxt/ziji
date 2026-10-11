# ZiJi cards that teach: why-feedback, pinyin fading, word families — design

Date: 2026-10-12 · Sub-project 4a of the lesson overhaul (4b, 朗读 as its own step, comes next) · Base: main at b586317

## 1. Why

The parent reports that lessons feel repetitive. The research report (`reports/Primary Chinese outcomes strategy.md`) gives three reasons to change the cards:

- **Feedback:** d = 0.48 overall, and d = 0.99 when the feedback is high in information. Feedback works best when it shows why: the distinguishing component, the radical's meaning, a replay of the tone.
- **Pinyin:** show it for new characters, hide it for known ones, and reveal it on tap. On-screen pinyin shows an expertise reversal, helping novices and becoming redundant later. Showing the character about 5 s before its pinyin and English beat showing them together (Chung 2003).
- **Morphology:** explicit morphology teaching (组词 families) improved character recognition and writing from memory in Chinese trials.

**Success:**
- A wrong answer tells him *why*, in one short line matched to the kind of slip.
- Pinyin disappears over characters he reads, and he can peek with a tap.
- Each new character shows its family of words he can read, and a family question replaces some repetitive rung-2 items without lengthening the round.

## 2. Decisions (parent, 2026-10-12)

| Question | Decision |
|---|---|
| Pinyin fading | **Per character, tap to peek.** Shown until the character's Read rung passes. After that it is hidden, but its slot is kept |
| Word families | **A card row plus a new family question** |
| Release split | 4a = these card changes. 4b = 朗读 on its own, later |

## 3. Feedback that explains why

The rules apply to the wrong-answer feedback sheet (`FeedbackSheet` with `MeaningNote`) of FlashcardStep and the practice questions. Right answers are unchanged: a cheer, and auto-advance.

- **Look-alike character miss.** This covers a pick of a character when the target is a character, where the two share at least one component or the radical: listen, the 组词 gap, 钓鱼, and fit when single characters are involved.
  - Show both characters side by side, the right one first.
  - Highlight **the part that differs**: the components or radical that are in one and not the other.
  - Where a differing part is a radical with a meaning in `RADICALS`, show its icon and short meaning under it, for example 「河 氵water · 何 亻person」.
  - Work this out at runtime from `components` and `radical`, with a pure function `differingParts(a, b)` returning `{ right: string[]; picked: string[] }`. Ignore the trivial parts already listed in `zibian.ts`.
  - When nothing differs in a meaningful way (an empty result), fall back to today's sheet.
- **Pinyin miss** (read mode). Play the right reading again, and classify the slip with a pure `pinyinSlip(right, picked)`:
  - **tone:** same toneless syllable. Show 「声调不同」 with the right syllable and the picked one, and the tone marks enlarged.
  - **sound-part trap:** the picked reading is the phonetic component's reading (from `trapReadings`). Show 「<part> 读 <its pinyin>，<char> 读 <right pinyin>」.
  - **initial or final:** highlight the letters that differ in the picked and right syllables.
  - **other:** today's sheet.
- **Meaning miss** (English choices and 组词 gaps). Keep today's sheet, and add the radical's meaning hint 「氵 → water」 when the target character has a meaningful radical.
- **Character first.** In every wrong-answer sheet, the right answer's character(s) appear immediately. Its pinyin and English fade in **1 s** later, using CSS animation delay. `prefers-reduced-motion` turns the fade into an instant show.

## 4. Pinyin fading

- **Rule:** `showPinyin(ch)` = the character's Read rung has **not** passed. The set of characters he reads is main's `know.knownChars`, from Read-passed words.
- **Applies to** every child-facing `Label` that shows Chinese with pinyin inside questions:
  - practice sentences and 组词 (UseQuestion, BuildSentence once a tile is placed, UnderstandQuestion's revealed sentence, PairGame summary rows, Match and Idiom lines that use Label);
  - the new-word card's 词语 rows;
  - writing cues that show pinyin. When the target character itself is known, its cue pinyin still shows, because the cue is what he writes from.
- **Mechanism:** `Label`'s existing `pinyinFor` hook. It hides a syllable but keeps its slot.
- **Tap to peek:** tapping a character whose pinyin is hidden shows that syllable for **3 s** and speaks the character. One peek shows at a time. A peek never grades anything.
- **Never faded:**
  - pinyin answer choices;
  - feedback sheets (full pinyin, character first, §3);
  - the new-word card's own pinyin for the new character, which appears **2 s** after the character;
  - parent screens.
- **Switch:** Settings 「拼音渐隐 Fade pinyin」, `settings.fadePinyin` (absent = on). Off restores today's always-on pinyin.

## 5. Word families

- **Family of a character:** `familyOf(ch, readable)` gives words containing `ch` whose every other character is in `readable`, the set of characters he reads. Words come from the 组词 examples, the 词语 ladder and `wordsWithChar` (HSK words), and must have a gloss. They are ordered by HSK level and then by length, and duplicates and the character alone are dropped.
- **New-word card row 「一家人」:** shows up to 4 family words, each with a speaker button. Pinyin follows the fading rule. The row is hidden when fewer than 2 words qualify, and sits after the 词语 rows and before the 成语.
- **Practice question 「找一家人」** (ask `'family'`, rung 2):
  - **Prompt:** the character, with the line 「哪两个词有『生』？」 and the character in the prompt.
  - **Board:** 6 tiles. Two are family words. Four are distractors: words that contain a look-alike or sound-alike of the character instead, and do not contain the character. He taps 2.
  - **Correct:** both picks are family words.
  - **Feedback:** the two family words with English and pinyin. On a miss, the picked distractor's differing character is highlighted, using §3's look-alike rule.
  - **When it is asked:** only for words with a family of at least 2 readable words and at least 4 distractors available.
  - **How often:** at most **2 per lesson**. It replaces a rung-2 `word` or `pair` item for that word, so the round's length is unchanged.
  - **Grading:** like the other rung-2 questions, on the meaning card, once per lesson.

## 6. Existing data

No migration. `settings.fadePinyin` is absent, meaning on. Saved lessons load as they are. The new ask kind only appears in newly built rounds.

## 7. Testing

- **Unit tests:**
  - `differingParts`: same radical with a different phonetic, the reverse, a trivial-only difference falling back, and characters with no components.
  - `pinyinSlip`: tone, sound-part trap, initial, final, other.
  - `showPinyin` with the fade switch on and off.
  - `familyOf`: readable-only, gloss required, order, de-duplication.
  - Family board: a correct pair present, 4 distractors without the character, no duplicates.
  - Family selection: at most 2 per lesson, replaces rather than adds.
- **Rendered tests:**
  - each wrong-answer sheet type;
  - the 1 s character-first fade class;
  - faded Label syllables with tap-to-peek, which shows, speaks and hides after 3 s;
  - the new-word card's pinyin delay and the 「一家人」 row, including hidden when fewer than 2;
  - the family question: right, wrong and feedback;
  - the Settings switch.
- **WebKit screenshots** at iPad and phone sizes: the look-alike and pinyin-slip sheets, a faded sentence with a peek, the family row and the family question.

## 8. Out of scope

朗读 as its own step (4b). Homophone sorting as a separate drill. Changes to the stars, Say cards or lesson length. Recorded audio for new content.
