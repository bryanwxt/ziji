import { Pause, Play, Volume2 } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { FinishedRecording } from '../../audio/recorder';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import type { ReadingPassage } from '../../langdu/cycle';
import { introLines, pinyinMode } from '../../langdu/intro';
import { displayText, splitPhrases } from '../../langdu/phrases';
import type { KidState, OralInfo } from '../../types';
import { BottomBar } from '../../ui/BottomBar';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { MicButton, useRecorder } from '../shared/recording';

export interface LangduResult {
  intro: FinishedRecording | null; // daily step only
  read: FinishedRecording | null; // null when the microphone was unavailable
}

interface Props {
  passage: ReadingPassage;
  oral: OralInfo;
  warmups: number;
  knownChars: Set<string>;
  kid: KidState;
  withWarmup: boolean;
  onDone: (r: LangduResult) => void;
}

type Part = 'warmup' | 'echo' | 'read' | 'listen';
/** The 朗读 coach: etiquette warm-up → echo by phrase → read it all with the meter → listen back. */
export function LangduStep({ passage, oral, warmups, knownChars, kid, withWarmup, onDone }: Props) {
  const [part, setPart] = useState<Part>(withWarmup ? 'warmup' : 'echo');
  const [phrase, setPhrase] = useState(0);
  const intro = useRecorder();
  const read = useRecorder();
  const lines = useMemo(() => introLines(oral), [oral]);
  const phrases = useMemo(() => splitPhrases(passage.text), [passage.text]);
  const mode = pinyinMode(warmups);
  const pinyinFor = mode === 'full' ? undefined : mode === 'unknown' ? (ch: string) => !knownChars.has(ch) : () => false;
  const playbackUrl = useMemo(() => (read.result ? URL.createObjectURL(read.result.blob) : null), [read.result]);
  useEffect(() => () => { if (playbackUrl) URL.revokeObjectURL(playbackUrl); }, [playbackUrl]);

  useEffect(() => {
    if (part === 'warmup') speak('你好！');
    if (part === 'echo' && phrases[phrase]) speak(phrases[phrase]!);
    if (part === 'listen' && withWarmup) speak(lines.thanks);
  }, [part, phrase]);

  useEffect(() => {
    if (read.state === 'done' && part === 'read') {
      playSfx('star');
      setPart('listen');
    }
  }, [read.state]);

  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return; // a double tap on 完成 saves the reading once
    finished.current = true;
    onDone({ intro: intro.result, read: read.result });
  };

  if (part === 'warmup') {
    return (
      <>
        <div class="langdu">
          <Pet kid={kid} mood="neutral" size={130} bubble="你好！" />
          <div class="langdu__script">
            <p class="langdu__line"><Label zh={lines.hello} pinyinFor={pinyinFor} /></p>
            {lines.body && <p class="langdu__line"><Label zh={lines.body} pinyinFor={pinyinFor} /></p>}
          </div>
          <MicButton rec={intro} withLevel={false} />
          {intro.state === 'done' && <p class="langdu__ok"><Label zh="很好！" /></p>}
        </div>
        <BottomBar actionLabel="继续" disabled={intro.state === 'ready' || intro.state === 'recording'} onAction={() => setPart('echo')} />
      </>
    );
  }

  if (part === 'echo') {
    const last = phrase >= phrases.length - 1;
    return (
      <>
        <div class="langdu">
          <p class="langdu__step"><Label zh="听一听，说一说" /> <small>{phrase + 1} / {phrases.length}</small></p>
          <p class="langdu__phrase"><Label zh={phrases[phrase] ?? ''} /></p>
          <button type="button" class="btn" onClick={() => speak(phrases[phrase] ?? '')}>
            <Volume2 size={24} strokeWidth={2.5} /> <Label zh="再听" />
          </button>
        </div>
        <BottomBar actionLabel={last ? '开始朗读' : '下一句'} onAction={() => (last ? setPart('read') : setPhrase(phrase + 1))} />
      </>
    );
  }

  if (part === 'read') {
    return (
      <>
        <div class="langdu">
          <h2 class="langdu__title"><Label zh={passage.title} /></h2>
          <p class="passage langdu__passage"><Label zh={displayText(passage.text)} /></p>
          <MicButton rec={read} withLevel />
        </div>
        <BottomBar actionLabel="完成" disabled={read.state !== 'blocked'} onAction={finish} />
      </>
    );
  }

  return (
    <>
      <div class="langdu">
        <h2 class="langdu__title"><Label zh="听听你自己" /></h2>
        <PlayBack url={playbackUrl} />
        <button type="button" class="btn" onClick={() => { read.reset(); setPart('read'); }}><Label zh="重录" /></button>
        {withWarmup && <p class="langdu__line langdu__thanks"><Label zh={lines.thanks} /></p>}
      </div>
      <BottomBar actionLabel="完成" onAction={finish} />
    </>
  );
}

/** Listen back to his reading: one big play/pause button (the browser's own grey player showed "Error" on iPad). */
function PlayBack({ url }: { url: string | null }) {
  const audio = useRef<HTMLAudioElement>(null);
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
    setPlaying(true);
    void Promise.resolve(a.play()).catch(() => setPlaying(false)); // a refused play leaves the button on play
  };
  return (
    <>
      <audio ref={audio} src={url ?? undefined} preload="auto" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />
      <button type="button" class="speak speak--big" aria-label={playing ? '暂停' : '听录音'} disabled={!url} onClick={toggle}>
        {playing ? <Pause size={60} strokeWidth={2.5} /> : <Play size={60} strokeWidth={2.5} />}
      </button>
    </>
  );
}
