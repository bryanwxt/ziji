import { CHAPTERS } from '../story/chapters';
import { lessonScene } from '../story/lessonScene';
import { PaintedBackdrop } from '../ui/story/PaintedBackdrop';
import { X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ComponentsStep } from '../activities/components/ComponentsStep';
import { buildZibianRound, lookAlikeChars, zibianCount, type ZibianItem } from '../activities/components/zibian';
import { ChooseStep } from '../activities/choose/ChooseStep';
import { WrapupStep } from '../activities/choose/WrapupStep';
import { planWrapup, wrapupTargets } from '../session/wrapup';
import { addDays, endOfLocalDay, startOfLocalDay } from '../lib/date';
import { FlashcardStep, introIdiom, type FlashResult } from '../activities/flashcards/FlashcardStep';
import { chooseCount, planChoose } from '../practice/choose';
import { fitItem, usageItem, type UseItem } from '../practice/useItems';
import { noteRecall } from '../session/recall';
import { LangduStep, type LangduResult } from '../activities/langdu/LangduStep';
import { StoryStep, type StoryResult } from '../activities/kantu/StoryStep';
import { afterStory, nextSpeaking, sceneFor } from '../kantu/flow';
import { hatchAfterLesson } from '../fun/finds';
import { STORY_PARTS, type Scene } from '../kantu/scenes';
import { recordingSupported, type FinishedRecording } from '../audio/recorder';
import { SayCard, type SayResult, type SaySkip } from '../activities/say/SayCard';
import { SentenceCard } from '../activities/say/SentenceCard';
import { recordSayTake, recordSentenceTake } from '../session/say';
import { afterRead, afterSkip, afterWarmup, readHow, warmupDue } from '../langdu/history';
import { pickPassage, swapTarget } from '../langdu/pick';
import { withQuestions } from '../langdu/questions';
import { readerAt } from '../langdu/level';
import { readingPool, type ReadingPassage } from '../langdu/pool';
import { newestByPassage, tidyPassageTakes } from '../langdu/review';
import { bonusOnRead } from '../langdu/stars';
import { burst } from '../ui/motion';
import { WritingStep, type WriteResult } from '../activities/writing/WritingStep';
import { playSfx } from '../audio/sfx';
import { prefetchWords } from '../audio/speech';
import { PASSAGES } from '../content';
import { CLOSEUP_EVERY, closeupAllowed, isHardWrite, restingMood } from '../fun/mood';
import { reducedMotion } from '../ui/motion';
import { localDateKey } from '../lib/date';
import { mulberry32 } from '../lib/random';
import { PracticeQuestion, type PracticeResult } from '../activities/practice/PracticeQuestion';
import { planFreePlay, planPractice } from '../session/practice';
import { idiomsFor, learnerLevel, type Idiom } from '../content/chengyu';
import { requestGreeting } from '../ui/truffle/greeting';
import { beginNewWord, bringForward, sentBackIds, recordMeaningOnce, recordRecall, recordRecognitionOnce, ratedToday, setLessonLists, lessonSlowLines, markTraced, markWriteSkipped, recordHear, recordMeaning, recordUnderstand, recordRecognition, recordUse, recordWriting, recordWrittenMeaning, startExtraLesson, startOrResumeSession, USE_READING_MS } from '../session/record';
import type { SlowLines } from '../srs/slow';
import { meaningCredit } from '../session/writeCredit';
import { writingCue } from '../activities/writing/cue';
import { settleLessonStars } from '../session/stars';
import { afterGuess, GUESS_NUDGE, isGuess } from '../session/guess';
import { starsOf } from '../stats/stats';
import {
  addActiveTime, afterFlashAnswer, afterPracticeAnswer, afterWriteWord, createFreePracticeRecord, currentFlashItem, currentPracticeItem, currentStep,
  currentWriteTask, finishStep, finishStepIf, introducedNewWords, sendBack, skipFlashItem, skipPracticeItem, skipSayItems, startPractice, wordMisses,
} from '../session/runner';
import { formOf, noteListAnswer, noteListPairAnswer } from '../weeklist/answers';
import { activeLists } from '../weeklist/plan';
import type { PracticeItem } from '../session/round';
import { addAnswer, allWeekLists, clearConfusion, getCard, getConfusions, getKid, getRungs, noteConfusion, keepRecording, getSettings, listParentPassages, listRecordings, noteRung, practisedWords, saveKid, saveSession, updateKid } from '../store/repo';
import { ladderWordsBesides } from '../content/ladder';
import { DEFAULT_KID, type KidState, type OralInfo, type ReadingHistory, type Recording, type SessionRecord, type StepKind, type Word } from '../types';
import { sessionProgress } from '../session/progress';
import { ProgressBar } from '../ui/ProgressBar';
import { useApp } from './AppContext';
import { logError } from './errorLog';
import { Celebration } from './Celebration';
import { loadKnowledge, type Knowledge } from './knowledge';
import { newId } from '../lib/id';
import { WorldScene } from '../ui/worlds/WorldScene';
import { currentWorld, timeOfDay } from '../fun/worlds';
import { InkIcon } from '../ui/icons/InkIcon';
import { PinyinFade } from '../ui/pinyinFade';

/** The words a meaning question picks its English choices from: his words and the ladder's 词语 (spec 2026-10-06 §3.2). */
const pools = new WeakMap<Knowledge, Word[]>();
function meaningPool(know: Knowledge): Word[] {
  let p = pools.get(know);
  if (!p) pools.set(know, (p = [...know.words, ...ladderWordsBesides(know.words)]));
  return p;
}

