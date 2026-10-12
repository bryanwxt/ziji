# 朗读 back as a daily step: modelled repeated reading — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 朗读 becomes the last step of every lesson (~3 min): a day-1 warm-up, the iPad's best Chinese voice reading the passage sentence by sentence with the sentence highlighted, his recorded read with fading pinyin, a compare screen with one re-read keeping the better take, and one meaning question; the parent reviews passage takes in Listen & confirm; the other steps shrink so the lesson stays ~15 min.

**Architecture:** Pure pieces first: `splitSentences` / `answeringSentence` (`src/langdu/sentences.ts`), 20 meaning questions as content (`src/content/passageQuestions.ts`) with a content check, `isFirstDay` and question-carrying `readingPool` (`src/langdu/cycle.ts`), `betterTake` (`src/langdu/stars.ts`), the passage review queue and tidy (`src/langdu/review.ts`), and the voice tier (`src/audio/voiceTier.ts`, fed by `speech.ts`). A hook `useModelReader` (`src/langdu/useModelReader.ts`) speaks one sentence per `speak()` and follows the existing `onSpeaking` start/end signal to light the sentence being read. `LangduStep` is rebuilt as warm-up → listen → read → compare → meaning; `SessionScreen` passes day 1, a microphone refused earlier, saves the answer on the take and tidies; Listen & confirm gets a passage row (marks, take, model, Done).

**Tech Stack:** Vite 7 + Preact 10 + TypeScript 5.9 (lib ES2022), vitest 4 + @testing-library/preact + fake-indexeddb, pinyin-pro, tsx scripts, playwright-core 1.52 WebKit (`scripts/stage-cases.ts`, `scripts/fit-check.ts`).

**Spec:** `docs/superpowers/specs/2026-10-12-ziji-langdu-design.md` (read it in full before Task 1).

## Global Constraints

