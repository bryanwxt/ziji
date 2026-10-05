import { Flame, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ComponentsStep } from '../activities/components/ComponentsStep';
import { buildZibianRound, lookAlikeChars, zibianCount, type ZibianItem } from '../activities/components/zibian';
import { ChooseStep } from '../activities/choose/ChooseStep';
import { WrapupStep } from '../activities/choose/WrapupStep';
import { planWrapup, wrapupTargets } from '../session/wrapup';
import { endOfLocalDay } from '../lib/date';
import { FlashcardStep, introIdiom, type FlashResult } from '../activities/flashcards/FlashcardStep';
import { chooseCount, planChoose } from '../practice/choose';
import { fitItem, usageItem, type UseItem } from '../practice/useItems';
import { noteRecall } from '../session/recall';
import { LangduStep, type LangduResult } from '../activities/langdu/LangduStep';
import { StoryStep, type StoryResult } from '../activities/kantu/StoryStep';
import { afterStory, nextSpeaking, sceneFor } from '../kantu/flow';
import { hatchAfterLesson } from '../fun/finds';
import { STORY_PARTS, type Scene } from '../kantu/scenes';
import type { FinishedRecording } from '../audio/recorder';
import { pickPassage, readingPool, finishDay, type ReadingPassage } from '../langdu/cycle';
import { earnsBonus } from '../langdu/stars';
import { burst } from '../ui/motion';
import { WritingStep, type WriteResult } from '../activities/writing/WritingStep';
import { playSfx } from '../audio/sfx';
import { PASSAGES } from '../content';
import { CLOSEUP_EVERY, closeupAllowed, isHardWrite, restingMood } from '../fun/mood';
import { comboMilestone, comboPraise } from '../fun/pet';
import { reducedMotion } from '../ui/motion';
import { localDateKey } from '../lib/date';
import { mulberry32 } from '../lib/random';
import { PracticeQuestion, type PracticeResult } from '../activities/practice/PracticeQuestion';
import { planFreePlay, planPractice } from '../session/practice';
import { idiomsFor, learnerLevel } from '../content/chengyu';
import { cheer, requestGreeting } from '../ui/truffle/greeting';

/** His level for the 成语 window (spec 2026-10-05 §4): the level of the next built-in word he hasn't started. */
const levels = new WeakMap<Knowledge, number>();
function levelOf(know: Knowledge): number {
  let l = levels.get(know);
  if (l === undefined) levels.set(know, (l = learnerLevel(know.words, new Set(know.cards.filter((c) => c.kind === 'recognise').map((c) => c.wordId)))));
  return l;
}
import { bringForward, markWriteSkipped, recordMeaning, recordRecognition, recordUse, recordWriting, startExtraLesson, startOrResumeSession, USE_READING_MS } from '../session/record';
import { starsOf } from '../stats/stats';
import {
  addActiveTime, afterFlashAnswer, afterPracticeAnswer, afterWriteWord, createFreePracticeRecord, currentFlashItem, currentPracticeItem, currentStep,
  currentWriteTask, finishStep, finishStepIf, introducedNewWords, skipFlashItem, skipPracticeItem, startPractice, wordMisses,
} from '../session/runner';
import { addAnswer, clearConfusion, getConfusions, getKid, getRungs, noteConfusion, keepRecording, getSettings, listParentPassages, listRecordings, noteRung, practisedWords, saveKid, saveSession } from '../store/repo';
import { DEFAULT_KID, type KidState, type OralInfo, type Recording, type SessionRecord, type StepKind } from '../types';
import { sessionProgress } from '../session/progress';
import { ProgressBar } from '../ui/ProgressBar';
import { useApp } from './AppContext';
import { Celebration } from './Celebration';
import { loadKnowledge, type Knowledge } from './knowledge';
import { newId } from '../lib/id';
import { WorldScene } from '../ui/worlds/WorldScene';
import { currentWorld, timeOfDay } from '../fun/worlds';
import { InkIcon } from '../ui/icons/InkIcon';


interface Loaded {
  rec: SessionRecord;
  know: Knowledge;
  kid: KidState;
  round: ZibianItem[] | null; // 钓鱼 as 字辨 (spec §20 part 8)
  minutes: number;
  choose: UseItem[] | null; // built when 选一选 starts, so it knows what he missed earlier in the lesson
  wrapup: UseItem[] | null; // built when 用一用 starts, from today's recalls
  speaking: { kind: 'langdu'; passage: ReadingPassage; oral: OralInfo } | { kind: 'story'; scene: Scene } | null;
  confusions: Map<string, string[]>; // look-alikes he picked, per word (钓鱼, spec 2026-10-05 §3.4)
}