/** His level for the 成语 window (spec 2026-10-05 §4): the level of the next built-in word he hasn't started. */
const levels = new WeakMap<Knowledge, number>();
function levelOf(know: Knowledge): number {
  let l = levels.get(know);
  if (l === undefined) levels.set(know, (l = learnerLevel(know.words, new Set(know.cards.filter((c) => c.kind === 'recognise').map((c) => c.wordId)))));
  return l;
}

/** Today's 朗读: the passage, whether the warm-up runs (warmupDue), the lesson's date key, and for 下一篇 the pool, his reading
 *  history as the step knows it and the swaps made. */
interface LangduSpeaking { kind: 'langdu'; passage: ReadingPassage; oral: OralInfo; warmup: boolean; day: string; pool: ReadingPassage[]; reading: ReadingHistory; swaps: number }

interface Loaded {
  rec: SessionRecord;
  know: Knowledge;
  kid: KidState;
  round: ZibianItem[] | null; // 钓鱼 as 字辨 (spec §20 part 8)
  minutes: number;
  fadePinyin: boolean; // settings.fadePinyin as the lesson loaded (spec 2026-10-12 §4): absent = on
  choose: UseItem[] | null; // built when 选一选 starts, so it knows what he missed earlier in the lesson
  wrapup: UseItem[] | null; // built when 用一用 starts, from today's recalls
  speaking: LangduSpeaking | { kind: 'story'; scene: Scene } | null;
  confusions: Map<string, string[]>; // look-alikes he picked, per word (钓鱼, spec 2026-10-05 §3.4)
  slow: SlowLines; // his slow line per tap kind, worked out once as the lesson loads (SRS tuning spec §3.2)
  back: ReadonlySet<string>; // today's new words he missed on a placement recheck: taught again, so 「再认一次！」 (parent 2026-10-29)
}

