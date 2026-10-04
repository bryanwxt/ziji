import { useEffect, useMemo, useState } from 'preact/hooks';
import { pickPinyinDistractors } from '../activities/flashcards/distractors';
import { applyPlacement } from '../placement/apply';
import { bandSamples, placementBands, placementKnownIds, placementStep, startPlacement } from '../placement/placement';
import { mulberry32, seedFromString, shuffle } from '../lib/random';
import { allWords } from '../store/repo';
import { DEFAULT_KID, type Word } from '../types';
import { InkIcon } from '../ui/icons/InkIcon';
import { Label } from '../ui/Label';
import { Pet } from '../ui/Pet';
import { Scene } from '../ui/Scene';
import { useApp } from './AppContext';
import { loadKnowledge } from './knowledge';

/** First-run check: a pinyin quiz in difficulty bands (8 each, pass at 6, stop at the 3rd miss). No right/wrong shown. */
/** tapGuardMs: taps are ignored this long after each question appears, so a double tap can't answer the next one. */
export function PlacementScreen({ tapGuardMs = 350 }: { tapGuardMs?: number } = {}) {
  const { db, now, go, refresh, kid } = useApp();
  const [words, setWords] = useState<Word[] | null>(null);
  const [state, setState] = useState(startPlacement);
  const [known, setKnown] = useState<number | null>(null);

  useEffect(() => {
    void allWords(db).then(setWords);
  }, []);

  const bands = useMemo(() => (words ? placementBands(words) : []), [words]);
  const current = bands.length && !state.done ? bandSamples(bands[state.band]!)[state.index] : undefined;
  const options = useMemo(() => {
    if (!current || !words) return [];
    const rng = mulberry32(seedFromString(current.id));
    return shuffle([current.pinyin, ...pickPinyinDistractors(current, words, rng)], rng);
  }, [current?.id]);

  const [ready, setReady] = useState(tapGuardMs <= 0);
  useEffect(() => {
    if (tapGuardMs <= 0) return;
    setReady(false);
    const t = setTimeout(() => setReady(true), tapGuardMs);
    return () => clearTimeout(t);
  }, [state, tapGuardMs]);

  const answer = async (correct: boolean) => {
    if (!current || known !== null || !ready) return;
    if (tapGuardMs > 0) setReady(false);
    const next = placementStep(state, bands, correct, current.id);
    setState(next);
    if (next.done) {
      await applyPlacement(db, { readingIds: placementKnownIds(next, bands), understandingIds: [], missed: [], reading: 0, understanding: -1 }, now()); // the old check: reading only (Task 5 replaces it)
      setKnown((await loadKnowledge(db)).known);
    }
  };

  const k = kid ?? DEFAULT_KID;
  if (!words) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;

  if (known !== null) {
    return (
      <div class="screen">
        <Scene kind="home" />
        <div class="center">
          <Pet kid={k} mood="pleased" size={160} />
          <h1><Label zh={`你已经认识 ${known} 个字了！`} /></h1>
          <p><Label zh="我们每天学一点点。" /></p>
          <button type="button" class="btn btn--primary btn--big" onClick={async () => { await refresh(); go({ name: 'home' }); }}>
            <Label zh="开始！" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="screen" data-ready={ready ? 'true' : 'false'}>
      <Scene kind="home" />
      <div class="center">
        <Pet kid={k} mood="neutral" bubble="这个字怎么读？" size={100} />
        <span class="chip"><Label zh={`第 ${state.band + 1} 组`} /></span>
        <div class="hanzi hanzi--xl" data-testid="placement-char">{current?.text}</div>
        <div class="choices choices--pinyin">
          {options.map((o) => (
            <button key={o} type="button" class="choice press" onClick={() => void answer(o === current?.pinyin)}>{o}</button>
          ))}
        </div>
        <button type="button" class="btn btn--big" onClick={() => void answer(false)}>
          <Label zh="不知道" /> <InkIcon name="think" size={30} />
        </button>
      </div>
    </div>
  );
}
