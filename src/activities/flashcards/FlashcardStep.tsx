import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { getCharInfo, hanChars } from '../../content';
import { radicalMeaning } from '../../content/radicals';
import { CHEERS, COMFORTS, pickLine } from '../../fun/pet';
import { mulberry32, shuffle } from '../../lib/random';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Label } from '../../ui/Label';
import { burst, flyAlong } from '../../ui/motion';
import type { CardRecord, FlashItem, KidState, Word } from '../../types';
import { Closeup } from '../../app/Closeup';
import { isHardRecognition, reactionMood } from '../../fun/mood';
import { Pet } from '../../ui/Pet';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import type { Reaction } from '../../ui/truffle/timelines';
import { SpeakButton } from '../../ui/SpeakButton';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { pickCharacterDistractors, pickPinyinDistractors } from './distractors';
import { cardMeaning, glossFor } from '../../content/glossary';
import { meaningCue, pickSoundAlikes, usageLine, wordCue, type MeaningCue } from './meaning';
import { InkIcon } from '../../ui/icons/InkIcon';
import { pinyin } from 'pinyin-pro';
import type { Idiom } from '../../content/chengyu';

export interface FlashResult {
  correct: boolean;
  hard: boolean;
  responseMs: number;
  elapsedMs: number;
  inContext: boolean; // a meaning question on a sentence (spec §20 part 7)
  asked: 'read' | 'meaning'; // what was really asked: a meaning item with no cue falls back to reading
  picked?: string; // the option he chose (钓鱼 remembers a look-alike, spec 2026-10-05 §3.4)
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
  /** what 认新字 or 练一练 asks (spec 2026-10-05 §3.2): read (pinyin), listen (find the character), word (the 组词 gap). Without it the card decides, as before. */
  ask?: 'read' | 'listen' | 'word';
  /** 认新字: after a miss the card shows again before moving on (spec 2026-10-05 §2.1) */
  reintroOnMiss?: boolean;
  /** 认新字: a 成语 that uses the word, at his level or one up (spec 2026-10-05 §2.1, §4) */
  idiom?: Idiom | null;
}

type Phase = 'intro' | 'quiz' | 'feedback';

