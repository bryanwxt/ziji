import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { speak } from '../audio/speech';
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
import { loadKnowledge } from './knowledge';

const BUBBLE: Record<Style, string> = { read: '这个字怎么读？', listen: '听一听，是哪个字？', real: '这是真的词吗？', fill: '少了哪个字？', fit: '哪个词对？' };
const LEVEL = ['一级', '二级', '三级', '四级', '五级', '六级', '七—九级'];

/** A band's HSK level in Chinese (the level of its last character), or 还没开始 for none. */
function levelName(bands: Word[][], band: number): string {
  return band < 0 ? '还没开始' : (LEVEL[bandLevel(bands, band) - 1] ?? '七—九级');
}

/**
 * First-run (and re-run) placement check (spec §19 part 6): 3 warm-up reading questions, then an adaptive walk over 30 bands
 * with five question styles, finding a reading level and an understanding level. No right/wrong is shown (§14).
 * tapGuardMs: taps are ignored this long after each question appears, so a double tap can't answer the next one.
 */
export function PlacementScreen({ tapGuardMs = 350, voice: voiceProp }: { tapGuardMs?: number; voice?: boolean } = {}) {
  const { db, now, go, refresh, kid, voice: appVoice } = useApp();
  const voice = voiceProp ?? appVoice;
  const [words, setWords] = useState<Word[] | null>(null);
  const [walk, setWalk] = useState<WalkState | null>(null);
  const [question, setQuestion] = useState<PlacementQuestion | null>(null);
  const [result, setResult] = useState<{ known: number; reading: number; understanding: number } | null>(null);
  const [asked, setAsked] = useState(0);
  const rng = useMemo(() => mulberry32(Date.now() >>> 0), []);
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
    if (q.style === 'listen') speak(q.text);
  }, [walk]);

  const [ready, setReady] = useState(tapGuardMs <= 0);
  useEffect(() => {
    if (tapGuardMs <= 0) return;
    setReady(false);
    const t = setTimeout(() => setReady(true), tapGuardMs);
    return () => clearTimeout(t);
  }, [question, tapGuardMs]);

  const answer = async (correct: boolean) => {
    if (!walk || !question || result || !ready || walk.done) return;
    if (tapGuardMs > 0) setReady(false);
    setAsked((n) => n + 1);
    const next = walkStep(walk, { style: question.style, wordId: question.wordId, correct }, bands.length);
    setWalk(next);
    if (next.done) {
      const levels = placementLevels(next.answers);
      const ids = placementIds(bands, next.answers);
      let known = ids.readingIds.length;
      try {
        await applyPlacement(db, { ...ids, ...levels }, now());
        known = (await loadKnowledge(db)).known;
      } catch (e) {
        console.error('placement: could not save the result', e); // he still gets his close; the check runs again next launch
      }
      setResult({ known, ...levels });
    }
  };

  const k = kid ?? DEFAULT_KID;
  if (!words || !walk || (!question && !result)) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>; // no 不知道 before the first question

  if (result) {
    return (
      <div class="screen">
        <Scene kind="home" />
        <div class="center">
          <Pet kid={k} mood="pleased" size={160} />
          <h1><Label zh={`你已经认识 ${result.known} 个字了！`} /></h1>
          <p class="placement__levels"><Label zh={`读：${levelName(bands, result.reading)} · 懂：${levelName(bands, result.understanding)}`} /></p>
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
    <div class="screen placement" data-ready={ready ? 'true' : 'false'} data-asked={asked}>
      <Scene kind="home" />
      <div class="center">
        <Pet kid={k} mood="neutral" bubble={q ? BUBBLE[q.style] : undefined} size={100} />
        {q?.style === 'read' && (
          <>
            <div class="hanzi hanzi--xl" data-testid="placement-char">{q.text}</div>
            <div class="choices choices--pinyin">{q.options.map((o) => option(o, o === q.answer))}</div>
          </>
        )}
        {q?.style === 'listen' && (
          <>
            <SpeakButton text={q.text} big />
            <div class="choices choices--hanzi">{q.options.map((o) => option(o, o === q.text, true))}</div>
          </>
        )}
        {q?.style === 'real' && (
          <>
            <div class="hanzi real-word" lang="zh">{q.shown}</div>
            <div class="choices">
              <button type="button" class="choice press" data-answer={q.real ? 'true' : undefined} onClick={() => void answer(q.real)}><Label zh="是真的" /></button>
              <button type="button" class="choice press" data-answer={q.real ? undefined : 'true'} onClick={() => void answer(!q.real)}><Label zh="是假的" /></button>
            </div>
          </>
        )}
        {q?.style === 'fill' && (
          <>
            <div class="pond-q zibian__word hanzi" lang="zh">
              {Array.from(q.word).map((c, i) => (i === q.index ? <span key={i} class="zibian__blank">？</span> : <span key={i}>{c}</span>))}
            </div>
            <div class="choices choices--hanzi">{q.options.map((o) => option(o, o === q.answer, true))}</div>
          </>
        )}
        {q?.style === 'fit' && (
          <>
            <div class="hanzi meaning-cue meaning-cue--sentence" lang="zh">
              {q.item.before}<span class="meaning-cue__blank" aria-label="空格">？</span>{q.item.after}
            </div>
            <div class={`choices choices--hanzi${q.item.options.some((o) => Array.from(o).length > 1) ? ' choices--words' : ''}`}>
              {q.item.options.map((o) => option(o, o === q.item.word, true))}
            </div>
          </>
        )}
        <button type="button" class="btn btn--big" onClick={() => void answer(false)}>
          <Label zh="不知道" /> <InkIcon name="think" size={30} />
        </button>
      </div>
    </div>
  );
}
