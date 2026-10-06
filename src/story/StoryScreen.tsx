// The story reader (spec 2026-10-07 3c §4): a chapter's setup before the lesson or its payoff after it, as picture-book pages — the
// painted scene on top with the cast standing in it, the words below. Slots follow his ladder; Granny Dragon speaks only Mandarin.
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-preact';
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
import { castFor, slotState, type CastId } from './weave';

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
  if (parts.length > 1) return <>{parts.map((p, i) => (i % 2 ? <em key={i}><Slots text={p} know={know} /></em> : <Slots key={i} text={p} know={know} />))}</>;
  return <Slots text={text} know={know} />;
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

function Cast({ ids, talking }: { ids: CastId[]; talking?: boolean }) {
  return (
    <div class="story__cast">
      {ids.map((id) => (id === 'truffle'
        ? <Truffle key={id} mood="pleased" label={null} size={150} />
        : <span key={id} class="story__granny-wrap"><GrannyDragon pose="smile" label={null} size={150} talking={talking} /></span>))}
    </div>
  );
}

function Picture({ scene, children }: { scene: string | null; children: preact.ComponentChildren }) {
  const bg = scene ? `url(${import.meta.env.BASE_URL}story/bg/${scene}.webp)` : undefined;
  return <div class="story__pic" data-scene={scene ?? undefined} style={bg ? { backgroundImage: bg } : undefined}>{children}</div>;
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

  const goTo = (n: number) => { stopSpeaking(); setReady(null); setAt(n); }; // a granny/listen beat says when it's ready
  const beat = beats[at]!;
  const last = at === beats.length - 1;
  const word = (id: string) => know?.wordsById.get(id)?.text ?? know?.ladderById.get(id)?.text ?? id.slice(2);
  const fly = !reducedMotion();
  return (
    <div class="screen story" data-beat={at} data-part={part}>
      <button type="button" class="story__skip" onClick={() => void finish()}><Label zh="跳过" /></button>
      {beat.kind === 'page' && (
        <>
          <Picture scene={beat.scene}><Cast ids={castFor(beat.page)} /></Picture>
          <div class="story__words">
            {beat.page.lines.map((l, i) => {
              if (l.kind === 'scene' || l.kind === 'cast') return null;
              if (l.kind === 'speech') return <p key={i} class="story__bubble"><b>{l.who}</b> <Woven text={l.text} know={know} /></p>;
              if (l.kind === 'rescued') {
                return (
                  <div key={i} class="story__rescued-line">
                    <p class="story__text"><Woven text={l.text} know={know} /></p>
                    {rescued.length > 0 && (
                      <div class="story__rescued">
                        {rescued.map((id, k) => (
                          <button key={id} type="button" class={`story__chip${fly ? ' story__chip--fly' : ''}`} style={fly ? { animationDelay: `${k * 90}ms` } : undefined} lang="zh" onClick={() => speak(word(id))}>{word(id)}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return <p key={i} class="story__text"><Woven text={l.text} know={know} /></p>;
            })}
          </div>
        </>
      )}
      {beat.kind === 'granny' && (
        <>
          <Picture scene={(beats.slice(0, at).reverse().find((b) => b.kind === 'page') as Extract<Beat, { kind: 'page' }> | undefined)?.scene ?? null}><Cast ids={['granny']} talking={voice} /></Picture>
          <div class="story__words"><GrannyLines lines={c.granny} voice={voice} onReady={setReady} /></div>
        </>
      )}
      {beat.kind === 'listen' && (
        <>
          <Picture scene={beats.find((b): b is Extract<Beat, { kind: 'page' }> => b.kind === 'page')?.scene ?? null}><Cast ids={['granny']} talking /></Picture>
          <div class="story__words"><ListenScene lines={c.listen.lines} questions={c.listen.questions} chapter={chapter} onReady={setReady} /></div>
        </>
      )}
      <nav class="story__nav">
        <button type="button" class="story__nav-btn" aria-label="上一页" disabled={at === 0} onClick={() => goTo(at - 1)}><ChevronLeft size={34} strokeWidth={3} /></button>
        <button type="button" class="story__nav-btn story__nav-btn--next" aria-label="下一页" disabled={!(ready ?? beat.kind === 'page')} onClick={() => { if (last) void finish(); else goTo(at + 1); }}><ChevronRight size={34} strokeWidth={3} /></button>
      </nav>
    </div>
  );
}