export function FlashcardStep({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, ask, reintroOnMiss = false, idiom = null }: Props) {
  const quiz = useMemo((): { listen: boolean; cue: MeaningCue | null; answer: string; options: string[]; cheer: string; comfort: string } => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    // Meaning: which character fits its 组词 word (same-sound choices). Without a cue it falls back to reading.
    const cue = ask === 'word' ? wordCue(word) : ask ? null : item.mode === 'meaning' ? meaningCue(word) : null;
    if (cue) {
      return { listen: false, cue, answer: word.text, options: shuffle([word.text, ...(cue.wrong ?? pickSoundAlikes(word, cue, pool, rng))], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) };
    }
    const lookAlikes = pickCharacterDistractors(word, pool, rng);
    const listen = voice && lookAlikes.length >= 3 && (ask ? ask === 'listen' : (card?.fsrs.reps ?? 0) % 2 === 0);
    const answer = listen ? word.text : word.pinyin;
    const wrong = listen ? lookAlikes.map((w) => w.text) : pickPinyinDistractors(word, pool, rng);
    return { listen, cue: null, answer, options: shuffle([answer, ...wrong], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng) };
  }, [word.id]);
  const [phase, setPhase] = useState<Phase>(item.isNew && !item.retry ? 'intro' : 'quiz');
  const [choice, setChoice] = useState<string | null>(null);
  const [again, setAgain] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; hard: boolean; responseMs: number } | null>(null);
  const shownAt = useRef(performance.now());
  // what he reacts to (spec 2026-10-04 §4.4): a new word when it is shown, then each answer
  const reactN = useRef(0);
  const [react, setReact] = useState<Reaction | null>(() => (item.isNew && !item.retry ? { kind: 'newWord', key: ++reactN.current } : null));
  const quizAt = useRef(performance.now());
  const petRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (phase === 'intro') {
      speak(word.text);
      const line = usageLine(word);
      if (line) speak(line.full, { queue: true }); // after the character, not over it (spec §20 part 1)
    }
    if (phase === 'quiz') {
      quizAt.current = performance.now();
      // A class sentence is read around its blank: saying the word would give the answer away (its choices don't share its sound).
      if (quiz.cue) speak(quiz.cue.kind === 'sentence' ? `${quiz.cue.before}，，${quiz.cue.after}` : quiz.cue.full);
      else if (quiz.listen) speak(word.text);
    }
  }, [phase]);

  const choose = (option: string) => {
    if (phase !== 'quiz') return;
    const correct = option === quiz.answer;
    setChoice(option);
    const hard = isHardRecognition(card?.fsrs);
    setResult({ correct, hard, responseMs: Math.round(performance.now() - quizAt.current) });
    setReact({ kind: !correct ? 'wrong' : hard ? 'hard' : combo + 1 >= 3 ? 'streak' : 'right', key: ++reactN.current });
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
  // his reaction is a beat in the rig (REACTIONS[kind].holdMs), then he rests on his own mood while the answer stays up
  const mood: TruffleMood = phase === 'intro' ? 'neutral' : resting;
  const REACTION_LINES: Partial<Record<TruffleMood, string>> = { side: '记住它！', wow: '咦！好厉害', content: '呼噜～' };
  const bubble = phase === 'intro' ? '新字来了！' : phase === 'quiz' ? (quiz.cue ? '哪个字对？' : quiz.listen ? '我想吃这个字！' : '这个字怎么读？') : (reaction && REACTION_LINES[reaction]) ?? null;
  const showCloseup = phase === 'feedback' && !!result?.correct && result.hard && closeupReady;
  const next = () => {
    if (result) onDone({ ...result, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: quiz.cue?.kind === 'sentence', asked: quiz.cue ? 'meaning' : 'read', picked: choice ?? undefined });
  };  // 认新字: a miss shows the card again before he moves on; the word comes first in 练一练 too
  const proceed = () => {
    if (reintroOnMiss && result && !result.correct && !again) {
      setAgain(true);
      setPhase('intro');
    } else next();
  };


  const sheet =
    phase === 'intro' ? <FeedbackSheet actionLabel="我记住了！" onAction={() => (again ? next() : setPhase('quiz'))} />
    : phase === 'quiz' ? <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
    : result ? (
        <FeedbackSheet
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? quiz.cheer : quiz.comfort}
          detail={result.correct ? undefined : (
            <>
              正确答案：<span class="hanzi">{quiz.cue ? quiz.cue.full : word.text}</span>
              <span>{quiz.cue ? quiz.cue.pinyin : word.pinyin}</span>
              <SpeakButton text={quiz.cue ? quiz.cue.full : word.text} />
              <MeaningNote right={quiz.cue ? quiz.cue.full : word.text} picked={quiz.cue ? quiz.cue.before + (choice ?? '') + quiz.cue.after : quiz.listen ? choice : null} />
            </>
          )}
          actionLabel="继续"
          onAction={proceed}
        />
      ) : null;
  return (
    <>
      <Stage
        activity="flash"
        truffle={<div ref={petRef}><Pet kid={kid} mood={mood} bubble={bubble} size={180} lookAt={phase === 'quiz' ? 0.8 : 0} calm={phase === 'quiz'} react={react} /></div>}
        sheet={sheet}
      >
        {phase === 'intro' ? <Intro word={word} idiom={idiom} /> : (
          <>
            <div class="flash__prompt">
              {quiz.cue ? (
                <div class="meaning-prompt">
                  {quiz.cue.kind === 'sentence' ? (
                    <div class={`meaning-cue meaning-cue--sentence${Array.from(quiz.cue.full).length <= 4 ? ' meaning-cue--short' : ''}`} lang="zh" data-q={Array.from(quiz.cue.full).length <= 4 || undefined} style={`--len:${Array.from(quiz.cue.full).length}`}>
                      <Label zh={`${quiz.cue.before}${phase === 'feedback' ? word.text : '＿'.repeat(Array.from(word.text).length)}${quiz.cue.after}`} />
                      <SpeakButton text={phase === 'feedback' ? quiz.cue.full : `${quiz.cue.before}，，${quiz.cue.after}`} />
                    </div>
                  ) : (
                    <div class="hanzi meaning-cue" lang="zh" data-q style={`--len:${Array.from(quiz.cue.full).length}`}>
                      {quiz.cue.before}
                      <span class="meaning-cue__blank" aria-label="空格">{phase === 'feedback' ? word.text : '？'}</span>
                      {quiz.cue.after}
                    </div>
                  )}
                  {quiz.cue.kind === 'word' && <div class="pinyin">{quiz.cue.pinyin}</div>}
                </div>
              ) : (
                <>
                  {quiz.listen ? <SpeakButton text={word.text} big /> : <div class="hanzi hanzi--q" data-q>{word.text}</div>}
                  {phase === 'feedback' && <UsageLine word={word} />}
                </>
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
      </Stage>
      {showCloseup && <Closeup kid={kid} />}
    </>
  );
}

/** The word in use, highlighted, with a speak button (spec §20 part 1). Read aloud only when tapped, so reviews keep their pace. */
function UsageLine({ word }: { word: Word }) {
  const line = usageLine(word);
  if (!line) return null;
  return (
    <div class="usage" lang="zh">
      <span class="hanzi usage__text">{line.before}<mark class="usage__word">{word.text}</mark>{line.after}</span>
      {line.pinyin && <span class="pinyin">{line.pinyin}</span>}
      <SpeakButton text={line.full} />
    </div>
  );
}

function Intro({ word, idiom }: { word: Word; idiom: Idiom | null }) {
  const line = usageLine(word);
  return (
    <div class="intro">
      <div class={`intro__card${idiom ? ' intro__card--idiom' : ''}`}>
        <div class="pinyin">{word.pinyin}</div>
        <div class="hanzi hanzi--xl">{word.text}</div>
        <div class="intro__say">
          <SpeakButton text={word.text} />
          {cardMeaning(word) && <p class="intro__en" lang="en">{cardMeaning(word)}</p>}
        </div>
        <UsageLine word={word} />
        {line && glossFor(line.full) && <p class="intro__en intro__en--phrase" lang="en">{glossFor(line.full)}</p>}
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
        {idiom && ( // a 成语 takes the extra 组词's place, so the card still fits a phone (all 组词 still feed the questions)
          <div class="intro__idiom">
            <div class="example example--idiom">
              <span class="idiom-ruby">
                <span class="pinyin">{pinyin(idiom.text)}</span>
                <span class="hanzi">{idiom.text}</span>
              </span>
              <SpeakButton text={idiom.text} />
              {idiom.meaning && <span class="example__en" lang="en">{idiom.meaning}</span>}
            </div>
            {idiom.sentences[0] && <p class="intro__idiom-sentence hanzi">{idiom.sentences[0]}</p>}
          </div>
        )}
        {!idiom && word.examples?.filter((e) => !line?.full.includes(e.text)).slice(0, line ? 1 : 2).map((e) => ( // with their English, one 组词 besides the usage line fits every screen (never the one it already shows); all of them feed the meaning questions
          <div class="example" key={e.text}>
            <span class="pinyin">{e.pinyin}</span>
            <span class="hanzi">{e.text}</span>
            <SpeakButton text={e.text} />
            {glossFor(e.text) && <span class="example__en" lang="en">{glossFor(e.text)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
