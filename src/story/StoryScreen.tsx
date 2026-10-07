// The story reader (spec 2026-10-07 3c §4): a chapter's setup before the lesson or its payoff after it, as picture-book pages — the
// painted scene on top with the cast standing in it, the words below. Slots follow his ladder; Granny Dragon speaks only Mandarin.
import { ChevronLeft, ChevronRight, FastForward, Volume2 } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { speak, stopSpeaking } from '../audio/speech';
import { onSpeaking } from '../audio/speaking';
import { loadKnowledge, type Knowledge } from '../app/knowledge';
import { useApp, type Route } from '../app/AppContext';
import { localDateKey } from '../lib/date';
import { mulberry32, shuffle } from '../lib/random';
import { getSettings, updateSettings } from '../store/repo';
import { Label } from '../ui/Label';
import { reducedMotion } from '../ui/motion';
import { GrannyDragon } from '../ui/story/GrannyDragon';
import { Truffle } from '../ui/truffle/Truffle';
import { chapterNumbered } from './chapters';
import type { Mandarin, Page, Question } from './format';
import { markPayoff, markSetup } from './progress';
import { wordsPractisedToday } from './today';
import { markFor } from './stage';
import { castFor, slotState, speakerOf, type CastId } from './weave';

type Beat = { kind: 'page'; page: Page; scene: string | null } | { kind: 'granny' } | { kind: 'listen' };
const SLOT = /\{([^|{}]+)\|([^{}]+)\}/g;
/** A line seen through to its end: speak it, and call done when the voice stops (or after a while if it never starts). */
function playLine(zh: string, done: () => void, onStart?: () => void): () => void {
  let started = false;
  let over = false;
  const finish = () => { if (!over) { over = true; off(); clearTimeout(t); done(); } };
  const off = onSpeaking((on) => { if (on) { if (!started) onStart?.(); started = true; } else if (started) finish(); });
  const t = setTimeout(finish, 9000); // a voice that never starts mustn't trap him on the page
  speak(zh);
  return () => { over = true; off(); clearTimeout(t); };
}

/** Words with *emphasis* and their slots woven in by his ladder state (parent spec §5.5). */
function Woven({ text, know }: { text: string; know: Knowledge | null }) {
  const parts = text.split(/\*([^*]+)\*/);
  if (parts.length > 1) return <>{parts.map((p, i) => (i % 2 ? (SFX.test(p) ? <Sfx key={i} text={p} /> : <em key={i}><Slots text={p} know={know} /></em>) : <Slots key={i} text={p} know={know} />))}</>;
  return <Slots text={text} know={know} />;
}

