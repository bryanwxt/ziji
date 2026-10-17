// src/app/CheckScreen.tsx
// 考考自己 (weekly list spec 2026-10-17 §8.1): the whole list, one question each, with no pinyin, nothing said, no hints and no
// teaching until the end; saved as he goes, so he can stop and come back the same day. The end shows each miss with its right
// answer, pinyin and English, and the stars for words newly ready.
import { X } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { UseQuestion } from '../activities/choose/UseQuestion';
import { FlashcardStep } from '../activities/flashcards/FlashcardStep';
import { MatchQuestion } from '../activities/practice/MatchQuestion';
import { PairGame } from '../activities/practice/PairGame';
import { cardMeaning, glossFor } from '../content/glossary';
import { ladderWordsBesides } from '../content/ladder';
import { readingOf } from '../content/wordGate';
import { mulberry32, shuffle } from '../lib/random';
import { pairGloss } from '../practice/missNote';
import { listBoard } from '../practice/pairs';
import { allWords, getWeekList } from '../store/repo';
import { DEFAULT_KID, type KidState, type WeekList, type Word } from '../types';
import { InkIcon } from '../ui/icons/InkIcon';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { ProgressBar } from '../ui/ProgressBar';
import { FeedbackSheet } from '../ui/stage/FeedbackSheet';
import { Stage } from '../ui/stage/Stage';
import { WorldScene } from '../ui/worlds/WorldScene';
import { currentWorld, timeOfDay } from '../fun/worlds';
import { answered, checkQueue, finishCheck, recordCheckAnswer, type CheckQuestion, type PairAnswer } from '../weeklist/check';
import { fitUseItem } from '../weeklist/fit';
import { useApp } from './AppContext';

/** One row of the end sheet: a missed word or pair, with its pinyin and English. */
export interface MissRow { key: string; zh: string; py: string; en?: string }

/** The misses (§8.1): each question with a wrong result, a board by its missed pairs, in the order he was asked. */
export function missRows(qs: CheckQuestion[], list: WeekList, words: ReadonlyMap<string, Word>, pool: readonly Word[]): MissRow[] {
  const res = list.check?.results ?? {};
  const wrong = (k: string) => res[k]?.correct === false;
  const pairRow = (p: { left: string; right: string; reading?: string }): MissRow => ({ key: `${p.left}|${p.right}`, zh: p.left + p.right, py: p.reading ?? readingOf(p.left + p.right), en: pairGloss(p.left, p.right, pool) });
  return qs.flatMap((q): MissRow[] => {
    if (!q.covers.some(wrong)) return [];
    if (q.pairs) return q.pairs.filter((p) => (q.pairCovers?.[`${p.left}|${p.right}`] ?? []).some(wrong)).map(pairRow);
    if (q.pair) return [pairRow(q.pair)];
    const w = words.get(q.wordId!);
    return w ? [{ key: q.key, zh: w.text, py: w.pinyin, en: cardMeaning(w) ?? glossFor(w.text) }] : [];
  });
}

