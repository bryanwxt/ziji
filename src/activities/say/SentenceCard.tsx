import { useEffect, useRef, useState } from 'preact/hooks';
import { speak, stopSpeaking } from '../../audio/speech';
import { sentenceExample, sentencePattern } from '../../content/sentencePattern';
import type { KidState, Word } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import { MicButton, useRecorder } from '../shared/recording';
import type { SayResult, SaySkip } from './SayCard';

/**
 * 说一句 (production practice spec §4): 「用『计划』说一句话」 over a pattern from the word's sentence-bank example (「我们…计划…」,
 * its pinyin fading like every line). He records, with one optional re-record (the last take is kept). The model sentence is the answer he is meant to produce
 * himself, so it shows and plays only when he taps 听一听例句 or once the re-record is used; after that there is no more re-recording. A refused or missing microphone shows the note and 继续 hands over null; the lesson drops the rest, as for Say cards.
 */
export function SentenceCard({ word, kid, onDone }: { word: Word; kid: KidState; onDone: (r: SayResult | SaySkip) => void }) {
  const model = sentenceExample(word.text) ?? word.text;
  const frame = sentencePattern(model, word.text);
  // a frame of up to 4 characters is the card's question, at the question size; a longer one is a line (as a sentence cue is)
  const short = Array.from(frame).length <= 4;
  const rec = useRecorder();
  const [again, setAgain] = useState(false); // his one re-record is used
  const [shown, setShown] = useState(false); // the model sentence is on show (and spoken)
  const shownAt = useRef(performance.now());
  const finished = useRef(false);
  useEffect(() => {
    if (rec.state === 'done' && again) setShown(true); // the re-record is used: now the model
  }, [rec.state]);
  useEffect(() => {
    if (shown) speak(model);
  }, [shown]);
  useEffect(() => () => stopSpeaking(), []); // the model stops when the card goes
  const blocked = rec.state === 'blocked';
  const stuck = rec.state === 'ready' && rec.failed;
  const next = () => {
    if (finished.current) return; // a double tap on 继续 keeps one take
    if (blocked) {
      finished.current = true;
      return onDone(null); // refused: he read the note; the lesson drops its other mic cards
    }
    if (stuck) {
      finished.current = true;
      return onDone('skip'); // the mic failed twice for a passing reason: this card only goes, ungraded; the rest stay
    }
    if (!rec.result) return;
    finished.current = true;
    onDone({ take: rec.result, elapsedMs: Math.round(performance.now() - shownAt.current) });
  };
  const redo = () => {
    setAgain(true);
    rec.reset();
  };
  const said = rec.state === 'done';
  return (
    <Stage
      activity="flash"
      truffle={<Pet kid={kid} mood="neutral" size={180} calm={!said} bubble={said ? '听一听！' : '说一句！'} />}
      sheet={<FeedbackSheet actionLabel="继续" disabled={!said && !blocked && !stuck} onAction={next} />}
    >
      <div class="say-sentence">
        <p class="say-sentence__prompt" lang="zh"><Label zh={`用『${word.text}』说一句话`} fade /></p>
        <div class={`say-sentence__pattern hanzi${short ? ' say-sentence__pattern--short' : ''}`} lang="zh" data-q={short || undefined}><Label zh={frame} fade /></div>
        <MicButton rec={rec} withLevel={false} />{/* blocked: the note, and 继续 goes on (mic fix 2026-10-14) */}
        {said && shown && (
          <>
            <div class="say-sentence__model hanzi" lang="zh"><Label zh={model} fade /></div>
            <div class="say__after"><SpeakButton text={model} /></div>
          </>
        )}
        {said && !shown && (
          <div class="say__after">
            {!again && <button type="button" class="btn btn--secondary" onClick={redo}><Label zh="再录一次" /></button>}
            <button type="button" class="btn btn--secondary" onClick={() => setShown(true)}><Label zh="听一听例句" /></button>
          </div>
        )}
      </div>
    </Stage>
  );
}
