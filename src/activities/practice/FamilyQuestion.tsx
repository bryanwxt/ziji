import { Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak, stopSpeaking } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { FamilyBoard } from '../../practice/family';
import type { KidState } from '../../types';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { LookAlikeWhy } from '../../ui/stage/WhyLine';

interface Props {
  board: FamilyBoard;
  kid: KidState;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
}

/** Where a character sits in a word, to mark it. */
const markAt = (text: string, ch: string): [number, number] | undefined => {
  const at = Array.from(text).indexOf(ch);
  return at < 0 ? undefined : [at, 1];
};

/**
 * 找一家人 (spec 2026-10-12 §5): the character, and six words — he taps the two that have it. A tap on a picked word lets it go;
 * the second word marks it. The sheet gives the two family words; after a miss, the look-alike he took for it.
 */
export function FamilyQuestion({ board, kid, onDone }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ board.ch.codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [board]);
  const [picked, setPicked] = useState<string[]>([]);
  const shownAt = useRef(performance.now());
  const tookMs = useRef(0);
  useEffect(() => {
    // the character on its own at its card's reading: inside one line the voice may pick its other reading (切 qiē, 教 jiāo)
    speak('哪两个词有');
    speak(board.ch, { reading: board.reading, queue: true });
  }, [board]);
  useEffect(() => stopSpeaking, []);
  const family = new Set(board.family.map((f) => f.text));
  const done = picked.length === 2;
  const correct = done && picked.every((t) => family.has(t));
  const tap = (t: string) => {
    if (done) return;
    if (picked.includes(t)) { setPicked(picked.filter((x) => x !== t)); return; } // let go
    const next = [...picked, t];
    setPicked(next);
    speak(t); // he hears what he picked (as in 连一连)
    if (next.length === 2) {
      tookMs.current = Math.round(performance.now() - shownAt.current);
      playSfx(next.every((x) => family.has(x)) ? 'correct' : 'wrong');
    }
  };
  const state = (t: string) => (!done ? (picked.includes(t) ? ' is-picked' : '') : family.has(t) ? ' is-answer' : picked.includes(t) ? ' is-wrong' : ' is-dim');
  const wrong = board.distractors.filter((d) => picked.includes(d.text));
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (correct ? 'pleased' : 'side') : 'neutral'} bubble={done ? null : '找一家人！'} size={180} calm={!done} react={done ? { kind: correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={correct ? 'good' : 'oops'}
          title={correct ? lines.cheer : lines.comfort}
          detail={
            <div class="family-sum">
              {board.family.map((f) => (
                <p key={f.text} class="family-sum__row"><span class="hanzi"><Label zh={f.text} py={f.pinyin} mark={markAt(f.text, board.ch)} /></span><span lang="en">{f.en}</span></p>
              ))}
              {wrong.map((d) => (
                <Fragment key={d.text}>
                  <p class="family-sum__row is-missed"><span class="hanzi"><Label zh={d.text} py={d.pinyin} mark={markAt(d.text, d.swap)} /></span><span lang="en">{d.en}</span></p>
                  <LookAlikeWhy right={board.ch} picked={d.swap} />
                </Fragment>
              ))}
            </div>
          }
          actionLabel="继续"
          onAction={() => onDone({ correct, responseMs: tookMs.current })}
        />
      )}
    >
      <div class="flash__prompt family-q">
        <div class="hanzi hanzi--q" data-q>{board.ch}</div>
        <p class="family-q__ask"><Label zh={`哪两个词有『${board.ch}』？`} /></p>
      </div>
      <div class="choices stagger choices--hanzi choices--words choices--six family-q__tiles">
        {board.tiles.map((t) => (
          <button key={t} type="button" class={`choice press${state(t)}`} disabled={done} onClick={() => tap(t)}>{t}</button>
        ))}
      </div>
    </Stage>
  );
}
