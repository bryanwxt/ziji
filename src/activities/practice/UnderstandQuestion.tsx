import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { onSpeaking } from '../../audio/speaking';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { UnderstandItem } from '../../practice/understand';
import type { KidState } from '../../types';
import { Label } from '../../ui/Label';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import type { TruffleMood } from '../../ui/truffle/Truffle';

interface Props {
  item: UnderstandItem;
  kid: KidState;
  resting: TruffleMood;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
}

/** If the voice never says it has finished, the choices open anyway after this long. */
export const UNDERSTAND_WAIT_MS = 5000;
/** A stop in speech counts as the end only if nothing starts again within this long (a replay restarts it at once). */
const SETTLE_MS = 250;

/**
 * The Understand rung (spec 2026-10-06 §3.2): he hears a sentence with the word (no characters) and picks what it means from
 * three English sentences. The choices open once the sentence has played, so a tap can't come before listening; after a miss,
 * the sheet shows the sentence and its English.
 */
export function UnderstandQuestion({ item, kid, resting, onDone }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ item.zh.codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [item]);
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const shownAt = useRef(performance.now());
  const tookMs = useRef(0); // from when the question appeared (the sentence included) to his pick (final review I4)
  useEffect(() => {
    speak(item.zh);
    // the choices open when the sentence has ended: a replay's cancel says "stopped" and then starts again at once, so a
    // stop counts only if nothing starts again within a moment (final review: a replay mid-sentence opened them)
    let settle: ReturnType<typeof setTimeout> | undefined;
    const open = () => setReady(true);
    const off = onSpeaking((on) => {
      clearTimeout(settle);
      if (!on) settle = setTimeout(open, SETTLE_MS);
    });
    const t = setTimeout(open, UNDERSTAND_WAIT_MS);
    return () => { off(); clearTimeout(t); clearTimeout(settle); };
  }, [item]);
  const done = choice !== null;
  const correct = choice === item.en;
  const pick = (c: string) => {
    if (done || !ready) return;
    tookMs.current = Math.round(performance.now() - shownAt.current);
    setChoice(c);
    playSfx(c === item.en ? 'correct' : 'wrong');
  };
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (correct ? 'pleased' : 'side') : resting} bubble={done ? null : '听一听，是什么意思？'} size={180} calm={!done} react={done ? { kind: correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={correct ? 'good' : 'oops'}
          title={correct ? lines.cheer : lines.comfort}
          detail={correct ? undefined : (
            <>
              <span class="hanzi understand__zh"><Label zh={item.zh} /></span>
              <SpeakButton text={item.zh} small />
              <p lang="en" class="sheet__en-line">{item.en}</p>
            </>
          )}
          actionLabel="继续"
          onAction={() => onDone({ correct, responseMs: tookMs.current })}
        />
      )}
    >
      <div class="understand">
        <SpeakButton text={item.zh} big />
      </div>
      <div class="choices understand__choices">
        {item.choices.map((c) => (
          <button key={c} type="button" lang="en" class={`choice press understand__choice${done ? (c === item.en ? ' is-answer' : c === choice ? ' is-wrong' : ' is-dim') : ''}`} disabled={done || !ready} onClick={() => pick(c)}>{c}</button>
        ))}
      </div>
    </Stage>
  );
}
