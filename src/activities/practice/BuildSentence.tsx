import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import type { ZujuItem } from '../../content/zuju';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32, shuffle } from '../../lib/random';
import type { KidState, Word } from '../../types';
import { Label } from '../../ui/Label';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import type { TruffleMood } from '../../ui/truffle/Truffle';

interface Props {
  item: ZujuItem;
  word: Word;
  kid: KidState;
  resting: TruffleMood;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
}

/** 组句 (spec 2026-10-05 §3.2 rung 4): tap the word tiles into the sentence; tap a placed tile to take it back. */
export function BuildSentence({ item, word, kid, resting, onDone }: Props) {
  const setup = useMemo(() => {
    const rng = mulberry32((Date.now() ^ item.full.codePointAt(0)!) >>> 0);
    let order = shuffle(item.tiles.map((_, i) => i), rng);
    for (let n = 0; n < 5 && order.every((v, i) => v === i); n++) order = shuffle(order, rng); // never handed over in order
    return { order, cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) };
  }, [item]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<{ correct: boolean; responseMs: number } | null>(null);
  const shownAt = useRef(performance.now());
  useEffect(() => speak(item.full), [item]); // he hears it first (final review I3): the order is the one he heard

  useEffect(() => {
    if (placed.length < item.tiles.length || result) return;
    const built = placed.map((i) => item.tiles[i]!).join('');
    const correct = item.orders.some((o) => o.join('') === built);
    setResult({ correct, responseMs: Math.round(performance.now() - shownAt.current) });
    playSfx(correct ? 'correct' : 'wrong');
    speak(item.full); // the sentence as it goes, either way (spec §3.6)
  }, [placed]);

  const done = result !== null;
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (result.correct ? 'pleased' : 'side') : resting} bubble={done ? null : '排一排！'} size={180} calm={!done} react={done ? { kind: result.correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? setup.cheer : setup.comfort}
          detail={result.correct ? undefined : (
            <>
              <span class="hanzi">{item.full}</span>
              <SpeakButton text={item.full} />
              <MeaningNote right={word.text} />
            </>
          )}
          actionLabel="继续"
          onAction={() => onDone(result)}
        />
      )}
    >
      <div class="build">
        <span class="build__listen"><SpeakButton text={item.full} /></span>
        <div class="build__answer hanzi" aria-label="句子">
          {placed.map((i) => (
            <button key={i} type="button" class="build__placed" disabled={done} onClick={() => setPlaced(placed.filter((p) => p !== i))}>
              <Label zh={item.tiles[i]!} />
            </button>
          ))}
        </div>
        <div class="build__bank">
          {setup.order.filter((i) => !placed.includes(i)).map((i) => (
            <button key={i} type="button" class="choice press build__tile" disabled={done} onClick={() => setPlaced([...placed, i])}>
              {item.tiles[i]}
            </button>
          ))}
        </div>
      </div>
    </Stage>
  );
}
