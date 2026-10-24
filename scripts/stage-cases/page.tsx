// Feedback states the walking sweep can't reach on its own (review I1/I2): a wrong 选一选 answer with a long bank clue,
// and the stage card's size with a neutral vs a feedback sheet. Bundled by stage-cases.ts and opened in WebKit.
import { render, type JSX } from 'preact';
import { AppContext, type AppData } from '../../src/app/AppContext';
import { setSpeaking } from '../../src/audio/speaking';
import { openAppDb } from '../../src/store/db';
import { addReviewLog } from '../../src/store/repo';
import { StoryScreen } from '../../src/story/StoryScreen';
import { PetSetup, schoolLine } from '../../src/app/PetSetup';
import { DEFAULT_SETTINGS, type Grade } from '../../src/types';
import ch03 from '../../src/content/story/season-1/ch03.md';
import { parseChapter, slotsIn, type Line } from '../../src/story/format';
import { SWATCH } from '../../src/ui/truffle/paint';
import { GRANNY_POSES, GrannyDragon } from '../../src/ui/story/GrannyDragon';
import { useState } from 'preact/hooks';
import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-400-italic.css';
import '@fontsource/literata/latin-700.css';
import '../../src/styles.css';
import { UseQuestion } from '../../src/activities/choose/UseQuestion';
import { DEFAULT_KID } from '../../src/types';
import { FeedbackSheet } from '../../src/ui/stage/FeedbackSheet';
import { Stage } from '../../src/ui/stage/Stage';
import { Pet } from '../../src/ui/Pet';
import { Truffle } from '../../src/ui/truffle/Truffle';
import { COSTUMES, costumeById } from '../../src/fun/costumes';
import { SHEET_CELL_HEIGHT, SHEET_COLUMNS } from './faceProbe';
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
import { CREATURES } from './creatures';
import { WORLDS, type WorldId } from '../../src/fun/worlds';
import { DEFAULT_FINDS } from '../../src/fun/finds';
import { burstStyle } from '../../src/ui/worlds/burst';
import type { ReactionKind } from '../../src/ui/truffle/timelines';
import { IdiomQuestion } from '../../src/activities/practice/IdiomQuestion';
import { FlashcardStep, introIdiom } from '../../src/activities/flashcards/FlashcardStep';
import { builtinIdiom, chengyuOf, idiomsFor } from '../../src/content/chengyu';
import { idiomFitItem, idiomGap, idiomZuju } from '../../src/practice/idioms';
import { builtinWords, PASSAGES } from '../../src/content';
import { LangduStep, type LangduPart } from '../../src/activities/langdu/LangduStep';
import { askedOf, longestBack, LONGEST_OWN, questionsOf } from './langdu';
import { ladderWords } from '../../src/content/ladder';
import { questionMeaning } from '../../src/content/glossary';
import { mulberry32 } from '../../src/lib/random';
import { PRESETS, type Expression } from '../../src/ui/truffle/rig';
import { PAW_TRACKS, type PawPose, type Reaction } from '../../src/ui/truffle/timelines';
import { ListenRows } from '../../src/parent/ListenPanel';
import type { Passage, Recording } from '../../src/types';
import { PinyinFade } from '../../src/ui/pinyinFade';
import { FamilyQuestion } from '../../src/activities/practice/FamilyQuestion';
import { familyBoard } from '../../src/practice/family';
import { fillGap, SENTENCE_BANK } from '../../src/content/sentenceBank';
import { WritingStep } from '../../src/activities/writing/WritingStep';
import { RecallQuestion } from '../../src/activities/practice/RecallQuestion';
import { writingCue } from '../../src/activities/writing/cue';
import { SentenceCard } from '../../src/activities/say/SentenceCard';
import { wordCue } from '../../src/activities/flashcards/meaning';
import zao from 'hanzi-writer-data/澡.json';
import { listCardFor } from '../../src/weeklist/plan';
import { fitUseItem } from '../../src/weeklist/fit';
import { listBoard } from '../../src/practice/pairs';
import { pairGloss } from '../../src/practice/missNote';
import type { WeekList, Word } from '../../src/types';
import { CheckEnd, type MissRow } from '../../src/app/CheckScreen';
import { TalkCards, TalkLogger } from '../../src/parent/TalkSection';
import { TryLine } from '../../src/parent/TryThis';
import { WeekView } from '../../src/parent/WeekSummaryPanel';
import { pickDay } from '../../src/talk/pick';
import { talkWord } from '../../src/talk/load';
import { weekRange, type WeekSummary } from '../../src/talk/week';

