# 字己 ZiJi — the lesson, rethought: new words first, one word in many contexts (design)

**Date:** 2026-10-05
**Status:** draft for the parent's review
**Builds on:**
- spec §19 (class-aligned practice), §20 (deeper practice) and §14 (placement);
- the stage spec (`2026-10-04-ziji-stage-design.md`), whose layout every new activity uses.

## 1. Why, and what success looks like

**The parent's feedback after using the app (2026-10-05):**
- 选一选 and 钓鱼 feel like the same drill: a gap and four tiles.
- Starting with revision before the new words is repetitive. Start with the new words and bundle revision into the exercises.
- 写一写 covers too few words, feels too simple for his level, and writes the same character back to back.
- He should meet each word in different contexts: on its own, in 词语, in 成语, and in sentences. He should also pair 词语 and tap words into sentences.
- After a wrong answer, he should see why, with English meanings.

**What the research says, and how this design follows it:**
- **Morphological (compound) awareness.** Knowing that a character keeps its meaning across 火车, 火山 and 火花 is one of the strongest predictors of Chinese reading and vocabulary growth in children (McBride-Chang, Shu et al.; Li, Anderson, Nagy et al.). Hence the 词语 and 组词 rungs.
- **Varied contexts.** Meeting a word in several contexts gives deeper meaning and use than one repeated context (Bolger, Balass, Landen & Perfetti 2008; Nation's form, meaning and use). Hence the context ladder.
- **Retrieval and spacing.** Recalling beats re-reading; spaced reviews keep it. FSRS keeps scheduling, and every question is a recall.
- **Interleaving.** Mixing items beats blocks of the same item, especially for telling similar things apart (Rohrer; Kornell & Bjork). Hence one mixed round, and no character twice in a row in writing.
- **Writing.** Writing supports reading in Chinese (Tan, Spinks, Eden, Perfetti & Siok 2005), and recalling a character beats copying it. Hence writing from memory, with tracing kept to a minimum.
- **Slightly above level, with support** ("i + 1"). Hence 成语 up to one level above his own, with pinyin, meaning and a sentence on the card.

**Success:**
- A lesson opens on new words.
- No two activities feel like the same drill.
- Revision happens inside the exercises.
- Each word is met at least three ways in its first lesson.
- He writes 8–10 characters a lesson, from memory, near his level.
- Every wrong answer explains itself.

## 2. The lesson (30 minutes)

| Stop on Home's path | What happens | About |
|---|---|---|
| 认新字 | Today's new words, each introduced and then recalled at once | 5 min |
| 练一练 | One mixed round: new words and due revision, each word climbing a ladder of contexts (§3) | 12 min |
| 写一写 | 8–10 characters from memory, mixed (§5) | 8 min |
| 朗读 | as now (spec §16) | 5 min |
| 宝箱 | as now | — |

- **What it replaces.** This replaces today's 认一认 (revision block plus new words), 选一选, 钓鱼 and 用一用 steps.
- **Minutes.** The minutes scale with the parent's lesson length, as `sessionMinutes` does now.
- **Starting point.** If there are no new words that day (a backlog pause, or none left), the lesson starts at 练一练.

### 2.1 认新字

For each new word (`newPerDay`, default 4):

1. **The 认字 card,** as today:
   - the character, pinyin, meaning and English;
   - 2–3 词语 at the character's reading, each with English;
   - **new:** one 成语 that uses the character, where one is available (§4), with pinyin, English and a short sentence.
2. **A recall question straight after the card:** hear the word, then find it among four characters. A miss shows the card again briefly, and the word is marked to come back early in 练一练.

**One reading per card.** This shipped 2026-10-05 as `fix: each character's 组词 use the reading its card teaches`. A card and everything built from it use only 词语 where the character has the card's reading; a 轻声 of the same sound counts. The other reading is its own word.

## 3. 练一练: one word, many contexts

### 3.1 Who is in the round
- **Today's new words.** Each needs at least three appearances.
- **Due revision words:** recognise, meaning and use cards due today. Each gets one or two appearances.
- **Look-alike checks:** at most two (§3.4).
- **School 成语 the parent added** that are due (§4).

**Size.** The round is time-boxed (about 12 minutes). If it runs out of time, the remaining due items wait for tomorrow, as today's time box does.

### 3.2 The ladder

Each appearance of a word is one rung. A word climbs one rung each time it comes up:

| Rung | Question types (one is chosen, so the same type doesn't repeat back to back) |
|---|---|
| 1. 字 | read it (pick the pinyin); hear it, then find the character |
| 2. 词语 | complete the 词语 (火＿ → 车); 组词: pair characters into 词语 (tap 火 then 车); 搭配: pair words that go together (穿 + 衣服, 认真 + 学习) |
| 3. 句子 | pick the 词语 for the gap in a sentence (today's 选一选 gap-fill); 用对了吗 (which sentence uses it right) |
| 4. 组句 | tap word tiles to build a sentence that uses the word |
| 5. 成语 | complete the 成语 (五＿六色); pick the 成语 for a sentence; build a sentence with it |

**Where each word starts:**
- **New words** start at rung 1 and reach about rung 3 in their first lesson.
- **Revision words** start at the rung after the highest one they have answered right. A well-known word spends its time on 搭配, 组句 and 成语.
- **After a miss,** the word comes back later in the round at the same rung. The next lesson starts it one rung lower.
- **At the top rung,** a word answered right everywhere cycles through rungs 3–5.

**Each word remembers its highest rung answered right.**

### 3.3 Order
- **Interleaved:** the same word never appears twice in a row.
- **Spaced:** a word's appearances are at least 2 items apart, then 4 or more.
- **Varied:** two items of the same question type never follow each other.

### 3.4 钓鱼 becomes a look-alike check
- **Kept from today:** the pond, the fish and the radical explanations stay.
- **When it appears:** only for a character he has confused with a look-alike. A wrong answer anywhere that picked a character sharing its radical or a component records that pair.
- **How often:** at most two a lesson.

### 3.5 Memory (FSRS)
- **Reading (recognise card).** A word's first appearance in the round grades it. For a new word, the 认新字 recall question does.
- **Meaning card.** Rungs 2 and 5 grade it.
- **Use record.** Rungs 3 and 4 grade it.

This keeps the spaced-repetition model that the Skills panel and placement rely on.

### 3.6 After an answer: the feedback sheet explains
- **Right:** a cheer, the full 词语 or sentence read aloud, as now.
- **Wrong:** the right answer with pinyin and a speaker, plus **English meanings**:
  - the right answer's meaning;
  - the meaning of what he picked, if it is a real word ("根 root ✓ · 跟 to follow");
  - the 成语's meaning for a 成语 question;
  - for 钓鱼, the radical meanings, as now.
- **The question stays Chinese.** English appears only on the 认字 card and on the sheet after a wrong answer. This extends the parent's 2026-10-04 exception for the 认字 card.
- **组句 after a miss:** the sheet shows the sentence built correctly, read aloud.

## 4. 成语
- **Built-in list:** about 150 common 成语 taken from the app's HSK list (`hskwords.json`, four-character words), with the parent's review. Each has:
  - its HSK level;
  - an English meaning (from the CC-CEDICT glossary, as for 词语);
  - one or two short sentences written for this app.
- **School 成语:** the parent adds them in the parent area, typed or from a worksheet. They stay on the iPad and never go into the repo or the public site, like class words (spec §19). The app supplies meaning and pinyin when the 成语 is in its list. Otherwise the parent can type a meaning; with no sentence, a school 成语 gets the completion questions only.
- **Level:**
  - Built-in 成语 come from his current level and one level up, so they're never too simple.
  - The closest level is preferred. Easier ones are used only when nothing else fits.
  - "His level" is the HSK level of the words he is learning now (from placement and progress).
- **When they come up:**
  - **On the 认字 card:** a 成语 that uses the new character, from that level window.
  - **In 练一练 (rung 5):** for words that reached rung 4.
- **School 成语 come first:** they come up even when their characters are new, with a 认字-style card the first time.

## 5. 写一写
- **8–10 characters a lesson** (6 in a 20-minute lesson). A two-character word counts as two.
- **Which characters,** in this order:
  1. writing due today;
  2. today's and recent lesson words he can now read;
  3. characters he can read, at his level first and going down.
- **Never a character he hasn't learned to read.**
- **From memory.** The cue is today's (meaning and sentence with a gap; spec §20). A hint stroke shows after a miss, and the outline after three misses, as now.
- **Tracing only once:** for a character he has never written, early in the round. The same character comes back later in the round, from memory.
- **Mixed order:** never the same character twice in a row. Words with two characters are split and interleaved with the others.

## 6. Content (all written for this app; nothing from Berries or the school textbook enters the repo)
- **搭配 pairs:** for bank and HSK 1–3 words, about 300 pairs, verb + object and adjective + noun, plus wrong partners for the pairing game.
- **组句 sentences:**
  - each split into word tiles (4–6), with every accepted order listed;
  - taken from the existing written bank (`src/content/bank/`) where a sentence splits cleanly, plus new ones.
- **成语 list:** §4.
- **Test pins:** the content-hash test pins all of it (bump `CONTENT_VERSION`).

## 7. Around the lesson
- **Home's path:** 认新字 → 练一练 → 写一写 → 朗读 → 宝箱. Stars are counted per stop, as now. In-progress sessions saved under the old steps finish in the old flow.
- **Parent settings:** the activity switches become 新字 / 练一练 / 写一写 / 朗读. An existing install carries its choices over: 认一认 maps to 新字 and 练一练, and 选一选 or 钓鱼 maps to 练一练.
- **再玩一会儿 (free play):** a 练一练 round of words he knows.
- **Unchanged:** placement, the Skills panel, the importer and 听写 mistakes. Words from 听写 mistakes join 写一写's due list, as now.
- **The stage:** every new question type uses the stage layout (`Stage` and `FeedbackSheet`) and Truffle's reactions (stage phase B).

## 8. Out of scope
- New 朗读 or 看图说话 content.
- Handwriting recognition beyond hanzi-writer's stroke checks.
- English anywhere else on child screens.

## 9. Phasing
1. **A. Round engine.** The ladder, the round builder, the rung memory and the FSRS grading, plus 认新字 and the new step order and path. It reuses today's question types for rungs 1–3: read, hear and find, the 组词 gap, sentence gap-fill and 用对了吗.
2. **B. New question types:**
   - 组词 pairing and 搭配 pairing, with the 搭配 bank;
   - 组句 tiles, with the 组句 bank;
   - English on the feedback sheet;
   - 钓鱼 as a look-alike check.
3. **C. 成语:** the list, the 认字 card's 成语, rung 5, and school 成语 in the parent area.
4. **D. 写一写:** more characters, from memory, mixed, chosen at or below his level.

Each phase is its own plan, reviewed and shipped on its own. The paper worlds (stage phase C) resume after A–D, or between them if the parent prefers.

## 10. Testing
- **Unit:**
  - round building (interleaving, spacing, no repeated types, ladder start rungs);
  - rung memory;
  - FSRS grading per rung;
  - writing selection (at or below level, no back-to-back repeats);
  - 成语 level window;
  - 组句 accepted orders;
  - settings migration.
- **Component:** each question type on the stage, the feedback sheet's English after a wrong answer, and the 认新字 card with a 成语.
- **Contract:**
  - no English on child screens except the 认字 card and the sheet after a wrong answer;
  - no emoji;
  - every 组词 at its card's reading (shipped);
  - 搭配, 组句 and 成语 content uses characters within the bank's level rules.
- **WebKit sweep:** every new question type at all 6 sizes, 0 problems.
- **On the iPad:** the parent and son try each phase before the next.
