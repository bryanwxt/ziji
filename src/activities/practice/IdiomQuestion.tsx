import { useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { IdiomGap } from '../../practice/idioms';
import type { KidState } from '../../types';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import type { TruffleMood } from '../../ui/truffle/Truffle';

interface Props {
  gap: IdiomGap;
  kid: KidState;
  resting: TruffleMood;
  onDone: (r: { correct: boolean; responseMs: number; picked: string }) => void;
}

/** Complete the 成语 (spec 2026-10-05 §3.2 rung 5): which character goes in the gap? After a miss the sheet gives its English. */
export function IdiomQuestion({ gap, kid, resting, onDone }: Props) {
  const text = gap.idiom.text;
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ text.codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [gap]);
  const [choice, setChoice] = useState<string | null>(null);
  const shownAt = useRef(performance.now());
  const done = choice !== null;
  const correct = choice === gap.answer;
  const pick = (o: string) => {
    if (done) return;
    setChoice(o);
    playSfx(o === gap.answer ? 'correct' : 'wrong');
    speak(text);
  };
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (correct ? 'pleased' : 'side') : resting} bubble={done ? null : '填哪个字？'} size={180} calm={!done} react={done ? { kind: correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={correct ? 'good' : 'oops'}
          title={correct ? lines.cheer : lines.comfort}
          detail={correct ? undefined : (
            <>
              <span class="hanzi">{text}</span>
              <SpeakButton text={text} />
              <MeaningNote right={text} />
            </>
          )}
          actionLabel="继续"
          onAction={() => onDone({ correct, responseMs: Math.round(performance.now() - shownAt.current), picked: choice })}
        />
      )}
    >
      <div class="idiom hanzi">
        {Array.from(text).map((ch, i) => (
          i === gap.at
            ? <span key={i} class={`idiom__slot${done ? ' is-filled' : ''}`}>{done ? gap.answer : '？'}</span>
            : <span key={i} class="idiom__char">{ch}</span>
        ))}
      </div>
      <div class="choices">
        {gap.options.map((o) => (
          <button key={o} type="button" class={`choice press hanzi${done ? (o === gap.answer ? ' is-answer' : o === choice ? ' is-wrong' : ' is-dim') : ''}`} disabled={done} onClick={() => pick(o)}>{o}</button>
        ))}
      </div>
    </Stage>
  );
}