export function SessionScreen({ free, extra = false }: { free: boolean; extra?: boolean }) {
  const { db, now, go, voice } = useApp();
  const [state, setState] = useState<Loaded | null>(null);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0); // this sitting only: Truffle warms up from sulk
  const [stepFraction, setStepFraction] = useState(0); // how far through 选一选/字辨/用一用 he is
  const cardsSinceCloseup = useRef(CLOSEUP_EVERY);
  const stepStartedAt = useRef(performance.now());
  const busy = useRef(false);
  // The newest record, so an answer saved after a quick 继续 builds on what came after it, never on a stale copy.
  const latest = useRef<SessionRecord | null>(null);
  const latestStep = useRef(-1);
  const planning = useRef(false); // 练一练's round is being built (it reads his rungs)

  useEffect(() => {
    void (async () => {
      const rng = mulberry32(Date.now() >>> 0);
      const [know, kid, parentPassages, settings, practised, confusions] = await Promise.all([loadKnowledge(db), getKid(db), listParentPassages(db), getSettings(db), practisedWords(db), getConfusions(db)]);
      const today = now();
      const rec = free
        ? createFreePracticeRecord(planFreePlay(know.cards, know.words, await getRungs(db), voice, rng, undefined, levelOf(know)), localDateKey(today), today.getTime())
        : extra ? await startExtraLesson(db, today) : await startOrResumeSession(db, today);
      // a lesson just begun: the first Truffle he sees waves and says hello (spec 2026-10-04 §4.6); never on coming back to it
      if (!free && rec.stepIndex === 0 && rec.activeMs === 0 && rec.flashIndex === 0 && !rec.practiceIndex && rec.plan.steps[0] === 'newwords' && rec.flashQueue.length > 0) requestGreeting('你好！我们开始吧！'); // it opens on a new word's card, never on a question (spec §4.3)
      latest.current = rec;
      setState({
        rec,
        know,
        kid: kid ?? DEFAULT_KID,
        round: buildZibianRound({ words: know.words, knownChars: know.knownChars, practised, rng, count: zibianCount(settings.sessionMinutes) }),
        minutes: settings.sessionMinutes,
        choose: null,
        wrapup: null,
        confusions,
        speaking: (() => {
          const k = kid ?? DEFAULT_KID;
          // 朗读 and 看图说话 only when switched back on (both parked, parent 2026-10-05). Nothing to run: the step is skipped, so a
          // lesson planned before 朗读 was parked passes its stop by
          const passage = settings.langdu ? pickPassage(k.reading, readingPool(parentPassages, PASSAGES, know.knownChars), localDateKey(today)) : null;
          const kind = nextSpeaking(k.speakingLast, !!passage, settings.story);
          if (kind === 'langdu' && passage) return { kind: 'langdu' as const, passage, oral: settings.oral };
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

  const commit = async (next: SessionRecord) => {
    const was = latest.current;
    latest.current = next;
    if (!next.free && !next.extra) await saveSession(db, next); // an extra lesson never replaces the day's record
    if (next.extra && next.completed && !was?.completed) {
      // its stars count on top of the day's (they aren't in a saved day): the celebration then shows them landing
      const fresh = await getKid(db);
      if (fresh) await saveKid(db, { ...fresh, bonusStars: fresh.bonusStars + starsOf(next.completedSteps) });
    }
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
          const queue = planPractice(cur, await getRungs(db), state.know.wordsById, state.know.words, voice, mulberry32(Date.now() >>> 0), confusions, levelOf(state.know));
          planning.current = false;
          await commit(startPractice(latest.current ?? cur, queue));
        })();
      }
    } else if (step === 'practice' && practiceItem && (!practiceWord || practiceWord.paused)) void commit(skipPracticeItem(cur));
    else if (step === 'speaking' && !state.speaking) void commit(finishStep(cur));
  }, [rec, state?.choose, state?.wrapup]);

  if (!state || !rec) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;
  if (rec.completed) return <Celebration rec={rec} />;
  const { know, kid } = state;
  const level = levelOf(know);
  const resting = restingMood(correct);

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
      if (!item.retry && !rec.free) {
        const outcome = { correct: r.correct, responseMs: r.responseMs };
        const card = r.asked === 'meaning' ? await recordMeaning(db, item.wordId, outcome, now()) : await recordRecognition(db, item.wordId, outcome, now());
        know.cardsById.set(card.id, card);
      }
      if (!r.correct) await rememberConfusion(item.wordId, r.picked);
      const ready = closeupAllowed(cardsSinceCloseup.current, reducedMotion());
      cardsSinceCloseup.current = r.correct && r.hard && ready ? 0 : cardsSinceCloseup.current + 1;
      if (r.correct) setCorrect((n) => n + 1);
      const nextCombo = r.correct ? combo + 1 : 0;
      setCombo(nextCombo);
      if (comboMilestone(nextCombo)) {
        playSfx('combo');
        cheer(comboPraise(nextCombo)); // Truffle praises him (parent, 2026-10-05: not a reddish banner)
      }
      await commit(afterFlashAnswer(rec, r.correct, r.elapsedMs, r.inContext));
    })();

  /** A 练一练 answer (spec 2026-10-05 §3.5): grade the card the item grades (never a retry or free play), note his rung, move on. */
  const onPracticeDone = (r: PracticeResult | null) =>
    once(async () => {
      const item = practiceItem!;
      if (!r) {
        await commit(skipPracticeItem(latest.current ?? rec));
        return;
      }
      if (!rec.free && !item.retry) {
        // a sentence takes reading time first: that doesn't make a right answer slow (as in 选一选)
        const outcome = { correct: r.correct, responseMs: r.asked === 'use' || r.inContext ? Math.max(0, r.responseMs - USE_READING_MS) : r.responseMs };
        if (item.grades === 'recognise') know.cardsById.set(`${item.wordId}:recognise`, await recordRecognition(db, item.wordId, outcome, now()));
        else if (item.grades === 'meaning' && r.asked === 'meaning') know.cardsById.set(`${item.wordId}:meaning`, await recordMeaning(db, item.wordId, outcome, now()));
        else if (item.grades === 'use' && r.asked === 'use') know.cardsById.set(`${item.wordId}:meaning`, await recordUse(db, item.wordId, r.correct, now(), r.responseMs));
        if (r.asked === 'use') await addAnswer(db, { at: now().getTime(), wordId: item.wordId, skill: 'use', correct: r.correct }); // every sentence answer, for the Skills panel
        if (item.ask !== 'fish') await noteRung(db, item.wordId, item.rung, r.correct, now());
        if (r.asked === 'zibian') {
          await addAnswer(db, { at: now().getTime(), wordId: item.wordId, skill: 'zibian', correct: r.correct });
          if (r.correct) await clearConfusion(db, item.wordId);
          else await bringForward(db, item.wordId, know.cardsById.has(`${item.wordId}:write`) ? 'write' : 'recognise', now());
        }
      }
      if (!r.correct) await rememberConfusion(item.wordId, r.picked);
      const ready = closeupAllowed(cardsSinceCloseup.current, reducedMotion());
      cardsSinceCloseup.current = r.correct && r.hard && ready ? 0 : cardsSinceCloseup.current + 1;
      if (r.correct) setCorrect((n) => n + 1);
      const nextCombo = r.correct ? combo + 1 : 0;
      setCombo(nextCombo);
      if (comboMilestone(nextCombo)) {
        playSfx('combo');
        cheer(comboPraise(nextCombo)); // Truffle praises him (parent, 2026-10-05: not a reddish banner)
      }
      await commit(afterPracticeAnswer(latest.current ?? rec, r.correct, r.elapsedMs, r.inContext));
    })();

  const onWriteDone = (r: WriteResult | null) =>
    once(async () => {
      const task = writeCandidate!;
      // only the recall pass rates the word (spec §20 part 3); a redo at the end is extra practice. Written a character at a time
      // (spec 2026-10-05 §5), the word is rated once, on the character that finishes it, with all its misses from memory.
      const rates = task.at === undefined ? true : !!task.last;
      if (r && !rec.free && task.pass === 'recall' && !task.redo && rates) await recordWriting(db, task.wordId, wordMisses(rec, task.wordId) + r.totalMisses, now());
      if (!r) await markWriteSkipped(db, task.wordId, now()); // any word whose strokes failed goes behind the others next time (sweep)
      // a new word written from memory with no misses showed the close-up if one was due: start the cooldown again
      if (r && task.pass === 'recall' && isHardWrite(task.isNew, r.totalMisses) && closeupAllowed(cardsSinceCloseup.current, reducedMotion())) cardsSinceCloseup.current = 0;
      await commit(afterWriteWord(rec, r !== null, r?.elapsedMs ?? 0, { hinted: r?.hinted, misses: r?.totalMisses }));
    })();

  /** A word used in context (选一选): rate its meaning once a day, and count the recall for 用一用 (spec §20 part 7). */
  const onUseAnswer = async (item: UseItem, correct: boolean, responseMs = 0) => {
    if (!item.wordId) return; // a bank word, not one of his own: practice only
    if (!rec.free) {
      know.cardsById.set(`${item.wordId}:meaning`, await recordUse(db, item.wordId, correct, now(), responseMs));
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

  /** Save the warm-up and the read, count the cycle day, and give a bonus star for beating the last read. */
  const onLangduDone = (r: LangduResult) =>
    once(async () => {
      const reading = state.speaking as { kind: 'langdu'; passage: ReadingPassage; oral: OralInfo };
      const at = now();
      const today = localDateKey(at);
      if (r.intro) await keepRecording(db, { id: newId(), createdAt: at.getTime(), prompt: { kind: 'intro' }, ...r.intro });
      let bonus = false;
      if (r.read) {
        const prev = (await listRecordings(db)).find((x) => x.prompt.kind === 'passage' && x.prompt.passageId === reading.passage.id);
        bonus = earnsBonus(prev, { level: r.read.level ?? 0, durationSec: r.read.durationSec });
        await keepRecording(db, { id: newId(), createdAt: at.getTime(), prompt: { kind: 'passage', passageId: reading.passage.id }, ...r.read });
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

  return (
    <div class="screen">
      <WorldScene world={currentWorld(kid)} time={timeOfDay(now())} />
      <header class="lessonbar">
        <button type="button" class="icon-btn" aria-label="回家" onClick={() => go({ name: 'home' })}>
          <X size={34} strokeWidth={3} />
        </button>
        <ProgressBar steps={rec.plan.steps} stepIndex={rec.stepIndex} fraction={sessionProgress(rec, stepFraction)} />
        {combo >= 3 && <span class="combo"><Flame size={20} strokeWidth={2.75} /> {combo}</span>}
      </header>

      {(step === 'flashcards' || step === 'newwords') && flashItem && flashWord && !flashWord.paused && (
        <FlashcardStep
          key={rec.flashIndex}
          item={flashItem}
          ask={step === 'newwords' ? 'listen' : undefined}
          reintroOnMiss={step === 'newwords'}
          peek={step === 'flashcards' && flashItem.retry} // an older lesson's retries are words he missed
          idiom={step === 'newwords' ? introIdiom(flashWord, idiomsFor(flashWord, level, know.words)) : null}
          word={flashWord}
          pool={know.words}
          card={know.cardsById.get(`${flashWord.id}:recognise`)}
          voice={voice}
          kid={kid}
          resting={resting}
          combo={combo}
          closeupReady={closeupAllowed(cardsSinceCloseup.current, reducedMotion())}
          onDone={(r) => void onFlashDone(r)}
        />
      )}
      {step === 'practice' && practiceItem && practiceWord && !practiceWord.paused && (
        <PracticeQuestion
          key={`p${rec.practiceIndex}`}
          item={practiceItem}
          word={practiceWord}
          pool={know.words}
          card={know.cardsById.get(`${practiceWord.id}:recognise`)}
          voice={voice}
          kid={kid}
          resting={resting}
          combo={combo}
          closeupReady={closeupAllowed(cardsSinceCloseup.current, reducedMotion())}
          confused={state.confusions.get(practiceWord.id)}
          knownChars={know.knownChars}
          level={level}
          onDone={(r) => void onPracticeDone(r)}
        />
      )}
      {step === 'writing' && writeWord && !writeWord.paused && (
        <WritingStep
          key={`${rec.writeIndex}-${rec.writePass ?? 0}-${rec.writeRedoIndex ?? 0}`}
          word={writeWord}
          kid={kid}
          resting={resting}
          isNew={!!writeCandidate?.isNew}
          pass={writeCandidate!.pass}
          at={writeCandidate!.at}
          closeupReady={closeupAllowed(cardsSinceCloseup.current, reducedMotion())}
          onDone={(r) => void onWriteDone(r)}
        />
      )}
      {step === 'choose' && state.choose && state.choose.length > 0 && (
        <ChooseStep key="choose" items={state.choose} kid={kid} resting={resting} onAnswer={(item, c, ms) => void onUseAnswer(item, c, ms)} onDone={() => void finishTimedStep('choose')} onProgress={setStepFraction} />
      )}
      {step === 'wrapup' && state.wrapup && state.wrapup.length > 0 && (
        <WrapupStep
          key="wrapup"
          items={state.wrapup}
          kid={kid}
          resting={resting}
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
        <ComponentsStep key="components" items={state.round} kid={kid} resting={resting} onAnswer={(item, c) => void onZibianAnswer(item, c)} onDone={() => void finishTimedStep('components')} onProgress={setStepFraction} />
      )}
      {step === 'speaking' && state.speaking?.kind === 'langdu' && (
        <LangduStep
          passage={state.speaking.passage}
          oral={state.speaking.oral}
          warmups={kid.reading.warmups}
          knownChars={know.knownChars}
          kid={kid}
          withWarmup
          onDone={(r) => void onLangduDone(r)}
        />
      )}
      {step === 'speaking' && state.speaking?.kind === 'story' && (
        <StoryStep scene={state.speaking.scene} told={kid.story.told} kid={kid} onDone={(r) => void onStoryDone(r)} />
      )}
    </div>
  );
}
