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
import { BoundWord } from '../../ui/BoundWord';
import { MeaningNote } from '../../ui/stage/MeaningNote';
import { LookAlikeWhy, PinyinWhy, RadicalHint } from '../../ui/stage/WhyLine';
import { firstSense, fiveOrThree, MANY_WRONG, meaningChoices, pickCharacterDistractors, pickLookAlikes, pickPinyinDistractors } from './distractors';
import { cardMeaning, glossFor, questionMeaning } from '../../content/glossary';
import { boundPair, inBoundSense, kidGlossReading } from '../../content/kidGloss';
import { meaningCue, pickSoundAlikes, usageLine, wordCue, type MeaningCue } from './meaning';
import { InkIcon } from '../../ui/icons/InkIcon';
import type { Idiom } from '../../content/chengyu';
import { NONE_OF_THESE, noneChoices, noneDecoyChoices } from '../../practice/noneOfThese';
import { cuePickNote, meaningPickNote, pickedNote, pinyinPickNote, type PickedNote } from '../../practice/missNote';

export interface FlashResult {
  correct: boolean;
  hard: boolean;
  responseMs: number;
  elapsedMs: number;
  inContext: boolean; // a meaning question on a sentence (spec §20 part 7)
  asked: 'read' | 'meaning' | 'hear'; // what was really asked: a meaning item with no cue falls back to reading; a hear item with no voice is read for meaning
  picked?: string; // the option he chose (钓鱼 remembers a look-alike, spec 2026-10-05 §3.4)
}

interface Props {
  item: FlashItem;
  word: Word;
  pool: Word[];
  card?: CardRecord;
  voice: boolean;
  kid: KidState;
  resting: TruffleMood; // his mood once the answer is settled; while the question is open he rests neutral (spec 2026-10-11 §5)
  combo: number; // run of right answers before this card
  closeupReady: boolean;
  onDone: (result: FlashResult) => void;
  /** what 认新字 or 练一练 asks (spec 2026-10-05 §3.2): read (pinyin), listen (find the character), word (the 组词 gap). Without it the card decides, as before. */
  ask?: 'read' | 'listen' | 'word' | 'hear' | 'meaningRead';
  /** 认新字: after a miss the card shows again before moving on (spec 2026-10-05 §2.1) */
  reintroOnMiss?: boolean;
  /** 认新字: a 成语 that uses the word, at his level or one up (spec 2026-10-05 §2.1, §4) */
  idiom?: Idiom | null;
  /** 认新字: the word's lesson in his book, 「课本 二下·17」 or 「补 一上·5」 (spec 2026-10-11 §9); none for a listed word */
  lessonTag?: string | null;
  /** 练一练: a 组词 gap or English meaning asked without its answer, 「都不对」 right (production practice spec §5) */
  noneOfThese?: 'answer' | 'decoy';
}

type Phase = 'intro' | 'quiz' | 'feedback';

/** What he picked, for the miss sheet (parent 2026-10-16: English beside every wrong pick): 都不对 said plainly; an English
 *  choice as the word it means; a 组词 or sentence gap as the character he put in (never the made-up word); a character; a
 *  pinyin choice as the character or word read so (nothing for a slip of his own word's sound). */
function missedPick(choice: string | null, quiz: { cue: MeaningCue | null; mode: 'hear' | 'meaningRead' | null; listen: boolean }, word: Word, pool: Word[]): PickedNote | null {
  if (choice === null) return null;
  if (choice === NONE_OF_THESE) return pickedNote(choice);
  if (quiz.mode) return meaningPickNote(choice, word, pool);
  if (quiz.cue) return cuePickNote(quiz.cue, choice, pool);
  if (quiz.listen) return pickedNote(choice, pool);
  return pinyinPickNote(word, choice, pool);
}