const screen = (body: preact.ComponentChildren) => (
  <div class="screen">
    <header class="lessonbar"><button type="button" class="icon-btn">✕</button></header>
    {body}
  </div>
);
/** The app word whose sentence-bank example (说一句's model sentence) is the longest: the tightest 说一句 card and Listen row. */
function longestSentenceWord() {
  const byText = new Map([...builtinWords(0), ...ladderWords()].map((w) => [w.text, w]));
  const model = (b: (typeof SENTENCE_BANK)[number]) => Array.from(fillGap(b.gaps[0], b.word)).length;
  return byText.get([...SENTENCE_BANK].filter((b) => byText.has(b.word)).sort((a, b) => model(b) - model(a))[0]!.word)!;
}
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
  const outfit = new URLSearchParams(location.search).get('outfit'); // a costume with paw props (rewards spec §7: still within 8 ms)
  (window as unknown as { react: (kind: Reaction['kind']) => void }).react = (kind) => setReact((r) => ({ kind, key: (r?.key ?? 0) + 1 }));
  return screen(
    <Stage activity="flash" truffle={<Pet kid={{ ...DEFAULT_KID, outfit }} size={180} alive calm={calm} react={react} />} sheet={<FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />}>
      <div style="width:200px;height:200px" />
    </Stage>,
  );
}
const app = document.getElementById('app')!;
if (which === 'faces') {
  // every expression × a few looks (spec 2026-10-04 §4.1): read by eye, and checked to stay inside his box
  const looks: { label: string; props: Record<string, unknown> }[] = [
    { label: 'plain', props: {} }, { label: 'rabbit', props: { outfit: 'rabbit' } }, { label: 'chef', props: { outfit: 'chef' } }, { label: 'wizard', props: { outfit: 'wizard' } },
    { label: 'sunglasses', props: { accessory: 'sunglasses' } }, { label: 'fire 3', props: { power: 'fire', powerTier: 3 } }, { label: 'water 2', props: { power: 'water', powerTier: 2 } },
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
else if (which === 'clue') render(screen(<UseQuestion item={clue} kid={DEFAULT_KID} onAnswer={() => {}} onNext={() => {}} />), app);
else if (which === 'pair' || which === 'match' || which === 'build' || which === 'fish') {
  // 练一练's new questions (spec 2026-10-05 §3.2, §3.4): pairing, 组句 and 钓鱼 for a look-alike he confused
  const words = builtinWords(0);
  const w = (t: string) => words.find((x) => x.text === t)!;
  const rng = mulberry32(3);
  const body =
    which === 'pair' ? <PairGame board={zuciBoard(w('火'), rng)!} kind="pair" kid={DEFAULT_KID} onDone={() => {}} />
    : which === 'match' ? <MatchQuestion question={dapeiQuestion(w('穿'), rng)!} kid={DEFAULT_KID} onDone={() => {}} />
    : which === 'build' ? <BuildSentence item={{ full: '我和哥哥都喜欢打球。', tiles: ['我', '和', '哥哥', '都', '喜欢', '打球。'], orders: [['我', '和', '哥哥', '都', '喜欢', '打球。']] }} word={w('和')} kid={DEFAULT_KID} onDone={() => {}} />
    : <ComponentsStep items={[fishItem(w('根'), ['跟'], new Set(), rng)!]} kid={DEFAULT_KID} onAnswer={() => {}} onDone={() => {}} />;
  render(screen(body), app);
}
else if (which === 'miss-long' || which === 'miss-read' || which === 'miss-meaning' || which === 'miss-look') {
  // the miss sheet naming what he picked, with its English (parent 2026-10-16): long dictionary English on both lines (字典
  // picked for 经验), and a pinyin choice named as the part read so (qīng picked for 静 → 青)
  const words = builtinWords(0);
  const jing = words.find((x) => x.text === '静')!;
  // and the parent's two iPhone sheets (2026-10-16): 鱼 read for its English (stand picked), and 扫 found in 扫除 (扬 picked,
  // with the look-alike parts as the third row)
  const yu = words.find((x) => x.text === '鱼')!;
  const sao = words.find((x) => x.text === '扫')!;
  render(screen(which === 'miss-meaning'
    ? <FlashcardStep item={{ wordId: yu.id, isNew: false, retry: false }} ask="meaningRead" word={yu} pool={words.filter((x) => "鱼儿去立".includes(x.text))} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />
    : which === 'miss-look'
    ? <FlashcardStep item={{ wordId: sao.id, isNew: false, retry: false }} ask="listen" word={sao} pool={words.filter((x) => '扫挂折援扬扭'.includes(x.text))} voice kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />
    : which === 'miss-long'
    ? <UseQuestion item={{ kind: 'fit', wordId: null, word: '经验', before: '他教书很有', after: '。', options: ['经验', '字典', '充电', '注视'] }} kid={DEFAULT_KID} onAnswer={() => {}} onNext={() => {}} />
    : <FlashcardStep item={{ wordId: jing.id, isNew: false, retry: false }} ask="read" word={jing} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />), app);
}
else if (which === 'understand') {
  // the Understand question (plan 2b), with the longest English among the written sentences: the tightest card
  const items = SENTENCE_TERMS.flatMap((t) => inScopeWords(t)).map((w) => understandItem(w, mulberry32(1))).filter((x): x is UnderstandItem => !!x);
  const item = items.sort((a, b) => Math.max(...b.choices.map((c) => c.length)) - Math.max(...a.choices.map((c) => c.length)))[0]!;
  render(screen(<UnderstandQuestion item={item} kid={DEFAULT_KID} onDone={() => {}} />), app);
}
else if (which === 'creatures') {
  // every creature and thing of One River in light cel, at rest and mid-moment, for the parent to look over (spec 2026-10-13 §6–7)
  const cell = ([name, art]: [string, string]) => `<figure style="margin:0;background:#dfe9ec"><svg viewBox="-70 -110 140 130" width="210" height="195">${art}</svg><figcaption>${name}</figcaption></figure>`;
  app.innerHTML = `<div style="display:grid;grid-template-columns:repeat(6,210px);gap:6px;padding:8px;font:12px sans-serif;background:#fff">${CREATURES.map(cell).join('')}</div>`;
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
else if (which === 'costume-sheet') {
  // the v3 contact sheet (rewards spec §5.1; compare with docs/worlds/costumes/standard-v3.png): idle at 220 px, the 64 px
  // Wardrobe tile, and cheering at 220 px with his right paw up (the props ride the paw)
  const ids = (new URLSearchParams(location.search).get('ids') ?? '').split(',').filter(Boolean);
  const raised = PAW_TRACKS.raise(400)!;
  render(
    <div style={`display:grid;grid-template-columns:repeat(${SHEET_COLUMNS}, 232px);gap:8px;padding:8px;background:#fbf6ea;font:600 13px sans-serif;text-align:center`}>
      {ids.map((id) => (
        <div key={id} data-costume={id} style={`height:${SHEET_CELL_HEIGHT - 8}px`}>
          <figure data-row="idle" style="margin:0"><Truffle expression="neutral" outfit={id} size={220} label={null} /></figure>
          <figure data-row="tile" style="margin:0"><Truffle mood="content" outfit={id} size={64} label={null} /></figure>
          <figure data-row="cheer" style="margin:0"><Truffle expression="joy" paws={raised} outfit={id} size={220} label={null} /></figure>
          <div>{costumeById(id)?.zh ?? id}</div>
        </div>
      ))}
    </div>,
    app,
  );
  // the probe's other paw poses (every PAW_TRACKS move, frame by frame: costume-sheet.ts), one 220 px figure per costume, drawn
  // over the sheet after its screenshot: elementFromPoint only sees what is on screen
  (window as unknown as { __sheetPose: (paws: PawPose, row: string) => void }).__sheetPose = (paws, row) =>
    render(
      <div style={`display:grid;grid-template-columns:repeat(${SHEET_COLUMNS}, 232px);gap:8px;padding:8px;background:#fbf6ea`}>
        {ids.map((id) => (
          <div key={id} data-costume={id}>
            <figure data-row={row} style="margin:0"><Truffle expression="joy" paws={paws} outfit={id} size={220} label={null} /></figure>
          </div>
        ))}
      </div>,
      app,
    );
}
else if (which === 'setup-long' || which === 'setup-none') {
  // first run's second beat (2026-10-16): the longest 「学校现在学到：…」 line any P1–P3 day of 2026 gives, or the no-list line (P5);
  // the grade to tap is the page's data-grade
  void (async () => {
    let best = { grade: 5, day: new Date(2026, 9, 6), len: 0 };
    if (which === 'setup-long') for (let g = 1; g <= 3; g++) for (let d = 0; d < 366; d += 3) {
      const day = new Date(2026, 0, 1 + d);
      const len = schoolLine(g, day).length;
      if (len > best.len) best = { grade: g, day, len };
    }
    const db = await openAppDb(`stage-${Date.now()}`);
    const ctx: AppData = { db, settings: { ...DEFAULT_SETTINGS }, kid: null, voice: false, now: () => best.day, go: () => {}, refresh: async () => {} };
    app.dataset.grade = String(best.grade);
    render(<AppContext.Provider value={ctx}><PetSetup /></AppContext.Provider>, app);
  })();
}
else if (which?.startsWith('story-') && which !== 'story-page') {
  // the 3c reader on its own (spec 2026-10-07 3c §4): setup page, Granny's lines, 听一听, the rescued words
  void (async () => {
    const db = await openAppDb(`stage-${Date.now()}`);
    const voice = which === 'story-listen';
    if (which === 'story-rescued') {
      const ids = ['b:门', 'w:电梯', 'b:家', 'b:床', 'w:太阳', 'w:早上', 'w:衣服', 'w:房间', 'b:吃', 'b:饭'];
      for (const [k, wordId] of ids.entries()) await addReviewLog(db, { cardId: `${wordId}:hear`, wordId, kind: 'hear', at: Date.now() - 60_000 + k, rating: 3 as Grade, correct: true, responseMs: 1500 });
    }
    const ctx: AppData = { db, settings: { ...DEFAULT_SETTINGS, placementDone: true }, kid: null, voice, now: () => new Date(), go: () => {}, refresh: async () => {} };
    const part = which === 'story-setup' || which === 'story-granny' ? 'setup' : 'payoff';
    const chapter = Number(new URLSearchParams(location.search).get('chapter')) || (which === 'story-granny' ? 3 : 1);
    render(<AppContext.Provider value={ctx}><StoryScreen part={part} chapter={chapter} then={{ name: 'home' }} /></AppContext.Provider>, app);
    if (voice) { let on = false; const t = setInterval(() => { on = !on; setSpeaking(on); }, 120); setTimeout(() => clearInterval(t), 12_000); } // a voice that speaks and stops (long enough for a slow machine)
  })();
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
    : l.kind === 'scene' || l.kind === 'cast' ? null
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
else if (which === 'moments' || which === 'river') {
  // Home's world with its props and a live Truffle: each moment is tapped and its frames timed (spec 2026-10-04 §6); `river` is
  // the same stage still, by day or evening, for the screenshots at three sizes (spec 2026-10-13 §10)
  const q = new URLSearchParams(location.search);
  const world = (q.get('world') ?? 'home') as WorldId;
  const time = q.get('time') === 'evening' ? 'evening' : 'afternoon';
  const kid = { ...DEFAULT_KID, finds: { ...DEFAULT_FINDS } };
  function Moments() {
    const [react, setReact] = useState<{ kind: ReactionKind; key: number } | null>(null);
    return (
      <div class="screen home">
        <WorldScene world={world} time={time} />
        <WorldProps world={world} kid={kid} today="2026-10-06" onKid={() => {}} onSay={() => {}} onReact={(kind) => setReact((r) => ({ kind, key: (r?.key ?? 0) + 1 }))} autoEvery={1e9} />
        <div style="position:fixed;left:50%;bottom:120px;transform:translateX(-50%)"><Pet kid={kid} size={150} alive={which === 'moments'} react={react} /></div>
      </div>
    );
  }
  render(<Moments />, app);
}
else if (which === 'hear-seen') {
  // a heard word with a common sound-alike (parent 2026-10-17: 她 / 他): the character shown beside its speaker
  const pool = [...builtinWords(0), ...ladderWords()];
  const w = pool.find((x) => x.text === '她')!;
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false }} ask="hear" word={w} pool={pool} voice kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />), app);
}
else if (which === 'hear' || which === 'hear-long' || which === 'hear-read') {
  // the word ladder's Hear question (spec 2026-10-06 §3.2): English meanings as the choices; hear-long picks the ladder words
  // with the longest English, hear-read the same as a read-for-meaning question
  const lw = ladderWords();
  const pool = [...builtinWords(0), ...lw];
  const longest = lw.filter((x) => questionMeaning(x)).sort((a, b) => questionMeaning(b)!.length - questionMeaning(a)!.length); // the longest English a question asks (kid glosses)
  const w = which === 'hear' ? builtinWords(0).find((x) => x.text === '门')! : longest[0]!;
  const near = which === 'hear' ? pool : [w, ...longest.slice(1, 4)];
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false }} ask={which === 'hear-read' ? 'meaningRead' : 'hear'} word={w} pool={near} voice kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />), app);
}
else if (which === 'talk') {
  // the parent loop (spec 2026-10-12, 2026-10-18 update): Today's top line (the longest, a list check), 聊一聊 with the longest
  // word card (a list word with its example) and shared reading of the passage with the longest questions, the reading card
  // open; logging with Undo showing; the Week summary with every row full
  const words = builtinWords(0);
  const p = [...PASSAGES].sort((a, b) => questionsOf(b.id).map((q) => q.q).join('').length - questionsOf(a.id).map((q) => q.q).join('').length)[0]!;
  const qs = [p.id, questionsOf(p.id)] as const;
  const cards = pickDay({ today: '2026-10-19', seen: {}, words: [talkWord(words.find((w) => w.text === '借')!, 'list')], passage: { id: p.id, title: p.title, questions: qs[1] } });
  const summary: WeekSummary = {
    talk: { days: 4, minutes: 45, times: 5 }, lessons: 6, langduDays: 5,
    newly: { read: ['借', '饿', '饱', '甜', '森', '林', '游', '泳'], write: ['大', '小', '马'], say: ['森林', '游泳'] },
    newWords: ['借', '饿', '饱', '甜', '森', '林'], shaky: ['饿', '饱', '甜', '森', '泳'],
    reading: [{ passageId: p.id, title: p.title, meaning: 'missed' }, { passageId: 'p20', title: '我的学校', meaning: 'right' }], waiting: 3,
    focus: { zh: `多读：他这周的朗读题答错了。和他再读一次《${p.title}》，轮流读，读完问问他故事里发生了什么。`, en: `Read more: he missed the question on 《${p.title}》 this week. Read it again together, taking turns, then ask what happened.` },
  };
  render(
    <div class="screen screen--scroll parent">
      <main class="parent__body">
        <TryLine action={{ text: '本周词语 第九课: 11 of 24 not ready for the check on Wednesday. Go over 闪闪亮, 五颜六色, 小心翼翼 with him.', button: 'Open 本周词语', place: 'week' }} onNavigate={() => {}} />
        <section class="panel talk">
          <h2><span lang="zh-CN">聊一聊</span> Talk</h2>
          <TalkCards cards={cards} onSwap={() => {}} />
          <TalkLogger week={{ days: 1, minutes: 15, times: 2 }} saving={false} undoable onLog={() => {}} onUndo={() => {}} onWeek={() => {}} />
        </section>
        <WeekView range={weekRange(new Date(2026, 9, 22))} summary={summary} back={0} onBack={() => {}} onNavigate={() => {}} onShare={() => {}} />
      </main>
    </div>,
    app,
  );
  (document.querySelectorAll<HTMLButtonElement>('.talk__open')[1])?.click(); // the shared-reading card open: its tallest state
}
else if (which === 'listen') {
  // the parent's review queue (spec 2026-10-11 §6, §8): takes kept in memory — WebKit's test contexts can't store a Blob in IndexedDB
  const words = builtinWords(0);
  const said = [...['森', '林', '游', '泳'].map((t) => words.find((x) => x.text === t)!), ladderWords().find((w) => w.text === '森林') ?? ladderWords()[0]!];
  const takes: Recording[] = said.map((w, i) => ({ id: `t${i}`, createdAt: new Date(2026, 9, 11, 17, i * 3).getTime(), prompt: { kind: 'say', wordId: w.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 2 }));
  // a 说一句 take (production practice spec §4): the bank word with the longest model sentence
  const used = longestSentenceWord();
  said.push(used);
  takes.push({ id: 'ts', createdAt: new Date(2026, 9, 11, 17, 30).getTime(), prompt: { kind: 'sentence', wordId: used.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 4 });
  const p20 = PASSAGES.find((x) => x.id === 'p20')!; // the longest built-in text
  takes.push({ id: 'tp', createdAt: new Date(2026, 9, 11, 18).getTime(), prompt: { kind: 'passage', passageId: p20.id }, blob: new Blob(['x'], { type: 'audio/mp4' }), mime: 'audio/mp4', durationSec: 40, meaning: { correct: false, picked: '一个大商店' } });
  render(
    <div class="screen screen--scroll parent">
      <main class="parent__body">
        <section class="panel listen"><h2>Listen & confirm</h2><ListenRows takes={takes} words={new Map(said.map((w) => [w.id, w]))} texts={new Map([[p20.id, { title: p20.title, text: p20.text }]])} onJudge={() => {}} onDone={() => {}} /></section>
      </main>
    </div>,
    app,
  );
}
else if (which?.startsWith('langdu-gsb-') || which === 'langdu-words-listen') {
  // the library (spec 2026-10-15): the longest Global Storybooks passage with its picture, names, credit line and 下一篇; and
  // our longest passage with 生词 — each with every syllable showing (nothing known), the part opened directly
  const longest = (ps: Passage[]) => [...ps].sort((a, b) => b.text.length - a.text.length)[0]!;
  const p = which === 'langdu-words-listen' ? longest(PASSAGES.filter((x) => x.words?.length)) : longest(PASSAGES.filter((x) => x.source === 'gsb'));
  const part = which.slice(which.lastIndexOf('-') + 1) as LangduPart;
  // the question: the library's longest (question and choices together), on its own passage, so the longest one is the one checked
  const asked = PASSAGES.flatMap((x) => questionsOf(x.id).map((q) => ({ id: x.id, q }))).sort((a, b) => (b.q.q + b.q.choices.join('')).length - (a.q.q + a.q.choices.join('')).length)[0]!;
  const shown = part === 'meaning' ? PASSAGES.find((x) => x.id === asked.id)! : p;
  render(screen(
    <PinyinFade known={new Set()} on>
      <LangduStep passage={{ ...shown, asked: part === 'meaning' ? [asked.q] : askedOf(p.id) }} rng={() => 0.999} oral={{ name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' }} kid={DEFAULT_KID} withWarmup={false} startAt={part} onSwap={() => {}} onDone={() => {}} />
    </PinyinFade>,
  ), app);
}
else if (which === 'langdu-back') {
  // a missed why or main question (spec 2026-10-24 §5, §9): four choices, then its two supporting sentences read back in the
  // sheet — the longest such question in the library, in stored order
  const back = longestBack()!;
  render(screen(
    <PinyinFade known={new Set()} on>
      <LangduStep passage={{ ...back.passage, asked: [back.question] }} rng={() => 0.999} oral={{ name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' }} kid={DEFAULT_KID} withWarmup={false} startAt="meaning" onDone={() => {}} />
    </PinyinFade>,
  ), app);
}
else if (which?.startsWith('langdu-')) {
  // 朗读's parts (spec 2026-10-12 §3, §8; 2026-10-24 §9: up to 140 characters): the longest of our passages with every syllable showing (nothing known), each part
  // opened directly; stage-cases.ts misses the question. In listen, the first sentence lights as its voice starts.
  const p = LONGEST_OWN;
  const part = (which === 'langdu-read-blocked' ? 'read' : which.slice('langdu-'.length)) as LangduPart;
  render(screen(
    <PinyinFade known={new Set()} on>
      <LangduStep passage={{ ...p, asked: askedOf(p.id) }} rng={() => 0.999} /* no shuffle: stored order */ oral={{ name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' }} kid={DEFAULT_KID} withWarmup startAt={part} micBlocked={which === 'langdu-read-blocked'} onDone={() => {}} />
    </PinyinFade>,
  ), app);
  if (part === 'listen') setTimeout(() => setSpeaking(true), 50);
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
    which === 'idiom' ? <IdiomQuestion gap={idiomGap(idiom, '足', rng)!} kid={DEFAULT_KID} onDone={() => {}} />
    : which === 'idiom-fit' ? <UseQuestion item={idiomFitItem(idiom, null, rng)!} kid={DEFAULT_KID} onAnswer={() => {}} onNext={() => {}} />
    : which === 'idiom-build' ? <BuildSentence item={idiomZuju(idiom, rng)!} word={{ ...yan, text: idiom.text }} kid={DEFAULT_KID} onDone={() => {}} />
    : which === 'intro-idiom-word' ? (() => { // a card with no usage line: a 组词 with its English before the 成语 (parent, 2026-10-05: 一)
      const yi = words.find((x) => x.text === '一')!;
      return <FlashcardStep item={{ wordId: yi.id, isNew: true, retry: false }} ask="listen" word={yi} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} idiom={builtinIdiom('一心一意')!} onDone={() => {}} />;
    })()
    : <FlashcardStep item={{ wordId: cheng.id, isNew: true, retry: false }} ask="listen" word={cheng} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} idiom={builtinIdiom('胸有成竹')!} onDone={() => {}} />;
  render(screen(body), app);
}
else if (which === 'why-look' || which === 'why-pinyin') {
  // a miss says why (spec 2026-10-12 §3): 睛 for 晴 (the part that differs), 请 read qīng (the sound part); stage-cases.ts taps it
  const words = builtinWords(0);
  const near = words.filter((x) => [...'晴睛静精'].includes(x.text));
  const w = which === 'why-look' ? near.find((x) => x.text === '晴')! : words.find((x) => x.text === '请')!;
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false }} ask={which === 'why-look' ? 'listen' : 'read'} word={w} pool={which === 'why-look' ? near : words} voice={which === 'why-look'} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />), app);
}
else if (which === 'fade-peek') {
  // pinyin fades over characters he reads (spec 2026-10-12 §4): the long clue sentence, every character read; stage-cases.ts peeks
  render(screen(<PinyinFade known={new Set(Array.from(clue.before + clue.word + clue.after))} on><UseQuestion item={clue} kid={DEFAULT_KID} onAnswer={() => {}} onNext={() => {}} /></PinyinFade>), app);
}
else if (which === 'intro-full') {
  // the 认新字 card with its 组词 rows and a 成语 too: the tallest intro card (the 一家人 row is gone, parent 2026-10-15)
  const words = builtinWords(0);
  const w = words.find((x) => x.text === '生')!;
  render(screen(<PinyinFade known={new Set('男女气先日')} on><FlashcardStep item={{ wordId: w.id, isNew: true, retry: false }} ask="listen" word={w} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} idiom={introIdiom(w, idiomsFor(w, 3, words))} onDone={() => {}} /></PinyinFade>), app);
}
else if (which === 'intro-raincoat' || which === 'intro-usage' || which === 'intro-usage-long') {
  // the parent's iPhone (2026-10-15): 雨衣 with its catch-up tag (pinyin over each character, 补 not clipped); 保持's usage line
  // and the longest one (本来), whose 。 must not start a line and whose speak button must not sit on the text
  const all = [...builtinWords(0), ...ladderWords()];
  const w = all.find((x) => x.text === (which === 'intro-raincoat' ? '雨衣' : which === 'intro-usage' ? '保持' : '本来'))!;
  render(screen(<PinyinFade known={new Set('我们要教室干净他住在北京后来到这里')} on><FlashcardStep item={{ wordId: w.id, isNew: true, retry: false }} ask="listen" word={w} pool={all} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} /></PinyinFade>), app);
}
else if (which === 'intro-bound' || which === 'intro-bound-full' || which === 'intro-bound-long') {
  // a bound character's 认新字 card (parent 2026-10-15): 番 led by 番茄; 丽 with a 成语 (the fullest); 幼 led
  // by a three-character pair (幼儿园)
  const words = builtinWords(0);
  const w = words.find((x) => x.text === (which === 'intro-bound' ? '番' : which === 'intro-bound-full' ? '丽' : '幼'))!;
  const known = new Set(words.slice(0, 1200).map((x) => x.text));
  render(screen(<PinyinFade known={known} on><FlashcardStep item={{ wordId: w.id, isNew: true, retry: false }} ask="listen" word={w} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} idiom={introIdiom(w, idiomsFor(w, 3, words))} onDone={() => {}} /></PinyinFade>), app);
}
else if (which === 'intro-jia' || which === 'intro-ding') {
  // 一下 L11's labels (parent 2026-10-16: 甲 showed "fingernail", 丁 "family name Ding"): the 1st and the 4th, with 甲乙丙丁
  const words = builtinWords(0);
  const w = words.find((x) => x.text === (which === 'intro-jia' ? '甲' : '丁'))!;
  render(screen(<PinyinFade known={new Set()} on><FlashcardStep item={{ wordId: w.id, isNew: true, retry: false }} ask="listen" word={w} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} /></PinyinFade>), app);
}
else if (which === 'hear-bound' || which === 'hear-bound-read' || which === 'hear-bound-long') {
  // an English question on a bound character (parent 2026-10-15): it asks about 番茄 (or 幼儿园), heard or read
  const pool = [...builtinWords(0), ...ladderWords()];
  const w = builtinWords(0).find((x) => x.text === (which === 'hear-bound-long' ? '幼' : '番'))!;
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false }} ask={which === 'hear-bound' ? 'hear' : 'meaningRead'} word={w} pool={pool} voice kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={() => {}} />), app);
}
else if (which === 'family') {
  // 找一家人 (spec 2026-10-12 §5): 生气 and 男生 among 星星, 出去, 在家, 坏人
  const w = builtinWords(0).find((x) => x.text === '生')!;
  render(screen(<FamilyQuestion board={familyBoard(w, new Set('男女气先口出学家人'), mulberry32(1))!} kid={DEFAULT_KID} onDone={() => {}} />), app);
}
else if (which === 'trace') {
  // a read-only character traced over its outline (production practice spec §3): 澡's strokes from the package, not the CDN
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => (String(input).includes('hanzi-writer-data') ? Promise.resolve(new Response(JSON.stringify(zao), { headers: { 'content-type': 'application/json' } })) : real(input, init));
  const w = { ...builtinWords(0).find((x) => x.text === '澡')!, writeable: false };
  render(screen(<WritingStep word={w} kid={DEFAULT_KID} isNew pass="trace" onDone={() => {}} />), app);
}
else if (which === 'recall' || which === 'recall-sentence') {
  // 默写 in 练一练 (real test spec 2026-10-23 §4): 草's 组词 gap (＿地), and the character whose sentence cue is the longest (the
  // tallest cue over the 田字格); strokes from the package (stroke-route.ts)
  const words = builtinWords(0).filter((x) => Array.from(x.text).length === 1);
  const sentenceLength = (x: Word) => Array.from(writingCue(x).sentence ?? '').length;
  const w = which === 'recall' ? words.find((x) => x.text === '草')! : [...words].sort((a, b) => sentenceLength(b) - sentenceLength(a))[0]!;
  render(screen(<PinyinFade known={new Set()} on><RecallQuestion word={w} at={0} kid={DEFAULT_KID} onDone={() => {}} /></PinyinFade>), app);
}
else if (which === 'gap-six') {
  // a revision word's 组词 gap (real test spec 2026-10-23 §5): six choices, every one a character he has begun
  const words = builtinWords(0);
  const w = words.find((x) => x.text === '草')!;
  render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false, mode: 'meaning' }} ask="word" word={w} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} begun={new Set(Array.from('草花茶菜早吃次从出车春'))} onDone={() => {}} />), app);
}
else if (which === 'sentence') {
  // 说一句 (production practice spec §4) for the bank word with the longest model sentence, with a pretend microphone:
  // stage-cases.ts records a take, so the model sentence and 再录一次 show (the tallest state)
  class FakeRecorder {
    static isTypeSupported() { return true; }
    mimeType = 'audio/mp4'; state = 'inactive';
    ondataavailable: ((e: { data: Blob }) => void) | null = null; onstop: (() => void) | null = null;
    constructor(_s: MediaStream) {}
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; setTimeout(() => { this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/mp4' }) }); this.onstop?.(); }, 10); }
    addEventListener(t: string, f: () => void) { (this as Record<string, unknown>)[`on${t}`] = f; }
    removeEventListener() {}
  }
  (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorder;
  const stream = () => { const ac = new AudioContext(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream() } });
  render(screen(<PinyinFade known={new Set()} on><SentenceCard word={longestSentenceWord()} kid={DEFAULT_KID} onDone={() => {}} /></PinyinFade>), app);
}
else if (which === 'none-word' || which === 'none-meaning') {
  // 「都不对」 (production practice spec §5): the 组词 gap with six choices, and the English meaning with the longest English
  const words = builtinWords(0);
  const lw = ladderWords();
  if (which === 'none-word') {
    const w = words.find((x) => wordCue(x) && x.text === '河') ?? words.find((x) => wordCue(x))!;
    render(screen(<FlashcardStep item={{ wordId: w.id, isNew: false, retry: false, mode: 'meaning' }} ask="word" word={w} pool={words} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} noneOfThese="answer" onDone={() => {}} />), app);
  } else {
    const longest = lw.filter((x) => questionMeaning(x)).sort((a, b) => questionMeaning(b)!.length - questionMeaning(a)!.length); // the longest English a question asks (kid glosses)
    render(screen(<FlashcardStep item={{ wordId: longest[0]!.id, isNew: false, retry: false }} ask="meaningRead" word={longest[0]!} pool={longest.slice(0, 4)} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} noneOfThese="answer" onDone={() => {}} />), app);
  }
}
else if (which?.startsWith('check-')) {
  // 考考自己 (weekly list spec 2026-10-17 §8.1): each question form bare (no pinyin, nothing said, no verdict), and the end sheet
  // with its stars and misses. Invented words, never a sheet's
  const P = (text: string, pinyin: string, meaning?: string): Word => ({ id: `p:${text}`, text, pinyin, ...(meaning ? { meaning } : {}), level: null, rank: null, source: 'parent', writeable: false, paused: false, createdAt: 0 });
  const pool = [P('风筝', 'fēng zheng', 'kite'), P('雨伞', 'yǔ sǎn', 'umbrella'), P('小河', 'xiǎo hé', 'stream'), P('钓鱼', 'diào yú', 'to fish'), P('书包', 'shū bāo', 'school bag'), P('闪闪亮', 'shǎn shǎn liàng', 'sparkly'), ...builtinWords(0).slice(0, 200)];
  const pairs = [
    { left: '拔', right: '萝卜', wrong: ['苹果', '花朵', '书包'] as [string, string, string], reading: 'bá luó bo' },
    { left: '摘', right: '苹果', wrong: ['萝卜', '花朵', '书包'] as [string, string, string], reading: 'zhāi píng guǒ' },
    { left: '浇', right: '花朵', wrong: ['萝卜', '苹果', '书包'] as [string, string, string], reading: 'jiāo huā duǒ' },
  ];
  const miss = (zh: string, py: string, en?: string): MissRow => ({ key: zh, zh, py, ...(en ? { en } : {}) });
  const three = [miss('风筝', 'fēng zheng', 'kite'), miss('拔萝卜', 'bá luó bo', 'pull up → radish'), miss('闪闪亮', 'shǎn shǎn liàng', 'sparkly')];
  const many = [...three, miss('雨伞', 'yǔ sǎn', 'umbrella'), miss('小河', 'xiǎo hé', 'stream'), miss('钓鱼', 'diào yú', 'to fish'), miss('书包', 'shū bāo', 'school bag'), miss('摘苹果', 'zhāi píng guǒ', 'pick → apple'), miss('浇花朵', 'jiāo huā duǒ', 'water → flower'), miss('跳绳', 'tiào shéng', 'skip rope')];
  const flash = (w: Word, ask: 'read' | 'meaningRead') => <FlashcardStep item={{ wordId: w.id, isNew: false, retry: false }} ask={ask} word={w} pool={pool} voice={false} kid={DEFAULT_KID} resting="neutral" combo={0} closeupReady={false} bare onDone={() => {}} />;
  render(screen(
    which === 'check-match' ? <MatchQuestion question={{ verb: '拔', noun: '萝卜', options: ['苹果', '萝卜', '花朵', '书包'] }} kid={DEFAULT_KID} bare onDone={() => {}} />
    : which === 'check-read' ? flash(pool[5]!, 'read')
    : which === 'check-meaning' ? flash(pool[0]!, 'meaningRead')
    : which === 'check-fit' ? <UseQuestion item={fitUseItem({ wordId: 'p:雨伞', sentence: '下雨了，我打着＿上学。', source: 'parent', wrong: ['风筝', '小河', '钓鱼'] }, pool[1]!, mulberry32(2), pool)} kid={DEFAULT_KID} bare onAnswer={() => {}} onNext={() => {}} />
    : which === 'check-board' ? <PairGame board={listBoard(pairs, mulberry32(4))!} kind="match" kid={DEFAULT_KID} bare onDone={() => {}} />
    : <CheckEnd kid={DEFAULT_KID} rows={which === 'check-done-many' ? many : three} stars={which === 'check-done-many' ? 0 : 5} onHome={() => {}} />,
  ), app);
}
else if (which?.startsWith('week-')) {
  // a weekly list in the lesson (weekly list spec 2026-10-17 §7): its 认新词 cards (a 2-character word, a 3-character ABB word,
  // a phrase, a verb through its pair), a re-teaching card, 选词填空 from the list and a 连一连 board of its pairs with a decoy.
  // Invented words, never a sheet's
  const words = builtinWords(0);
  const P = (text: string, pinyin: string, meaning: string, sentences?: Word['sentences']): Word => ({ id: `p:${text}`, text, pinyin, meaning, level: null, rank: null, source: 'parent', writeable: false, paused: false, createdAt: 0, ...(sentences ? { sentences } : {}) });
  const gan = { ...words.find((x) => x.text === '干')!, id: 'w:干净', text: '干净', pinyin: 'gān jìng' };
  const abb = P('亮晶晶', 'liàng jīng jīng', 'sparkly');
  const phrase = P('低下头', 'dī xià tóu', 'lower your head', [{ text: '小猫低下头，轻轻地喝水。', pinyin: 'xiǎo māo dī xià tóu qīng qīng de hē shuǐ' }]);
  const chao = words.find((x) => x.text === '炒')!;
  const mates = [P('胖乎乎', 'pàng hū hū', 'chubby'), P('毛茸茸', 'máo róng róng', 'fluffy'), P('绿油油', 'lǜ yóu yóu', 'lush green')];
  const list: WeekList = {
    id: 'wl:stage', name: 'Stage', createdAt: 0, readyBy: '2026-11-11', homeworkDue: '2026-11-13',
    items: [gan, abb, phrase, chao, ...mates].map((w) => ({ wordId: w.id, text: w.text, from: 'grid' as const, addedStatus: 'new' as const })),
    pairs: [
      { left: '炒', right: '青菜', wrong: ['毽子', '风筝', '书包'], reading: 'chǎo qīng cài' },
      { left: '踢', right: '毽子', wrong: ['青菜', '风筝', '书包'], reading: 'tī jiàn zi' },
      { left: '放', right: '风筝', wrong: ['毽子', '青菜', '书包'], reading: 'fàng fēng zheng' },
    ],
    fits: [{ wordId: abb.id, sentence: '夜空里的星星＿，好像在眨眼睛。', source: 'parent', wrong: ['胖乎乎', '毛茸茸', '绿油油'] }],
  };
  const pool = [...words, abb, phrase, ...mates];
  const card = (w: Word, begun: string, reteach = false) => (
    <FlashcardStep item={{ wordId: w.id, isNew: !reteach, retry: reteach, ...(reteach ? { reteach: true as const } : {}) }} ask="read" word={w} pool={pool} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} list={listCardFor(w, [list], new Set(begun))} onDone={() => {}} />
  );
  render(screen(
    which === 'week-card-two' ? card(gan, '干')
    : which === 'week-card-abb' ? card(abb, '亮')
    : which === 'week-card-phrase' ? card(phrase, '')
    : which === 'week-card-pair' ? card(chao, '')
    : which === 'week-reteach' ? card(abb, '亮晶', true)
    : which === 'week-fit' ? <UseQuestion item={fitUseItem(list.fits[0]!, abb, () => 0.999, pool)} kid={DEFAULT_KID} onAnswer={() => {}} onNext={() => {}} />
    : <PairGame board={listBoard(list.pairs, mulberry32(4), (l, r) => pairGloss(l, r, pool))!} kind="match" kid={DEFAULT_KID} onDone={() => {}} />,
  ), app);
}
else render(screen(
  <Stage activity="write" truffle={<Pet kid={DEFAULT_KID} size={180} />} sheet={which === 'good' ? <FeedbackSheet tone="good" title="写得好！" actionLabel="完成" onAction={() => {}} /> : <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />}>
    <div style="width:200px;height:200px" />
  </Stage>,
), app);
