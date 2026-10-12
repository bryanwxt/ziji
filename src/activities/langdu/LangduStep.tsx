import { Pause, Play, Volume2 } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { FinishedRecording } from '../../audio/recorder';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import type { ReadingPassage } from '../../langdu/cycle';
import { introLines } from '../../langdu/intro';
import { answeringSentence, splitSentences } from '../../langdu/sentences';
import { betterTake } from '../../langdu/stars';
import { useModelReader } from '../../langdu/useModelReader';
import type { KidState, OralInfo } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { BlockedNote, MicButton, useRecorder } from '../shared/recording';

export interface LangduResult {
  intro: FinishedRecording | null; // the warm-up, day 1 only
  read: FinishedRecording | null; // the better of his takes; null when the microphone was blocked or missing
  meaning: { correct: boolean; picked: string } | null; // null: no question (an extra round, a parent text without one)
}

export type LangduPart = 'warmup' | 'listen' | 'read' | 'compare' | 'meaning';

interface Props {
  passage: ReadingPassage;
  oral: OralInfo;
  kid: KidState;
  /** day 1 of this passage (isFirstDay): the self-introduction first */
  withWarmup: boolean;
  /** 多读一遍 from Home: listen, read and compare only */
  extra?: boolean;
  /** the microphone was refused earlier in the lesson: don't ask again */
  micBlocked?: boolean;
  /** the stage cases open a part directly */
  startAt?: LangduPart;
  onDone: (r: LangduResult) => void;
}

const BUBBLE: Record<LangduPart, string> = { warmup: '你好！', listen: '听我读！', read: '大声读！', compare: '比一比！', meaning: '想一想！' };

/** 朗读 (spec 2026-10-12 §3): warm-up on day 1 → listen and follow → read alone → compare, one re-read → one meaning question. */
export function LangduStep({ passage, oral, kid, withWarmup, extra = false, micBlocked = false, startAt, onDone }: Props) {
  const [part, setPart] = useState<LangduPart>(startAt ?? (withWarmup ? 'warmup' : 'listen'));
  const sentences = useMemo(() => splitSentences(passage.text), [passage.text]);
  const model = useModelReader(sentences);
  const intro = useRecorder(micBlocked);
  const read = useRecorder(micBlocked);
  const [takes, setTakes] = useState<FinishedRecording[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const takeAudio = useRef<HTMLAudioElement>(null);
  const lines = useMemo(() => introLines(oral), [oral]);
  const question = extra ? undefined : passage.question;
  // a microphone refused in the warm-up isn't asked for again to read
  const readBlocked = read.state === 'blocked' || (intro.state === 'blocked' && read.state === 'ready');
  const latest = takes[takes.length - 1] ?? null;
  const playbackUrl = useMemo(() => (latest ? URL.createObjectURL(latest.blob) : null), [latest]);
  useEffect(() => () => { if (playbackUrl) URL.revokeObjectURL(playbackUrl); }, [playbackUrl]);

  useEffect(() => {
    if (part === 'warmup') speak('你好！');
    else if (part === 'listen') model.read(0);
    else model.stop(); // he reads, compares or answers: the model is quiet until asked
  }, [part]);

  useEffect(() => {
    if (read.state === 'done' && read.result && part === 'read') {
      playSfx('star');
      setTakes((t) => [...t, read.result!]);
      setPart('compare');
    }
  }, [read.state]);

  const finished = useRef(false);
  const finish = (meaning: LangduResult['meaning']) => {
    if (finished.current) return; // a double tap on 完成 saves the reading once
    finished.current = true;
    model.stop();
    onDone({ intro: intro.result, read: betterTake(takes), meaning });
  };
  const afterReading = () => (question ? setPart('meaning') : finish(null));
  const reread = () => {
    takeAudio.current?.pause();
    read.reset();
    setPart('read');
  };
  const replay = (i: number, only: boolean) => {
    takeAudio.current?.pause();
    model.read(i, only);
  };

  const answerAt = question ? answeringSentence(question, sentences) : -1;
  const pick = (i: number) => {
    if (!question || picked !== null) return;
    setPicked(i);
    const right = i === question.answer;
    playSfx(right ? 'correct' : 'wrong');
    if (!right && answerAt >= 0) speak(sentences[answerAt]!); // the sentence that answers it, read again
  };

  // 谢谢老师！ closes a warm-up day, on the step's last screen
  const closing = withWarmup && ((part === 'meaning' && picked !== null) || (part === 'compare' && !question));
  useEffect(() => {
    if (closing) speak(lines.thanks, { queue: true });
  }, [closing]);
  const thanks = closing ? <p class="langdu__line langdu__thanks"><Label zh={lines.thanks} /></p> : null;

  // Truffle stays with him through every part (spec 2026-10-04 §3)
  const pet = <Pet kid={kid} mood="neutral" size={180} calm={intro.state === 'recording' || read.state === 'recording'} bubble={BUBBLE[part]} />;

  if (part === 'warmup') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="继续" disabled={intro.state === 'ready' || intro.state === 'recording'} onAction={() => setPart('listen')} />}>
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

  if (part === 'listen') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="开始朗读" disabled={!model.heardAll} onAction={() => setPart('read')} />}>
        <div class="langdu langdu__listen" data-heard={String(model.heardAll)}>
          <p class="langdu__step"><Label zh="听一听，看一看" /></p>
          <h2 class="langdu__title"><Label zh={passage.title} /></h2>
          <Sentences sentences={sentences} current={model.current} onTap={(i) => replay(i, model.heardAll)} />
        </div>
      </Stage>
    );
  }

  if (part === 'read') {
    return (
      <Stage activity="langdu" truffle={pet} sheet={<FeedbackSheet actionLabel="读完了" disabled={!readBlocked} onAction={afterReading} />}>
        <div class="langdu">
          <p class="langdu__step"><Label zh="自己读，大声读" /></p>
          <Sentences sentences={sentences} current={null} />
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
          <Sentences sentences={sentences} current={model.current} onTap={(i) => replay(i, true)} />
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

  if (!question) return null; // the meaning part only opens with a question
  const right = picked === question.answer;
  const mark = (i: number) => (picked === null ? '' : i === question.answer ? (i === picked ? ' is-right' : ' is-answer') : i === picked ? ' is-wrong' : ' is-dim');
  const sheet =
    picked === null ? (
      <FeedbackSheet actionLabel="完成" disabled onAction={() => {}} />
    ) : (
      <FeedbackSheet
        tone={right ? 'good' : 'oops'}
        title={right ? '对了！' : `答案是：${question.choices[question.answer]}`}
        detail={!right && answerAt >= 0 ? <Label zh={sentences[answerAt]!} /> : undefined}
        actionLabel="完成"
        auto={false}
        onAction={() => finish({ correct: right, picked: question.choices[picked]! })}
      />
    );
  return (
    <Stage activity="langdu" truffle={pet} sheet={sheet}>
      <div class="langdu">
        <p class="langdu__step"><Label zh="想一想" /></p>
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

/** The passage a sentence at a time: buttons that replay (listen, compare), plain text to read from (read). */
function Sentences({ sentences, current, onTap }: { sentences: string[]; current: number | null; onTap?: (i: number) => void }) {
  return (
    <div class="passage langdu__passage langdu__sentences">
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