- 朗读 is the **4th and last** step of every lesson, about 3 minutes, not time-boxed; step order stays `STEP_ORDER = ['newwords', 'practice', 'writing', 'speaking']`.
- Model voice: the iPad's speech voice through the existing `speak()` and voice selection (Premium, then Enhanced), **whole sentences**, one `speak()` utterance each, at the parent's speech rate (default **0.8**). Recorded clips stay off.
- Sentences split at **。！？**; commas and **、** never split; a parent "/" splits only when it ends a sentence-length unit (Rulings: ≥ 6 Han characters since the last break).
- Highlight: the sentence lights when its utterance **starts** and clears when it **ends** (`onSpeaking`, the signal that moves Truffle's mouth). Tapping a sentence replays it. 「开始朗读」 appears after the first full read-through.
- Warm-up (「老师好！…」, `introLines`) on **day 1 of each passage only**.
- Read alone: the whole passage, loudness meter, **60 s** auto-stop (`MAX_RECORDING_MS = 60_000`, unchanged); pinyin by the 4a per-reading fading (`<Label fade>` under `PinyinFade`); `pinyinMode(warmups)` is removed.
- Compare: 「听我的」 (his take), 「听老师的」 (model by sentence with highlight), 「再读一遍」 **once**, 「下一步」. Better take by `earnsBonus`: louder, or ≤ **90%** of the duration and ≥ **half** as long. The bonus star stays.
- Meaning question: one per passage, **谁 / 哪里 / 什么 / 为什么**, **3** choices, right one marked, answering sentence by index; a miss shows the right choice and replays that sentence; not graded on cards, logged for the parent only. Parent passages: optional question; none given → no question.
- Microphone blocked or missing: Listen → Read aloud unrecorded with 「读完了」 → Meaning; Compare skipped. A microphone refused earlier in the lesson by a Say card is not asked again (`useRecorder(startBlocked)`).
- Extra reading 多读一遍: Listen, Read, Compare only; no cycle day, no stars.
- Budget at 15 min: `PRACTICE_SHARE = 1 / 3` (5 min box); `writeCharTarget`: **4** under 20 min, **5** at 20, **7** at 25, **8** at 30, **9** at 40+.
- `voiceTier(): 'premium' | 'enhanced' | 'default' | 'none'`. Overview warning text, verbatim: "朗读 uses the iPad's voice as the model. For natural reading, download a better Chinese voice: Settings → Accessibility → Spoken Content → Voices → Chinese (China mainland) → 婷婷 (Enhanced) or Lili (Premium), then reopen the app." Settings shows the voice in use and its tier.
- Listen & confirm queue: passage takes (`prompt.kind === 'passage'`), **the newest take per passage**; older unreviewed takes of that passage leave the queue, never deleted. Done sets `review: 'ok'` and saves the marks (marked characters become priority words, `applyMisreads`). Badge = Say takes + passage takes waiting. Tidy: reviewed passage takes older than **14** days are deleted, keeping each passage's newest. Self-introduction recordings never join the queue.
- Settings: switch 「朗读 Read aloud」 (`settings.langdu`). `lessonVersion` **7** turns `langdu` on once; new installs default on; `settings.story` stays off. No migration of recordings or `ReadingState`; saved lessons load as they are.
- TypeScript lib is ES2022: no `findLastIndex` / `toSorted`. `Array.prototype.at` and `??=` are fine.
- Screenshots in **WebKit** via playwright-core. If WebKit is missing, stop and ask the user before `npx playwright-core install webkit` (~100 MB).
- Out of scope: recorded or neural clips, per-character karaoke timing, speech-recognition scoring, 看图说话, new built-in passages, a passage generator.

## Rulings

- Ruling: `splitSentences` keeps a quotation together — a 。！？ inside “…” / 「…」 / 『…』 doesn't split, and a closing quote right after a terminator stays with its sentence (妈妈说：“快一点，不然就晚了！” is one sentence); runs like ？！ split once; quotes that don't pair up in the text are ignored, so they can never swallow the rest — the 20 built-ins then split into 3–5 sentences each (measured: p01 3, p03 3, p11 5, p17 3, the rest 4) and a parent's stray “ can't make one 60-character "sentence" — cost if wrong: one utterance carries two short quoted sentences.
- Ruling: a parent "/" splits when ≥ 6 Han characters (`SLASH_MIN_HAN = 6`) have come since the last break and it is outside quotes; any other "/" is dropped (with its spaces) — "a sentence-length unit" needs a number, and 6 keeps the existing school example 「我的学校很大 / 有很多树。」 two sentences while 「我们一家 / 坐在一起吃饭。」 stays one — cost if wrong: a pause mark becomes a sentence break or the reverse.
- Ruling: day 1 is `isFirstDay(reading, passageId, today)`: the passage isn't the cycle's current one, or its `days` is 0, or its `days` is 1 and `lastDay` is today — `ReadingState` keeps the previous passage's count until `finishDay` runs, so the spec's literal `days === 0` is never true for a newly picked passage; and a second lesson on day 1 is still day 1 — cost if wrong: one warm-up more or fewer.
- Ruling: the warm-up's lines fade too (`<Label fade>`); `pinyinMode` and its test are deleted; `reading.warmups` still counts — spec §3.3 replaces `pinyinMode` — cost if wrong: none for the child.
- Ruling: `useModelReader` waits **2.5 s** (`START_WAIT_MS`) for a sentence's voice to start, else passes over it; a started sentence that never says it ended counts as ended after **20 s** (`SENTENCE_MAX_MS`) — with no voice (jsdom, a missing voice) the listen part must still reach 「开始朗读」 — cost if wrong: a 2.5 s gap per sentence on an iPad with no Chinese voice.
- Ruling: during the first read-through a tap on a sentence reads from that sentence to the end; after it, a tap reads that sentence only; 「开始朗读」 appears once a read reaches the last sentence — the read-through can't be lost to an early tap — cost if wrong: tapping the last sentence early counts as heard.
- Ruling: sentences in Listen and Compare are buttons holding `<Label fade peek={false} />` (a tap replays the sentence, never peeks); in Read they are plain spans (a tap peeks) — a tap there answers, as in 4a — cost if wrong: one prop.
- Ruling: Compare's 「听我的」 plays the latest take; the step reports the better of the two by `earnsBonus(first, second)`; the bonus star compares the kept take with the passage's last saved take, as today — cost if wrong: after a worse re-read he hears the worse take.
- Ruling: 「谢谢老师！」 closes a warm-up day on the step's last screen (after the answer, or in Compare when there is no question) and is said queued after anything playing — spec silent; the warm-up began the etiquette — cost if wrong: one line.
- Ruling: choices show in stored order; the content varies the right one's position; a right answer shows 「对了！」 and waits for 「完成」 (`auto={false}`); a miss shows 「答案是：<right>」, the answering sentence in the sheet, marks the choices like 选一选 (`is-answer`, `is-wrong`, `is-dim`) and speaks the sentence — cost if wrong: one more tap.
- Ruling: the answer is logged on the passage `Recording` as `meaning: { correct, picked }` and shown in its Listen & confirm row; a day with no recording (microphone blocked) logs nothing — the parent reviews where the take is — cost if wrong: the parent can't see answers on unrecorded days.
- Ruling: a parent question has no sentence index; `answeringSentence` takes the first sentence containing the right choice, and a miss with none found shows the right choice without a replay — cost if wrong: no replay when the parent's right choice is a paraphrase.
- Ruling: a meaning question's characters come from its passage or HSK levels 1–2 (the passage check's own `easy` set); the content check enforces it, and that the question asks 谁, 哪, 什么 or 为什么 — "very common ones" needs a test — cost if wrong: none (measured: all 20 pass).
- Ruling: "refused earlier in the lesson" is a Say card reporting `null` (its blocked path, `onSayDone(null)`); `SessionScreen` keeps it for this sitting only (`micRefused` state, not saved in the lesson record); a refusal in the warm-up carries to the read within the step — cost if wrong: after a reload mid-lesson he is asked once more.
- Ruling: per passage only its newest passage take can wait; "the newest per day" follows because a newer take supersedes; an extra-round take is a passage take too, so it replaces the lesson's take in the queue — cost if wrong: the parent reviews 多读一遍's take instead of the lesson's.
- Ruling: Done = `applyMisreads(db, rec, marks, now)` then `review: 'ok'` on the stored recording; no review log (not graded); Done with no marks is fine — spec §6 — cost if wrong: none.
- Ruling: the tidy runs after each passage take is saved (daily step and 多读一遍), inside a try/catch that logs — a failed tidy must not stop the lesson — cost if wrong: old takes linger a day.
- Ruling: `voiceQuality` moves to `src/audio/voiceTier.ts` (re-exported from `speech.ts`), which also holds the tier `speech.ts` notes whenever it picks a voice — screens and tests that mock `speech.ts` still get a tier — cost if wrong: an import path.
- Ruling: the Overview voice warning shows only while 朗读 is on; Settings' voice hint reads "Now speaking: <name> · <Premium|Enhanced|Standard>." — cost if wrong: a parent with 朗读 off doesn't see the hint.
- Ruling: `lessonVersion` 7 sets `langdu: true` only (`activities.speaking` is left as it is), and the v6 30 → 15 minute move now runs only below 6 — cost if wrong: an install whose parent unticked speaking long ago stays without 朗读.
- Ruling: existing tests that only passed because 朗读 was parked get `langdu: false` in their settings — they test something else — cost if wrong: none.
- Ruling: the Reading texts preview shows `splitSentences` (what the model reads); `splitPhrases` is deleted — cost if wrong: none.
- Ruling: `LangduStep` takes `startAt?: LangduPart` so the stage cases open each part directly; stage cases allow `.langdu__passage` to scroll inside the card (it does on a phone today, fit-check's `SCROLLERS`) — cost if wrong: one prop.
- Ruling: the fit sweep's full `lesson` flow switches 朗读 on, and its walker waits while the listen part's read-through runs (`.langdu__listen[data-heard="false"]`) — cost if wrong: a longer sweep.

## Review Focus

1. A parent text whose quotes don't pair up (an unclosed “, or ASCII "…") still splits at 。！？ — never one long sentence read in one breath — test in Task 1 (`unpaired quotes never hold the rest of the text together`).
2. The iPad never starts the voice (no Chinese voice, a dropped utterance): each sentence is passed over and 「开始朗读」 still comes — test in Task 4 (`a sentence whose voice never starts is passed over, so the read-through still ends`).
3. He starts reading while the model is still talking (after tapping a sentence): the model goes quiet, and the end of its cut-off sentence never starts the next one over his recording — test in Task 4 (`the model goes quiet when he starts reading`).
4. The parent taps Done twice, or reviews a take whose text was deleted: one save, the row leaves, no crash — test in Task 5 (`Done twice saves once; a take of a deleted text still has Done`).
5. A second lesson on a passage's first day still opens with the warm-up; day 2 doesn't — test in Task 1 (`isFirstDay: a new passage, day 0, and a second lesson on day 1`).

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `src/langdu/sentences.ts` (new) | `splitSentences`, `SLASH_MIN_HAN`, `answeringSentence` | 1 |
| `src/content/passageQuestions.ts` (new) | the 20 built-in meaning questions | 1 |
| `src/types.ts` | `PassageQuestion`; `ParentPassage.question`; `Recording.meaning`; `DEFAULT_SETTINGS.langdu`/`lessonVersion` | 1, 3, 5 |
| `scripts/check-content.ts` (+ test) | `checkPassageQuestions` | 1 |
| `src/langdu/cycle.ts` (+ test) | `ReadingPassage.question`, `readingPool` attaches questions, `isFirstDay` | 1 |
| `src/parent/PassagesPanel.tsx` | sentence preview; optional question form | 1, 7 |
| `src/audio/voiceTier.ts` (new), `src/audio/speech.ts` | `voiceQuality`, `tierOf`, `noteVoice`, `voiceTier`, `TIER_LABEL` | 2 |
| `src/parent/Dashboard.tsx`, `src/parent/SettingsPanel.tsx` | voice warning; voice line; 朗读 switch | 2, 3 |
| `src/session/plan.ts`, `src/session/writing.ts`, `src/store/settings.ts` | budgets; v7 move | 3 |
| `src/langdu/useModelReader.ts` (new) | the model reading by sentence with highlight | 4 |
| `src/langdu/stars.ts`, `src/langdu/intro.ts`, `src/langdu/phrases.ts` | `betterTake`; drop `pinyinMode`, `splitPhrases` | 4 |
| `src/activities/shared/recording.tsx` | `BlockedNote` | 4 |
| `src/activities/langdu/LangduStep.tsx` (+ test) | the rebuilt step | 4 |
| `src/langdu/review.ts` (new), `src/session/say.ts` | passage queue, tidy, Done | 5 |
| `src/parent/MisreadText.tsx` (new), `ListenPanel.tsx`, `RecordingsPanel.tsx` | tappable characters; the passage row | 5 |
| `src/app/SessionScreen.tsx`, `src/app/LangduScreen.tsx` | day 1, refused mic, answer, tidy, fading | 4, 6 |
| `src/styles.css` | sentences, compare, question, passage row | 4, 5 |
| `scripts/stage-cases/page.tsx`, `scripts/stage-cases.ts`, `scripts/fit-check.ts` | WebKit cases, sweep | 8 |

Test commands: `npx vitest run <path>` for one file; `npx vitest run` for all (under heavy machine load a few slow rendered tests can time out — rerun that file alone before treating it as a failure); `npx tsc --noEmit` type-checks tests and scripts too. Before Task 1: `ls node_modules/.bin/vitest` (run `npm ci` if it is missing). Baseline on 9167ba0: 222 files, 1889 tests pass.

---

### Task 1: Sentences, meaning questions, and the reading pool (pure)

**Files:**
- Create: `src/langdu/sentences.ts`, `src/langdu/sentences.test.ts`, `src/content/passageQuestions.ts`
- Modify: `src/types.ts:209-221` (`PassageQuestion`, `ParentPassage.question`)
- Modify: `src/langdu/cycle.ts`, `src/langdu/cycle.test.ts`
- Modify: `scripts/check-content.ts`, `scripts/check-content.test.ts`
- Modify: `src/parent/PassagesPanel.tsx:5,21,72-78` (preview by sentence)

**Interfaces:**
- Consumes: `eligiblePassages` (`src/activities/speaking/prompts.ts`), `PASSAGES`, `BUILTIN` (`src/content`).
- Produces: `interface PassageQuestion { q: string; choices: [string, string, string]; answer: 0 | 1 | 2; sentence?: number }` (types.ts); `ParentPassage.question?: PassageQuestion`; `SLASH_MIN_HAN = 6`; `splitSentences(text: string): string[]`; `answeringSentence(q: Pick<PassageQuestion, 'choices' | 'answer' | 'sentence'>, sentences: string[]): number` (−1: none); `PASSAGE_QUESTIONS: Readonly<Record<string, PassageQuestion>>`; `ReadingPassage.question?: PassageQuestion`; `readingPool(parent, builtins, knownChars, questions = PASSAGE_QUESTIONS)`; `isFirstDay(r: ReadingState, passageId: string, today: string): boolean`; `checkPassageQuestions(passages: Passage[], questions: Readonly<Record<string, PassageQuestion>>, easy: ReadonlySet<string>): string[]`.

- [ ] **Step 1: Write the failing tests**

Create `src/langdu/sentences.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../content';
import { answeringSentence, splitSentences } from './sentences';

describe('splitSentences (spec 2026-10-12 §3)', () => {
  it('splits at 。！？ only: commas and 、 never split', () => {
    expect(splitSentences('我家有五个人：爸爸、妈妈、哥哥、妹妹和我。爸爸是医生，妈妈是老师。我很爱我的家。')).toEqual(['我家有五个人：爸爸、妈妈、哥哥、妹妹和我。', '爸爸是医生，妈妈是老师。', '我很爱我的家。']);
    expect(splitSentences('我爱爸爸，我爱妈妈。')).toEqual(['我爱爸爸，我爱妈妈。']);
  });
  it('a quotation stays whole, its closing quote with it; ？！ splits once', () => {
    expect(splitSentences('妈妈说：“快一点，不然就晚了！”我坐车去学校。')).toEqual(['妈妈说：“快一点，不然就晚了！”', '我坐车去学校。']);
    expect(splitSentences('我说：“谢谢爷爷！谢谢奶奶！”大家都很高兴。')).toEqual(['我说：“谢谢爷爷！谢谢奶奶！”', '大家都很高兴。']);
    expect(splitSentences('真的吗？！对。')).toEqual(['真的吗？！', '对。']);
  });
  it('a parent "/" ends a sentence-length unit (6+ characters), else it is dropped', () => {
    expect(splitSentences('今天天气很好 / 我们去公园玩。')).toEqual(['今天天气很好', '我们去公园玩。']);
    expect(splitSentences('我们一家 / 坐在一起吃饭。')).toEqual(['我们一家坐在一起吃饭。']);
    expect(splitSentences('我的学校很大 / 有很多树。')).toEqual(['我的学校很大', '有很多树。']);
  });
  it('text after the last 。 is a sentence; blank text has none', () => {
    expect(splitSentences('我爱妈妈。没有句号')).toEqual(['我爱妈妈。', '没有句号']);
    expect(splitSentences('  ')).toEqual([]);
  });
  it('unpaired quotes never hold the rest of the text together', () => {
    expect(splitSentences('妈妈说：“快一点。我坐车去学校。我到了。')).toEqual(['妈妈说：“快一点。', '我坐车去学校。', '我到了。']);
    expect(splitSentences('他说"好的。"我们走吧。')).toEqual(['他说"好的。', '"我们走吧。']);
  });
  it('the built-in passages split into 3–5 sentences', () => {
    const counts = Object.fromEntries(PASSAGES.map((p) => [p.id, splitSentences(p.text).length]));
    expect(counts).toEqual({ p01: 3, p02: 4, p03: 3, p04: 4, p05: 4, p06: 4, p07: 4, p08: 4, p09: 4, p10: 4, p11: 5, p12: 4, p13: 4, p14: 4, p15: 4, p16: 4, p17: 3, p18: 4, p19: 4, p20: 4 });
  });
});

describe('answeringSentence', () => {
  const s = splitSentences('我爱爸爸。我爱妈妈。');
  it('a built-in question names its sentence', () => {
    expect(answeringSentence({ choices: ['老师', '妈妈', '小马'], answer: 1, sentence: 0 }, s)).toBe(0);
  });
  it('a parent question is answered by the first sentence holding the right choice, else none', () => {
    expect(answeringSentence({ choices: ['老师', '妈妈', '小马'], answer: 1 }, s)).toBe(1);
    expect(answeringSentence({ choices: ['老师', '外婆', '小马'], answer: 1 }, s)).toBe(-1);
    expect(answeringSentence({ choices: ['老师', '妈妈', '小马'], answer: 1, sentence: 9 }, s)).toBe(1); // out of range: found instead
  });
});
```

Append to `src/langdu/cycle.test.ts` (and add `isFirstDay` to its import from `./cycle`):

```ts
describe('the pool carries meaning questions (spec 2026-10-12 §3)', () => {
  it("a built-in brings its question; a parent text brings the parent's, or none", () => {
    const q = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'] as [string, string, string], answer: 1 as const };
    const pool = readingPool(
      [{ id: 'pp:a', title: 'a', text: '我。', createdAt: 1, question: q }, { id: 'pp:b', title: 'b', text: '我。', createdAt: 2 }],
      [{ id: 'p01', title: 'x', text: '我。' }],
      new Set(['我']),
      { p01: { ...q, sentence: 0 } },
    );
    expect(pool.map((p) => p.question)).toEqual([q, undefined, { ...q, sentence: 0 }]);
  });
});

describe('isFirstDay: a new passage, day 0, and a second lesson on day 1', () => {
  const r = (over: Partial<ReadingState>): ReadingState => ({ ...R0, ...over });
  it('a passage new to the cycle is on day 1, whatever the last one counted', () => {
    expect(isFirstDay(r({ passageId: 'pp:old', days: 3, lastDay: '2026-10-04' }), 'pp:new', '2026-10-05')).toBe(true);
    expect(isFirstDay(R0, 'p01', '2026-10-05')).toBe(true);
    expect(isFirstDay(r({ passageId: 'p01', days: 0 }), 'p01', '2026-10-05')).toBe(true);
  });
  it('a second lesson the same first day is still day 1; the next day is not', () => {
    expect(isFirstDay(r({ passageId: 'p01', days: 1, lastDay: '2026-10-05' }), 'p01', '2026-10-05')).toBe(true);
    expect(isFirstDay(r({ passageId: 'p01', days: 1, lastDay: '2026-10-04' }), 'p01', '2026-10-05')).toBe(false);
    expect(isFirstDay(r({ passageId: 'p01', days: 2, lastDay: '2026-10-05' }), 'p01', '2026-10-05')).toBe(false);
  });
});

describe('which built-ins a P1 reader gets (spec 2026-10-12 §3: ≥90% of the characters known)', () => {
  it('knowing the 一上 and 一下 reading lists makes 12 of the 20 eligible', async () => {
    const moe = (await import('../content/moe2024.json')).default as { lessons: { term: string; read: string }[] };
    const known = new Set(moe.lessons.filter((l) => l.term === '一上' || l.term === '一下').map((l) => l.read).join(''));
    expect(readingPool([], PASSAGES, known).map((p) => p.id)).toEqual(['p01', 'p02', 'p04', 'p05', 'p07', 'p08', 'p10', 'p11', 'p12', 'p13', 'p15', 'p20']);
  });
});
```

Also add `import { PASSAGES } from '../content';` to `cycle.test.ts`.

Append to `scripts/check-content.test.ts` (and add the imports `checkPassageQuestions` from `./check-content` and `PASSAGE_QUESTIONS` from `../src/content/passageQuestions`):

```ts
describe('meaning questions (spec 2026-10-12 §3)', () => {
  const easy = new Set(BUILTIN.filter((c) => c.level <= 2).map((c) => c.char));
  it('every built-in passage has one: 谁/哪/什么/为什么, three choices, the right one among them, a real answering sentence, easy characters', () => {
    expect(checkPassageQuestions(PASSAGES, PASSAGE_QUESTIONS, easy)).toEqual([]);
  });
  it('flags a missing question, a right answer outside the choices, a bad sentence and a hard character', () => {
    const p = PASSAGES.slice(0, 2);
    const q = PASSAGE_QUESTIONS.p01!;
    expect(checkPassageQuestions(p, { p01: q }, easy)).toContain('p02: no meaning question');
    expect(checkPassageQuestions(p.slice(0, 1), { p01: { ...q, answer: 3 as never } }, easy)).toContain('p01: the right answer is not among the choices');
    expect(checkPassageQuestions(p.slice(0, 1), { p01: { ...q, sentence: 9 } }, easy)).toContain('p01: answering sentence 9 is not one of its 3 sentences');
    expect(checkPassageQuestions(p.slice(0, 1), { p01: { ...q, choices: ['爸爸', '妈妈', '鬱'] } }, easy)).toContain('p01: question uses 鬱 in neither the passage nor levels 1–2');
    expect(checkPassageQuestions(p.slice(0, 1), { p01: { ...q, q: '老师好吗？' } }, easy)).toContain('p01: the question asks none of 谁 哪 什么 为什么');
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/langdu/sentences.test.ts src/langdu/cycle.test.ts scripts/check-content.test.ts`
Expected: FAIL — `./sentences` and `../src/content/passageQuestions` not found; `isFirstDay`, `checkPassageQuestions` not exported.

- [ ] **Step 3: Add the types**

In `src/types.ts`, replace the `ParentPassage` block (lines 215-221) with:

```ts
/** A 朗读 meaning question (spec 2026-10-12 §3): 谁 / 哪里 / 什么 / 为什么, three choices, the right one marked. `sentence`: the
 *  passage's sentence (splitSentences) that answers it; a parent's question has none and is answered where its right choice is. */
export interface PassageQuestion {
  q: string;
  choices: [string, string, string];
  answer: 0 | 1 | 2;
  sentence?: number;
}

/** A school text the parent added for 朗读. id 'pp:<uuid>'; text may hold '/' marks; an optional meaning question. */
export interface ParentPassage {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  question?: PassageQuestion;
}
```

- [ ] **Step 4: Write `src/langdu/sentences.ts`**

```ts
// 朗读's model reads whole sentences (spec 2026-10-12 §3): split at 。！？, never at commas or 、; a parent's "/" ends a sentence
// only when a sentence-length stretch has come before it.
import type { PassageQuestion } from '../types';

const END = '。！？';
const OPEN = '“「『';
const CLOSE = '”」』';
const HAN = /\p{Script=Han}/u;
/** A "/" splits when at least this many Han characters came since the last break; otherwise it is a pause mark and is dropped. */
export const SLASH_MIN_HAN = 6;

export function splitSentences(text: string): string[] {
  const chars = Array.from(text.replace(/\s*\/\s*/g, '/'));
  const count = (set: string) => chars.filter((c) => set.includes(c)).length;
  const quotes = count(OPEN) === count(CLOSE); // unpaired quotes are ignored: they must never swallow the rest of the text
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  const push = () => {
    const s = cur.trim();
    if (s) out.push(s);
    cur = '';
  };
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const next = chars[i + 1] ?? '';
    if (ch === '/') {
      if (depth === 0 && Array.from(cur).filter((c) => HAN.test(c)).length >= SLASH_MIN_HAN) push();
      continue;
    }
    cur += ch;
    if (quotes && OPEN.includes(ch)) depth++;
    else if (quotes && CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    const before = Array.from(cur).at(-2) ?? '';
    const ends = END.includes(ch) || (quotes && CLOSE.includes(ch) && END.includes(before));
    const more = END.includes(next) || (quotes && CLOSE.includes(next));
    if (ends && depth === 0 && !more) push();
  }
  push();
  return out;
}

/** The sentence a miss reads again: the question's own, else the first holding the right choice; −1 when none does. */
export function answeringSentence(q: Pick<PassageQuestion, 'choices' | 'answer' | 'sentence'>, sentences: string[]): number {
  if (q.sentence !== undefined && Number.isInteger(q.sentence) && q.sentence >= 0 && q.sentence < sentences.length) return q.sentence;
  const right = q.choices[q.answer];
  return right ? sentences.findIndex((s) => s.includes(right)) : -1;
}
```

- [ ] **Step 5: Write `src/content/passageQuestions.ts`**

```ts
// One meaning question per built-in passage (spec 2026-10-12 §3): 谁 / 哪里 / 什么 / 为什么, three choices, `answer` the right
// one, `sentence` the passage's sentence (splitSentences) that answers it. Characters from the passage or HSK levels 1–2
// (scripts/check-content.ts checks it). The right choice's place varies; the step shows them in this order.
import type { PassageQuestion } from '../types';

export const PASSAGE_QUESTIONS: Readonly<Record<string, PassageQuestion>> = {
  p01: { q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 },
  p02: { q: '我先做什么？', choices: ['吃早饭', '坐车', '洗手'], answer: 2, sentence: 1 },
  p03: { q: '我们为什么不能去外面玩？', choices: ['下雨了', '天黑了', '弟弟病了'], answer: 0, sentence: 0 },
  p04: { q: '我的好朋友叫什么？', choices: ['小红', '小明', '小马'], answer: 1, sentence: 0 },
  p05: { q: '爸爸送我什么？', choices: ['一本新书', '一个书包', '一个红包'], answer: 0, sentence: 1 },
  p06: { q: '谁病了？', choices: ['妈妈', '医生', '弟弟'], answer: 2, sentence: 0 },
  p07: { q: '我想要什么？', choices: ['水果', '新书包', '牛奶'], answer: 1, sentence: 3 },
  p08: { q: '我和爷爷在哪里看星星？', choices: ['门口', '学校', '车上'], answer: 0, sentence: 1 },
  p09: { q: '我写了哪两个字？', choices: ['小和月', '人和口', '大和天'], answer: 2, sentence: 2 },
  p10: { q: '小鸟在哪里？', choices: ['房间里', '树上', '门口'], answer: 1, sentence: 0 },
  p11: { q: '桌子在哪里？', choices: ['床的旁边', '门的前面', '房间外面'], answer: 0, sentence: 2 },
  p12: { q: '谁做的菜最好吃？', choices: ['妈妈', '爸爸', '奶奶'], answer: 2, sentence: 2 },
  p13: { q: '我为什么喝了一大杯水？', choices: ['天很热', '我跑累了', '水很好喝'], answer: 1, sentence: 2 },
  p14: { q: '我为什么站着？', choices: ['找不到地方坐', '我喜欢站着', '车上很热'], answer: 0, sentence: 2 },
  p15: { q: '爷爷奶奶给我们什么？', choices: ['新衣服', '水果', '红包'], answer: 2, sentence: 2 },
  p16: { q: '我帮妈妈做什么？', choices: ['洗菜', '买东西', '写作业'], answer: 0, sentence: 1 },
  p17: { q: '谁找到了小马？', choices: ['太阳', '牛爷爷', '风'], answer: 1, sentence: 2 },
  p18: { q: '人们为什么笑了？', choices: ['风大了', '下雨了', '天热了'], answer: 2, sentence: 2 },
  p19: { q: '妈妈说先做什么？', choices: ['做作业', '看电视', '唱歌'], answer: 0, sentence: 1 },
  p20: { q: '学校里有什么？', choices: ['一个大商店', '一个大球场', '一个医院'], answer: 1, sentence: 1 },
};
```

- [ ] **Step 6: Add the content check**

In `scripts/check-content.ts`, change the first line to `import type { BuiltinChar, Passage, PassageQuestion } from '../src/types';`, add `import { splitSentences } from '../src/langdu/sentences';`, and append:

```ts
const ASKS = ['谁', '哪', '什么', '为什么'];

/** The meaning questions (spec 2026-10-12 §3): one per passage, asking 谁/哪/什么/为什么, three different choices with the right
 *  one among them, a real answering sentence, characters from the passage or `easy` (levels 1–2). */
export function checkPassageQuestions(passages: Passage[], questions: Readonly<Record<string, PassageQuestion>>, easy: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const p of passages) {
    const q = questions[p.id];
    if (!q) {
      problems.push(`${p.id}: no meaning question`);
      continue;
    }
    if (!ASKS.some((a) => q.q.includes(a))) problems.push(`${p.id}: the question asks none of 谁 哪 什么 为什么`);
    if (q.choices.length !== 3 || new Set(q.choices).size !== 3) problems.push(`${p.id}: needs three different choices`);
    if (q.choices[q.answer] === undefined) problems.push(`${p.id}: the right answer is not among the choices`);
    const n = splitSentences(p.text).length;
    if (q.sentence === undefined || !Number.isInteger(q.sentence) || q.sentence < 0 || q.sentence >= n) problems.push(`${p.id}: answering sentence ${q.sentence} is not one of its ${n} sentences`);
    const own = new Set(Array.from(p.text));
    const outside = [...new Set(Array.from(q.q + q.choices.join('')).filter((ch) => HAN.test(ch) && !own.has(ch) && !easy.has(ch)))];
    if (outside.length) problems.push(`${p.id}: question uses ${outside.join('')} in neither the passage nor levels 1–2`);
  }
  for (const id of Object.keys(questions)) if (!passages.some((p) => p.id === id)) problems.push(`${id}: a question for no passage`);
  return problems;
}
```

Note the "flags" test passes two passages but one question, and the hard-character test passes only p01: the check reports per passage, so `toContain` holds.

- [ ] **Step 7: Carry questions in the pool; add `isFirstDay`**

In `src/langdu/cycle.ts`, change the imports and the pool:

```ts
import { eligiblePassages } from '../activities/speaking/prompts';
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import { addDays, localDateKey, parseDateKey } from '../lib/date';
import type { ParentPassage, Passage, PassageQuestion, ReadingState } from '../types';

export const CYCLE_DAYS = 3;
export const MAX_EXTRA = 2;
export const RECENT_DAYS = 30;
export interface ReadingPassage { id: string; title: string; text: string; source: 'parent' | 'builtin'; question?: PassageQuestion }

/** Parent texts first (in the order added), then built-ins he can read; each with its meaning question when it has one. */
export function readingPool(parent: ParentPassage[], builtins: Passage[], knownChars: Set<string>, questions: Readonly<Record<string, PassageQuestion>> = PASSAGE_QUESTIONS): ReadingPassage[] {
  return [
    ...[...parent].sort((a, b) => a.createdAt - b.createdAt).map((p) => ({ id: p.id, title: p.title, text: p.text, source: 'parent' as const, ...(p.question ? { question: p.question } : {}) })),
    ...eligiblePassages(builtins, knownChars).map((p) => ({ ...p, source: 'builtin' as const, ...(questions[p.id] ? { question: questions[p.id] } : {}) })),
  ];
}
```

and append:

```ts
/**
 * Day 1 of this passage (spec 2026-10-12 §3: the warm-up runs then only): a passage the cycle hasn't counted yet (its count
 * still belongs to the last passage until finishDay), day 0, or a second lesson on its first day.
 */
export function isFirstDay(r: ReadingState, passageId: string, today: string): boolean {
  if (r.passageId !== passageId) return true;
  return r.days === 0 || (r.days === 1 && r.lastDay === today);
}
```

- [ ] **Step 8: Preview sentences in Reading texts**

In `src/parent/PassagesPanel.tsx`: replace `import { splitPhrases } from '../langdu/phrases';` with `import { splitSentences } from '../langdu/sentences';`, `const phrases = splitPhrases(text);` with `const phrases = splitSentences(text);`, and the hint `<small>Paste the text from school. Optional: type / where he should pause.</small>` with `<small>Paste the text from school. The iPad reads it a sentence at a time (at 。！？); type / to end a sentence that has no full stop.</small>`.

- [ ] **Step 9: Run the tests**

Run: `npx vitest run src/langdu scripts/check-content.test.ts src/parent/langdu.test.tsx && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 10: Commit**

```bash
git add src/langdu/sentences.ts src/langdu/sentences.test.ts src/content/passageQuestions.ts src/types.ts src/langdu/cycle.ts src/langdu/cycle.test.ts scripts/check-content.ts scripts/check-content.test.ts src/parent/PassagesPanel.tsx
git commit -m "feat: 朗读 sentences, meaning questions for the 20 passages, day 1 of a passage"
```

---

### Task 2: The voice tier, the Overview warning and the Settings voice line

**Files:**
- Create: `src/audio/voiceTier.ts`, `src/audio/voiceTier.test.ts`, `src/parent/voiceWarning.test.tsx`
- Modify: `src/audio/speech.ts:1-69`
- Modify: `src/parent/Dashboard.tsx:1-68`
- Modify: `src/parent/SettingsPanel.tsx:8,182-210`

**Interfaces:**
- Consumes: `currentVoice` (`speech.ts`), `useApp().settings.langdu`.
- Produces: `type VoiceTier = 'premium' | 'enhanced' | 'default' | 'none'`; `voiceQuality(v: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>): number` (moved, re-exported by `speech.ts`); `tierOf(v | null): VoiceTier`; `noteVoice(v | null): void`; `voiceTier(): VoiceTier`; `TIER_LABEL: Record<VoiceTier, string>`.

- [ ] **Step 1: Write the failing tests**

Create `src/audio/voiceTier.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadChineseVoice } from './speech';
import { noteVoice, tierOf, voiceTier } from './voiceTier';

