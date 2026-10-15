import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { BUILTIN } from '../content';
import { radicalMeaning } from '../content/radicals';
import { costumeById, openChest, visibleAccessory, type ChestResult } from '../fun/costumes';
import { newTiers, powerDef, powerFamilies, powerProgress, type PowerId } from '../fun/powers';
import { newBadges, stickerFamilies } from '../fun/stickers';
import { totalStars, starsOf } from '../stats/stats';
import { producedLine } from '../stats/produce';
import { allSessions, getKid, getSettings, saveKid, updateKid } from '../store/repo';
import { CHESTS_PER_DAY, lessonOf, METER_FULL, meterLine } from '../fun/meter';
import { RiverTrack } from '../ui/RiverTrack';
import { almostThere, type Goal } from '../fun/goals';
import { loadGoalFacts, settleMeter } from './celebrationData';
import { localDateKey } from '../lib/date';
import { CHAPTERS } from '../story/chapters';
import { storyStep } from '../story/progress';
import { DEFAULT_KID, type KidState, type SessionRecord } from '../types';
import { Chest } from '../ui/Chest';
import { HoldButton } from '../ui/HoldButton';
import { celebrate } from '../ui/confetti';
import { Label } from '../ui/Label';
import { burst, flyAlong } from '../ui/motion';
import { Pet } from '../ui/Pet';
import { Truffle } from '../ui/truffle/Truffle';
import type { Reaction } from '../ui/truffle/timelines';
import { useApp } from './AppContext';
import { loadKnowledge } from './knowledge';
import { InkIcon } from '../ui/icons/InkIcon';
import { accessoryById } from '../fun/accessories';
import { currentWorld } from '../fun/worlds';
import { burstStyle } from '../ui/worlds/burst';
import { reducedMotion } from '../ui/motion';

type Phase = 'stars' | 'river' | 'chest' | 'goals' | 'power' | 'badges';
// his moments here (spec 2026-10-04 §4.4): an overjoyed hop at the stars, then proud; a pounce as the chest's prize appears
const DONE: Reaction = { kind: 'done', key: 1 };
const POUNCE: Reaction = { kind: 'pounce', key: 1 };
/** He wiggles with excitement at the closed chest every so often (spec 2026-10-04 §4.4). */
const WATCH_EVERY_MS = 2400;
/** His pounce as the chest opens: a key the wiggles never use, so the rig always plays it (final review I1). */
const WATCH_POUNCE: Reaction = { kind: 'pounce', key: -1 };
/** The goals wait this long for their read at most; past it the Celebration goes on without them (a stuck read never hangs it). */
const GOALS_WAIT_MS = 1500;
/** A second tap on 继续 this soon after a phase change is the same double tap: it never skips the phase just shown. */
const TAP_GAP_MS = 300;

/** The boat in this Celebration (rewards spec §3): where it sails from, where the meter ends, and whether today's 2 chests are earned. */
interface River { from: number; left: number; capped: boolean }

interface Sequence {
  order: Phase[]; // a phase may come twice: two chests in one lesson
  river: River;
  goals: Goal[];
  power: { id: PowerId; tier: number } | null; // the highest newly reached tier (shown)
  newTiers: { id: PowerId; tier: number }[];
  badges: string[];
  starsBefore: number;
}

