import { X } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { speak } from '../audio/speech';
import { BUILTIN, builtinWordId } from '../content';
import { cardMeaning, glossFor } from '../content/glossary';
import { collectionCards, type CharCard } from '../fun/collection';
import { POWERS, powerDef, type PowerId } from '../fun/powers';
import { completedBadges, stickerFamilies } from '../fun/stickers';
import { Label } from '../ui/Label';
import { Scene } from '../ui/Scene';
import { SpeakButton } from '../ui/SpeakButton';
import { TabBar } from '../ui/TabBar';
import { useApp } from './AppContext';
import { loadKnowledge, type Knowledge } from './knowledge';
import { InkIcon } from '../ui/icons/InkIcon';
import { ZODIAC_ORDER } from '../fun/finds';
import { ONESIES } from '../fun/costumes';
import { ANIMAL_FACES } from '../ui/worlds/tapArt';
import { DEFAULT_KID } from '../types';

type Filter = 'all' | 'gold' | 'animals' | PowerId;

/** 字卡: every built-in character as a collectible card. */
export function CollectionScreen() {
  const { db, kid } = useApp();
  const families = useMemo(() => stickerFamilies(BUILTIN), []);
  const [know, setKnow] = useState<Knowledge | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const panel = useRef<HTMLDivElement>(null);
  // a filter starts at the top: scrolled down to the badges, a new filter's cards were out of sight (parent, 2026-10-05)
  const pick = (f: Filter) => {
    setFilter(f);
    if (panel.current) panel.current.scrollTop = 0;
  };
  const [shown, setShown] = useState<CharCard | null>(null);
  const opener = useRef<HTMLElement | null>(null); // the card that opened the dialog gets focus back
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void loadKnowledge(db).then(setKnow);
  }, []);
  useEffect(() => {
    if (shown) closeBtn.current?.focus();
    else opener.current?.focus();
  }, [shown]);
  const cards = useMemo(() => (know ? collectionCards(BUILTIN, know) : []), [know]);

  if (!know) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;

  const caught = cards.filter((c) => c.caught).length;
  const visible = cards.filter((c) => (filter === 'all' ? true : filter === 'gold' ? c.gold : c.power === filter));
  const badges = [...new Set([...(kid?.badgesSeen ?? []), ...completedBadges(families, know.knownChars)])];
  const myWords = know.words.filter((w) => w.source === 'parent' && know.knownWordIds.has(w.id));
  const show = (c: CharCard, from: HTMLElement) => {
    opener.current = from;
    setShown(c);
    speak(c.char);
  };
  const backs = visible.filter((c) => !c.caught).length;
  const nudge = (el: HTMLElement) => {
    el.classList.remove('is-nudged');
    void el.offsetWidth; // restart the wiggle
    el.classList.add('is-nudged');
  };

  const shownWord = shown ? know.wordsById.get(builtinWordId(shown.char)) : undefined;
  return (
    <div class="screen">
      <Scene kind="home" />
      <header class="topbar">
        <h1 style={{ margin: 0 }}><Label zh="字卡" /></h1>
        <span class="spacer" />
        <span class="chip">{caught} / {cards.length}</span>
      </header>
      <div class="filters" role="group" aria-label="筛选">
        <button type="button" class={`chip ${filter === 'all' ? 'is-on' : ''}`} aria-pressed={filter === 'all'} onClick={() => pick('all')}>全部</button>
        <button type="button" class={`chip ${filter === 'gold' ? 'is-on' : ''}`} aria-pressed={filter === 'gold'} onClick={() => pick('gold')}><InkIcon name="sparkle" size={20} /> 金卡</button>
        <button type="button" class={`chip ${filter === 'animals' ? 'is-on' : ''}`} aria-pressed={filter === 'animals'} aria-label="找到的动物" onClick={() => pick('animals')}><InkIcon name="paw" size={20} /> 动物</button>
        {POWERS.map((p) => (
          <button key={p.id} type="button" class={`chip ${filter === p.id ? 'is-on' : ''}`} aria-pressed={filter === p.id} aria-label={p.name} onClick={() => pick(p.id)}>
            <InkIcon name={p.mark} size={20} /> <span class="hanzi">{p.name}</span>
          </button>
        ))}
      </div>
      <div class="scroll-panel" ref={panel}>
        {filter === 'animals' && (
          <div class="animals" aria-label="找到的动物">
            <p class="animals__note"><Label zh="在草丛里找一找！" /></p>
            <div class="animals__grid">
              {ZODIAC_ORDER.map((a) => {
                const found = (kid ?? DEFAULT_KID).finds.animals.includes(a);
                const name = ONESIES.find((o) => o.id === a)?.zh ?? a;
                return found ? (
                  <div key={a} class="animal-slot is-found">
                    <svg viewBox="-28 -30 56 58" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ANIMAL_FACES[a] ?? '' }} />
                    <Label zh={name} />
                  </div>
                ) : (
                  <div key={a} class="animal-slot"><span class="animal-slot__q">？</span></div>
                );
              })}
            </div>
          </div>
        )}
        {filter !== 'animals' && backs > 0 && <p class="sr-only"><Label zh={`还有 ${backs} 张没收集`} /></p>}
        <div class="zika-grid" hidden={filter === 'animals'}>
          {visible.map((c) =>
            c.caught ? (
              <button key={c.char} type="button" class={`zika${c.gold ? ' card--gold' : ''}${c.rarity === 'rare' ? ' card--rare' : ''}`} aria-label={c.char} onClick={(e) => show(c, e.currentTarget)}>
                <span class="zika__py">{c.pinyin}</span>
                <span class="zika__char hanzi">{c.char}</span>
                <span class="zika__foot">
                  <span class="zika__stars">{Array.from({ length: c.stars }, (_, i) => <InkIcon key={i} name="star" size={14} />)}</span>
                  {c.power && <InkIcon name={powerDef(c.power)!.mark} size={16} />}
                </span>
              </button>
            ) : (
              // face down: not a button (hundreds of disabled buttons are noise for VoiceOver); a tap wiggles it
              <span key={c.char} class="zika card--back" aria-hidden="true" onClick={(e) => nudge(e.currentTarget)}>
                {c.power ? <InkIcon name={powerDef(c.power)!.mark} size={30} /> : '？'}
              </span>
            ),
          )}
        </div>
        <h2><Label zh="徽章" /></h2>
        <div class="badges">
          {badges.length ? badges.map((b) => <span key={b} class="badge"><InkIcon name="medal" size={22} /> {b}</span>) : <Label zh="集齐一个家族就能得到徽章！" />}
        </div>
        {myWords.length > 0 && (
          <>
            <h2><Label zh="我的字" /></h2>
            <div class="zika-grid">
              {myWords.map((w) => (
                <button key={w.id} type="button" class="zika" aria-label={w.text} onClick={() => speak(w.text)}>
                  <span class="zika__py">{w.pinyin}</span>
                  <span class="zika__char hanzi" style={{ fontSize: w.text.length > 2 ? '28px' : '44px' }}>{w.text}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {shown && (
        <div class="zika-big" role="dialog" aria-modal="true" aria-label={`字卡：${shown.char}`} onClick={() => setShown(null)} onKeyDown={(e) => {
          if (e.key === 'Escape') setShown(null);
          if (e.key !== 'Tab') return;
          // Tab goes round inside the card (sweep): from the last button to the first, and back with Shift
          const all = [...e.currentTarget.querySelectorAll<HTMLElement>('button')];
          const edge = e.shiftKey ? all[0] : all[all.length - 1];
          if (document.activeElement === edge || !e.currentTarget.contains(document.activeElement)) {
            e.preventDefault();
            (e.shiftKey ? all[all.length - 1] : all[0])?.focus();
          }
        }}>
          <div class={`zika zika--big${shown.gold ? ' card--gold' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button ref={closeBtn} type="button" class="icon-btn zika-big__close" aria-label="关闭" onClick={() => setShown(null)}><X size={30} strokeWidth={3} /></button>
            {/* centred like the lesson cards: the character on the card's centre line, its speak button hanging to its right */}
            <span class="zika__head">
              <span class="zika__py">{shown.pinyin}</span>
              <span class="zika__char hanzi">{shown.char}</span>
              <SpeakButton text={shown.char} />
            </span>
            {/* its English, and its 组词's, as on the lesson cards (parent, 2026-10-05) */}
            {shownWord && cardMeaning(shownWord) && <span class="zika__en" lang="en">{cardMeaning(shownWord)}</span>}
            {shown.example && (
              <span class="zika__example">
                <span class="word-row__line zika__example-line"><span class="hanzi"><Label zh={shown.example} py={shownWord?.examples?.find((e) => e.text === shown.example)?.pinyin} /></span><SpeakButton text={shown.example} small /></span>
                {glossFor(shown.example) && <span class="zika__en" lang="en">{glossFor(shown.example)}</span>}
              </span>
            )}
            <span class="zika__stars">{[1, 2, 3].map((i) => <InkIcon key={i} name={i <= shown.stars ? 'star' : 'starOutline'} size={26} />)}</span>
          </div>
        </div>
      )}
      <TabBar active="stickers" />
    </div>
  );
}
