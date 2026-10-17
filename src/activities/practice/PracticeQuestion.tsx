import { useEffect, useMemo, useRef } from 'preact/hooks';
import { noneKind } from '../../practice/noneOfThese';
import { mulberry32, shuffle } from '../../lib/random';
import { fitUseItem } from '../../weeklist/fit';
import { pairGloss } from '../../practice/missNote';
import { readingOf } from '../../content/wordGate';
import { fitItem, usageItem } from '../../practice/useItems';
import type { PracticeItem } from '../../session/round';
import type { CardRecord, KidState, ListCard, Word } from '../../types';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import { UseQuestion } from '../choose/UseQuestion';
import { FlashcardStep } from '../flashcards/FlashcardStep';
import { ComponentsStep } from '../components/ComponentsStep';
import { fishItem } from '../components/zibian';
import { pickZuju } from '../../content/zuju';
import { BuildSentence } from './BuildSentence';
import { PairGame } from './PairGame';
import { dapeiQuestion, listBoard, zuciBoard } from '../../practice/pairs';
import { MatchQuestion } from './MatchQuestion';
import { UnderstandQuestion } from './UnderstandQuestion';
import { understandItem } from '../../practice/understand';
import { IdiomQuestion } from './IdiomQuestion';
import { idiomFitItem, idiomGap, idiomZuju, pickIdiom } from '../../practice/idioms';
import { builtinIdiom, idiomOf, idiomsFor, type Idiom } from '../../content/chengyu';
import { FamilyQuestion } from './FamilyQuestion';
import { familyBoard } from '../../practice/family';

export interface PracticeResult {
  correct: boolean;
  hard: boolean;
  responseMs: number;
  elapsedMs: number;
  inContext: boolean;
  asked: 'read' | 'meaning' | 'use' | 'zibian' | 'hear' | 'understand';
  picked?: string;
  idiom?: string; // the 成语 a rung-5 question asked (a miss brings the same one back)
  listPairs?: { left: string; right: string; correct: boolean }[]; // a weekly list 搭配 or board: each pair asked, right or not (weekly list spec §7.5)
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
  listCard?: ListCard; // a weekly list word's card: a list verb is said as its pair (weekly list spec §7.2)
}

/** One 练一练 question (spec 2026-10-05 §3.2): 字 and 词语 on the card, a sentence on the 选一选 stage. */
export function PracticeQuestion({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, confused, knownChars, level = 1, listCard }: Props) {
  const sentence = item.ask === 'fit' || item.ask === 'usage';
  // a weekly list's own items (weekly list spec 2026-10-17 §7.3–7.5): its confirmed 选词填空 row, its pair with the parent's wrong
  // partners, or a 连一连 board of its pairs with a decoy
  const use = useMemo(
    () => (item.list?.fit ? fitUseItem(item.list.fit, word, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0), pool)
      : item.ask === 'fit' ? fitItem(word, pool, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0), 0) : item.ask === 'usage' ? usageItem(word.text, word.id) : null),
    [item, word.id],
  );
  const listPair = item.list?.pair;
  const listMatch = useMemo(() => (listPair ? { verb: listPair.left, noun: listPair.right, options: shuffle([listPair.right, ...listPair.wrong], mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) } : null), [item, word.id]);
  const listB = useMemo(() => (item.list?.pairs ? listBoard(item.list.pairs, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0), (l, r) => pairGloss(l, r, pool)) : null), [item, word.id]);
  const zuju = useMemo(() => (item.ask === 'build' ? pickZuju(word, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
  const match = useMemo(() => listMatch ?? (item.ask === 'match' && !item.list ? dapeiQuestion(word, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
  const board = useMemo(() => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    return item.ask === 'pair' ? zuciBoard(word, rng, knownChars) : null;
  }, [item, word.id]);
  // no voice today (a saved queue resumed): never asked in silence — skipped (final review I1)
  const understand = useMemo(() => (item.ask === 'understand' && voice ? understandItem(word, mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
  const fish = useMemo(() => (item.ask === 'fish' ? fishItem(word, confused ?? [], knownChars ?? new Set(), mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
  const family = useMemo(() => (item.ask === 'family' ? familyBoard(word, knownChars ?? new Set(), mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0)) : null), [item, word.id]);
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
    if ((sentence && !use) || (item.ask === 'build' && !zuju) || (item.ask === 'pair' && !board) || (item.ask === 'match' && !(item.list?.pairs ? listB : match)) || (item.ask === 'fish' && !fish) || (item.ask === 'understand' && !understand) || (item.ask === 'family' && !family)) onDone(null);
    else if (idiom && !idiom.gap && !idiom.fit && !idiom.build?.zuju) onDone(null);
  }, []);

  if (idiom) {
    if (idiom.gap) {
      return (
        <IdiomQuestion
          gap={idiom.gap}
          kid={kid}
          onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning', picked: r.picked, idiom: idiom.gap!.idiom.text })}
        />
      );
    }
    if (idiom.fit) {
      return (
        <UseQuestion
          item={idiom.fit}
          kid={kid}
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
          onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: true, asked: 'use', idiom: idiom.build!.idiom.text })}
        />
      );
    }
    return null;
  }

  if (item.ask === 'understand') {
    if (!understand) return null;
    return <UnderstandQuestion item={understand} kid={kid} onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'understand' })} />;
  }
  if (item.ask === 'fish') {
    if (!fish) return null;
    return (
      <ComponentsStep
        items={[fish]}
        kid={kid}
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
  if (item.list?.pairs) {
    if (!listB) return null;
    return (
      <PairGame
        board={listB}
        kind="match"
        kid={kid}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning', listPairs: r.pairs })}
      />
    );
  }
  if (item.ask === 'match') {
    if (!match) return null;
    const lead = listPair && { reading: listPair.reading ?? readingOf(listPair.left + listPair.right), gloss: pairGloss(listPair.left, listPair.right, pool) };
    return (
      <MatchQuestion
        question={match}
        kid={kid}
        none={noneKind(item.none) ?? undefined}
        list={lead || undefined}
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning', ...(listPair ? { listPairs: [{ left: listPair.left, right: listPair.right, correct: r.correct }] } : {}) })}
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
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: false, asked: 'meaning' })}
      />
    );
  }
  if (item.ask === 'family') {
    if (!family) return null;
    return (
      <FamilyQuestion
        board={family}
        kid={kid}
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
        onDone={(r) => onDone({ correct: r.correct, hard: false, responseMs: r.responseMs, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: true, asked: 'use' })}
      />
    );
  }
  if (!sentence) {
    return (
      <FlashcardStep
        item={{ wordId: word.id, isNew: false, retry: item.retry, mode: item.ask === 'word' ? 'meaning' : 'read' }}
        ask={item.ask === 'listen' || item.ask === 'word' || item.ask === 'hear' || item.ask === 'meaningRead' ? item.ask : 'read'}
        word={word} pool={pool} card={card} voice={voice} kid={kid} resting={resting} combo={combo} closeupReady={closeupReady}
        noneOfThese={noneKind(item.none) ?? undefined}
        list={listCard?.lead ? listCard : undefined}
        onDone={(r) => onDone(r)}
      />
    );
  }
  if (!use) return null;
  return (
    <UseQuestion
      item={use}
      kid={kid}
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
