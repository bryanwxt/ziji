import { useRef, useState } from 'preact/hooks';
import type { UseItem } from '../../practice/useItems';
import { WRAPUP_TRIES } from '../../session/wrapup';
import type { KidState } from '../../types';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import { UseQuestion } from './UseQuestion';

interface Props {
  items: UseItem[];
  kid: KidState;
  resting: TruffleMood;
  onAnswer: (item: UseItem, correct: boolean, responseMs: number) => void;
  onGiveUp: (item: UseItem) => void; // missed 3 times: closed kindly, its meaning comes back tomorrow
  onDone: () => void;
  makeRetry?: (item: UseItem) => UseItem | null; // the word asked another way, so a retry isn't the answer he was just shown
}

const keyOf = (i: UseItem) => i.wordId ?? i.word;

/** 用一用 (spec §20 part 7): every target word used right once more before the chest. A miss comes back after the others, up to 3 tries. */
export function WrapupStep({ items, kid, resting, onAnswer, onGiveUp, onDone, makeRetry }: Props) {
  const [queue, setQueue] = useState(items);
  const [index, setIndex] = useState(0);
  const [closing, setClosing] = useState(false);
  const tries = useRef(new Map<string, number>());
  const item = queue[index]!;

  const answer = (correct: boolean, ms: number) => {
    const key = keyOf(item);
    const n = (tries.current.get(key) ?? 0) + 1;
    tries.current.set(key, n);
    if (!correct && n < WRAPUP_TRIES) setQueue((q) => [...q, makeRetry?.(item) ?? item]);
    if (!correct && n >= WRAPUP_TRIES) setClosing(true);
    onAnswer(item, correct, ms);
  };
  const next = () => {
    let q = queue;
    if (closing) {
      onGiveUp(item);
      q = [...queue.slice(0, index + 1), ...queue.slice(index + 1).filter((i) => keyOf(i) !== keyOf(item))]; // closed: never asked again
      setQueue(q);
    }
    setClosing(false);
    if (index + 1 >= q.length) onDone();
    else setIndex(index + 1);
  };
  return (
    <UseQuestion key={index} item={item} kid={kid} resting={resting} bubble={index === 0 ? '用一用！' : undefined} closing={closing} onAnswer={answer} onNext={next} />
  );
}
