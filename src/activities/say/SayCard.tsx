import { useEffect, useRef, useState } from 'preact/hooks';
import type { FinishedRecording } from '../../audio/recorder';
import { speak, stopSpeaking } from '../../audio/speech';
import type { KidState, Word } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { Label } from '../../ui/Label';
import { Pet } from '../../ui/Pet';
import { SpeakButton } from '../../ui/SpeakButton';
import { MicButton, useRecorder } from '../shared/recording';

export interface SayResult { take: FinishedRecording; elapsedMs: number }
/** null: the mic is refused (the lesson drops its other mic cards); 'skip': it failed twice for a passing reason (this card only). */
export type SaySkip = null | 'skip';

/**
 * A Say card (spec 2026-10-11 §3): the word — a character or a 词语 — with no pinyin and no options. He records himself reading
 * it aloud; the model plays right after, and he may record once more (the last take is kept). A refused or missing microphone
 * shows the note; 继续 then hands over null, and the lesson drops the rest (§7). A passing failure is retried (再试一次), never skipped.
 */
export function SayCard({ word, kid, onDone }: { word: Word; kid: KidState; onDone: (r: SayResult | SaySkip) => void }) {
  const rec = useRecorder();
  const [again, setAgain] = useState(false); // his one re-record is used
  const shownAt = useRef(performance.now());
  const finished = useRef(false);
  useEffect(() => {
    if (rec.state === 'done') speak(word.text, { reading: word.pinyin }); // the model, right after his take
  }, [rec.state]);
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
      truffle={<Pet kid={kid} mood="neutral" size={180} calm={!said} bubble={said ? '听一听！' : '大声读一读！'} />}
      sheet={<FeedbackSheet actionLabel="继续" disabled={!said && !blocked && !stuck} onAction={next} />}
    >
      <div class="say">
        <div class="hanzi hanzi--q" data-q lang="zh">{word.text}</div>
        <MicButton rec={rec} withLevel={false} />{/* blocked: the note, and 继续 goes on (mic fix 2026-10-14) */}
        {said && (
          <div class="say__after">
            <SpeakButton text={word.text} reading={word.pinyin} />
            {!again && <button type="button" class="btn btn--secondary" onClick={redo}><Label zh="再录一次" /></button>}
          </div>
        )}
      </div>
    </Stage>
  );
}