const v = (name: string, voiceURI: string) => ({ name, voiceURI, lang: 'zh-CN', localService: true, default: false }) as SpeechSynthesisVoice;
afterEach(() => {
  noteVoice(null);
  vi.unstubAllGlobals();
});

describe('voiceTier (spec 2026-10-12 §5)', () => {
  it('reads the tier from the name and voiceURI, as iPadOS names them', () => {
    expect(tierOf(v('Tingting', 'com.apple.voice.compact.zh-CN.Tingting'))).toBe('default');
    expect(tierOf(v('Tingting', 'com.apple.voice.enhanced.zh-CN.Tingting'))).toBe('enhanced');
    expect(tierOf(v('Lili', 'com.apple.voice.premium.zh-CN.Lili'))).toBe('premium');
    expect(tierOf(v('婷婷（增强）', ''))).toBe('enhanced');
    expect(tierOf(null)).toBe('none');
  });
  it('is the tier of the voice speech.ts picked; none before any', async () => {
    expect(voiceTier()).toBe('none');
    vi.stubGlobal('speechSynthesis', { getVoices: () => [v('Tingting', 'com.apple.voice.compact.zh-CN.Tingting'), v('Lili', 'com.apple.voice.premium.zh-CN.Lili')], addEventListener: vi.fn(), removeEventListener: vi.fn() });
    await loadChineseVoice(0);
    expect(voiceTier()).toBe('premium');
  });
});
```

Create `src/parent/voiceWarning.test.tsx`:

```tsx
import { screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as speech from '../audio/speech';
import { noteVoice } from '../audio/voiceTier';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { Dashboard } from './Dashboard';
import { SettingsPanel } from './SettingsPanel';

const voice = (name: string, kind: 'compact' | 'enhanced' | 'premium') => ({ name, voiceURI: `com.apple.voice.${kind}.zh-CN.${name}`, lang: 'zh-CN', localService: true, default: false }) as SpeechSynthesisVoice;
const WARN = /朗读 uses the iPad's voice as the model\./;
const on = { ...DEFAULT_SETTINGS, placementDone: true, langdu: true };
afterEach(() => {
  noteVoice(null);
  vi.restoreAllMocks();
});

describe('the 朗读 voice warning on the Overview (spec 2026-10-12 §5)', () => {
  it('shows with the standard voice, with where to download a better one', async () => {
    noteVoice(voice('Tingting', 'compact'));
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, await makeAppData({ settings: on, voice: true }));
    expect(await screen.findByText(WARN)).toBeTruthy();
    expect(screen.getByText(/download a better Chinese voice: Settings → Accessibility → Spoken Content → Voices → Chinese \(China mainland\) → 婷婷 \(Enhanced\) or Lili \(Premium\), then reopen the app\./)).toBeTruthy();
  });
  it('shows with no voice at all', async () => {
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, await makeAppData({ settings: on }));
    expect(await screen.findByText(WARN)).toBeTruthy();
  });
  it('not with an Enhanced or Premium voice, nor with 朗读 off', async () => {
    noteVoice(voice('Tingting', 'enhanced'));
    const a = renderWithApp(<Dashboard onNavigate={vi.fn()} />, await makeAppData({ settings: on, voice: true }));
    await screen.findByText('Takes to review');
    expect(screen.queryByText(WARN)).toBeNull();
    a.unmount();
    noteVoice(voice('Tingting', 'compact'));
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, await makeAppData({ settings: { ...on, langdu: false }, voice: true }));
    await screen.findByText('Takes to review');
    expect(screen.queryByText(WARN)).toBeNull();
  });
});

describe('Settings shows the voice in use and its tier (spec 2026-10-12 §5)', () => {
  it('names the voice and its tier', async () => {
    const lili = voice('Lili', 'premium');
    noteVoice(lili);
    vi.spyOn(speech, 'currentVoice').mockReturnValue(lili);
    renderWithApp(<SettingsPanel />, await makeAppData());
    expect(screen.getByText(/Now speaking: Lili · Premium\./)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/audio/voiceTier.test.ts src/parent/voiceWarning.test.tsx`
Expected: FAIL — `./voiceTier` not found.

- [ ] **Step 3: Write `src/audio/voiceTier.ts`**

```ts
// How good the Chinese voice in use is (spec 2026-10-12 §5): 朗读's model needs the iPad's Premium or Enhanced voice. Kept apart
// from speech.ts (which notes each voice it picks) so screens that mock speech still know the tier.
export type VoiceTier = 'premium' | 'enhanced' | 'default' | 'none';
type Named = Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>;

/**
 * How clear a voice is: an iPad's downloaded Premium or Enhanced voices are much clearer than the compact default (parent,
 * 2026-10-05). iPadOS often names them all "Tingting"; the quality is in the voiceURI (com.apple.voice.enhanced.zh-CN.…).
 */
export const voiceQuality = (v: Named): number => {
  const id = `${v.name} ${v.voiceURI ?? ''}`;
  return /premium/i.test(id) ? 2 : /enhanced|增强|高品质|优化/i.test(id) ? 1 : 0;
};

export function tierOf(v: Named | null): VoiceTier {
  if (!v) return 'none';
  return (['default', 'enhanced', 'premium'] as const)[voiceQuality(v)]!;
}

let current: VoiceTier = 'none';
/** speech.ts tells it each voice it picks (null: none). */
export function noteVoice(v: Named | null): void {
  current = tierOf(v);
}
export const voiceTier = (): VoiceTier => current;

export const TIER_LABEL: Record<VoiceTier, string> = { premium: 'Premium', enhanced: 'Enhanced', default: 'Standard', none: 'none' };
```

- [ ] **Step 4: Note every pick in `speech.ts`**

In `src/audio/speech.ts`:
- After `import { setClipActive, setSpeaking } from './speaking';` add `import { noteVoice, voiceQuality } from './voiceTier';`.
- Delete the `voiceQuality` definition (lines 20-27, with its comment) and in its place write:

```ts
export { voiceQuality };

/** The voice in use, and its tier for the parent's screens (spec 2026-10-12 §5). */
const useVoice = (v: SpeechSynthesisVoice | null): SpeechSynthesisVoice | null => {
  voice = v;
  noteVoice(v);
  return v;
};
```

- In `setPreferredVoice`: `if (available()) useVoice(pickVoice(speechSynthesis.getVoices()));`
- Replace the body of `loadChineseVoice` from `if (!available()) return (voice = null);` to `return voice;` with:

```ts
  if (!available()) return useVoice(null);
  // the iPad can add voices after the first list (a downloaded Enhanced one): pick again whenever the list changes
  speechSynthesis.addEventListener?.('voiceschanged', () => { useVoice(pickVoice(speechSynthesis.getVoices()) ?? voice); });
  useVoice(pickVoice(speechSynthesis.getVoices()));
  if (!voice) {
    useVoice(await new Promise<SpeechSynthesisVoice | null>((resolve) => {
      const done = () => resolve(pickVoice(speechSynthesis.getVoices()));
      speechSynthesis.addEventListener?.('voiceschanged', done, { once: true });
      setTimeout(done, timeoutMs);
    }));
  }
  return voice;
```

- [ ] **Step 5: The Overview warning**

In `src/parent/Dashboard.tsx` add `import { voiceTier } from '../audio/voiceTier';`, and right after the `{!voice && (…)}` warning block insert:

```tsx
      {settings.langdu && (voiceTier() === 'default' || voiceTier() === 'none') && (
        <p class="warning">
          <strong>朗读 uses the iPad's voice as the model.</strong> For natural reading, download a better Chinese voice: Settings →
          Accessibility → Spoken Content → Voices → Chinese (China mainland) → 婷婷 (Enhanced) or Lili (Premium), then reopen the app.
        </p>
      )}
```

Keep the arrows and the sentence on one logical text run (JSX line breaks inside text become single spaces), so the test's regex matches.

- [ ] **Step 6: The Settings voice line**

In `src/parent/SettingsPanel.tsx`: add `import { TIER_LABEL, voiceTier } from '../audio/voiceTier';`. In `VoiceField`:

```tsx
  const [using, setUsing] = useState(currentVoice()?.name ?? null);
  const [tier, setTier] = useState(voiceTier());
  useEffect(() => {
    const update = () => { setVoices(chineseVoices()); setUsing(currentVoice()?.name ?? null); setTier(voiceTier()); };
```

and the hint:

```tsx
      <p class="hint">Now speaking: {using ? `${using} · ${TIER_LABEL[tier]}` : 'no Mandarin voice found'}. {voices.length} Mandarin voice{voices.length === 1 ? '' : 's'} available to the app. 朗读 reads with this voice: Enhanced or Premium sounds natural.</p>
```

In the `<select>`'s `onChange`, after `setUsing(…)` add `setTier(voiceTier());`.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/audio src/parent && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/audio/voiceTier.ts src/audio/voiceTier.test.ts src/audio/speech.ts src/parent/Dashboard.tsx src/parent/SettingsPanel.tsx src/parent/voiceWarning.test.tsx
git commit -m "feat: voice tier, Overview warning for 朗读's model voice, tier in Settings"
```

---

### Task 3: Lesson budget, 朗读 on (lessonVersion 7) and its Settings switch

**Files:**
- Modify: `src/session/plan.ts:35`, `src/session/plan.test.ts:70-79,158-167`
- Modify: `src/session/writing.ts:10-11`, `src/session/writing.test.ts:12-21`
- Modify: `src/types.ts:265-266,294-296`
- Modify: `src/store/settings.ts`, `src/store/settings.test.ts` (whole file)
- Modify: `src/parent/SettingsPanel.tsx:120-126` (switch)
- Create: `src/parent/settingsLangdu.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `PRACTICE_SHARE = 1 / 3`; `writeCharTarget(minutes)` = 4 / 5 / 7 / 8 / 9; `DEFAULT_SETTINGS.langdu === true`, `DEFAULT_SETTINGS.lessonVersion === 7`; `migrateSettings` returns `{ …, langdu: true, lessonVersion: 7 }` for any version below 7.

- [ ] **Step 1: Change the tests**

`src/session/writing.test.ts` lines 12-21 become:

```ts
describe('how many characters (spec 2026-10-05 §5; spec 2026-10-12 §4)', () => {
  it('4 at the usual 15 minutes; 5 at 20, 7 at 25, 8 at 30, 9 from 40', () => {
    expect(writeCharTarget(15)).toBe(4); // 朗读 takes its ~3 minutes (spec 2026-10-12 §4)
    expect(writeCharTarget(10)).toBe(4);
    expect(writeCharTarget(19)).toBe(4);
    expect(writeCharTarget(20)).toBe(5);
    expect(writeCharTarget(25)).toBe(7);
    expect(writeCharTarget(30)).toBe(8);
    expect(writeCharTarget(35)).toBe(8);
    expect(writeCharTarget(40)).toBe(9);
    expect(writeCharTarget(45)).toBe(9);
  });
});
```

`src/session/plan.test.ts` lines 70-79 become:

```ts
  it("sizes 写一写 (8 characters at 30 minutes, 5 at 20, 4 at 15) and 练一练's time box from session minutes", () => {
    const ws = chars(12);
    const cards = ws.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 20), true));
    const count = (min: number) => new Set(buildSessionPlan({ cards, words: ws, settings: settings({ sessionMinutes: min }), now }).writeItems!.map((i) => `${i.wordId}#${i.at}`)).size;
    expect([count(30), count(20), count(15)]).toEqual([8, 5, 4]);
    const p20 = buildSessionPlan({ cards, words: ws, settings: settings({ sessionMinutes: 20 }), now });
    expect(p20.writeCount).toBe(p20.writeItems!.length); // each never-written character is traced, then written from memory
    expect(p20.writeCount).toBe(10);
    expect(p20.practiceTimeBoxMs).toBe(Math.round((20 * 60_000) / 3));
  });
```

and lines 162-167 become:

```ts
  it('朗读 on, the default since spec 2026-10-12 §7: the speaking step ends the lesson', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).steps).toEqual(['newwords', 'practice', 'writing', 'speaking']);
  });
  it('朗读 switched off: no speaking step', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: { ...DEFAULT_SETTINGS, langdu: false }, now: new Date(2026, 9, 6) }).steps).toEqual(['newwords', 'practice', 'writing']);
  });
  it('练一练 has 5 of the default 15 minutes (spec 2026-10-12 §4: its share is 1/3)', () => {
    expect(buildSessionPlan({ cards: [], words: builtinWords(0), settings: DEFAULT_SETTINGS, now: new Date(2026, 9, 6) }).practiceTimeBoxMs).toBe(5 * 60_000);
  });
```

Replace `src/store/settings.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { freshDb } from '../test/fixtures';
import { getSettings } from './repo';
import { applySettingsMigration, migrateSettings } from './settings';

describe('migrateSettings', () => {
  // each version's moves still happen on the way to v7 (spec 2026-10-05 §7 the switches and the ceiling; 2026-10-11 §6 both tracks, §4 the 15-minute lesson; 2026-10-12 §7 朗读 on)
  it("lesson version 3: 5 new words a day became 4 (and 4 is now the ceiling 8); a parent's other choice stays", () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 5 })).toMatchObject({ newPerDay: 8, lessonVersion: 7 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 2, newPerDay: 6 })).toMatchObject({ newPerDay: 6, lessonVersion: 7 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 7 })).toBeNull();
  });
  it('an install on the old 20-minute default moved to 30, and so on to 15', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 15, lessonVersion: 7 });
  });
  it('keeps a shorter lesson the parent chose', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 15, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 15, lessonVersion: 7 });
  });
  it('keeps a longer lesson the parent chose, and never runs again', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 40, lessonVersion: undefined })).toMatchObject({ sessionMinutes: 40, lessonVersion: 7 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, sessionMinutes: 30, lessonVersion: 7 })).toBeNull();
  });
  it('a fresh install starts at 15 minutes', () => {
    expect(DEFAULT_SETTINGS.sessionMinutes).toBe(15);
  });
});

describe('applySettingsMigration (an existing install on the iPad)', () => {
  it('moves stored 20-minute settings on to 15, even though the defaults already say the current lessonVersion', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, sessionMinutes: 20, lessonVersion: undefined }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(15);
    await db.put('settings', { ...(await getSettings(db)), sessionMinutes: 30 }, 'main'); // the parent chooses 30 later
    await applySettingsMigration(db);
    expect((await getSettings(db)).sessionMinutes).toBe(30);
  });
  it('leaves a fresh install alone', async () => {
    const db = await freshDb();
    await applySettingsMigration(db);
    expect(await db.get('settings', 'main')).toBeUndefined();
  });
});

describe('lessonVersion 4 (spec 2026-10-05 §7)', () => {
  const old = (activities: Record<string, boolean>, newPerDay = 4) => ({ ...DEFAULT_SETTINGS, lessonVersion: 3, newPerDay, activities: activities as never });
  it('maps the old switches: 认一认 → 新字 and 练一练; 选一选 or 钓鱼 → 练一练', () => {
    expect(migrateSettings(old({ flashcards: true, choose: true, components: true, writing: true, speaking: false }))!.activities).toEqual({ newwords: true, practice: true, writing: true, speaking: false });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: true, writing: false, speaking: true }))!.activities).toEqual({ newwords: false, practice: true, writing: false, speaking: true });
    expect(migrateSettings(old({ flashcards: false, choose: false, components: false, writing: true, speaking: true }))!.activities).toEqual({ newwords: false, practice: false, writing: true, speaking: true });
  });
  it('the old default 4 new words a day becomes the ceiling 8; a parent’s own number stays', () => {
    expect(migrateSettings(old({}, 4))!.newPerDay).toBe(8);
    expect(migrateSettings(old({}, 6))!.newPerDay).toBe(6);
    expect(migrateSettings(old({}, 4))!.lessonVersion).toBe(7);
  });
  it('a settings object already on the current version is left alone', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS })).toBeNull();
  });
});

describe('lessonVersion 5: both tracks (spec 2026-10-11 §6)', () => {
  it('moves every install on 4 to 华文 + 高级华文 once', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'hcl' })).toEqual({ course: 'both', langdu: true, lessonVersion: 7 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4, course: 'cl' })).toEqual({ course: 'both', langdu: true, lessonVersion: 7 });
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 4 })).toEqual({ course: 'both', langdu: true, lessonVersion: 7 });
  });
  it('a parent who picked one track since keeps it', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, course: 'cl' })).toEqual({ langdu: true, lessonVersion: 7 });
  });
});

describe('lessonVersion 6: the 15-minute lesson (spec 2026-10-11 §4)', () => {
  it('moves 30 minutes, the old default, to 15, and touches nothing else', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, sessionMinutes: 30, course: 'cl' })).toEqual({ sessionMinutes: 15, langdu: true, lessonVersion: 7 });
  });
  it('only exactly 30: any other length the parent chose stays', () => {
    for (const m of [10, 20, 25, 35, 40]) expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 5, sessionMinutes: m })).toEqual({ langdu: true, lessonVersion: 7 });
  });
});

describe('lessonVersion 7: 朗读 back as a daily step (spec 2026-10-12 §7)', () => {
  it('turns 朗读 on once for an install on 6, and nothing else (a 30-minute lesson chosen since stays)', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS, lessonVersion: 6, langdu: false, sessionMinutes: 30 })).toEqual({ langdu: true, lessonVersion: 7 });
  });
  it('a new install starts with 朗读 on and 看图说话 off', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ langdu: true, story: false, lessonVersion: 7 });
  });
  it('runs once: a parent who turns 朗读 off afterwards keeps it off', async () => {
    const db = await freshDb();
    await db.put('settings', { ...DEFAULT_SETTINGS, langdu: false, lessonVersion: 6 }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).langdu).toBe(true);
    await db.put('settings', { ...(await getSettings(db)), langdu: false }, 'main');
    await applySettingsMigration(db);
    expect((await getSettings(db)).langdu).toBe(false);
  });
});
```

Create `src/parent/settingsLangdu.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { getSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SettingsPanel } from './SettingsPanel';