export function SessionScreen({ free, extra = false }: { free: boolean; extra?: boolean }) {
  const { db, now, go, voice, settings: appSettings } = useApp();
  const painted = lessonScene(appSettings.storyProgress, CHAPTERS, appSettings.storyOn); // the chapter's place, over the old world (story on only)
  const [state, setState] = useState<Loaded | null>(null);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0); // this sitting only: Truffle warms up from sulk
  const [stepFraction, setStepFraction] = useState(0); // how far through 选一选/字辨/用一用 he is
  const [micRefused, setMicRefused] = useState(false); // a Say card found the microphone refused: 朗读 won't ask again (spec 2026-10-12 §3)
  const cardsSinceCloseup = useRef(CLOSEUP_EVERY);
  const stepStartedAt = useRef(performance.now());
  const busy = useRef(false);
  // The newest record, so an answer saved after a quick 继续 builds on what came after it, never on a stale copy.
  const latest = useRef<SessionRecord | null>(null);
  const latestStep = useRef(-1);
  const planning = useRef(false); // 练一练's round is being built (it reads his rungs)
  const guesses = useRef({ count: 0, nudged: false }); // right taps too fast to count this lesson (real test spec §6)
  // the weekly lists, read once for the lesson (final review 2026-10-17): every rating pins by them, and 练一练 notes only list words
  const listWordIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    let alive = true;
    void allWeekLists(db).then((lists) => {
      if (!alive) return;
      setLessonLists(lists);
      listWordIds.current = new Set(activeLists(lists, now()).flatMap((l) => l.items.map((i) => i.wordId)));
    });
    return () => { alive = false; setLessonLists(null); };
  }, []);

  useEffect(() => {
    void (async () => {
      const rng = mulberry32(Date.now() >>> 0);
      const [know, kid, parentPassages, settings, practised, confusions, slow] = await Promise.all([loadKnowledge(db), getKid(db), listParentPassages(db), getSettings(db), practisedWords(db), getConfusions(db), free ? Promise.resolve({}) : lessonSlowLines(db, now())]);
      const today = now();
      const rec = free
        ? createFreePracticeRecord(planFreePlay(know.cards, know.words, await getRungs(db), voice, rng, undefined, levelOf(know)), localDateKey(today), today.getTime())
        : extra ? await startExtraLesson(db, today) : await startOrResumeSession(db, today);
      // a lesson just begun: the first Truffle he sees waves and says hello (spec 2026-10-04 §4.6); never on coming back to it
      if (!free && rec.stepIndex === 0 && rec.activeMs === 0 && rec.flashIndex === 0 && !rec.practiceIndex && rec.plan.steps[0] === 'newwords' && rec.flashQueue.length > 0) requestGreeting('你好！我们开始吧！'); // it opens on a new word's card, never on a question (spec §4.3)
      // the lesson's clips (neural voice): fetched now, so they play at once and offline
      for (const w of ladderWordsBesides(know.words)) if (!know.wordsById.has(w.id)) know.wordsById.set(w.id, w); // the ladder's 词语 aren't stored
      const back = free ? new Set<string>() : await sentBackIds(db, rec.plan.newWordIds);
      const want = new Set([...rec.plan.newWordIds, ...rec.plan.reviewWordIds, ...(rec.plan.hearReviewIds ?? []), ...(rec.plan.understandReviewIds ?? []), ...(rec.plan.sayIds ?? [])]);
      prefetchWords([...want].map((id) => know.wordsById.get(id)).filter((w): w is Word => !!w));
      latest.current = rec;
      setState({
        rec,
        know,
        kid: kid ?? DEFAULT_KID,
        round: buildZibianRound({ words: know.words, knownChars: know.knownChars, practised, rng, count: zibianCount(settings.sessionMinutes) }),
        minutes: settings.sessionMinutes,
        fadePinyin: settings.fadePinyin !== false,
        choose: null,
        wrapup: null,
        confusions,
        slow,
        back,
        speaking: (() => {
          const k = kid ?? DEFAULT_KID;
          // 朗读 and 看图说话 only when switched back on (both parked, parent 2026-10-05). Nothing to run: the step is skipped, so a
          // lesson planned before 朗读 was parked passes its stop by
          // one date key for the whole step, the lesson's own: begun before midnight and finished after, it is still that day's
          const day = rec.date;
          const pool = settings.langdu ? readingPool(parentPassages, PASSAGES, readerAt(know.knownChars, today, settings)) : [];
          const passage = pickPassage(k.reading, pool, day);
          const kind = nextSpeaking(k.speakingLast, !!passage, settings.story);
          if (kind === 'langdu' && passage) return { kind: 'langdu' as const, passage: withQuestions(passage, k.reading), oral: settings.oral, warmup: warmupDue(k.reading, day), day, pool, reading: k.reading, swaps: 0 };
          return kind === 'story' ? { kind: 'story' as const, scene: sceneFor(k.story) } : null;
        })(),
      });
    })();
  }, []);

  const rec = state?.rec ?? null;
  const step = rec ? currentStep(rec) : null;
  const flashItem = rec ? currentFlashItem(rec) : null;
  const flashWord = flashItem ? state!.know.wordsById.get(flashItem.wordId) : undefined;
  const writeCandidate = rec ? currentWriteTask(rec) : null;
  const writeWord = writeCandidate ? state!.know.wordsById.get(writeCandidate.wordId) : undefined;
  const practiceItem = rec ? currentPracticeItem(rec) : null;
  const practiceWord = practiceItem ? state!.know.wordsById.get(practiceItem.wordId) : undefined;

  /** A finished lesson's stars; if they can't be settled it is still saved and celebrated, with a star at least (final review I3). */
  const settleOrFloor = async (step: SessionRecord): Promise<SessionRecord> => {
    try {
      return await settleLessonStars(db, step, now(), (id) => state?.know.wordsById.get(id));
    } catch (err) {
      logError(err);
      return { ...step, stars: Math.max(1, step.stars === undefined ? starsOf(step.completedSteps) : 0), produced: { write: 0, say: 0 }, closest: [] };
    }
  };

  const commit = async (step: SessionRecord) => {
    const was = latest.current;
    latest.current = step;
    // a finished lesson's stars are what he can newly produce (spec 2026-10-11 §5); an extra lesson's go to bonusStars, as before
    const next = !step.free && step.completed && !was?.completed ? await settleOrFloor(step) : step;
    latest.current = next;
    if (!next.free && !next.extra) await saveSession(db, next); // an extra lesson never replaces the day's record
    if (!next.free && !next.extra && next.completed && !was?.completed) {
      // a finished daily lesson hatches a dino egg he tapped in 恐龙谷
      const fresh = await getKid(db);
      if (fresh) {
        const finds = hatchAfterLesson(fresh.finds);
        if (finds !== fresh.finds) await saveKid(db, { ...fresh, finds });
      }
    }
    stepStartedAt.current = performance.now();
    if (next.stepIndex !== latestStep.current) {
      latestStep.current = next.stepIndex;
      setStepFraction(0);
    }
    setState((s) => (s ? { ...s, rec: next } : s));
  };

  // Anything that cannot run is skipped silently: an empty step, or a word paused/deleted since planning.
  useEffect(() => {
    if (!state || !rec) return;
    // build on the newest record: an answer saved late (after a quick 继续) must not be overwritten by a skip
    const cur = latest.current && latest.current.stepIndex === rec.stepIndex ? latest.current : rec;
    if ((step === 'flashcards' || step === 'newwords') && !flashItem) void commit(finishStep(cur));
    else if ((step === 'flashcards' || step === 'newwords') && (!flashWord || flashWord.paused)) void commit(skipFlashItem(cur));
    else if (step === 'writing' && !writeCandidate) void commit(finishStep(cur));
    else if (step === 'writing' && (!writeWord || writeWord.paused)) void commit(afterWriteWord(cur, false, 0));
    else if (step === 'components' && !state.round) void commit(finishStep(cur));
    else if (step === 'choose' && state.choose === null) {
      const missed = Object.entries(rec.recalls ?? {}).filter(([, r]) => r.missed).map(([id]) => id);
      const choose = planChoose({
        words: state.know.words, cards: [...state.know.cardsById.values()], newWordIds: introducedNewWords(rec), meaningDueIds: rec.plan.meaningReviewIds ?? [], // new words only once 认一认 has taught them
        missedIds: missed, knownChars: state.know.knownChars, rng: mulberry32(Date.now() >>> 0), count: chooseCount(state.minutes),
      });
      setState((s) => (s ? { ...s, choose } : s));
    } else if (step === 'choose' && !state.choose?.length) void commit(finishStep(cur));
    else if (step === 'wrapup' && state.wrapup === null) {
      const rng = mulberry32(Date.now() >>> 0);
      const { items, dropped } = planWrapup(wrapupTargets(rec), rec.recalls ?? {}, (id, n) => {
        const w = state.know.wordsById.get(id);
        if (!w || w.paused) return null;
        return n % 2 === 0 ? (usageItem(w.text, w.id) ?? fitItem(w, state.know.words, rng, 1)) : fitItem(w, state.know.words, rng, 0);
      });
      // words that missed their turn (more than 12 items) come back tomorrow
      if (!rec.free) for (const id of dropped) void bringForward(db, id, 'meaning', endOfLocalDay(now()));
      setState((s) => (s ? { ...s, wrapup: items } : s));
    } else if (step === 'wrapup' && !state.wrapup?.length) void commit(finishStep(cur));
    else if (step === 'practice' && !rec.practiceQueue) {
      if (!planning.current) {
        planning.current = true;
        void (async () => {
          // the look-alikes as they are now: a mix-up in today's 认新字 is fished today, not a lesson later (sweep)
          const confusions = await getConfusions(db);
          setState((st) => (st ? { ...st, confusions } : st));
          // Say cards only where the iPad can record (spec 2026-10-11 §7)
          const queue = planPractice(cur, await getRungs(db), state.know.wordsById, meaningPool(state.know), voice, mulberry32(Date.now() >>> 0), confusions, levelOf(state.know), recordingSupported(), state.know.knownChars);
          planning.current = false;
          await commit(startPractice(latest.current ?? cur, queue));
        })();
      }
    } else if (step === 'practice' && practiceItem && (!practiceWord || practiceWord.paused || cur.sentBack?.includes(practiceItem.wordId))) void commit(skipPracticeItem(cur));
    else if (step === 'speaking' && !state.speaking) void commit(finishStep(cur));
  }, [rec, state?.choose, state?.wrapup]);

  if (!state || !rec) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;
  if (rec.completed) return <Celebration rec={rec} />;
  const { know, kid } = state;
  const level = levelOf(know);
  const resting = restingMood(correct);

  /** Sent back to learn by a missed placement recheck in this lesson: nothing more of it is graded today (review M1). */
  const gone = (wordId: string) => !!(latest.current ?? rec)?.sentBack?.includes(wordId);
  /** A reading answer; true when it sent the word back to learn (spec 2026-10-14): its cards are gone, so the lesson forgets them too. */
  // once: 练一练's grade, never a second rating of the day (a list's reserved read item and the word's due item, final review 2026-10-17)
  const gradeReading = async (wordId: string, outcome: Parameters<typeof recordRecognition>[2], once = false): Promise<boolean> => {
    const card = once ? await recordRecognitionOnce(db, wordId, outcome, now()) : await recordRecognition(db, wordId, outcome, now());
    if (!card) return false;
    if (await getCard(db, card.id)) {
      state!.know.cardsById.set(card.id, card);
      return false;
    }
    for (const id of [...state!.know.cardsById.keys()]) if (id.startsWith(`${wordId}:`)) state!.know.cardsById.delete(id);
    return true;
  };

  const once = (fn: () => Promise<void>) => async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await fn();
    } finally {
      busy.current = false;
    }
  };

  /** Ends a timed step once: a second call (a double tap on the last 继续) finds it already over and does nothing. */
  const finishTimedStep = (expected: StepKind) =>
    once(async () => {
      const cur = latest.current ?? rec;
      if (currentStep(cur) !== expected) return;
      await commit(finishStepIf(addActiveTime(cur, Math.round(performance.now() - stepStartedAt.current)), expected));
    })();

  /** A wrong pick that is a look-alike of the character (it shares a part) is remembered for 钓鱼 (spec 2026-10-05 §3.4). */
  const rememberConfusion = async (wordId: string, picked: string | undefined) => {
    const w = know.wordsById.get(wordId);
    if (rec.free || !w || !picked || Array.from(w.text).length !== 1 || picked === w.text) return;
    if (lookAlikeChars(w.text).includes(picked)) await noteConfusion(db, wordId, picked, now());
  };

  const onFlashDone = (r: FlashResult) =>
    once(async () => {
      const item = flashItem!;
      let sent = false;
      // a weekly list word (weekly list spec §8.3, §2.1): every 认新字 answer counts toward its readiness; a re-teaching card is
      // asked but grades no card (it is a retry)
      const onList = !!item.reteach || !!rec.plan.listNewIds?.includes(item.wordId);
      // right after its card: an echo, never counted as learned (fix round 2026-10-17); a re-teaching card's right answer is noted
      if (onList && !rec.free && r.asked === 'read') await noteListAnswer(db, item.wordId, 'read', r.correct, now(), undefined, { echo: true, reteach: !!item.reteach });
      if (!item.retry && !rec.free && !gone(item.wordId)) {
        const outcome = { correct: r.correct, responseMs: r.responseMs, slow: state.slow };
        // a new word is graded only by ear (its reading opens when hearing passes); read with no voice, it grades nothing. A list
        // word begins on Read (weekly list spec §6.4)
        const fresh = item.isNew ? know.wordsById.get(item.wordId) : undefined;
        if (fresh) {
          // a word met today is begun whatever he could be asked (final review C1)
          const card = await beginNewWord(db, fresh, r.asked, outcome, now(), { list: onList });
          know.cardsById.set(card.id, card);
        } else if (r.asked === 'hear') know.cardsById.set(`${item.wordId}:hear`, await recordHear(db, item.wordId, outcome, now()));
        else if (r.asked === 'meaning') know.cardsById.set(`${item.wordId}:meaning`, await recordMeaning(db, item.wordId, outcome, now()));
        else sent = await gradeReading(item.wordId, outcome);
      }
      if (!r.correct) await rememberConfusion(item.wordId, r.picked);
      const ready = closeupAllowed(cardsSinceCloseup.current, reducedMotion());
      cardsSinceCloseup.current = r.correct && r.hard && ready ? 0 : cardsSinceCloseup.current + 1;
      if (r.correct) setCorrect((n) => n + 1);
      setCombo(r.correct ? combo + 1 : 0); // his hearts at three right in a row; no counter, no spoken 连对 (spec 2026-10-11 §5)
      const next = afterFlashAnswer(rec, r.correct, r.elapsedMs, r.inContext);
      await commit(sent ? sendBack(next, item.wordId) : next);
    })();

  /** A 练一练 answer (spec 2026-10-05 §3.5): grade the card the item grades (never a retry or free play), note his rung, move on. */
  const onPracticeDone = (r: PracticeResult | null) =>
    once(async () => {
      const item = practiceItem!;
      if (!r) {
        await commit(skipPracticeItem(latest.current ?? rec));
        return;
      }
      let sent = false;
      // a 默写 whose strokes couldn't load was asked as the question it replaced: that answer is a tap like any other
      const asked: PracticeItem = item.ask === 'recall' && item.recall && !r.recall ? { ...item, ask: item.recall.ask } : item;
      const guess = isGuess(asked, r); // too fast to have read it (real test spec §6): Hard, and no rung
      if (!rec.free && !item.retry && !gone(item.wordId)) {
        // a sentence takes reading time first: that doesn't make a right answer slow (as in 选一选)
        const outcome = { correct: r.correct, responseMs: r.asked === 'use' || r.inContext ? Math.max(0, r.responseMs - USE_READING_MS) : r.responseMs, slow: state.slow, guess };
        // a weekly list's read or meaning item grades his reading card when it is that card's first answer of the day (weekly list
        // spec §6.4, §8.2; a miss rates Again)
        const readCard = know.cardsById.get(`${item.wordId}:recognise`);
        const grades = item.grades ?? (item.list && (item.list.form === 'read' || item.list.form === 'meaning') && readCard && !ratedToday(readCard, now()) ? 'recognise' : null);
        if (item.recall && r.recall) {
          // a 默写 (real test spec 2026-10-23 §4): the character's write card, the word's due reading card, and its due meaning card
          // when the cue was a 组词
          const w = know.wordsById.get(item.wordId);
          const meaning = (rec.plan.meaningReviewIds ?? []).includes(item.wordId) && !!w && writingCue(w, item.recall.at).blanked !== null;
          for (const c of await recordRecall(db, { wordId: item.wordId, writeId: item.recall.writeId, reading: item.grades === 'recognise', meaning }, r.recall, now())) know.cardsById.set(c.id, c);
        } else if (item.grades === 'understand' && r.asked === 'understand') know.cardsById.set(`${item.wordId}:understand`, await recordUnderstand(db, item.wordId, { correct: r.correct, responseMs: r.responseMs, slow: state.slow, guess }, now()));
        else if (item.grades === 'hear' && r.asked === 'hear') know.cardsById.set(`${item.wordId}:hear`, await recordHear(db, item.wordId, outcome, now()));
        else if (grades === 'recognise') sent = await gradeReading(item.wordId, outcome, true);
        else if (item.grades === 'meaning' && r.asked === 'meaning') { const c = await recordMeaningOnce(db, item.wordId, outcome, now()); if (c) know.cardsById.set(c.id, c); }
        else if (item.grades === 'use' && r.asked === 'use') know.cardsById.set(`${item.wordId}:meaning`, await recordUse(db, item.wordId, r.correct, now(), r.responseMs, state.slow, guess));
        if (r.asked === 'use') await addAnswer(db, { at: now().getTime(), wordId: item.wordId, skill: 'use', correct: r.correct }); // every sentence answer, for the Skills panel
        // a listening answer isn't reading progress (plan 2b); a weekly list's extra item isn't a ladder rung; a guess doesn't climb;
        // nor does a 默写 written (real test spec §8: it doesn't climb the ladder itself) — one that fell back to a tap does
        if (asked.ask !== 'fish' && asked.ask !== 'understand' && !item.list && !guess && !r.recall) await noteRung(db, item.wordId, item.rung, r.correct, now());
        if (r.asked === 'zibian') {
          await addAnswer(db, { at: now().getTime(), wordId: item.wordId, skill: 'zibian', correct: r.correct });
          if (r.correct) await clearConfusion(db, item.wordId);
          else await bringForward(db, item.wordId, know.cardsById.has(`${item.wordId}:write`) ? 'write' : 'recognise', now());
        }
        await noteListPractice(asked, r, guess);
      }
      // the second guess of the lesson: the next Truffle says 「慢慢看，想好再点」, once (no penalty, no timer shown)
      const g = afterGuess(guesses.current, guess);
      guesses.current = { count: g.count, nudged: g.nudged };
      if (g.nudge) requestGreeting(GUESS_NUDGE);
      if (!r.correct) await rememberConfusion(item.wordId, r.picked);
      const ready = closeupAllowed(cardsSinceCloseup.current, reducedMotion());
      cardsSinceCloseup.current = r.correct && r.hard && ready ? 0 : cardsSinceCloseup.current + 1;
      if (r.correct) setCorrect((n) => n + 1);
      setCombo(r.correct ? combo + 1 : 0);
      const next = afterPracticeAnswer(latest.current ?? rec, r.correct, r.elapsedMs, r.inContext, r.idiom, item.ask === 'recall' && !r.recall); // a 默写 answered as its tap: a miss comes back as that tap
      await commit(sent ? sendBack(next, item.wordId) : next);
    })();

  /**
   * A 练一练 answer on a weekly list word (weekly list spec 2026-10-17 §7.5, §8.2, §8.3): every answer on a list word counts toward
   * its readiness, a 搭配 or board pair by pair. A list item grades no card itself: its 选词填空 or 搭配 rates the word's meaning
   * card when that is its first answer of the day (recordUse; only a meaning card he already has, so no rung opens early), and a
   * miss brings the card forward to the start of tomorrow.
   */
  const noteListPractice = async (item: PracticeItem, r: PracticeResult, guess = false) => {
    if (!item.list && listWordIds.current && !listWordIds.current.has(item.wordId)) return; // not a list word: nothing to note
    const tomorrow = startOfLocalDay(addDays(now(), 1));
    // the day it was met or re-taught, an answer is an echo of its card (fix round 2026-10-17)
    const echo = new Set([...(rec.plan.reteachIds ?? []), ...rec.plan.newWordIds]);
    const rateUse = async (wordId: string, correct: boolean) => {
      if (!rec.extra && know.cardsById.has(`${wordId}:meaning`)) know.cardsById.set(`${wordId}:meaning`, await recordUse(db, wordId, correct, now(), r.responseMs, state.slow, guess));
      if (!correct) await bringForward(db, wordId, 'meaning', tomorrow);
    };
    if (item.list && r.listPairs?.length) {
      for (const p of r.listPairs) {
        const left = await noteListPairAnswer(db, item.list.listId, p, p.correct, now(), { echo });
        if (left) await rateUse(left, p.correct);
      }
      return;
    }
    const form = item.list?.form ?? formOf(item.ask);
    if (!form) return;
    await noteListAnswer(db, item.wordId, form, r.correct, now(), undefined, { echo });
    if (!item.list) return;
    if (form === 'fit') await rateUse(item.wordId, r.correct);
    else if (!r.correct) await bringForward(db, item.wordId, form === 'read' ? 'recognise' : 'meaning', tomorrow);
  };

  /** A Say card (spec 2026-10-11 §3) or a 说一句 (production practice spec §4): keep the take for the parent and schedule its card; a refused microphone (after its note) drops the lesson's Say and 说一句 cards (§7). */
  const onSayDone = (r: SayResult | SaySkip) =>
    once(async () => {
      const item = practiceItem!;
      if (r === 'skip') {
        // the mic failed twice for a passing reason and he went on: this card only, ungraded; nothing is refused (mic fix 2026-10-14)
        await commit(skipPracticeItem(latest.current ?? rec));
        return;
      }
      if (!r) {
        setMicRefused(true);
        await commit(skipSayItems(latest.current ?? rec));
        return;
      }
      if (!rec.free && !gone(item.wordId)) {
        try {
          const card = await (item.ask === 'sentence' ? recordSentenceTake : recordSayTake)(db, item.wordId, r.take, now());
          know.cardsById.set(card.id, card);
        } catch (err) {
          // the take couldn't be kept (a full disk, a failed put): never leave him stuck on this card — the lesson's Say cards
          // go, as for a blocked microphone, and 练一练 carries on with taps (final review I1)
          logError(err);
          await commit(skipSayItems(latest.current ?? rec));
          return;
        }
      }
      await commit(afterPracticeAnswer(latest.current ?? rec, true, r.elapsedMs));
    })();

  const onWriteDone = (r: WriteResult | null) =>
    once(async () => {
      const task = writeCandidate!;
      // only the recall pass rates the word (spec §20 part 3); a redo at the end is extra practice. Written a character at a time
      // (spec 2026-10-05 §5), the word is rated once, on the character that finishes it, with all its misses from memory.
      const rates = !task.readOnly && (task.at === undefined ? true : !!task.last); // a traced read-only character never rates a write card
      const off = gone(task.wordId); // sent back to learn this lesson: traced, never graded (no fresh card)
      if (r && !rec.free && !off && task.pass === 'recall' && !task.redo && rates) await recordWriting(db, task.wordId, wordMisses(rec, task.wordId) + r.totalMisses, now());
      if (!r) await markWriteSkipped(db, task.wordId, now()); // any word whose strokes failed goes behind the others next time (sweep)
      // the 组词 he wrote rates its meaning card, once a lesson (production practice spec §3)
      const useOpen = know.cardsById.has(`${task.wordId}:meaning`) || (rec.plan.newMeaningIds ?? []).includes(task.wordId);
      const credit = r && writeWord ? meaningCredit(rec, task, r, writeWord, useOpen) : null;
      if (credit !== null && !off) know.cardsById.set(`${task.wordId}:meaning`, await recordWrittenMeaning(db, task.wordId, credit, now()));
      if (r && !rec.free && !off && task.readOnly) await markTraced(db, task.wordId, now());
      // a new word written from memory with no misses showed the close-up if one was due: start the cooldown again
      if (r && task.pass === 'recall' && isHardWrite(task.isNew, r.totalMisses) && closeupAllowed(cardsSinceCloseup.current, reducedMotion())) cardsSinceCloseup.current = 0;
      await commit(afterWriteWord(rec, r !== null, r?.elapsedMs ?? 0, { hinted: r?.hinted, misses: r?.totalMisses, credited: credit !== null }));
    })();

  /** A word used in context (选一选): rate its meaning once a day, and count the recall for 用一用 (spec §20 part 7). */
  const onUseAnswer = async (item: UseItem, correct: boolean, responseMs = 0) => {
    if (!item.wordId) return; // a bank word, not one of his own: practice only
    if (!rec.free && !gone(item.wordId)) {
      know.cardsById.set(`${item.wordId}:meaning`, await recordUse(db, item.wordId, correct, now(), responseMs, state.slow));
      await addAnswer(db, { at: now().getTime(), wordId: item.wordId, skill: 'use', correct }); // every answer, for the Skills panel
    }
    if (correct) setCorrect((n) => n + 1);
    const cur = latest.current ?? rec; // he may have tapped 继续 (even ended the step) while this answer was saving
    // each answer commits, which restarts the step clock, so the time so far is added here
    await commit(addActiveTime({ ...cur, recalls: noteRecall(cur.recalls, item.wordId, correct, true) }, Math.round(performance.now() - stepStartedAt.current)));
  };

  /** 字辨: a miss brings the word's write card forward (its reading card if it has none), and counts for 用一用 (spec §20 part 8). */
  const onZibianAnswer = async (item: ZibianItem, correct: boolean) => {
    if (!rec.free) await addAnswer(db, { at: now().getTime(), wordId: item.wordId, skill: 'zibian', correct });
    if (!correct && !rec.free) await bringForward(db, item.wordId, know.cardsById.has(`${item.wordId}:write`) ? 'write' : 'recognise', now());
    if (correct) setCorrect((n) => n + 1);
    const cur = latest.current ?? rec;
    await commit(addActiveTime({ ...cur, recalls: noteRecall(cur.recalls, item.wordId, correct, false) }, Math.round(performance.now() - stepStartedAt.current)));
  };

  /** 用一用: a word still wrong after 3 tries closes kindly; its meaning comes back tomorrow (spec §20 part 7). */
  const onGiveUp = (item: UseItem) => {
    if (item.wordId && !rec.free) void bringForward(db, item.wordId, 'meaning', endOfLocalDay(now()));
  };

  /** Save each part, the whole telling and the answers (grouped by time for the parent), count the story, and pass the turn to 朗读. */
  const onStoryDone = (r: StoryResult) =>
    once(async () => {
      const { scene } = state.speaking as { kind: 'story'; scene: Scene };
      const base = now().getTime();
      let n = 0;
      const save = async (prompt: Recording['prompt'], f: FinishedRecording | null | undefined) => {
        if (f) await keepRecording(db, { id: newId(), createdAt: base + n++, prompt, ...f });
      };
      for (const p of STORY_PARTS) await save({ kind: 'story', sceneId: scene.id, part: p.part }, r.parts[p.part]);
      await save({ kind: 'story', sceneId: scene.id, part: 'whole' }, r.whole);
      for (const [i, a] of r.answers.entries()) await save({ kind: 'answer', sceneId: scene.id, question: i }, a);
      const fresh = (await getKid(db)) ?? kid;
      await saveKid(db, { ...fresh, story: afterStory(fresh.story), speakingLast: 'story' });
      await commit(finishStep(addActiveTime(rec, Math.round(performance.now() - stepStartedAt.current))));
    })();

  /**
   * Save the warm-up and the kept read (with his answer), count the read in his history — recorded or not (spec 2026-10-15 §1
   * cause 4) — tidy old passage takes, and give a bonus star for beating the last lesson read. Whatever fails on the way, the lesson goes on to its end (final review I4): no bonus at worst.
   */
  /**
   * 下一篇 (spec 2026-10-15 §5): the passage is skipped today (saved at once) and the next in the order comes in. The swaps made
   * are counted in memory only: a reload re-picks with the saved skips and starts the step with two swaps again.
   */
  const onLangduSwap = () => {
    const s = state?.speaking;
    if (s?.kind !== 'langdu' || !swapTarget(s.reading, s.pool, s.passage, s.day, s.swaps)) return;
    setState((prev) => {
      const cur = prev?.speaking;
      if (!prev || cur?.kind !== 'langdu' || cur.passage.id !== s.passage.id) return prev; // already swapped
      const next = swapTarget(cur.reading, cur.pool, cur.passage, cur.day, cur.swaps);
      if (!next) return prev;
      const reading = afterSkip(cur.reading, cur.passage.id, cur.day);
      return { ...prev, speaking: { ...cur, passage: withQuestions(next, reading), reading, swaps: cur.swaps + 1 } };
    });
    void updateKid(db, (k) => ({ ...k, reading: afterSkip(k.reading, s.passage.id, s.day) })).catch(logError);
  };

  const onLangduDone = (r: LangduResult) =>
    once(async () => {
      const reading = state.speaking as LangduSpeaking;
      const at = now();
      if (r.intro) await keepRecording(db, { id: newId(), createdAt: at.getTime(), prompt: { kind: 'intro' }, ...r.intro });
      let bonus = false;
      let misreadsBefore: number | undefined;
      if (r.read) {
        try {
          // the passage's last lesson take: a 多读一遍 take is never the baseline (final review I6). Accuracy, never speed
          // (learning rules 2026-10-17): a complete re-read earns it now, or at review when the last take was reviewed
          const prev = newestByPassage(await listRecordings(db)).get(reading.passage.id);
          ({ now: bonus, misreadsBefore } = bonusOnRead(prev, r.read, reading.passage.text));
        } catch (err) {
          logError(err); // his takes couldn't be read: no bonus this time
        }
        await keepRecording(db, { id: newId(), createdAt: at.getTime(), prompt: { kind: 'passage', passageId: reading.passage.id }, ...r.read, ...(r.answers.length ? { answers: r.answers } : {}), ...(misreadsBefore !== undefined ? { misreadsBefore } : {}) });
        try {
          await tidyPassageTakes(db, at);
        } catch (err) {
          logError(err); // a failed tidy never stops the lesson
        }
      }
      try {
        // every read counts, a take or none: an unrecorded 读完了 moves the passage on too (spec 2026-10-15 §1 cause 4); applied to
        // his state as stored, in one transaction, so a change saved meanwhile (a find, a star) is kept
        // 'well' at 2 of 3 (spec 2026-10-24 §5); a built-in's answers are kept by kind for the parent (§8)
        const how = readHow({ extra: false, answers: r.answers });
        const kinded = r.answers.flatMap((a) => (a.kind ? [{ kind: a.kind, correct: a.correct }] : []));
        const change = (fresh: KidState): KidState => {
          const read = afterRead(fresh.reading, reading.passage.id, reading.day, how, { set: reading.passage.askedSet ?? [], answers: kinded });
          return { ...fresh, reading: reading.warmup ? afterWarmup(read, reading.day, !!r.intro) : read, speakingLast: 'langdu', bonusStars: fresh.bonusStars + (bonus ? 1 : 0) };
        };
        if (!(await updateKid(db, change))) await saveKid(db, change(kid)); // nothing stored yet: start from the lesson's copy
      } catch (err) {
        logError(err); // his state couldn't be saved: the lesson still ends, with no bonus
        bonus = false;
      }
      if (bonus) {
        playSfx('star');
        burst(window.innerWidth / 2, window.innerHeight / 2, { count: 18 });
      }
      await commit(finishStep(addActiveTime(rec, Math.round(performance.now() - stepStartedAt.current))));
    })();

  return (
    <PinyinFade known={know.knownChars} readings={know.knownReadings} on={state.fadePinyin}>
    <div class="screen">
      <WorldScene world={currentWorld(kid)} time={timeOfDay(now())} />
      {painted && <PaintedBackdrop scene={painted} />}
      <header class="lessonbar">
        <button type="button" class="icon-btn" aria-label="回家" onClick={() => go({ name: 'home' })}>
          <X size={34} strokeWidth={3} />
        </button>
        <ProgressBar steps={rec.plan.steps} stepIndex={rec.stepIndex} fraction={sessionProgress(rec, stepFraction)} />
      </header>

      {(step === 'flashcards' || step === 'newwords') && flashItem && flashWord && !flashWord.paused && (
        <FlashcardStep
          key={rec.flashIndex}
          item={flashItem}
          // a new word is first heard: he picks its meaning (spec 2026-10-06 §3.2); a weekly list word begins on Read (weekly list spec §6.4)
          ask={step === 'newwords' ? (flashItem.reteach || rec.plan.listNewIds?.includes(flashWord.id) ? 'read' : 'hear') : undefined}
          list={rec.plan.listCards?.[flashWord.id]}
          back={flashItem.isNew && state.back.has(flashWord.id)}
          reintroOnMiss={step === 'newwords'}
          idiom={step === 'newwords' ? introIdiom(flashWord, idiomsFor(flashWord, level, know.words)) : null}
          word={flashWord}
          pool={meaningPool(know)}
          card={know.cardsById.get(`${flashWord.id}:recognise`)}
          voice={voice}
          kid={kid}
          resting={resting}
          combo={combo}
          closeupReady={closeupAllowed(cardsSinceCloseup.current, reducedMotion())}
          onDone={(r) => void onFlashDone(r)}
        />
      )}
      {step === 'practice' && practiceItem?.ask === 'say' && practiceWord && !practiceWord.paused && (
        <SayCard key={`p${rec.practiceIndex}`} word={practiceWord} kid={kid} onDone={(r) => void onSayDone(r)} />
      )}
      {step === 'practice' && practiceItem?.ask === 'sentence' && practiceWord && !practiceWord.paused && (
        <SentenceCard key={`p${rec.practiceIndex}`} word={practiceWord} kid={kid} onDone={(r) => void onSayDone(r)} />
      )}
      {step === 'practice' && practiceItem && practiceItem.ask !== 'say' && practiceItem.ask !== 'sentence' && practiceWord && !practiceWord.paused && (
        <PracticeQuestion
          key={`p${rec.practiceIndex}`}
          item={practiceItem}
          word={practiceWord}
          pool={meaningPool(know)}
          card={know.cardsById.get(`${practiceWord.id}:recognise`)}
          voice={voice}
          kid={kid}
          resting={resting}
          combo={combo}
          closeupReady={closeupAllowed(cardsSinceCloseup.current, reducedMotion())}
          confused={state.confusions.get(practiceWord.id)}
          knownChars={know.knownChars}
          level={level}
          listCard={rec.plan.listCards?.[practiceWord.id]}
          begun={know.begunTexts}
          newToday={rec.plan.newWordIds.includes(practiceWord.id)}
          onDone={(r) => void onPracticeDone(r)}
        />
      )}
      {step === 'writing' && writeWord && !writeWord.paused && (
        <WritingStep
          key={`${rec.writeIndex}-${rec.writePass ?? 0}-${rec.writeRedoIndex ?? 0}`}
          word={writeWord}
          kid={kid}
          isNew={!!writeCandidate?.isNew}
          pass={writeCandidate!.pass}
          at={writeCandidate!.at}
          closeupReady={closeupAllowed(cardsSinceCloseup.current, reducedMotion())}
          onDone={(r) => void onWriteDone(r)}
        />
      )}
      {step === 'choose' && state.choose && state.choose.length > 0 && (
        <ChooseStep key="choose" items={state.choose} kid={kid} onAnswer={(item, c, ms) => void onUseAnswer(item, c, ms)} onDone={() => void finishTimedStep('choose')} onProgress={setStepFraction} />
      )}
      {step === 'wrapup' && state.wrapup && state.wrapup.length > 0 && (
        <WrapupStep
          key="wrapup"
          items={state.wrapup}
          kid={kid}
          onAnswer={(item, c, ms) => void onUseAnswer(item, c, ms)}
          onGiveUp={onGiveUp}
          onDone={() => void finishTimedStep('wrapup')}
          onProgress={setStepFraction}
          makeRetry={(item) => {
            // the other way of asking: a fit sentence after 用对了吗, and the other sentence after a fit
            const w = item.wordId ? know.wordsById.get(item.wordId) : undefined;
            if (!w) return null;
            const rng = mulberry32(Date.now() >>> 0);
            return item.kind === 'usage' ? fitItem(w, know.words, rng, 0) : (usageItem(w.text, w.id) ?? fitItem(w, know.words, rng, 1));
          }}
        />
      )}
      {step === 'components' && state.round && (
        <ComponentsStep key="components" items={state.round} kid={kid} onAnswer={(item, c) => void onZibianAnswer(item, c)} onDone={() => void finishTimedStep('components')} onProgress={setStepFraction} />
      )}
      {step === 'speaking' && state.speaking?.kind === 'langdu' && (
        <LangduStep passage={state.speaking.passage} oral={state.speaking.oral} kid={kid} withWarmup={state.speaking.warmup} micBlocked={micRefused} onSwap={swapTarget(state.speaking.reading, state.speaking.pool, state.speaking.passage, state.speaking.day, state.speaking.swaps) ? onLangduSwap : undefined} onDone={(r) => void onLangduDone(r)} />
      )}
      {step === 'speaking' && state.speaking?.kind === 'story' && (
        <StoryStep scene={state.speaking.scene} told={kid.story.told} kid={kid} onDone={(r) => void onStoryDone(r)} />
      )}
    </div>
    </PinyinFade>
  );
}
