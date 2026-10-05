import { useEffect, useMemo, useRef } from 'preact/hooks';
import { mulberry32 } from '../../lib/random';
import { fitItem, usageItem } from '../../practice/useItems';
import type { PracticeItem } from '../../session/round';
import type { CardRecord, KidState, Word } from '../../types';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import { UseQuestion } from '../choose/UseQuestion';
import { FlashcardStep } from '../flashcards/FlashcardStep';
import { ComponentsStep } from '../components/ComponentsStep';
import { fishItem } from '../components/zibian';
import { zujuFor } from '../../content/zuju';
import { BuildSentence } from './BuildSentence';
import { PairGame } from './PairGame';
import { dapeiBoard, zuciBoard } from '../../practice/pairs';

export interface PracticeResult {
  correct: boolean;
  hard: boolean;
  responseMs: number;
  elapsedMs: number;
  inContext: boolean;
  asked: 'read' | 'meaning' | 'use' | 'zibian';
  picked?: string;
}

interface Props {
  item: PracticeItem;
  word: Word;
  pool: Word[];
  card?: CardRecord;
  voice: boolean;
  kid: KidState;
  resting: TruffleMood;
  combo: number;
  closeupReady: boolean;
  onDone: (r: PracticeResult | null) => void; // null: this question can't be made any more (skip it)
  confused?: string[]; // look-alikes he picked for this word (钓鱼)
  knownChars?: ReadonlySet<string>;
}

/** One 练一练 question (spec 2026-10-05 §3.2): 字 and 词语 on the card, a sentence on the 选一选 stage. */
export function PracticeQuestion({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, confused, knownChars }: Props) {
  const sentence = item.ask === 'fit' || item.ask === 'usage';
  const use = useMemo(
    () => (item.ask === 'fit' ? fitItem(word, pool, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0), 0) : item.ask === 'usage' ? usageItem(word.text, word.id) : null),
    [item, word.id],
  );
  const zuju = useMemo(() => (item.ask === 'build' ? zujuFor(word)[0] ?? null : null), [item, word.id]);
  const board = useMemo(() => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    return item.ask === 'pair' ? zuciBoard(word, rng) : item.ask === 'match' ? dapeiBoard(word, rng) : null;
  }, [item, word.id]);
  const fish = useMemo(() => (item.ask === 'fish' ? fishItem(word, confused ?? [], knownChars ?? new Set(), mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
  const answer = useRef<{ correct: boolean; ms: number } | null>(null);
  const shownAt = useRef(performance.now());
  useEffect(() => {
    if ((sentence && !use) || (item.ask === 'build' && !zuju) || ((item.ask === 'pair' || item.ask === 'match') && !board) || (item.ask === 'fish' && !fish)) onDone(null);
  }, []);

  if (item.ask === 'fish') {
    if (!fish) return null;
    return (
      <ComponentsStep
        items={[fish]}
        kid={kid}
        resting={resting}
        onAnswer={(_, correct) => {
          answer.current = { correct, ms: Math.round(performance.now() - shownAt.current) };
        }}
        onDone={() => {
          const a = answer.current;
          if (a) onDone({ correct: a.correct, hard: false, responseMs: a.ms, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'zibian' });
        }}
      />
    );
  }
  if (item.ask === 'pair' || item.ask === 'match') {
    if (!board) return null;
    return (
      <PairGame
        board={board}
        kind={item.ask}
        kid={kid}
        resting={resting}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning' })}
      />
    );
  }
  if (item.ask === 'build') {
    if (!zuju) return null;
    return (
      <BuildSentence
        item={zuju}
        word={word}
        kid={kid}
        resting={resting}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: true, asked: 'use' })}
      />
    );
  }
  if (!sentence) {
    return (
      <FlashcardStep
        item={{ wordId: word.id, isNew: false, retry: item.retry, mode: item.ask === 'word' ? 'meaning' : 'read' }}
        ask={item.ask === 'listen' ? 'listen' : item.ask === 'word' ? 'word' : 'read'}
        word={word} pool={pool} card={card} voice={voice} kid={kid} resting={resting} combo={combo} closeupReady={closeupReady}
        onDone={(r) => onDone(r)}
      />
    );
  }
  if (!use) return null;
  return (
    <UseQuestion
      item={use}
      kid={kid}
      resting={resting}
      onAnswer={(correct, ms) => {
        answer.current = { correct, ms };
      }}
      onNext={() => {
        const a = answer.current;
        if (a) onDone({ correct: a.correct, hard: false, responseMs: a.ms, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: true, asked: 'use' });
      }}
    />
  );
}
