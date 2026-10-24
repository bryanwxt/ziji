import { Pause, Play, Volume2 } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { FinishedRecording } from '../../audio/recorder';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { creditLine, LICENCE_URL } from '../../langdu/credit';
import { introLines } from '../../langdu/intro';
import type { LangduPassage } from '../../langdu/pool';
import { shuffleQuestion } from '../../langdu/questions';
import { answeringSentence, readLimitMs, splitSentences } from '../../langdu/sentences';
import { betterTake } from '../../langdu/stars';
import { FIRST_LISTEN, REPLAY, REPLAY_RATE, useModelReader } from '../../langdu/useModelReader';
import type { Rng } from '../../lib/random';
import type { AskedQuestion, KidState, OralInfo, PassageCredit, PassageWord, TakeAnswer } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { KeepPinyin } from '../../ui/pinyinFade';
import { BlockedNote, MicButton, useRecorder } from '../shared/recording';

export interface LangduResult {
  intro: FinishedRecording | null; // the warm-up, when it ran and was recorded
  read: FinishedRecording | null; // the better of his takes; null when the microphone was blocked or missing
  answers: TakeAnswer[]; // his answers to the read's questions, in the order asked; none on an extra round or with no questions
}

export type LangduPart = 'warmup' | 'listen' | 'read' | 'compare' | 'meaning';

interface Props {
  passage: LangduPassage;
  oral: OralInfo;
  kid: KidState;
  /** the warm-up is due (warmupDue): the self-introduction first */
  withWarmup: boolean;
  /** 多读一遍 from Home: listen, read and compare only */
  extra?: boolean;
  /** the microphone was refused earlier in the lesson: don't ask again */
  micBlocked?: boolean;
  /** the stage cases open a part directly */
  startAt?: LangduPart;
  /** shuffles the question's choices at each showing (spec 2026-10-15 §6); tests and the stage cases pass a seeded one */
  rng?: Rng;
  /** 下一篇 (spec 2026-10-15 §5): shown on Listen while set; the screen swaps in the next passage */
  onSwap?: () => void;
  onDone: (r: LangduResult) => void;
}

/** 开始朗读 waits at most this long for the model's first sentence */
export const START_AFTER_MS = 10_000;

const BUBBLE: Record<LangduPart, string> = { warmup: '你好！', listen: '听我读！', read: '大声读！', compare: '比一比！', meaning: '想一想！' };

/**
 * 朗读 (spec 2026-10-12 §3, 2026-10-15, 2026-10-24): the warm-up when due → listen and follow (slower, with a pause after each
 * sentence) → read alone → compare, one re-read → the read's questions, one at a time. The warm-up lives here; the passage's
 * parts live in PassageParts, keyed by the passage, so 下一篇 can swap the
 * passage under a kept warm-up take.
 */
export function LangduStep({ passage, oral, kid, withWarmup, extra = false, micBlocked = false, startAt, rng = Math.random, onSwap, onDone }: Props) {
  const [warming, setWarming] = useState(startAt ? startAt === 'warmup' : withWarmup);
  const intro = useRecorder(micBlocked);
  const lines = useMemo(() => introLines(oral), [oral]);
  useEffect(() => {
    if (warming) speak('你好！');
  }, []);

  if (warming) {
    // Truffle stays with him through every part (spec 2026-10-04 §3)
    const pet = <Pet kid={kid} mood="neutral" size={180} calm={intro.state === 'recording'} bubble={BUBBLE.warmup} />;
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="继续" disabled={(intro.state === 'ready' && !intro.failed) || intro.state === 'recording'} onAction={() => setWarming(false)} />}>
        <div class="langdu">
          <div class="langdu__script">
            <p class="langdu__line"><Label zh={lines.hello} fade /></p>
            {lines.body && <p class="langdu__line"><Label zh={lines.body} fade /></p>}
          </div>
          <MicButton rec={intro} withLevel={false} />
          {intro.state === 'done' && <p class="langdu__ok"><Label zh="很好！" /></p>}
        </div>
      </Stage>
    );
  }
  return (
    <PassageParts
      key={passage.id}
      passage={passage}
      kid={kid}
      extra={extra}
      // a microphone refused in the warm-up isn't asked for again to read
      micBlocked={micBlocked || intro.state === 'blocked'}
      startAt={startAt && startAt !== 'warmup' ? startAt : 'listen'}
      rng={rng}
      thanks={withWarmup ? lines.thanks : null}
      onSwap={onSwap}
      onDone={(r) => onDone({ ...r, intro: intro.result })}
    />
  );
}