describe('「朗读 Read aloud」 switch (spec 2026-10-12 §7)', () => {
  it('is on for a new install; off and on again saves, and the Activities 朗读 box shows only while it is on', async () => {
    const app = await makeAppData();
    renderWithApp(<SettingsPanel />, app);
    const box = screen.getByLabelText('朗读 Read aloud') as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(screen.getByLabelText('朗读 reading aloud')).toBeTruthy();
    fireEvent.click(box);
    await waitFor(async () => expect((await getSettings(app.db)).langdu).toBe(false));
    expect(screen.queryByLabelText('朗读 reading aloud')).toBeNull();
    fireEvent.click(screen.getByLabelText('朗读 Read aloud'));
    await waitFor(async () => expect((await getSettings(app.db)).langdu).toBe(true));
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/session/plan.test.ts src/session/writing.test.ts src/store/settings.test.ts src/parent/settingsLangdu.test.tsx`
Expected: FAIL — old shares, targets, defaults; no 「朗读 Read aloud」 label.

- [ ] **Step 3: Budgets**

`src/session/plan.ts:35`:

```ts
export const PRACTICE_SHARE = 1 / 3; // 练一练's share of the lesson: 5 of the usual 15 minutes, 朗读 takes ~3 (spec 2026-10-12 §4)
```

`src/session/writing.ts:10-11`:

```ts
/** Characters a lesson (spec 2026-10-12 §4, 朗读 takes its ~3 minutes): 4 under 20 minutes (the usual 15), 5 at 20, 7 at 25, 8 at 30, 9 from 40. */
export const writeCharTarget = (minutes: number): number => Math.min(MAX_WRITE_CHARS, minutes < 20 ? 4 : minutes < 25 ? 5 : minutes < 30 ? 7 : minutes < 40 ? 8 : 9);
```

Also change the file's first comment line `5 characters from memory at the usual 15 minutes` to `4 characters from memory at the usual 15 minutes`.

- [ ] **Step 4: Defaults and the v7 move**

`src/types.ts`: the `langdu` field comment becomes `langdu: boolean; // 朗读, the lesson's last step (spec 2026-10-12): on by default; Settings → 「朗读 Read aloud」`; in `DEFAULT_SETTINGS`, `langdu: true,` and `lessonVersion: 7,`.

`src/store/settings.ts` — add to the doc comment `* 朗读 back (v7, spec 2026-10-12 §7): 朗读 is switched on once; a parent who turns it off later keeps it off.` and replace the function body:

```ts
export function migrateSettings(s: Settings): Partial<Settings> | null {
  const v = s.lessonVersion ?? 1;
  if (v >= 7) return null;
  const patch: Partial<Settings> = {};
  if (v < 4) {
    if (v < 2) patch.sessionMinutes = s.sessionMinutes === 20 ? 30 : s.sessionMinutes;
    const perDay = v < 3 && s.newPerDay === 5 ? 4 : s.newPerDay;
    patch.newPerDay = perDay === 4 ? 8 : perDay;
    const was = s.activities as unknown as Partial<Record<'flashcards' | 'choose' | 'components' | 'writing' | 'speaking', boolean>>;
    const on = (k: keyof typeof was) => was[k] ?? true;
    patch.activities = { newwords: on('flashcards'), practice: on('flashcards') || on('choose') || on('components'), writing: on('writing'), speaking: on('speaking') };
  }
  if (v < 5) patch.course = 'both';
  if (v < 6 && (patch.sessionMinutes ?? s.sessionMinutes) === 30) patch.sessionMinutes = 15; // an install moved to 30 by v2 was on the default too
  patch.langdu = true;
  patch.lessonVersion = 7;
  return patch;
}
```

- [ ] **Step 5: The switch**

In `src/parent/SettingsPanel.tsx`, after the 「拼音渐隐 Fade pinyin」 field (line 126) insert:

```tsx
      <div class="field">
        <label>
          <input type="checkbox" checked={s.langdu} onChange={(e) => void save({ langdu: e.currentTarget.checked })} />{' '}
          朗读 Read aloud
        </label>
        <p class="hint">The last step of every lesson (about 3 minutes): the iPad reads today's text a sentence at a time, he reads it alone while it records, compares the two, and answers one question. Each text is read 3 days; on its first day he warms up with his self-introduction. His takes come to Listen &amp; confirm. Off: no 朗读 step.</p>
      </div>
```

- [ ] **Step 6: Run the whole suite and fix tests that assumed 朗读 parked**

Run: `npx vitest run`
Expected: the files from Step 1 pass. Any other failure must be one that only happened because `DEFAULT_SETTINGS.langdu` is now `true` (a lesson planning a `speaking` step — an expected `steps` list, a progress-bar segment count, a path stop, a star count) or because `lessonVersion` is now 7. For each such test that is not about 朗读: add `langdu: false` to the settings it stores or builds (`updateSettings(app.db, { …, langdu: false })`, `makeAppData({ settings: { …, langdu: false } })`, `{ ...DEFAULT_SETTINGS, langdu: false }`); for one asserting the current `lessonVersion`, change 6 to 7. Do not change any production code in this step; a failure of any other kind is a real regression — stop and investigate.

- [ ] **Step 7: Type-check and run again**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "feat: 朗读 on as the lesson's last step (lessonVersion 7), 练一练 1/3, 4 characters to write, Settings switch"
```

---

### Task 4: The model reader and the rebuilt 朗读 step

**Files:**
- Create: `src/langdu/useModelReader.ts`, `src/langdu/useModelReader.test.tsx`
- Modify: `src/langdu/stars.ts`, `src/langdu/stars.test.ts` (`betterTake`)
- Modify: `src/langdu/intro.ts`, `src/langdu/intro.test.ts` (drop `pinyinMode`)
- Modify: `src/langdu/phrases.ts`, `src/langdu/phrases.test.ts` (drop `splitPhrases`)
- Modify: `src/activities/shared/recording.tsx:75-84` (`BlockedNote`)
- Modify: `src/activities/langdu/LangduStep.tsx` (whole file), `src/activities/langdu/LangduStep.test.tsx` (whole file)
- Modify: `src/app/SessionScreen.tsx:515-525`, `src/app/LangduScreen.tsx:52`, `src/app/langduSession.test.tsx`, `src/app/langduExtra.test.tsx:26-69`
- Modify: `src/styles.css` (after line 1194)

**Interfaces:**
- Consumes: `splitSentences`, `answeringSentence` (Task 1); `ReadingPassage.question` (Task 1); `onSpeaking`, `setSpeaking` (`src/audio/speaking.ts`); `speak`, `stopSpeaking` (`speech.ts`); `earnsBonus`.
- Produces: `START_WAIT_MS = 2500`, `SENTENCE_MAX_MS = 20_000`, `interface ModelReader { current: number | null; heardAll: boolean; read(from: number, only?: boolean): void; stop(): void }`, `useModelReader(sentences: string[]): ModelReader`; `betterTake<T extends { level?: number; durationSec: number }>(takes: T[]): T | null`; `BlockedNote()`; `type LangduPart = 'warmup' | 'listen' | 'read' | 'compare' | 'meaning'`; `interface LangduResult { intro: FinishedRecording | null; read: FinishedRecording | null; meaning: { correct: boolean; picked: string } | null }`; `LangduStep` props `{ passage: ReadingPassage; oral: OralInfo; kid: KidState; withWarmup: boolean; extra?: boolean; micBlocked?: boolean; startAt?: LangduPart; onDone(r: LangduResult): void }` (the `warmups` and `knownChars` props are gone; pinyin fades under the caller's `PinyinFade`).

- [ ] **Step 1: Write the model reader's failing test**

Create `src/langdu/useModelReader.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../audio/speaking';
import { START_WAIT_MS, useModelReader } from './useModelReader';

vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
import { speak, stopSpeaking } from '../audio/speech';

function Probe({ sentences }: { sentences: string[] }) {
  const m = useModelReader(sentences);
  return (
    <div>
      <span data-testid="cur">{m.current ?? '-'}</span>
      <span data-testid="all">{String(m.heardAll)}</span>
      <button type="button" onClick={() => m.read(0)}>all</button>
      <button type="button" onClick={() => m.read(1, true)}>one</button>
      <button type="button" onClick={() => m.stop()}>stop</button>
    </div>
  );
}
const cur = () => screen.getByTestId('cur').textContent;
const all = () => screen.getByTestId('all').textContent;
const S = ['甲。', '乙。', '丙。'];

beforeEach(() => vi.mocked(speak).mockClear());
afterEach(() => {
  act(() => setSpeaking(false));
  vi.useRealTimers();
});

describe('useModelReader (spec 2026-10-12 §3)', () => {
  it('speaks one sentence at a time, lit from its start to its end', () => {
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('all'));
    expect(speak).toHaveBeenLastCalledWith('甲。');
    expect(cur()).toBe('-'); // not before its voice starts
    act(() => setSpeaking(true));
    expect(cur()).toBe('0');
    act(() => setSpeaking(false));
    expect(cur()).toBe('-');
    expect(speak).toHaveBeenLastCalledWith('乙。');
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    act(() => setSpeaking(true));
    expect(cur()).toBe('2');
    expect(all()).toBe('false');
    act(() => setSpeaking(false));
    expect(all()).toBe('true');
    expect(speak).toHaveBeenCalledTimes(3);
  });
  it('one sentence only: no more after it, and the passage is not counted as heard', () => {
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('one'));
    expect(speak).toHaveBeenLastCalledWith('乙。');
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(all()).toBe('false');
  });
  it('a sentence whose voice never starts is passed over, so the read-through still ends', () => {
    vi.useFakeTimers();
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('all'));
    act(() => vi.advanceTimersByTime(START_WAIT_MS));
    expect(speak).toHaveBeenLastCalledWith('乙。');
    act(() => vi.advanceTimersByTime(START_WAIT_MS * 2));
    expect(all()).toBe('true');
  });
  it('stop: quiet at once, and the end of the cut-off sentence starts nothing', () => {
    render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('all'));
    act(() => setSpeaking(true));
    fireEvent.click(screen.getByText('stop'));
    expect(stopSpeaking).toHaveBeenCalled();
    expect(cur()).toBe('-');
    act(() => setSpeaking(false));
    expect(speak).toHaveBeenCalledTimes(1);
  });
  it('leaving mid-sentence stops the voice and reads no further', () => {
    vi.mocked(stopSpeaking).mockClear();
    const { unmount } = render(<Probe sentences={S} />);
    fireEvent.click(screen.getByText('all'));
    act(() => setSpeaking(true));
    unmount();
    expect(stopSpeaking).toHaveBeenCalled();
    act(() => setSpeaking(false));
    expect(speak).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/langdu/useModelReader.test.tsx`
Expected: FAIL — `./useModelReader` not found.

- [ ] **Step 3: Write `src/langdu/useModelReader.ts`**

```ts
// 朗读's model (spec 2026-10-12 §3): the iPad voice reads the passage one sentence per utterance, and the sentence being read is
// lit from the moment its voice starts until it ends — the speaking signal that moves Truffle's mouth (src/audio/speaking.ts).
import { useEffect, useRef, useState } from 'preact/hooks';
import { onSpeaking } from '../audio/speaking';
import { speak, stopSpeaking } from '../audio/speech';

/** A sentence whose voice hasn't started by then is passed over (no Chinese voice, a dropped utterance): reading never hangs. */
export const START_WAIT_MS = 2500;
/** A started sentence that never says it ended counts as ended after this long. */
export const SENTENCE_MAX_MS = 20_000;

export interface ModelReader {
  /** the sentence being read now (lit), or null */
  current: number | null;
  /** a read has reached the last sentence */
  heardAll: boolean;
  /** read from `from` to the end, or only that sentence */
  read: (from: number, only?: boolean) => void;
  /** quiet now (he is about to read, or plays his own take) */
  stop: () => void;
}

export function useModelReader(sentences: string[]): ModelReader {
  const [current, setCurrent] = useState<number | null>(null);
  const [heardAll, setHeardAll] = useState(false);
  const run = useRef(0); // bumped by each new read and by stop: an older read's events are ignored
  const live = useRef<(() => void) | null>(null); // the sentence in progress: stops listening for it
  const list = useRef(sentences);
  list.current = sentences;

  const halt = () => {
    run.current++;
    live.current?.();
    live.current = null;
  };

  const say = (i: number, last: number, mine: number) => {
    if (run.current !== mine) return;
    if (i > last) {
      live.current = null;
      setCurrent(null);
      if (last >= list.current.length - 1) setHeardAll(true);
      return;
    }
    let started = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      off();
      clearTimeout(timer);
      if (run.current !== mine) return;
      setCurrent(null);
      say(i + 1, last, mine);
    };
    const off = onSpeaking((on) => {
      if (on && !started) {
        started = true;
        setCurrent(i);
        clearTimeout(timer);
        timer = setTimeout(next, SENTENCE_MAX_MS);
      } else if (!on && started) next();
    });
    timer = setTimeout(next, START_WAIT_MS);
    live.current = () => {
      off();
      clearTimeout(timer);
    };
    speak(list.current[i]!);
  };

  const read = (from: number, only = false) => {
    halt();
    say(from, only ? from : list.current.length - 1, run.current);
  };
  const stop = () => {
    if (!live.current) return;
    halt();
    setCurrent(null);
    stopSpeaking();
  };
  useEffect(() => () => {
    if (!live.current) return;
    halt();
    stopSpeaking();
  }, []);
  return { current, heardAll, read, stop };
}
```

- [ ] **Step 4: Run it**

Run: `npx vitest run src/langdu/useModelReader.test.tsx`
Expected: PASS.

- [ ] **Step 5: `betterTake`, `BlockedNote`, and the removals**

Append to `src/langdu/stars.test.ts`:

```ts
describe('betterTake (spec 2026-10-12 §3: one re-read, the better kept)', () => {
  const t = (level: number, durationSec: number) => ({ level, durationSec });
  it('the re-read when it is louder, or quicker and still a real read; else the first', () => {
    expect(betterTake([t(0.05, 20), t(0.1, 19)])).toEqual(t(0.1, 19));
    expect(betterTake([t(0.1, 20), t(0.08, 17)])).toEqual(t(0.08, 17));
    expect(betterTake([t(0.1, 20), t(0.09, 19)])).toEqual(t(0.1, 20));
    expect(betterTake([t(0.1, 20), t(0.3, 3)])).toEqual(t(0.1, 20)); // stopped straight away
  });
  it('one take is kept; none is null', () => {
    expect(betterTake([t(0.1, 20)])).toEqual(t(0.1, 20));
    expect(betterTake([])).toBeNull();
  });
});
```

(and add `betterTake` to its import). Append to `src/langdu/stars.ts`:

```ts
/** The take kept after a re-read (spec 2026-10-12 §3): the second when it beats the first by earnsBonus's rule, else the first. */
export function betterTake<T extends { level?: number; durationSec: number }>(takes: T[]): T | null {
  const [first, second] = takes;
  if (!first) return null;
  if (!second) return first;
  return earnsBonus(first, { level: second.level ?? 0, durationSec: second.durationSec }) ? second : first;
}
```

In `src/langdu/intro.ts` delete `export type PinyinMode …` and the `pinyinMode` function; in `src/langdu/intro.test.ts` change the import to `import { introLines } from './intro';` and delete the `'pinyin fades: …'` test.

In `src/langdu/phrases.ts` delete `BREAK` and `splitPhrases`, keeping `displayText`; `src/langdu/phrases.test.ts` becomes:

```ts
import { describe, expect, it } from 'vitest';
import { displayText } from './phrases';
describe('displayText', () => {
  it("drops the parent's / marks", () => {
    expect(displayText('今天天气很好 / 我们去公园玩。')).toBe('今天天气很好我们去公园玩。');
  });
});
```

In `src/activities/shared/recording.tsx` replace the blocked branch of `MicButton` (lines 76-84) with `if (rec.state === 'blocked') return <BlockedNote />;` and add above `MicButton`:

```tsx
/** The microphone is refused or missing: said once, kindly; the step goes on without recording. */
export function BlockedNote() {
  return (
    <p class="warning">
      <Label zh={BLOCKED_NOTE} />
      <br />
      <small>Ask a parent to allow the microphone for this app.</small>
    </p>
  );
}
```

- [ ] **Step 6: Write the step's failing tests**

Replace `src/activities/langdu/LangduStep.test.tsx` with:

```tsx
import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSpeaking } from '../../audio/speaking';
import { DEFAULT_KID } from '../../types';
import { LangduStep } from './LangduStep';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

import { recordingSupported, startRecording } from '../../audio/recorder';
import { speak, stopSpeaking } from '../../audio/speech';

const question = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'] as [string, string, string], answer: 1 as const };
const passage = { id: 'pp:1', title: '我家', text: '我爱爸爸。我爱妈妈。', source: 'parent' as const, question };
const oral = { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' };
let takes: { level: number; durationSec: number }[] = [];

beforeEach(() => {
  vi.mocked(speak).mockClear();
  vi.mocked(recordingSupported).mockReturnValue(true);
  takes = [];
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockImplementation(async (_stop, onLevel) => {
    onLevel?.(0.1);
    const t = takes.shift() ?? { level: 0.1, durationSec: 10 };
    return { stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: t.durationSec, ...(onLevel ? { level: t.level } : {}) }), cancel: vi.fn() };
  });
});
afterEach(() => act(() => setSpeaking(false)));

const button = (text: string) => screen.getByText(text).closest('button') as HTMLButtonElement;
const lit = () => [...document.querySelectorAll('.langdu__sentence')].findIndex((e) => e.classList.contains('is-reading'));
/** The model reads `n` sentences: each voice starts, then ends. */
const modelReads = (n: number) => {
  for (let i = 0; i < n; i++) {
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
  }
};
async function record() {
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
}
/** Listen through, then read once: on Compare. */
async function toCompare() {
  modelReads(2);
  fireEvent.click(button('开始朗读'));
  await record();
  await screen.findByRole('button', { name: '听我的' });
}

describe('LangduStep (spec 2026-10-12 §3)', () => {
  it('day 1: warm-up, the sentence lit while it is read, read, compare, one re-read keeping the better take, the question', async () => {
    takes = [{ level: 0, durationSec: 4 }, { level: 0.05, durationSec: 20 }, { level: 0.1, durationSec: 17 }]; // the warm-up, then two reads: the second louder
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup onDone={onDone} />);
    expect(screen.getByText('老师好！')).toBeTruthy();
    expect(speak).toHaveBeenCalledWith('你好！');
    await record();
    await waitFor(() => expect(button('继续').disabled).toBe(false));
    fireEvent.click(button('继续'));
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸。');
    expect(lit()).toBe(-1); // not before its voice starts
    act(() => setSpeaking(true));
    expect(lit()).toBe(0);
    expect(button('开始朗读').disabled).toBe(true);
    act(() => setSpeaking(false));
    expect(lit()).toBe(-1);
    expect(speak).toHaveBeenLastCalledWith('我爱妈妈。');
    act(() => setSpeaking(true));
    expect(lit()).toBe(1);
    act(() => setSpeaking(false));
    expect(button('开始朗读').disabled).toBe(false);
    fireEvent.click(button('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    expect(await screen.findByRole('meter')).toBeTruthy();
    fireEvent.click(screen.getByText('停止'));
    await screen.findByRole('button', { name: '听我的' });
    expect(screen.getByText('听老师的')).toBeTruthy();
    fireEvent.click(button('再读一遍'));
    await record();
    await screen.findByRole('button', { name: '听我的' });
    expect(screen.queryByText('再读一遍')).toBeNull(); // one re-read
    fireEvent.click(button('下一步'));
    expect(screen.getByText('我爱谁？')).toBeTruthy();
    fireEvent.click(button('妈妈'));
    expect(await screen.findByText('对了！')).toBeTruthy();
    expect(screen.getByText('谢谢老师！')).toBeTruthy();
    fireEvent.click(button('完成'));
    expect(onDone).toHaveBeenCalledWith({
      intro: expect.objectContaining({ durationSec: 4 }),
      read: expect.objectContaining({ level: 0.1, durationSec: 17 }),
      meaning: { correct: true, picked: '妈妈' },
    });
  });

  it('after day 1: no warm-up, straight to listening', () => {
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    expect(screen.queryByText('老师好！')).toBeNull();
    expect(screen.getByText('我爱爸爸。')).toBeTruthy();
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸。');
  });

  it('a worse re-read keeps the first take', async () => {
    takes = [{ level: 0.1, durationSec: 20 }, { level: 0.05, durationSec: 21 }];
    const onDone = vi.fn();
    render(<LangduStep passage={{ ...passage, question: undefined }} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={onDone} />);
    await toCompare();
    fireEvent.click(button('再读一遍'));
    await record();
    await screen.findByRole('button', { name: '听我的' });
    fireEvent.click(button('完成')); // no question: Compare ends the step
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: expect.objectContaining({ level: 0.1, durationSec: 20 }), meaning: null });
  });

  it('a miss shows the right choice and reads the sentence that answers it again', async () => {
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} startAt="meaning" onDone={onDone} />);
    fireEvent.click(button('老师'));
    expect(await screen.findByText('答案是：妈妈')).toBeTruthy();
    expect(button('妈妈').className).toContain('is-answer');
    expect(button('老师').className).toContain('is-wrong');
    expect(speak).toHaveBeenLastCalledWith('我爱妈妈。'); // a parent question names no sentence: found by its right choice
    fireEvent.click(button('完成'));
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: null, meaning: { correct: false, picked: '老师' } });
  });

  it('a right choice found in no sentence: the answer shows, nothing is read again', async () => {
    render(<LangduStep passage={{ ...passage, question: { ...question, choices: ['老师', '外婆', '小马'] } }} oral={oral} kid={DEFAULT_KID} withWarmup={false} startAt="meaning" onDone={vi.fn()} />);
    vi.mocked(speak).mockClear();
    fireEvent.click(button('老师'));
    expect(await screen.findByText('答案是：外婆')).toBeTruthy();
    expect(speak).not.toHaveBeenCalled();
  });

  it('no microphone: listen, read aloud unrecorded with 读完了, then the question; no compare', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={onDone} />);
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy();
    expect(screen.getByText('我爱妈妈。')).toBeTruthy(); // the passage is still there to read
    fireEvent.click(button('读完了'));
    expect(screen.queryByText('听我的')).toBeNull();
    fireEvent.click(button('妈妈'));
    fireEvent.click(await screen.findByText('完成'));
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: null, meaning: { correct: true, picked: '妈妈' } });
  });

  it('a microphone refused earlier in the lesson is not asked for again', async () => {
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup micBlocked onDone={vi.fn()} />);
    expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy();
    expect(screen.queryByText('开始录音')).toBeNull();
    fireEvent.click(button('继续'));
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    expect(screen.queryByText('开始录音')).toBeNull();
    expect(button('读完了').disabled).toBe(false);
    expect(startRecording).not.toHaveBeenCalled();
  });

  it('a microphone refused in the warm-up is not asked for again to read', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByText('开始录音')); });
    await waitFor(() => expect(screen.getByText('麦克风没有打开。我们下次再录！')).toBeTruthy());
    fireEvent.click(button('继续'));
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    expect(screen.queryByText('开始录音')).toBeNull();
    expect(startRecording).toHaveBeenCalledTimes(1);
  });

  it('extra round: no warm-up, no question; Compare ends it with 完成', async () => {
    const onDone = vi.fn();
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} extra onDone={onDone} />);
    await toCompare();
    fireEvent.click(button('完成'));
    fireEvent.click(button('完成')); // a double tap saves the reading once
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith({ intro: null, read: expect.objectContaining({ durationSec: 10 }), meaning: null });
  });

  it('a tap during the first read-through reads on from there; after it, a tap reads that sentence only', () => {
    render(<LangduStep passage={{ ...passage, text: '甲甲。乙乙。丙丙。' }} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    fireEvent.click(button('乙乙。'));
    expect(speak).toHaveBeenLastCalledWith('乙乙。');
    modelReads(1);
    expect(speak).toHaveBeenLastCalledWith('丙丙。');
    modelReads(1);
    expect(button('开始朗读').disabled).toBe(false);
    vi.mocked(speak).mockClear();
    fireEvent.click(button('甲甲。'));
    modelReads(1);
    expect(vi.mocked(speak).mock.calls).toEqual([['甲甲。']]);
  });

  it('the model goes quiet when he starts reading', async () => {
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    modelReads(2);
    fireEvent.click(button('我爱爸爸。')); // he replays a sentence…
    act(() => setSpeaking(true));
    vi.mocked(stopSpeaking).mockClear();
    vi.mocked(speak).mockClear();
    fireEvent.click(button('开始朗读')); // …and starts reading while it plays
    expect(stopSpeaking).toHaveBeenCalled();
    act(() => setSpeaking(false)); // the cut-off sentence's end
    expect(speak).not.toHaveBeenCalled();
    expect(lit()).toBe(-1);
  });

  it('听我的 is an app play button, not the grey browser player: plays, pauses, resets at the end, stops on leave', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { unmount } = render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    await toCompare();
    expect(document.querySelector('audio[controls]')).toBeNull();
    const audio = document.querySelector('audio')!;
    expect(audio.getAttribute('src')).toMatch(/^blob:/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '听我的' })); });
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    expect(pause).toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '听我的' })); });
    act(() => { audio.dispatchEvent(new Event('ended')); });
    expect(screen.getByRole('button', { name: '听我的' })).toBeTruthy();
    fireEvent.click(button('听老师的')); // the model pauses his take and reads
    expect(speak).toHaveBeenLastCalledWith('我爱爸爸。');
    pause.mockClear();
    unmount();
    expect(pause).toHaveBeenCalled();
    play.mockRestore();
    pause.mockRestore();
  });

  it('shows no meter and no 大声一点 until a real level arrives', async () => {
    vi.mocked(startRecording).mockImplementation(async () => ({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 5 }), cancel: vi.fn() }));
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup={false} onDone={vi.fn()} />);
    modelReads(2);
    fireEvent.click(button('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.queryByText('大声一点！')).toBeNull();
  });

  it('missing self-introduction details: just 老师好！', () => {
    render(<LangduStep passage={passage} oral={{ ...oral, school: '' }} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    expect(screen.getByText('老师好！')).toBeTruthy();
    expect(screen.queryByText(/我叫/)).toBeNull();
  });
});

