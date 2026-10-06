import { endOfLocalDay } from '../lib/date';
import { shuffle, type Rng } from '../lib/random';
import { meaningCue } from '../activities/flashcards/meaning';
import { PACE_START } from './pace';
import { learnerLevel } from '../content/chengyu';
import { isLadderId } from '../content/ladder';
import { orderWriteItems, pickWriteUnits, writeCharTarget } from './writing';
import type { ActivityKind, CardKind, CardRecord, FlashItem, SessionPlan, Settings, StepKind, Word } from '../types';

export const REVIEW_CAP = 60;
export const BACKLOG_PAUSE = 40;
export const STEP_ORDER: ActivityKind[] = ['newwords', 'practice', 'writing', 'speaking']; // spec 2026-10-05 §2
/** The lesson's steps the parent has on. The speaking step needs 朗读 or 看图说话 back from being parked (settings.langdu / story). */
export const stepsOn = (settings: Pick<Settings, 'activities' | 'story' | 'langdu'>): ActivityKind[] =>
  STEP_ORDER.filter((s) => settings.activities[s] && (s !== 'speaking' || settings.langdu || settings.story));

const LAST = Number.MAX_SAFE_INTEGER;

/** Listed words first (oldest list first), then built-in words by rank. */
export function newWordOrder(a: Word, b: Word): number {
  return (a.listedAt ?? LAST) - (b.listedAt ?? LAST) || (a.rank ?? LAST) - (b.rank ?? LAST) || a.createdAt - b.createdAt;
}

export interface PlanInput {
  cards: CardRecord[];
  words: Word[];
  settings: Settings;
  now: Date;
  practised?: ReadonlyMap<string, number>; // words answered in lessons → when last; placement guesses aren't here
  newPerDay?: number; // today's pace (spec 2026-10-05 §2.2); without one, the pace's start under the ceiling
}

export const PRACTICE_SHARE = 12 / 30; // 练一练's share of the lesson (spec 2026-10-05 §2)
export const NEW_MEANING_PER_DAY = 12; // words he knows (placed or learned) starting meaning checks each day
export const MEANING_REVIEW_CAP = 30;
/** Hear cards reviewed in one lesson at most (spec 2026-10-06 §3.2). */
export const HEAR_REVIEW_CAP = 40;

export function buildSessionPlan({ cards, words, settings, now, practised = new Map(), newPerDay }: PlanInput): SessionPlan {
  const active = words.filter((w) => !w.paused);
  const byId = new Map(active.map((w) => [w.id, w]));
  const activeIds = new Set(active.map((w) => w.id));
  const cutoff = endOfLocalDay(now).getTime();
  const ofKind = (kind: CardKind) => cards.filter((c) => c.kind === kind);
  const dueOf = (list: CardRecord[]) =>
    list
      .filter((c) => activeIds.has(c.wordId) && c.fsrs.due.getTime() <= cutoff)
      .sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());

  const recognise = ofKind('recognise');
  const hear = ofKind('hear');
  // begun: heard or read (spec 2026-10-06 §3.2: a new word starts on its Hear rung)
  const started = new Set([...recognise, ...hear].map((c) => c.wordId));
  // Use (meaning practice) starts once Read has passed: two days' right first answers (spec 2026-10-06 §3.2)
  const readPassed = new Set(recognise.filter((c) => c.passed).map((c) => c.wordId));
  const dueRecognise = dueOf(recognise);
  // a real backlog pauses new words; first rechecks of placement guesses (never practised) don't
  const backlog = dueRecognise.filter((c) => practised.has(c.wordId)).length;
  const perDay = newPerDay ?? Math.min(settings.newPerDay, PACE_START);
  const newLimit = backlog > BACKLOG_PAUSE || !settings.activities.newwords ? 0 : perDay;

  // Meaning practice: due meaning cards, and begun words that have a 组词 cue but no meaning card yet.
  const meaning = ofKind('meaning');
  const hasMeaning = new Set(meaning.map((c) => c.wordId));
  const meaningOrder = (a: Word, b: Word) => (practised.get(b.id) ?? -1) - (practised.get(a.id) ?? -1) || newWordOrder(a, b);

  // A ladder 词语 comes only once every character in it is begun, or comes earlier in today's new words (spec 2026-10-06 §3.1)
  const begunChars = new Set(active.filter((w) => started.has(w.id) && Array.from(w.text).length === 1).map((w) => w.text));
  const newWords: Word[] = [];
  for (const w of active.filter((x) => !started.has(x.id)).sort(newWordOrder)) {
    if (newWords.length >= newLimit) break;
    if (isLadderId(w.id) && !Array.from(w.text).every((c) => begunChars.has(c))) continue;
    newWords.push(w);
    if (Array.from(w.text).length === 1) begunChars.add(w.text);
  }
  // spec 2026-10-05 §2: no separate 用一用; a day with no new words starts at 练一练 (no empty 认新字 stop, no star for it)
  const steps: StepKind[] = stepsOn(settings).filter((s) => s !== 'newwords' || newWords.length > 0);
  // 写一写 (spec 2026-10-05 §5): characters, not words — due, then today's and recent lesson words, then what he reads at his level
  const writeUnits = settings.activities.writing
    ? pickWriteUnits({ cards, words: active, newWordIds: newWords.map((w) => w.id), practised, level: learnerLevel(words, started), cutoff, target: writeCharTarget(settings.sessionMinutes) })
    : [];
  const writeItems = orderWriteItems(writeUnits);

  return {
    steps,
    reviewWordIds: dueRecognise.slice(0, REVIEW_CAP).map((c) => c.wordId),
    newWordIds: newWords.map((w) => w.id),
    flashTimeBoxMs: 0, // only lessons saved before 2026-10-05 time-boxed 认一认
    practiceTimeBoxMs: Math.round(settings.sessionMinutes * 60_000 * PRACTICE_SHARE),
    writeCandidates: writeUnits.map((u) => ({ wordId: u.wordId, isNew: u.isNew })),
    writeItems,
    writeCount: writeItems.length,
    // a word whose cue is gone (its 组词 or sentence removed) can never be asked: its card doesn't hold a slot (sweep)
    hearReviewIds: dueOf(hear).slice(0, HEAR_REVIEW_CAP).map((c) => c.wordId),
    meaningReviewIds: dueOf(meaning).filter((c) => { const w = byId.get(c.wordId); return !!w && meaningCue(w) !== null; }).slice(0, MEANING_REVIEW_CAP).map((c) => c.wordId),
    newMeaningIds: active
      .filter((w) => readPassed.has(w.id) && !hasMeaning.has(w.id) && meaningCue(w) !== null)
      .sort(meaningOrder)
      .slice(0, NEW_MEANING_PER_DAY)
      .map((w) => w.id),
  };
}
