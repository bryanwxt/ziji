import { useEffect, useState } from 'preact/hooks';
import { BUILTIN } from '../content';
import { ACCESSORY_DEFS } from '../fun/accessories';
import { accessoryThumb } from '../ui/truffle/accessories';
import { costumeById, ONESIES, OUTFITS } from '../fun/costumes';
import { POWERS, powerFamilies, powerProgress, type PowerProgress } from '../fun/powers';
import { saveKid } from '../store/repo';
import { DEFAULT_KID, type KidState } from '../types';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { Scene } from '../ui/Scene';
import { TabBar } from '../ui/TabBar';
import { Truffle } from '../ui/truffle/Truffle';
import { useApp } from './AppContext';
import { loadKnowledge } from './knowledge';
import { InkIcon } from '../ui/icons/InkIcon';
import { currentWorld, WORLDS } from '../fun/worlds';
import { SCENES } from '../ui/worlds/scenes';
import { GEM } from '../ui/worlds/tapArt';

type RoomTab = 'outfits' | 'powers' | 'places';
const ROOM_TABS: [RoomTab, string][] = [['outfits', '服装'], ['powers', '能力'], ['places', '地方']];

const SLOT_TITLE = { face: '脸上', neck: '脖子上', held: '手里', back: '背上' } as const;