describe('朗读 on the stage (spec 2026-10-04 §3)', () => {
  const onStage = () => {
    expect(document.querySelector('.stage[data-stage="langdu"] .stage__truffle .pet')).toBeTruthy();
    expect(document.querySelector('.stage__card .langdu')).toBeTruthy();
    expect(document.querySelector('.stage__sheet .sheet')).toBeTruthy();
  };
  it('every part happens on the stage, and Truffle is calm while he records', async () => {
    render(<LangduStep passage={passage} oral={oral} kid={DEFAULT_KID} withWarmup onDone={vi.fn()} />);
    onStage(); // warm-up
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText('停止');
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-calm')).toBe('true');
    fireEvent.click(screen.getByText('停止'));
    await waitFor(() => expect(button('继续').disabled).toBe(false));
    fireEvent.click(button('继续'));
    onStage(); // listen
    await toCompare();
    onStage(); // compare
    fireEvent.click(button('下一步'));
    onStage(); // meaning
  });
});
```

- [ ] **Step 7: Run them to see them fail**

Run: `npx vitest run src/activities/langdu/LangduStep.test.tsx`
Expected: FAIL — the step still has echo/phrases, no 听我的, no question.

- [ ] **Step 8: Rewrite `src/activities/langdu/LangduStep.tsx`**

```tsx
import { Pause, Play, Volume2 } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { FinishedRecording } from '../../audio/recorder';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import type { ReadingPassage } from '../../langdu/cycle';
import { introLines } from '../../langdu/intro';
import { answeringSentence, splitSentences } from '../../langdu/sentences';
import { betterTake } from '../../langdu/stars';
import { useModelReader } from '../../langdu/useModelReader';
import type { KidState, OralInfo } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { BlockedNote, MicButton, useRecorder } from '../shared/recording';

export interface LangduResult {
  intro: FinishedRecording | null; // the warm-up, day 1 only
  read: FinishedRecording | null; // the better of his takes; null when the microphone was blocked or missing
  meaning: { correct: boolean; picked: string } | null; // null: no question (an extra round, a parent text without one)
}

export type LangduPart = 'warmup' | 'listen' | 'read' | 'compare' | 'meaning';

interface Props {
  passage: ReadingPassage;
  oral: OralInfo;
  kid: KidState;
  /** day 1 of this passage (isFirstDay): the self-introduction first */
  withWarmup: boolean;
  /** 多读一遍 from Home: listen, read and compare only */
  extra?: boolean;
  /** the microphone was refused earlier in the lesson: don't ask again */
  micBlocked?: boolean;
  /** the stage cases open a part directly */
  startAt?: LangduPart;
  onDone: (r: LangduResult) => void;
}

const BUBBLE: Record<LangduPart, string> = { warmup: '你好！', listen: '听我读！', read: '大声读！', compare: '比一比！', meaning: '想一想！' };

/** 朗读 (spec 2026-10-12 §3): warm-up on day 1 → listen and follow → read alone → compare, one re-read → one meaning question. */
export function LangduStep({ passage, oral, kid, withWarmup, extra = false, micBlocked = false, startAt, onDone }: Props) {
  const [part, setPart] = useState<LangduPart>(startAt ?? (withWarmup ? 'warmup' : 'listen'));
  const sentences = useMemo(() => splitSentences(passage.text), [passage.text]);
  const model = useModelReader(sentences);
  const intro = useRecorder(micBlocked);
  const read = useRecorder(micBlocked);
  const [takes, setTakes] = useState<FinishedRecording[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const takeAudio = useRef<HTMLAudioElement>(null);
  const lines = useMemo(() => introLines(oral), [oral]);
  const question = extra ? undefined : passage.question;
  // a microphone refused in the warm-up isn't asked for again to read
  const readBlocked = read.state === 'blocked' || (intro.state === 'blocked' && read.state === 'ready');
  const latest = takes[takes.length - 1] ?? null;
  const playbackUrl = useMemo(() => (latest ? URL.createObjectURL(latest.blob) : null), [latest]);
  useEffect(() => () => { if (playbackUrl) URL.revokeObjectURL(playbackUrl); }, [playbackUrl]);

  useEffect(() => {
    if (part === 'warmup') speak('你好！');
    else if (part === 'listen') model.read(0);
    else model.stop(); // he reads, compares or answers: the model is quiet until asked
  }, [part]);

  useEffect(() => {
    if (read.state === 'done' && read.result && part === 'read') {
      playSfx('star');
      setTakes((t) => [...t, read.result!]);
      setPart('compare');
    }
  }, [read.state]);

  const finished = useRef(false);
  const finish = (meaning: LangduResult['meaning']) => {
    if (finished.current) return; // a double tap on 完成 saves the reading once
    finished.current = true;
    model.stop();
    onDone({ intro: intro.result, read: betterTake(takes), meaning });
  };
  const afterReading = () => (question ? setPart('meaning') : finish(null));
  const reread = () => {
    takeAudio.current?.pause();
    read.reset();
    setPart('read');
  };
  const replay = (i: number, only: boolean) => {
    takeAudio.current?.pause();
    model.read(i, only);
  };

  const answerAt = question ? answeringSentence(question, sentences) : -1;
  const pick = (i: number) => {
    if (!question || picked !== null) return;
    setPicked(i);
    const right = i === question.answer;
    playSfx(right ? 'correct' : 'wrong');
    if (!right && answerAt >= 0) speak(sentences[answerAt]!); // the sentence that answers it, read again
  };

  // 谢谢老师！ closes a warm-up day, on the step's last screen
  const closing = withWarmup && ((part === 'meaning' && picked !== null) || (part === 'compare' && !question));
  useEffect(() => {
    if (closing) speak(lines.thanks, { queue: true });
  }, [closing]);
  const thanks = closing ? <p class="langdu__line langdu__thanks"><Label zh={lines.thanks} /></p> : null;

  // Truffle stays with him through every part (spec 2026-10-04 §3)
  const pet = <Pet kid={kid} mood="neutral" size={180} calm={intro.state === 'recording' || read.state === 'recording'} bubble={BUBBLE[part]} />;

  if (part === 'warmup') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="继续" disabled={intro.state === 'ready' || intro.state === 'recording'} onAction={() => setPart('listen')} />}>
        <div class="langdu">
          <div class="langdu__script">
            <p class="langdu__line"><Label zh={lines.hello} fade /></p>
            {lines.body && <p class="langdu__line"><Label zh={lines.body} fade /></p>}
          </div>
          <MicButton rec={intro} withLevel={false} />
          {intro.state === 'done' && <p class="langdu__ok"><Label zh="很好！" /></p>}
        </div>
      </Stage>
    );
  }

  if (part === 'listen') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="开始朗读" disabled={!model.heardAll} onAction={() => setPart('read')} />}>
        <div class="langdu langdu__listen" data-heard={String(model.heardAll)}>
          <p class="langdu__step"><Label zh="听一听，看一看" /></p>
          <h2 class="langdu__title"><Label zh={passage.title} /></h2>
          <Sentences sentences={sentences} current={model.current} onTap={(i) => replay(i, model.heardAll)} />
        </div>
      </Stage>
    );
  }

  if (part === 'read') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="读完了" disabled={!readBlocked} onAction={afterReading} />}>
        <div class="langdu">
          <p class="langdu__step"><Label zh="自己读，大声读" /></p>
          <Sentences sentences={sentences} current={null} />
          {readBlocked ? <BlockedNote /> : <MicButton rec={read} withLevel />}
        </div>
      </Stage>
    );
  }

  if (part === 'compare') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel={question ? '下一步' : '完成'} onAction={afterReading} />}>
        <div class="langdu">
          <p class="langdu__step"><Label zh="听一听，比一比" /></p>
          <Sentences sentences={sentences} current={model.current} onTap={(i) => replay(i, true)} />
          <div class="langdu__compare">
            <PlayBack url={playbackUrl} audio={takeAudio} onPlay={() => model.stop()} />
            <button type="button" class="btn btn--secondary langdu__big" onClick={() => replay(0, false)}>
              <Volume2 size={30} strokeWidth={2.5} /> <Label zh="听老师的" />
            </button>
          </div>
          {takes.length < 2 && <button type="button" class="btn langdu__again" onClick={reread}><Label zh="再读一遍" /></button>}
          {thanks}
        </div>
      </Stage>
    );
  }

  if (!question) return null; // the meaning part only opens with a question
  const right = picked === question.answer;
  const mark = (i: number) => (picked === null ? '' : i === question.answer ? (i === picked ? ' is-right' : ' is-answer') : i === picked ? ' is-wrong' : ' is-dim');
  const sheet =
    picked === null ? (
      <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />
    ) : (
      <FeedbackSheet
        tone={right ? 'good' : 'oops'}
        title={right ? '对了！' : `答案是：${question.choices[question.answer]}`}
        detail={!right && answerAt >= 0 ? <Label zh={sentences[answerAt]!} /> : undefined}
        actionLabel="完成"
        auto={false}
        onAction={() => finish({ correct: right, picked: question.choices[picked]! })}
      />
    );
  return (
    <Stage activity="langdu" truffle={pet} sheet={sheet}>
      <div class="langdu">
        <p class="langdu__step"><Label zh="想一想" /></p>
        <p class="langdu__q"><Label zh={question.q} fade /></p>
        <div class="choices langdu__choices">
          {question.choices.map((c, i) => (
            <button key={i} type="button" class={`choice${mark(i)}`} disabled={picked !== null} onClick={() => pick(i)}>
              <Label zh={c} fade peek={false} />
            </button>
          ))}
        </div>
        {thanks}
      </div>
    </Stage>
  );
}

/** The passage a sentence at a time: buttons that replay (listen, compare), plain text to read from (read). */
function Sentences({ sentences, current, onTap }: { sentences: string[]; current: number | null; onTap?: (i: number) => void }) {
  return (
    <div class="passage langdu__passage langdu__sentences">
      {sentences.map((s, i) =>
        onTap ? (
          <button key={i} type="button" class={`langdu__sentence${current === i ? ' is-reading' : ''}`} aria-current={current === i ? 'true' : undefined} onClick={() => onTap(i)}>
            <Label zh={s} fade peek={false} />
          </button>
        ) : (
          <span key={i} class="langdu__sentence"><Label zh={s} fade /></span>
        ),
      )}
    </div>
  );
}

