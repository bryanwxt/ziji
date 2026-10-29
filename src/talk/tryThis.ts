// "This week, try this" (2026-10-18 update; the review asked the parent area to open with one action): the single most useful
// thing for the parent to do now, from what the app already knows. Pure; loadTrySignals reads the stores.
import { loadKnowledge } from '../app/knowledge';
import { classLessonAt } from '../content/curriculum';
import { ladderWordsBesides } from '../content/ladder';
import { localDateKey, parseDateKey } from '../lib/date';
import { backupNudgeDays } from '../parent/backupNudge';
import type { ParentPlace } from '../parent/ParentArea';
import { previewPlan } from '../session/record';
import { waitingTakes } from '../session/say';
import type { AppDb } from '../store/db';
import { allSessions, allTalks, allWeekLists, listRecordings } from '../store/repo';
import type { Settings } from '../types';
import { activeLists } from '../weeklist/plan';
import { CLASS_BEHIND_AT, isReady } from '../weeklist/readiness';
import { lastTalkDay } from './week';

/** A list whose check is this many days away or fewer, with words not ready, comes first. */
export const LIST_SOON_DAYS = 2;
/** No talk logged today or yesterday asks for one (spec §5's 2-day nudge). */
export const TALK_GAP_DAYS = 2;
/** A backup this overdue goes before everything: losing his progress costs more than any one evening. */
export const BACKUP_URGENT_DAYS = 30;

export interface ListGap { name: string; readyBy: string; homeworkDue: string; notReady: number; total: number; weak: string[] }
export interface TrySignals {
  today: string;
  lists: ListGap[]; // running lists, homework day not behind, earliest ready-by first
  lastTalk: string | null; // the last day a talk was logged
  takes: number; // waiting in Listen & confirm
  backupDays: number | null; // days without a backup, once past the 14-day nudge (backupNudgeDays); null: not due
  classLeft: number | null; // class words still unstarted on homework day (a list week only); null: unknown
}
/** `weakOf`: the list whose weak words the line names (Today's readiness line for it then leaves its own out). */
export interface TryAction { text: string; button: string | null; place: ParentPlace | null; weakOf?: string }

const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (key: string) => EN_DAYS[parseDateKey(key).getDay()]!;
const between = (a: string, b: string) => Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);

/**
 * The first that applies: a backup 30+ days overdue; a list checked within 2 days with words not ready; no talk logged today or
 * yesterday; takes waiting; a backup overdue; class words behind; a list further off with words not ready. Else a calm line.
 */
export function tryThis(s: TrySignals): TryAction {
  const backup = (d: number): TryAction => ({ text: `No backup for ${d} days. Save one to Files now; it takes a minute.`, button: 'Back up now', place: 'backup' });
  if (s.backupDays !== null && s.backupDays >= BACKUP_URGENT_DAYS) return backup(s.backupDays);
  const gaps = s.lists.filter((l) => l.notReady > 0);
  const soon = gaps.find((l) => { const d = between(s.today, l.readyBy); return d >= 0 && d <= LIST_SOON_DAYS; });
  if (soon) {
    const when = soon.readyBy === s.today ? 'today' : weekday(soon.readyBy);
    const go = soon.weak.length ? ` Go over ${soon.weak.slice(0, 3).join(', ')} with them.` : '';
    const text = `${soon.name}: ${soon.notReady} of ${soon.total} not ready for the check ${when === 'today' ? 'today' : `on ${when}`}.${go}`;
    return { text, button: 'Open 本周词语', place: 'week', ...(go ? { weakOf: soon.name } : {}) };
  }
  if (!s.lastTalk) return { text: 'Try one of today’s talk prompts below, then tap ✓ 聊了.', button: 'Go to 聊一聊', place: 'talk' };
  if (between(s.lastTalk, s.today) >= TALK_GAP_DAYS) return { text: `No talk logged since ${weekday(s.lastTalk)}. Try today’s shared reading questions at dinner.`, button: 'Go to 聊一聊', place: 'talk' };
  if (s.takes > 0) return { text: `${s.takes} take${s.takes === 1 ? '' : 's'} waiting in Listen & confirm. Their Say words move on once you confirm them.`, button: 'Listen & confirm', place: 'listen' };
  if (s.backupDays !== null) return backup(s.backupDays);
  const listed = s.lists[0];
  if (s.classLeft && listed) {
    return s.classLeft > CLASS_BEHIND_AT
      ? { text: "They're behind their class. See where they are.", button: 'See Progress', place: 'school' }
      : { text: `${s.classLeft} class word${s.classLeft === 1 ? '' : 's'} still to start before ${weekday(listed.homeworkDue)}.`, button: 'See Progress', place: 'school' };
  }
  const later = gaps[0];
  if (later) return { text: `${later.name}: ${later.total - later.notReady} of ${later.total} ready, check on ${weekday(later.readyBy)}.`, button: 'Open 本周词语', place: 'week' };
  return { text: 'Nothing pressing. Enjoy today’s talk below.', button: null, place: null };
}

/** What tryThis needs, from the stores. The class shortfall is worked out only in a list week (as the readiness line does). */
export async function loadTrySignals(db: AppDb, now: Date, settings: Settings, takes?: number): Promise<TrySignals> {
  const today = localDateKey(now);
  const [lists, talks, sessions, recordings] = await Promise.all([allWeekLists(db), allTalks(db), allSessions(db), takes === undefined ? listRecordings(db) : Promise.resolve([])]);
  const open = activeLists(lists, now).filter((l) => today <= l.homeworkDue);
  let gaps: ListGap[] = [];
  let classLeft: number | null = null;
  if (open.length) {
    const know = await loadKnowledge(db);
    const words = new Map([...know.words, ...ladderWordsBesides(know.words)].map((w) => [w.id, w]));
    gaps = open.map((l) => {
      const notReady = l.items.filter((i) => !isReady(i, l, words.get(i.wordId)));
      return { name: l.name, readyBy: l.readyBy, homeworkDue: l.homeworkDue, notReady: notReady.length, total: l.items.length, weak: notReady.map((i) => i.text) };
    });
    if (classLessonAt(now, settings) !== null) classLeft = await previewPlan(db, now).then((p) => p.classShort ?? null, () => null);
  }
  const firstUse = sessions.reduce<number | null>((m, s) => { const t = new Date(`${s.date}T00:00`).getTime(); return m === null || t < m ? t : m; }, null);
  return {
    today, lists: gaps, lastTalk: lastTalkDay(talks),
    takes: takes ?? waitingTakes(recordings).length,
    backupDays: backupNudgeDays({ lastBackupAt: settings.lastBackupAt, firstUse, now: now.getTime() }),
    classLeft,
  };
}
