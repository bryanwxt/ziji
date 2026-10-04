import { useEffect, useRef, useState } from 'preact/hooks';
import type { FinishedRecording } from '../../audio/recorder';
import { speak, stopSpeaking } from '../../audio/speech';
import { showStarters } from '../../kantu/flow';
import { STORY_PARTS, type Scene, type StoryPart } from '../../kantu/scenes';
import type { KidState } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { InkIcon } from '../../ui/icons/InkIcon';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { SCENE_ART, SCENE_VIEW } from '../../ui/kantu/art';
import { MicButton, useRecorder } from '../shared/recording';

export interface StoryResult {
  parts: Partial<Record<StoryPart, FinishedRecording>>;
  whole: FinishedRecording | null;
  answers: (FinishedRecording | null)[];
}

interface Props {
  scene: Scene;
  told: number;
  kid: KidState;
  onDone: (r: StoryResult) => void;
}

type Screen =
  | { kind: 'part'; part: StoryPart; question: string; starter: string; model: string }
  | { kind: 'whole'; model: string }
  | { kind: 'ask'; index: number; question: string; starter: string; model: string };

/** The starter shows for his first stories; after that it waits behind 提示. */
function Starter({ text, told }: { text: string; told: number }) {
  const [open, setOpen] = useState(showStarters(told));
  if (open) return <p class="kantu__starter"><Label zh={text} /></p>;
  return (
    <button type="button" class="btn btn--ghost kantu__hint" onClick={() => setOpen(true)}>
      <InkIcon name="sparkle" size={22} /> <Label zh="提示" />
    </button>
  );
}

/** One screen: try first (record), then hear Truffle's model, then go on. Keyed per screen, so each gets a fresh recorder. */
function StoryScreen({ scene, screen, told, kid, last, blocked, onNext }: { scene: Scene; screen: Screen; told: number; kid: KidState; last: boolean; blocked: boolean; onNext: (r: FinishedRecording | null, micBlocked: boolean) => void }) {
  const rec = useRecorder(blocked);
  const [heardModel, setHeardModel] = useState(false);
  const tried = rec.state === 'done' || rec.state === 'blocked';
  useEffect(() => {
    if (screen.kind !== 'whole') speak(screen.question);
  }, []);
  const hear = () => {
    speak(screen.model);
    setHeardModel(true);
  };

  return (
    <>
      <div class="kantu">
        {screen.kind === 'ask' ? (
          <div class="kantu__ask">
            <Pet kid={kid} mood="content" size={110} bubble="松露问你" />
            <span class="grainy kantu__frame"><svg class="kantu__pic kantu__pic--small" viewBox={SCENE_VIEW} role="img" aria-label={scene.title} dangerouslySetInnerHTML={{ __html: SCENE_ART[scene.id] }} /></span>
          </div>
        ) : (
          <span class="grainy kantu__frame"><svg class="kantu__pic" viewBox={SCENE_VIEW} role="img" aria-label={scene.title} dangerouslySetInnerHTML={{ __html: SCENE_ART[scene.id] }} /></span>
        )}
        {screen.kind === 'whole' ? (
          <>
            <h2 class="kantu__q"><Label zh="讲一讲" /></h2>
            <p class="kantu__note"><Label zh="看着图，把故事讲一遍" /></p>
          </>
        ) : (
          <>
            <h2 class="kantu__q"><Label zh={screen.question} /></h2>
            <Starter text={screen.starter} told={told} />
          </>
        )}
        {screen.kind === 'part' && (
          <div class="kantu__words">
            {scene.words.map((w) => (
              <button key={w} type="button" class="chip kantu__word" aria-label={w} onClick={() => speak(w)}><Label zh={w} /></button>
            ))}
          </div>
        )}
        <MicButton rec={rec} withLevel={false} />
        {tried && (
          <div class="row">
            <button type="button" class="btn" onClick={hear}><InkIcon name="speech" size={24} /> <Label zh="听松露说" /></button>
            {rec.state === 'done' && <button type="button" class="btn btn--ghost" onClick={() => rec.reset()}><Label zh="重录" /></button>}
          </div>
        )}
        {heardModel && <p class="kantu__model"><Label zh={screen.model} /></p>}
      </div>
      <FeedbackSheet actionLabel={last ? '完成' : '继续'} disabled={!tried} onAction={() => onNext(rec.result, rec.state === 'blocked')} />
    </>
  );
}

/** 看图说话: five framed parts (try, then hear Truffle), the whole story from the picture alone, then Truffle asks. */
export function StoryStep({ scene, told, kid, onDone }: Props) {
  const screens: Screen[] = [
    ...STORY_PARTS.map((p) => ({ kind: 'part' as const, part: p.part, question: p.question, starter: p.starter, model: scene.model[p.part] })),
    { kind: 'whole' as const, model: STORY_PARTS.map((p) => scene.model[p.part]).join('') },
    ...scene.questions.map((q, index) => ({ kind: 'ask' as const, index, question: q.q, starter: q.starter, model: q.answer })),
  ];
  const [i, setI] = useState(0);
  const [blocked, setBlocked] = useState(false); // a refused microphone stays refused for the rest of the story
  useEffect(() => () => stopSpeaking(), []);
  const result = useRef<StoryResult>({ parts: {}, whole: null, answers: scene.questions.map(() => null) });
  const done = useRef(false);

  const next = (r: FinishedRecording | null, micBlocked: boolean) => {
    if (done.current) return;
    if (micBlocked) setBlocked(true); // carried with the tap, so it holds however fast he goes
    const s = screens[i]!;
    if (r) {
      if (s.kind === 'part') result.current.parts[s.part] = r;
      else if (s.kind === 'whole') result.current.whole = r;
      else result.current.answers[s.index] = r;
    }
    if (i < screens.length - 1) setI(i + 1);
    else {
      done.current = true;
      onDone(result.current);
    }
  };

  return <StoryScreen key={i} scene={scene} screen={screens[i]!} told={told} kid={kid} last={i === screens.length - 1} blocked={blocked} onNext={next} />;
}
