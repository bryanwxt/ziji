import HanziWriter from 'hanzi-writer';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { hanChars } from '../../content';
import { loadStrokeData } from '../../content/strokes';
import type { KidState, Word } from '../../types';
import { BottomBar } from '../../ui/BottomBar';
import { burst } from '../../ui/motion';
import { isHardWrite } from '../../fun/mood';
import { Closeup } from '../../app/Closeup';
import { Pet } from '../../ui/Pet';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import { Label, spokenBlanks } from '../../ui/Label';
import { SpeakButton } from '../../ui/SpeakButton';
import { writingCue } from './cue';
import { writingBoxSize } from './size';
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

  useEffect(() => {
    speak(cue.speech);
  }, [word.id]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = '';
    setCharMisses(null);
    let cancelled = false;
    const size = writingBoxSize(window.innerWidth, window.innerHeight, !!cue.sentence);
    const writer = HanziWriter.create(el, chars[index]!, {
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
    if (pass === 'hint') writer.highlightStroke(0); // the first stroke shows the way
    void writer.quiz({
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
      },
    });
    return () => {
      cancelled = true;
      writer.cancelQuiz();
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
      <div class="write">
        <div class="row write__head">
          <Pet
            kid={kid}
            size={130}
            mood={charMisses === null ? resting : charMisses > 3 ? 'neutral' : last && isHardWrite(isNew, misses) ? 'wow' : 'pleased'}
            bubble={charMisses === null ? PASS_BUBBLE[pass] : null}
          />
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
        </div>
        <div class="dots">
          {chars.map((c, i) => (
            <span key={`${c}${i}`} class={`dot ${i < index || (i === index && charMisses !== null) ? 'is-done' : ''}`} />
          ))}
        </div>
        <div ref={host} class="tianzige" />
      </div>
      {charMisses === null ? (
        <BottomBar actionLabel={last ? '完成' : '下一个字'} disabled onAction={() => {}} />
      ) : (
        <BottomBar tone="good" title={charMisses === 0 ? '完美！' : '写得好！'} actionLabel={last ? '完成' : '下一个字'} onAction={next} />
      )}
      {showCloseup && <Closeup kid={kid} />}
    </>
  );
}
