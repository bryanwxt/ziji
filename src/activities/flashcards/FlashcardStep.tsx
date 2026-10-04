import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { getCharInfo, hanChars } from '../../content';
import { radicalMeaning } from '../../content/radicals';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32, shuffle } from '../../lib/random';
import { BottomBar } from '../../ui/BottomBar';
import { burst, flyAlong } from '../../ui/motion';
import type { CardRecord, FlashItem, KidState, Word } from '../../types';
import { Closeup } from '../../app/Closeup';
import { isHardRecognition, reactionMood } from '../../fun/mood';
import { Pet } from '../../ui/Pet';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import { SpeakButton } from '../../ui/SpeakButton';
import { pickCharacterDistractors, pickPinyinDistractors } from './distractors';
import { meaningCue, pickSoundAlikes, type MeaningCue } from './meaning';
import { InkIcon } from '../../ui/icons/InkIcon';

export interface FlashResult {
  correct: boolean;
  hard: boolean;
  responseMs: number;
  elapsedMs: number;
}

interface Props {
  item: FlashItem;
  word: Word;
  pool: Word[];
  card?: CardRecord;
  voice: boolean;
  kid: KidState;
  resting: TruffleMood;
  combo: number; // run of right answers before this card
  closeupReady: boolean;
  onDone: (result: FlashResult) => void;
}

type Phase = 'intro' | 'quiz' | 'feedback';

