import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32 } from '../../lib/random';
import type { PairBoard } from '../../practice/pairs';
import type { KidState } from '../../types';
import { glossFor } from '../../content/glossary';
import { Label } from '../../ui/Label';
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

/**
 * Pairing (spec 2026-10-05 §3.2 rung 2): tap a left half, then its right half; tap the picked half again to let go. A wrong
 * pair lets go; three misses on a tile show its match. Only the word's own pair is graded: its first try, timed from its pick.
 * Tiles are told apart by column and place, not by text, so a doubled word (妈妈) works.
 */
/** A colour per matched pair: green, blue, gold, purple (palette inks dark enough for a ✓ on paper). */
const PAIR_COLOURS = ['#2a9d5c', '#2f7fd8', '#c98a12', '#8a5cd6'];

export function PairGame({ board, kind, kid, resting, onDone }: Props) {
  const lines = useMemo(() => { const rng = mulberry32((Date.now() ^ board.target[0].codePointAt(0)!) >>> 0); return { cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) }; }, [board]);
  const [picked, setPicked] = useState<number | null>(null); // a left index
  const [joined, setJoined] = useState<Set<string>>(new Set()); // 'L0', 'R2'… joined, right or shown
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Record<string, number>>({}); // per tile he started from: 'L0', 'R2'…
  const [result, setResult] = useState<{ correct: boolean; responseMs: number } | null>(null);
  const target = useRef<{ pickedAt: number; tries: number; ms: number }>({ pickedAt: 0, tries: 0, ms: 0 });
  const isTarget = (l: number) => board.left[l] === board.target[0];
  const leftOf = (r: number) => board.left.findIndex((x, j) => board.pairs.find(([a]) => a === x)![1] === board.right[r] && !joined.has(`L${j}`));
  const partnerOf = (l: number) => board.right.findIndex((r, i) => r === board.pairs.find(([a]) => a === board.left[l])![1] && !joined.has(`R${i}`));

  useEffect(() => {
    if (joined.size < board.pairs.length * 2 || result) return;
    const t = target.current;
    const correct = t.tries === 1 && !shown.has(`L${board.left.findIndex((x) => x === board.target[0])}`);
    setResult({ correct, responseMs: t.ms });
    playSfx(correct ? 'correct' : 'wrong');
  }, [joined]);

  const pick = (l: number) => {
    if (picked === l) return setPicked(null); // let go
    setPicked(l);
    speak(board.left[l]!); // he hears what he picked: reading, not just matching shapes (parent, 2026-10-05)
    if (isTarget(l) && !target.current.pickedAt) target.current.pickedAt = performance.now();
  };
  const tapRight = (r: number) => {
    if (picked === null) return;
    const l = picked;
    const partner = partnerOf(l);
    if (isTarget(l)) target.current.tries += 1;
    if (partner === r) {
      if (isTarget(l)) target.current.ms = Math.round(performance.now() - target.current.pickedAt);
      setJoined(new Set([...joined, `L${l}`, `R${r}`]));
      speak(board.left[l]! + board.right[r]!);
    } else {
      // the miss counts on the tile he started from, and help shows that tile's own match (final review)
      const from = `${picked.side}${picked.i}`;
      const n = (missed[from] ?? 0) + 1;
      setMissed({ ...missed, [from]: n });
      if (n >= SHOW_AFTER) {
        const pair = picked.side === 'L' ? [`L${l}`, `R${partner}`] : [`L${leftOf(r)}`, `R${r}`];
        setShown(new Set([...shown, ...pair]));
        setJoined(new Set([...joined, ...pair]));
      }
    }
    setPicked(null);
  };

  const done = result !== null;
  const anyMiss = Object.values(missed).some((n) => n > 0);
  const cls = (key: string, isPicked: boolean) => `choice press pair__tile${joined.has(key) ? (shown.has(key) ? ' is-shown' : ' is-matched') : ''}${isPicked ? ' is-picked' : ''}`;
  // the two tiles of a pair share a colour, in the order he joined them, so he sees which go together (parent, 2026-10-05)
  const order = [...joined];
  const pairStyle = (key: string) => (joined.has(key) && !shown.has(key) ? `--pc:${PAIR_COLOURS[(order.indexOf(key) >> 1) % PAIR_COLOURS.length]}` : undefined);
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
          // after any wrong try every 组词 on the board is explained, the missed ones marked, and it waits for him to read
          // them: a board cleared by guessing still teaches (parent, 2026-10-05)
          auto={!anyMiss}
          detail={result.correct && !anyMiss ? undefined : (
            <div class="pair-summary">
              {board.pairs.map(([l, r], i) => {
                const word = l + r;
                const wrong = (missed[board.left.indexOf(l)] ?? 0) > 0;
                return (
                  <p key={i} class={`pair-summary__row${wrong ? ' is-missed' : ''}`}>
                    <span class="hanzi"><Label zh={word} /></span>
                    {glossFor(word) && <span lang="en">{glossFor(word)}</span>}
                  </p>
                );
              })}
            </div>
          )}
          actionLabel="继续"
          onAction={() => onDone(result)}
        />
      )}
    >
      <div class="pairs">
        {/* the right halves come first in the page (CSS shows them on the right): the first open tile is always one that moves the game on */}
        <div class="pairs__col pairs__col--right">
          {board.right.map((r, i) => (
            <button key={`R${i}`} type="button" class={cls(`R${i}`, false)} style={pairStyle(`R${i}`)} disabled={done || joined.has(`R${i}`) || picked === null} onClick={() => tapRight(i)}>{r}</button>
          ))}
        </div>
        <div class="pairs__col pairs__col--left">
          {board.left.map((l, i) => (
            <button key={`L${i}`} type="button" class={cls(`L${i}`, picked === i)} style={pairStyle(`L${i}`)} disabled={done || joined.has(`L${i}`) || (picked !== null && picked !== i)} onClick={() => pick(i)}>{l}</button>
          ))}
        </div>
      </div>
    </Stage>
  );
}