/** 听我的: one big play/pause button for his take (the browser's own grey player showed "Error" on iPad). */
function PlayBack({ url, audio, onPlay }: { url: string | null; audio: { current: HTMLAudioElement | null }; onPlay: () => void }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const a = audio.current;
    return () => a?.pause(); // leaving the screen stops it
  }, []);
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    onPlay();
    setPlaying(true);
    void Promise.resolve(a.play()).catch(() => setPlaying(false)); // a refused play leaves the button on play
  };
  return (
    <>
      <audio ref={audio} src={url ?? undefined} preload="auto" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />
      <button type="button" class="btn btn--secondary langdu__big" aria-label={playing ? '暂停' : '听我的'} disabled={!url} onClick={toggle}>
        {playing ? <Pause size={30} strokeWidth={2.5} /> : <Play size={30} strokeWidth={2.5} />} <Label zh={playing ? '暂停' : '听我的'} />
      </button>
    </>
  );
}
```

- [ ] **Step 9: Styles**

In `src/styles.css`, right after line 1194 (`.stage .langdu__title, .stage .langdu__step, …`) insert:

```css
/* 朗读 (spec 2026-10-12 §3): the passage a sentence at a time, the one being read lit; compare's two big buttons; the question */
.langdu__sentences { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: flex-start; gap: 2px 4px; text-align: left; }
.langdu__sentence { font: inherit; color: inherit; background: none; border: 0; box-shadow: none; border-radius: 12px; padding: 2px 6px; margin: 0; transition: background-color 0.2s; }
button.langdu__sentence { cursor: pointer; }
.langdu__sentence.is-reading { background: var(--green-soft); box-shadow: inset 0 -4px 0 var(--green); }
.langdu__compare { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
.langdu__big { display: inline-flex; align-items: center; gap: 10px; min-height: 64px; padding: 10px 22px; font-size: 24px; }
.langdu__again { min-height: 52px; }
.langdu__q { margin: 0; font-family: var(--hanzi); font-size: clamp(26px, 4dvh, 36px); }
.langdu__choices { grid-template-columns: 1fr; max-width: 480px; }
```

- [ ] **Step 10: Call sites and the app-level tests**

In `src/app/SessionScreen.tsx` lines 515-525, the `LangduStep` becomes (Task 6 adds day 1 and the refused microphone):

```tsx
      {step === 'speaking' && state.speaking?.kind === 'langdu' && (
        <LangduStep passage={state.speaking.passage} oral={state.speaking.oral} kid={kid} withWarmup onDone={(r) => void onLangduDone(r)} />
      )}
```

In `src/app/LangduScreen.tsx` line 52: `<LangduStep passage={passage} oral={state.oral} kid={state.kid} withWarmup={false} extra onDone={(r) => void done(r)} />`.

In `src/app/langduSession.test.tsx`: change the first import line to `import { act, fireEvent, screen, waitFor } from '@testing-library/preact';`, add `import { afterEach } from 'vitest';` to the vitest import (it becomes `import { afterEach, describe, expect, it, vi } from 'vitest';`), add `import { setSpeaking } from '../audio/speaking';`, add `afterEach(() => act(() => setSpeaking(false)));` after the mocks, and replace `readThrough` with:

```ts
const btn = (t: string) => screen.getByText(t).closest('button') as HTMLButtonElement;

async function warmUp() {
  await screen.findByText('老师好！');
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await waitFor(() => expect(btn('继续').disabled).toBe(false));
  fireEvent.click(btn('继续'));
}
/** The model reads the passage's one sentence, he reads it: on Compare. */
async function listenAndRead() {
  await screen.findByText('我爱爸爸，我爱妈妈。');
  act(() => setSpeaking(true));
  act(() => setSpeaking(false));
  await waitFor(() => expect(btn('开始朗读').disabled).toBe(false));
  fireEvent.click(btn('开始朗读'));
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await screen.findByRole('button', { name: '听我的' });
}
async function readThrough() {
  await warmUp();
  await listenAndRead();
  fireEvent.click(btn('完成')); // a parent text with no question: Compare ends the step
}
```

In `src/app/langduExtra.test.tsx`: same import changes (`act`, `afterEach`, `setSpeaking`, the `afterEach`), add the `btn` helper above, and replace the reading part of the first two tests (from `renderWithApp(<LangduScreen />, app);` to `fireEvent.click(screen.getByText('完成'));`) with:

```ts
    renderWithApp(<LangduScreen />, app);
    expect(await screen.findByText('我爱爸爸，我爱妈妈。')).toBeTruthy(); // straight to listening: no warm-up
    expect(screen.queryByText('老师好！')).toBeNull();
    act(() => setSpeaking(true));
    act(() => setSpeaking(false));
    await waitFor(() => expect(btn('开始朗读').disabled).toBe(false));
    fireEvent.click(btn('开始朗读'));
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    await screen.findByRole('button', { name: '听我的' });
    fireEvent.click(btn('完成'));
```

- [ ] **Step 11: Run the tests and the type check**

Run: `npx vitest run src/langdu src/activities src/app/langduSession.test.tsx src/app/langduExtra.test.tsx && npx tsc --noEmit`
Expected: PASS. (`tsc` finds no other caller of `pinyinMode` or `splitPhrases`; if it does, it is a missed call site — point it at `<Label fade>` / `splitSentences`.)

- [ ] **Step 12: Commit**

```bash
git add -A src
git commit -m "feat: 朗读 rebuilt: model reads by sentence with highlight, read, compare with one re-read, meaning question"
```

---

### Task 5: Passage takes in Listen & confirm

**Files:**
- Create: `src/langdu/review.ts`, `src/langdu/review.test.ts`, `src/parent/MisreadText.tsx`
- Modify: `src/types.ts:189-200` (`Recording.meaning`)
- Modify: `src/session/say.ts:22-25` (`waitingTakes`)
- Modify: `src/parent/ListenPanel.tsx` (whole file), `src/parent/listen.test.tsx` (append)
- Modify: `src/parent/RecordingsPanel.tsx:57-100` (use `MisreadText`)
- Modify: `src/styles.css` (after the Task 4 block)

**Interfaces:**
- Consumes: `applyMisreads` (`src/langdu/misreads.ts`); `useModelReader`, `splitSentences` (Tasks 1, 4); `getRecording`, `updateRecording`, `deleteRecording`, `listRecordings`, `listParentPassages`; `displayText`.
- Produces: `Recording.meaning?: { correct: boolean; picked: string }`; `PASSAGE_KEEP_DAYS = 14`; `passageOf(r: Recording): string | null`; `waitingPassageTakes(recs: Recording[]): Recording[]`; `passageTakesToDrop(recs: Recording[], now: Date): string[]`; `tidyPassageTakes(db: AppDb, now: Date): Promise<void>`; `finishPassageReview(db: AppDb, rec: Recording, marks: string[], now: Date): Promise<{ updated: number; notInApp: string[] }>`; `waitingTakes` now includes passage takes; `MisreadText({ text, marked, onToggle })`; `ListenRows` props `{ takes; words; texts?: ReadonlyMap<string, { title: string; text: string }>; onJudge; onDone?: (r: Recording, marks: string[]) => void }`.

- [ ] **Step 1: Write the failing tests**

Create `src/langdu/review.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { waitingTakes } from '../session/say';
import { addRecording, getRecording, listRecordings, putWords } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import type { Recording } from '../types';
import { finishPassageReview, passageTakesToDrop, tidyPassageTakes, waitingPassageTakes } from './review';

const day = (d: number, h = 17) => new Date(2026, 9, d, h).getTime();
const rec = (id: string, prompt: Recording['prompt'], at: number, review?: 'ok' | 'no'): Recording => ({ id, createdAt: at, prompt, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 20, ...(review ? { review } : {}) });
const passage = (id: string, passageId: string, at: number, review?: 'ok') => rec(id, { kind: 'passage', passageId }, at, review);

describe('passage takes in the queue (spec 2026-10-12 §6)', () => {
  it('the newest take of each passage waits, if unreviewed; older ones leave the queue but are not deleted', () => {
    const recs = [passage('a1', 'p01', day(1)), passage('a2', 'p01', day(2)), passage('a3', 'p01', day(2, 18)), passage('b1', 'pp:x', day(2)), passage('c1', 'p02', day(3), 'ok')];
    expect(waitingPassageTakes(recs).map((r) => r.id).sort()).toEqual(['a3', 'b1']);
    expect(passageTakesToDrop(recs, new Date(2026, 9, 3))).toEqual([]);
  });
  it('self-introductions never wait; Say takes and passage takes wait together, oldest first', () => {
    const recs = [rec('i', { kind: 'intro' }, day(1)), passage('p', 'p01', day(3)), rec('s', { kind: 'say', wordId: 'b:大' }, day(2))];
    expect(waitingTakes(recs).map((r) => r.id)).toEqual(['s', 'p']);
  });
  it('tidy: reviewed passage takes older than 14 days go, each passage keeps its newest; unreviewed ones and other recordings stay', async () => {
    const now = new Date(2026, 9, 30);
    const recs = [
      passage('old', 'p01', day(1), 'ok'), passage('new', 'p01', day(28), 'ok'),
      passage('only', 'p02', day(1), 'ok'), // its passage's newest: kept whatever its age
      passage('waiting', 'p03', day(1)), passage('newer', 'p03', day(2), 'ok'), // an older unreviewed take stays
      rec('intro', { kind: 'intro' }, day(1)),
    ];
    expect(passageTakesToDrop(recs, now)).toEqual(['old']);
    const db = await freshDb();
    for (const r of recs) await addRecording(db, r);
    await tidyPassageTakes(db, now);
    expect((await listRecordings(db)).map((r) => r.id).sort()).toEqual(['intro', 'new', 'newer', 'only', 'waiting']);
  });
  it('Done saves the marks as priority words and marks the take listened to', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('爱')]);
    const r = passage('a', 'pp:1', day(1));
    await addRecording(db, r);
    await finishPassageReview(db, r, ['爱'], new Date(2026, 9, 2));
    expect(await getRecording(db, 'a')).toMatchObject({ review: 'ok', misread: ['爱'] });
    expect(waitingPassageTakes(await listRecordings(db))).toEqual([]);
  });
});
```

Append to `src/parent/listen.test.tsx` (add `saveParentPassage` to the repo import, and `act` is not needed):

```tsx
const passageTake = (id: string, passageId: string, d: number, extra: Partial<Recording> = {}): Recording => ({ id, createdAt: at(d), prompt: { kind: 'passage', passageId }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 20, ...extra });

