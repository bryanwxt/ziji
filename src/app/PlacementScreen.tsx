import { X } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { speak } from '../audio/speech';
import { applyPlacement, placementIds, type PlacementOutcome } from '../placement/apply';
import { nextQuestion, termStyles, termWords, type PlacementQuestion } from '../placement/questions';
import { placementLineZh } from '../placement/summary';
import { classTerm, readsUpTo, startTerm, startWalk, TERMS, walkStep, type Style, type WalkState } from '../placement/walk';
import { mulberry32 } from '../lib/random';
import { allWords, getSettings } from '../store/repo';
import { DEFAULT_KID, isLegacyPlacement, type Word } from '../types';
import { InkIcon } from '../ui/icons/InkIcon';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { WorldScene } from '../ui/worlds/WorldScene';
import { currentWorld, timeOfDay } from '../fun/worlds';
import { SpeakButton } from '../ui/SpeakButton';
import { useApp } from './AppContext';
import { FeedbackSheet } from '../ui/stage/FeedbackSheet';
import { Stage } from '../ui/stage/Stage';
import { loadKnowledge } from './knowledge';

const BUBBLE: Record<Style, string> = { read: '这个字怎么读？', hear: '听一听，是什么意思？' };

/**
 * First-run (and re-run) placement check (spec 2026-10-14): a short walk over his school terms, from one below his class's, 3
 * quick questions a term (2 读一读 and 1 听一听 with a voice; 3 读一读 without), at most 15. No right/wrong is shown (§14).
 * tapGuardMs: taps are ignored this long after each question appears, so a double tap can't answer the next one.
 * seed: picks the questions; a fresh one each visit unless given (tests pass a fixed one).
 */
export function PlacementScreen({ tapGuardMs = 350, voice: voiceProp, seed }: { tapGuardMs?: number; voice?: boolean; seed?: number } = {}) {
  const { db, now, go, refresh, kid, voice: appVoice, settings } = useApp();
  const rerun = settings.placementDone; // started again from Settings: he can go back home
  const voice = voiceProp ?? appVoice;
  const [words, setWords] = useState<Word[] | null>(null);
  const [walk, setWalk] = useState<WalkState | null>(null);
  const [question, setQuestion] = useState<PlacementQuestion | null>(null);
  const [result, setResult] = useState<{ known: number; line: string } | null>(null);
  const [asked, setAsked] = useState(0);
  const [shown, setShown] = useState(-1); // which question is on screen (0 = the first), so a test can wait for the next one
  const rng = useMemo(() => mulberry32((seed ?? Date.now()) >>> 0), []);
  const used = useRef(new Set<string>()); // characters asked: never twice
  const styles = useRef<Style[]>([]); // the rest of this term's styles
  const terms = useMemo(() => (words ? termWords(words) : []), [words]);

  useEffect(() => {
    void allWords(db).then((ws) => {
      setWords(ws);
      setWalk(startWalk(startTerm(classTerm(now(), settings)), TERMS.length));
    });
  }, []);

  // the next question whenever the walk moves on
  useEffect(() => {
    if (!walk || walk.done || !words || !terms.length) return;
    if (walk.visit.length === 0) styles.current = termStyles(voice, rng); // a new term: its 3 styles
    const style: Style = styles.current.shift() ?? 'read'; // the one more on a 2 of 3: a 读一读
    const q = nextQuestion(terms, walk.term, style, words, rng, used.current);
    used.current.add(q.charId);
    setQuestion(q);
    setShown((n) => n + 1);
    if (q.style === 'hear') speak(q.text);
  }, [walk]);

  const [ready, setReady] = useState(tapGuardMs <= 0);
  useEffect(() => {
    if (tapGuardMs <= 0) return;
    setReady(false);
    const t = setTimeout(() => setReady(true), tapGuardMs);
    return () => clearTimeout(t);
  }, [question, tapGuardMs]);

  const answer = async (correct: boolean, dontKnow = false) => {
    if (!walk || !question || result || !ready || walk.done) return;
    if (tapGuardMs > 0) setReady(false);
    setAsked((n) => n + 1);
    const next = walkStep(walk, { style: question.style, wordId: question.wordId, charId: question.charId, correct, dontKnow }, TERMS.length);
    setWalk(next);
    if (next.done) {
      const upTo = readsUpTo(next);
      await finish({ ...placementIds(terms, next.answers, upTo), readsUpTo: upTo === null ? null : TERMS[upTo]! });
    }
  };
  const finish = async (r: PlacementOutcome) => {
    let known = r.readingIds.length;
    let line = placementLineZh({ readsUpTo: r.readsUpTo, tested: r.askedIds.length, assumed: Math.max(0, r.readingIds.length - r.askedIds.length) });
    try {
      await applyPlacement(db, r, now());
      known = (await loadKnowledge(db)).known;
      const p = (await getSettings(db)).placementResult;
      if (p && !isLegacyPlacement(p)) line = placementLineZh(p);
    } catch (e) {
      console.error('placement: could not save the result', e); // he still gets his close; the check runs again next launch
    }
    setResult({ known, line });
  };
  /** Skip the check (parent, 2026-10-05): nothing placed, so lessons start from the first character; practised words stay. */
  const skip = () => {
    if (result) return;
    setWalk((w) => (w ? { ...w, done: true } : w));
    void finish({ readingIds: [], heardIds: [], askedIds: [], missed: [], readsUpTo: null });
  };

  const k = kid ?? DEFAULT_KID;
  if (!words || !walk || (!question && !result)) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>; // no 不知道 before the first question

  if (result) {
    return (
      <div class="screen">
        <WorldScene world={currentWorld(k)} time={timeOfDay(now())} bare />
        <div class="center">
          <Pet kid={k} mood="pleased" size={160} />
          <h1><Label zh={result.known > 0 ? `你已经认识 ${result.known} 个字了！` : '我们从第一个字开始！'} /></h1>
          <p class="placement__levels"><Label zh={result.line} /></p>
          <p><Label zh="我们每天学一点点。" /></p>
          <button type="button" class="btn btn--primary btn--big" onClick={async () => { await refresh(); go({ name: 'home' }); }}>
            <Label zh="开始！" />
          </button>
        </div>
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
              {q.style === 'hear' && <SpeakButton text={q.text} big />}
            </div>
            <div class={`choices placement__choices ${q.style === 'read' ? 'placement__choices--pinyin' : 'placement__choices--meaning'}`}>
              {q.options.map((o) => option(o, o === q.answer))} {/* 听一听: English, as on the Hear rung (spec 2026-10-06 §3.2) */}
            </div>
          </>
        )}
      </Stage>
    </div>
  );
}
