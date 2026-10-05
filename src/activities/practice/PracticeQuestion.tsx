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
import { pickZuju } from '../../content/zuju';
import { BuildSentence } from './BuildSentence';
import { PairGame } from './PairGame';
import { dapeiQuestion, zuciBoard } from '../../practice/pairs';
import { MatchQuestion } from './MatchQuestion';
import { IdiomQuestion } from './IdiomQuestion';
import { idiomFitItem, idiomGap, idiomZuju, pickIdiom } from '../../practice/idioms';
import { builtinIdiom, idiomOf, idiomsFor, type Idiom } from '../../content/chengyu';

export interface PracticeResult {
  correct: boolean;
  hard: boolean;
  responseMs: number;
  elapsedMs: number;
  inContext: boolean;
  asked: 'read' | 'meaning' | 'use' | 'zibian';
  picked?: string;
  idiom?: string; // the 成语 a rung-5 question asked (a miss brings the same one back)
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
  level?: number; // his level, for the 成语 window (spec §4)
}

/** One 练一练 question (spec 2026-10-05 §3.2): 字 and 词语 on the card, a sentence on the 选一选 stage. */
export function PracticeQuestion({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, confused, knownChars, level = 1 }: Props) {
  const sentence = item.ask === 'fit' || item.ask === 'usage';
  const use = useMemo(
    () => (item.ask === 'fit' ? fitItem(word, pool, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0), 0) : item.ask === 'usage' ? usageItem(word.text, word.id) : null),
    [item, word.id],
  );
  const zuju = useMemo(() => (item.ask === 'build' ? pickZuju(word, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
  const match = useMemo(() => (item.ask === 'match' ? dapeiQuestion(word, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
  const board = useMemo(() => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    return item.ask === 'pair' ? zuciBoard(word, rng, knownChars) : null;
  }, [item, word.id]);
  const fish = useMemo(() => (item.ask === 'fish' ? fishItem(word, confused ?? [], knownChars ?? new Set(), mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
  // 成语 (rung 5): one that uses the word at his level; a school 成语's own completion at rung 2; a retry asks the same one again
  const idiom = useMemo(() => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    const again = (ok: (i: Idiom) => boolean): Idiom | null => {
      if (!item.idiom) return null;
      const school = pool.find((w) => w.text === item.idiom);
      const i = (school && idiomOf(school)) ?? builtinIdiom(item.idiom) ?? null;
      return i && ok(i) ? i : null;
    };
    const choose = (ok: (i: Idiom) => boolean) => again(ok) ?? pickIdiom(word, level, pool, rng, ok);
    if (item.ask === 'whole') { const own = idiomOf(word); return { gap: own && idiomGap(own, null, rng), fit: null, build: null }; }
    if (item.ask === 'idiom') { const i = choose((x) => idiomGap(x, word.text, mulberry32(1)) !== null); return { gap: i && idiomGap(i, word.text, rng), fit: null, build: null }; }
    if (item.ask === 'idiomFit') {
      const i = choose((x) => idiomFitItem(x, null, mulberry32(1), level) !== null);
      return { gap: null, fit: i && idiomFitItem(i, idiomsFor(word, level, pool).filter((x) => x.school), rng, level), build: null };
    }
    if (item.ask === 'idiomBuild') { const i = choose((x) => idiomZuju(x, mulberry32(1)) !== null); return { gap: null, fit: null, build: i && { idiom: i, zuju: idiomZuju(i, rng) } }; }
    return null;
  }, [item, word.id]);
  const answer = useRef<{ correct: boolean; ms: number } | null>(null);
  const shownAt = useRef(performance.now());
  useEffect(() => {
    if ((sentence && !use) || (item.ask === 'build' && !zuju) || (item.ask === 'pair' && !board) || (item.ask === 'match' && !match) || (item.ask === 'fish' && !fish)) onDone(null);
    else if (idiom && !idiom.gap && !idiom.fit && !idiom.build?.zuju) onDone(null);
  }, []);

  if (idiom) {
    if (idiom.gap) {
      return (
        <IdiomQuestion
          gap={idiom.gap}
          kid={kid}
          resting={resting}
          onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning', picked: r.picked, idiom: idiom.gap!.idiom.text })}
        />
      );
    }
    if (idiom.fit) {
      return (
        <UseQuestion
          item={idiom.fit}
          kid={kid}
          resting={resting}
          onAnswer={(correct, ms) => {
            answer.current = { correct, ms };
          }}
          onNext={() => {
            const a = answer.current;
            if (a) onDone({ correct: a.correct, hard: false, responseMs: a.ms, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: true, asked: 'meaning', idiom: idiom.fit!.word });
          }}
        />
      );
    }
    if (idiom.build?.zuju) {
      return (
        <BuildSentence
          item={idiom.build.zuju}
          word={{ ...word, text: idiom.build.idiom.text }}
          kid={kid}
          resting={resting}
          onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: true, asked: 'use', idiom: idiom.build!.idiom.text })}
        />
      );
    }
    return null;
  }

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
  if (item.ask === 'match') {
    if (!match) return null;
    return (
      <MatchQuestion
        question={match}
        kid={kid}
        resting={resting}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning' })}
      />
    );
  }
  if (item.ask === 'pair') {
    if (!board) return null;
    return (
      <PairGame
        board={board}
        kind="pair"
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
        peek={!!item.missed}
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
