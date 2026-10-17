// src/app/WeekCountdown.tsx
// The weekly list on Home (weekly list spec 2026-10-17 §9): one gentle line with pinyin, never red; on the ready-by day, until the
// check is done, 考考自己 as its own card with its own start (§8.1), beside the lesson's path. Nothing once homework day is behind.
import { useEffect, useState } from 'preact/hooks';
import { ladderWordsBesides } from '../content/ladder';
import { localDateKey } from '../lib/date';
import { allWeekLists, allWords } from '../store/repo';
import { Label } from '../ui/Label';
import { InkIcon } from '../ui/icons/InkIcon';
import { activeLists } from '../weeklist/plan';
import { countdownLine } from '../weeklist/readiness';
import { useApp } from './AppContext';

/** `onShown`: whether a line or card shows, so Home can make room for it (the word of the day steps aside). */
export function WeekCountdown({ onShown }: { onShown?: (shown: boolean) => void } = {}) {
  const { db, now, go } = useApp();
  const [state, setState] = useState<{ line: string; checkId: string | null } | null>(null);
  useEffect(() => {
    void (async () => {
      const [lists, ws] = await Promise.all([allWeekLists(db), allWords(db)]);
      const words = new Map([...ws, ...ladderWordsBesides(ws)].map((w) => [w.id, w]));
      const line = countdownLine(lists, words, now());
      const today = localDateKey(now());
      const check = activeLists(lists, now()).find((l) => l.readyBy === today && !l.check?.done);
      setState(line ? { line, checkId: check?.id ?? null } : null);
      onShown?.(!!line);
    })();
  }, []);
  if (!state) return null;
  if (state.checkId) {
    const id = state.checkId;
    return (
      <div class="card week-check">
        <p class="week-check__line"><InkIcon name="star" size={26} /> <Label zh="本周词语" /></p>
        <button type="button" class="btn btn--primary" onClick={() => go({ name: 'check', listId: id })}><Label zh="考考自己" /></button>
      </div>
    );
  }
  return <p class="week-countdown"><Label zh={state.line} /></p>;
}
