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

/**
 * A Say card (spec 2026-10-11 §3): the word — a character or a 词语 — with no pinyin and no options. He records himself reading
 * it aloud; the model plays right after, and he may record once more (the last take is kept). A blocked or missing microphone
 * skips the card (null), and the lesson skips the rest (§7).
 */
export function SayCard({ word, kid, onDone }: { word: Word; kid: KidState; onDone: (r: SayResult | null) => void }) {
  const rec = useRecorder();
  const [again, setAgain] = useState(false); // his one re-record is used
  const shownAt = useRef(performance.now());
  const finished = useRef(false);
  useEffect(() => {
    if (rec.state === 'blocked' && !finished.current) {
      finished.current = true;
      onDone(null);
    }
    if (rec.state === 'done') speak(word.text, { reading: word.pinyin }); // the model, right after his take
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
      truffle={<Pet kid={kid} mood="neutral" size={180} calm={!said} bubble={said ? '听一听！' : '大声读一读！'} />}
      sheet={<FeedbackSheet actionLabel="继续" disabled={!said} onAction={next} />}
    >
      <div class="say">
        <div class="hanzi hanzi--q" data-q lang="zh">{word.text}</div>
        {rec.state !== 'blocked' && <MicButton rec={rec} withLevel={false} />}{/* blocked: the card is skipped at once, with no note */}
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
