// Feedback states the walking sweep can't reach on its own (review I1/I2): a wrong 选一选 answer with a long bank clue,
// and the stage card's size with a neutral vs a feedback sheet. Bundled by stage-cases.ts and opened in WebKit.
import { render } from 'preact';
import { useState } from 'preact/hooks';
import '../../src/styles.css';
import { UseQuestion } from '../../src/activities/choose/UseQuestion';
import { DEFAULT_KID } from '../../src/types';
import { FeedbackSheet } from '../../src/ui/stage/FeedbackSheet';
import { Stage } from '../../src/ui/stage/Stage';
import { Pet } from '../../src/ui/Pet';
import { Truffle } from '../../src/ui/truffle/Truffle';
import { Label } from '../../src/ui/Label';
import { PairGame } from '../../src/activities/practice/PairGame';
import { BuildSentence } from '../../src/activities/practice/BuildSentence';
import { ComponentsStep } from '../../src/activities/components/ComponentsStep';
import { fishItem } from '../../src/activities/components/zibian';
import { dapeiQuestion, zuciBoard } from '../../src/practice/pairs';
import { MatchQuestion } from '../../src/activities/practice/MatchQuestion';
import { WorldScene } from '../../src/ui/worlds/WorldScene';
import { WorldProps } from '../../src/ui/worlds/WorldProps';
import { sceneFor } from '../../src/ui/worlds/scenes';
import { WORLDS, type WorldId } from '../../src/fun/worlds';
import { DEFAULT_FINDS } from '../../src/fun/finds';
import { burstStyle } from '../../src/ui/worlds/burst';
import type { ReactionKind } from '../../src/ui/truffle/timelines';
import { IdiomQuestion } from '../../src/activities/practice/IdiomQuestion';
import { FlashcardStep } from '../../src/activities/flashcards/FlashcardStep';
import { builtinIdiom, chengyuOf } from '../../src/content/chengyu';
import { idiomFitItem, idiomGap, idiomZuju } from '../../src/practice/idioms';
import { builtinWords } from '../../src/content';
import { mulberry32 } from '../../src/lib/random';
import { PRESETS, type Expression } from '../../src/ui/truffle/rig';
import { PAW_TRACKS, type Reaction } from '../../src/ui/truffle/timelines';

