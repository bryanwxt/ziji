import { endOfLocalDay } from '../lib/date';
import { shuffle, type Rng } from '../lib/random';
import { meaningCue } from '../activities/flashcards/meaning';
import { PACE_START } from './pace';
import { learnerLevel } from '../content/chengyu';
import { orderWriteItems, pickWriteUnits, writeCharTarget } from './writing';
import type { ActivityKind, CardKind, CardRecord, FlashItem, SessionPlan, Settings, StepKind, Word } from '../types';

export const REVIEW_CAP = 60;
export const BACKLOG_PAUSE = 40;
export const STEP_ORDER: ActivityKind[] = ['newwords', 'practice', 'writing', 'speaking']; // spec 2026-10-05 §2

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

export function buildSessionPlan({ cards, words, settings, now, practised = new Map(), newPerDay }: PlanInput): SessionPlan {
  const active = words.filter((w) => !w.paused);
  const activeIds = new Set(active.map((w) => w.id));
  const cutoff = endOfLocalDay(now).getTime();
  const ofKind = (kind: CardKind) => cards.filter((c) => c.kind === kind);
  const dueOf = (list: CardRecord[]) =>
    list
      .filter((c) => activeIds.has(c.wordId) && c.fsrs.due.getTime() <= cutoff)
      .sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());

  const recognise = ofKind('recognise');
  const started = new Set(recognise.map((c) => c.wordId));
  const dueRecognise = dueOf(recognise);
  // a real backlog pauses new words; first rechecks of placement guesses (never practised) don't
  const backlog = dueRecognise.filter((c) => practised.has(c.wordId)).length;
  const perDay = newPerDay ?? Math.min(settings.newPerDay, PACE_START);
  const newLimit = backlog > BACKLOG_PAUSE || !settings.activities.newwords ? 0 : perDay;

  // Meaning practice: due meaning cards, and begun words that have a 组词 cue but no meaning card yet.
  const meaning = ofKind('meaning');
  const hasMeaning = new Set(meaning.map((c) => c.wordId));
  const meaningOrder = (a: Word, b: Word) => (practised.get(b.id) ?? -1) - (practised.get(a.id) ?? -1) || newWordOrder(a, b);

  const newWords = active.filter((w) => !started.has(w.id)).sort(newWordOrder).slice(0, newLimit);
  const steps: StepKind[] = STEP_ORDER.filter((s) => settings.activities[s]); // spec 2026-10-05 §2: no separate 用一用
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
    meaningReviewIds: dueOf(meaning).slice(0, MEANING_REVIEW_CAP).map((c) => c.wordId),
    newMeaningIds: active
      .filter((w) => started.has(w.id) && !hasMeaning.has(w.id) && meaningCue(w) !== null)
      .sort(meaningOrder)
      .slice(0, NEW_MEANING_PER_DAY)
      .map((w) => w.id),
  };
}
