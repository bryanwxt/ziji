import { useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { DapeiQuestion } from '../../practice/pairs';
import { NONE_OF_THESE, noneChoices, noneDecoyChoices } from '../../practice/noneOfThese';
import type { KidState } from '../../types';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { choiceGloss } from '../../practice/missNote';
import { readingOf } from '../../content/wordGate';
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
  /** a weekly list pair (weekly list spec 2026-10-17 §7.5): said at its own reading, a miss shown as two whole phrases (✓ 炒青菜 / ✗ 炒毽子) */
  list?: { reading?: string; gloss?: string };
}

/** 搭配 (spec 2026-10-05 §3.2 rung 2): the word and four partners — which one goes with it? The right one joins it. */
export function MatchQuestion({ question, kid, onDone, none, list }: Props) {
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
    if (list?.reading) speak(pair, { reading: list.reading });
    else speak(pair);
  };
  // a list pair's left half read as in the pair (炸 in 炸鸡翅 is zhá), then the partner he picked
  const verbPy = list?.reading?.split(/\s+/).slice(0, Array.from(question.verb).length).join(' ');
  const pickedPhrase = (o: string) => ({ zh: question.verb + o, py: verbPy ? `${verbPy} ${readingOf(o)}` : undefined, en: choiceGloss(o) });
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
          detail={correct && !none ? undefined : list ? (
            // ✓ the pair and ✗ the phrase he made, each whole with its pinyin and English (weekly list spec §7.5)
            <MeaningNote lead right={pair} rightPinyin={list.reading} rightMeaning={list.gloss} picked={correct || choice === null || choice === NONE_OF_THESE ? (choice === NONE_OF_THESE ? choice : null) : pickedPhrase(choice)} />
          ) : ( // a 都不对 question shows the real pair, right or wrong
            <>
              <span class="hanzi">{pair}</span>
              <SpeakButton text={pair} />
              <MeaningNote right={question.noun} picked={correct ? null : choice} speak={false} /> {/* 都不对 picked wrongly is said plainly (missNote.ts) */}
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