interface PartsProps {
  passage: LangduPassage;
  kid: KidState;
  extra: boolean;
  micBlocked: boolean;
  startAt: Exclude<LangduPart, 'warmup'>;
  rng: Rng;
  /** 谢谢老师！ closes a warm-up day; null when there was no warm-up */
  thanks: string | null;
  onSwap?: () => void;
  onDone: (r: Omit<LangduResult, 'intro'>) => void;
}

/** One passage's listen, read, compare and question. */
function PassageParts({ passage, kid, extra, micBlocked, startAt, rng, thanks: thanksLine, onSwap, onDone }: PartsProps) {
  const [part, setPart] = useState<LangduPart>(startAt);
  const sentences = useMemo(() => splitSentences(passage.text), [passage.text]);
  const model = useModelReader(sentences);
  const read = useRecorder(micBlocked, readLimitMs(passage.text)); // long passages get longer (spec 2026-10-15 §8)
  const [takes, setTakes] = useState<FinishedRecording[]>([]);
  const takeAudio = useRef<HTMLAudioElement>(null);
  // the read's questions (spec 2026-10-24 §5), each with its choices in a new order: the right one's place is never learnt
  const questions = useMemo<AskedQuestion[]>(() => (extra ? [] : (passage.asked ?? []).map((q) => shuffleQuestion(q, rng))), [passage.asked, extra]);
  const [at, setAt] = useState(0); // the question being asked
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<TakeAnswer[]>([]);
  const question = questions[at];
  const lastQuestion = at === questions.length - 1;
  // names always show their pinyin (spec 2026-10-15 §3)
  const nameChars = useMemo(() => new Set((passage.names ?? []).flatMap((n) => Array.from(n))), [passage.names]);
  const readBlocked = read.state === 'blocked';
  const latest = takes[takes.length - 1] ?? null;
  const playbackUrl = useMemo(() => (latest ? URL.createObjectURL(latest.blob) : null), [latest]);
  useEffect(() => () => { if (playbackUrl) URL.revokeObjectURL(playbackUrl); }, [playbackUrl]);

  useEffect(() => {
    if (part === 'listen') model.read(0, false, FIRST_LISTEN); // the first listen: slower, a pause after each sentence (spec 2026-10-24 §7)
    else model.stop(); // he reads, compares or answers: the model is quiet until asked
  }, [part]);

  // 开始朗读 comes alive once the model has read its first sentence, or after START_AFTER_MS with no voice (review 2026-10-17:
  // waiting for the whole passage was too long); tapping it stops the model
  const [canStart, setCanStart] = useState(false);
  const firstRead = useRef<number | null>(null);
  useEffect(() => {
    if (model.current !== null && firstRead.current === null) firstRead.current = model.current;
    else if (firstRead.current !== null && model.current !== firstRead.current) setCanStart(true);
  }, [model.current]);
  useEffect(() => {
    const t = setTimeout(() => setCanStart(true), START_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (read.state === 'done' && read.result && part === 'read') {
      playSfx('star');
      setTakes((t) => [...t, read.result!]);
      setPart('compare');
    }
  }, [read.state]);

  const finished = useRef(false);
  const finish = (given: TakeAnswer[]) => {
    if (finished.current) return; // a double tap on 完成 saves the reading once
    finished.current = true;
    model.stop();
    onDone({ read: betterTake(takes, passage.text), answers: given });
  };
  const swapped = useRef(false);
  const swap = () => {
    if (swapped.current || !onSwap || !model.heardAll) return; // a double tap on 下一篇 swaps once
    swapped.current = true;
    model.stop();
    onSwap();
  };
  const afterReading = () => (question ? setPart('meaning') : finish([]));
  const reread = () => {
    takeAudio.current?.pause();
    read.reset();
    setPart('read');
  };
  // a tap during the first read-through (on Listen) reads on from there at its pace; a sentence alone, or 听老师的 on Compare
  // (even when he began reading before the read-through ended), at the replay pace
  const replay = (i: number, only: boolean) => {
    takeAudio.current?.pause();
    model.read(i, only, only || part !== 'listen' || model.heardAll ? REPLAY : FIRST_LISTEN);
  };

  // what a miss reads again (spec 2026-10-24 §5): a why or main question's two supporting sentences, else its one sentence
  const readBack = question ? backSentences(question, sentences) : [];
  const pick = (i: number) => {
    if (!question || picked !== null) return;
    setPicked(i);
    const right = i === question.answer;
    setAnswers((a) => [...a, { ...('kind' in question ? { kind: question.kind } : {}), correct: right, picked: question.choices[i]! }]);
    playSfx(right ? 'correct' : 'wrong');
    if (!right) readBack.forEach((n, k) => speak(sentences[n]!, { queue: k > 0, rate: REPLAY_RATE })); // read again, no re-ask
  };
  const moved = useRef(-1); // the question 下一题 last moved on from: a double tap moves on once
  const nextQuestion = () => {
    if (picked === null || moved.current === at) return;
    moved.current = at;
    if (lastQuestion) { finish(answers); return; }
    setAt((n) => n + 1);
    setPicked(null);
  };

  // 谢谢老师！ closes a warm-up day, on the step's last screen; said once, though a re-read brings Compare back (final review M1)
  const closing = !!thanksLine && ((part === 'meaning' && picked !== null && lastQuestion) || (part === 'compare' && !question));
  const thanked = useRef(false);
  useEffect(() => {
    if (!closing || thanked.current || !thanksLine) return;
    thanked.current = true;
    speak(thanksLine, { queue: true });
  }, [closing]);
  const thanks = closing && thanksLine ? <p class="langdu__line langdu__thanks"><Label zh={thanksLine} /></p> : null;

  // Truffle stays with him through every part (spec 2026-10-04 §3)
  const pet = <Pet kid={kid} mood="neutral" size={180} calm={read.state === 'recording'} bubble={BUBBLE[part]} />;

  if (part === 'listen') {
    return (
      <Stage
        activity="langdu"
        truffle={pet}
        sheet={
          <FeedbackSheet
            actionLabel="开始朗读"
            disabled={!model.heardAll && !canStart}
            onAction={() => setPart('read')}
            // 下一篇 waits for the read-through like 开始朗读: never the only live button while the model reads (review, 2026-10-15)
            aside={onSwap && <button type="button" class="btn langdu__next" disabled={!model.heardAll} onClick={swap}><Label zh="下一篇" /></button>}
          />
        }
      >
        <div class="langdu langdu__listen" data-heard={String(model.heardAll)}>
          <p class="langdu__step"><Label zh="听一听，看一看" /></p>
          <div class="langdu__head">
            {passage.image && <Picture src={passage.image} />}
            <h2 class="langdu__title"><Label zh={passage.title} /></h2>
          </div>
          {/* the first question he answers after reading, shown first: a purpose to read for (Therrien 2004; learning rules 2026-10-17) */}
          {questions[0] && <p class="langdu__purpose"><Label zh="读的时候想一想：" /><Label zh={questions[0].q} fade /></p>}
          {passage.words?.length ? <NewWords words={passage.words} /> : null}
          <KeepPinyin chars={nameChars}>
            <Sentences sentences={sentences} current={model.current} onTap={(i) => replay(i, model.heardAll)} />
          </KeepPinyin>
          {passage.credit && <Credit credit={passage.credit} />}
        </div>
      </Stage>
    );
  }

  if (part === 'read') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="读完了" disabled={!readBlocked && !(read.state === 'ready' && read.failed)} onAction={afterReading} />}>
        <div class="langdu">
          <p class="langdu__step"><Label zh="自己读，大声读" /></p>
          {passage.image && <Picture src={passage.image} />}
          <KeepPinyin chars={nameChars}>
            <Sentences sentences={sentences} current={null} />
          </KeepPinyin>
          {readBlocked ? <BlockedNote /> : <MicButton rec={read} withLevel />}
        </div>
      </Stage>
    );
  }

  if (part === 'compare') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel={question ? '下一步' : '完成'} onAction={afterReading} />}>
        <div class="langdu">
          <p class="langdu__step"><Label zh="听一听，比一比" /></p>
          <KeepPinyin chars={nameChars}>
            <Sentences sentences={sentences} current={model.current} onTap={(i) => replay(i, true)} />
          </KeepPinyin>
          <div class="langdu__compare">
            <PlayBack url={playbackUrl} audio={takeAudio} onPlay={() => model.stop()} />
            <button type="button" class="btn btn--secondary langdu__big" onClick={() => replay(0, false)}>
              <Volume2 size={30} strokeWidth={2.5} /> <Label zh="听老师的" />
            </button>
          </div>
          {takes.length < 2 && <button type="button" class="btn langdu__again" onClick={reread}><Label zh="再读一遍" /></button>}
          {thanks}
        </div>
      </Stage>
    );
  }

  // the questions, one at a time: no picture, so the picture can't answer them (spec 2026-10-15 §7)
  if (!question) return null; // the meaning part only opens with a question
  const right = picked === question.answer;
  const action = lastQuestion ? '完成' : '下一题';
  const mark = (i: number) => (picked === null ? '' : i === question.answer ? (i === picked ? ' is-right' : ' is-answer') : i === picked ? ' is-wrong' : ' is-dim');
  const sheet =
    picked === null ? (
      <FeedbackSheet actionLabel={action} disabled onAction={() => {}} />
    ) : (
      <FeedbackSheet
        tone={right ? 'good' : 'oops'}
        title={right ? '对了！' : `答案是：${question.choices[question.answer]}`}
        detail={!right && readBack.length ? <div class="langdu__back">{readBack.map((n) => <p key={n}><Label zh={sentences[n]!} /></p>)}</div> : undefined}
        actionLabel={action}
        auto={false}
        onAction={nextQuestion}
      />
    );
  return (
    <Stage activity="langdu" truffle={pet} sheet={sheet}>
      <div class="langdu" key={at}>
        <p class="langdu__step"><Label zh="想一想" />{questions.length > 1 && <span class="langdu__count"> {at + 1}/{questions.length}</span>}</p>
        <p class="langdu__q"><Label zh={question.q} fade /></p>
        <div class="choices langdu__choices">
          {question.choices.map((c, i) => (
            <button key={i} type="button" class={`choice${mark(i)}`} disabled={picked !== null} onClick={() => pick(i)}>
              <Label zh={c} fade peek={false} />
            </button>
          ))}
        </div>
        {thanks}
      </div>
    </Stage>
  );
}

