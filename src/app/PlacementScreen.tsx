import { X } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { speak } from '../audio/speech';
import { applyPlacement, placementIds, type PlacementOutcome } from '../placement/apply';
import { askableTerms, nextQuestion, termStyles, termWords, type PlacementQuestion } from '../placement/questions';
import { placementPhrasesZh } from '../placement/summary';
import { bigJump, classTerm, readsUpTo, startTerm, startWalk, TERMS, walkStep, type Style, type WalkState } from '../placement/walk';
import { hashPin } from '../lib/hash';
import { mulberry32 } from '../lib/random';
import { allWords, getSettings } from '../store/repo';
import { DEFAULT_KID, isLegacyPlacement, type Word } from '../types';
import { InkIcon } from '../ui/icons/InkIcon';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { PinPad } from '../ui/PinPad';
import { WorldScene } from '../ui/worlds/WorldScene';
import { currentWorld, timeOfDay } from '../fun/worlds';
import { SpeakButton } from '../ui/SpeakButton';
import { useApp } from './AppContext';
import { FeedbackSheet } from '../ui/stage/FeedbackSheet';
import { Stage } from '../ui/stage/Stage';
import { loadKnowledge } from './knowledge';

const BUBBLE: Record<Style, string> = { read: '这个字怎么读？', listen: '听一听，是哪个字？' };

/** A result well above his class or his earlier check, waiting for the parent (spec v2.1). */
interface Pending { outcome: PlacementOutcome; result: string; cls: string | null; earlier: string | null | undefined; assumed: number; capped: PlacementOutcome | null }

/** Phrases that never break inside: a phone wraps between them, never before a lone 「个」 (spec v2.1). */
const Phrases = ({ zh }: { zh: string[] }) => <>{zh.map((p) => <span key={p} class="placement__phrase"><Label zh={p} /></span>)}</>;

/**
 * First-run (and re-run) placement check (spec 2026-10-14, v2.1): a short walk over his school terms, from one below his
 * class's, 4 questions a term (a fifth on a 3 of 4), at most 20: 2 读一读 (near-miss readings) and 2 听一听 (hear it, find it
 * among look-alikes) with a voice, 读一读 only without. No right/wrong is shown (§14). A result more than a term above his
 * class or his earlier check waits for the parent. tapGuardMs: taps are ignored this long after each question appears, so a
 * double tap can't answer the next one. seed: picks the questions; a fresh one each visit unless given (tests pass one).
 */