export function Celebration({ rec }: { rec: SessionRecord }) {
  const { db, go, refresh, now } = useApp();
  const kidRef = useRef<KidState>(DEFAULT_KID);
  const counterRef = useRef<HTMLSpanElement>(null);
  const chestRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [kid, setKid] = useState<KidState | null>(null);
  const [seq, setSeq] = useState<Sequence | null>(null);
  const [at, setAt] = useState(0); // the phase on screen: its place in seq.order
  const phase: Phase = seq?.order[at] ?? 'stars';
  const [chest, setChest] = useState<ChestResult | null>(null);
  const [landed, setLanded] = useState(0);
  const [powered, setPowered] = useState(false);
  // a tap, not a hold, on the chest: it wiggles as a hint (children tap first). The wiggle restarts on the same element, so
  // keyboard focus stays on the hold button (sweep: a remount dropped it to the page)
  const hint = () => {
    const el = chestRef.current;
    if (!el) return;
    el.classList.remove('chest-hint');
    void el.offsetWidth;
    el.classList.add('chest-hint');
  };
  const [wiggle, setWiggle] = useState(1); // the key of his next excited wiggle at the chest
  const still = reducedMotion();
  const [arrived, setArrived] = useState(still); // the boat has reached the chest: it shows and can be opened
  // mastery stars (spec 2026-10-11 §5); a lesson finished before them shows the stars its steps earned
  const stars = rec.free ? 0 : rec.stars ?? starsOf(rec.completedSteps);
  const movedAt = useRef(0); // when the phase last changed: a double tap on 继续 moves one phase

  useEffect(() => {
    celebrate();
    void (async () => {
      const [know, sessions] = await Promise.all([loadKnowledge(db), allSessions(db)]);
      // the goals' facts are read alongside the meter (never on free play); whether the lesson moved the meter is filled in after
      const facts = lessonOf(rec) ? loadGoalFacts(db, know, false, now()) : null;
      facts?.catch(() => {});
      // the lesson counts on the river meter once (rewards spec §3); if that fails he still gets his celebration
      const { kid: kidNow, fill } = await settleMeter(db, rec, localDateKey(now())).catch(async () => ({ kid: (await getKid(db).catch(() => null)) ?? DEFAULT_KID, fill: null }));
      const m = kidNow.meter;
      const river: River = fill
        ? { from: fill.from, left: fill.left, capped: fill.capped }
        : { from: m.halves, left: m.halves, capped: m.day === rec.date && m.chestsToday >= CHESTS_PER_DAY };
      const order: Phase[] = ['stars'];
      // every chest earned and not yet opened (one an earlier lesson left too), else how far the boat got
      if (lessonOf(rec)) {
        if (m.owed > 0) for (let i = 0; i < m.owed; i++) order.push('chest');
        else order.push('river');
      }
      // up to three things he is close to, after the stars and the chest (rewards spec §4); never on free play
      const goals: Goal[] = facts
        ? await Promise.race([
            facts.then((f) => almostThere(kidNow, know, { ...f, counted: !!fill?.counted }, now())).catch(() => []),
            new Promise<Goal[]>((r) => setTimeout(() => r([]), GOALS_WAIT_MS)),
          ])
        : [];
      if (goals.length) order.push('goals');
      const badges = newBadges(stickerFamilies(BUILTIN), know.knownChars, kidNow.badgesSeen);
      const fresh = newTiers(powerProgress(powerFamilies(BUILTIN), know.knownChars), kidNow.powerTiersSeen);
      const power = [...fresh].sort((a, b) => b.tier - a.tier)[0] ?? null;
      if (power) order.push('power');
      if (badges.length) order.push('badges');
      kidRef.current = kidNow;
      setKid(kidNow);
      setSeq({ order, river, goals, power, newTiers: fresh, badges, starsBefore: totalStars(sessions, kidNow.bonusStars) - stars });
    })();
  }, []);

  // Fly each earned star into the counter, one after another.
  useEffect(() => {
    if (!seq) return;
    let cancelled = false;
    void (async () => {
      for (let i = 0; i < stars; i++) {
        const el = starRefs.current[i];
        const c = counterRef.current?.getBoundingClientRect();
        if (el && c) await flyAlong(el, { x: c.left + c.width / 2, y: c.top + c.height / 2 }, { lift: 80, endScale: 0.4, fade: true, duration: 550 });
        if (cancelled) return;
        playSfx('star');
        setLanded((n) => n + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seq]);

  // at the closed chest he wiggles now and then; never with reduced motion
  useEffect(() => {
    if (phase !== 'chest' || chest || still) return;
    const t = setInterval(() => setWiggle((n) => n + 1), WATCH_EVERY_MS);
    return () => clearInterval(t);
  }, [phase, chest]);

  // once the boat reaches the chest, the hold button takes focus (keyboard and switch users land on it)
  useEffect(() => {
    if (phase === 'chest' && arrived && !chest) chestRef.current?.querySelector<HTMLButtonElement>('button.hold')?.focus();
  }, [arrived, at, seq]);

  if (!seq || !kid) return <div class="screen loading"><InkIcon name="star" size={88} label="加载中" /></div>;
  // the 还差一天 line is promoted to a goal when one shows (rewards ruling 7)
  const line = rec.free ? null : producedLine(rec.produced, seq.goals.some((g) => g.kind === 'write') ? [] : rec.closest);

  const save = async (next: KidState) => {
    kidRef.current = next;
    setKid(next);
    await saveKid(db, next);
  };
  const advance = async () => {
    if (Date.now() - movedAt.current < TAP_GAP_MS) return;
    movedAt.current = Date.now();
    const next = at + 1;
    const nextPhase = seq.order[next];
    if (!nextPhase) {
      await refresh();
      // the chapter's payoff after the lesson, when one is owed (spec 2026-10-07 3c §5)
      const stored = await getSettings(db);
      const owed = storyStep(stored.storyProgress, CHAPTERS.length, localDateKey(new Date(`${rec.date}T12:00:00`)), stored.storyOn); // an owed payoff is owed on any day
      go(owed?.part === 'payoff' ? { name: 'story', part: 'payoff', chapter: owed.chapter, then: { name: 'home' } } : { name: 'home' });
      return;
    }
    if (nextPhase === 'badges') {
      playSfx('levelUp');
      celebrate();
      await save({ ...kidRef.current, badgesSeen: [...kidRef.current.badgesSeen, ...seq.badges] });
    }
    setChest(null); // a second chest starts closed
    setArrived(still);
    setAt(next);
  };
  const open = async () => {
    if (chest) return;
    // dated by the session's own day (a session can finish after midnight); one owed chest per opening, in one transaction.
    // What is shown is worked out first, so a failed save never strands him on this screen.
    let opened = openChest(kidRef.current, rec.date);
    let next: KidState = opened.kid; // what he is shown becomes his, unless the chest turns out to be opened already (another tab)
    try {
      const saved = await updateKid(db, (k) => {
        if (k.meter.owed <= 0) return null;
        opened = openChest(k, rec.date);
        return opened.kid;
      });
      // nothing owed when it was saved: the prize is shown, but a later save() carries what is stored, not it
      next = saved ?? (await getKid(db)) ?? kidRef.current;
    } catch {
      // shown anyway; a failed save keeps it in memory, as before
    }
    kidRef.current = next;
    setKid(next);
    setChest(opened.result);
    chestRef.current?.classList.remove('chest-hint');
    playSfx('chest');
    const r = chestRef.current?.getBoundingClientRect();
    if (r) burst(r.left + r.width / 2, r.top + r.height * 0.35, { count: 16 });
  };

  const powerUp = async () => {
    const seen = { ...kidRef.current.powerTiersSeen };
    for (const t of seq.newTiers) seen[t.id] = Math.max(seen[t.id] ?? 0, t.tier);
    // Never strand the child on this screen: carry on even if saving fails.
    await save({ ...kidRef.current, powerTiersSeen: seen, activePower: seq.power!.id }).catch(() => {});
    setPowered(true);
    playSfx('levelUp');
    celebrate();
  };

  const isLast = at === seq.order.length - 1;
  const chestNo = seq.order.slice(0, at).filter((p) => p === 'chest').length;
  const lastChest = seq.order.lastIndexOf('chest') === at;
  const boatLine = meterLine(seq.river); // 再学一课就能开宝箱！ or 明天再开宝箱！
  const afterOpen = chest && lastChest ? boatLine : null; // under an opened last chest: where the meter now is
  const opened = chest ? (lastChest ? seq.river.left : 0) : null; // where the boat waits once the chest is open
  const def = seq.power ? powerDef(seq.power.id)! : null;
  const radical = def?.radicals[0];
  const meaning = radical ? radicalMeaning(radical) : undefined;

  return (
    <div class="screen">
      {/* a sunburst in the current world's colours (spec 2026-10-04 §3) */}
      <div class={`burst${still ? '' : ' burst--turning'}`} data-world={currentWorld(kid)} style={burstStyle(currentWorld(kid))} aria-hidden="true" />
      {!rec.free && (
        <header class="topbar">
          <span class="spacer" />
          <span key={landed} ref={counterRef} class={`chip ${landed ? 'is-bumping' : ''}`}><InkIcon name="star" size={20} /> {seq.starsBefore + landed}</span>
        </header>
      )}
      <div class="celebrate celebrate--burst">
        {phase === 'stars' && (
          <>
            <h1><Label zh={rec.free ? '练习得很好！' : '太棒了！'} /></h1>
            {!rec.free && (
              <>
                <div class="stars stagger">
                  {Array.from({ length: stars }, (_, i) => (
                    <span key={i} ref={(el) => { starRefs.current[i] = el; }}><InkIcon name="star" size={64} /></span>
                  ))}
                </div>
                <p><Label zh={`你得到了 ${stars} 颗星`} /></p>
                {line && <p class="celebrate__line"><Label zh={line} /></p>}
              </>
            )}
          </>
        )}
        {phase === 'river' && (
          <>
            <h1><Label zh={seq.river.capped ? '今天的宝箱都开了！' : seq.river.left > 0 ? '小船走到一半了！' : '小船出发了！'} /></h1>
            <RiverTrack from={seq.river.from} to={seq.river.left} />
            {boatLine && <p class="celebrate__line"><Label zh={boatLine} /></p>}
          </>
        )}
        {phase === 'goals' && (
          <>
            <h1><Label zh="快到了！" /></h1>
            <ul class="goals">
              {seq.goals.map((g) => (
                <li key={g.zh} class={`goal-line goal-line--${g.kind}`}>
                  <InkIcon name={g.icon} size={40} />
                  <Label zh={g.zh} />
                </li>
              ))}
            </ul>
          </>
        )}
        {phase === 'chest' && (
          <>
            <h1><Label zh={chest ? (chest.kind === 'costume' ? '松露有新衣服了！' : chest.kind === 'accessory' ? '松露有新东西了！' : `多了 ${chest.amount} 颗星！`) : '宝箱！'} /></h1>
            {/* the boat sails to the chest (rewards spec §3); once it is open the boat waits where the meter now is */}
            <RiverTrack
              key={chest ? `${at}-open` : at}
              from={opened ?? (chestNo === 0 ? seq.river.from : 0)}
              to={opened ?? METER_FULL}
              onArrive={() => setArrived(true)}
            />
            {/* one slot above the chest, the same size closed and open (review 2026-10-15: the chest dropped ~40 px as the prize
                came in above it): the watching Truffle, or the dressed-up Truffle that replaces him; a stars prize rises out of
                the chest instead; a costume's name sits at his feet */}
            {chest && chest.kind !== 'stars' ? (
              <div class="celebrate__watch prize prize__costume">
                <Truffle mood="cheer" outfit={chest.kind === 'costume' ? chest.id : kid.outfit} accessory={chest.kind === 'costume' ? null : chest.item} size={130} alive react={POUNCE} />
                <span class="prize__label"><Label zh={(chest.kind === 'costume' ? costumeById(chest.id) : accessoryById(chest.item))?.zh ?? ''} py={(chest.kind === 'costume' ? costumeById(chest.id) : accessoryById(chest.item))?.py} /></span>
              </div>
            ) : (
              // he watches the chest and wiggles, then pounces when it opens (spec 2026-10-04 §4.4)
              <div class="celebrate__watch">
                <Truffle mood="cheer" outfit={kid.outfit} accessory={visibleAccessory(kid)} size={130} alive react={chest ? WATCH_POUNCE : still ? null : { kind: 'excited', key: wiggle }} />
              </div>
            )}
            {/* the hold button centred under the chest, and 继续 in its place once it opens: what is below the chest keeps its
                height, so the chest doesn't drop (chest layout fix) */}
            <div ref={chestRef} class={`chest-slot${arrived ? '' : ' is-waiting'}`}>
              <div class="chest-art" onClick={chest ? undefined : hint}>
                <Chest open={!!chest} />
                {chest?.kind === 'stars' && <span class="prize prize__stars"><InkIcon name="star" size={72} /><InkIcon name="star" size={72} /><InkIcon name="star" size={72} /></span>}
              </div>
              <div class="chest-slot__under">
                {!chest ? <HoldButton key={at} label="按住打开宝箱" disabled={!arrived} onComplete={() => void open()} onTooShort={hint} /> : (
                  <button type="button" class="btn btn--primary btn--big" onClick={() => void advance()}>
                    <Label zh={isLast ? '回家' : '继续'} />
                  </button>
                )}
              </div>
            </div>
            <p class={chest && !afterOpen ? 'is-kept' : undefined} aria-hidden={chest && !afterOpen ? 'true' : undefined}><Label zh={afterOpen ?? '按住，打开宝箱！'} /></p>
          </>
        )}
        {phase === 'power' && def && seq.power && (
          <>
            <h1><Label zh="新能力！" /></h1>
            <p class="power-intro">
              <span class="hanzi">{radical}</span> = <Label zh={meaning?.zh ?? def.name} /> {meaning && <InkIcon name={meaning.icon} size={44} />}
            </p>
            <Truffle
              mood={powered ? 'cheer' : 'neutral'}
              accessory={visibleAccessory(kid)}
              outfit={kid.outfit}
              power={seq.power.id}
              powerTier={powered ? seq.power.tier : (kid.powerTiersSeen[seq.power.id] ?? 0)}
              size={220}
              bounce={powered}
            />
            {!powered && <HoldButton label="按住，变身！" onComplete={() => void powerUp()} />}
            {!powered && <p><Label zh="按住，变身！" /></p>}
          </>
        )}
        {phase === 'badges' && (
          <>
            <h1><Label zh="新徽章！" /></h1>
            <div class="badges stagger">
              {seq.badges.map((b) => <span key={b} class="badge"><InkIcon name="medal" size={24} /> {b} {radicalMeaning(b) && <InkIcon name={radicalMeaning(b)!.icon} size={24} />}</span>)}
            </div>
          </>
        )}
        {phase !== 'chest' && phase !== 'power' && (
          <Pet
            key={phase}
            kid={kid}
            mood="cheer"
            size={phase === 'badges' ? 200 : 170}
            bubble={phase === 'stars' ? '喵！' : undefined}
            react={phase === 'stars' ? DONE : null}
            bounce={phase !== 'stars'}
          />
        )}
        {phase !== 'chest' && (phase === 'power' ? powered : true) && (
          <button type="button" class="btn btn--primary btn--big" onClick={() => void advance()}>
            <Label zh={isLast ? '回家' : '继续'} />
          </button>
        )}
      </div>
    </div>
  );
}