export function FlashcardStep({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone }: Props) {
  const quiz = useMemo((): { listen: boolean; cue: MeaningCue | null; answer: string; options: string[]; cheer: string; comfort: string } => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    // Meaning: which character fits its 组词 word (same-sound choices). Without a cue it falls back to reading.
    const cue = item.mode === 'meaning' ? meaningCue(word) : null;
    if (cue) {
      return { listen: false, cue, answer: word.text, options: shuffle([word.text, ...pickSoundAlikes(word, cue, pool, rng)], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) };
    }
    const lookAlikes = pickCharacterDistractors(word, pool, rng);
    const listen = voice && lookAlikes.length >= 3 && (card?.fsrs.reps ?? 0) % 2 === 0;
    const answer = listen ? word.text : word.pinyin;
    const wrong = listen ? lookAlikes.map((w) => w.text) : pickPinyinDistractors(word, pool, rng);
    return { listen, cue: null, answer, options: shuffle([answer, ...wrong], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) };
  }, [word.id]);
  const [phase, setPhase] = useState<Phase>(item.isNew && !item.retry ? 'intro' : 'quiz');
  const [choice, setChoice] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; hard: boolean; responseMs: number } | null>(null);
  const shownAt = useRef(performance.now());
  const quizAt = useRef(performance.now());
  const petRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (phase === 'intro') speak(word.text);
    if (phase === 'quiz') {
      quizAt.current = performance.now();
      if (quiz.cue) speak(quiz.cue.full);
      else if (quiz.listen) speak(word.text);
    }
  }, [phase]);

  const choose = (option: string) => {
    if (phase !== 'quiz') return;
    const correct = option === quiz.answer;
    setChoice(option);
    setResult({ correct, hard: isHardRecognition(card?.fsrs), responseMs: Math.round(performance.now() - quizAt.current) });
    setPhase('feedback');
    const btn = optionRefs.current.get(option);
    if (correct) {
      playSfx('munch');
      setTimeout(() => playSfx('correct'), 250);
      if (btn) {
        const r = btn.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
        const p = petRef.current?.getBoundingClientRect();
        if (p) void flyAlong(btn, { x: p.left + p.width / 2, y: p.top + p.height * 0.6 }, { endScale: 0.2, fade: true });
      }
    } else {
      playSfx('wrong');
    }
    if (quiz.cue) speak(quiz.cue.full);
    else if (!quiz.listen || !correct) speak(word.text);
  };

  const optionState = (o: string) => {
    if (phase !== 'feedback') return '';
    if (o === quiz.answer) return o === choice ? 'is-eaten' : 'is-answer';
    return o === choice ? 'is-wrong' : 'is-dim';
  };

  const reaction = phase === 'feedback' && result ? reactionMood({ correct: result.correct, hard: result.hard, combo: result.correct ? combo + 1 : 0 }) : null;
  const mood: TruffleMood = phase === 'intro' ? 'neutral' : (reaction ?? resting);
  const REACTION_LINES: Partial<Record<TruffleMood, string>> = { side: '记住它！', wow: '咦！好厉害', content: '呼噜～' };
  const bubble = phase === 'intro' ? '新字来了！' : phase === 'quiz' ? (quiz.cue ? '哪个字对？' : quiz.listen ? '我想吃这个字！' : '这个字怎么读？') : (reaction && REACTION_LINES[reaction]) ?? null;
  const showCloseup = phase === 'feedback' && !!result?.correct && result.hard && closeupReady;
  const next = () => {
    if (result) onDone({ ...result, elapsedMs: Math.round(performance.now() - shownAt.current) });
  };

  return (
    <>
      <div class="flash">
        <div class="flash__pet" ref={petRef}>
          <Pet kid={kid} mood={mood} bubble={bubble} size={180} lookAt={phase === 'quiz' ? 0.8 : 0} bounce={phase === 'feedback' && !!result?.correct} />
        </div>
        <div class="flash__main">
          {phase === 'intro' ? (
            <Intro word={word} />
          ) : (
            <>
              <div class="flash__prompt">
                {quiz.cue ? (
                  <div class="meaning-prompt">
                    <div class="hanzi meaning-cue" lang="zh">
                      {quiz.cue.before}
                      <span class="meaning-cue__blank" aria-label="空格">{phase === 'feedback' ? word.text : '？'}</span>
                      {quiz.cue.after}
                    </div>
                    <div class="pinyin">{quiz.cue.pinyin}</div>
                  </div>
                ) : quiz.listen ? (
                  <SpeakButton text={word.text} big />
                ) : (
                  <div class="hanzi hanzi--xl">{word.text}</div>
                )}
              </div>
              <div class={`choices stagger ${quiz.listen || quiz.cue ? 'choices--hanzi' : 'choices--pinyin'}`}>
                {quiz.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    class={`choice press ${optionState(o)}`}
                    disabled={phase === 'feedback'}
                    onClick={() => choose(o)}
                    ref={(el) => {
                      if (el) optionRefs.current.set(o, el);
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {showCloseup && <Closeup kid={kid} />}
      {phase === 'intro' && <BottomBar actionLabel="我记住了！" onAction={() => setPhase('quiz')} />}
      {phase === 'quiz' && <BottomBar actionLabel="继续" disabled onAction={() => {}} />}
      {phase === 'feedback' && result && (
        <BottomBar
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? quiz.cheer : quiz.comfort}
          detail={
            result.correct ? undefined : (
              <>
                正确答案：<span class="hanzi">{quiz.cue ? quiz.cue.full : word.text}</span>
                <span>{quiz.cue ? quiz.cue.pinyin : word.pinyin}</span>
                <SpeakButton text={quiz.cue ? quiz.cue.full : word.text} />
              </>
            )
          }
          actionLabel="继续"
          onAction={next}
        />
      )}
    </>
  );
}

function Intro({ word }: { word: Word }) {
  return (
    <div class="intro">
      <div class="intro__card">
        <div class="pinyin">{word.pinyin}</div>
        <div class="hanzi hanzi--xl">{word.text}</div>
        <SpeakButton text={word.text} />
        {hanChars(word.text).map((ch) => {
          const info = getCharInfo(ch);
          const parts = info?.components ?? [];
          if (!info || parts.length < 2) return null;
          return (
            <div class="parts" key={ch}>
              {parts.map((p, i) => {
                const m = p === info.radical ? radicalMeaning(p) : undefined;
                return (
                  <span key={p} class={m ? 'part--radical' : ''}>
                    {i > 0 ? '+ ' : ''}
                    {p}
                    {m ? <> <InkIcon name={m.icon} size={24} /></> : ''}
                  </span>
                );
              })}
            </div>
          );
        })}
        {word.examples?.slice(0, 2).map((e) => ( // two 组词 fit every screen; all of them feed the meaning questions
          <div class="example" key={e.text}>
            <span class="pinyin">{e.pinyin}</span>
            <span class="hanzi">{e.text}</span>
            <SpeakButton text={e.text} />
          </div>
        ))}
      </div>
    </div>
  );
}