/** A sound in capitals (*SHHHHHHHH.*): lettered big, each letter wobbling after the one before. */
const SFX = /^[A-Z][A-Z!?.…'\s-]{2,}$/;
function Sfx({ text }: { text: string }) {
  return <em class="story__sfx">{Array.from(text).map((ch, k) => <span key={k} style={{ '--k': k }}>{ch}</span>)}</em>;
}

function Slots({ text, know }: { text: string; know: Knowledge | null }) {
  const out: (string | preact.JSX.Element)[] = [];
  let last = 0;
  for (const m of text.matchAll(SLOT)) {
    out.push(text.slice(last, m.index));
    const [zh, en] = [m[1]!.trim(), m[2]!.trim()];
    const state = know ? slotState(know, zh) : 'new';
    out.push(
      state === 'new' ? <span key={m.index} class="story__slot">{en}</span>
      : state === 'learning' ? <button key={m.index} type="button" class="story__slot story__slot--learning" onClick={() => speak(zh)}><span lang="zh">{zh}</span><small>{en}</small></button>
      : <button key={m.index} type="button" class="story__slot story__slot--owned" lang="zh" aria-label={`${zh} ${en}`} onClick={() => speak(zh)}>{zh}</button>,
    );
    last = m.index! + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

/** The cast standing on the scene's floor (stage.ts), each with a shadow under their feet; they hop in on each new page. */
function Cast({ ids, scene, talking, page }: { ids: CastId[]; scene: string | null; talking?: boolean; page: number }) {
  const m = markFor(scene);
  const both = ids.length > 1;
  return (
    <div class="story__cast" style={{ '--x': m.x, '--y': m.y, '--h': m.h }}>
      {ids.map((id, k) => (
        <span key={`${id}-${page}`} class="story__actor" style={{ '--k': k }}>
          {id === 'truffle'
            ? <Truffle mood="pleased" label={null} size={150} alive lookAt={both ? (k === 0 ? 0.7 : -0.7) : 0} />
            : <GrannyDragon pose="smile" label={null} size={150} talking={talking} />}
        </span>
      ))}
    </div>
  );
}

const bgUrl = (scene: string) => `url(${import.meta.env.BASE_URL}story/bg/${scene}.webp)`;
/** The painting, edge to edge: a new scene fades in over the old one; the paint drifts very slowly while he reads. */
function Picture({ scene, onTap, children }: { scene: string | null; onTap: () => void; children: preact.ComponentChildren }) {
  const [under, setUnder] = useState(scene);
  useEffect(() => {
    const t = setTimeout(() => setUnder(scene), 800);
    return () => clearTimeout(t);
  }, [scene]);
  return (
    <div class="story__pic" data-scene={scene ?? undefined} onClick={onTap}>
      {under && under !== scene && <div class="story__bg" style={{ backgroundImage: bgUrl(under) }} />}
      {scene && <div key={scene} class="story__bg story__bg--in" style={{ backgroundImage: bgUrl(scene) }} />}
      {children}
    </div>
  );
}

/** Who's talking: their face in a little round frame (or their initial), their name, then the line. */
function Speech({ who, text, know, style }: { who: string; text: string; know: Knowledge | null; style?: Record<string, number> }) {
  const id = speakerOf(who);
  return (
    <div class="story__speech" style={style}>
      <span class={`story__face story__face--${id ?? 'other'}`} aria-hidden="true">
        {id === 'truffle' ? <Truffle mood="pleased" label={null} size={84} />
          : id === 'granny' ? <GrannyDragon pose="smile" label={null} size={84} />
          : who.slice(0, 1)}
      </span>
      <p class="story__said"><b class="story__who">{who}</b>“<Woven text={text} know={know} />”</p>
    </div>
  );
}

/** Granny Dragon's lines: her voice first, the English only on a tap once heard (with no voice, shown at once). */
function GrannyLines({ lines, voice, onReady }: { lines: Mandarin[]; voice: boolean; onReady: (ready: boolean) => void }) {
  const [heard, setHeard] = useState<boolean[]>(() => lines.map(() => !voice));
  const [shown, setShown] = useState<boolean[]>(() => lines.map(() => !voice));
  const [playing, setPlaying] = useState(voice ? 0 : -1);
  useEffect(() => onReady(heard.every(Boolean)), [heard]);
  useEffect(() => {
    if (playing < 0 || playing >= lines.length) return;
    const mark = () => setHeard((h) => h.map((x, i) => x || i === playing)); // heard once it starts: a tap on another line's 听 mid-line can't leave → stuck
    return playLine(lines[playing]!.zh, () => {
      mark();
      setPlaying((p) => (p + 1 < lines.length ? p + 1 : -1));
    }, mark);
  }, [playing]);
  return (
    <div class="story__granny">
      {lines.map((l, i) => (
        <div key={i} class="story__line">
          <button type="button" class="story__say" aria-label="听" onClick={() => setPlaying(i)}><Volume2 size={26} strokeWidth={2.5} /></button>
          <button type="button" class="story__zh" onClick={() => heard[i] && setShown((s) => s.map((x, j) => x || j === i))}>
            <Label zh={l.zh} />
            {shown[i] && <span class="story__en">{l.en}</span>}
          </button>
        </div>
      ))}
    </div>
  );
}

/** 听一听 (spec 3c §4): Granny's scene played line by line, then its questions. Never graded. */
function ListenScene({ lines, questions, chapter, onReady }: { lines: Mandarin[]; questions: Question[]; chapter: number; onReady: (ready: boolean) => void }) {
  const [playing, setPlaying] = useState(0);
  const [heardAll, setHeardAll] = useState(false);
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const choices = useMemo(() => questions.map((x, i) => shuffle([x.answer, ...x.wrong], mulberry32(chapter * 31 + i))), [questions, chapter]);
  useEffect(() => onReady(heardAll && q === questions.length - 1 && picked !== null), [heardAll, q, picked]);
  useEffect(() => {
    if (playing < 0 || playing >= lines.length) return;
    return playLine(lines[playing]!.zh, () => {
      if (playing + 1 < lines.length) setPlaying(playing + 1);
      else { setPlaying(-1); setHeardAll(true); }
    });
  }, [playing]);
  const question = questions[q];
  return (
    <div class="story__listen">
      <p class="story__listen-title"><Label zh="听一听！" /></p>
      {lines.map((l, i) => (
        <p key={i} class={`story__heard${i === playing ? ' is-playing' : ''}`}><Label zh={l.zh} /></p>
      ))}
      <button type="button" class="btn btn--secondary story__replay" onClick={() => setPlaying(0)}><Volume2 size={22} /> <Label zh="再听一次" /></button>
      {heardAll && question && (
        <div class="story__question">
          <button type="button" class="story__zh" onClick={() => speak(question.zh)}><Label zh={question.zh} /></button>
          <div class="story__choices">
            {choices[q]!.map((c) => (
              <button
                key={c}
                type="button"
                class={`story__choice${picked && c === question.answer ? ' is-answer' : ''}${picked === c && c !== question.answer ? ' is-missed' : ''}`}
                onClick={() => { if (!picked) { setPicked(c); speak(c); } }}
              >
                <Label zh={c} />
              </button>
            ))}
          </div>
          {picked && <p class="story__cheer"><Label zh={picked === question.answer ? '对了！' : '是这个！'} /></p>}
          {picked && q < questions.length - 1 && (
            <button type="button" class="btn btn--primary" onClick={() => { setQ(q + 1); setPicked(null); }}><Label zh="下一题" /></button>
          )}
        </div>
      )}
    </div>
  );
}

export function StoryScreen({ part, chapter, then }: { part: 'setup' | 'payoff'; chapter: number; then: Route }) {
  const { db, voice, now, go, refresh } = useApp();
  const c = chapterNumbered(chapter);
  const [know, setKnow] = useState<Knowledge | null>(null);
  const [rescued, setRescued] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const [ready, setReady] = useState<boolean | null>(null); // null: a page is ready at once; Granny's and 听一听's beats say so themselves
  const leaving = useRef(false);
  const [back, setBack] = useState(false); // the last turn went back a page: the words slide in from the left
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const beats = useMemo((): Beat[] => {
    if (!c) return [];
    const out: Beat[] = [];
    let scene: string | null = null;
    // the payoff starts where the setup left off
    if (part === 'payoff') for (const p of c.setup) for (const l of p.lines) if (l.kind === 'scene') scene = l.id;
    const pages = (ps: Page[]) => ps.forEach((page) => {
      for (const l of page.lines) if (l.kind === 'scene') scene = l.id;
      out.push({ kind: 'page', page, scene });
    });
    if (part === 'setup') { pages(c.setup); if (c.granny.length) out.push({ kind: 'granny' }); }
    else { if (voice && c.listen.lines.length) out.push({ kind: 'listen' }); pages(c.payoff); }
    return out;
  }, [c, part, voice]);

  useEffect(() => {
    void loadKnowledge(db).then(setKnow);
    if (part === 'payoff') void wordsPractisedToday(db, now()).then(setRescued);
    return () => stopSpeaking();
  }, []);

  const finish = async () => {
    if (leaving.current) return;
    leaving.current = true;
    stopSpeaking();
    try {
      const p = (await getSettings(db)).storyProgress;
      await updateSettings(db, { storyProgress: part === 'setup' ? markSetup(p, chapter, localDateKey(now())) : markPayoff(p, chapter) });
      await refresh();
    } catch (e) {
      console.error('story: could not save the chapter', e); // he moves on regardless: a stuck screen is worse than a re-shown chapter
    } finally {
      go(then);
    }
  };
  if (!c || !beats.length) { void finish(); return <div class="screen loading" />; }

  const goTo = (n: number) => { stopSpeaking(); setReady(null); setBack(n < at); setAt(n); }; // a granny/listen beat says when it's ready
  const beat = beats[at]!;
  const last = at === beats.length - 1;
  const canNext = ready ?? beat.kind === 'page';
  const forward = () => { if (!canNext) return; if (last) void finish(); else goTo(at + 1); };
  const word = (id: string) => know?.wordsById.get(id)?.text ?? know?.ladderById.get(id)?.text ?? id.slice(2);
  const fly = !reducedMotion();
  // the scene stays put across pages; Granny's and 听一听's beats stand in the last scene he saw (听一听: the payoff's first)
  const scene = beat.kind === 'page' ? beat.scene
    : beat.kind === 'granny' ? (beats.slice(0, at).reverse().find((b) => b.kind === 'page') as Extract<Beat, { kind: 'page' }> | undefined)?.scene ?? null
    : beats.find((b): b is Extract<Beat, { kind: 'page' }> => b.kind === 'page')?.scene ?? null;
  const cast: CastId[] = beat.kind === 'page' ? castFor(beat.page) : ['granny'];
  // a sideways swipe turns the page (a tap on the picture too); a swipe ends in no click
  const onDown = (e: PointerEvent) => { swipe.current = { x: e.clientX, y: e.clientY, moved: false }; };
  const onUp = (e: PointerEvent) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) < 60 || Math.abs(e.clientY - s.y) > Math.abs(dx)) return;
    s.moved = true;
    if (dx < 0) forward();
    else if (at > 0) goTo(at - 1);
  };
  const tapPicture = () => { if (!swipe.current?.moved) forward(); };
  let firstText = part === 'setup' && at === 0;
  return (
    <div class="screen story" data-beat={at} data-part={part} onPointerDown={onDown} onPointerUp={onUp}>
      <Picture scene={scene} onTap={tapPicture}>
        <Cast ids={cast} scene={scene} talking={beat.kind === 'listen' || (beat.kind === 'granny' && voice)} page={at} />
      </Picture>
      <section class="story__panel">
        <header class="story__head">
          <span class="story__chapter">Chapter {chapter} · {c.title}</span>
          <button type="button" class="story__skip" aria-label="跳过" onClick={() => void finish()}>
            <FastForward size={18} strokeWidth={2.5} /><span class="story__skip-zh" lang="zh">跳过</span>
          </button>
        </header>
        <div key={at} class={`story__words${back ? ' story__words--back' : ''}`}>
          {beat.kind === 'page' && beat.page.lines.filter((l) => l.kind !== 'scene' && l.kind !== 'cast').map((l, i) => {
            const style = { '--i': i };
            if (l.kind === 'speech') return <Speech key={i} who={l.who} text={l.text} know={know} style={style} />;
            if (l.kind === 'rescued') {
              return (
                <div key={i} class="story__rescued-line" style={style}>
                  <p class="story__text"><Woven text={l.text} know={know} /></p>
                  {rescued.length > 0 && (
                    <div class="story__rescued">
                      {rescued.map((id, k) => (
                        <button key={id} type="button" class={`story__chip${fly ? ' story__chip--fly' : ''}`} style={fly ? { animationDelay: `${300 + k * 90}ms` } : undefined} lang="zh" onClick={() => speak(word(id))}>{word(id)}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            const opening = firstText && l.kind === 'text';
            if (opening) firstText = false;
            return <p key={i} class={`story__text${opening ? ' story__text--opening' : ''}`} style={style}><Woven text={l.text} know={know} /></p>;
          })}
          {beat.kind === 'granny' && <GrannyLines lines={c.granny} voice={voice} onReady={setReady} />}
          {beat.kind === 'listen' && <ListenScene lines={c.listen.lines} questions={c.listen.questions} chapter={chapter} onReady={setReady} />}
        </div>
        <nav class="story__nav">
          <button type="button" class="story__nav-btn story__nav-btn--back" aria-label="上一页" disabled={at === 0} onClick={() => goTo(at - 1)}><ChevronLeft size={30} strokeWidth={3} /></button>
          <ol class="story__dots" aria-hidden="true">
            {beats.map((_, i) => <li key={i} class={i === at ? 'is-on' : i < at ? 'is-past' : undefined} />)}
          </ol>
          <button type="button" class="story__nav-btn story__nav-btn--next" aria-label="下一页" disabled={!canNext} onClick={forward}><ChevronRight size={30} strokeWidth={3} /></button>
        </nav>
      </section>
    </div>
  );
}