describe('passage takes in Listen & confirm (spec 2026-10-12 §6)', () => {
  async function withPassage() {
    const app = await withTakes();
    await putWords(app.db, [makeWord('爱', { pinyin: 'ài' })]);
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸。我爱妈妈。', createdAt: 1 });
    await addRecording(app.db, passageTake('p1', 'pp:1', 3, { meaning: { correct: false, picked: '老师' } }));
    return app;
  }
  it('a row with the title, his answer, tappable characters, his take, the model and Done; Done saves the marks', async () => {
    const app = await withPassage();
    const onReviewed = vi.fn();
    renderWithApp(<ListenPanel onReviewed={onReviewed} />, app);
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(3));
    const row = document.querySelector('.listen__row--passage')!;
    expect(row.querySelector('.listen__title')!.textContent).toBe('📖 我家');
    expect(row.textContent).toContain('Meaning question: missed (picked 老师)');
    expect(row.querySelector('audio')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '听老师的' }));
    expect(speak).toHaveBeenCalledWith('我爱爸爸。');
    fireEvent.click([...row.querySelectorAll('.misread-ch')].find((b) => b.textContent === '爱')!);
    fireEvent.click(screen.getByRole('button', { name: 'Done: 我家' }));
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(2));
    expect((await listRecordings(app.db)).find((r) => r.id === 'p1')).toMatchObject({ review: 'ok', misread: ['爱'] });
    expect(onReviewed).toHaveBeenCalledTimes(1);
  });
  it('Done twice saves once; a take of a deleted text still has Done', async () => {
    const app = await withTakes();
    await addRecording(app.db, passageTake('gone', 'pp:deleted', 3));
    const done = vi.spyOn(await import('../langdu/review'), 'finishPassageReview');
    renderWithApp(<ListenPanel />, app);
    const b = await screen.findByRole('button', { name: 'Done: (deleted text)' });
    fireEvent.click(b);
    fireEvent.click(b);
    await waitFor(() => expect(document.querySelectorAll('.listen__row')).toHaveLength(2));
    expect(done).toHaveBeenCalledTimes(1);
    expect((await listRecordings(app.db)).find((r) => r.id === 'gone')!.review).toBe('ok');
  });
  it('the badge and the Overview tile count passage takes too', async () => {
    const app = await withPassage();
    renderWithApp(<Dashboard onNavigate={vi.fn()} />, app);
    const tile = (await screen.findByText('Takes to review')).closest('.tile')!;
    expect(tile.querySelector('.tile__value')!.textContent).toBe('3');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/langdu/review.test.ts src/parent/listen.test.tsx`
Expected: FAIL — `./review` not found; no passage rows.

- [ ] **Step 3: The `meaning` field**

In `src/types.ts`, inside `Recording` after `review?: …` add:

```ts
  meaning?: { correct: boolean; picked: string }; // a passage take: his answer to the meaning question (spec 2026-10-12 §3), for the parent
```

and change the `review` comment to `// a Say take the parent confirmed (✓) or rejected (✗), or a passage take listened to ('ok'); absent: waiting`.

- [ ] **Step 4: Write `src/langdu/review.ts`**

```ts
// His passage takes in Listen & confirm (spec 2026-10-12 §6): each passage's newest take waits until the parent has listened;
// Done saves the characters he misread; reviewed takes are tidied after 14 days, each passage's newest kept.
import type { AppDb } from '../store/db';
import { deleteRecording, getRecording, listRecordings, updateRecording } from '../store/repo';
import type { Recording } from '../types';
import { applyMisreads } from './misreads';

/** Reviewed passage takes are kept this long; each passage's newest take stays whatever its age. */
export const PASSAGE_KEEP_DAYS = 14;

/** The passage a take is of; null for any other recording (a self-introduction, a Say take). */
export const passageOf = (r: Recording): string | null => (r.prompt.kind === 'passage' ? r.prompt.passageId : null);

function newestByPassage(recs: Recording[]): Map<string, Recording> {
  const out = new Map<string, Recording>();
  for (const r of recs) {
    const p = passageOf(r);
    if (p === null) continue;
    const had = out.get(p);
    if (!had || r.createdAt > had.createdAt) out.set(p, r);
  }
  return out;
}

/** Each passage's newest take, if the parent hasn't listened to it yet; an older one left the queue when a newer one came. */
export function waitingPassageTakes(recs: Recording[]): Recording[] {
  return [...newestByPassage(recs).values()].filter((r) => !r.review);
}

/** Reviewed passage takes older than 14 days, except each passage's newest. Unreviewed takes and other recordings stay. */
export function passageTakesToDrop(recs: Recording[], now: Date): string[] {
  const newest = newestByPassage(recs);
  const cutoff = now.getTime() - PASSAGE_KEEP_DAYS * 86_400_000;
  return recs.filter((r) => passageOf(r) !== null && r.review && r.createdAt < cutoff && newest.get(passageOf(r)!) !== r).map((r) => r.id);
}

export async function tidyPassageTakes(db: AppDb, now: Date): Promise<void> {
  for (const id of passageTakesToDrop(await listRecordings(db), now)) await deleteRecording(db, id);
}

/** Done on a passage take: its marks become priority words (as before), and it is listened to. Not graded. */
export async function finishPassageReview(db: AppDb, rec: Recording, marks: string[], now: Date): Promise<{ updated: number; notInApp: string[] }> {
  const res = await applyMisreads(db, rec, marks, now);
  const saved = await getRecording(db, rec.id);
  if (saved && !saved.review) await updateRecording(db, { ...saved, review: 'ok' });
  return res;
}
```

- [ ] **Step 5: Passage takes join the queue**

In `src/session/say.ts` add `import { waitingPassageTakes } from '../langdu/review';` and replace `waitingTakes`:

```ts
/** Takes waiting for the parent, oldest first: Say takes, and each passage's newest take (spec 2026-10-12 §6). */
export function waitingTakes(recs: Recording[]): Recording[] {
  return [...recs.filter((r) => takeWord(r) !== null && !r.review), ...waitingPassageTakes(recs)].sort((a, b) => a.createdAt - b.createdAt);
}
```

(`ParentArea`'s badge and `Dashboard`'s tile already count `waitingTakes`.)

- [ ] **Step 6: `MisreadText`, shared with Recordings**

Create `src/parent/MisreadText.tsx`:

```tsx
import { displayText } from '../langdu/phrases';

const HAN = /\p{Script=Han}/u;

/** A passage with each character a button: tap the ones he misread (Recordings, and Listen & confirm's passage row). */
export function MisreadText({ text, marked, onToggle }: { text: string; marked: ReadonlySet<string>; onToggle: (ch: string) => void }) {
  return (
    <p class="misreads__text">
      {[...displayText(text)].map((ch, i) =>
        HAN.test(ch) ? (
          <button key={i} type="button" class={`misread-ch${marked.has(ch) ? ' is-on' : ''}`} aria-pressed={marked.has(ch)} onClick={() => onToggle(ch)}>{ch}</button>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </p>
  );
}
```

In `src/parent/RecordingsPanel.tsx`: add `import { MisreadText } from './MisreadText';`, delete `const HAN = …` (line 14) and the `displayText` import if nothing else uses it, and replace the `<p class="misreads__text">…</p>` block (lines 82-90) with `<MisreadText text={text} marked={marked} onToggle={toggle} />`.

- [ ] **Step 7: Rewrite `src/parent/ListenPanel.tsx`**

```tsx
// Listen & confirm (spec 2026-10-11 §6; spec 2026-10-12 §6): his Say takes and his passage takes, oldest first. A word: play his
// take and the model, then ✓ or ✗. A passage: play his take and the model, tap what he misread, then Done.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { PASSAGES } from '../content';
import { finishPassageReview, passageOf } from '../langdu/review';
import { splitSentences } from '../langdu/sentences';
import { useModelReader } from '../langdu/useModelReader';
import { findWord } from '../ladder/words';
import { reviewTake, takeWord, waitingTakes } from '../session/say';
import { listParentPassages, listRecordings } from '../store/repo';
import type { Recording, Word } from '../types';
import { SpeakButton } from '../ui/SpeakButton';
import { MisreadText } from './MisreadText';

export type PassageTexts = ReadonlyMap<string, { title: string; text: string }>;

/** 听老师的: the model reads the passage a sentence at a time, as he heard it. */
function ModelButton({ text }: { text: string }) {
  const model = useModelReader(splitSentences(text));
  return <button type="button" class="small-btn listen__model" onClick={() => model.read(0)}>听老师的</button>;
}

function PassageRow({ r, url, texts, onDone }: { r: Recording; url: string | undefined; texts: PassageTexts; onDone: (r: Recording, marks: string[]) => void }) {
  const t = texts.get(passageOf(r)!);
  const title = t?.title ?? '(deleted text)';
  const [marks, setMarks] = useState<Set<string>>(new Set(r.misread ?? []));
  const toggle = (ch: string) => setMarks((m) => {
    const n = new Set(m);
    if (n.has(ch)) n.delete(ch);
    else n.add(ch);
    return n;
  });
  return (
    <tr class="listen__row listen__row--passage">
      <td colSpan={4}>
        <div class="listen__passage">
          <div><strong class="listen__title">📖 {title}</strong> <small>{new Date(r.createdAt).toLocaleString()}</small></div>
          {r.meaning && <small class="listen__meaning">{r.meaning.correct ? 'Meaning question: right' : `Meaning question: missed (picked ${r.meaning.picked})`}</small>}
          {t && <MisreadText text={t.text} marked={marks} onToggle={toggle} />}
          <div class="row listen__actions">
            <audio controls preload="none" src={url} aria-label="His take" />
            {t && <ModelButton text={t.text} />}
            <button type="button" class="small-btn listen__done" aria-label={`Done: ${title}`} onClick={() => onDone(r, [...marks])}>Done</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/** The queue's rows (the stage cases show it with takes in memory): a Say take's word, take, model, ✓ and ✗; a passage take's row. */
export function ListenRows({ takes, words, texts = new Map(), onJudge, onDone = () => {} }: {
  takes: Recording[];
  words: ReadonlyMap<string, Word>;
  texts?: PassageTexts;
  onJudge: (r: Recording, verdict: 'ok' | 'no') => void;
  onDone?: (r: Recording, marks: string[]) => void;
}) {
  const cache = useRef(new Map<string, string>()); // one object URL per take across reloads, so a take being played is not cut off
  for (const r of takes) if (!cache.current.has(r.id)) cache.current.set(r.id, URL.createObjectURL(r.blob));
  const urls = cache.current;
  useEffect(() => {
    const listed = new Set(takes.map((r) => r.id));
    for (const [id, u] of cache.current) if (!listed.has(id)) { URL.revokeObjectURL(u); cache.current.delete(id); }
  }, [takes]);
  useEffect(() => () => { cache.current.forEach((u) => URL.revokeObjectURL(u)); cache.current.clear(); }, []);
  if (takes.length === 0) return <p>Nothing to listen to. New takes appear here after his lessons.</p>;
  return (
    <table class="table">
      <tbody>
        {takes.map((r) => {
          if (passageOf(r) !== null) return <PassageRow key={r.id} r={r} url={urls.get(r.id)} texts={texts} onDone={onDone} />;
          const w = words.get(takeWord(r)!);
          const label = w?.text ?? takeWord(r) ?? '';
          return (
            <tr key={r.id} class="listen__row">
              <td>
                <span class="hanzi listen__word">{w?.text ?? '?'}</span> <span class="listen__py">{w?.pinyin}</span>
                <br />
                <small>{new Date(r.createdAt).toLocaleString()}</small>
              </td>
              <td><audio controls preload="none" src={urls.get(r.id)} aria-label="His take" /></td>
              <td>{w && <SpeakButton text={w.text} reading={w.pinyin} />}</td>
              <td class="listen__verdict">
                <button type="button" class="small-btn" aria-label={`Said right: ${label}`} onClick={() => onJudge(r, 'ok')}>✓</button>{' '}
                <button type="button" class="small-btn" aria-label={`Not right: ${label}`} onClick={() => onJudge(r, 'no')}>✗</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ListenPanel({ onReviewed }: { onReviewed?: () => void }) {
  const { db, now } = useApp();
  const [takes, setTakes] = useState<Recording[] | null>(null);
  const [words, setWords] = useState<Map<string, Word>>(new Map());
  const [texts, setTexts] = useState<PassageTexts>(new Map());
  const [error, setError] = useState(false);
  const busy = useRef(new Set<string>()); // a double tap on ✓ or Done reviews a take once
  const reload = async () => {
    const [recs, parent] = await Promise.all([listRecordings(db), listParentPassages(db)]);
    const waiting = waitingTakes(recs);
    const ids = [...new Set(waiting.map(takeWord).filter((id): id is string => id !== null))];
    const found = await Promise.all(ids.map(async (id) => [id, await findWord(db, id)] as const));
    setWords(new Map(found.filter((x): x is readonly [string, Word] => !!x[1])));
    setTexts(new Map([...PASSAGES, ...parent].map((p) => [p.id, { title: p.title, text: p.text }])));
    setTakes(waiting);
  };
  useEffect(() => {
    reload().catch((e) => {
      console.error(e);
      setError(true);
    });
  }, []);
  const settle = async (r: Recording, act: () => Promise<unknown>) => {
    if (busy.current.has(r.id)) return;
    busy.current.add(r.id);
    try {
      await act();
    } catch (e) {
      busy.current.delete(r.id); // it did not happen: let the parent tap again
      console.error(e);
      setError(true);
      return;
    }
    try {
      await reload();
      setError(false);
    } catch (e) {
      console.error(e);
      setError(true);
    }
    onReviewed?.();
  };
  return (
    <section class="panel listen">
      <h2>Listen & confirm</h2>
      <p class="muted">He read words aloud in 练一练 and today's text in 朗读. A word: play his take, then the model: ✓ if he said it right, ✗ if not; it counts as “can say” after ✓ on two different days, and ✗ brings it back soon. A text: play his take and the model, tap any character he misread (it comes up in practice), then Done.</p>
      {error && <p class="muted" role="alert">Something went wrong reading or saving the takes. Try again.</p>}
      {takes ? (
        <ListenRows takes={takes} words={words} texts={texts} onJudge={(r, v) => void settle(r, () => reviewTake(db, r.id, v, now()))} onDone={(r, marks) => void settle(r, () => finishPassageReview(db, r, marks, now()))} />
      ) : (!error && <p class="muted">Loading…</p>)}
    </section>
  );
}
```

Note: the "Done twice" test spies on `finishPassageReview` through the module namespace; `ListenPanel` imports it by name from `../langdu/review`, which vitest's spy replaces on the live binding (the existing `say.reviewTake` spy works the same way).

- [ ] **Step 8: Styles for the passage row**

In `src/styles.css`, after the Task 4 block insert:

```css
/* Listen & confirm's passage row (spec 2026-10-12 §6) */
.listen__passage { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.listen__meaning { color: var(--muted); }
.listen__actions { justify-content: flex-start; flex-wrap: wrap; gap: 10px; }
.listen__done, .listen__model { min-height: 44px; min-width: 88px; }
```

- [ ] **Step 9: Run the tests**

Run: `npx vitest run src/langdu src/parent src/session/say.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A src
git commit -m "feat: passage takes in Listen & confirm: newest per passage, marks + model + Done, 14-day tidy"
```

---

### Task 6: The lesson and the extra round wired up

**Files:**
- Modify: `src/app/SessionScreen.tsx:25,87,94-96,131-139,321-327,399-424,515-517`
- Modify: `src/app/LangduScreen.tsx` (whole file)
- Modify: `src/app/langduSession.test.tsx` (append), `src/app/sayLesson.test.tsx` (append), `src/app/langduExtra.test.tsx` (append)

**Interfaces:**
- Consumes: `isFirstDay` (Task 1), `LangduResult.meaning` (Task 4), `tidyPassageTakes` (Task 5), `Recording.meaning` (Task 5), `PinyinFade`, `KnownReadings` (`src/ui/pinyinFade.tsx`), `logError` (`src/app/errorLog.ts`).
- Produces: `Loaded.speaking` langdu variant `{ kind: 'langdu'; passage: ReadingPassage; oral: OralInfo; firstDay: boolean }`; the daily step's take carries `meaning`; passage takes are tidied after each save.

- [ ] **Step 1: Write the failing tests**

Append to `src/app/langduSession.test.tsx` (add `PassageQuestion` to the `../types` import and `listRecordings` is already imported):

```ts
describe('朗读 in the lesson (spec 2026-10-12 §3, §6)', () => {
  it('after day 1 of a passage: no warm-up, straight to listening; only the read is saved', async () => {
    const app = await setup();
    await saveKid(app.db, { ...DEFAULT_KID, speakingLast: 'story', reading: { passageId: 'pp:1', days: 1, extra: 0, lastDay: '2026-10-04', lastRead: { 'pp:1': '2026-10-04' }, warmups: 1 } });
    renderWithApp(<SessionScreen free={false} />, app);
    await listenAndRead();
    expect(screen.queryByText('老师好！')).toBeNull();
    fireEvent.click(btn('完成'));
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await listRecordings(app.db)).map((r) => r.prompt.kind)).toEqual(['passage']);
    expect((await getKid(app.db))!.reading).toMatchObject({ days: 2, warmups: 1 });
  });

  it('his answer to the meaning question is kept with his take, for the parent', async () => {
    const app = await setup();
    const question: PassageQuestion = { q: '我爱谁？', choices: ['老师', '妈妈', '小马'], answer: 1 };
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1, question });
    renderWithApp(<SessionScreen free={false} />, app);
    await warmUp();
    await listenAndRead();
    fireEvent.click(btn('下一步'));
    fireEvent.click(btn('小马'));
    fireEvent.click(await screen.findByText('完成'));
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    expect((await listRecordings(app.db)).find((r) => r.prompt.kind === 'passage')!.meaning).toEqual({ correct: false, picked: '小马' });
  });

  it("saving a take tidies the passage's reviewed takes older than 14 days, keeping the newest", async () => {
    const app = await setup();
    const old = (id: string, d: Date, review?: 'ok') => ({ id, createdAt: d.getTime(), prompt: { kind: 'passage' as const, passageId: 'pp:1' }, blob: new Blob(['o']), mime: 'audio/mp4', durationSec: 5, ...(review ? { review } : {}) });
    await addRecording(app.db, old('reviewed', new Date(2026, 8, 1), 'ok'));
    await addRecording(app.db, old('unheard', new Date(2026, 8, 2)));
    renderWithApp(<SessionScreen free={false} />, app);
    await readThrough();
    expect(await screen.findByText('太棒了！')).toBeTruthy();
    await waitFor(async () => expect((await listRecordings(app.db)).map((r) => r.id)).not.toContain('reviewed'));
    expect((await listRecordings(app.db)).map((r) => r.id)).toContain('unheard');
  });
});
```

Append to `src/app/sayLesson.test.tsx` (add `saveParentPassage` to its repo import):

```ts
/** Taps through the rest of 练一练 (any question type: choices, 钓鱼 tiles, bubbles, parts) until 朗读 shows. */
const TAPS = '.choice:not([disabled]), .fishtile:not([disabled]), .bubble-opt:not([disabled]), .whichpart__char:not([disabled])';
async function untilLangdu() {
  for (let i = 0; i < 120; i++) {
    await waitFor(() => expect(document.querySelector(`.langdu, ${TAPS}, .sheet .btn:not([disabled])`)).toBeTruthy(), { timeout: 4000 });
    if (document.querySelector('.langdu')) return;
    const before = document.body.innerHTML;
    const open = document.querySelector<HTMLElement>(TAPS);
    if (open) fireEvent.click(open);
    const next = document.querySelector<HTMLElement>('.sheet .btn:not([disabled])');
    if (next) fireEvent.click(next);
    await waitFor(() => expect(document.body.innerHTML).not.toBe(before), { timeout: 4000 });
  }
  throw new Error('no 朗读 came');
}

describe('a microphone refused on a Say card (spec 2026-10-12 §3)', () => {
  it('朗读 later in the lesson does not ask for it again', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    const app = await setup();
    await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: false, speaking: true }, langdu: true });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    renderWithApp(<SessionScreen free={false} />, app);
    await untilSay();
    fireEvent.click(screen.getByText('开始录音'));
    await waitFor(() => expect(document.querySelector('.say')).toBeNull());
    await untilLangdu();
    expect(await screen.findByText('麦克风没有打开。我们下次再录！')).toBeTruthy(); // the warm-up says so…
    expect(screen.queryByText('开始录音')).toBeNull(); // …and never asks
    expect(startRecording).toHaveBeenCalledTimes(1);
  }, 60_000);
});
```

Append to `src/app/langduExtra.test.tsx`:

```ts
describe('多读一遍 (spec 2026-10-12 §3)', () => {
  it('pinyin fades over the characters he reads, as in the lesson', async () => {
    const app = await makeAppData({ settings: LANGDU, kid, now: () => new Date(2026, 9, 2, 17) });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    await saveKid(app.db, kid);
    await putWords(app.db, [builtinWords(0).find((w) => w.text === '我')!]);
    await putCards(app.db, [makeCard('b:我', 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<LangduScreen />, app);
    await screen.findByText('我爱爸爸，我爱妈妈。');
    const cells = [...document.querySelectorAll('.langdu__sentence .label__cell--zh')];
    expect(cells.find((c) => c.querySelector('.label__ch')!.textContent === '我')!.classList.contains('label__cell--hidden')).toBe(true);
    expect(cells.find((c) => c.querySelector('.label__ch')!.textContent === '爱')!.classList.contains('label__cell--hidden')).toBe(false);
  });
});
```

(add `putCards, putWords` to its repo import, `import { builtinWords } from '../content';` and `import { makeCard } from '../test/fixtures';`).

Also add one Home test to `src/app/langduExtra.test.tsx`, showing the default is on:

```ts
describe('朗读 on by default (spec 2026-10-12 §7)', () => {
  it('with no setting touched, a text to read puts 朗读 on the path', async () => {
    const names = () => [...document.querySelectorAll('.path__name')].map((n) => n.querySelector('.sr-only')?.textContent ?? n.textContent);
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS, placementDone: true } });
    await saveParentPassage(app.db, { id: 'pp:1', title: '我家', text: '我爱爸爸，我爱妈妈。', createdAt: 1 });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(names()).toContain('朗读');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/app/langduSession.test.tsx src/app/sayLesson.test.tsx src/app/langduExtra.test.tsx`
Expected: FAIL — the warm-up always runs, no `meaning` saved, no tidy, 朗读 asks for the microphone again, no fading in 多读一遍. (The Home default test passes already after Task 3; keep it as a guard.)

- [ ] **Step 3: `SessionScreen`**

In `src/app/SessionScreen.tsx`:
- Line 25: `import { pickPassage, readingPool, finishDay, isFirstDay, type ReadingPassage } from '../langdu/cycle';` and add `import { tidyPassageTakes } from '../langdu/review';`.
- Line 87 (`Loaded.speaking`): `speaking: { kind: 'langdu'; passage: ReadingPassage; oral: OralInfo; firstDay: boolean } | { kind: 'story'; scene: Scene } | null;`
- After `const [stepFraction, setStepFraction] = useState(0);` add:

```ts
  const [micRefused, setMicRefused] = useState(false); // a Say card found the microphone refused: 朗读 won't ask again (spec 2026-10-12 §3)
```

- Line 137: `if (kind === 'langdu' && passage) return { kind: 'langdu' as const, passage, oral: settings.oral, firstDay: isFirstDay(k.reading, passage.id, localDateKey(today)) };`
- In `onSayDone`, the `if (!r) {` block becomes:

```ts
      if (!r) {
        setMicRefused(true);
        await commit(skipSayItems(latest.current ?? rec));
        return;
      }
```

- Replace `onLangduDone` (lines 399-424) with:

```ts
  /** Save the warm-up and the kept read (with his answer), count the cycle day, tidy old passage takes, and give a bonus star for beating the last read. */
  const onLangduDone = (r: LangduResult) =>
    once(async () => {
      const reading = state.speaking as { kind: 'langdu'; passage: ReadingPassage; oral: OralInfo; firstDay: boolean };
      const at = now();
      const today = localDateKey(at);
      if (r.intro) await keepRecording(db, { id: newId(), createdAt: at.getTime(), prompt: { kind: 'intro' }, ...r.intro });
      let bonus = false;
      if (r.read) {
        const prev = (await listRecordings(db)).find((x) => x.prompt.kind === 'passage' && x.prompt.passageId === reading.passage.id);
        bonus = earnsBonus(prev, { level: r.read.level ?? 0, durationSec: r.read.durationSec });
        await keepRecording(db, { id: newId(), createdAt: at.getTime(), prompt: { kind: 'passage', passageId: reading.passage.id }, ...r.read, ...(r.meaning ? { meaning: r.meaning } : {}) });
        try {
          await tidyPassageTakes(db, at);
        } catch (err) {
          logError(err); // a failed tidy never stops the lesson
        }
      }
      const fresh = (await getKid(db)) ?? kid;
      await saveKid(db, {
        ...fresh,
        reading: { ...finishDay(fresh.reading, reading.passage.id, today), warmups: fresh.reading.warmups + (r.intro ? 1 : 0) },
        speakingLast: 'langdu',
        bonusStars: fresh.bonusStars + (bonus ? 1 : 0),
      });
      if (bonus) {
        playSfx('star');
        burst(window.innerWidth / 2, window.innerHeight / 2, { count: 18 });
      }
      await commit(finishStep(addActiveTime(rec, Math.round(performance.now() - stepStartedAt.current))));
    })();
```

- The `LangduStep` render (from Task 4) becomes:

```tsx
      {step === 'speaking' && state.speaking?.kind === 'langdu' && (
        <LangduStep passage={state.speaking.passage} oral={state.speaking.oral} kid={kid} withWarmup={state.speaking.firstDay} micBlocked={micRefused} onDone={(r) => void onLangduDone(r)} />
      )}
```

- [ ] **Step 4: `LangduScreen`**

Replace `src/app/LangduScreen.tsx` with:

```tsx
import { X } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { LangduStep, type LangduResult } from '../activities/langdu/LangduStep';
import { PASSAGES } from '../content';
import { pickPassage, readingPool, type ReadingPassage } from '../langdu/cycle';
import { tidyPassageTakes } from '../langdu/review';
import { localDateKey } from '../lib/date';
import { newId } from '../lib/id';
import { keepRecording, getKid, getSettings, listParentPassages } from '../store/repo';
import { DEFAULT_KID, type KidState, type OralInfo } from '../types';
import { InkIcon } from '../ui/icons/InkIcon';
import { PinyinFade, type KnownReadings } from '../ui/pinyinFade';
import { currentWorld, timeOfDay } from '../fun/worlds';
import { WorldScene } from '../ui/worlds/WorldScene';
import { useApp } from './AppContext';
import { logError } from './errorLog';
import { loadKnowledge } from './knowledge';

interface Loaded { passage: ReadingPassage | null; oral: OralInfo; kid: KidState; knownChars: Set<string>; knownReadings: KnownReadings; fadePinyin: boolean }

/** 多读一遍 from Home (spec 2026-10-12 §3): today's passage — listen, read, compare — no warm-up, no question, no stars, no cycle day. */
export function LangduScreen() {
  const { db, now, go } = useApp();
  const [state, setState] = useState<Loaded | null>(null);

  useEffect(() => {
    void (async () => {
      const [know, kid, parent, settings] = await Promise.all([loadKnowledge(db), getKid(db), listParentPassages(db), getSettings(db)]);
      const k = kid ?? DEFAULT_KID;
      const passage = pickPassage(k.reading, readingPool(parent, PASSAGES, know.knownChars), localDateKey(now()));
      setState({ passage, oral: settings.oral, kid: k, knownChars: know.knownChars, knownReadings: know.knownReadings, fadePinyin: settings.fadePinyin !== false });
    })();
  }, []);

  useEffect(() => {
    if (state && !state.passage) go({ name: 'home' });
  }, [state]);

  if (!state?.passage) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;
  const passage = state.passage;

  const done = async (r: LangduResult) => {
    if (r.read) {
      await keepRecording(db, { id: newId(), createdAt: now().getTime(), prompt: { kind: 'passage', passageId: passage.id }, ...r.read });
      try {
        await tidyPassageTakes(db, now());
      } catch (err) {
        logError(err);
      }
    }
    go({ name: 'home' });
  };

  return (
    <PinyinFade known={state.knownChars} readings={state.knownReadings} on={state.fadePinyin}>
      <div class="screen">
        <WorldScene world={currentWorld(state.kid)} time={timeOfDay(now())} />
        <header class="lessonbar">
          <button type="button" class="icon-btn" aria-label="回家" onClick={() => go({ name: 'home' })}>
            <X size={34} strokeWidth={3} />
          </button>
        </header>
        <LangduStep passage={passage} oral={state.oral} kid={state.kid} withWarmup={false} extra onDone={(r) => void done(r)} />
      </div>
    </PinyinFade>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/app && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app
git commit -m "feat: 朗读 in the lesson: warm-up on day 1 only, no second mic request, answer kept, takes tidied; 多读一遍 fades pinyin"
```

---

### Task 7: The parent's optional question on Reading texts

**Files:**
- Modify: `src/parent/PassagesPanel.tsx` (whole file)
- Modify: `src/parent/langdu.test.tsx` (append inside `describe('PassagesPanel', …)`)

**Interfaces:**
- Consumes: `ParentPassage.question`, `PassageQuestion` (Task 1); `splitSentences` (Task 1).
- Produces: a saved `ParentPassage` carries `question` only when the question and all three choices are filled; editing loads it; clearing the question removes it.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('PassagesPanel', …)` in `src/parent/langdu.test.tsx`:

```tsx
  it('saves an optional meaning question with the right choice marked; editing shows it; clearing it removes it', async () => {
    const app = await makeAppData();
    renderWithApp(<PassagesPanel />, app);
    fireEvent.input(await screen.findByLabelText('Title'), { target: { value: '我家' } });
    fireEvent.input(screen.getByLabelText('Text'), { target: { value: '我爱爸爸。我爱妈妈。' } });
    fireEvent.input(screen.getByLabelText('Question'), { target: { value: '我爱谁？' } });
    ['老师', '妈妈', '小马'].forEach((c, i) => fireEvent.input(screen.getByLabelText(`Choice ${i + 1}`), { target: { value: c } }));
    fireEvent.click(screen.getByLabelText('Choice 2 is right'));
    fireEvent.click(screen.getByText('Save text'));
    await waitFor(async () => expect((await listParentPassages(app.db))[0]!.question).toEqual({ q: '我爱谁？', choices: ['老师', '妈妈', '小马'], answer: 1 }));
    fireEvent.click(await screen.findByText('Edit'));
    expect((screen.getByLabelText('Question') as HTMLInputElement).value).toBe('我爱谁？');
    expect((screen.getByLabelText('Choice 2 is right') as HTMLInputElement).checked).toBe(true);
    fireEvent.input(screen.getByLabelText('Question'), { target: { value: '' } });
    ['', '', ''].forEach((c, i) => fireEvent.input(screen.getByLabelText(`Choice ${i + 1}`), { target: { value: c } }));
    fireEvent.click(screen.getByText('Save text'));
    await waitFor(async () => expect((await listParentPassages(app.db))[0]!.question).toBeUndefined());
  });
  it('a half-filled question cannot be saved, and says why', async () => {
    const app = await makeAppData();
    renderWithApp(<PassagesPanel />, app);
    fireEvent.input(await screen.findByLabelText('Title'), { target: { value: '我家' } });
    fireEvent.input(screen.getByLabelText('Text'), { target: { value: '我爱爸爸。' } });
    fireEvent.input(screen.getByLabelText('Question'), { target: { value: '我爱谁？' } });
    fireEvent.input(screen.getByLabelText('Choice 1'), { target: { value: '爸爸' } });
    expect((screen.getByText('Save text') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Fill in the question and all three choices, or leave them all empty.')).toBeTruthy();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/parent/langdu.test.tsx`
Expected: FAIL — no "Question" field.

- [ ] **Step 3: Rewrite `src/parent/PassagesPanel.tsx`**

```tsx
import { newId } from '../lib/id';
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { hanChars } from '../content';
import { splitSentences } from '../langdu/sentences';
import { deleteParentPassage, listParentPassages, saveParentPassage } from '../store/repo';
import type { ParentPassage, PassageQuestion } from '../types';

const NO_CHOICES: [string, string, string] = ['', '', ''];

/** School texts for 朗读: they come before the built-in passages, 3 days each; each may carry one meaning question (spec 2026-10-12 §3). */
export function PassagesPanel() {
  const { db } = useApp();
  const [list, setList] = useState<ParentPassage[]>([]);
  const [editing, setEditing] = useState<ParentPassage | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [choices, setChoices] = useState<[string, string, string]>(NO_CHOICES);
  const [right, setRight] = useState<0 | 1 | 2>(0);
  const reload = async () => setList(await listParentPassages(db));
  useEffect(() => {
    void reload();
  }, []);

  const sentences = splitSentences(text);
  const filled = q.trim() !== '' && choices.every((c) => c.trim() !== '');
  const empty = q.trim() === '' && choices.every((c) => c.trim() === '');
  const question: PassageQuestion | undefined = filled ? { q: q.trim(), choices: choices.map((c) => c.trim()) as [string, string, string], answer: right } : undefined;
  const canSave = title.trim().length > 0 && hanChars(text).length > 0 && (filled || empty);
  const reset = () => {
    setEditing(null);
    setTitle('');
    setText('');
    setQ('');
    setChoices(NO_CHOICES);
    setRight(0);
  };
  const save = async () => {
    if (!canSave) return;
    const { id, createdAt } = editing ?? { id: `pp:${newId()}`, createdAt: Date.now() }; // newId works on plain-http hosts too
    await saveParentPassage(db, { id, createdAt, title: title.trim(), text: text.trim(), ...(question ? { question } : {}) });
    reset();
    await reload();
  };
  const edit = (p: ParentPassage) => {
    setEditing(p);
    setTitle(p.title);
    setText(p.text);
    setQ(p.question?.q ?? '');
    setChoices(p.question ? [...p.question.choices] : NO_CHOICES);
    setRight(p.question?.answer ?? 0);
  };
  const remove = async (p: ParentPassage) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await deleteParentPassage(db, p.id);
    if (editing?.id === p.id) reset();
    await reload();
  };
  const setChoice = (i: number, v: string) => setChoices((c) => c.map((x, j) => (j === i ? v : x)) as [string, string, string]);

  return (
    <section class="panel">
      <h2>Reading texts (朗读)</h2>
      <p>Texts here come first in the daily 朗读 step, in the order added; each is read for 3 days. When none are left, the app uses its built-in passages.</p>
      {list.length > 0 && (
        <table class="table">
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.title}{p.question && <small> · ❓</small>}</td>
                <td>{p.text.replace(/\s*\/\s*/g, '').slice(0, 20)}{p.text.length > 20 ? '…' : ''}</td>
                <td><button type="button" class="small-btn" onClick={() => edit(p)}>Edit</button></td>
                <td><button type="button" class="small-btn" onClick={() => void remove(p)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div class="field">
        <label for="pp-title">Title</label>
        <input id="pp-title" value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
      </div>
      <div class="field">
        <label for="pp-text">Text</label>
        <textarea id="pp-text" rows={5} value={text} onInput={(e) => setText(e.currentTarget.value)} />
        <small>Paste the text from school. The iPad reads it a sentence at a time (at 。！？); type / to end a sentence that has no full stop.</small>
      </div>
      {sentences.length > 0 && (
        <ol class="phrase-preview">
          {sentences.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      <fieldset class="field">
        <legend>Meaning question (optional)</legend>
        <div class="field">
          <label for="pp-q">Question</label>
          <input id="pp-q" value={q} placeholder="谁…？ 哪里…？ 什么…？ 为什么…？" onInput={(e) => setQ(e.currentTarget.value)} />
        </div>
        {[0, 1, 2].map((i) => (
          <div class="row" key={i} style={{ justifyContent: 'flex-start' }}>
            <input type="radio" name="pp-right" aria-label={`Choice ${i + 1} is right`} checked={right === i} onChange={() => setRight(i as 0 | 1 | 2)} />
            <input aria-label={`Choice ${i + 1}`} value={choices[i]} onInput={(e) => setChoice(i, e.currentTarget.value)} />
          </div>
        ))}
        <small>After reading he answers it. Mark the right choice; a miss shows it and reads again the sentence that has it.</small>
        {!filled && !empty && <p class="hint" role="status">Fill in the question and all three choices, or leave them all empty.</p>}
      </fieldset>
      <div class="row" style={{ justifyContent: 'flex-start' }}>
        <button type="button" class="small-btn" disabled={!canSave} onClick={() => void save()}>Save text</button>
        {editing && <button type="button" class="small-btn" onClick={reset}>Cancel</button>}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/parent && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parent/PassagesPanel.tsx src/parent/langdu.test.tsx
git commit -m "feat: optional meaning question on a parent's reading text"
```

---

### Task 8: WebKit stage cases, the fit sweep, the full suite and the build

**Files:**
- Modify: `scripts/stage-cases/page.tsx` (imports; `listen` case; new `langdu-*` cases)
- Modify: `scripts/stage-cases.ts` (`cardClipped` gains `scrolls`; 朗读 cases; passage row checks)
- Modify: `scripts/fit-check.ts:124-134,428` (wait on listen; full lesson with 朗读)

**Interfaces:**
- Consumes: `LangduStep`, `LangduPart` (Task 4), `ListenRows` with `texts`/`onDone` (Task 5), `PASSAGES`, `PASSAGE_QUESTIONS` (Task 1), `setSpeaking`.
- Produces: stage cases `langdu-warmup`, `langdu-listen`, `langdu-read`, `langdu-read-blocked`, `langdu-compare`, `langdu-meaning`; the `listen` case with a passage row.

- [ ] **Step 1: The stage page**

In `scripts/stage-cases/page.tsx`:
- Change `import { builtinWords } from '../../src/content';` to `import { builtinWords, PASSAGES } from '../../src/content';` and add:

```tsx
import { LangduStep, type LangduPart } from '../../src/activities/langdu/LangduStep';
import { PASSAGE_QUESTIONS } from '../../src/content/passageQuestions';
```

- In the `listen` case, after `const takes: Recording[] = …;` add a passage take and pass the texts:

```tsx
  const p20 = PASSAGES.find((x) => x.id === 'p20')!; // the longest built-in text
  takes.push({ id: 'tp', createdAt: new Date(2026, 9, 11, 18).getTime(), prompt: { kind: 'passage', passageId: p20.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 40, meaning: { correct: false, picked: '一个大商店' } });
```

and its `ListenRows` becomes `<ListenRows takes={takes} words={new Map(said.map((w) => [w.id, w]))} texts={new Map([[p20.id, { title: p20.title, text: p20.text }]])} onJudge={() => {}} onDone={() => {}} />`.

- Insert before the final `else render(screen(` branch:

```tsx
else if (which?.startsWith('langdu-')) {
  // 朗读's parts (spec 2026-10-12 §3, §8): the longest built-in text (p20) with every syllable showing (nothing known), each part
  // opened directly; stage-cases.ts misses the question. In listen, the first sentence lights as its voice starts.
  const p = PASSAGES.find((x) => x.id === 'p20')!;
  const part = (which === 'langdu-read-blocked' ? 'read' : which.slice('langdu-'.length)) as LangduPart;
  render(screen(
    <PinyinFade known={new Set()} on>
      <LangduStep passage={{ ...p, source: 'builtin', question: PASSAGE_QUESTIONS[p.id] }} oral={{ name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' }} kid={DEFAULT_KID} withWarmup startAt={part} micBlocked={which === 'langdu-read-blocked'} onDone={() => {}} />
    </PinyinFade>,
  ), app);
  if (part === 'listen') setTimeout(() => setSpeaking(true), 50);
}
```

- [ ] **Step 2: The checks**

In `scripts/stage-cases.ts`, give `cardClipped` a third parameter for a box allowed to scroll (the passage box scrolls on a phone, as in the sweep's `SCROLLERS`):

```ts
const cardClipped = (page: import('playwright-core').Page, name: string, scrolls = '') => page.evaluate(([n, s]) => {
  const card = document.querySelector('.stage__card')?.getBoundingClientRect();
  if (!card) return [`${n}: no lesson card`];
  for (const el of document.querySelectorAll('.stage__card *')) {
    if ((el instanceof SVGElement && el.ownerSVGElement) || el.closest('.sr-only, [aria-hidden="true"]')) continue;
    if (s && el.closest(s)) continue; // a box meant to scroll, and what is inside it
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.top < card.top - 2 || r.bottom > card.bottom + 2 || r.left < card.left - 2 || r.right > card.right + 2)) return [`${n}: clipped by the card: ${(el.textContent ?? '').trim().slice(0, 12)}`];
    // a box inside the card that has to scroll hides its last rows (the 认新字 card scrolls rather than squash)
    const o = getComputedStyle(el).overflowY;
    if ((o === 'auto' || o === 'scroll' || o === 'hidden') && el.scrollHeight > el.clientHeight + 2) return [`${n}: ${el.className} scrolls ${el.scrollHeight - el.clientHeight}px`];
  }
  return [];
}, [name, scrolls] as const);
```

After the `family` block (before `await page.goto(\`file://${dir}/index.html?case=build\`);`) insert:

```ts
  // 朗读 (spec 2026-10-12 §8): every part with the longest built-in text, the sentence lit while the model reads, a missed question
  for (const c of ['langdu-warmup', 'langdu-listen', 'langdu-read', 'langdu-read-blocked', 'langdu-compare', 'langdu-meaning']) {
    await page.goto(`file://${dir}/index.html?case=${c}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `fit-shots/stage-cases/${c}-${size.name}.png` });
    problems.push(...(await cardClipped(page, `${size.name} ${c}`, '.langdu__passage')));
    if (c === 'langdu-listen' && !(await page.$('.langdu__sentence.is-reading'))) problems.push(`${size.name} langdu-listen: no sentence lit while the model reads`);
  }
  {
    await page.goto(`file://${dir}/index.html?case=langdu-meaning`);
    await page.waitForTimeout(300);
    await page.click('.langdu__choices .choice >> nth=0'); // p20's right answer is the second choice
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `fit-shots/stage-cases/langdu-meaning-wrong-${size.name}.png` });
    if (!(await page.$('.langdu__choices .choice.is-answer'))) problems.push(`${size.name} langdu-meaning: the miss does not show the right choice`);
    problems.push(...(await cardClipped(page, `${size.name} langdu-meaning wrong`)), ...(await sheetFits(page, `${size.name} langdu-meaning wrong`)));
  }
```

After the `listen` case's `✓/✗ under 44px` loop insert:

```ts
  if (!(await page.$('.listen__row--passage .misread-ch'))) problems.push(`${size.name} listen: no passage row with tappable characters`);
  for (const b of await page.$$('.listen__done, .listen__model')) {
    const box = await b.boundingBox();
    if (!box || Math.min(box.width, box.height) < 43.5) problems.push(`${size.name} listen: a passage row button under 44px (${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'hidden'})`);
  }
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) problems.push(`${size.name} listen: the passage row makes the page scroll sideways`);
```

- [ ] **Step 3: The sweep**

In `scripts/fit-check.ts`'s `advance()`, before `if (tap(first('.sheet .btn'))) return true;` insert:

```ts
  if (document.querySelector('.langdu__listen[data-heard="false"]')) return true; // 朗读: the model is reading; 开始朗读 comes after
```

and line 428 becomes:

```ts
  await run('lesson', AFTERNOON, { langdu: true }, async (p) => { await startLesson(p); await walkLesson(p, size, 'lesson'); }); // every step in order, 朗读 too, then the chest
```

- [ ] **Step 4: Run the stage cases**

Run: `npx tsx scripts/stage-cases.ts`
Expected: `stage cases: ok`. Look at `fit-shots/stage-cases/langdu-*-ipad-landscape.png`, `langdu-*-iphone-se.png` and `listen-*.png`: the lit sentence, both compare buttons, the miss's sheet with its sentence, the passage row. A problem line is a layout to fix in `src/styles.css` (not in the check).

- [ ] **Step 5: Run the sweep**

Run: `npx vite build && FIT_ONLY='^(langdu|langdu-extra|lesson)$' npx tsx scripts/fit-check.ts`
Expected: no problems for `langdu`, `langdu-extra`, `lesson` at any size. Then run the whole sweep once: `npx tsx scripts/fit-check.ts` — no new problems.

- [ ] **Step 6: Full suite, types, build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: all tests pass (rerun a timed-out rendered file alone before treating it as a failure); no type errors; the build succeeds.

- [ ] **Step 7: Commit**

```bash
git add scripts/stage-cases/page.tsx scripts/stage-cases.ts scripts/fit-check.ts src/styles.css
git commit -m "test: WebKit stage cases for 朗读's parts and the passage review row; sweep walks 朗读 in the full lesson"
```

(`fit-shots/` is not committed.)
