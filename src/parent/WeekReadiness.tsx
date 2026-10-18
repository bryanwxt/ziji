// The weekly list's readiness line for the parent (weekly list spec 2026-10-17 §8.3), on Today and at the top of 本周词语.
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge } from '../app/knowledge';
import { classLessonAt } from '../content/curriculum';
import { ladderWordsBesides } from '../content/ladder';
import { addDays, localDateKey } from '../lib/date';
import { PACE_START } from '../session/pace';
import { previewPlan, todaysLesson } from '../session/record';
import { dueToday } from '../stats/stats';
import { allWeekLists, getSession } from '../store/repo';
import type { WeekList } from '../types';
import { itemStatus } from '../weeklist/match';
import { activeLists, frontLoadDays, paceRate } from '../weeklist/plan';
import { readinessLine } from '../weeklist/readiness';

/**
 * One line per running list: its class shortfall from today's plan at today's numbers (listBudget's classShort, worked out as a
 * lesson now would, writing nothing); catch-up slower while the list still has new words before its ready-by. `lists`: reload
 * when they change (the 本周词语 panel's saves). `onOpen`: a way to 本周词语 (Today). `quietWeak`: the list whose weak words
 * Today's "Try this" line already names, so its line leaves them out.
 */
export function WeekReadiness({ lists, onOpen, quietWeak }: { lists?: WeekList[]; onOpen?: () => void; quietWeak?: string }) {
  const { db, now, settings } = useApp();
  const [lines, setLines] = useState<(ReturnType<typeof readinessLine> & { name: string })[]>([]);
  useEffect(() => {
    void (async () => {
      const t = now();
      const open = activeLists(lists ?? (await allWeekLists(db)), t);
      if (!open.length) return setLines([]);
      const know = await loadKnowledge(db);
      const words = new Map([...know.words, ...ladderWordsBesides(know.words)].map((w) => [w.id, w]));
      const cards = new Map(know.cards.map((c) => [c.id, c]));
      // the parent's view never fails over the class shortfall: without a plan, the class part is left out
      const classShort = await previewPlan(db, t).then((p) => p.classShort ?? 0, () => null);
      const classKnown = classShort !== null && classLessonAt(t, settings) !== null;
      const reviewsDue = dueToday(know.cards, know.words, t);
      const today = localDateKey(t);
      // new words the front-load days can't take, even at 20 a lesson (parent ruling 2026-10-18): from today's lesson, or
      // tomorrow's once today's is done or begun
      const from = todaysLesson(await getSession(db, today)) ? localDateKey(addDays(t, 1)) : today;
      const rate = paceRate(settings.pace?.perDay ?? PACE_START, settings.newPerDay);
      setLines(open.map((l) => {
        const fresh = l.items.filter((i) => itemStatus(i.wordId, cards) === 'new').length;
        return { name: l.name, ...readinessLine(l, words, {
          classLeft: classShort ?? 0, classKnown, reviewsDue,
          catchupSlower: today < l.readyBy && fresh > 0,
          afterCheck: today < l.readyBy ? frontLoadDays({ rate, left: fresh, from, readyBy: l.readyBy }).late : 0,
        }) };
      }));
    })();
  }, [lists]);
  return (
    <>
      {lines.map((r) => (
        <div class="dash__week" key={r.head}>
          <p class="dash__week-head"><strong>{r.head}</strong></p>
          <p class="dash__week-line">{r.line}{r.weak.length && r.name !== quietWeak ? ` — weak: ${r.weak.join(', ')}` : ''}</p>
          {onOpen && <button type="button" class="small-btn" onClick={onOpen}>Open 本周词语</button>}
        </div>
      ))}
    </>
  );
}
