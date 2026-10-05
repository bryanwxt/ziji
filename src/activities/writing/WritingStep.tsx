import HanziWriter from 'hanzi-writer';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { hanChars } from '../../content';
import { pinyin } from 'pinyin-pro';
import { syllableTone } from '../flashcards/tones';
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
  /** write only this character of the word (spec 2026-10-05 §5); without it, every character in turn */
  at?: number;
}

/** One character's reading: its syllable in the word, or its own tone where the word says it lightly (友 in 朋友 → yǒu). */
function charReading(word: Word, at: number): string {
  const syl = word.pinyin.trim().split(/\s+/)[at];
  const ch = hanChars(word.text)[at] ?? '';
  return syl && syllableTone(syl).tone !== 5 ? syl : pinyin(ch);
}

const PASS_BUBBLE: Record<WritePass, string> = { trace: '描一描！', hint: '看提示写！', recall: '写一写！' };

/**
 * Syllables for a 组词 with gaps: the gaps carry the sound he is writing, the other characters theirs as said in that word.
 * `at`: the character of a longer word he is writing now. Undefined (the Label reads it) when they don't line up.
 */
export function gapPinyin(blanked: string, others: string | null, pinyin: string, at: number): string | undefined {
  const rest = others?.trim().split(/\s+/) ?? [];
  const own = pinyin.trim().split(/\s+/);
  const gaps = (blanked.match(/＿/g) ?? []).length;
  const gapSyl = gaps === own.length ? own : gaps === 1 && own[at] ? [own[at]!] : null;
  if (!gapSyl) return others ?? undefined;
  const out: string[] = [];
  let g = 0;
  let r = 0;
  for (const ch of Array.from(blanked)) {
    if (ch === '＿') out.push(gapSyl[g++]!);
    else if (/\p{Script=Han}/u.test(ch)) out.push(rest[r++] ?? '');
  }
  return out.every(Boolean) ? out.join(' ') : others ?? undefined;
}

export function WritingStep({ word, kid, resting, isNew, pass, onDone, closeupReady = false, at }: Props) {
  const chars = useMemo(() => (at === undefined ? hanChars(word.text) : hanChars(word.text).slice(at, at + 1)), [word.id, at]);
  const cue = useMemo(() => writingCue(word, at), [word.id, at]);
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
          {/* centred like every line on a card, the speak button hanging to the right; with a 组词 its gap carries the sound he
              writes, so the pinyin isn't said twice (parent, 2026-10-05) */}
          {cue.blanked ? (
            <div class="word-row__line write__blank"><Label zh={cue.blanked} py={gapPinyin(cue.blanked, cue.blankedPy, word.pinyin, index)} /><SpeakButton text={cue.speech} small /></div>
          ) : (
            <div class="word-row__line write__prompt"><span class="pinyin">{at === undefined ? word.pinyin : charReading(word, at)}</span><SpeakButton text={cue.speech} small /></div>
          )}
          {cue.sentence && (
            <>
              <p class="sr-only" lang="zh">{spokenBlanks(cue.sentence)}</p>
              <div class="write__sentence hanzi" lang="zh" aria-hidden="true">{cue.sentence}</div>
            </>
          )}
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