export function PlacementScreen({ tapGuardMs = 350, voice: voiceProp, seed }: { tapGuardMs?: number; voice?: boolean; seed?: number } = {}) {
  const { db, now, go, refresh, kid, voice: appVoice, settings } = useApp();
  const rerun = settings.placementDone; // started again from Settings: he can go back home
  const voice = voiceProp ?? appVoice;
  const [words, setWords] = useState<Word[] | null>(null);
  const [walk, setWalk] = useState<WalkState | null>(null);
  const [question, setQuestion] = useState<PlacementQuestion | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [result, setResult] = useState<{ known: number; phrases: string[] } | null>(null);
  const [asked, setAsked] = useState(0);
  const [shown, setShown] = useState(-1); // which question is on screen (0 = the first), so a test can wait for the next one
  const rng = useMemo(() => mulberry32((seed ?? Date.now()) >>> 0), []);
  const used = useRef(new Set<string>()); // characters asked: never twice
  const styles = useRef<Style[]>([]); // the rest of this term's styles
  const terms = useMemo(() => (words ? termWords(words) : []), [words]); // whole terms: what a pass places
  const hard = useMemo(() => askableTerms(terms), [terms]); // what is asked: each term's later, rarer characters
  const cls = useMemo(() => classTerm(now(), settings), []);
  // his earlier check: kept when the parent turns a big jump down; compared with only when it asked something (not a skip)
  const earlier = settings.placementDone ? settings.placementResult : undefined;
  const earlierTerm = earlier && !isLegacyPlacement(earlier) && earlier.tested > 0 ? TERMS.indexOf(earlier.readsUpTo ?? '') : undefined;

  useEffect(() => {
    void allWords(db).then((ws) => {
      setWords(ws);
      setWalk(startWalk(startTerm(cls), TERMS.length));
    });
  }, []);

  // the next question whenever the walk moves on
  useEffect(() => {
    if (!walk || walk.done || !words || !hard.length) return;
    if (walk.visit.length === 0) styles.current = termStyles(voice, rng); // a new term: its styles
    const style: Style = styles.current.shift() ?? 'read';
    const q = nextQuestion(hard, walk.term, style, words, rng, used.current);
    used.current.add(q.charId);
    setQuestion(q);
    setShown((n) => n + 1);
    if (q.style === 'listen') speak(q.text, { reading: q.reading }); // a bound or unsure character is said as its word (speech.ts)
  }, [walk]);

  const [ready, setReady] = useState(tapGuardMs <= 0);
  useEffect(() => {
    if (tapGuardMs <= 0) return;
    setReady(false);
    const t = setTimeout(() => setReady(true), tapGuardMs);
    return () => clearTimeout(t);
  }, [question, tapGuardMs]);

  const answer = async (correct: boolean, dontKnow = false) => {
    if (!walk || !question || result || pending || !ready || walk.done) return;
    if (tapGuardMs > 0) setReady(false);
    setAsked((n) => n + 1);
    const next = walkStep(walk, { style: question.style, wordId: question.wordId, charId: question.charId, correct, dontKnow }, TERMS.length);
    setWalk(next);
    if (!next.done) return;
    const upTo = readsUpTo(next);
    const outcome: PlacementOutcome = { ...placementIds(terms, next.answers, upTo), readsUpTo: upTo === null ? null : TERMS[upTo]! };
    if (!bigJump(upTo, cls, earlierTerm)) return finish(outcome);
    // turned down with no earlier check to keep: his class term, which he passed on the way up (the walk climbs term by term)
    const capped = earlier || cls === null ? null : { ...placementIds(terms, next.answers, cls), readsUpTo: TERMS[cls]! };
    setPending({
      outcome, capped, result: outcome.readsUpTo!, cls: cls === null ? null : TERMS[cls]!, assumed: Math.max(0, outcome.readingIds.length - outcome.askedIds.length),
      earlier: earlier ? (isLegacyPlacement(earlier) ? undefined : earlier.readsUpTo) : undefined,
    });
  };
  const finish = async (r: PlacementOutcome) => {
    let known = r.readingIds.length;
    let phrases = placementPhrasesZh({ readsUpTo: r.readsUpTo, tested: r.askedIds.length, assumed: Math.max(0, r.readingIds.length - r.askedIds.length) });
    try {
      await applyPlacement(db, r, now());
      known = (await loadKnowledge(db)).known;
      const p = (await getSettings(db)).placementResult;
      if (p && !isLegacyPlacement(p)) phrases = placementPhrasesZh(p);
    } catch (e) {
      console.error('placement: could not save the result', e); // he still gets his close; the check runs again next launch
    }
    setPending(null);
    setResult({ known, phrases });
  };
  /** The parent turned a big jump down: his earlier result stays as it is (nothing saved), or, with none, his class term. */
  const keepEarlier = async (p: Pending) => {
    if (p.capped) return finish(p.capped);
    const known = (await loadKnowledge(db)).known;
    setPending(null);
    setResult({ known, phrases: earlier && !isLegacyPlacement(earlier) ? placementPhrasesZh(earlier) : ['还是之前的结果'] });
  };
  /** Skip the check (parent, 2026-10-05): nothing placed, so lessons start from the first character; practised words stay. */
  const skip = () => {
    if (result || pending) return;
    setWalk((w) => (w ? { ...w, done: true } : w));
    void finish({ readingIds: [], heardIds: [], askedIds: [], missed: [], readsUpTo: null });
  };

  const k = kid ?? DEFAULT_KID;
  if (!words || !walk || (!question && !result && !pending)) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>; // no 不知道 before the first question

  if (pending) return <ConfirmJump p={pending} pinHash={settings.pinHash} onUse={() => void finish(pending.outcome)} onKeep={() => void keepEarlier(pending)} />;

  if (result) {
    const short = typeof window !== 'undefined' && window.innerHeight < 760; // a phone: a smaller Truffle so 开始！ stays on screen
    return (
      <div class="screen placement-result">
        <WorldScene world={currentWorld(k)} time={timeOfDay(now())} bare />
        <div class="placement-result__body">
          <Pet kid={k} mood="pleased" size={short ? 104 : 160} />
          <h1 class="placement-result__title">
            {result.known > 0 ? <Phrases zh={['你已经认识', `${result.known} 个字了！`]} /> : <Label zh="我们从第一个字开始！" />}
          </h1>
          <p class="placement__levels"><Phrases zh={result.phrases} /></p>
          <p class="placement-result__daily"><Label zh="我们每天学一点点。" /></p>
        </div>
        <button type="button" class="btn btn--primary btn--big placement-result__go" onClick={async () => { await refresh(); go({ name: 'home' }); }}>
          <Label zh="开始！" />
        </button>
      </div>
    );
  }

  const q = question;
  const option = (text: string, right: boolean) => (
    <button key={text} type="button" class="choice press" data-answer={right ? 'true' : undefined} onClick={() => void answer(right)}>
      {text}
    </button>
  );
  return (
    <div class={`screen placement${rerun ? ' placement--rerun' : ''}`} data-ready={ready ? 'true' : 'false'} data-asked={asked} data-question={shown} data-style={question?.style}>
      <WorldScene world={currentWorld(k)} time={timeOfDay(now())} bare />
      {rerun && (
        <button type="button" class="icon-btn placement__home" aria-label="回家" onClick={() => go({ name: 'home' })}>
          <X size={34} strokeWidth={3} />
        </button>
      )}
      <button type="button" class="placement__skip" aria-label="跳过，从头开始" onClick={skip}>
        <Label zh="跳过，从头开始" />
      </button>
      <Stage
        activity="placement"
        truffle={<Pet kid={k} mood="neutral" bubble={q ? BUBBLE[q.style] : undefined} size={180} calm />}
        sheet={<FeedbackSheet quiet actionLabel="不知道" actionIcon={<InkIcon name="think" size={30} />} onAction={() => void answer(false, true)} />}
      >
        {q && (
          <>
            {/* one box and one 2×2 grid for every style, so the screen never jumps between questions */}
            <div class="placement__prompt" lang="zh">
              {q.style === 'read' && <div class="hanzi placement__char" data-testid="placement-char" data-q>{q.text}</div>}
              {q.style === 'listen' && <SpeakButton text={q.text} reading={q.reading} big />}
            </div>
            <div class={`choices placement__choices ${q.style === 'read' ? 'placement__choices--pinyin' : 'choices--hanzi placement__choices--hanzi'}`} lang={q.style === 'listen' ? 'zh' : undefined}>
              {q.options.map((o) => option(o, o === q.answer))}
            </div>
          </>
        )}
      </Stage>
    </div>
  );
}

