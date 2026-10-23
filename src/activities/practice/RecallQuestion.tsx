// 默写 in 练一练 (real test spec 2026-10-23 §4): he hears the 组词 (「草，草地的，草」), sees it with the character gapped (＿地),
// and writes the character from memory: no outline, no pinyin of the target, a hint (the stroke shown) only after 2 misses on it.
import HanziWriter from 'hanzi-writer';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { hanChars } from '../../content';
import { loadStrokeData } from '../../content/strokes';
import { recallRight } from '../../session/writeCredit';
import type { KidState, Word } from '../../types';
import { Label, spokenBlanks } from '../../ui/Label';
import { burst } from '../../ui/motion';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import type { Reaction } from '../../ui/truffle/timelines';
import { writingCue } from '../writing/cue';
import { writingBoxFor } from '../writing/size';

export interface RecallResult { totalMisses: number; hinted: boolean; elapsedMs: number }

interface Props {
  word: Word;
  at: number; // the character of the word he writes, in Han characters
  kid: KidState;
  onDone: (r: RecallResult | null) => void; // null: its strokes couldn't load (the question it replaced is asked instead)
}

export function RecallQuestion({ word, at, kid, onDone }: Props) {
  const ch = hanChars(word.text)[at] ?? word.text;
  const cue = useMemo(() => writingCue(word, at), [word.id, at]);
  const host = useRef<HTMLDivElement>(null);
  const writer = useRef<ReturnType<typeof HanziWriter.create> | null>(null);
  const startedAt = useRef(performance.now());
  const hinted = useRef(false);
  const [result, setResult] = useState<{ totalMisses: number; hinted: boolean } | null>(null);
  const reactN = useRef(0);
  const [react, setReact] = useState<Reaction | null>(null);
  const fire = (kind: Reaction['kind']) => setReact({ kind, key: ++reactN.current });
  const boxSize = (el: HTMLElement) => {
    const card = el.closest('.stage__card') as HTMLElement | null;
    return writingBoxFor({ width: card?.clientWidth ?? window.innerWidth, height: card?.clientHeight ?? window.innerHeight }, el.offsetTop);
  };
  useEffect(() => {
    speak(cue.speech, { reading: word.pinyin }); // its lone pieces at the card's reading, as 写一写 says them
  }, [word.id]);
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
    const el = host.current;
    if (!el) return;
    el.innerHTML = '';
    let cancelled = false;
    const size = boxSize(el);
    const hw = HanziWriter.create(el, ch, {
      width: size, height: size, padding: 16, showCharacter: false, showOutline: false, showHintAfterMisses: 2,
      highlightOnComplete: true, drawingWidth: 24, strokeColor: '#2d3436',
      charDataLoader: (c, onLoad, onError) => {
        loadStrokeData(c).then((data) => onLoad(data as never), onError);
      },
      onLoadCharDataError: () => {
        if (!cancelled) onDone(null);
      },
    });
    writer.current = hw;
    void hw.quiz({
      onCorrectStroke: () => {
        if (!cancelled) fire('nod');
      },
      onMistake: (d) => {
        if (d.mistakesOnStroke >= 2) hinted.current = true; // the hint shows now: a hinted answer is not right
      },
      onComplete: (summary) => {
        if (cancelled) return;
        const r = { totalMisses: summary.totalMistakes, hinted: hinted.current };
        const right = recallRight(r);
        playSfx(right ? 'star' : 'wrong');
        const box = host.current?.getBoundingClientRect();
        if (right && box) burst(box.left + box.width / 2, box.top + box.height / 2, { count: 12 });
        setResult(r);
        fire(right ? 'right' : 'wrong');
      },
    });
    return () => {
      cancelled = true;
      hw.cancelQuiz();
      writer.current = null;
    };
  }, [word.id, at]);

  const right = !!result && recallRight(result);
  const finish = () => {
    if (result) onDone({ ...result, elapsedMs: Math.round(performance.now() - startedAt.current) });
  };
  return (
    <Stage
      activity="write"
      truffle={<Pet kid={kid} size={180} mood={result ? (right ? 'pleased' : 'neutral') : 'neutral'} bubble={result ? null : '听一听，写出来！'} calm={!result} react={react} />}
      sheet={result ? <FeedbackSheet tone={right ? 'good' : 'neutral'} title={right ? '写对了！' : '记住它的样子！'} actionLabel="继续" onAction={finish} /> : <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />}
    >
      <div class="write__cue recall__cue">
        {/* the 组词 with its gap, the gap's own pinyin left out: the sound is the clue, said by the speaker (§4) */}
        {/* the speaker hangs beside the gapped line: the 组词, else the sentence (an empty line would leave it above the card) */}
        {cue.blanked && <div class="word-row__line write__blank"><Label zh={cue.blanked} fade /><SpeakButton text={cue.speech} reading={word.pinyin} small /></div>}
        {cue.sentence && (
          <>
            <p class="sr-only" lang="zh">{spokenBlanks(cue.sentence)}</p>
            <div class="word-row__line"><div class="write__sentence hanzi" lang="zh" aria-hidden="true">{cue.sentence}</div>{!cue.blanked && <SpeakButton text={cue.speech} reading={word.pinyin} small />}</div>
          </>
        )}
      </div>
      <div ref={host} class="tianzige" />
    </Stage>
  );
}
