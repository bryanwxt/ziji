import { useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { DapeiQuestion } from '../../practice/pairs';
import type { KidState } from '../../types';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import type { TruffleMood } from '../../ui/truffle/Truffle';

interface Props {
  question: DapeiQuestion;
  kid: KidState;
  resting: TruffleMood;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
}

/** 搭配 (spec 2026-10-05 §3.2 rung 2): the word and four partners — which one goes with it? The right one joins it. */
export function MatchQuestion({ question, kid, resting, onDone }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ question.verb.codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [question]);
  const [choice, setChoice] = useState<string | null>(null);
  const shownAt = useRef(performance.now());
  const done = choice !== null;
  const correct = choice === question.noun;
  const pair = question.verb + question.noun;
  const pick = (o: string) => {
    if (done) return;
    setChoice(o);
    playSfx(o === question.noun ? 'correct' : 'wrong');
    speak(pair);
  };
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (correct ? 'pleased' : 'side') : resting} bubble={done ? null : '哪个一起用？'} size={180} calm={!done} react={done ? { kind: correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={correct ? 'good' : 'oops'}
          title={correct ? lines.cheer : lines.comfort}
          detail={correct ? undefined : (
            <>
              <span class="hanzi">{pair}</span>
              <SpeakButton text={pair} />
              <MeaningNote right={question.noun} picked={choice} />
            </>
          )}
          actionLabel="继续"
          onAction={() => onDone({ correct, responseMs: Math.round(performance.now() - shownAt.current) })}
        />
      )}
    >
      <div class="match">
        <span class="match__word hanzi">{question.verb}</span>
        <span class="match__plus" aria-hidden="true">+</span>
        <span class={`match__slot hanzi${done ? ' is-filled' : ''}`}>{done ? question.noun : '？'}</span>
      </div>
      <div class="choices">
        {question.options.map((o) => (
          <button key={o} type="button" class={`choice press${done ? (o === question.noun ? ' is-answer' : o === choice ? ' is-wrong' : ' is-dim') : ''}`} disabled={done} onClick={() => pick(o)}>{o}</button>
        ))}
      </div>
    </Stage>
  );
}
