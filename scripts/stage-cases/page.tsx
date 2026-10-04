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
import { PRESETS, type Expression } from '../../src/ui/truffle/rig';
import type { Reaction } from '../../src/ui/truffle/timelines';

const screen = (body: preact.ComponentChildren) => (
  <div class="screen">
    <header class="lessonbar"><button type="button" class="icon-btn">✕</button></header>
    {body}
  </div>
);
const clue = { kind: 'fit' as const, wordId: null, word: '连忙', before: '看到老师来了，他', after: '站起来。', options: ['连忙', '从来', '互相', '本来'], clue: '连忙：说已经发生的事；叫别人快一点用"赶快"' };
const which = new URLSearchParams(location.search).get('case');
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
    </div>,
    app,
  );
} else if (which === 'alive' || which === 'alive-calm') render(<Alive calm={which === 'alive-calm'} />, app);
else if (which === 'clue') render(screen(<UseQuestion item={clue} kid={DEFAULT_KID} resting="sulk" onAnswer={() => {}} onNext={() => {}} />), app);
else render(screen(
  <Stage activity="write" truffle={<Pet kid={DEFAULT_KID} size={180} />} sheet={which === 'good' ? <FeedbackSheet tone="good" title="写得好！" actionLabel="完成" onAction={() => {}} /> : <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />}>
    <div style="width:200px;height:200px" />
  </Stage>,
), app);
