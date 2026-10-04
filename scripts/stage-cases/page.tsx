// Feedback states the walking sweep can't reach on its own (review I1/I2): a wrong 选一选 answer with a long bank clue,
// and the stage card's size with a neutral vs a feedback sheet. Bundled by stage-cases.ts and opened in WebKit.
import { render } from 'preact';
import '../../src/styles.css';
import { UseQuestion } from '../../src/activities/choose/UseQuestion';
import { DEFAULT_KID } from '../../src/types';
import { FeedbackSheet } from '../../src/ui/stage/FeedbackSheet';
import { Stage } from '../../src/ui/stage/Stage';
import { Pet } from '../../src/ui/Pet';

const screen = (body: preact.ComponentChildren) => (
  <div class="screen">
    <header class="lessonbar"><button type="button" class="icon-btn">✕</button></header>
    {body}
  </div>
);
const clue = { kind: 'fit' as const, wordId: null, word: '连忙', before: '看到老师来了，他', after: '站起来。', options: ['连忙', '从来', '互相', '本来'], clue: '连忙：说已经发生的事；叫别人快一点用"赶快"' };
const which = new URLSearchParams(location.search).get('case');
const app = document.getElementById('app')!;
if (which === 'clue') render(screen(<UseQuestion item={clue} kid={DEFAULT_KID} resting="sulk" onAnswer={() => {}} onNext={() => {}} />), app);
else render(screen(
  <Stage activity="write" truffle={<Pet kid={DEFAULT_KID} size={180} />} sheet={which === 'good' ? <FeedbackSheet tone="good" title="写得好！" actionLabel="完成" onAction={() => {}} /> : <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />}>
    <div style="width:200px;height:200px" />
  </Stage>,
), app);
