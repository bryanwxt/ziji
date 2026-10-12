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
import type { SayResult } from './SayCard';

/**
 * 说一句 (production practice spec §4): 「用『计划』说一句话」 over a pattern from the word's sentence-bank example (「我们…计划…」,
 * its pinyin fading like every line). He records once, with one optional re-record (the last take is kept); the model sentence
 * then shows and plays. A blocked or missing microphone skips the card (null), and the lesson skips the rest, as for Say cards.
 */
export function SentenceCard({ word, kid, onDone }: { word: Word; kid: KidState; onDone: (r: SayResult | null) => void }) {
  const model = sentenceExample(word.text) ?? word.text;
  const frame = sentencePattern(model, word.text);
  // a frame of up to 4 characters is the card's question, at the question size; a longer one is a line (as a sentence cue is)
  const short = Array.from(frame).length <= 4;
  const rec = useRecorder();
  const [again, setAgain] = useState(false); // his one re-record is used
  const shownAt = useRef(performance.now());
  const finished = useRef(false);
  useEffect(() => {
    if (rec.state === 'blocked' && !finished.current) {
      finished.current = true;
      onDone(null);
    }
    if (rec.state === 'done') speak(model); // the model sentence, right after his take
  }, [rec.state]);
  useEffect(() => () => stopSpeaking(), []); // the model stops when the card goes
  const next = () => {
    if (finished.current || !rec.result) return; // a double tap on 继续 keeps one take
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
      sheet={<FeedbackSheet actionLabel="继续" disabled={!said} onAction={next} />}
    >
      <div class="say-sentence">
        <p class="say-sentence__prompt" lang="zh"><Label zh={`用『${word.text}』说一句话`} fade /></p>
        <div class={`say-sentence__pattern hanzi${short ? ' say-sentence__pattern--short' : ''}`} lang="zh" data-q={short || undefined}><Label zh={frame} fade /></div>
        {rec.state !== 'blocked' && <MicButton rec={rec} withLevel={false} />}{/* blocked: the card is skipped at once, with no note */}
        {said && (
          <>
            <div class="say-sentence__model hanzi" lang="zh"><Label zh={model} fade /></div>
            <div class="say__after">
              <SpeakButton text={model} />
              {!again && <button type="button" class="btn btn--secondary" onClick={redo}><Label zh="再录一次" /></button>}
            </div>
          </>
        )}
      </div>
    </Stage>
  );
}
