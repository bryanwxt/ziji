import HanziWriter from 'hanzi-writer';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { hanChars } from '../../content';
import { loadStrokeData } from '../../content/strokes';
import type { KidState, Word } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { burst } from '../../ui/motion';
import { isHardWrite } from '../../fun/mood';
import { Closeup } from '../../app/Closeup';
import { Pet } from '../../ui/Pet';
import type { Reaction } from '../../ui/truffle/timelines';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import { Label, spokenBlanks } from '../../ui/Label';
import { SpeakButton } from '../../ui/SpeakButton';
import { writingCue } from './cue';
import { writingBoxFor } from './size';
import type { WritePass } from '../../session/runner';

export interface WriteResult {
  totalMisses: number;
  hinted: boolean; // a stroke was missed twice in the recall pass, so its hint showed
  elapsedMs: number;
}

interface Props {
  word: Word;
  kid: KidState;
  resting: TruffleMood;
  isNew: boolean;
  pass: WritePass;
  onDone: (result: WriteResult | null) => void;
  /** a 咦！ close-up is due (one every few hard wins, never with reduced motion) */
  closeupReady?: boolean;
}

const PASS_BUBBLE: Record<WritePass, string> = { trace: '描一描！', hint: '看提示写！', recall: '写一写！' };

export function WritingStep({ word, kid, resting, isNew, pass, onDone, closeupReady = false }: Props) {
  const chars = useMemo(() => hanChars(word.text), [word.id]);
  const cue = useMemo(() => writingCue(word), [word.id]);
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [charMisses, setCharMisses] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const startedAt = useRef(performance.now());
  const hinted = useRef(false);
  const writer = useRef<ReturnType<typeof HanziWriter.create> | null>(null);
  // he nods at each right stroke and reacts when a character is done (spec 2026-10-04 §4.4)
  const reactN = useRef(0);
  const [react, setReact] = useState<Reaction | null>(null);
  const fire = (kind: Reaction['kind']) => setReact({ kind, key: ++reactN.current });
  /** The 田字格 size for the stage card it sits in, below the cue and dots (spec 2026-10-04 §3): measured from where the box starts. */
  const boxSize = (el: HTMLElement) => {
    const card = el.closest('.stage__card') as HTMLElement | null;
    return writingBoxFor({ width: card?.clientWidth ?? window.innerWidth, height: card?.clientHeight ?? window.innerHeight }, el.offsetTop);
  };
  // a rotated iPad: the box re-fits in place, keeping the strokes he has drawn
  useEffect(() => {
    const onResize = () => {
      const el = host.current;
      if (!el || !writer.current) return;
      const size = boxSize(el);
      writer.current.updateDimensions({ width: size, height: size });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    speak(cue.speech);
  }, [word.id]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = '';
    setCharMisses(null);
    let cancelled = false;
    const size = boxSize(el);
    const hw = HanziWriter.create(el, chars[index]!, {
      width: size,
      height: size,
      padding: 16,
      showCharacter: false,
      showOutline: pass === 'trace',
      showHintAfterMisses: pass === 'recall' ? 2 : 1,
      highlightOnComplete: true,
      drawingWidth: 24,
      strokeColor: '#2d3436',
      charDataLoader: (ch, onLoad, onError) => {
        loadStrokeData(ch).then((data) => onLoad(data as never), onError);
      },
      onLoadCharDataError: () => {
        if (!cancelled) onDone(null);
      },
    });
    writer.current = hw;
    if (pass === 'hint') hw.highlightStroke(0); // the first stroke shows the way
    void hw.quiz({
      onCorrectStroke: () => {
        if (!cancelled) fire('nod');
      },
      onMistake: (d) => {
        if (pass === 'recall' && d.mistakesOnStroke >= 2) hinted.current = true;
      },
      onComplete: (summary) => {
        if (cancelled) return;
        playSfx('star');
        const r = host.current?.getBoundingClientRect();
        if (r) burst(r.left + r.width / 2, r.top + r.height / 2, { count: summary.totalMistakes === 0 ? 14 : 8 });
        setMisses((m) => m + summary.totalMistakes);
        setCharMisses(summary.totalMistakes);
        // a new word finished from memory with no misses is the hard moment; misses counts the characters before this one
        fire(pass === 'recall' && index === chars.length - 1 && isHardWrite(isNew, misses + summary.totalMistakes) ? 'hard' : 'right');
      },
    });
    return () => {
      cancelled = true;
      hw.cancelQuiz();
      writer.current = null;
    };
  }, [word.id, index, pass]);

  const last = index === chars.length - 1;
  const showCloseup = closeupReady && pass === 'recall' && last && charMisses !== null && isHardWrite(isNew, misses);
  const next = () => {
    if (!last) setIndex(index + 1);
    else onDone({ totalMisses: misses, hinted: hinted.current, elapsedMs: Math.round(performance.now() - startedAt.current) });
  };
  return (
    <>
      <Stage
        activity="write"
        truffle={
          <Pet
            kid={kid}
            size={180}
            mood={charMisses === null ? resting : charMisses > 3 ? 'neutral' : last && isHardWrite(isNew, misses) ? 'wow' : 'pleased'}
            bubble={charMisses === null ? PASS_BUBBLE[pass] : null}
            calm={charMisses === null}
            react={react}
          />
        }
        sheet={charMisses === null ? (
          <FeedbackSheet actionLabel={last ? '完成' : '下一个字'} disabled onAction={() => {}} />
        ) : (
          <FeedbackSheet tone="good" title={charMisses === 0 ? '完美！' : '写得好！'} actionLabel={last ? '完成' : '下一个字'} onAction={next} />
        )}
      >
        <div class="write__cue">
          <div class="write__prompt">
            <span class="pinyin">{word.pinyin}</span>
            <SpeakButton text={cue.speech} />
          </div>
          {cue.sentence && (
            <>
              <p class="sr-only" lang="zh">{spokenBlanks(cue.sentence)}</p>
              <div class="write__sentence hanzi" lang="zh" aria-hidden="true">{cue.sentence}</div>
            </>
          )}
          {cue.blanked && <div class="write__blank"><Label zh={cue.blanked} py={cue.blankedPy ?? undefined} /></div>}
        </div>
        <div class="dots">
          {chars.map((c, i) => (
            <span key={`${c}${i}`} class={`dot ${i < index || (i === index && charMisses !== null) ? 'is-done' : ''}`} />
          ))}
        </div>
        <div ref={host} class="tianzige" />
      </Stage>
      {showCloseup && <Closeup kid={kid} />}
    </>
  );
}
