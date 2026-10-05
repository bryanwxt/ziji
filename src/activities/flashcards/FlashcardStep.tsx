import { pinyin } from 'pinyin-pro';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import '../../content/pinyinFixes';
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
  /** a word he missed is back: Truffle covers his eyes and peeks (spec 2026-10-04 §4.6) */
  peek?: boolean;
}

type Phase = 'intro' | 'quiz' | 'feedback';

export function FlashcardStep({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, ask, reintroOnMiss = false, idiom = null, peek = false }: Props) {
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
  const againAt = useRef(0); // when the card came back after a miss: a double tap on 继续 must not skip it (sweep)
  const [result, setResult] = useState<{ correct: boolean; hard: boolean; responseMs: number } | null>(null);
  const shownAt = useRef(performance.now());
  // what he reacts to (spec 2026-10-04 §4.4): a new word when it is shown, then each answer
  const reactN = useRef(0);
  // a new word surprises him; a word he missed coming back makes him cover his eyes and peek (spec 2026-10-04 §4.6)
  const [react, setReact] = useState<Reaction | null>(() => (item.isNew && !item.retry ? { kind: 'newWord', key: ++reactN.current } : peek ? { kind: 'peek', key: ++reactN.current } : null));
  const quizAt = useRef(performance.now());
  const petRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (phase === 'intro') {
      speak(word.text, { reading: word.pinyin });
      // then every 词语 and the 成语 the card shows, in order, each after the last (parent, 2026-10-05: only the first was read)
      for (const text of introSpoken(word, idiom)) speak(text, { queue: true });
    }
    if (phase === 'quiz') {
      quizAt.current = performance.now();
      // A class sentence is read around its blank: saying the word would give the answer away (its choices don't share its sound).
      if (quiz.cue) speak(quiz.cue.kind === 'sentence' ? `${quiz.cue.before}，，${quiz.cue.after}` : quiz.cue.full);
      else if (quiz.listen) speak(word.text, { reading: word.pinyin });
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
    else if (!quiz.listen || !correct) speak(word.text, { reading: word.pinyin });
  };

  const optionState = (o: string) => {
    if (phase !== 'feedback') return '';
    if (o === quiz.answer) return o === choice ? 'is-eaten' : 'is-answer';
    return o === choice ? 'is-wrong' : 'is-dim';
  };

  const reaction = phase === 'feedback' && result ? reactionMood({ correct: result.correct, hard: result.hard, combo: result.correct ? combo + 1 : 0 }) : null;
  // his reaction is a beat in the rig (REACTIONS[kind].holdMs), then he rests on his own mood while the answer stays up
  const mood: TruffleMood = phase === 'intro' ? 'neutral' : resting;
  const REACTION_LINES: Partial<Record<TruffleMood, string>> = { side: '记住它！', wow: '咦！好厉害！', content: '呼噜～' };
  const bubble = phase === 'intro' ? (again ? '再看一遍！' : '新字来了！') : phase === 'quiz' ? (quiz.cue ? '哪个字对？' : quiz.listen ? '听一听，我想吃哪个字？' : '这个字怎么读？') : (reaction && REACTION_LINES[reaction]) ?? null;
  const showCloseup = phase === 'feedback' && !!result?.correct && result.hard && closeupReady;
  const next = () => {
    if (result) onDone({ ...result, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: quiz.cue?.kind === 'sentence', asked: quiz.cue ? 'meaning' : 'read', picked: choice ?? undefined });
  };  // 认新字: a miss shows the card again before he moves on; the word comes first in 练一练 too
  const proceed = () => {
    if (reintroOnMiss && result && !result.correct && !again) {
      setAgain(true);
      againAt.current = performance.now(); // the page clock: a wall clock can stand still or jump
      setPhase('intro');
    } else next();
  };


  const sheet =
    phase === 'intro' ? <FeedbackSheet actionLabel="我记住了！" onAction={() => (again ? (performance.now() - againAt.current >= 600 ? next() : undefined) : setPhase('quiz'))} />
    : phase === 'quiz' ? <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
    : result ? (
        <FeedbackSheet
          tone={result.correct ? 'good' : 'oops'}
          title={result.correct ? quiz.cheer : quiz.comfort}
          detail={result.correct ? undefined : (
            <>
              <MeaningNote answerLabel="正确答案：" right={quiz.cue ? quiz.cue.full : word.text} rightPinyin={quiz.cue ? quiz.cue.pinyin : word.pinyin} picked={quiz.cue ? quiz.cue.before + (choice ?? '') + quiz.cue.after : quiz.listen ? choice : null} />
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
                    // like every line on the card: each syllable over its character, the gap a dashed box with its sound over it (parent, 2026-10-05)
                    <div class="meaning-cue meaning-cue--sentence meaning-cue--short meaning-cue--word" lang="zh" data-q style={`--len:${Array.from(quiz.cue.full).length}`}>
                      <Label zh={`${quiz.cue.before}${phase === 'feedback' ? word.text : '＿'.repeat(Array.from(word.text).length)}${quiz.cue.after}`} py={quiz.cue.pinyin} />
                    </div>
                  )}
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

/** A centred sentence whose closing 。！？ hangs past its edge, so the words, not the punctuation, sit on the centre line (parent, 2026-10-05). */
function CentredSentence({ text }: { text: string }) {
  const m = text.match(/^(.*?)([。！？!?.]+)$/u);
  if (!m) return <>{text}</>;
  return <>{m[1]}<span class="hang">{m[2]}</span></>;
}

/**
 * One line of Chinese on a card, the same everywhere (parent, 2026-10-05): each syllable over its own character, a small speak
 * button to its right, its English underneath.
 */
function WordRow({ zh, py, en, mark, class: cls, textClass }: { zh: string; py?: string; en?: string | null; mark?: [number, number]; class: string; textClass?: string }) {
  return (
    <div class={`word-row ${cls}`} lang="zh">
      <div class="word-row__line">
        <span class={`hanzi word-row__zh${textClass ? ` ${textClass}` : ''}`}><Label zh={zh} py={py} mark={mark} /></span>
        <SpeakButton text={zh} small />
      </div>
      {en && <p class="word-row__en" lang="en">{en}</p>}
    </div>
  );
}

/** Where the new word sits in a 词语 or 成语, to pick it out like the usage line does (parent, 2026-10-05: only one row was). */
function markOf(text: string, target: string): [number, number] | undefined {
  const at = text.indexOf(target);
  return at < 0 ? undefined : [hanChars(text.slice(0, at)).length, hanChars(target).length];
}

/** The usage line's syllables: the word's own reading where it sits, the rest read in context. */
function usagePinyin(word: Word, line: NonNullable<ReturnType<typeof usageLine>>): string {
  if (line.isWord) return line.pinyin;
  const syl = pinyin(line.full, { type: 'all' }).filter((d) => d.isZh).map((d) => d.pinyin);
  const own = line.pinyin.trim().split(/\s+/);
  if (own.length === hanChars(word.text).length) own.forEach((p, i) => { syl[hanChars(line.before).length + i] = p; });
  return syl.join(' ');
}

/** The word in use, highlighted, with a speak button (spec §20 part 1). Read aloud only when tapped, so reviews keep their pace. */
function UsageLine({ word, en }: { word: Word; en?: string | null }) {
  const line = usageLine(word);
  if (!line) return null;
  return <WordRow class="usage" textClass="usage__text" zh={line.full} py={usagePinyin(word, line)} mark={[hanChars(line.before).length, hanChars(word.text).length]} en={en} />;
}

/**
 * How many 组词 the 认新字 card lists besides its usage line: always two 词语 rows in all (parent, 2026-10-05: one card showed
 * one and another two) — the usage line and one more, or two without a line — then its 成语 when it has one.
 */
function extraWords(line: ReturnType<typeof usageLine>, _idiom?: Idiom | null): number {
  return line ? 1 : 2;
}

/** The lines the 认新字 card reads after its character: the usage line, the listed 组词, then its 成语 when it shows one. */
export function introSpoken(word: Word, idiom: Idiom | null): string[] {
  const line = usageLine(word);
  const listed = (word.examples ?? []).filter((e) => !line?.full.includes(e.text)).slice(0, extraWords(line, idiom)).map((e) => e.text);
  const shownIdiom = idiom && !shownOnCard(word).some((t) => t.includes(idiom.text)) ? [idiom.text] : [];
  return [...(line ? [line.full] : []), ...listed, ...shownIdiom];
}

/** What the 认新字 card shows beside a 成语: its usage line and the 组词 listed with it (a 成语 can be either: 八's is 四面八方). */
export function shownOnCard(word: Word): string[] {
  const line = usageLine(word);
  const listed = (word.examples ?? []).filter((e) => !line?.full.includes(e.text)).slice(0, extraWords(line, {} as Idiom)).map((e) => e.text);
  return [line?.full, ...listed].filter((t): t is string => !!t);
}

/** The card's 成语: the first one the card doesn't already show, so nothing is shown twice (parent, 2026-10-05: 四面八方 twice on 八). */
export function introIdiom(word: Word, idioms: Idiom[]): Idiom | null {
  const shown = shownOnCard(word);
  return idioms.find((i) => !shown.some((t) => t.includes(i.text))) ?? null;
}

function Intro({ word, idiom }: { word: Word; idiom: Idiom | null }) {
  const line = usageLine(word);
  const long = Array.from(word.text).length > 1;
  // never the one the usage line already shows; all of them feed the meaning questions
  const listed = (word.examples ?? []).filter((e) => !line?.full.includes(e.text)).slice(0, extraWords(line, idiom));
  return (
    <div class="intro">
      <div class={`intro__card${idiom ? ' intro__card--idiom' : ''}`}>
        <div class="intro__head">
          <div class="intro__char">
            <div class="pinyin">{word.pinyin}</div>
            {/* a school 成语 or 词语 shrinks to one line (final review I3) */}
            <div class={`hanzi hanzi--xl${long ? ' hanzi--long' : ''}`} style={long ? `--len:${Array.from(word.text).length}` : undefined}>{word.text}</div>
            <SpeakButton text={word.text} />
          </div>
        </div>
        {cardMeaning(word) && <p class="intro__en" lang="en">{cardMeaning(word)}</p>}
        {hanChars(word.text).length <= 2 && hanChars(word.text).map((ch) => { // a 成语's four characters' parts would crowd the card
          const info = getCharInfo(ch);
          const parts = info?.components ?? [];
          // only parts that teach something: a radical with a meaning (亻 person, 氵 water). Fragments like 夕's 勹 + 丶
          // mean nothing to a young child and only crowd the card (parent, 2026-10-05)
          if (!info || parts.length < 2 || !parts.some((p) => p === info.radical && radicalMeaning(p))) return null;
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
        {/* soft groups (parent, 2026-10-05: "a bit busy"): the character above, then its 词语, then its 成语 */}
        {(line || listed.length > 0) && (
          <div class="intro__group">
            {line && <UsageLine word={word} en={glossFor(line.full)} />}
            {listed.map((e) => <WordRow key={e.text} class="example" zh={e.text} py={e.pinyin} en={glossFor(e.text)} mark={markOf(e.text, word.text)} />)}
          </div>
        )}
        {idiom && !shownOnCard(word).some((t) => t.includes(idiom.text)) && ( // the 组词 first, then the 成语 (parent, 2026-10-05: a card showed only a 成语); never one it already shows
          <div class="intro__group intro__idiom">
            <WordRow class="example example--idiom" zh={idiom.text} py={idiom.pinyin} en={idiom.meaning} mark={markOf(idiom.text, word.text)} />
            {idiom.sentences[0] && <p class="intro__idiom-sentence hanzi"><CentredSentence text={idiom.sentences[0]} /></p>}
          </div>
        )}
      </div>
    </div>
  );
}
