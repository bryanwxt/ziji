import { Flame, Star, Volume2 } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { enterSafeScreen } from '../pwa';
import { pinyin } from 'pinyin-pro';
import { primeSpeech, speak } from '../audio/speech';
import { pathNodes } from '../fun/path';
import { wordOfTheDay } from '../fun/wordOfDay';
import { goalProgress, nextGoal } from '../fun/rewards';
import { localDateKey } from '../lib/date';
import { stepsOn } from '../session/plan';
import { streak, totalStars, weekDays } from '../stats/stats';
import { pickExample } from '../activities/writing/cue';
import { WeekStrip } from './WeekStrip';
import { allSessions, getKid, listParentPassages, listRewards, saveKid, updateKid } from '../store/repo';
import { pickPassage, readingPool } from '../langdu/cycle';
import { nextSpeaking } from '../kantu/flow';
import { PASSAGES } from '../content';
import { DEFAULT_KID, type KidState, type ParentPassage, type RewardGoal, type SessionRecord } from '../types';
import { celebrate } from '../ui/confetti';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { WorldScene } from '../ui/worlds/WorldScene';
import { WorldProps } from '../ui/worlds/WorldProps';
import { dayMood } from '../ui/truffle/greeting';
import { REACTIONS, type ReactionKind } from '../ui/truffle/timelines';
import { SCENE_VIEWBOX, SCENES } from '../ui/worlds/scenes';
import { currentWorld, timeOfDay, updateWorlds, worldById, worldLine, type WorldId, resetWorlds } from '../fun/worlds';
import { settleJourney } from '../placement/journey';
import { TabBar } from '../ui/TabBar';
import { useApp } from './AppContext';
import { loadKnowledge, type Knowledge } from './knowledge';
import { TodayPath } from './TodayPath';
import { InkIcon } from '../ui/icons/InkIcon';

interface HomeData {
  know: Knowledge;
  sessions: SessionRecord[];
  goals: RewardGoal[];
  parentPassages: ParentPassage[];
}

const SLEEP_AFTER_MS = 20_000;

