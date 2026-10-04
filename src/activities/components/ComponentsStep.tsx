import { useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import { getCharInfo } from '../../content';
import { radicalMeaning } from '../../content/radicals';
import type { KidState } from '../../types';
import { FeedbackSheet } from '../../ui/stage/FeedbackSheet';
import { Stage } from '../../ui/stage/Stage';
import { InkIcon } from '../../ui/icons/InkIcon';
import { burst } from '../../ui/motion';
import { Pet } from '../../ui/Pet';
import type { TruffleMood } from '../../ui/truffle/Truffle';
import type { ZibianItem } from './zibian';

interface Props {
  items: ZibianItem[];
  kid: KidState;
  resting: TruffleMood;
  onAnswer: (item: ZibianItem, correct: boolean) => void;
  onDone: () => void;
  onProgress?: (fraction: number) => void;
}

/** A character's radical and what it means (根：木 树木), the clue to telling look-alikes apart. */
function Radical({ ch }: { ch: string }) {
  const radical = getCharInfo(ch)?.radical;
  const m = radical ? radicalMeaning(radical) : undefined;
  return (
    <span class="zibian__radical hanzi">
      {ch}：{radical}
      {m && <> <InkIcon name={m.icon} size={24} /> {m.zh}</>}
    </span>
  );
}

/** 钓鱼 as 字辨 (spec §20 part 8): fish out the right character for the gap in a word. */
export function ComponentsStep({ items, kid, resting, onAnswer, onDone, onProgress }: Props) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const item = items[index]!;
  const chars = Array.from(item.word);
  const done = picked !== null;
  const correct = picked === item.answer;

  const pick = (o: string, el: HTMLElement) => {
    if (done) return;
    setPicked(o);
    const right = o === item.answer;
    if (right) {
      playSfx('correct');
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, { count: 10, glyphs: ['✦', '✧', '•'] });
    } else playSfx('wrong');
    speak(item.word);
    onAnswer(item, right);
  };
  const next = () => {
    setPicked(null);
    onProgress?.((index + 1) / items.length);
    if (index + 1 >= items.length) onDone();
    else setIndex(index + 1);
  };
  const state = (o: string) => (!done ? '' : o === item.answer ? 'is-right' : o === picked ? 'is-oops' : '');

  return (
    <Stage
      activity="zibian"
      truffle={<Pet kid={kid} size={180} mood={!done ? resting : correct ? 'pleased' : 'side'} bubble={!done ? '钓鱼啦！' : null} />}
      sheet={!done ? (
        <FeedbackSheet actionLabel="继续" disabled onAction={() => {}} />
      ) : (
        <FeedbackSheet
          tone={correct ? 'good' : 'oops'}
          title={correct ? '钓到了！' : '是这个！'}
          detail={
            <span class="zibian__why">
              <Radical ch={item.answer} />
              {/* the one he chose, when its radical tells them apart */}
              {!correct && getCharInfo(picked!)?.radical !== getCharInfo(item.answer)?.radical && <Radical ch={picked!} />}
            </span>
          }
          actionLabel="继续"
          onAction={next}
        />
      )}
    >
      <div class="pond-q zibian__word hanzi" lang="zh" data-q>
        {chars.map((c, k) => (k === item.index ? <span key={k} class="zibian__blank">{done ? item.answer : '？'}</span> : <span key={k}>{c}</span>))}
      </div>
      <div class="pond pond--four">
        {item.options.map((o, i) => (
          <button key={o} type="button" class={`fishtile press ${state(o)}`} style={{ animationDelay: `${i * 40}ms` }} aria-label={o} disabled={done} onClick={(e) => pick(o, e.currentTarget)}>
            <span class="fishtile__char hanzi">{o}</span>
            <span class="fishtile__badge"><InkIcon name="fish" size={22} /></span>
          </button>
        ))}
      </div>
    </Stage>
  );
}
