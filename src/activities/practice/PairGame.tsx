import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { PairBoard } from '../../practice/pairs';
import type { KidState } from '../../types';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Pet } from '../../ui/Pet';
import type { TruffleMood } from '../../ui/truffle/Truffle';

interface Props {
  board: PairBoard;
  kind: 'pair' | 'match'; // 组词 or 搭配
  kid: KidState;
  resting: TruffleMood;
  onDone: (r: { correct: boolean; responseMs: number }) => void;
}

const SHOW_AFTER = 3; // misses on one tile before its match is shown (review focus 3)

/** Pairing (spec 2026-10-05 §3.2 rung 2): tap a left half, then its right half. A wrong pair lets go; three misses show the match. */
export function PairGame({ board, kind, kid, resting, onDone }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ board.target[0].codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [board]);
  const [picked, setPicked] = useState<string | null>(null);
  const [joined, setJoined] = useState<Set<string>>(new Set()); // halves already joined, right or shown
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ correct: boolean; responseMs: number } | null>(null);
  const shownAt = useRef(performance.now());
  const partner = (l: string) => board.pairs.find(([a]) => a === l)![1];
  const misses = Object.values(missed).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (joined.size < board.pairs.length * 2 || result) return;
    const correct = misses === 0 && shown.size === 0;
    setResult({ correct, responseMs: Math.round(performance.now() - shownAt.current) });
    playSfx(correct ? 'correct' : 'wrong');
  }, [joined]);

  const tapRight = (r: string) => {
    if (!picked) return;
    if (partner(picked) === r) {
      setJoined(new Set([...joined, picked, r]));
      speak(kind === 'pair' ? picked + r : `${picked}${r}`);
    } else {
      const n = (missed[picked] ?? 0) + 1;
      setMissed({ ...missed, [picked]: n });
      if (n >= SHOW_AFTER) {
        const right = partner(picked);
        setShown(new Set([...shown, picked, right]));
        setJoined(new Set([...joined, picked, right]));
      }
    }
    setPicked(null);
  };

  const done = result !== null;
  const cls = (t: string) => `choice press pair__tile${joined.has(t) ? (shown.has(t) ? ' is-shown' : ' is-matched') : ''}${picked === t ? ' is-picked' : ''}`;
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood={done ? (result.correct ? 'pleased' : 'side') : resting} bubble={done ? null : kind === 'pair' ? '连一连，组成词！' : '连一连，哪两个一起用？'} size={180} calm={!done} react={done ? { kind: result.correct ? 'right' : 'wrong', key: 1 } : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? lines.cheer : lines.comfort}
          detail={result.correct ? undefined : (
            <>
              <span class="hanzi">{board.pairs.map(([l, r]) => l + r).join('　')}</span>
              <MeaningNote right={board.target.join('')} />
            </>
          )}
          actionLabel="继续"
          onAction={() => onDone(result)}
        />
      )}
    >
      <div class="pairs">
        <div class="pairs__col">
          {board.left.map((l) => (
            <button key={l} type="button" class={cls(l)} disabled={done || joined.has(l) || (picked !== null)} onClick={() => setPicked(l)}>{l}</button>
          ))}
        </div>
        <div class="pairs__col">
          {board.right.map((r) => (
            <button key={r} type="button" class={cls(r)} disabled={done || joined.has(r) || picked === null} onClick={() => tapRight(r)}>{r}</button>
          ))}
        </div>
      </div>
    </Stage>
  );
}