export function HomeScreen({ sleepAfterMs = SLEEP_AFTER_MS }: { sleepAfterMs?: number }) {
  const { db, now, go, kid, settings, refresh } = useApp();
  const [data, setData] = useState<HomeData | null>(null);
  const [sleepy, setSleepy] = useState(false);
  const [arrival, setArrival] = useState<WorldId | null>(null);
  const [said, setSaid] = useState<string | null>(null); // Truffle's reaction to a tap, for a moment
  const saidTimer = useRef<ReturnType<typeof setTimeout>>();
  const [propPlay, setPropPlay] = useState<{ react: { kind: ReactionKind; key: number } | null; lookAt: number }>({ react: null, lookAt: 0 }); // Truffle and his props
  const lookTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { clearTimeout(saidTimer.current); clearTimeout(lookTimer.current); }, []);
  const [journeyKid, setJourneyKid] = useState<KidState | null>(null); // the kid as saved by the journey update, until the app refreshes

  useEffect(() => enterSafeScreen(), []);

  useEffect(() => {
    void Promise.all([loadKnowledge(db), allSessions(db), listRewards(db), listParentPassages(db)]).then(([know, sessions, goals, parentPassages]) => setData({ know, sessions, goals, parentPassages }));
  }, []);

  // The dragon dozes off when nobody is around; any tap wakes it.
  useEffect(() => {
    let timer = setTimeout(() => setSleepy(true), sleepAfterMs);
    const wake = () => {
      setSleepy(false);
      clearTimeout(timer);
      timer = setTimeout(() => setSleepy(true), sleepAfterMs);
    };
    window.addEventListener('pointerdown', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', wake);
    };
  }, [sleepAfterMs]);

  const k = journeyKid ?? kid ?? DEFAULT_KID;

  // Journey: record newly reached worlds (never removes any), save before the arrival card shows so it shows once.
  useEffect(() => {
    if (!data) return;
    void (async () => {
      // worlds count what he learns after placement (src/placement/journey.ts); an older install's worlds are redone once
      const first = (await getKid(db)) ?? kid;
      if (!first) return; // no kid yet: nothing to record
      const j = await settleJourney(db, first, data.know.known);
      const redo = j.kid !== first;
      // then build on what's stored now, in one transaction (a just-saved costume, star or find must not be overwritten — sweep)
      const day = localDateKey(now());
      let changed = false;
      let arrived: ReturnType<typeof updateWorlds>['arrived'] | undefined;
      let mood: ReturnType<typeof dayMood> | null = null;
      const plan = (stored: KidState): KidState | null => {
        const u = updateWorlds(redo ? resetWorlds(stored, j.count) : stored, j.count);
        let next = u.kid;
        // once a day he shows how he feels about it (spec 2026-10-04 §4.6): a little sulk after days away, extra bouncy on a streak
        const greet = next.greetedOn !== day;
        mood = null;
        if (greet) {
          next = { ...next, greetedOn: day };
          const lessons = data.sessions.filter((s) => !s.free);
          mood = dayMood(lessons.filter((s) => s.completed).map((s) => s.date), day, lessons.map((s) => s.date));
        }
        changed = u.changed;
        arrived = u.arrived;
        return u.changed || greet || redo ? next : null;
      };
      let saved = await updateKid(db, plan);
      if (!saved && kid && !(await getKid(db))) { // nothing stored yet: start from the one on screen
        saved = plan(kid);
        if (saved) await saveKid(db, saved);
      }
      if (!saved) return;
      const m = mood as ReturnType<typeof dayMood> | null;
      if (m && m !== 'plain') {
        setPropPlay((p) => ({ react: { kind: m === 'missed' ? 'huff' : 'bouncy', key: (p.react?.key ?? 0) + 1 }, lookAt: 0 }));
        setSaid(m === 'missed' ? '你去哪儿了？我好想你！' : '又见面了！');
        clearTimeout(saidTimer.current);
        saidTimer.current = setTimeout(() => setSaid(null), 2600);
      }
      setJourneyKid(saved);
      if (changed) setArrival(arrived!);
      await refresh();
    })();
  }, [data]);
  // the context's kid catches up after refresh(): from then on it is the one to show
  useEffect(() => setJourneyKid(null), [kid]);

  const stars = data ? totalStars(data.sessions, k.bonusStars) : 0;
  const goal = data ? nextGoal(data.goals) : null;
  const progress = goal && data ? goalProgress(goal, { stars, known: data.know.known }) : null;
  useEffect(() => {
    if (progress?.reached) celebrate();
  }, [progress?.reached]);

  if (!data) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;

  const today = localDateKey(now());
  const todaySession = data.sessions.find((s) => s.date === today && !s.free);
  const doneToday = !!todaySession?.completed;
  const chestOpened = k.lastChestDate === today;
  const hasCards = data.know.cards.some((c) => c.kind === 'recognise');
  const days = streak(data.sessions, today);
  const wotd = wordOfTheDay({
    plannedNew: (todaySession?.plan.newWordIds ?? []).map((id) => data.know.wordsById.get(id)?.text ?? ''),
    knownChars: data.know.knownChars,
    date: today,
  });
  const world = currentWorld(k);
  const canRead = settings.langdu && !!pickPassage(k.reading, readingPool(data.parentPassages, PASSAGES, data.know.knownChars), today);
  // what the speaking stop is today: what he did, once done; otherwise what comes next (朗读 while 看图说话 is parked, or nothing to read)
  // 看图说话 parked: the stop is 朗读 when there's something to read (or he read today), and left off the path otherwise (the lesson skips it)
  const speakingKind = settings.story
    ? todaySession?.completedSteps.includes('speaking') ? k.speakingLast ?? 'story' : nextSpeaking(k.speakingLast, canRead, true)
    : canRead || k.reading.lastDay === today ? 'langdu' : null;
  const steps = (todaySession?.plan.steps ?? stepsOn(settings)).filter((s) => s !== 'speaking' || speakingKind !== null);
  const nodes = pathNodes(steps, todaySession?.completedSteps ?? [], chestOpened, doneToday);
  const wotdWord = wotd ? data.know.wordsById.get(`b:${wotd}`) : undefined;
  const wotdExample = wotdWord ? pickExample(wotdWord)?.example ?? null : null;
  const play = (free: boolean) => {
    primeSpeech();
    go({ name: 'session', free });
  };

  return (
    <div class={`screen home${doneToday && chestOpened ? ' home--done' : ''}`}>
      <WorldScene world={world} time={timeOfDay(now())} />
      <WorldProps
        world={world}
        kid={k}
        today={today}
        onKid={(next) => {
          setJourneyKid(next);
          void updateKid(db, (cur) => ({ ...cur, finds: next.finds, bonusStars: next.bonusStars })).then(refresh); // only what a find changes
        }}
        onSay={(line) => {
          setSaid(line);
          clearTimeout(saidTimer.current);
          saidTimer.current = setTimeout(() => setSaid(null), 2200);
        }}
        onReact={(kind, side) => {
          // he reacts to his prop and looks toward it (spec 2026-10-04 §4.5), then looks back
          setPropPlay((p) => ({ react: { kind, key: (p.react?.key ?? 0) + 1 }, lookAt: side }));
          clearTimeout(lookTimer.current);
          lookTimer.current = setTimeout(() => setPropPlay((p) => ({ ...p, lookAt: 0 })), REACTIONS[kind].holdMs);
        }}
      />
      <header class="topbar home__strip">
        <span class="stat stat--fire" aria-label={`连续 ${days} 天`}><Flame size={24} strokeWidth={2.75} /> {days}</span>
        <span class="stat stat--star" aria-label={`${stars} 颗星`}><Star size={24} strokeWidth={2.75} /> {stars}</span>
        <div class="home__week">
          <span class="seal" aria-hidden="true"><span>字</span><span>己</span></span>
          <WeekStrip days={weekDays(data.sessions, today)} />
        </div>
        <span class="spacer" />
        <span class="home__who">
          <strong><Label zh="松露" /></strong>
          <Label zh={`认识 ${data.know.known} 个字`} />
        </span>
      </header>
      <main class="home__main">
        <div class="home__cards">
          {goal && progress && (
            <div class={`goal ${progress.reached ? 'goal--reached' : ''}`}>
              {/* what he sees is Chinese with an ink icon; the parent's English note and older emoji stay in the parent area (spec 2026-10-04 §3) */}
              <span class="goal__icon"><InkIcon name={goal.icon ?? 'gift'} size={34} /></span>
              <div class="goal__body">
                <strong><Label zh={goal.zh ?? '我的奖励'} /></strong>
                {progress.reached ? (
                  <span><Label zh="你做到了！找爸爸妈妈拿奖励吧！" /></span>
                ) : (
                  <>
                    <div class="progress"><div class="progress__fill" style={{ width: `${Math.round(progress.fraction * 100)}%` }} /></div>
                    <small class="goal__count">{progress.value} / {goal.target} {goal.metric === 'stars' ? <InkIcon name="star" size={16} /> : '字'}</small>
                  </>
                )}
              </div>
            </div>
          )}
          {doneToday && chestOpened && (
            <div class="card done-card">
              <p class="done-today"><Label zh="今天完成了！" /> <InkIcon name="party" size={30} /></p>
              {/* one lesson a day is the baseline; another is his choice (parent, 2026-10-05): new words and what's due, for stars */}
              <button type="button" class="btn btn--primary" onClick={() => { primeSpeech(); go({ name: 'session', free: false, extra: true }); }}><Label zh="再学一课" /></button>
              {hasCards && (
                <button type="button" class="btn btn--secondary" onClick={() => play(true)}><Label zh="再玩一会儿" /></button>
              )}
            </div>
          )}
          {wotd && (
            <div class="card wotd">
              <button type="button" class="wotd__main" aria-label={`今日一字：${wotd}`} onClick={() => speak(wotd, { reading: wotdWord?.pinyin })}>
                <span class="label-tag">今日一字</span>
                <span class="wotd__grid" aria-hidden="true">{wotd}</span>
                <span class="wotd__py" aria-hidden="true">{wotdWord?.pinyin ?? pinyin(wotd)}</span>
              </button>
              {wotdExample && (
                <button type="button" class="wotd__example" aria-label={`听：${wotdExample.text}`} onClick={() => speak(wotdExample.text)}>
                  <Label zh={wotdExample.text} py={wotdExample.pinyin} />
                  <Volume2 size={22} strokeWidth={2.75} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {canRead && (
            <button type="button" class="btn btn--secondary langdu-btn" aria-label="多读一遍" onClick={() => go({ name: 'langdu' })}>
              <InkIcon name="mic" size={28} /> <Label zh="多读一遍" />
            </button>
          )}
        </div>
        <div class="home__path">
          <h2 class="home__title"><Label zh="今天的练习" /></h2>
          {/* today's stops sit on a path in the world's colours (spec 2026-10-04 §3, phase D) */}
          {steps.length || todaySession ? (
            <TodayPath
              speakingName={speakingKind === 'story' ? '看图说话' : '朗读'}
              nodes={nodes}
              started={!!todaySession}
              onStart={() => play(false)}
            />
          ) : (
            <p class="home__rest"><Label zh="今天休息一下！" /></p> // only 朗读 is switched on and there's nothing he can read yet: no lone chest
          )}
        </div>
      </main>
      <div class="home__pet">
        {/* a tap here plays with him (spec 2026-10-04 §4.5); his room is the 松露 tab */}
        <div class="home__pet-touch">
          <Pet kid={k} mood={sleepy ? 'sleepy' : doneToday ? 'pleased' : 'sulk'} size={150} bubble={said ?? (sleepy ? null : worldLine(world, today))} react={propPlay.react} lookAt={propPlay.lookAt} />
        </div>
      </div>
      {arrival && (
        <div class="arrival" role="dialog" aria-label="新地方">
          <div class="arrival__card">
            <span class="grainy arrival__frame"><svg class="arrival__scene" viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SCENES[arrival] }} /></span>
            <h2><Label zh={`到${worldById(arrival)!.zh}了！`} /></h2>
            <button type="button" class="btn btn--primary btn--big" onClick={() => setArrival(null)}><Label zh="走吧！" /></button>
          </div>
        </div>
      )}
      <TabBar active="home" />
    </div>
  );
}
