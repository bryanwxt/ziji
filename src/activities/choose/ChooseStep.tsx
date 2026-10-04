import { useState } from 'preact/hooks';
import type { UseItem } from '../../practice/useItems';
import type { KidState } from '../../types';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import { UseQuestion } from './UseQuestion';

interface Props {
  items: UseItem[];
  kid: KidState;
  resting: TruffleMood;
  onAnswer: (item: UseItem, correct: boolean, responseMs: number) => void;
  onDone: () => void;
}

/** 选一选 (spec §20 part 4): which word fits, and 用对了吗, in turn. */
export function ChooseStep({ items, kid, resting, onAnswer, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const item = items[index]!;
  return (
    <UseQuestion
      key={index}
      item={item}
      kid={kid}
      resting={resting}
      onAnswer={(c, ms) => onAnswer(item, c, ms)}
      onNext={() => (index + 1 >= items.length ? onDone() : setIndex(index + 1))}
    />
  );
}