/** The sentences a miss reads again: a why or main question's two (in passage order), else the one that answers it; none when
 *  no sentence does (a parent question whose right choice is in none). */
function backSentences(q: AskedQuestion, sentences: string[]): number[] {
  if ('sentences' in q && q.sentences) return [...q.sentences].filter((n) => n >= 0 && n < sentences.length).sort((a, b) => a - b);
  const one = answeringSentence(q, sentences);
  return one >= 0 ? [one] : [];
}

/** The passage's picture (Global Storybooks): a picture that fails to load hides itself, never a broken box. */
function Picture({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img class="langdu__pic" src={`${import.meta.env.BASE_URL}${src}`} alt="" onError={() => setFailed(true)} />;
}

/** The story's credit, on Listen only (spec 2026-10-15 §2.1): one quiet line; tapping it opens the details for a parent. */
function Credit({ credit }: { credit: PassageCredit }) {
  const [open, setOpen] = useState(false); // the details are only laid out once opened (WebKit lays out a closed one's body)
  return (
    <details class="langdu__credit" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{creditLine(credit)}</summary>
      {open && (
        <p>
          “{credit.title}”, Global Storybooks (African Storybook), {credit.licence}{credit.adapted ? ', adapted for ZiJi' : ''}.{' '}
          <a href={LICENCE_URL[credit.licence]} target="_blank" rel="noopener noreferrer">Licence</a> · <a href={credit.source} target="_blank" rel="noopener noreferrer">Source</a>
        </p>
      )}
    </details>
  );
}

/** 生词 under the title (spec 2026-10-15 §2.2): each word with its pinyin and kid gloss. */
function NewWords({ words }: { words: readonly PassageWord[] }) {
  return (
    <ul class="langdu__words" aria-label="生词">
      {words.map((w) => (
        <li key={w.text}>
          <Label zh={w.text} /> <span class="langdu__gloss">{w.gloss}</span>
        </li>
      ))}
    </ul>
  );
}

/** The passage a sentence at a time: buttons that replay (listen, compare), plain text to read from (read). */
function Sentences({ sentences, current, onTap }: { sentences: string[]; current: number | null; onTap?: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  // a fade at the bottom while there is more below (review 2026-10-17: a long passage was cut mid-line with no cue)
  const measure = () => {
    const el = box.current;
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };
  useEffect(measure, [sentences]);
  // the lit sentence a third of the way down the box: the box scrolls, never the screen
  useEffect(() => {
    const el = box.current;
    const lit = current === null ? null : (el?.children[current] as HTMLElement | undefined);
    if (el && lit && typeof el.scrollTo === 'function') el.scrollTo({ top: lit.offsetTop - el.clientHeight / 3, behavior: 'smooth' });
  }, [current]);
  return (
    <div ref={box} class={`passage langdu__passage langdu__sentences${more ? ' has-more' : ''}`} onScroll={measure}>
      {sentences.map((s, i) =>
        onTap ? (
          <button key={i} type="button" class={`langdu__sentence${current === i ? ' is-reading' : ''}`} aria-current={current === i ? 'true' : undefined} onClick={() => onTap(i)}>
            <Label zh={s} fade peek={false} />
          </button>
        ) : (
          <span key={i} class="langdu__sentence"><Label zh={s} fade /></span>
        ),
      )}
    </div>
  );
}

/** 听我的: one big play/pause button for his take (the browser's own grey player showed "Error" on iPad). */
function PlayBack({ url, audio, onPlay }: { url: string | null; audio: { current: HTMLAudioElement | null }; onPlay: () => void }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const a = audio.current;
    return () => a?.pause(); // leaving the screen stops it
  }, []);
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    onPlay();
    setPlaying(true);
    void Promise.resolve(a.play()).catch(() => setPlaying(false)); // a refused play leaves the button on play
  };
  return (
    <>
      <audio ref={audio} src={url ?? undefined} preload="auto" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />
      <button type="button" class="btn btn--secondary langdu__big" aria-label={playing ? '暂停' : '听我的'} disabled={!url} onClick={toggle}>
        {playing ? <Pause size={30} strokeWidth={2.5} /> : <Play size={30} strokeWidth={2.5} />} <Label zh={playing ? '暂停' : '听我的'} />
      </button>
    </>
  );
}
