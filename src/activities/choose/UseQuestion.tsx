import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32, shuffle } from '../../lib/random';
import { fullSentence, type UseItem } from '../../practice/useItems';
import type { KidState } from '../../types';
import { BottomBar } from '../../ui/BottomBar';
import { burst } from '../../ui/motion';
import { Pet } from '../../ui/Pet';
import type { TruffleMood } from '../../ui/truffle/Truffle';

interface Props {
  item: UseItem;
  kid: KidState;
  resting: TruffleMood;
  bubble?: string; // the step's own opener (用一用！) instead of the question
  closing?: boolean; // the last try at this word missed: Truffle closes it kindly
  onAnswer: (correct: boolean, responseMs: number) => void;
  onNext: () => void;
}

/** One word-in-use question (spec §20 part 4): which word fits the sentence, or which sentence uses the word right. */
export function UseQuestion({ item, kid, resting, bubble, closing, onAnswer, onNext }: Props) {
  const [choice, setChoice] = useState<string | null>(null);
  const shownAt = useRef(performance.now());
  const lines = useMemo(() => {
    const rng = mulberry32((Date.now() ^ item.word.codePointAt(0)!) >>> 0);
    return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), order: item.kind === 'usage' ? shuffle([item.right, item.wrong], rng) : [] };
  }, [item]);
  const answer = item.kind === 'fit' ? item.word : item.right;
  const correct = choice === answer;
  const done = choice !== null;
  useEffect(() => {
    shownAt.current = performance.now();
  }, [item]);

  const choose = (option: string, el: HTMLElement) => {
    if (done) return;
    setChoice(option);
    const right = option === answer;
    if (right) {
      playSfx('correct');
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
    } else playSfx('wrong');
    speak(fullSentence(item)); // the whole sentence, once he has answered (spec §19 part 3)
    onAnswer(right, Math.round(performance.now() - shownAt.current));
  };
  const state = (o: string) => (!done ? '' : o === answer ? (o === choice ? 'is-eaten is-right' : 'is-answer') : o === choice ? 'is-wrong' : 'is-dim');
  const ask = item.kind === 'fit' ? '哪个词对？' : '哪句话用对了？';
  const multi = item.kind === 'fit' && item.options.some((o) => Array.from(o).length > 1);

  return (
    <>
      <div class="flash use">
        <div class="flash__pet">
          <Pet kid={kid} mood={done ? (correct ? 'pleased' : 'side') : resting} bubble={done ? (closing ? '明天再来！' : null) : (bubble ?? ask)} size={180} bounce={done && correct} />
        </div>
        <div class="flash__main">
          {item.kind === 'fit' ? (
            <>
              <div class="flash__prompt">
                <div class="hanzi meaning-cue meaning-cue--sentence" lang="zh">
                  {item.before}
                  <span class="meaning-cue__blank" aria-label="空格">{done ? item.word : '？'}</span>
                  {item.after}
                </div>
              </div>
              <div class={`choices stagger choices--hanzi${multi ? ' choices--words' : ''}`}>
                {item.options.map((o) => (
                  <button key={o} type="button" class={`choice press ${state(o)}`} disabled={done} onClick={(e) => choose(o, e.currentTarget)}>
                    {o}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div class="usage-opts stagger" lang="zh">
              {lines.order.map((s) => (
                <button key={s} type="button" class={`choice usage-opt hanzi press ${state(s)}`} disabled={done} onClick={(e) => choose(s, e.currentTarget)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {!done ? (
        <BottomBar actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <BottomBar
          tone={correct ? 'good' : 'oops'}
          title={closing ? '明天再来！' : correct ? lines.cheer : lines.comfort}
          detail={
            correct && !item.pair ? undefined : (
              <>
                {!correct && <span class="hanzi">{fullSentence(item)}</span>}
                {item.pair && <span class="pair hanzi">{`${item.word} + ${item.pair}`}</span>}
                {!correct && item.kind === 'fit' && item.clue && <span class="clue hanzi">{item.clue}</span>}
              </>
            )
          }
          actionLabel="继续"
          onAction={onNext}
        />
      )}
    </>
  );
}
