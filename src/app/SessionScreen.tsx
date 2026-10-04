import { Flame, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ComponentsStep } from '../activities/components/ComponentsStep';
import { buildComponentRound, type ComponentQuestion } from '../activities/components/game';
import { FlashcardStep, type FlashResult } from '../activities/flashcards/FlashcardStep';
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
import { CLOSEUP_EVERY, closeupAllowed, restingMood } from '../fun/mood';
import { comboMilestone } from '../fun/pet';
import { reducedMotion } from '../ui/motion';
import { localDateKey } from '../lib/date';
import { mulberry32 } from '../lib/random';
import { buildFreePlayQueue } from '../session/plan';
import { markWriteSkipped, recordMeaning, recordRecognition, recordWriting, startOrResumeSession } from '../session/record';
import {
  addActiveTime, afterFlashAnswer, afterWriteWord, createFreePlayRecord, currentFlashItem, currentStep,
  currentWriteCandidate, finishStep, skipFlashItem,
} from '../session/runner';
import { getKid, keepRecording, getSettings, listParentPassages, listRecordings, saveKid, saveSession } from '../store/repo';
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
  round: ComponentQuestion[] | null;
  speaking: { kind: 'langdu'; passage: ReadingPassage; oral: OralInfo } | { kind: 'story'; scene: Scene } | null;
}

export function SessionScreen({ free }: { free: boolean }) {
  const { db, now, go, voice } = useApp();
  const [state, setState] = useState<Loaded | null>(null);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0); // this sitting only: Truffle warms up from sulk
  const cardsSinceCloseup = useRef(CLOSEUP_EVERY);
  const [banner, setBanner] = useState<number | null>(null); // a combo milestone being celebrated
  const stepStartedAt = useRef(performance.now());
  const busy = useRef(false);

  useEffect(() => {
    void (async () => {
      const rng = mulberry32(Date.now() >>> 0);
      const [know, kid, parentPassages, settings] = await Promise.all([loadKnowledge(db), getKid(db), listParentPassages(db), getSettings(db)]);
      const today = now();
      const rec = free
        ? createFreePlayRecord(buildFreePlayQueue(know.cards, know.words, rng), localDateKey(today), today.getTime())
        : await startOrResumeSession(db, today);
      setState({
        rec,
        know,
        kid: kid ?? DEFAULT_KID,
        round: buildComponentRound([...know.knownChars], rng),
        speaking: (() => {
          const k = kid ?? DEFAULT_KID;
          const passage = pickPassage(k.reading, readingPool(parentPassages, PASSAGES, know.knownChars), localDateKey(today));
          // 朗读; 看图说话 only when switched back on (it's parked). Nothing to run: the step is skipped.
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
  const writeCandidate = rec ? currentWriteCandidate(rec) : null;
  const writeWord = writeCandidate ? state!.know.wordsById.get(writeCandidate.wordId) : undefined;

  const commit = async (next: SessionRecord) => {
    if (!next.free) await saveSession(db, next);
    if (!next.free && next.completed && !rec?.completed) {
      // a finished daily lesson hatches a dino egg he tapped in 恐龙谷
      const fresh = await getKid(db);
      if (fresh) {
        const finds = hatchAfterLesson(fresh.finds);
        if (finds !== fresh.finds) await saveKid(db, { ...fresh, finds });
      }
    }
    stepStartedAt.current = performance.now();
    setState((s) => (s ? { ...s, rec: next } : s));
  };

  // Anything that cannot run is skipped silently: an empty step, or a word paused/deleted since planning.
  useEffect(() => {
    if (!state || !rec) return;
    if (step === 'flashcards' && !flashItem) void commit(finishStep(rec));
    else if (step === 'flashcards' && (!flashWord || flashWord.paused)) void commit(skipFlashItem(rec));
    else if (step === 'writing' && !writeCandidate) void commit(finishStep(rec));
    else if (step === 'writing' && (!writeWord || writeWord.paused)) void commit(afterWriteWord(rec, false, 0));
    else if (step === 'components' && !state.round) void commit(finishStep(rec));
    else if (step === 'speaking' && !state.speaking) void commit(finishStep(rec));
  }, [rec]);

  if (!state || !rec) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;
  if (rec.completed) return <Celebration rec={rec} />;
  const { know, kid } = state;
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

  const finishTimedStep = once(() => commit(finishStep(addActiveTime(rec, Math.round(performance.now() - stepStartedAt.current)))));

  const onFlashDone = (r: FlashResult) =>
    once(async () => {
      const item = flashItem!;
      if (!item.retry && !rec.free) {
        const outcome = { correct: r.correct, responseMs: r.responseMs };
        const card = item.mode === 'meaning' ? await recordMeaning(db, item.wordId, outcome, now()) : await recordRecognition(db, item.wordId, outcome, now());
        know.cardsById.set(card.id, card);
      }
      const ready = closeupAllowed(cardsSinceCloseup.current, reducedMotion());
      cardsSinceCloseup.current = r.correct && r.hard && ready ? 0 : cardsSinceCloseup.current + 1;
      if (r.correct) setCorrect((n) => n + 1);
      const nextCombo = r.correct ? combo + 1 : 0;
      setCombo(nextCombo);
      if (comboMilestone(nextCombo)) {
        playSfx('combo');
        setBanner(nextCombo);
        setTimeout(() => setBanner(null), 1600);
      }
      await commit(afterFlashAnswer(rec, r.correct, r.elapsedMs));
    })();

  const onWriteDone = (r: WriteResult | null) =>
    once(async () => {
      if (r && !rec.free) await recordWriting(db, writeCandidate!.wordId, r.totalMisses, now());
      if (!r && writeCandidate!.isNew) await markWriteSkipped(db, writeCandidate!.wordId, now());
      await commit(afterWriteWord(rec, r !== null, r?.elapsedMs ?? 0));
    })();

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
        <ProgressBar steps={rec.plan.steps} stepIndex={rec.stepIndex} fraction={sessionProgress(rec)} />
        {combo >= 3 && <span class="combo"><Flame size={20} strokeWidth={2.75} /> {combo}</span>}
      </header>
      {banner !== null && <div class="combo-banner">连对 {banner} 个！<InkIcon name="flame" size={30} /></div>}

      {step === 'flashcards' && flashItem && flashWord && !flashWord.paused && (
        <FlashcardStep
          key={rec.flashIndex}
          item={flashItem}
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
      {step === 'writing' && writeWord && !writeWord.paused && (
        <WritingStep key={rec.writeIndex} word={writeWord} kid={kid} resting={resting} isNew={!!writeCandidate?.isNew} onDone={(r) => void onWriteDone(r)} />
      )}
      {step === 'components' && state.round && (
        <ComponentsStep questions={state.round} kid={kid} resting={resting} onDone={() => void finishTimedStep()} />
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