const screen = (body: preact.ComponentChildren) => (
  <div class="screen">
    <header class="lessonbar"><button type="button" class="icon-btn">✕</button></header>
    {body}
  </div>
);
const clue = { kind: 'fit' as const, wordId: null, word: '连忙', before: '看到老师来了，他', after: '站起来。', options: ['连忙', '从来', '互相', '本来'], clue: '连忙：说已经发生的事；叫别人快一点用"赶快"' };
const which = new URLSearchParams(location.search).get('case');
if (which?.startsWith('alive') || which === 'moments') {
  // spec 2026-10-04 §6: each frame's own work (script, then the style and layout it causes) is timed, not just the frame rate
  const raw = window.requestAnimationFrame.bind(window);
  const work: number[] = [];
  (window as unknown as { rafWork: number[] }).rafWork = work;
  window.requestAnimationFrame = (cb) => raw((t) => {
    const s = performance.now();
    cb(t);
    document.body.getBoundingClientRect(); // flush the style and layout this frame's writes caused
    work.push(performance.now() - s);
  });
}
/** One live Truffle on a lesson stage; the check calls window.react('right') to make him react (spec 2026-10-04 §4, §6). */
function Alive({ calm }: { calm: boolean }) {
  const [react, setReact] = useState<Reaction | null>(null);
  (window as unknown as { react: (kind: Reaction['kind']) => void }).react = (kind) => setReact((r) => ({ kind, key: (r?.key ?? 0) + 1 }));
  return screen(
    <Stage activity="flash" truffle={<Pet kid={DEFAULT_KID} size={180} alive calm={calm} react={react} />} sheet={<FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />}>
      <div style="width:200px;height:200px" />
    </Stage>,
  );
}
const app = document.getElementById('app')!;
if (which === 'faces') {
  // every expression × a few looks (spec 2026-10-04 §4.1): read by eye, and checked to stay inside his box
  const looks: { label: string; props: Record<string, unknown> }[] = [
    { label: 'plain', props: {} }, { label: 'rabbit', props: { outfit: 'rabbit' } }, { label: 'chef', props: { outfit: 'chef' } },
    { label: 'sunglasses', props: { accessory: 'sunglasses' } }, { label: 'fire 3', props: { power: 'fire', powerTier: 3 } },
  ];
  render(
    <div style="display:grid;grid-template-columns:90px repeat(11, 82px);gap:2px;padding:8px;background:#f6f1df;font:11px sans-serif">
      <span />
      {(Object.keys(PRESETS) as Expression[]).map((e) => <span key={e}>{e}</span>)}
      {looks.map((l) => [<span key={l.label}>{l.label}</span>, ...(Object.keys(PRESETS) as Expression[]).map((e) => <Truffle key={`${l.label}-${e}`} expression={e} size={80} label={null} {...l.props} />)])}
      <span>paws</span>
      {(Object.keys(PAW_TRACKS) as (keyof typeof PAW_TRACKS)[]).map((k) => {
        // each paw move at its furthest (spec 2026-10-04 §4.6), to look over and to check it stays inside his box
        let best = PAW_TRACKS[k](0)!;
        const size = (p: typeof best) => Math.abs(p.lx) + Math.abs(p.ly) + Math.abs(p.rx) + Math.abs(p.ry);
        for (let t = 0; t < 3000; t += 16) { const p = PAW_TRACKS[k](t); if (!p) break; if (size(p) > size(best)) best = p; }
        return <Truffle key={`paw-${k}`} expression="happy" size={80} label={null} paws={best} />;
      })}
    </div>,
    app,
  );
} else if (which === 'alive' || which === 'alive-calm') render(<Alive calm={which === 'alive-calm'} />, app);
else if (which === 'clue') render(screen(<UseQuestion item={clue} kid={DEFAULT_KID} resting="sulk" onAnswer={() => {}} onNext={() => {}} />), app);
else if (which === 'pair' || which === 'match' || which === 'build' || which === 'fish') {
  // 练一练's new questions (spec 2026-10-05 §3.2, §3.4): pairing, 组句 and 钓鱼 for a look-alike he confused
  const words = builtinWords(0);
  const w = (t: string) => words.find((x) => x.text === t)!;
  const rng = mulberry32(3);
  const body =
    which === 'pair' ? <PairGame board={zuciBoard(w('火'), rng)!} kind="pair" kid={DEFAULT_KID} resting="sulk" onDone={() => {}} />
    : which === 'match' ? <MatchQuestion question={dapeiQuestion(w('穿'), rng)!} kid={DEFAULT_KID} resting="sulk" onDone={() => {}} />
    : which === 'build' ? <BuildSentence item={{ full: '我和哥哥都喜欢打球。', tiles: ['我', '和', '哥哥', '都', '喜欢', '打球。'], orders: [['我', '和', '哥哥', '都', '喜欢', '打球。']] }} word={w('和')} kid={DEFAULT_KID} resting="sulk" onDone={() => {}} />
    : <ComponentsStep items={[fishItem(w('根'), ['跟'], new Set(), rng)!]} kid={DEFAULT_KID} resting="sulk" onAnswer={() => {}} onDone={() => {}} />;
  render(screen(body), app);
}
else if (which === 'worlds') {
  // every world by day and by evening, for the parent to look over (spec 2026-10-04 §2)
  const cell = (w: WorldId, t: 'afternoon' | 'evening') => `<figure style="margin:0"><svg viewBox="0 0 360 480" width="180" height="240">${sceneFor(w, t)}</svg><figcaption>${w} · ${t}</figcaption></figure>`;
  app.innerHTML = `<div style="display:grid;grid-template-columns:repeat(8,180px);gap:6px;padding:8px;font:11px sans-serif;background:#fff">${WORLDS.map((w) => cell(w.id, 'afternoon')).join('')}${WORLDS.map((w) => cell(w.id, 'evening')).join('')}</div>`;
}
else if (which === 'bursts') {
  // the celebration's sunburst in every world's colours, with its heading, for the parent to look over (phase D)
  render(
    <div style="display:grid;grid-template-columns:repeat(4,240px);gap:8px;padding:8px;background:#fff">
      {WORLDS.map((w) => (
        <div key={w.id} style="position:relative;height:300px;overflow:hidden;border-radius:12px;transform:translateZ(0)">
          <div class="burst" style={burstStyle(w.id)} />
          <div class="celebrate celebrate--burst" style="position:relative;height:100%"><h1><Label zh="太棒了！" /></h1><Truffle mood="cheer" size={110} /><p>{w.id}</p></div>
        </div>
      ))}
    </div>,
    app,
  );
}
else if (which === 'moments') {
  // Home's world with its props and a live Truffle: each moment is tapped and its frames timed (spec 2026-10-04 §6)
  const world = (new URLSearchParams(location.search).get('world') ?? 'yard') as WorldId;
  const kid = { ...DEFAULT_KID, finds: { ...DEFAULT_FINDS } };
  function Moments() {
    const [react, setReact] = useState<{ kind: ReactionKind; key: number } | null>(null);
    return (
      <div class="screen home">
        <WorldScene world={world} time="afternoon" />
        <WorldProps world={world} kid={kid} today="2026-10-06" onKid={() => {}} onSay={() => {}} onReact={(kind) => setReact((r) => ({ kind, key: (r?.key ?? 0) + 1 }))} autoEvery={1e9} />
        <div style="position:fixed;left:50%;bottom:120px;transform:translateX(-50%)"><Pet kid={kid} size={150} alive react={react} /></div>
      </div>
    );
  }
  render(<Moments />, app);
}
else if (which === 'intro-school-idiom') {
  // a school 成语's own 认新字 card (final review I3): four characters where the card expects one
  const words = builtinWords(0);
  const w = { ...words[0]!, id: 'p:1', text: '五颜六色', pinyin: 'wǔ yán liù sè', source: 'parent' as const, level: null, rank: null, tags: ['成语'], meaning: 'all kinds of bright colours', examples: [], sentences: [{ text: '公园里的花五颜六色。', pinyin: '' }] };
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: true, retry: false }} ask="listen" word={w} pool={[...words, w]} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />), app);
}
else if (which === 'idiom' || which === 'idiom-fit' || which === 'idiom-build' || which === 'intro-idiom') {
  // 成语 (spec 2026-10-05 §2.1, §3.2 rung 5): the list's longest sentence on each question, its longest meaning on the card
  const words = builtinWords(0);
  const idiom = builtinIdiom('美中不足')!;
  const rng = mulberry32(3);
  const yan = words.find((x) => x.text === '足')!;
  const cheng = words.find((x) => x.text === '成')!;
  const body =
    which === 'idiom' ? <IdiomQuestion gap={idiomGap(idiom, '足', rng)!} kid={DEFAULT_KID} resting="sulk" onDone={() => {}} />
    : which === 'idiom-fit' ? <UseQuestion item={idiomFitItem(idiom, null, rng)!} kid={DEFAULT_KID} resting="sulk" onAnswer={() => {}} onNext={() => {}} />
    : which === 'idiom-build' ? <BuildSentence item={idiomZuju(idiom, rng)!} word={{ ...yan, text: idiom.text }} kid={DEFAULT_KID} resting="sulk" onDone={() => {}} />
    : <FlashcardStep item={{ wordId: cheng.id, isNew: true, retry: false }} ask="listen" word={cheng} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} idiom={builtinIdiom('胸有成竹')!} onDone={() => {}} />;
  render(screen(body), app);
}
else render(screen(
  <Stage activity="write" truffle={<Pet kid={DEFAULT_KID} size={180} />} sheet={which === 'good' ? <FeedbackSheet tone="good" title="写得好！" actionLabel="完成" onAction={() => {}} /> : <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />}>
    <div style="width:200px;height:200px" />
  </Stage>,
), app);