export function CheckScreen({ listId }: { listId: string }) {
  const { db, now, go, kid } = useApp();
  const [state, setState] = useState<{ list: WeekList; words: Map<string, Word>; all: CheckQuestion[]; todo: CheckQuestion[] } | null | undefined>(undefined);
  const [at, setAt] = useState(0);
  const [end, setEnd] = useState<{ list: WeekList; stars: number } | null>(null);
  const busy = useRef(false);
  const shownAt = useRef(performance.now());
  const k = kid ?? DEFAULT_KID;

  useEffect(() => {
    void (async () => {
      const [l, ws] = await Promise.all([getWeekList(db, listId), allWords(db)]);
      if (!l) return setState(null);
      const words = new Map([...ws, ...ladderWordsBesides(ws)].map((w) => [w.id, w]));
      // seeded from the list, so a check he comes back to keeps its order; what he has answered is not asked again
      const all = checkQueue(l, words, mulberry32(l.createdAt >>> 0));
      setState({ list: l, words, all, todo: all.filter((q) => !answered(l, q)) });
    })();
  }, []);
  useEffect(() => { shownAt.current = performance.now(); }, [at]);
  // a check with nothing left to ask (all answered before he stopped) ends at once
  useEffect(() => { if (state && !state.todo.length && !end) void finish(); }, [state]);

  const pool = useMemo(() => (state ? [...state.words.values()] : []), [state]);

  const finish = async () => {
    const r = await finishCheck(db, listId, now());
    const l = await getWeekList(db, listId);
    if (l) setEnd({ list: l, stars: r.stars });
  };
  const answer = async (correct: boolean, more: { pairs?: PairAnswer[]; responseMs?: number } = {}) => {
    if (!state || busy.current) return;
    busy.current = true;
    try {
      const q = state.todo[at]!;
      await recordCheckAnswer(db, listId, q, correct, now(), { responseMs: more.responseMs ?? Math.round(performance.now() - shownAt.current), ...more });
      await next();
    } finally {
      busy.current = false;
    }
  };
  const next = async () => {
    if (at + 1 < state!.todo.length) setAt(at + 1);
    else await finish();
  };

  if (state === null) {
    return (
      <div class="screen check check--done">
        <button type="button" class="btn btn--primary btn--big" onClick={() => go({ name: 'home' })}><Label zh="回家" /></button>
      </div>
    );
  }
  if (!state) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;

  const world = <WorldScene world={currentWorld(k)} time={timeOfDay(now())} />;
  if (end) {
    return (
      <div class="screen check check--done">
        {world}
        <CheckEnd kid={k} rows={missRows(state.all, end.list, state.words, pool)} stars={end.stars} onHome={() => go({ name: 'home' })} />
      </div>
    );
  }

  const q = state.todo[at];
  if (!q) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;
  const word = q.wordId ? state.words.get(q.wordId) : undefined;
  const rng = mulberry32((state.list.createdAt + at + 1) >>> 0);
  const done = state.all.length - state.todo.length + at;
  return (
    <div class="screen check">
      {world}
      <header class="lessonbar">
        {/* he can stop and come back today: what he answered is kept */}
        <button type="button" class="icon-btn" aria-label="回家" onClick={() => go({ name: 'home' })}>
          <X size={34} strokeWidth={3} />
        </button>
        <ProgressBar steps={[]} stepIndex={0} fraction={done / Math.max(1, state.all.length)} />
      </header>
      {q.pairs ? (
        <BoardQuestion key={q.key} q={q} kid={k} onDone={(r) => void answer(r.correct, { pairs: r.pairs, responseMs: r.responseMs })} onSkip={() => void next()} />
      ) : q.pair ? (
        <MatchQuestion key={q.key} question={{ verb: q.pair.left, noun: q.pair.right, options: shuffle([q.pair.right, ...q.pair.wrong], rng) }} kid={k} bare onDone={(r) => void answer(r.correct, { responseMs: r.responseMs })} />
      ) : q.form === 'fit' && q.fit && word ? (
        <UseQuestion key={q.key} item={fitUseItem(q.fit, word, rng, pool)} kid={k} bare onAnswer={(c, ms) => void answer(c, { responseMs: ms })} onNext={() => {}} />
      ) : word ? (
        <FlashcardStep key={q.key} item={{ wordId: word.id, isNew: false, retry: false }} ask={q.form === 'meaning' ? 'meaningRead' : 'read'} word={word} pool={pool} voice={false} kid={k} resting="neutral" combo={0} closeupReady={false} bare onDone={(r) => void answer(r.correct, { responseMs: r.responseMs })} />
      ) : null}
    </div>
  );
}

/** The end of the check (§8.1): the stars for words newly ready, then each miss with its right answer, pinyin and English. */
export function CheckEnd({ kid, rows, stars, onHome }: { kid: KidState; rows: MissRow[]; stars: number; onHome: () => void }) {
  return (
    <Stage
      activity="use"
      truffle={<Pet kid={kid} mood="pleased" bubble={rows.length ? '考完了！再看看这些：' : '考完了！全对了！'} size={180} react={{ kind: 'right', key: 1 }} />}
      sheet={<FeedbackSheet actionLabel="好了！" auto={false} onAction={onHome} />}
    >
      <div class="check__end">
        {stars > 0 && <p class="check__stars"><InkIcon name="star" size={30} /> <Label zh={`新会了 ${stars} 个词！`} /></p>}
        {rows.length > 0 && (
          <div class="pair-summary check__misses">
            {rows.map((r) => (
              <p key={r.key} class="pair-summary__row is-missed">
                <span class="hanzi"><Label zh={r.zh} py={r.py} /></span>
                {r.en && <span lang="en">{r.en}</span>}
              </p>
            ))}
          </div>
        )}
      </div>
    </Stage>
  );
}

/** A board of list pairs (§7.5) in bare mode: built once, so a re-render never reshuffles it. */
function BoardQuestion({ q, kid, onDone, onSkip }: { q: CheckQuestion; kid: KidState; onDone: (r: { correct: boolean; responseMs: number; pairs: PairAnswer[] }) => void; onSkip: () => void }) {
  const board = useMemo(() => listBoard(q.pairs!, mulberry32(q.key.length * 7919)), [q.key]);
  // checkQueue built this board from these pairs, so it always rebuilds; if it ever didn't, the pairs stay unasked (and are practised)
  useEffect(() => { if (!board) onSkip(); }, [board]);
  if (!board) return null;
  return <PairGame board={board} kind="match" kid={kid} bare onDone={onDone} />;
}