/** Truffle's room: what he wears and which power he shows. */
export function Wardrobe() {
  const { db, refresh, kid } = useApp();
  const [k, setK] = useState<KidState>({ ...DEFAULT_KID, ...kid });
  const [tab, setTab] = useState<RoomTab>('outfits');
  const [progress, setProgress] = useState<PowerProgress[] | null>(null);

  useEffect(() => {
    void loadKnowledge(db).then((know) => setProgress(powerProgress(powerFamilies(BUILTIN), know.knownChars)));
  }, []);

  const save = async (next: KidState) => {
    setK(next);
    await saveKid(db, next);
    await refresh();
  };

  return (
    <div class="screen">
      <Scene kind="home" />
      <div class="center room">
        <Pet kid={k} mood="content" size={180} />
        <div class="room__tabs" role="tablist" aria-label="松露的房间">
          {ROOM_TABS.map(([id, zh], i) => (
            <button
              key={id}
              id={`room-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="room-panel"
              tabIndex={tab === id ? 0 : -1}
              class={`chip ${tab === id ? 'is-on' : ''}`}
              onClick={() => setTab(id)}
              onKeyDown={(e) => {
                const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const [next] = ROOM_TABS[(i + step + ROOM_TABS.length) % ROOM_TABS.length]!;
                setTab(next);
                document.getElementById(`room-tab-${next}`)?.focus();
              }}
            >
              {zh}
            </button>
          ))}
        </div>
        {tab === 'outfits' ? (
          <div class="outfits scroll-panel" role="tabpanel" id="room-panel" aria-labelledby={`room-tab-${tab}`}>
            {([['生肖', ONESIES], ['衣服', OUTFITS]] as const).map(([title, list]) => (
              <section key={title}>
                <h2><Label zh={title} /></h2>
                <div class="outfit-grid">
                  {list.map((c) => {
                    const owned = k.ownedCostumes.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        class={`outfit ${k.outfit === c.id ? 'is-on' : ''}`}
                        aria-label={c.zh}
                        aria-pressed={k.outfit === c.id}
                        disabled={!owned}
                        onClick={() => void save({ ...k, outfit: k.outfit === c.id ? null : c.id })}
                      >
                        {owned ? (
                          <span class="outfit__preview" aria-hidden="true"><Truffle mood="content" outfit={c.id} accessory={null} size={64} /></span>
                        ) : (
                          <span class="outfit__swatch"><InkIcon name="lock" size={20} /></span>
                        )}
                        <span class="outfit__name"><Label zh={c.zh} py={c.py} /></span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            <section class="outfits__none">
              <button type="button" class={`outfit ${k.wearing === null ? 'is-on' : ''}`} aria-label="不戴" aria-pressed={k.wearing === null} onClick={() => void save({ ...k, wearing: null })}>
                <InkIcon name="none" size={36} />
                <span class="outfit__name"><Label zh="不戴" /></span>
              </button>
              <p class="outfits__note"><Label zh="一次戴一个小东西" /></p>
            </section>
            {(['face', 'neck', 'held', 'back'] as const).map((slot) => (
              <section key={slot}>
                <h2><Label zh={SLOT_TITLE[slot]} /></h2>
                <div class="outfit-grid">
                  {ACCESSORY_DEFS.filter((d) => d.slot === slot).map((d) => {
                    const owned = k.ownedAccessories.includes(d.id);
                    const thumb = accessoryThumb(d.id)!;
                    return (
                      <button key={d.id} type="button" class={`outfit ${k.wearing === d.id ? 'is-on' : ''}`} aria-label={d.zh} aria-pressed={k.wearing === d.id} disabled={!owned} onClick={() => void save({ ...k, wearing: k.wearing === d.id ? null : d.id })}>
                        {owned ? (
                          <svg class="acc-thumb" viewBox={thumb.viewBox} width="64" height="48" aria-hidden="true" dangerouslySetInnerHTML={{ __html: thumb.markup }} />
                        ) : (
                          <InkIcon name="lock" size={32} />
                        )}
                        <span class="outfit__name"><Label zh={d.zh} py={d.py} /></span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : tab === 'places' ? (
          <div class="places scroll-panel" role="tabpanel" id="room-panel" aria-labelledby={`room-tab-${tab}`}>
            <div class="gem-jar" aria-label={`${k.finds.gems} 颗宝石`}>
              <svg class="gem-jar__glass" viewBox="-60 -70 120 140" aria-hidden="true">
                <path d="M-40 -46 h80 v8 h-6 v86 a16 16 0 0 1 -16 16 h-36 a16 16 0 0 1 -16 -16 v-86 h-6Z" fill="#e4efff" stroke="#2a2630" stroke-width="3" stroke-linejoin="round" />
                {Array.from({ length: Math.min(k.finds.gems, 24) }, (_, i) => (
                  <g key={i} class="gem" transform={`translate(${-24 + (i % 4) * 16} ${46 - Math.floor(i / 4) * 14}) scale(0.55)`} dangerouslySetInnerHTML={{ __html: GEM }} />
                ))}
              </svg>
              <Label zh={`${k.finds.gems} 颗宝石`} />
            </div>
            {WORLDS.map((w) => {
              const reached = w.id === 'yard' || k.worldsSeen.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  class={`place ${reached ? '' : 'is-locked'}`}
                  aria-pressed={currentWorld(k) === w.id}
                  disabled={!reached}
                  onClick={() => void save({ ...k, world: w.id })}
                >
                  <span class="grainy place__frame"><svg class="place__thumb" viewBox="0 160 360 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SCENES[w.id] }} /></span>
                  <Label zh={w.zh} />
                  {!reached && (
                    <span class="place__lock"><InkIcon name="lock" size={20} /> <Label zh={`${w.at} 个字`} /></span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div class="powers scroll-panel" role="tabpanel" id="room-panel" aria-labelledby={`room-tab-${tab}`}>
            {POWERS.map((p) => {
              const pr = progress?.find((x) => x.id === p.id);
              const tier = k.powerTiersSeen[p.id] ?? 0;
              const ready = (pr?.tier ?? 0) > tier; // earned, unlocked at the next celebration
              return (
                <button
                  key={p.id}
                  type="button"
                  class={`power-row ${k.activePower === p.id ? 'is-on' : ''}`}
                  aria-label={`${p.name} ${tier > 0 ? `${tier}级` : '还没解锁'} ${pr?.known ?? 0}/${pr?.size ?? 0}${ready ? ' 完成练习就解锁' : ''}`}
                  aria-pressed={k.activePower === p.id}
                  disabled={tier === 0}
                  onClick={() => void save({ ...k, activePower: p.id })}
                >
                  <span class="power-row__mark"><InkIcon name={tier > 0 ? p.mark : 'lock'} size={30} /></span>
                  <span class="power-row__name hanzi">{p.radicals[0]}</span>
                  {ready && <span class="power-row__ready"><InkIcon name="sparkle" size={16} /> <Label zh="完成练习就解锁" /></span>}
                  <span class="power-row__pips" aria-hidden="true">{[1, 2, 3].map((t) => <i key={t} class={t <= tier ? 'is-on' : ''} style={t <= tier ? { background: p.color } : undefined} />)}</span>
                  <span class="power-row__count">{pr?.known ?? 0}/{pr?.size ?? 0}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <TabBar active="wardrobe" />
    </div>
  );
}