/**
 * The parent's check on a big jump (spec v2.1): the result is well above his class or his earlier check. Using it takes the
 * parent PIN when one is set; keeping his earlier result (or, with none, his class term) never does — it can only place less.
 */
function ConfirmJump({ p, pinHash, onUse, onKeep }: { p: Pending; pinHash: string | null; onUse: () => void; onKeep: () => void }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aboveClass = p.cls !== null && TERMS.indexOf(p.result) > TERMS.indexOf(p.cls) + 1;
  const above = aboveClass ? `his class (${p.cls})` : `his earlier result (${p.earlier ?? 'none'})`;
  const keepLabel = p.capped ? `Start at his class (${p.cls})` : `Keep his earlier result${p.earlier ? ` (${p.earlier})` : ''}`;
  const check = async (pin: string) => {
    if ((await hashPin(pin)) === pinHash) onUse();
    else setError('That PIN is not right. Try again.');
  };
  return (
    <div class="screen placement-confirm">
      <div class="placement-confirm__body">
        <p class="placement-confirm__kid"><Label zh="请爸爸妈妈来看一看！" /></p>
        <h2>For a grown-up</h2>
        <p class="placement-confirm__msg">
          This says {p.result} — that's well above {above}. {p.capped ? `Use it, or start him at his class level (${p.cls})?` : 'Use it, or keep his earlier result?'}
        </p>
        <p class="placement-confirm__note">Using it counts about {p.assumed} more characters as known without asking him; each comes back as a recheck in his lessons.</p>
        {asking ? (
          <div class="placement-confirm__pin">
            <p>Enter your PIN to use {p.result}.</p>
            <PinPad onComplete={(pin) => void check(pin)} error={error} />
          </div>
        ) : (
          <button type="button" class="btn placement-confirm__use" onClick={() => (pinHash ? setAsking(true) : onUse())}>Use {p.result}</button>
        )}
        <button type="button" class="btn btn--primary placement-confirm__keep" onClick={onKeep}>{keepLabel}</button>
      </div>
    </div>
  );
}
