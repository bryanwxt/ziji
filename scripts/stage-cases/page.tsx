// Feedback states the walking sweep can't reach on its own (review I1/I2): a wrong 选一选 answer with a long bank clue,
// and the stage card's size with a neutral vs a feedback sheet. Bundled by stage-cases.ts and opened in WebKit.
import { render, type JSX } from 'preact';
import ch03 from '../../docs/story/season-1/ch03.md';
import { parseChapter, slotsIn, type Line } from '../../src/story/format';
import { SWATCH } from '../../src/ui/truffle/paint';
import { GRANNY_POSES, GrannyDragon } from '../../src/ui/story/GrannyDragon';
import { useState } from 'preact/hooks';
import '../../src/styles.css';
import { UseQuestion } from '../../src/activities/choose/UseQuestion';
import { DEFAULT_KID } from '../../src/types';
import { FeedbackSheet } from '../../src/ui/stage/FeedbackSheet';
import { Stage } from '../../src/ui/stage/Stage';
import { Pet } from '../../src/ui/Pet';
import { Truffle } from '../../src/ui/truffle/Truffle';
import { COSTUMES } from '../../src/fun/costumes';
import { Label } from '../../src/ui/Label';
import { PairGame } from '../../src/activities/practice/PairGame';
import { BuildSentence } from '../../src/activities/practice/BuildSentence';
import { ComponentsStep } from '../../src/activities/components/ComponentsStep';
import { fishItem } from '../../src/activities/components/zibian';
import { dapeiQuestion, zuciBoard } from '../../src/practice/pairs';
import { MatchQuestion } from '../../src/activities/practice/MatchQuestion';
import { UnderstandQuestion } from '../../src/activities/practice/UnderstandQuestion';
import { understandItem, type UnderstandItem } from '../../src/practice/understand';
import { inScopeWords, SENTENCE_TERMS } from '../../src/content/understand';
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
import { ladderWords } from '../../src/content/ladder';
import { cardMeaning } from '../../src/content/glossary';
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
else if (which === 'understand') {
  // the Understand question (plan 2b), with the longest English among the written sentences: the tightest card
  const items = SENTENCE_TERMS.flatMap((t) => inScopeWords(t)).map((w) => understandItem(w, mulberry32(1))).filter((x): x is UnderstandItem => !!x);
  const item = items.sort((a, b) => Math.max(...b.choices.map((c) => c.length)) - Math.max(...a.choices.map((c) => c.length)))[0]!;
  render(screen(<UnderstandQuestion item={item} kid={DEFAULT_KID} resting="sulk" onDone={() => {}} />), app);
}
else if (which === 'worlds') {
  // every world by day and by evening, for the parent to look over (spec 2026-10-04 §2)
  const cell = (w: WorldId, t: 'afternoon' | 'evening') => `<figure style="margin:0"><svg viewBox="0 0 360 480" width="180" height="240">${sceneFor(w, t)}</svg><figcaption>${w} · ${t}</figcaption></figure>`;
  app.innerHTML = `<div style="display:grid;grid-template-columns:repeat(8,180px);gap:6px;padding:8px;font:11px sans-serif;background:#fff">${WORLDS.map((w) => cell(w.id, 'afternoon')).join('')}${WORLDS.map((w) => cell(w.id, 'evening')).join('')}</div>`;
}
else if (which === 'costumes') {
  // every costume, shelf by shelf, for the parent to look over (2026-10-06: easy to tell apart?)
  render(
    <div style="display:grid;grid-template-columns:repeat(8,150px);gap:6px;padding:8px;background:#fbf6ea;font:600 13px sans-serif;text-align:center">
      {COSTUMES.map((c) => <div key={c.id}><Truffle mood="cheer" outfit={c.id} size={140} /><div>{c.zh}</div></div>)}
    </div>,
    app,
  );
}
else if (which === 'story-page') {
  // the picture-book test page (spec 3b §8): chapter 3, setup page 2 — a still mock for judging the art, not the 3c reader
  const page = parseChapter(ch03).setup[1]!;
  const hasBg = new URLSearchParams(location.search).get('bg') !== '0';
  const slot = (zh: string, en: string, state: 'new' | 'learning' | 'owned') =>
    state === 'new' ? <span class="sp-slot">{en}</span>
    : state === 'owned' ? <span class="sp-slot sp-slot--zh" lang="zh">{zh}</span>
    : <span class="sp-slot sp-slot--learning"><span lang="zh">{zh}</span><small>{en}</small></span>;
  const words = (text: string) => {
    const out: (string | JSX.Element)[] = [];
    let last = 0;
    for (const m of text.matchAll(/\{([^|{}]+)\|([^{}]+)\}/g)) {
      out.push(text.slice(last, m.index));
      out.push(slot(m[1]!, m[2]!, 'learning'));
      last = m.index! + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  };
  const line = (l: Line, i: number) =>
    l.kind === 'speech' ? <p key={i} class="sp-bubble"><b>{l.who}</b> {words(l.text)}</p>
    : l.kind === 'scene' ? null
    : <p key={i} class="sp-text">{words(l.text)}</p>;
  const first = slotsIn(page.lines.map((l) => ('text' in l ? l.text : '')).join(' '))[0]!;
  render(
    <div class="sp-page">
      <style>{`
        .sp-page { min-height: 100dvh; display: flex; flex-direction: column; align-items: center; background: ${SWATCH.cream}; font-family: Nunito, sans-serif; color: #3a3440; }
        .sp-pic { position: relative; width: min(100%, calc(50dvh * 4 / 3)); aspect-ratio: 4 / 3; background: ${hasBg ? 'url(bg/hdb-voiddeck.webp) center/cover' : 'linear-gradient(#a9d3e8, #f6ecd6 60%, #d9cdb4)'}; border-radius: 0 0 18px 18px; overflow: hidden; }
        .sp-pending { position: absolute; top: 8px; left: 10px; font-size: 12px; color: #8a8494; }
        .sp-cast { position: absolute; left: 0; right: 0; bottom: 6%; height: 34%; display: flex; justify-content: center; align-items: flex-end; gap: 6%; }
        .sp-cast svg { height: 100%; width: auto; }
        .sp-words { width: min(100%, 720px); padding: 10px 18px 6px; box-sizing: border-box; font-size: clamp(18px, 2.6dvh, 24px); line-height: 1.4; }
        .sp-text { margin: 0 0 6px; }
        .sp-bubble { margin: 0 0 6px; background: #fffdf7; border: 2px solid #e2d6bd; border-radius: 14px; padding: 3px 10px; }
        .sp-bubble b { color: #8a6f3a; margin-right: 4px; }
        .sp-slot--zh, .sp-slot--learning span { font-family: var(--hanzi, serif); font-size: 1.25em; color: #2f6f55; }
        .sp-slot--learning { display: inline-flex; flex-direction: column; align-items: center; line-height: 1; vertical-align: -0.35em; margin: 0 2px; }
        .sp-slot--learning small { font-size: 0.5em; color: #8a8494; margin-top: 2px; }
        .sp-states { display: flex; gap: 16px; justify-content: center; font-size: 13px; color: #8a8494; padding: 0 0 6px; }
        .sp-states div { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .sp-states span:first-child { font-size: 18px; color: #3a3440; }
      `}</style>
      <div class="sp-pic" data-testid="sp-pic">
        {!hasBg && <span class="sp-pending">painting pending</span>}
        <div class="sp-cast">
          <Truffle mood="pleased" label={null} size={160} />
          <GrannyDragon pose="smile" label={null} size={160} />
        </div>
      </div>
      <div class="sp-words" data-testid="sp-words">{page.lines.map(line)}</div>
      <div class="sp-states">
        <div>{slot(first.zh, first.en, 'new')}<span>not met</span></div>
        <div>{slot(first.zh, first.en, 'learning')}<span>learning</span></div>
        <div>{slot(first.zh, first.en, 'owned')}<span>owned</span></div>
      </div>
    </div>,
    app,
  );
}
else if (which === 'granny') {
  // Granny Dragon's poses for the parent (spec 3b §6), then mirrored and talking
  render(
    <div style="display:flex;gap:10px;padding:12px;background:#f6ecd6;font:600 13px sans-serif;text-align:center;align-items:flex-end">
      {GRANNY_POSES.map((p) => <div key={p}><GrannyDragon pose={p} size={190} /><div>{p}</div></div>)}
      <div><GrannyDragon pose="smile" size={190} mirror talking /><div>mirror + talking</div></div>
    </div>,
    app,
  );
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
else if (which === 'hear' || which === 'hear-long' || which === 'hear-read') {
  // the word ladder's Hear question (spec 2026-10-06 §3.2): English meanings as the choices; hear-long picks the ladder words
  // with the longest English, hear-read the same as a read-for-meaning question
  const lw = ladderWords();
  const pool = [...builtinWords(0), ...lw];
  const longest = [...lw].sort((a, b) => (cardMeaning(b)?.length ?? 0) - (cardMeaning(a)?.length ?? 0));
  const w = which === 'hear' ? builtinWords(0).find((x) => x.text === '门')! : longest[0]!;
  const near = which === 'hear' ? pool : [w, ...longest.slice(1, 4)];
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false }} ask={which === 'hear-read' ? 'meaningRead' : 'hear'} word={w} pool={near} voice kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />), app);
}
else if (which === 'intro-school-idiom') {
  // a school 成语's own 认新字 card (final review I3): four characters where the card expects one
  const words = builtinWords(0);
  const w = { ...words[0]!, id: 'p:1', text: '五颜六色', pinyin: 'wǔ yán liù sè', source: 'parent' as const, level: null, rank: null, tags: ['成语'], meaning: 'all kinds of bright colours', examples: [], sentences: [{ text: '公园里的花五颜六色。', pinyin: '' }] };
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: true, retry: false }} ask="listen" word={w} pool={[...words, w]} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />), app);
}
else if (which === 'idiom' || which === 'idiom-fit' || which === 'idiom-build' || which === 'intro-idiom' || which === 'intro-idiom-word') {
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
    : which === 'intro-idiom-word' ? (() => { // a card with no usage line: a 组词 with its English before the 成语 (parent, 2026-10-05: 一)
      const yi = words.find((x) => x.text === '一')!;
      return <FlashcardStep item={{ wordId: yi.id, isNew: true, retry: false }} ask="listen" word={yi} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} idiom={builtinIdiom('一心一意')!} onDone={() => {}} />;
    })()
    : <FlashcardStep item={{ wordId: cheng.id, isNew: true, retry: false }} ask="listen" word={cheng} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} idiom={builtinIdiom('胸有成竹')!} onDone={() => {}} />;
  render(screen(body), app);
}
else render(screen(
  <Stage activity="write" truffle={<Pet kid={DEFAULT_KID} size={180} />} sheet={which === 'good' ? <FeedbackSheet tone="good" title="写得好！" actionLabel="完成" onAction={() => {}} /> : <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />}>
    <div style="width:200px;height:200px" />
  </Stage>,
), app);
