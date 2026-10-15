import { X } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { LangduStep, type LangduResult } from '../activities/langdu/LangduStep';
import { PASSAGES } from '../content';
import { afterRead, afterSkip } from '../langdu/history';
import { pickPassage, swapTarget } from '../langdu/pick';
import { readerAt } from '../langdu/level';
import { readingPool, type ReadingPassage } from '../langdu/pool';
import { tidyPassageTakes } from '../langdu/review';
import { localDateKey } from '../lib/date';
import { newId } from '../lib/id';
import { keepRecording, getKid, getSettings, listParentPassages, updateKid } from '../store/repo';
import { DEFAULT_KID, type KidState, type OralInfo, type ReadingHistory } from '../types';
import { InkIcon } from '../ui/icons/InkIcon';
import { PinyinFade, type KnownReadings } from '../ui/pinyinFade';
import { currentWorld, timeOfDay } from '../fun/worlds';
import { WorldScene } from '../ui/worlds/WorldScene';
import { useApp } from './AppContext';
import { logError } from './errorLog';
import { loadKnowledge } from './knowledge';

interface Loaded { passage: ReadingPassage | null; pool: ReadingPassage[]; reading: ReadingHistory; swaps: number; day: string; oral: OralInfo; kid: KidState; knownChars: Set<string>; knownReadings: KnownReadings; fadePinyin: boolean }

/** 多读一遍 from Home (spec 2026-10-15 §5): a passage by the same order as the lesson's, never one read today — listen, read, compare — no warm-up, no question, no stars; it counts as a read for the gap ('extra'). */
export function LangduScreen() {
  const { db, now, go } = useApp();
  const [state, setState] = useState<Loaded | null>(null);

  useEffect(() => {
    void (async () => {
      const [know, kid, parent, settings] = await Promise.all([loadKnowledge(db), getKid(db), listParentPassages(db), getSettings(db)]);
      const k = kid ?? DEFAULT_KID;
      const day = localDateKey(now());
      const pool = readingPool(parent, PASSAGES, readerAt(know.knownChars, now(), settings));
      const passage = pickPassage(k.reading, pool, day);
      setState({ passage, pool, reading: k.reading, swaps: 0, day, oral: settings.oral, kid: k, knownChars: know.knownChars, knownReadings: know.knownReadings, fadePinyin: settings.fadePinyin !== false });
    })();
  }, []);

  useEffect(() => {
    if (state && !state.passage) go({ name: 'home' });
  }, [state]);

  if (!state?.passage) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;
  const passage = state.passage;
  // 下一篇, as in the lesson (spec 2026-10-15 §5)
  const next = swapTarget(state.reading, state.pool, passage, state.day, state.swaps);
  const swap = () => {
    if (!next) return;
    const reading = afterSkip(state.reading, passage.id, state.day);
    setState({ ...state, passage: next, reading, swaps: state.swaps + 1 });
    void updateKid(db, (k) => ({ ...k, reading: afterSkip(k.reading, passage.id, state.day) })).catch(logError);
  };

  const done = async (r: LangduResult) => {
    if (r.read) {
      await keepRecording(db, { id: newId(), createdAt: now().getTime(), prompt: { kind: 'passage', passageId: passage.id, extra: true }, ...r.read }); // never the queue's take (final review I6)
      try {
        await tidyPassageTakes(db, now());
      } catch (err) {
        logError(err);
      }
    }
    try {
      await updateKid(db, (k) => ({ ...k, reading: afterRead(k.reading, passage.id, localDateKey(now()), 'extra') })); // a take or none
    } catch (err) {
      logError(err);
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
        <LangduStep passage={passage} oral={state.oral} kid={state.kid} withWarmup={false} extra onSwap={next ? swap : undefined} onDone={(r) => void done(r)} />
      </div>
    </PinyinFade>
  );
}