export function FlashcardStep({ item, word, pool, card, voice, kid, resting, combo, closeupReady, onDone, ask, reintroOnMiss = false, idiom = null, lessonTag = null, noneOfThese }: Props) {
  // a bound character (kidGloss.ts): its card and its English questions show and say its pair, 番茄 for 番
  const pair = boundPair(word.text);
  // none: the right answer is left out and 都不对 is right; real: the right answer itself, shown after (production practice spec §5)
  const quiz = useMemo((): { listen: boolean; cue: MeaningCue | null; answer: string; options: string[]; cheer: string; comfort: string; mode: 'hear' | 'meaningRead' | null; none: boolean; showsNone: boolean; real: string } => {
    const rng = mulberry32((Date.now() ^ word.text.codePointAt(0)!) >>> 0);
    const pickOptions = (options: string[], real: string) => noneOfThese === 'answer' ? noneChoices(options, real) : noneOfThese === 'decoy' ? noneDecoyChoices(options, real) : options;
    // Meaning: which character fits its 组词 word (same-sound choices). Without a cue it falls back to reading.
    const cue = ask === 'word' ? wordCue(word) : ask ? null : item.mode === 'meaning' ? meaningCue(word) : null;
    // six options where five good wrong ones exist, else four (spec 2026-10-11 §3); a class sentence's own wrong ones stay as they are
    if (cue) {
      const options = shuffle([word.text, ...(cue.wrong ?? fiveOrThree(pickSoundAlikes(word, cue, pool, rng, MANY_WRONG)))], rng);
      return { listen: false, cue, answer: noneOfThese === 'answer' ? NONE_OF_THESE : word.text, options: pickOptions(options, word.text), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: null, none: noneOfThese === 'answer', showsNone: !!noneOfThese, real: word.text };
    }
    // the word ladder (spec 2026-10-06 §3.2): he hears it, or reads it, and picks its meaning in English
    if (ask === 'hear' || ask === 'meaningRead') {
      // always four: six English meanings crowd a phone and drag in obscure glosses (parent, 2026-10-12)
      const options = meaningChoices(word, pool, rng);
      if (options) {
        const hear = ask === 'hear' && voice; // no voice: he reads it for meaning instead (asked 'read', never graded as hearing)
        const real = firstSense(questionMeaning(word)!);
        return { listen: hear, cue: null, answer: noneOfThese === 'answer' ? NONE_OF_THESE : real, options: pickOptions(options, real), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: hear ? 'hear' : 'meaningRead', none: noneOfThese === 'answer', showsNone: !!noneOfThese, real };
      }
    }
    // a bound character is heard as its pair (番茄): its pair's other character is never a wrong choice (蚂蚁 said, 蚁 offered)
    const inPair = (w: Word) => !!pair && w.text !== word.text && pair.includes(w.text);
    const five = pickLookAlikes(word, pool, rng).filter((w) => !inPair(w));
    const lookAlikes = five.length ? five : pickCharacterDistractors(word, pool, rng).filter((w) => !inPair(w));
    const listen = voice && lookAlikes.length >= 3 && (ask ? ask === 'listen' : (card?.fsrs.reps ?? 0) % 2 === 0);
    const answer = listen ? word.text : word.pinyin;
    const wrong = listen ? lookAlikes.map((w) => w.text) : fiveOrThree(pickPinyinDistractors(word, pool, rng, MANY_WRONG));
    return { listen, cue: null, answer, options: shuffle([answer, ...wrong], rng), cheer: pickLine(CHEERS, rng), comfort: pickLine(COMFORTS, rng), mode: null, none: false, showsNone: false, real: answer };
  }, [word.id]);
  const [phase, setPhase] = useState<Phase>(item.isNew && !item.retry ? 'intro' : 'quiz');
  const [choice, setChoice] = useState<string | null>(null);
  const [again, setAgain] = useState(false);
  const againAt = useRef(0); // when the card came back after a miss: a double tap on 继续 must not skip it (sweep)
  const [result, setResult] = useState<{ correct: boolean; hard: boolean; responseMs: number } | null>(null);
  const shownAt = useRef(performance.now());
  // what he reacts to (spec 2026-10-04 §4.4): a new word when it is shown, then each answer
  const reactN = useRef(0);
  // a new word surprises him; nothing else moves him until an answer is settled (spec 2026-10-11 §5: no peek at a question)
  const [react, setReact] = useState<Reaction | null>(() => (item.isNew && !item.retry ? { kind: 'newWord', key: ++reactN.current } : null));
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
  const mood: TruffleMood = phase === 'feedback' ? resting : 'neutral'; // still while he answers (spec 2026-10-11 §5)
  const REACTION_LINES: Partial<Record<TruffleMood, string>> = { side: '记住它！', wow: '咦！好厉害！', content: '呼噜～' };
  const bubble = phase === 'intro' ? (again ? '再看一遍！' : '新字来了！') : phase === 'quiz' ? (quiz.mode === 'hear' ? '听一听，是什么意思？' : quiz.mode === 'meaningRead' ? '这个词是什么意思？' : quiz.cue ? '哪个字对？' : quiz.listen ? '听一听，我想吃哪个字？' : '这个字怎么读？') : (reaction && REACTION_LINES[reaction]) ?? null;
  const showCloseup = phase === 'feedback' && !!result?.correct && result.hard && closeupReady;
  const next = () => {
    if (result) onDone({ ...result, elapsedMs: Math.round(performance.now() - shownAt.current), inContext: quiz.cue?.kind === 'sentence', asked: quiz.cue ? 'meaning' : quiz.mode === 'hear' ? 'hear' : 'read', picked: choice ?? undefined });
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
          // a 都不对 question shows the real answer, right or wrong (production practice spec §5)
          detail={result.correct && !quiz.none ? undefined : (
            <>
              <MeaningNote answerLabel="正确答案：" right={quiz.cue ? quiz.cue.full : quiz.mode && pair ? pair : word.text} rightPinyin={quiz.cue ? quiz.cue.pinyin : quiz.mode && pair ? kidGlossReading(pair) : word.pinyin} rightMeaning={quiz.showsNone && quiz.mode ? quiz.real : undefined} picked={result.correct ? null : missedPick(choice, quiz, word, pool)} />
              {/* why (spec 2026-10-12 §3): English choices → the radical; the 组词 gap → the look-alike part, else the radical;
                  find the character → the look-alike part; its reading → the kind of pinyin slip */}
              {result.correct ? null
                : quiz.mode ? <RadicalHint text={word.text} />
                : quiz.cue ? <LookAlikeWhy right={word.text} picked={choice === NONE_OF_THESE ? '' : (choice ?? '')} fallback={<RadicalHint text={word.text} />} />
                : quiz.listen ? <LookAlikeWhy right={word.text} picked={choice ?? ''} />
                : <PinyinWhy word={word} picked={choice ?? ''} />}
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
        {phase === 'intro' ? <Intro word={word} idiom={idiom} tag={lessonTag} /> : (
          <>
            <div class="flash__prompt">
              {quiz.cue ? (
                <div class="meaning-prompt">
                  {quiz.cue.kind === 'sentence' ? (
                    <div class={`meaning-cue meaning-cue--sentence${Array.from(quiz.cue.full).length <= 4 ? ' meaning-cue--short' : ''}`} lang="zh" data-q={Array.from(quiz.cue.full).length <= 4 || undefined} style={`--len:${Array.from(quiz.cue.full).length}`}>
                      <Label zh={`${quiz.cue.before}${phase === 'feedback' ? word.text : '＿'.repeat(Array.from(word.text).length)}${quiz.cue.after}`} fade />
                      <SpeakButton text={phase === 'feedback' ? quiz.cue.full : `${quiz.cue.before}，，${quiz.cue.after}`} />
                    </div>
                  ) : (
                    // like every line on the card: each syllable over its character, the gap a dashed box with its sound over it (parent, 2026-10-05)
                    <div class="meaning-cue meaning-cue--sentence meaning-cue--short meaning-cue--word" lang="zh" data-q style={`--len:${Array.from(quiz.cue.full).length}`}>
                      <Label zh={`${quiz.cue.before}${phase === 'feedback' ? word.text : '＿'.repeat(Array.from(word.text).length)}${quiz.cue.after}`} py={quiz.cue.pinyin} fade />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {quiz.listen ? <SpeakButton text={quiz.mode && pair ? pair : word.text} reading={quiz.mode && pair ? undefined : word.pinyin} big />
                    // an English question on a bound character asks about its pair, the character picked out in it; never the lone character
                    : quiz.mode && pair ? <div class="hanzi hanzi--q hanzi--pair" data-q style={`--len:${Array.from(pair).length}`}><BoundWord pair={pair} ch={word.text} /></div>
                    : <div class="hanzi hanzi--q" data-q>{word.text}</div>}
                  {/* a bound character's English question already shows its pair: no second 番茄 under it */}
                  {phase === 'feedback' && !(quiz.mode && pair && usageLine(word)?.full === pair) && <UsageLine word={word} />}
                </>
              )}
            </div>
            <div class={`choices stagger ${quiz.mode ? 'choices--english' : quiz.listen || quiz.cue ? 'choices--hanzi' : 'choices--pinyin'}${quiz.options.length > 4 ? ' choices--six' : ''}`}>
                {quiz.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    class={`choice press ${optionState(o)}${o === NONE_OF_THESE && quiz.showsNone ? ' choice--none' : ''}`}
                    lang={quiz.mode && !(o === NONE_OF_THESE && quiz.showsNone) ? 'en' : undefined}
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
  // the hanging mark is an inline block, a place the line could break: its last character goes with it, so 。 never starts a line
  const body = Array.from(m[1]!);
  const last = body.pop() ?? '';
  return <>{body.join('')}<span class="nowrap">{last}<span class="hang">{m[2]}</span></span></>;
}

/**
 * One line of Chinese on a card, the same everywhere (parent, 2026-10-05): each syllable over its own character, a small speak
 * button to its right, its English underneath.
 */
function WordRow({ zh, py, en, mark, class: cls, textClass }: { zh: string; py?: string; en?: string | null; mark?: [number, number]; class: string; textClass?: string }) {
  // a sentence (more than a 成语's worth): on a phone it may wrap, so its button sits beside it in the row, never on it (parent 2026-10-15)
  const long = Array.from(zh).length > 8;
  return (
    <div class={`word-row ${cls}${long ? ' word-row--long' : ''}`} lang="zh">
      <div class="word-row__line">
        <span class={`hanzi word-row__zh${textClass ? ` ${textClass}` : ''}`}><Label zh={zh} py={py} mark={mark} fade /></span>
        <SpeakButton text={zh} reading={py} small />
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

/**
 * The 认新字 card's 词语 rows: its usage line and the 组词 listed with it. A bound character's card leads with its pair (番茄),
 * so neither row repeats it, and one row is enough below it.
 */
function cardRows(word: Word, idiom?: Idiom | null): { line: ReturnType<typeof usageLine>; listed: NonNullable<Word['examples']> } {
  const pair = boundPair(word.text);
  const usage = usageLine(word);
  // a bound character's rows keep its pair's sense (kidGloss.ts inBoundSense): 番 never shows 一番 "a round of"
  const line = usage && usage.full !== pair && inBoundSense(word.text, usage.full) ? usage : null;
  const room = pair ? (line ? 0 : 1) : extraWords(line, idiom);
  const listed = (word.examples ?? []).filter((e) => e.text !== pair && inBoundSense(word.text, e.text) && !line?.full.includes(e.text)).slice(0, room);
  return { line, listed };
}

/** The lines the 认新字 card reads after its character (a bound one's pair): the usage line, the listed 组词, then its 成语. */
export function introSpoken(word: Word, idiom: Idiom | null): string[] {
  const { line, listed } = cardRows(word, idiom);
  const shownIdiom = idiom && inBoundSense(word.text, idiom.text) && !shownOnCard(word).some((t) => t.includes(idiom.text)) ? [idiom.text] : [];
  return [...(line ? [line.full] : []), ...listed.map((e) => e.text), ...shownIdiom];
}

/** What the 认新字 card shows beside a 成语: a bound character's pair, its usage line and the 组词 listed with it (a 成语 can be
 *  either: 八's is 四面八方). */
export function shownOnCard(word: Word): string[] {
  const { line, listed } = cardRows(word, {} as Idiom);
  return [boundPair(word.text), line?.full, ...listed.map((e) => e.text)].filter((t): t is string => !!t);
}


/** The card's 成语: the first one the card doesn't already show, so nothing is shown twice (parent, 2026-10-05: 四面八方 twice on 八). */
export function introIdiom(word: Word, idioms: Idiom[]): Idiom | null {
  const shown = shownOnCard(word);
  // a bound character's 成语 keeps its pair's sense too (kidGloss.ts inBoundSense)
  return idioms.find((i) => !shown.some((t) => t.includes(i.text)) && inBoundSense(word.text, i.text)) ?? null;
}

function Intro({ word, idiom, tag = null }: { word: Word; idiom: Idiom | null; tag?: string | null }) {
  // never the one the usage line already shows; all of them feed the meaning questions
  const { line, listed } = cardRows(word, idiom);
  const pair = boundPair(word.text);
  const long = Array.from(pair ?? word.text).length > 1;
  return (
    <div class="intro">
      <div class={`intro__card${idiom ? ' intro__card--idiom' : ''}`} data-word={word.text}>
        {tag && <p class="intro__tag" lang="zh">{tag}</p>}
        <div class="intro__head">
          {pair ? (
            // a bound character (parent 2026-10-15): its pair leads, the character marked in it, and the character alone beside
            // the speak button, so he knows it by itself too
            <div class="intro__char intro__char--bound">
              {/* each syllable over its own character (parent 2026-10-15: one centred string drifted off wide characters) */}
              <div class="hanzi hanzi--xl hanzi--long hanzi--pair intro__word" style={`--len:${Array.from(pair).length}`}><Label zh={pair} py={kidGlossReading(pair)} mark={[Array.from(pair).indexOf(word.text), 1]} /></div>
              <div class="intro__bound">
                <span class="intro__alone" lang="zh" aria-label={`${word.text} ${word.pinyin}`}><span class="hanzi">{word.text}</span><small class="pinyin pinyin--later">{word.pinyin}</small></span>
                <SpeakButton text={pair} />
              </div>
            </div>
          ) : (
            <div class="intro__char">
              {/* the character first; its pinyin 2 s later (spec 2026-10-12 §4, Chung 2003) */}
              {/* a school 成语 or 词语 shrinks to one line (final review I3), each syllable over its own character (parent
                  2026-10-15: "yǔ yī" as one centred string drifted off 雨衣's wide characters) */}
              {long ? <div class="hanzi hanzi--xl hanzi--long intro__word" style={`--len:${Array.from(word.text).length}`}><Label zh={word.text} py={word.pinyin} /></div> : (
                <>
                  <div class="pinyin pinyin--later">{word.pinyin}</div>
                  <div class="hanzi hanzi--xl">{word.text}</div>
                </>
              )}
              <SpeakButton text={word.text} reading={word.pinyin} />
            </div>
          )}
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
        {idiom && inBoundSense(word.text, idiom.text) && !shownOnCard(word).some((t) => t.includes(idiom.text)) && ( // the 组词 first, then the 成语 (parent, 2026-10-05: a card showed only a 成语); never one it already shows
          <div class="intro__group intro__idiom">
            <WordRow class="example example--idiom" zh={idiom.text} py={idiom.pinyin} en={idiom.meaning} mark={markOf(idiom.text, word.text)} />
            {idiom.sentences[0] && <p class="intro__idiom-sentence hanzi"><CentredSentence text={idiom.sentences[0]} /></p>}
          </div>
        )}
      </div>
    </div>
  );
}
