import { useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { DapeiQuestion } from '../../practice/pairs';
import { NONE_OF_THESE, noneChoices, noneDecoyChoices } from '../../practice/noneOfThese';
import type { KidState } from '../../types';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';

interface Props {
  question: DapeiQuestion;
  kid: KidState;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
  /** asked without its partner, 「都不对」 right (production practice spec §5) */
  none?: 'answer' | 'decoy';
}

/** 搭配 (spec 2026-10-05 §3.2 rung 2): the word and four partners — which one goes with it? The right one joins it. */
export function MatchQuestion({ question, kid, onDone, none }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ question.verb.codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [question]);
  const [choice, setChoice] = useState<string | null>(null);
  const shownAt = useRef(performance.now());
  const options = none === 'answer' ? noneChoices(question.options, question.noun) : none === 'decoy' ? noneDecoyChoices(question.options, question.noun) : question.options;
  const answer = none === 'answer' ? NONE_OF_THESE : question.noun;
  const done = choice !== null;
  const correct = choice === answer;
  const pair = question.verb + question.noun;
  const pick = (o: string) => {
    if (done) return;
    setChoice(o);
    playSfx(o === answer ? 'correct' : 'wrong');
    speak(pair);
  };
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (correct ? 'pleased' : 'side') : 'neutral'} bubble={done ? null : '哪个一起用？'} size={180} calm={!done} react={done ? { kind: correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={correct ? 'good' : 'oops'}
          title={correct ? lines.cheer : lines.comfort}
          detail={correct && !none ? undefined : ( // a 都不对 question shows the real pair, right or wrong
            <>
              <span class="hanzi">{pair}</span>
              <SpeakButton text={pair} />
              <MeaningNote right={question.noun} picked={correct ? null : choice} /> {/* 都不对 picked wrongly is said plainly (missNote.ts) */}
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
        <span class={`match__slot hanzi${done ? ' is-filled' : ''}`} style={`--n:${Array.from(question.noun).length}`} aria-label={done ? undefined : '空格'}>{done ? question.noun : '？'}</span>
      </div>
      <div class="choices">
        {options.map((o) => (
          <button key={o} type="button" class={`choice press${o === NONE_OF_THESE && none ? ' choice--none' : ''}${done ? (o === answer ? ' is-answer' : o === choice ? ' is-wrong' : ' is-dim') : ''}`} disabled={done} onClick={() => pick(o)}>{o}</button>
        ))}
      </div>
    </Stage>
  );
}
