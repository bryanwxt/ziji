import { X } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { speak } from '../audio/speech';
import { schoolTerm } from '../content';
import { applyPlacement, placementIds } from '../placement/apply';
import { nextQuestion, visitStyles, type PlacementQuestion } from '../placement/questions';
import { bandLevel, placementLevels, rankBands, startWalk, walkStep, WARMUP, type Style, type WalkState } from '../placement/walk';
import { mulberry32 } from '../lib/random';
import { allWords } from '../store/repo';
import { DEFAULT_KID, type Word } from '../types';
import { InkIcon } from '../ui/icons/InkIcon';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { Scene } from '../ui/Scene';
import { SpeakButton } from '../ui/SpeakButton';
import { useApp } from './AppContext';
import { FeedbackSheet } from '../ui/stage/FeedbackSheet';
import { Stage } from '../ui/stage/Stage';
import { loadKnowledge } from './knowledge';

const BUBBLE: Record<Style, string> = { read: '这个字怎么读？', hear: '听一听，是什么意思？', fill: '少了哪个字？', fit: '哪个词对？' };
const LEVEL = ['一级', '二级', '三级', '四级', '五级', '六级', '七—九级'];

/**
 * Where a band sits: the textbook term of its last character (二上) while the bands follow his school books, then its HSK
 * level beyond them; 还没开始 for none (parent, 2026-10-06: school terms are what a parent and child know).
 */
function levelName(bands: Word[][], band: number): string {
  if (band < 0) return '还没开始';
  const last = bands[Math.min(band, bands.length - 1)]?.at(-1)?.text;
  return (last && schoolTerm(last)) ?? (LEVEL[bandLevel(bands, band) - 1] ?? '七—九级');
}

/**
 * First-run (and re-run) placement check (spec §19 part 6): 3 warm-up reading questions, then an adaptive walk over 30 bands
 * with four question styles, finding a listening, a reading and an understanding level (spec 2026-10-06 §3.5). No right/wrong is shown (§14).
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
  const [result, setResult] = useState<{ known: number; reading: number; understanding: number; listening: number } | null>(null);
  const [asked, setAsked] = useState(0);
  const [shown, setShown] = useState(-1); // which question is on screen (0 = the first), so a test can wait for the next one
  const rng = useMemo(() => mulberry32((seed ?? Date.now()) >>> 0), []);
  const used = useRef(new Set<string>());
  const styles = useRef<Style[]>([]); // the rest of this visit's styles
  const prevStyle = useRef<Style | null>(null);
  const bands = useMemo(() => (words ? rankBands(words) : []), [words]);

  useEffect(() => {
    void allWords(db).then((ws) => {
      setWords(ws);
      setWalk(startWalk(rankBands(ws).length));
    });
  }, []);

  // the next question whenever the walk moves on
  useEffect(() => {
    if (!walk || walk.done || !words || !bands.length) return;
    let style: Style = 'read';
    let band = bands[0]!; // warm-up: easy reading questions
    if (walk.warmup >= WARMUP) {
      if (!styles.current.length) styles.current = visitStyles(prevStyle.current, voice, rng);
      style = styles.current.shift()!;
      band = bands[walk.band]!;
    }
    const q = nextQuestion(band, style, words, rng, used.current);
    used.current.add(q.wordId);
    prevStyle.current = q.style;
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
    const next = walkStep(walk, { style: question.style, wordId: question.wordId, correct, dontKnow }, bands.length);
    setWalk(next);
    if (next.done) await finish(placementIds(bands, next.answers), placementLevels(next.answers));
  };
  const finish = async (ids: ReturnType<typeof placementIds>, levels: ReturnType<typeof placementLevels>) => {
    let known = ids.readingIds.length;
    try {
      await applyPlacement(db, { ...ids, ...levels }, now());
      known = (await loadKnowledge(db)).known;
    } catch (e) {
      console.error('placement: could not save the result', e); // he still gets his close; the check runs again next launch
    }
    setResult({ known, ...levels });
  };
  /** Skip the check (parent, 2026-10-05): nothing placed, so lessons start from the first character; practised words stay. */
  const skip = () => {
    if (result) return;
    setWalk((w) => (w ? { ...w, done: true } : w));
    void finish({ readingIds: [], understandingIds: [], heardIds: [], missed: [] }, { reading: -1, understanding: -1, listening: -1 });
  };

  const k = kid ?? DEFAULT_KID;
  if (!words || !walk || (!question && !result)) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>; // no 不知道 before the first question

  if (result) {
    return (
      <div class="screen">
        <Scene kind="home" />
        <div class="center">
          <Pet kid={k} mood="pleased" size={160} />
          <h1><Label zh={result.known > 0 ? `你已经认识 ${result.known} 个字了！` : '我们从第一个字开始！'} /></h1>
          <p class="placement__levels"><Label zh={`${voice ? `听：${levelName(bands, result.listening)} · ` : ''}读：${levelName(bands, result.reading)} · 懂：${levelName(bands, result.understanding)}`} /></p>
          <p><Label zh="我们每天学一点点。" /></p>
          <button type="button" class="btn btn--primary btn--big" onClick={async () => { await refresh(); go({ name: 'home' }); }}>
            <Label zh="开始！" />
          </button>
        </div>
      </div>
    );
  }

  const q = question;
  const option = (text: string, right: boolean, hanzi = false) => (
    <button key={text} type="button" class={`choice press${hanzi ? ' hanzi' : ''}`} data-answer={right ? 'true' : undefined} onClick={() => void answer(right)}>
      {text}
    </button>
  );
  return (
    <div class={`screen placement${rerun ? ' placement--rerun' : ''}`} data-ready={ready ? 'true' : 'false'} data-asked={asked} data-question={shown} data-style={question?.style}>
      <Scene kind="home" />
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
              {q.style === 'fill' && (
                <div class="hanzi placement__word" data-q>
                  {Array.from(q.word).map((c, i) => (i === q.index ? <span key={i} class="zibian__blank">？</span> : <span key={i}>{c}</span>))}
                </div>
              )}
              {q.style === 'fit' && (
                <div class={`hanzi ${Array.from(q.item.before + q.item.after).length <= 3 ? 'placement__word' : 'placement__sentence'}`} data-q={Array.from(q.item.before + q.item.after).length <= 3 ? true : undefined}>
                  {q.item.before}<span class="meaning-cue__blank" aria-label="空格">？</span>{q.item.after}
                </div>
              )}
            </div>
            <div class={`choices placement__choices ${q.style === 'read' ? 'placement__choices--pinyin' : q.style === 'hear' ? 'placement__choices--meaning' : 'placement__choices--hanzi'}`}>
              {q.style === 'read' && q.options.map((o) => option(o, o === q.answer))}
              {q.style === 'hear' && q.options.map((o) => option(o, o === q.answer))} {/* English, as on the Hear rung (spec 2026-10-06 §3.2) */}
              {q.style === 'fill' && q.options.map((o) => option(o, o === q.answer, true))}
              {q.style === 'fit' && q.item.options.map((o) => option(o, o === q.item.word, true))}
            </div>
          </>
        )}
      </Stage>
    </div>
  );
}
