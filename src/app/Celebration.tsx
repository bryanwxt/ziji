import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx } from '../audio/sfx';
import { BUILTIN } from '../content';
import { radicalMeaning } from '../content/radicals';
import { canOpenChest, costumeById, openChest, visibleAccessory, type ChestResult } from '../fun/costumes';
import { newTiers, powerDef, powerFamilies, powerProgress, type PowerId } from '../fun/powers';
import { newBadges, stickerFamilies } from '../fun/stickers';
import { totalStars, starsOf } from '../stats/stats';
import { allSessions, getKid, saveKid } from '../store/repo';
import { DEFAULT_KID, type KidState, type SessionRecord } from '../types';
import { Chest } from '../ui/Chest';
import { HoldButton } from '../ui/HoldButton';
import { celebrate } from '../ui/confetti';
import { Label } from '../ui/Label';
import { burst, flyAlong } from '../ui/motion';
import { Pet } from '../ui/Pet';
import { Scene } from '../ui/Scene';
import { Truffle } from '../ui/truffle/Truffle';
import { useApp } from './AppContext';
import { loadKnowledge } from './knowledge';
import { InkIcon } from '../ui/icons/InkIcon';
import { accessoryById } from '../fun/accessories';

type Phase = 'stars' | 'chest' | 'power' | 'badges';

interface Sequence {
  order: Phase[];
  power: { id: PowerId; tier: number } | null; // the highest newly reached tier (shown)
  newTiers: { id: PowerId; tier: number }[];
  badges: string[];
  starsBefore: number;
}

export function Celebration({ rec }: { rec: SessionRecord }) {
  const { db, go, refresh, settings } = useApp();
  const kidRef = useRef<KidState>(DEFAULT_KID);
  const counterRef = useRef<HTMLSpanElement>(null);
  const chestRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [kid, setKid] = useState<KidState | null>(null);
  const [seq, setSeq] = useState<Sequence | null>(null);
  const [phase, setPhase] = useState<Phase>('stars');
  const [chest, setChest] = useState<ChestResult | null>(null);
  const [landed, setLanded] = useState(0);
  const [powered, setPowered] = useState(false);
  const [nudge, setNudge] = useState(0); // a tap, not a hold, on the chest: it wiggles as a hint (children tap first)
  const hint = () => setNudge((n) => n + 1);
  const stars = rec.free ? 0 : starsOf(rec.completedSteps);

  useEffect(() => {
    celebrate();
    void (async () => {
      const [k, know, sessions] = await Promise.all([getKid(db), loadKnowledge(db), allSessions(db)]);
      const kidNow = k ?? DEFAULT_KID;
      const badges = newBadges(stickerFamilies(BUILTIN), know.knownChars, kidNow.badgesSeen);
      const order: Phase[] = ['stars'];
      if (!rec.free && rec.completedSteps.length > 0 && canOpenChest(kidNow, rec.date)) order.push('chest');
      const fresh = newTiers(powerProgress(powerFamilies(BUILTIN), know.knownChars), kidNow.powerTiersSeen);
      const power = [...fresh].sort((a, b) => b.tier - a.tier)[0] ?? null;
      if (power) order.push('power');
      if (badges.length) order.push('badges');
      kidRef.current = kidNow;
      setKid(kidNow);
      setSeq({ order, power, newTiers: fresh, badges, starsBefore: totalStars(sessions, kidNow.bonusStars) - stars });
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

  if (!seq || !kid) return <div class="screen loading"><InkIcon name="star" size={88} label="加载中" /></div>;

  const save = async (next: KidState) => {
    kidRef.current = next;
    setKid(next);
    await saveKid(db, next);
  };
  const advance = async () => {
    const nextPhase = seq.order[seq.order.indexOf(phase) + 1];
    if (!nextPhase) {
      await refresh();
      go({ name: 'home' });
      return;
    }
    if (nextPhase === 'badges') {
      playSfx('levelUp');
      celebrate();
      await save({ ...kidRef.current, badgesSeen: [...kidRef.current.badgesSeen, ...seq.badges] });
    }
    setPhase(nextPhase);
  };
  const open = async () => {
    // Dated by the session's own day (a session can finish after midnight); one prize per day however fast the taps.
    if (!canOpenChest(kidRef.current, rec.date)) return;
    const { kid: next, result } = openChest(kidRef.current, rec.date, settings.zodiac);
    await save(next).catch(() => {}); // never strand the child on this screen, even if saving fails
    setChest(result);
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

  const isLast = seq.order.indexOf(phase) === seq.order.length - 1;
  const def = seq.power ? powerDef(seq.power.id)! : null;
  const radical = def?.radicals[0];
  const meaning = radical ? radicalMeaning(radical) : undefined;

  return (
    <div class="screen">
      <Scene kind="night" />
      {!rec.free && (
        <header class="topbar">
          <span class="spacer" />
          <span key={landed} ref={counterRef} class={`chip ${landed ? 'is-bumping' : ''}`}><InkIcon name="star" size={20} /> {seq.starsBefore + landed}</span>
        </header>
      )}
      <div class="celebrate celebrate--night">
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
              </>
            )}
          </>
        )}
        {phase === 'chest' && (
          <>
            <h1><Label zh={chest ? (chest.kind === 'costume' ? '松露有新衣服了！' : chest.kind === 'accessory' ? '松露有新东西了！' : `多了 ${chest.amount} 颗星！`) : '宝箱！'} /></h1>
            {chest && (
              <div class="prize">
                {chest.kind === 'costume' ? (
                  <div class="prize__costume">
                    <Truffle mood="cheer" outfit={chest.id} accessory={null} size={190} bounce />
                    <Label zh={costumeById(chest.id)?.zh ?? ''} py={costumeById(chest.id)?.py} />
                  </div>
                ) : chest.kind === 'accessory' ? (
                  <div class="prize__costume">
                    <Truffle mood="cheer" outfit={kid.outfit} accessory={chest.item} size={190} bounce />
                    <Label zh={accessoryById(chest.item)?.zh ?? ''} py={accessoryById(chest.item)?.py} />
                  </div>
                ) : (
                  <span class="prize__stars"><InkIcon name="star" size={72} /><InkIcon name="star" size={72} /><InkIcon name="star" size={72} /></span>
                )}
              </div>
            )}
            <div ref={chestRef} key={nudge} class={nudge && !chest ? 'chest-hint' : undefined}>
              <div class="chest-art" onClick={chest ? undefined : hint}><Chest open={!!chest} /></div>
              {!chest && <HoldButton label="按住打开宝箱" onComplete={() => void open()} onTooShort={hint} />}
            </div>
            {!chest && <p><Label zh="按住，打开宝箱！" /></p>}
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
            bounce
          />
        )}
        {(phase === 'chest' ? !!chest : phase === 'power' ? powered : true) && (
          <button type="button" class="btn btn--primary btn--big" onClick={() => void advance()}>
            <Label zh={isLast ? '回家' : '继续'} />
          </button>
        )}
      </div>
    </div>
  );
}
